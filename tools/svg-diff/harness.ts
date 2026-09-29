// SVG export fidelity instrument. Two independent sources, one diff:
//   reference = renderFrame (the same pipeline the HQ PNG export uses), one layer at a time
//   candidate = exportAsSVG output, rasterized by the browser
// Everything is flattened to a binary ink mask so the diff measures geometry, not color/FX.
import { renderFrame, type RenderContext } from '../../src/components/strata/canvas/renderPipeline';
import { exportAsSVG } from '../../src/components/strata/canvas/svgExport';
import { initialState, BASE_DEPTH_STEP } from '../../src/components/strata/StrataContext';
import type { Shape } from '../../src/types/strataTypes';

export type Mask = { w: number; h: number; data: Uint8Array };
export type Calibration = { sc: number; tx: number; ty: number };
export type DiffResult = { structPx: number; rawPct: number; structPct: number; structOfInk: number; sc: number };

const CAL_HALF = 400;

export const blackInk = (shapes: Shape[]): Shape[] => shapes.map(s => ({ ...s, color: '#000000' }));

// Renders the shapes of layer z through the real pipeline: DRAW mode, light theme, no FX.
export const renderReference = (shapes: Shape[], z: number, size: number): HTMLCanvasElement => {
	const own = shapes.filter(s => s.zIndex === z);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d', { alpha: false })!;
	const pixel = document.createElement('canvas');
	pixel.width = 1; pixel.height = 1;
	const rc: RenderContext = {
		state: {
			...initialState,
			shapes: own,
			mode: 'drawing',
			isDarkMode: false,
			isAnimationMode: false,
			hiddenLayers: [],
			currentLayerIndex: Math.round(Math.abs(z / BASE_DEPTH_STEP)),
		},
		isDrawing: false,
		currentPoints: [],
		shapesByZ: new Map([[z, own]]),
		waypoints: [],
		sortedZs: [z],
		transformState: {
			isActive: false,
			mode: 'none',
			startP: { x: 0, y: 0 },
			startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
			centerX: 0,
			centerY: 0,
			layerBB: null,
			currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
			engaged: false,
		},
		cameraRef: { current: { x: 0, y: 0, z: 0, rotation: 0 } },
		storyFocusRef: { current: null },
		lastShakeRef: { current: { x: 0, y: 0, z: 0 } },
		transformHandlesRef: { current: null },
		poiMarkerSetAtRef: { current: 0 },
		drawnFrameRef: { current: null },
		lastRenderTimeRef: { current: 0 },
		orbitRef: { current: { azimuth: 0, elevation: 0.2, targetAzimuth: 0, targetElevation: 0.2, panOffsetX: 0, panOffsetY: 0 } },
		accumulatedTimeRef: { current: 0 },
		accumulatedHandheldTimeRef: { current: 0 },
		lastTimeRef: { current: Date.now() },
		wiggleFrameRef: { current: 0 },
		shapePatternRef: { current: null },
		offscreenCanvasRef: { current: document.createElement('canvas') },
		helperCanvasRef: { current: document.createElement('canvas') },
		compositionCanvasRef: { current: document.createElement('canvas') },
		pixelCanvasRef: { current: pixel },
		tempCanvasRef: { current: null },
		noiseCanvasRef: { current: null },
		paperImg: null,
		risoGrain: null,
		grungeImg: null,
		particles: [],
		flipButtonsEl: null,
		w: size,
		h: size,
		getActiveZ: i => i * -BASE_DEPTH_STEP,
		skipLiveStroke: true,
		skipCinematicOverlays: true,
		renderScale: 1,
	};
	renderFrame(ctx, rc);
	return canvas;
};

// Ink = dark pixel over the light background.
export const maskFromReference = (canvas: HTMLCanvasElement): Mask => {
	const { width: w, height: h } = canvas;
	const d = canvas.getContext('2d')!.getImageData(0, 0, w, h).data;
	const data = new Uint8Array(w * h);
	for (let i = 0; i < data.length; i++) data[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 < 128 ? 1 : 0;
	return { w, h, data };
};

// World→pixel map of layer z, measured (not derived) from a known square: layers
// behind the active one are scaled by perspective even in DRAW mode.
export const calibrate = (z: number, size: number): Calibration => {
	const sq: Shape = {
		id: 'calibration',
		zIndex: z,
		color: '#000000',
		points: [{ x: -CAL_HALF, y: -CAL_HALF }, { x: CAL_HALF, y: -CAL_HALF }, { x: CAL_HALF, y: CAL_HALF }, { x: -CAL_HALF, y: CAL_HALF }],
	};
	const m = maskFromReference(renderReference([sq], z, size));
	let x0 = size, x1 = -1, y0 = size;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			if (!m.data[y * size + x]) continue;
			if (x < x0) x0 = x;
			if (x > x1) x1 = x;
			if (y < y0) y0 = y;
		}
	}
	const sc = (x1 + 1 - x0) / (2 * CAL_HALF);
	return { sc, tx: x0 + CAL_HALF * sc, ty: y0 + CAL_HALF * sc };
};

// Runs the real exportAsSVG and captures the blob instead of downloading it.
export const captureSVG = async (shapes: Shape[]): Promise<string> => {
	const origCreate = URL.createObjectURL;
	const origClick = HTMLAnchorElement.prototype.click;
	let blob: Blob | null = null;
	URL.createObjectURL = (b: Blob | MediaSource) => { blob = b as Blob; return 'blob:svg-diff'; };
	HTMLAnchorElement.prototype.click = function () {};
	try {
		await exportAsSVG('svg', shapes, 'svg-diff', () => {}, key => key);
	} finally {
		URL.createObjectURL = origCreate;
		HTMLAnchorElement.prototype.click = origClick;
	}
	if (!blob) throw new Error('exportAsSVG produced no file');
	return (blob as Blob).text();
};

// Same bounds math as exportAsSVG: world coordinate + offset = SVG coordinate.
export const svgOffset = (shapes: Shape[]): { ox: number; oy: number } => {
	let minX = Infinity, minY = Infinity;
	shapes.forEach(s => {
		const pts = s.isEraser && s.eraserPolygon ? [...s.points, ...s.eraserPolygon] : s.points;
		pts.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); });
	});
	return { ox: -minX + 50, oy: -minY + 50 };
};

export const rasterizeSVG = async (svg: string, shapes: Shape[], cal: Calibration, size: number): Promise<Mask> => {
	const { ox, oy } = svgOffset(shapes);
	const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
	const img = new Image();
	try {
		await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
	} finally {
		URL.revokeObjectURL(url);
	}
	const canvas = document.createElement('canvas');
	canvas.width = size; canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(cal.sc, 0, 0, cal.sc, cal.tx - cal.sc * ox, cal.ty - cal.sc * oy);
	ctx.drawImage(img, 0, 0);
	const d = ctx.getImageData(0, 0, size, size).data;
	const data = new Uint8Array(size * size);
	for (let i = 0; i < data.length; i++) data[i] = d[i * 4 + 3] > 127 ? 1 : 0;
	return { w: size, h: size, data };
};

// structPx: mismatches with no agreeing pixel within 2px — immune to antialias edge flips.
export const diffMasks = (a: Mask, b: Mask): Omit<DiffResult, 'sc'> => {
	const { w, h } = a;
	let raw = 0, struct = 0, union = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (a.data[i] || b.data[i]) union++;
			if (a.data[i] === b.data[i]) continue;
			raw++;
			let agree = false;
			for (let dy = -2; dy <= 2 && !agree; dy++) {
				for (let dx = -2; dx <= 2; dx++) {
					const yy = y + dy, xx = x + dx;
					if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
					const j = yy * w + xx;
					if (a.data[j] === a.data[i] && b.data[j] === a.data[i]) { agree = true; break; }
				}
			}
			if (!agree) struct++;
		}
	}
	const n = w * h;
	return {
		structPx: struct,
		rawPct: +(100 * raw / n).toFixed(3),
		structPct: +(100 * struct / n).toFixed(3),
		structOfInk: +(100 * struct / Math.max(1, union)).toFixed(2),
	};
};

export type LayerRun = DiffResult & { z: number; reference: Mask; candidate: Mask };

// Each layer is exported and compared on its own: layers only stack, so the per-layer
// alpha is where eraser / drawInside / drawBehind fidelity lives.
export const runScene = async (shapes: Shape[], size: number): Promise<LayerRun[]> => {
	const ink = blackInk(shapes);
	const zs = [...new Set(ink.map(s => s.zIndex))].sort((a, b) => b - a);
	const out: LayerRun[] = [];
	for (const z of zs) {
		const own = ink.filter(s => s.zIndex === z);
		const cal = calibrate(z, size);
		const reference = maskFromReference(renderReference(own, z, size));
		const candidate = await rasterizeSVG(await captureSVG(own), own, cal, size);
		out.push({ z, reference, candidate, ...diffMasks(reference, candidate), sc: +cal.sc.toFixed(4) });
	}
	return out;
};

// Grey = both agree on ink, red = ink only in SVG, blue = ink only in Canvas.
export const diffImage = (ref: Mask, cand: Mask): HTMLCanvasElement => {
	const canvas = document.createElement('canvas');
	canvas.width = ref.w; canvas.height = ref.h;
	const ctx = canvas.getContext('2d')!;
	const img = ctx.createImageData(ref.w, ref.h);
	for (let i = 0; i < ref.data.length; i++) {
		const r = ref.data[i], c = cand.data[i];
		const rgb = r && c ? [170, 170, 170] : c ? [255, 0, 0] : r ? [0, 90, 255] : [255, 255, 255];
		img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
	}
	ctx.putImageData(img, 0, 0);
	return canvas;
};
