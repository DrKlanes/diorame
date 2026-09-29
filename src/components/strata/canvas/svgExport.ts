import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { downloadBlob } from '../../../utils/downloadBlob';
import { analytics } from '../../../analytics/analytics';
import { Shape } from '../../../types/strataTypes';
import { BASE_DEPTH_STEP } from '../StrataContext';
import { loadPaper, buildLayerGeometry } from './svgGeometry';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import type { TranslationParams } from '../../../i18n';

// Same signature as in exportHandlers.ts: the caller passes its t() so toasts translate.
type TFunction = (key: string, params?: TranslationParams) => string;

/**
 * Exports all visible shapes as an SVG (or SVGZ) file.
 * Async: loads paper.js lazily and yields every ~30 ms so large scenes do not freeze the UI.
 */
export const exportAsSVG = async (
	exportRequest: 'svg' | 'svgz',
	shapes: Shape[],
	projectName: string,
	onFinish: () => void,
	t: TFunction,
): Promise<void> => {
	try {
		// All shapes including erasers (subtracted as geometry in svgGeometry.ts)
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

		// Group shapes by zIndex
		const shapesByLayer = new Map<number, Shape[]>();
		visibleShapes.forEach(shape => {
			if (!shapesByLayer.has(shape.zIndex)) {
				shapesByLayer.set(shape.zIndex, []);
			}
			shapesByLayer.get(shape.zIndex)!.push(shape);
		});

		// Same order renderFrame paints them (sortedZs, descending): first = back
		const sortedZIndices = Array.from(shapesByLayer.keys()).sort((a, b) => b - a);

		// Erasers and drawInside are resolved as real geometry (svgGeometry.ts), not masks:
		// Illustrator's Outline view and Pathfinder only see paths.
		const P = await loadPaper();
		let lastYield = performance.now();
		// MessageChannel, not setTimeout: a hidden tab clamps timers to ≥1 s, which turned each
		// 30 ms yield into a second-long stall if the user switched tabs mid-export.
		const maybeYield = async () => {
			if (performance.now() - lastYield < 30) return;
			await new Promise<void>(r => {
				const ch = new MessageChannel();
				ch.port1.onmessage = () => r();
				ch.port2.postMessage(0);
			});
			lastYield = performance.now();
		};
		let defsCounter = 0;
		let failures = 0;

		const textElement = (shape: Shape) => {
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

			return `<text x="0" y="0" fill="${shape.color}" font-size="${fontSize}" text-anchor="${textAnchor}" font-family="sans-serif" transform="${transform}">${shape.text!.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>`;
		};

		for (const zIndex of sortedZIndices) {
			const layerIndex = Math.round(Math.abs(zIndex / BASE_DEPTH_STEP));
			const layer = await buildLayerGeometry(P, shapesByLayer.get(zIndex)!, offsetX, offsetY, maybeYield);
			failures += layer.failures;

			parts.push(`  <g id="layer-${layerIndex + 1}">\n`);
			layer.pieces.forEach(piece => {
				let body = piece.text ? textElement(piece.text) : `<path d="${piece.d}" fill="${piece.color}"/>`;
				// Fallbacks only (text, or a failed boolean op): the old clip/mask for that one piece
				if (piece.clipD) {
					const id = `clip-${defsCounter++}`;
					parts.push(`    <defs><clipPath id="${id}"><path d="${piece.clipD}"/></clipPath></defs>\n`);
					body = `<g clip-path="url(#${id})">${body}</g>`;
				}
				if (piece.maskErasers.length > 0) {
					const id = `mask-${defsCounter++}`;
					parts.push(`    <defs><mask id="${id}"><rect width="${width}" height="${height}" fill="white"/>${piece.maskErasers.map(d => `<path d="${d}" fill="black"/>`).join('')}</mask></defs>\n`);
					body = `<g mask="url(#${id})">${body}</g>`;
				}
				parts.push(`    ${body}\n`);
			});
			parts.push(`  </g>\n`);
		}
		if (failures > 0) console.warn(`[svg] ${failures} boolean op(s) fell back to masks/clips`);

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
