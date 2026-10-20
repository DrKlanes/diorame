// Super Riso — runtime knobs and live facts shared by applySuperRiso, the overlay and the
// automatic measurement (measure.ts). Only ever imported from the ?superriso=1 chunk.
//
// URL knobs (read once, here, only because this module is behind the flag):
//   srpdb=0 · srres=0.75|0.5 · srmip=0 · srbypass=1 · srdarkpaper=bg

export type RuntimeCfg = {
	preserveDrawingBuffer: boolean;
	resScale: number;
	mip: boolean;
	bypass: boolean;
	darkPaperFromBase: boolean;
};

const params = new URLSearchParams(window.location.search);

export const cfg: RuntimeCfg = {
	preserveDrawingBuffer: params.get('srpdb') !== '0',
	resScale: Math.min(1, Math.max(.25, Number(params.get('srres')) || 1)),
	mip: params.get('srmip') !== '0',
	bypass: params.get('srbypass') === '1',
	darkPaperFromBase: params.get('srdarkpaper') === 'bg',
};

/** What a plain `?superriso=1` does, ignoring the other URL knobs. */
export const DEFAULT_CFG: Readonly<RuntimeCfg> = {
	preserveDrawingBuffer: true, resScale: 1, mip: true, bypass: false, darkPaperFromBase: false,
};

/** Facts about the last LIVE frame Super Riso was called for (filled by applySuperRiso). */
export const live = {
	lastCallAt: 0,
	isDark: false,
	canvasW: 0,
	canvasH: 0,
	preset: '',
	speed: 0,
};

/** Set by applySuperRiso so the measurement can read the engine without importing it. */
export const hooks: { engineInfo: () => { gl: WebGL2RenderingContext; width: number; height: number } | null; recreateEngine: () => void } = {
	engineInfo: () => null,
	recreateEngine: () => {},
};

export const setCfg = (patch: Partial<RuntimeCfg>): void => {
	const pdbChanged = patch.preserveDrawingBuffer !== undefined && patch.preserveDrawingBuffer !== cfg.preserveDrawingBuffer;
	Object.assign(cfg, patch);
	// preserveDrawingBuffer is a context attribute: it can only change with a NEW context.
	if (pdbChanged) hooks.recreateEngine();
};
