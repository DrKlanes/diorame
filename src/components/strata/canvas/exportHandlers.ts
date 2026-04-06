import { toast } from 'sonner@2.0.3';
import { Shape } from '../../../types/strataTypes';

/**
 * Exports the current canvas frame as a PNG file.
 */
export const exportAsPNG = (
	canvas: HTMLCanvasElement,
	projectName: string,
	onFinish: () => void
): void => {
	try {
		const link = document.createElement('a');
		const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		link.download = `${sanitizedName}-${Date.now()}.png`;
		link.href = canvas.toDataURL('image/png', 1.0);
		link.click();
		toast.success('Snapshot saved!', {
			description: 'PNG image downloaded successfully',
			duration: 2000,
		});
	} catch (e) {
		console.error("Export PNG failed", e);
		toast.error('Failed to save snapshot', {
			description: 'Please try again',
			duration: 3000,
		});
	}
	onFinish();
};

/**
 * Exports all visible shapes as an SVG (or SVGZ) file.
 * Async because large scenes yield control every 100 shapes to avoid UI freeze.
 */
export const exportAsSVG = async (
	exportRequest: 'svg' | 'svgz',
	shapes: Shape[],
	projectName: string,
	onFinish: () => void
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

		let clipPathCounter = 0;
		let maskCounter = 0;
		let processedShapeCount = 0;

		// Process each layer
		for (let layerIdx = 0; layerIdx < sortedZIndices.length; layerIdx++) {
			const zIndex = sortedZIndices[layerIdx];
			const layerShapes = shapesByLayer.get(zIndex)!;

			// Single-pass: process shapes in draw order, preserving isDrawInside position
			type LayerEntry = { shape: Shape; clipId?: string; clipShapes?: Shape[] };
			const layerEntries: LayerEntry[] = [];
			const normalShapesSoFar: Shape[] = [];
			const eraserShapes: Shape[] = [];

			layerShapes.forEach(shape => {
				if (shape.isEraser) {
					// Collected for mask — applied after layer emit via parts.splice
					eraserShapes.push(shape);
				} else if (shape.isDrawBehind) {
					// Render behind existing content: insert at front of layer
					layerEntries.unshift({ shape });
					normalShapesSoFar.unshift(shape);
				} else if (shape.isDrawInside) {
					// Clip to all non-drawInside shapes drawn so far
					if (normalShapesSoFar.length > 0) {
						const clipId = `clip-${zIndex}-${clipPathCounter++}`;
						layerEntries.push({ shape, clipId, clipShapes: [...normalShapesSoFar] });
					} else {
						layerEntries.push({ shape });
					}
				} else {
					normalShapesSoFar.push(shape);
					layerEntries.push({ shape });
				}
			});

			// Helper function to render a shape
			const renderShape = (shape: Shape, clipPathId?: string) => {
				const clipAttr = clipPathId ? ` clip-path="url(#${clipPathId})"` : '';

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

					parts.push(`  <text x="0" y="0" fill="${shape.color}" font-size="${fontSize}" text-anchor="${textAnchor}" font-family="sans-serif" transform="${transform}"${clipAttr}>${shape.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>\n`);
				} else if (shape.points.length > 0) {
					const adjustedPoints = shape.points.map(p => ({
						x: p.x + offsetX,
						y: p.y + offsetY
					}));

					if (shape.type === 'stroke') {
						const pathData = createSmoothOpenPath(adjustedPoints);
						const sw = shape.lineThickness ?? 8;
						parts.push(`  <path d="${pathData}" fill="none" stroke="${shape.color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${clipAttr} />\n`);
					} else {
						const pathData = createSmoothClosedPath(adjustedPoints);
						parts.push(`  <path d="${pathData}" fill="${shape.color}" stroke="none"${clipAttr} />\n`);
					}
				}
			};

			// Emit layer in draw order; clip defs precede their referencing shape
			const startIndex = parts.length;
			layerEntries.forEach(({ shape, clipId, clipShapes }) => {
				if (clipId && clipShapes) {
					parts.push(`  <defs>\n`);
					parts.push(`    <clipPath id="${clipId}">\n`);
					clipShapes.forEach(cs => {
						if (cs.type === 'text' && cs.text) {
							const x = cs.points[0].x + offsetX;
							const y = cs.points[0].y + offsetY;
							const fontSize = cs.fontSize || 40;
							const textWidth = cs.text.length * fontSize * 0.6;
							parts.push(`      <rect x="${x - 10}" y="${y - fontSize}" width="${textWidth + 20}" height="${fontSize + 10}" />\n`);
						} else if (cs.points.length > 0) {
							const ap = cs.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
							parts.push(`      <path d="${createSmoothClosedPath(ap)}" />\n`);
						}
					});
					parts.push(`    </clipPath>\n`);
					parts.push(`  </defs>\n`);
				}
				renderShape(shape, clipId);
			});

			// Wrap this layer's emitted parts in a mask if erasers are present
			if (eraserShapes.length > 0) {
				const maskId = `mask-${zIndex}-${maskCounter++}`;
				const layerParts = parts.splice(startIndex);
				parts.push(`  <defs>\n`);
				parts.push(`    <mask id="${maskId}">\n`);
				parts.push(`      <rect width="${width}" height="${height}" fill="white"/>\n`);
				eraserShapes.forEach(eraser => {
					if (eraser.points.length > 0) {
						const ap = eraser.points.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
						parts.push(`      <path d="${createSmoothClosedPath(ap)}" fill="black"/>\n`);
					}
				});
				parts.push(`    </mask>\n`);
				parts.push(`  </defs>\n`);
				parts.push(`  <g mask="url(#${maskId})">\n`);
				parts.push(...layerParts);
				parts.push(`  </g>\n`);
			}

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
		const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
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

		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);

		const isCompressed = exportRequest === 'svgz' && typeof CompressionStream !== 'undefined';
		toast.success('Vector exported!', {
			description: isCompressed ? 'SVGZ file downloaded successfully' : 'SVG file downloaded successfully',
			duration: 2000,
		});
	} catch (e) {
		console.error("Export SVG failed", e);
		toast.error('Failed to export vector', {
			description: 'Please try again',
			duration: 3000,
		});
	}
	onFinish();
};

/**
 * Records 6 seconds of canvas animation and downloads it as WebM or MP4.
 * onFinish is called inside recorder.onstop (async) and on error.
 */
export const exportAsMP4 = (
	canvas: HTMLCanvasElement,
	projectName: string,
	recordedChunksRef: { current: Blob[] },
	onFinish: () => void
): void => {
	try {
		const stream = canvas.captureStream(60);
		let mimeType = 'video/webm;codecs=vp9';
		let ext = 'webm';
		if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
			mimeType = 'video/mp4;codecs=h264'; ext = 'mp4';
		} else if (MediaRecorder.isTypeSupported('video/mp4')) {
			mimeType = 'video/mp4'; ext = 'mp4';
		}

		const recorder = new MediaRecorder(stream, { mimeType });
		recordedChunksRef.current = [];
		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) recordedChunksRef.current.push(e.data);
		};
		recorder.onstop = () => {
			const blob = new Blob(recordedChunksRef.current, { type: mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const sanitizedName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
			a.download = `${sanitizedName}-${Date.now()}.${ext}`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success('Animation saved!', {
				description: 'Video loop downloaded successfully',
				duration: 2000,
			});
			onFinish();
		};
		recorder.start();
		setTimeout(() => { recorder.stop(); }, 6000);
	} catch (e) {
		console.error("Export MP4 failed", e);
		toast.error('Failed to save animation', {
			description: 'Please try again',
			duration: 3000,
		});
		onFinish();
	}
};
