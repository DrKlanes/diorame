import { createFullSource, createLayeredSource } from './timelapseSources';
import { drawingBounds } from './drawingBounds';
import { appearanceRanks, frameShapeCounts, paintsLayer } from './timelapseSchedule';
import { createMp4Writer, timelapseCodec, TIMELAPSE_FPS, type Mp4Writer } from './timelapseEncode';
import { visibleWorldRect, type Rect } from '../../../utils/formatFrame';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { AppState } from '../../../types/strataTypes';

/**
 * DRAW timelapse (v3.25.17; UI v3.25.19; per-layer cache, rates and work-based progress v3.25.20). The drawing is rebuilt
 * offline from its shapes, not recorded: frame i shows the first k(i) shapes in appearance order (timelapseSchedule.ts),
 * each one whole, painted by a frame source (timelapseSources.ts: a cache per layer, or the full re-render) and handed
 * to the H.264 encoder. A frame whose k did not change is encoded again without repainting.
 */

export const TIMELAPSE_DURATIONS: readonly number[] = [15, 30, 60];
export const TIMELAPSE_LONG_SIDES: readonly number[] = [1080, 1920];
export const TIMELAPSE_RATES: readonly number[] = [15, 30];
export const TIMELAPSE_HOLD_S = 2.5;

export type TimelapseFraming = 'format' | 'view' | 'drawing';
export type TimelapseBackground = 'paper' | 'solid';

/** The rectangle of the active layer's plane a framing covers (the PNG's framings), or null if there is none. */
export function timelapseRect(state: AppState, framing: TimelapseFraming, viewport: { w: number; h: number }): Rect | null {
	if (framing === 'format') return state.format ? { ...state.format.rect } : null;
	if (framing === 'view') return visibleWorldRect(state.drawingZoom, state.drawingPan, viewport.w, viewport.h);
	return drawingBounds(state);
}

/** Video size: the long side given, the aspect kept, both sides even (H.264 4:2:0). No bars. */
export function timelapseSize(rect: { w: number; h: number }, long: number): { width: number; height: number } {
	const even = (v: number) => Math.max(2, 2 * Math.round(v / 2));
	return rect.w >= rect.h
		? { width: even(long), height: even(long * rect.h / rect.w) }
		: { width: even(long * rect.w / rect.h), height: even(long) };
}

export type TimelapseOptions = {
	rect: Rect;
	width: number;
	height: number;
	background: TimelapseBackground;
	/** Seconds over which the shapes appear; the hold comes after. */
	duration: number;
	/** Frames per second of the MP4 (v3.25.20: 15 by default — Diorame's stepped look — or 30). */
	fps?: number;
	holdSeconds?: number;
	/** v3.25.20: the per-layer cache (default). false = the full re-render of every repaint (the v3.25.17 path, kept to compare). */
	layerCache?: boolean;
	signal?: AbortSignal;
	onProgress?: (p: TimelapseProgressInfo) => void;
	/** The export's seed (random when absent): a reproducible video. */
	seed?: number;
	/** Called after each repaint with the frame index and the canvas the encoder reads (verification). */
	inspect?: (frame: number, canvas: HTMLCanvasElement) => void;
};

/**
 * Progress by WORK, not by frames (v3.25.20): late frames paint far more shapes than early ones, so a frame count
 * runs fast and then crawls. Each repaint's time is fitted online (least squares) as a·shapes + b·renders + c (renders =
 * layers re-rendered, each with its fixed cost; c = stacking the frame), and each frame adds the measured mean of
 * copy + encode. `fraction` and `etaMs` come from that same model over the frames planned ahead (etaMs null until fitted).
 */
export type TimelapseProgressInfo = { done: number; total: number; fraction: number; etaMs: number | null };

export type TimelapseResult = {
	blob: Blob;
	codec: string;
	frames: number;
	repaints: number;
	shapes: number;
	/** Shapes rendered over the whole video (the work the progress follows). */
	work: number;
	ms: number;
	renderMs: number;
	encodeMs: number;
};

// A task boundary (not setTimeout: background tabs throttle timers to ≥ 1 s), so the page can paint the progress.
const yieldToPage = () => new Promise<void>(resolve => {
	const channel = new MessageChannel();
	channel.port1.onmessage = () => resolve();
	channel.port2.postMessage(0);
});

const aborted = () => new DOMException('Timelapse canceled', 'AbortError');

// Online least squares for repaint time ≈ a·shapes + b·renders + c (a small ridge keeps it solvable early on; negative
// coefficients are clamped: a cost cannot be negative). Null until a few repaints are in.
function createFit() {
	const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], y = [0, 0, 0];
	let n = 0;
	return {
		add(shapes: number, renders: number, ms: number) {
			const x = [shapes, renders, 1];
			for (let r = 0; r < 3; r++) { y[r] += x[r] * ms; for (let c = 0; c < 3; c++) A[r][c] += x[r] * x[c]; }
			n++;
		},
		solve(): [number, number, number] | null {
			if (n < 3) return null;
			const M = A.map((row, r) => [...row.map((v, c) => v + (r === c ? 1e-6 * (A[r][r] || 1) : 0)), y[r]]);
			for (let col = 0; col < 3; col++) {
				let piv = col;
				for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
				[M[col], M[piv]] = [M[piv], M[col]];
				if (Math.abs(M[col][col]) < 1e-12) return null;
				for (let r = 0; r < 3; r++) if (r !== col) { const f = M[r][col] / M[col][col]; for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c]; }
			}
			return [0, 1, 2].map(i => Math.max(0, M[i][3] / M[i][i])) as [number, number, number];
		},
	};
}

/** Renders and encodes the timelapse; resolves with the MP4. Throws AbortError when `signal` aborts. */
export async function renderTimelapse(options: AnimationExportRenderOptions, o: TimelapseOptions): Promise<TimelapseResult> {
	const t0 = performance.now();
	const fps = o.fps ?? TIMELAPSE_FPS;
	const codec = await timelapseCodec(o.width, o.height, fps);
	if (!codec) throw new Error(`no H.264 encoder for ${o.width}×${o.height} here`);

	const shapes = options.state.shapes;
	const { rank, count } = appearanceRanks(shapes, paintsLayer(options.state));
	const drawFrames = Math.max(2, Math.round(o.duration * fps));
	const total = drawFrames + Math.round((o.holdSeconds ?? TIMELAPSE_HOLD_S) * fps);
	const ks = Array.from(frameShapeCounts(shapes, rank, count, drawFrames, total));

	// One seed for the export: the first render makes the ink texture with it and later renders reuse it, so every frame
	// is exactly the PNG export of its scene with this seed — as «Capas (ZIP)» does across its layers.
	const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
	const make = o.layerCache === false ? createFullSource : createLayeredSource;
	const source = make(options, o.rect, o.width, o.height, o.background, shapes, rank, seed);
	const work = source.planWork(ks);
	const totalWork = work.reduce((a, w) => a + w.shapes, 0);
	const fit = createFit();
	// The encoder reads a 1:1 copy, never a canvas the pipeline renders into. Measured in Chrome: once a canvas has been
	// through WebCodecs (VideoFrame), its later renders raster the scaled paper image differently (≤ 3 levels).
	const feed = document.createElement('canvas');
	feed.width = o.width;
	feed.height = o.height;
	const feedCtx = feed.getContext('2d', { alpha: false })!;
	let writer: Mp4Writer | null = null;
	let renderMs = 0, otherMs = 0, encodeMs = 0, workDone = 0, repaints = 0, lastYield = performance.now();
	const report = (done: number) => {
		if (!o.onProgress) return;
		const coef = fit.solve();
		if (!coef || done === 0) {
			o.onProgress({ done, total, fraction: totalWork > 0 ? workDone / totalWork : done / total, etaMs: null });
			return;
		}
		const perFrame = otherMs / done;
		let left = (total - done) * perFrame;
		for (let i = done; i < total; i++) if (ks[i] !== ks[i - 1]) left += coef[0] * work[i].shapes + coef[1] * work[i].renders + coef[2];
		const spent = renderMs + otherMs;
		o.onProgress({ done, total, fraction: spent + left > 0 ? spent / (spent + left) : 1, etaMs: left });
	};
	try {
		let k = -1;
		for (let i = 0; i < total; i++) {
			if (o.signal?.aborted) throw aborted();
			const f0 = performance.now();
			if (ks[i] !== k) {
				k = ks[i];
				feedCtx.drawImage(source.paint(k), 0, 0);
				const ms = performance.now() - f0;
				renderMs += ms;
				workDone += work[i].shapes;
				fit.add(work[i].shapes, work[i].renders, ms);
				repaints++;
				o.inspect?.(i, feed);
			}
			const e0 = performance.now();
			writer ??= await createMp4Writer(feed, codec, fps);
			await writer.add(i);
			const e1 = performance.now();
			encodeMs += e1 - e0;
			otherMs += e1 - e0;
			report(i + 1);
			if (performance.now() - lastYield > 32) {
				await yieldToPage();
				lastYield = performance.now();
			}
		}
		if (o.signal?.aborted) throw aborted();
		const blob = await writer!.finish();
		writer = null;
		return { blob, codec, frames: total, repaints, shapes: count, work: totalWork, ms: performance.now() - t0, renderMs, encodeMs };
	} finally {
		if (writer) await writer.cancel().catch(() => {});
		source.release();
		feed.width = feed.height = 0;
	}
}
