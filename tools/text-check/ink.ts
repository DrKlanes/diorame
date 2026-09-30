// What the real renderers paint, as ink. The truth every text-check section measures against:
// never the math under test (a box computed from textMetrics cannot validate textMetrics).
import { renderTextShape } from '../../src/components/strata/canvas/renderTextShape';
import { appReducer, initialState } from '../../src/components/strata/StrataContext';
import type { Shape } from '../../src/types/strataTypes';

export const INK_SIZE = 3000;

export type Ink = {
	minX: number; maxX: number; minY: number; maxY: number; // world units, pixel-index convention
	empty: boolean;
	alpha: Uint8ClampedArray; // every 4th byte of the RGBA raster, INK_SIZE × INK_SIZE
	ox: number; oy: number;   // world point at the raster's centre
};

/** Paints shapes 1 world unit = 1 px around (ox, oy): text through renderTextShape, polygons as
 * plain fills with their eraser composite. Alpha > 0 counts as ink, antialias included. */
export const paintInk = (shapes: Shape[], ox: number, oy: number): Ink => {
	const S = INK_SIZE;
	const c = document.createElement('canvas');
	c.width = S; c.height = S;
	const ctx = c.getContext('2d', { willReadFrequently: true })!;
	for (const s of shapes) {
		if (s.type === 'text') {
			renderTextShape(ctx, s, s.points[0], (x, y) => ({ x: x - ox + S / 2, y: y - oy + S / 2, scale: 1, opacity: 1 }), 0, 0, { layerRenderModes: {}, layerGradParams: {} });
		} else {
			ctx.globalCompositeOperation = s.isEraser ? 'destination-out' : 'source-over';
			ctx.beginPath();
			s.points.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, p.x - ox + S / 2, p.y - oy + S / 2));
			ctx.closePath();
			ctx.fill();
			ctx.globalCompositeOperation = 'source-over';
		}
	}
	const alpha = ctx.getImageData(0, 0, S, S).data;
	let x0 = S, x1 = -1, y0 = S, y1 = -1;
	for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
		if (!alpha[(y * S + x) * 4 + 3]) continue;
		if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
	}
	return { minX: x0 - S / 2 + ox, maxX: x1 - S / 2 + ox, minY: y0 - S / 2 + oy, maxY: y1 - S / 2 + oy, empty: x1 < 0, alpha, ox, oy };
};

/** Centres (world) of painted pixels, every `stride`-th row and column. */
export const inkPoints = (ink: Ink, stride: number): [number, number][] => {
	const S = INK_SIZE, pts: [number, number][] = [];
	for (let y = 0; y < S; y += stride) for (let x = 0; x < S; x += stride) {
		if (ink.alpha[(y * S + x) * 4 + 3]) pts.push([x + 0.5 - S / 2 + ink.ox, y + 0.5 - S / 2 + ink.oy]);
	}
	return pts;
};

type Action = Parameters<typeof appReducer>[1];

/** The REAL reducer on a one-layer scene (layer 0): what TRANSFORM_LAYER / FLIP_LAYER produce. */
export const reduce = (shapes: Shape[], actions: Action[]): Shape[] => {
	let st = { ...initialState, shapes, totalLayers: 1, currentLayerIndex: 0 };
	for (const a of actions) st = appReducer(st, a);
	return st.shapes;
};

export const stretch = (sx: number, sy: number, cx = 40, cy = 10): Action =>
	({ type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0, scale: 1, dx: 0, dy: 0, centerX: cx, centerY: cy, scaleX: sx, scaleY: sy } } });
export const rotate = (rotation: number, cx = 40, cy = 10): Action =>
	({ type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation, scale: 1, dx: 0, dy: 0, centerX: cx, centerY: cy } } });
export const flip = (direction: 'horizontal' | 'vertical', cx = 40, cy = 10): Action =>
	({ type: 'FLIP_LAYER', payload: { layerIndex: 0, direction, centerX: cx, centerY: cy } });

export const FONTS = ['pharma', 'noir', 'mansion', 'comic', 'dungeons'] as const;

export const text = (font: Shape['font'], t: string, rotation: number, align: Shape['align'], x = 120, y = -60, fontSize = 40): Shape =>
	({ id: `t-${font}`, type: 'text', points: [{ x, y }], color: '#000000', zIndex: 0, text: t, font, align, fontSize, rotation, isDrawInside: false, isDrawBehind: false });
export const polygon = (id: string, points: { x: number; y: number }[], extra: Partial<Shape> = {}): Shape =>
	({ id, points, color: '#000000', zIndex: 0, ...extra });
