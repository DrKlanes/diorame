// Canvas utility functions extracted from StrataCanvas.tsx

// `cell` = physical px per noise pixel (renderScale in an HQ export): the grain keeps its on-screen size.
export const createNoise = (w: number, h: number, alpha = 100, scale = 2, density = 0.45, cell = 1) => {
	if (w <= 0 || h <= 0) return null;
	const nw = Math.ceil(w / scale), nh = Math.ceil(h / scale);
	const nc = document.createElement('canvas'); nc.width = nw; nc.height = nh;
	const nCtx = nc.getContext('2d'); if (!nCtx) return null;
	const iData = nCtx.createImageData(nw, nh), buffer = new Uint32Array(iData.data.buffer);
	for (let i = 0; i < buffer.length; i++) if (Math.random() < density) buffer[i] = (alpha << 24) | 0;
	nCtx.putImageData(iData, 0, 0);
	if (cell === 1) return nc;
	const up = document.createElement('canvas'); up.width = Math.ceil(nw * cell); up.height = Math.ceil(nh * cell);
	const uCtx = up.getContext('2d'); if (!uCtx) return null;
	uCtx.imageSmoothingEnabled = false;
	uCtx.drawImage(nc, 0, 0, up.width, up.height);
	return up;
};

// The Math.random draws createNoise(w, h, …, scale) would make, without its canvases (v3.25.18): when nothing uses the
// grain, the render skips the noise but leaves Math.random exactly where it was, so everything drawn after it (the ink
// texture) is byte-identical under a seed.
export const consumeNoiseRandoms = (w: number, h: number, scale = 2): void => {
	if (w <= 0 || h <= 0) return;
	const n = Math.ceil(w / scale) * Math.ceil(h / scale);
	for (let i = 0; i < n; i++) Math.random();
};

export const drawSmoothLine =(context: CanvasRenderingContext2D, points: { x: number, y: number }[]) => {
	if (points.length < 2) return;
	context.beginPath();
	context.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length - 1; i++) {
		const xc = (points[i].x + points[i + 1].x) / 2, yc = (points[i].y + points[i + 1].y) / 2;
		context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
	}
	context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
};

// Draw without smoothing - for uniform line strokes to maintain exact width
export const drawStraightLine = (context: CanvasRenderingContext2D, points: { x: number, y: number }[]) => {
	if (points.length < 2) return;
	context.beginPath();
	context.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++) {
		context.lineTo(points[i].x, points[i].y);
	}
};
