import { Shape } from '../../../types/strataTypes';
import { layoutText } from '../../../utils/textLayout';
import { measureTextBlock, rotatedCorners } from '../../../utils/textMetrics';

export const getLayerBoundingBox = (shapes: Shape[]) => {
	if (shapes.length === 0) return null;

	// First, get rough bounds from all non-eraser shapes to size the temp canvas
	let roughMinX = Infinity, roughMaxX = -Infinity, roughMinY = Infinity, roughMaxY = -Infinity;

	shapes.forEach(s => {
		if (s.isEraser) return; // Skip erasers for rough bounds
		// A text shape's points is a lone anchor: its extent is the measured ink, rotated like the text.
		const extent = s.type === 'text' && s.text && s.points.length > 0
			? [...s.points, ...rotatedCorners(measureTextBlock(s).ink, s.points[0], s.rotation || 0)]
			: s.points;
		extent.forEach(p => {
			if (p.x < roughMinX) roughMinX = p.x;
			if (p.x > roughMaxX) roughMaxX = p.x;
			if (p.y < roughMinY) roughMinY = p.y;
			if (p.y > roughMaxY) roughMaxY = p.y;
		});
	});

	if (roughMinX === Infinity) return null;

	// Add padding for line thickness and effects
	const padding = 100;
	roughMinX -= padding;
	roughMinY -= padding;
	roughMaxX += padding;
	roughMaxY += padding;

	const width = roughMaxX - roughMinX;
	const height = roughMaxY - roughMinY;

	// Create temporary canvas to render actual visible geometry
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = Math.ceil(width);
	tempCanvas.height = Math.ceil(height);
	const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
	if (!tempCtx) return null;

	// Render all shapes with proper composite operations
	shapes.forEach(s => {
		const localPoints = s.points.map(p => ({ x: p.x - roughMinX, y: p.y - roughMinY }));

		if (s.type === 'text' && s.text && localPoints.length > 0) {
			// Text rendering: same layout as renderTextShape (font, spacing, lines, rotation around the anchor)
			const layout = layoutText(s, s.fontSize || 40);
			tempCtx.font = layout.font;
			// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
			tempCtx.letterSpacing = layout.letterSpacing;
			tempCtx.fillStyle = s.color;
			tempCtx.textAlign = layout.align;
			tempCtx.textBaseline = 'middle';

			if (s.isEraser) {
				tempCtx.globalCompositeOperation = 'destination-out';
			} else if (s.isDrawBehind) {
				tempCtx.globalCompositeOperation = 'destination-over';
			} else if (s.isDrawInside) {
				tempCtx.globalCompositeOperation = 'source-atop';
			} else {
				tempCtx.globalCompositeOperation = 'source-over';
			}

			tempCtx.save();
			tempCtx.translate(localPoints[0].x, localPoints[0].y);
			tempCtx.rotate(s.rotation || 0);
			layout.lines.forEach(line => {
				tempCtx.fillText(line.text, 0, line.y);
			});
			tempCtx.restore();
		} else if (localPoints.length > 0) {
			// Stroke rendering
			if (s.isEraser) {
				tempCtx.globalCompositeOperation = 'destination-out';
				tempCtx.fillStyle = '#000000';
			} else if (s.isDrawBehind) {
				tempCtx.globalCompositeOperation = 'destination-over';
				tempCtx.fillStyle = s.color;
			} else if (s.isDrawInside) {
				tempCtx.globalCompositeOperation = 'source-atop';
				tempCtx.fillStyle = s.color;
			} else {
				tempCtx.globalCompositeOperation = 'source-over';
				tempCtx.fillStyle = s.color;
			}

			tempCtx.beginPath();
			tempCtx.moveTo(localPoints[0].x, localPoints[0].y);
			for (let i = 1; i < localPoints.length; i++) {
				tempCtx.lineTo(localPoints[i].x, localPoints[i].y);
			}
			tempCtx.closePath();
			tempCtx.fill();
		}
	});

	// Scan pixels to find actual visible bounds
	const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
	const data = imageData.data;

	let minX = tempCanvas.width, maxX = 0, minY = tempCanvas.height, maxY = 0;
	let hasVisiblePixel = false;

	for (let y = 0; y < tempCanvas.height; y++) {
		for (let x = 0; x < tempCanvas.width; x++) {
			const i = (y * tempCanvas.width + x) * 4;
			const alpha = data[i + 3];

			if (alpha > 0) {
				hasVisiblePixel = true;
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}

	if (!hasVisiblePixel) return null;

	// Convert back to world coordinates
	const worldMinX = minX + roughMinX;
	const worldMaxX = maxX + roughMinX;
	const worldMinY = minY + roughMinY;
	const worldMaxY = maxY + roughMinY;

	return {
		minX: worldMinX,
		maxX: worldMaxX,
		minY: worldMinY,
		maxY: worldMaxY,
		width: worldMaxX - worldMinX,
		height: worldMaxY - worldMinY,
		cx: (worldMinX + worldMaxX) / 2,
		cy: (worldMinY + worldMaxY) / 2
	};
};
