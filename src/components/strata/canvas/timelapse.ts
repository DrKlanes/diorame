import { createRectSession } from './formatSnapshot';
import { drawingBounds } from './drawingBounds';
import { appearanceRanks, paintsLayer, sceneAt, shapesAtFrame } from './timelapseSchedule';
import { createMp4Writer, timelapseCodec, TIMELAPSE_FPS, type Mp4Writer } from './timelapseEncode';
import { visibleWorldRect, type Rect } from '../../../utils/formatFrame';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { AppState } from '../../../types/strataTypes';

/**
 * DRAW timelapse (v3.25.17, engine only — the UI comes in C2). The drawing is rebuilt offline from its shapes, not
 * recorded: frame i shows the first k(i) shapes in appearance order (timelapseSchedule.ts), each one whole, painted
 * with the export pipeline into ONE persistent session (same canvases, same ink texture: no flicker), and the canvas
 * goes to the H.264 encoder. A frame whose k did not change is encoded again without repainting.
 */

export const TIMELAPSE_DURATIONS: readonly number[] = [15, 30, 60];
export const TIMELAPSE_LONG_SIDES: readonly number[] = [1080, 1920];
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
	fps?: number;
	holdSeconds?: number;
	signal?: AbortSignal;
	onProgress?: (done: number, total: number) => void;
	/** The export's seed (random when absent): a reproducible video. */
	seed?: number;
	/** Called after each repaint with the frame index, the canvas the encoder reads and the session canvas it copies (verification). */
	inspect?: (frame: number, canvas: HTMLCanvasElement, source: HTMLCanvasElement) => void;
};

export type TimelapseResult = {
	blob: Blob;
	codec: string;
	frames: number;
	repaints: number;
	shapes: number;
	ms: number;
	renderMs: number;
	encodeMs: number;
};

const seeded = (seed: number) => {
	let s = seed | 0;
	return () => {
		s = s + 0x6D2B79F5 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
};

// A task boundary (not setTimeout: background tabs throttle timers to ≥ 1 s), so the page can paint the progress.
const yieldToPage = () => new Promise<void>(resolve => {
	const channel = new MessageChannel();
	channel.port1.onmessage = () => resolve();
	channel.port2.postMessage(0);
});

const aborted = () => new DOMException('Timelapse canceled', 'AbortError');

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

	const session = createRectSession(options, o.rect, o.width, o.height, o.background);
	// One seed for the export: the first render makes the ink texture with it, and since v3.25.18 later renders reuse it
	// (before, renderRectSnapshot's half-pixel size re-created it on every render: flicker). Seeding each render keeps
	// every frame exactly the PNG export of its scene with this seed — as «Capas (ZIP)» does across its layers.
	const seed = o.seed ?? Math.floor(Math.random() * 2 ** 31);
	const paint = (k: number): HTMLCanvasElement => {
		const real = Math.random;
		Math.random = seeded(seed);
		try {
			return session.render(sceneAt(shapes, rank, k));
		} finally {
			Math.random = real;
		}
	};
	// The encoder reads a 1:1 copy, never the session's canvas. Measured in Chrome: once a canvas has been through
	// WebCodecs (VideoFrame), its later renders raster the scaled paper image differently (≤ 3 levels on 400 000 px,
	// across resets), so the session would drift from the PNG export. A same-size copy is exact either way.
	const feed = document.createElement('canvas');
	feed.width = o.width;
	feed.height = o.height;
	const feedCtx = feed.getContext('2d', { alpha: false })!;
	let writer: Mp4Writer | null = null;
	let renderMs = 0, encodeMs = 0, repaints = 0, lastYield = performance.now();
	try {
		let k = shapesAtFrame(0, count, drawFrames);
		let source = paint(k);
		feedCtx.drawImage(source, 0, 0);
		repaints++;
		o.inspect?.(0, feed, source);
		writer = await createMp4Writer(feed, codec, fps);

		for (let i = 0; i < total; i++) {
			if (o.signal?.aborted) throw aborted();
			const next = shapesAtFrame(i, count, drawFrames);
			if (next !== k) {
				const r0 = performance.now();
				k = next;
				source = paint(k);
				feedCtx.drawImage(source, 0, 0);
				renderMs += performance.now() - r0;
				repaints++;
				o.inspect?.(i, feed, source);
			}
			const e0 = performance.now();
			await writer.add(i);
			encodeMs += performance.now() - e0;
			o.onProgress?.(i + 1, total);
			if (performance.now() - lastYield > 32) {
				await yieldToPage();
				lastYield = performance.now();
			}
		}
		if (o.signal?.aborted) throw aborted();
		const blob = await writer.finish();
		writer = null;
		return { blob, codec, frames: total, repaints, shapes: count, ms: performance.now() - t0, renderMs, encodeMs };
	} finally {
		if (writer) await writer.cancel().catch(() => {});
		session.release();
		feed.width = feed.height = 0;
	}
}
