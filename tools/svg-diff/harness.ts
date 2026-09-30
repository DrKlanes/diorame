// SVG export fidelity instrument. Two independent sources, one diff:
//   reference = renderFrame (the same pipeline the HQ PNG export uses), one layer at a time
//   candidate = exportAsSVG output, rasterized by the browser
// Everything is flattened to a binary ink mask so the diff measures geometry, not color/FX.
import { renderFrame, type RenderContext } from '../../src/components/strata/canvas/renderPipeline';
import { exportAsSVG, svgBounds } from '../../src/components/strata/canvas/svgExport';
import { prepareText, textOutline } from '../../src/components/strata/canvas/svgText';
import { TEXT_FONTS, type TextFontKey } from '../../src/utils/textLayout';
import { loadPaper, buildLayerGeometry, smoothPathData } from '../../src/components/strata/canvas/svgGeometry';
import { initialState, BASE_DEPTH_STEP } from '../../src/components/strata/StrataContext';
import type { Shape } from '../../src/types/strataTypes';

export type Mask = { w: number; h: number; data: Uint8Array };
export type Calibration = { sc: number; tx: number; ty: number };
export type DiffResult = { structPx: number; rawPct: number; structPct: number; structOfInk: number; sc: number };

const CAL_HALF = 400;

export const blackInk = (shapes: Shape[]): Shape[] => shapes.map(s => ({ ...s, color: '#000000' }));

// Renders the shapes of layer z through the real pipeline: DRAW mode, light theme, no FX.
// renderScale > 1 supersamples (same pipeline as the HQ PNG): size stays the physical raster,
// the view covers size/renderScale world units. Needed to see 1-unit dots at all.
export const renderReference = (shapes: Shape[], z: number, size: number, renderScale = 1): HTMLCanvasElement => {
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
		w: size / renderScale,
		h: size / renderScale,
		getActiveZ: i => i * -BASE_DEPTH_STEP,
		skipLiveStroke: true,
		skipCinematicOverlays: true,
		renderScale,
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
export const calibrate = (z: number, size: number, renderScale = 1): Calibration => {
	// Densely sampled edges: the blob's quadratic smoothing then only rounds the corners negligibly.
	const edge = (ax: number, ay: number, bx: number, by: number) =>
		Array.from({ length: 400 }, (_, i) => ({ x: ax + (bx - ax) * i / 400, y: ay + (by - ay) * i / 400 }));
	const h = Math.min(CAL_HALF, size / renderScale * 0.4);
	const sq: Shape = {
		id: 'calibration',
		zIndex: z,
		color: '#000000',
		points: [...edge(-h, -h, h, -h), ...edge(h, -h, h, h), ...edge(h, h, -h, h), ...edge(-h, h, -h, -h)],
	};
	// Sub-pixel: area and centroid from antialiased coverage, not the integer bbox (a 1/800
	// scale error is ~1 px at the edge of a big scene — enough to flag thin slivers).
	const canvas = renderReference([sq], z, size, renderScale);
	const d = canvas.getContext('2d')!.getImageData(0, 0, size, size).data;
	const bg = (d[0] + d[1] + d[2]) / 3;
	let area = 0, sx = 0, sy = 0;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const i = (y * size + x) * 4;
			const cov = Math.min(1, Math.max(0, (bg - (d[i] + d[i + 1] + d[i + 2]) / 3) / bg));
			area += cov; sx += cov * (x + 0.5); sy += cov * (y + 0.5);
		}
	}
	return { sc: Math.sqrt(area) / (2 * h), tx: sx / area, ty: sy / area };
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

// The exporter's own bounds (svgBounds, text blocks included): world + offset = SVG coordinate.
export const svgOffset = async (shapes: Shape[]): Promise<{ ox: number; oy: number }> => {
	const { minX, minY } = svgBounds(shapes, await prepareText(shapes));
	return { ox: -minX + 50, oy: -minY + 50 };
};

export const rasterizeSVG = async (svg: string, shapes: Shape[], cal: Calibration, size: number): Promise<Mask> => {
	const { ox, oy } = await svgOffset(shapes);
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

// masks: <mask>/<clipPath> left in the SVG. Real-geometry export should emit none (Illustrator's
// Outline view and Pathfinder ignore them); only text and failed boolean ops fall back to them.
// texts: live <text> left in the SVG (text words that could not become outlines; counted apart).
export type LayerRun = DiffResult & { z: number; masks: number; texts: number; reference: Mask; candidate: Mask };

// Each layer is exported and compared on its own: layers only stack, so the per-layer
// alpha is where eraser / drawInside / drawBehind fidelity lives.
export const runScene = async (shapes: Shape[], size: number, renderScale = 1): Promise<LayerRun[]> => {
	const ink = blackInk(shapes);
	const zs = [...new Set(ink.map(s => s.zIndex))].sort((a, b) => b - a);
	const out: LayerRun[] = [];
	for (const z of zs) {
		const own = ink.filter(s => s.zIndex === z);
		const cal = calibrate(z, size, renderScale);
		const reference = maskFromReference(renderReference(own, z, size, renderScale));
		const svg = await captureSVG(own);
		const candidate = await rasterizeSVG(svg, own, cal, size);
		const masks = (svg.match(/<mask|<clipPath/g) || []).length;
		const texts = (svg.match(/<text/g) || []).length;
		out.push({ z, masks, texts, reference, candidate, ...diffMasks(reference, candidate), sc: +cal.sc.toFixed(4) });
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

// Brush audit: every uniform stroke alone, geometry vs Canvas's round-capped stroke, same
// structural metric as the table (area ratios flag antialias on 2-unit dots). Catches a dropped
// cap or join that a whole-scene diff dilutes — it found a paper.js tangency bug.
export const auditStrokes = async (shapes: Shape[]): Promise<{ total: number; bad: number; worstPx: number }> => {
	const P = await loadPaper();
	const strokes = shapes.filter(s => !s.isEraser && s.brushMode === 'uniform' && s.originalPoints && s.originalPoints.length > 0);
	const size = 600;
	const canvas = document.createElement('canvas');
	canvas.width = size; canvas.height = size;
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
	const mask = (): Mask => {
		const d = ctx.getImageData(0, 0, size, size).data;
		const data = new Uint8Array(size * size);
		for (let i = 0; i < data.length; i++) data[i] = d[i * 4 + 3] > 127 ? 1 : 0;
		return { w: size, h: size, data };
	};
	let bad = 0, worst = 0;
	for (const s of strokes) {
		const o = s.originalPoints!;
		const xs = o.map(p => p.x), ys = o.map(p => p.y);
		const th = s.brushThickness || 20;
		const k = Math.min(4, (size - 40) / (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + th + 10));
		const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
		const f = (p: { x: number; y: number }) => ({ x: (p.x - cx) * k + size / 2, y: (p.y - cy) * k + size / 2 });
		const one: Shape = { ...s, isDrawInside: false, isDrawBehind: false, points: s.points.map(f), originalPoints: o.map(f), brushThickness: th * k };
		ctx.clearRect(0, 0, size, size);
		ctx.lineWidth = th * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
		ctx.stroke(new Path2D(smoothPathData(one.originalPoints!, false)));
		const ref = mask();
		const g = await buildLayerGeometry(P, [one], 0, 0, async () => {}, null);
		ctx.clearRect(0, 0, size, size);
		g.pieces.forEach(pc => { if (pc.d) ctx.fill(new Path2D(pc.d)); });
		const px = diffMasks(ref, mask()).structPx;
		if (px > 10) bad++;
		worst = Math.max(worst, px);
	}
	return { total: strokes.length, bad, worstPx: worst };
};

// Glyph audit: every character of every text face, exported alone, against Canvas. Independent
// of the exporter's own word check: a glyph is 'contour' (outline matches), 'fallback' (exported
// as live text — acceptable, counted) or 'bad' (an outline that does NOT match: must be 0).
export const auditGlyphs = async (): Promise<Record<string, { total: number; contour: number; fallback: string[]; bad: string[] }>> => {
	const size = 80, W = 260, H = 200;
	const canvas = document.createElement('canvas');
	canvas.width = W; canvas.height = H;
	const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
	const mask = (): Mask => {
		const d = ctx.getImageData(0, 0, W, H).data;
		const data = new Uint8Array(W * H);
		for (let i = 0; i < data.length; i++) data[i] = d[i * 4 + 3] > 127 ? 1 : 0;
		return { w: W, h: H, data };
	};
	const out: Record<string, { total: number; contour: number; fallback: string[]; bad: string[] }> = {};
	for (const key of Object.keys(TEXT_FONTS) as TextFontKey[]) {
		const probe: Shape = { id: 'glyph', type: 'text', text: 'a', font: key, align: 'left', fontSize: size, zIndex: 0, color: '#000', points: [{ x: 60, y: 100 }] };
		const engine = (await prepareText([probe]))!;
		const font = engine.fonts[key]!;
		const spec = TEXT_FONTS[key];
		const chars = font.characterSet.filter(c => c > 32 && c !== 0xad && c !== 0xa0).map(c => String.fromCodePoint(c));
		const r = { total: chars.length, contour: 0, fallback: [] as string[], bad: [] as string[] };
		for (const ch of chars) {
			const t = textOutline(engine, { ...probe, text: ch }, 0, 0);
			if (t.runs.length > 0) { r.fallback.push(ch); continue; }
			ctx.clearRect(0, 0, W, H);
			ctx.font = `${spec.weight} ${size}px ${spec.family}`;
			// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
			ctx.letterSpacing = spec.letterSpacingEm ? `${spec.letterSpacingEm}em` : '0px';
			ctx.textBaseline = 'middle';
			ctx.fillText(ch, 60, 100);
			const reference = mask();
			ctx.clearRect(0, 0, W, H);
			ctx.fill(new Path2D(t.d));
			if (diffMasks(reference, mask()).structPx > 4) r.bad.push(ch); else r.contour++;
		}
		out[key] = r;
	}
	return out;
};
