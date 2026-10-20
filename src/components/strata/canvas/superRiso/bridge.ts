// Super Riso — the 2D ↔ WebGL bridge (C1b). On the iPad the engine is not the bottleneck: the
// ~25 ms of CPU are fixed and independent of the simulation size, so they live in the hand-off
// between Canvas 2D and WebGL. This module holds the alternative paths, each behind a knob:
//
//   flatten        drawImage of offCtx onto the base colour (multiply light / source-over dark),
//                  at full frame size, or straight at the simulation size (srsim=1: the scaled 2D
//                  draw IS the reduction pass, so the upload shrinks with srres).
//   bitmap upload  createImageBitmap(flattened) → texImage2D(bitmap), async: each frame uploads
//                  the newest bitmap already resolved (≥1 frame late) and asks for the next one.
//   offscreen back engine on an OffscreenCanvas; result as transferToImageBitmap() → drawImage.
//                  Falls back to the DOM canvas when OffscreenCanvas + WebGL2 does not exist.
//
// Only loaded behind ?superriso=1.

import type { GLCanvas } from './engine';
import { record } from './perfOverlay';

/** OffscreenCanvas with a WebGL2 context exists (probed once, the probe context is released). */
export const offscreenWebGL2Available: boolean = (() => {
	try {
		if (typeof OffscreenCanvas === 'undefined') return false;
		const c = new OffscreenCanvas(1, 1);
		const gl = c.getContext('webgl2') as WebGL2RenderingContext | null;
		if (!gl) return false;
		gl.getExtension('WEBGL_lose_context')?.loseContext();
		return true;
	} catch {
		return false;
	}
})();

export function makeGLCanvas(offscreen: boolean): GLCanvas {
	return offscreen && offscreenWebGL2Available ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
}

export const isOffscreen = (c: GLCanvas): c is OffscreenCanvas =>
	typeof OffscreenCanvas !== 'undefined' && c instanceof OffscreenCanvas;

// ── Flatten ────────────────────────────────────────────────────────────────────────────────────
export const flatCanvas = document.createElement('canvas');
const flatCtx = flatCanvas.getContext('2d')!;

/** What the user sees, minus the paper texture, into flatCanvas at fw×fh. */
export function flatten(src: HTMLCanvasElement, fw: number, fh: number, base: string, isDarkMode: boolean): HTMLCanvasElement {
	if (flatCanvas.width !== fw || flatCanvas.height !== fh) { flatCanvas.width = fw; flatCanvas.height = fh; }
	flatCtx.setTransform(1, 0, 0, 1, 0, 0);
	flatCtx.globalAlpha = 1;
	flatCtx.globalCompositeOperation = 'source-over';
	flatCtx.fillStyle = base;
	flatCtx.fillRect(0, 0, fw, fh);
	flatCtx.globalCompositeOperation = isDarkMode ? 'source-over' : 'multiply';
	flatCtx.imageSmoothingEnabled = true;
	flatCtx.imageSmoothingQuality = 'medium';
	flatCtx.drawImage(src, 0, 0, fw, fh);
	flatCtx.globalCompositeOperation = 'source-over';
	return flatCanvas;
}

// ── Bitmap upload (one frame of latency) ──────────────────────────────────────────────────────
type Ready = { bmp: ImageBitmap; frame: number };
let ready: Ready | null = null;
let inFlight = false;
let frameNo = 0;

/**
 * Hands back the newest resolved bitmap (the caller uploads and closes it) and requests one of
 * this frame's flattened canvas unless a request is still in flight. Null on the first frames:
 * the caller then uploads the canvas synchronously. The await is measured apart ('bitmapWait'),
 * it never blocks the frame.
 */
export function takeBitmap(flat: HTMLCanvasElement, w: number, h: number): { bmp: ImageBitmap; lag: number } | null {
	frameNo++;
	const now = frameNo;
	let out: { bmp: ImageBitmap; lag: number } | null = null;
	if (ready && ready.bmp.width === w && ready.bmp.height === h) out = { bmp: ready.bmp, lag: now - ready.frame };
	else if (ready) ready.bmp.close();
	ready = null;
	if (!inFlight) {
		inFlight = true;
		const t0 = performance.now();
		createImageBitmap(flat)
			.then(bmp => {
				record('bitmapWait', performance.now() - t0);
				if (ready) ready.bmp.close();
				ready = { bmp, frame: now };
			})
			.catch(() => { /* next frame tries again; the canvas path covers the gap */ })
			.finally(() => { inFlight = false; });
	}
	return out;
}

/** Drops any pending bitmap (path switched off or engine recreated). */
export function resetBitmaps(): void {
	if (ready) ready.bmp.close();
	ready = null;
}

// ── Back to offCtx ────────────────────────────────────────────────────────────────────────────
/** One 'copy' draw replaces offCtx entirely (opaque, full frame) or throws and leaves it untouched. */
export function drawBack(offCtx: CanvasRenderingContext2D, glCanvas: GLCanvas, ew: number, eh: number, w: number, h: number, crisp: boolean): void {
	const bmp = isOffscreen(glCanvas) ? glCanvas.transferToImageBitmap() : null;
	try {
		offCtx.save();
		offCtx.setTransform(1, 0, 0, 1, 0, 0);
		offCtx.globalAlpha = 1;
		offCtx.globalCompositeOperation = 'copy';
		offCtx.imageSmoothingEnabled = !crisp;
		offCtx.drawImage(bmp ?? (glCanvas as HTMLCanvasElement), 0, 0, ew, eh, 0, 0, w, h);
	} finally {
		offCtx.restore();
		bmp?.close();
	}
}
