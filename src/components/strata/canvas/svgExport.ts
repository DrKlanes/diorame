import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { downloadBlob } from '../../../utils/downloadBlob';
import { analytics } from '../../../analytics/analytics';
import { Shape } from '../../../types/strataTypes';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import type { TranslationParams } from '../../../i18n';

// Same signature as in exportHandlers.ts: the caller passes its t() so toasts translate.
type TFunction = (key: string, params?: TranslationParams) => string;

/**
 * Exports all visible shapes as an SVG (or SVGZ) file.
 * Async because large scenes yield control every 100 shapes to avoid UI freeze.
 */
export const exportAsSVG = async (
	exportRequest: 'svg' | 'svgz',
	shapes: Shape[],
	projectName: string,
	onFinish: () => void,
	t: TFunction,
): Promise<void> => {
	try {
		// All shapes including erasers (erasers become SVG mask content)
		const visibleShapes = shapes;

		if (visibleShapes.length === 0) {
			console.warn("No visible shapes to export");
			onFinish();
			return;
		}

		// Calculate bounds
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

		visibleShapes.forEach(shape => {
			shape.points.forEach(point => {
				minX = Math.min(minX, point.x);
				minY = Math.min(minY, point.y);
				maxX = Math.max(maxX, point.x);
				maxY = Math.max(maxY, point.y);
			});
			if (shape.isEraser && shape.eraserPolygon) {
				shape.eraserPolygon.forEach(point => {
					minX = Math.min(minX, point.x);
					minY = Math.min(minY, point.y);
					maxX = Math.max(maxX, point.x);
					maxY = Math.max(maxY, point.y);
				});
			}
		});

		const padding = 50;
		const width = Math.ceil(maxX - minX + padding * 2);
		const height = Math.ceil(maxY - minY + padding * 2);
		const offsetX = -minX + padding;
		const offsetY = -minY + padding;

		// Create SVG using array buffer to avoid string length limits
		const parts: string[] = [];
		parts.push(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`);
		parts.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" version="1.1">\n`);

		// Smooth path helpers — match the drawSmoothLine algorithm (quadratic curves through midpoints)
		const createSmoothOpenPath = (points: Array<{x: number, y: number}>) => {
			if (points.length < 2) return '';
			if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
			let path = `M${points[0].x},${points[0].y}`;
			for (let i = 1; i < points.length - 1; i++) {
				const xc = (points[i].x + points[i + 1].x) / 2;
				const yc = (points[i].y + points[i + 1].y) / 2;
				path += ` Q${points[i].x},${points[i].y} ${xc},${yc}`;
			}
			path += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
			return path;
		};
		const createSmoothClosedPath = (points: Array<{x: number, y: number}>) => {
			const open = createSmoothOpenPath(points);
			return open ? open + ' Z' : '';
		};
		const createPolygonPath = (points: Array<{x: number, y: number}>) => {
			if (points.length < 3) return '';
			const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
			return d + ' Z';
		};
		// Filled outline of a round-capped, round-joined stroke along the spine drawSmoothLine
		// draws: the quadratic-through-midpoints curve is sampled every ~3 units, each sample gets
		// a disc and each chord a quad. All pieces wind the same way, so nonzero fill = union.
		const createRoundStrokeOutline = (points: Array<{x: number, y: number}>, r: number) => {
			const f = (v: number) => +v.toFixed(2);
			const samples = [points[0]];
			if (points.length >= 3) {
				let start = points[0];
				for (let i = 1; i < points.length - 1; i++) {
					const c = points[i];
					const end = { x: (c.x + points[i + 1].x) / 2, y: (c.y + points[i + 1].y) / 2 };
					const len = Math.hypot(c.x - start.x, c.y - start.y) + Math.hypot(end.x - c.x, end.y - c.y);
					const n = Math.max(1, Math.ceil(len / 3));
					for (let k = 1; k <= n; k++) {
						const t = k / n, u = 1 - t;
						samples.push({ x: u * u * start.x + 2 * u * t * c.x + t * t * end.x, y: u * u * start.y + 2 * u * t * c.y + t * t * end.y });
					}
					start = end;
				}
			}
			if (points.length >= 2) samples.push(points[points.length - 1]);
			let d = '';
			// sweep-flag 0 = same (counter-clockwise on screen) winding as the quads below
			samples.forEach(p => { d += `M${f(p.x + r)},${f(p.y)} A${r},${r} 0 1 0 ${f(p.x - r)},${f(p.y)} A${r},${r} 0 1 0 ${f(p.x + r)},${f(p.y)} Z `; });
			for (let i = 0; i < samples.length - 1; i++) {
				const p = samples[i], q = samples[i + 1];
				const len = Math.hypot(q.x - p.x, q.y - p.y);
				if (len < 1e-6) continue;
				const nx = -(q.y - p.y) / len * r, ny = (q.x - p.x) / len * r;
				d += `M${f(p.x + nx)},${f(p.y + ny)} L${f(q.x + nx)},${f(q.y + ny)} L${f(q.x - nx)},${f(q.y - ny)} L${f(p.x - nx)},${f(p.y - ny)} Z `;
			}
			return d.trim();
		};

		// Group shapes by zIndex
		const shapesByLayer = new Map<number, Shape[]>();
		visibleShapes.forEach(shape => {
			if (!shapesByLayer.has(shape.zIndex)) {
				shapesByLayer.set(shape.zIndex, []);
			}
			shapesByLayer.get(shape.zIndex)!.push(shape);
		});

		// Sort layers from back to front (most negative zIndex first)
		const sortedZIndices = Array.from(shapesByLayer.keys()).sort((a, b) => b - a);

		let maskCounter = 0;
		let insideMaskCounter = 0;
		let processedShapeCount = 0;

		// Process each layer
		for (let layerIdx = 0; layerIdx < sortedZIndices.length; layerIdx++) {
			const zIndex = sortedZIndices[layerIdx];
			const layerShapes = shapesByLayer.get(zIndex)!;

			// Helper function to render a shape into `out`. color override = white copies for drawInside masks.
			const renderShape = (out: string[], shape: Shape, color = shape.color) => {
				if (shape.type === 'text' && shape.text) {
					const x = shape.points[0].x + offsetX;
					const y = shape.points[0].y + offsetY;
					const fontSize = shape.fontSize || 40;
					const rotation = shape.rotation || 0;
					const align = shape.align || 'left';

					let textAnchor = 'start';
					if (align === 'center') textAnchor = 'middle';
					if (align === 'right') textAnchor = 'end';

					let transform = `translate(${x},${y})`;
					if (rotation !== 0) {
						transform += ` rotate(${(rotation * 180) / Math.PI})`;
					}

					out.push(`  <text x="0" y="0" fill="${color}" font-size="${fontSize}" text-anchor="${textAnchor}" font-family="sans-serif" transform="${transform}">${shape.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>\n`);
				} else if (shape.points.length > 0) {
					// Tapered tap: its polygon has zero area; Canvas paints a round dot of full
					// thickness instead. Same predicate as isTaperedDot in renderLayerBody.ts.
					const o = shape.originalPoints;
					if (shape.brushMode === 'tapered' && o != null && o.length >= 2
						&& Math.hypot(o[0].x - o[o.length - 1].x, o[0].y - o[o.length - 1].y) < 0.15) {
						out.push(`  <circle cx="${o[0].x + offsetX}" cy="${o[0].y + offsetY}" r="${(shape.brushThickness || 20) / 2}" fill="${color}" />\n`);
						return;
					}
					// Uniform brush: Canvas strokes the ORIGINAL spine with round caps/joins
					// (renderUniformLineShape); the stored outline polygon has neither. Emitted as a
					// filled shape, not a stroke, for the Illustrator workflow.
					if (o != null && o.length > 0 && shape.brushMode === 'uniform') {
						const spine = o.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
						out.push(`  <path d="${createRoundStrokeOutline(spine, (shape.brushThickness || 20) / 2)}" fill="${color}" stroke="none" />\n`);
						return;
					}

					const adjustedPoints = shape.points.map(p => ({
						x: p.x + offsetX,
						y: p.y + offsetY
					}));

					if (shape.type === 'stroke') {
						const pathData = createSmoothOpenPath(adjustedPoints);
						const sw = shape.brushThickness ?? 20;
						out.push(`  <path d="${pathData}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" />\n`);
					} else {
						const pathData = createSmoothClosedPath(adjustedPoints);
						out.push(`  <path d="${pathData}" fill="${color}" stroke="none" />\n`);
					}
				}
			};

			// Groups: shapes in draw order, closed by the erasers that follow them
			type Group = { shapes: Shape[]; erasers: Shape[] };
			const groups: Group[] = [{ shapes: [], erasers: [] }];

			layerShapes.forEach(shape => {
				if (shape.isEraser) {
					groups[groups.length - 1].erasers.push(shape);
				} else {
					if (groups[groups.length - 1].erasers.length > 0) {
						groups.push({ shapes: [], erasers: [] });
					}
					groups[groups.length - 1].shapes.push(shape);
				}
			});

			// drawInside is source-atop: it paints only where the layer ALREADY has ink, i.e. prior
			// shapes minus prior erasers plus whatever was drawn after them. `alpha` mirrors the layer
			// output so far in white (same eraser masks) and becomes each drawInside's luminance mask.
			// A clipPath cannot express erasers; mask-type="alpha" is skipped by Illustrator.
			let alpha: string[] = [];
			const isInside = (s: Shape) => !!s.isDrawInside && !s.isDrawBehind;

			// Emit: iterate first to last; groups with erasers wrap all previous output
			const layerPartsStart = parts.length;

			groups.forEach(group => {
				const behindOut: string[] = [];
				const normalOut: string[] = [];
				const groupAlpha: string[] = [];
				let insideMaskId: string | null = null;

				group.shapes.forEach(shape => {
					if (isInside(shape)) {
						// Nothing on the layer yet: source-atop paints nothing
						if (alpha.length + groupAlpha.length === 0) return;
						if (!insideMaskId) {
							insideMaskId = `inside-${zIndex}-${insideMaskCounter++}`;
							normalOut.push(`  <defs>\n`, `    <mask id="${insideMaskId}">\n`, ...alpha, ...groupAlpha, `    </mask>\n`, `  </defs>\n`);
						}
						normalOut.push(`  <g mask="url(#${insideMaskId})">\n`);
						renderShape(normalOut, shape);
						normalOut.push(`  </g>\n`);
					} else {
						// drawBehind shapes must go before all existing layer content
						renderShape(shape.isDrawBehind ? behindOut : normalOut, shape);
						renderShape(groupAlpha, shape, 'white');
						insideMaskId = null;
					}
				});

				const eraserPaths = group.erasers
					.map(e => createSmoothClosedPath(e.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }))))
					.filter(Boolean);
				const prevParts = parts.splice(layerPartsStart);
				if (eraserPaths.length > 0) {
					const eraserMaskId = `mask-${zIndex}-${maskCounter++}`;
					parts.push(`  <defs>\n`);
					parts.push(`    <mask id="${eraserMaskId}">\n`);
					// One nonzero path per eraser: destination-out is a union. A single evenodd
					// path un-erases overlaps (incl. symmetry mirrors crossing the axis), and a
					// single nonzero path cancels them (mirrors have opposite winding).
					parts.push(`      <rect width="${width}" height="${height}" fill="white"/>\n`);
					eraserPaths.forEach(d => parts.push(`      <path d="${d}" fill="black"/>\n`));
					parts.push(`    </mask>\n`);
					parts.push(`  </defs>\n`);
					parts.push(`  <g mask="url(#${eraserMaskId})">\n`, ...behindOut, ...prevParts, ...normalOut, `  </g>\n`);
					alpha = [`  <g mask="url(#${eraserMaskId})">\n`, ...alpha, ...groupAlpha, `  </g>\n`];
				} else {
					parts.push(...behindOut, ...prevParts, ...normalOut);
					alpha.push(...groupAlpha);
				}
			});

			processedShapeCount += layerShapes.length;

			// Yield every 100 shapes to prevent UI freeze
			if (processedShapeCount >= 100) {
				await new Promise(r => setTimeout(r, 0));
				processedShapeCount = 0;
			}
		}

		parts.push(`</svg>`);

		// Join parts into final SVG string
		const svgContent = parts.join('');

		// Download SVG or SVGZ
		const displayName = projectName === UNTITLED_PROJECT_SENTINEL
			? t('topbar.file.untitledProject')
			: projectName;
		const sanitizedName = getFilenameBase(displayName);
		let blob: Blob;
		let filename: string;

		if (exportRequest === 'svgz' && typeof CompressionStream !== 'undefined') {
			// Compress as SVGZ using gzip
			const textEncoder = new TextEncoder();
			const svgBytes = textEncoder.encode(svgContent);
			const compressedStream = new Blob([svgBytes]).stream().pipeThrough(new CompressionStream('gzip'));
			const compressedBlob = await new Response(compressedStream).blob();
			blob = compressedBlob;
			filename = `${sanitizedName}-${Date.now()}.svgz`;
		} else {
			// Regular SVG
			blob = new Blob([svgContent], { type: 'image/svg+xml' });
			filename = `${sanitizedName}-${Date.now()}.svg`;
		}

		downloadBlob(blob, filename);

		const isCompressed = exportRequest === 'svgz' && typeof CompressionStream !== 'undefined';
		toast.success(t('toast.export.vector.successTitle'), {
			description: isCompressed ? t('toast.export.vector.successDescSvgz') : t('toast.export.vector.successDescSvg'),
			duration: 2000,
		});
		playSound('success');
		analytics.exported(exportRequest);
	} catch (e) {
		console.error("Export SVG failed", e);
		toast.error(t('toast.export.vector.errorTitle'), {
			description: t('common.pleaseRetry'),
			duration: 3000,
		});
	}
	onFinish();
};
