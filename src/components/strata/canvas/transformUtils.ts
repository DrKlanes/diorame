import { Shape } from '../../../types/strataTypes';

export const getLayerBoundingBox = (shapes: Shape[]) => {
	if (shapes.length === 0) return null;

	// First, get rough bounds from all non-eraser shapes to size the temp canvas
	let roughMinX = Infinity, roughMaxX = -Infinity, roughMinY = Infinity, roughMaxY = -Infinity;

	shapes.forEach(s => {
		if (s.isEraser) return; // Skip erasers for rough bounds
		s.points.forEach(p => {
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
			// Text rendering
			const fontSize = s.fontSize || 40;
			const fontName = s.font === 'noir' ? '"Courier Prime", monospace' : s.font === 'mansion' ? '"Cinzel", serif' : '"Inter", sans-serif';
			tempCtx.font = `bold ${fontSize}px ${fontName}`;
			tempCtx.fillStyle = s.color;
			tempCtx.textAlign = (s.align || 'left') as CanvasTextAlign;
			tempCtx.textBaseline = 'middle';

			const lines = s.text.split('\n');
			const lineHeight = fontSize * 1.2;
			const startY = localPoints[0].y - (lines.length - 1) * lineHeight / 2;

			if (s.isEraser) {
				tempCtx.globalCompositeOperation = 'destination-out';
			} else if (s.isDrawBehind) {
				tempCtx.globalCompositeOperation = 'destination-over';
			} else if (s.isDrawInside) {
				tempCtx.globalCompositeOperation = 'source-atop';
			} else {
				tempCtx.globalCompositeOperation = 'source-over';
			}

			lines.forEach((line, i) => {
				tempCtx.fillText(line, localPoints[0].x, startY + i * lineHeight);
			});
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
