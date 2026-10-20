// Super Riso — runtime knobs and live facts shared by applySuperRiso, the overlay and the
// automatic measurement (measure.ts). Only ever imported from the ?superriso=1 chunk.
//
// URL knobs (read once, here, only because this module is behind the flag):
//   srpdb=0 · srres=0.75|0.5 · srmip=0 · srbypass=1 · srdarkpaper=bg
//   C1b bridge paths: srsim=1 (flatten + upload at simulation size) · sroff=1 (engine on an
//   OffscreenCanvas, back via transferToImageBitmap) · srbitmap=1 (upload via createImageBitmap,
//   one frame late). Since v3.17.71 srmip=0 ONLY drops the mipmap (srsim does the reduction).

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
};

/** What a plain `?superriso=1` does, ignoring the other URL knobs. */
export const DEFAULT_CFG: Readonly<RuntimeCfg> = {
	preserveDrawingBuffer: true, resScale: 1, mip: true, bypass: false, darkPaperFromBase: false,
	simUpload: false, offscreenBack: false, bitmapUpload: false,
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
};

/** Set by applySuperRiso so the measurement can read the engine without importing it. */
export const hooks: { engineInfo: () => { gl: WebGL2RenderingContext; width: number; height: number } | null; recreateEngine: () => void } = {
	engineInfo: () => null,
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
