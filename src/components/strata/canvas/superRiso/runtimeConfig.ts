// Super Riso — runtime knobs and live facts shared by applySuperRiso, the overlay and the
// automatic measurement (measure.ts). Only ever imported from the ?superriso=1 chunk.
//
// URL knobs (read once, here, only because this module is behind the flag):
//   srpdb=0 · srres=0.75|0.5 · srmip=0 · srbypass=1 · srdarkpaper=bg
//   C1b bridge paths: srsim=1 (flatten + upload at simulation size) · sroff=1 (engine on an
//   OffscreenCanvas, back via transferToImageBitmap) · srbitmap=1 (upload via createImageBitmap,
//   one frame late). Since v3.17.71 srmip=0 ONLY drops the mipmap (srsim does the reduction).
//   C1c: srpipe=1 (pipelined upload: frame N is uploaded at the start of N+1, before any 2D of
//   N+1, and shown one frame late) · srhold=1 (the engine only runs on the 12 fps reprint ticks;
//   in between the last result is redrawn).
//   C2a: srpipe=2 (engine launched at the start of frame N, consumed at the start of N+1: two
//   frames late, a whole frame of GPU time) · srlossless=1 (shader variants verified identical to
//   the lab; also in exports) · srpreview=1 (all lossy preview variants, live only; implies
//   srlossless) · srprevmask=N (one preview variant at a time: 1 SEP0 · 2 SPREAD · 4 SCAN · 8 SCREEN).

import type { PassProfiler } from './passProfiler';

export type RuntimeCfg = {
	preserveDrawingBuffer: boolean;
	resScale: number;
	mip: boolean;
	bypass: boolean;
	darkPaperFromBase: boolean;
	/** Flatten straight into a canvas of the simulation size: the 2D draw is the reduction pass. */
	simUpload: boolean;
	/** Engine on an OffscreenCanvas; result back as transferToImageBitmap() → drawImage. */
	offscreenBack: boolean;
	/** Upload createImageBitmap(flattened) instead of the canvas, using the previous frame's bitmap. */
	bitmapUpload: boolean;
	/** Pipelined upload (live only): 0 off · 1 one frame late (C1c) · 2 two frames late (C2a). */
	pipe: 0 | 1 | 2;
	/** Engine only on the 12 fps reprint ticks; the last result is redrawn in between. */
	hold: boolean;
	/** Lossless shader variants (identical result; full level, exports included). */
	lossless: boolean;
	/** Bitmask of lossy preview variants, live only (0 = full level). Implies lossless. */
	preview: number;
};

const params = new URLSearchParams(window.location.search);

export const cfg: RuntimeCfg = {
	preserveDrawingBuffer: params.get('srpdb') !== '0',
	resScale: Math.min(1, Math.max(.25, Number(params.get('srres')) || 1)),
	mip: params.get('srmip') !== '0',
	bypass: params.get('srbypass') === '1',
	darkPaperFromBase: params.get('srdarkpaper') === 'bg',
	simUpload: params.get('srsim') === '1',
	offscreenBack: params.get('sroff') === '1',
	bitmapUpload: params.get('srbitmap') === '1',
	pipe: params.get('srpipe') === '2' ? 2 : params.get('srpipe') === '1' ? 1 : 0,
	hold: params.get('srhold') === '1',
	lossless: params.get('srlossless') === '1',
	preview: params.get('srpreview') === '1' ? 15 : Math.max(0, Math.min(15, Number(params.get('srprevmask')) || 0)),
};

/** What a plain `?superriso=1` does, ignoring the other URL knobs. */
export const DEFAULT_CFG: Readonly<RuntimeCfg> = {
	preserveDrawingBuffer: true, resScale: 1, mip: true, bypass: false, darkPaperFromBase: false,
	simUpload: false, offscreenBack: false, bitmapUpload: false, pipe: 0, hold: false, lossless: false, preview: 0,
};

/** Facts about the last LIVE frame Super Riso was called for (filled by applySuperRiso). */
export const live = {
	lastCallAt: 0,
	isDark: false,
	canvasW: 0,
	canvasH: 0,
	preset: '',
	speed: 0,
	/** OffscreenCanvas + WebGL2 unavailable: sroff fell back to the DOM canvas. */
	offscreenFallback: false,
	/** Bitmap path: frames between capture and use of the last uploaded bitmap. */
	bitmapLagFrames: 0,
	/** srpipe: live frames that had no valid pending result and went the synchronous way. */
	pipeSyncFrames: 0,
	/** srpipe: live frames shown from the pipelined result. */
	pipeFrames: 0,
	/** srhold: live frames that only redrew the held result. */
	heldFrames: 0,
	/** Path the last live frame took: sync · pipe · held. */
	lastPath: '',
};

/** Set by applySuperRiso so the measurement can read the engine without importing it. */
export const hooks: { engineInfo: () => { gl: WebGL2RenderingContext; width: number; height: number } | null; recreateEngine: () => void; profiler: () => PassProfiler | null } = {
	engineInfo: () => null,
	profiler: () => null,
	recreateEngine: () => {},
};

export const setCfg = (patch: Partial<RuntimeCfg>): void => {
	const pdbChanged = patch.preserveDrawingBuffer !== undefined && patch.preserveDrawingBuffer !== cfg.preserveDrawingBuffer;
	const canvasChanged = patch.offscreenBack !== undefined && patch.offscreenBack !== cfg.offscreenBack;
	Object.assign(cfg, patch);
	// preserveDrawingBuffer is a context attribute and the canvas type (DOM vs Offscreen) is fixed
	// per context: either change needs a NEW context.
	if (pdbChanged || canvasChanged) hooks.recreateEngine();
};
