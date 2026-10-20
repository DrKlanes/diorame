// Super Riso — spike C1 integration (loaded only behind ?superriso=1, see flag.ts).
//
// Called from renderPipeline phase 3, in the applyRisoV2 slot. "Prints what you see":
//   1. Flatten: the canvas BASE colour (no paper texture — Super Riso brings its own paper) with
//      offCtx on top, using the same operator as the transfer (multiply light, source-over dark).
//   2. Engine: fixed "Taller limpio" style, inks in 'dpal' mode picked ONCE per theme, seed from
//      the caller's 12 fps tick.
//   3. Output: ONLY if everything went well, the opaque result replaces offCtx in one 'copy'
//      drawImage. Any failure leaves offCtx untouched and the frame takes the normal route.
//
// Spike knobs (URL): srpdb=0 (preserveDrawingBuffer off) · srres=0.75|0.5 (internal resolution)
// · srmip=0 (2D reduction to the simulation size instead of per-frame generateMipmap)
// · srbypass=1 (module + overlay loaded, effect not applied: baseline fps)
// · srdarkpaper=bg (dark mode: dark base as srcPaper, the literal brief — for comparison).

import { createEngine, type Engine, type EngineAssets } from './engine';
import { pickInks, hex2rgb, type PickedInks, type RGB } from './inks';
import { STYLES, fromPanel } from './panel';
import { record, mountOverlay, setHeader, snapshot, reset } from './perfOverlay';

const params = new URLSearchParams(window.location.search);
const KNOBS = {
	preserveDrawingBuffer: params.get('srpdb') !== '0',
	resScale: Math.min(1, Math.max(.25, Number(params.get('srres')) || 1)),
	mip: params.get('srmip') !== '0',
	bypass: params.get('srbypass') === '1',
	darkPaperFromBase: params.get('srdarkpaper') === 'bg',
};

// Same base colours as drawBackground.ts (fillStyle before the paper texture). Duplicated on
// purpose for the spike: drawBackground is outside the GO. Keep in sync.
const baseColor = (isDarkMode: boolean, isPixelArt: boolean): string => isDarkMode
	? (isPixelArt ? '#000000' : '#050505')
	: (isPixelArt ? '#ffffff' : '#f8f9fa');

const TEXTURES = ['greennoise1024', 'ink_black', 'ink_red', 'ink_lut'] as const;
let assets: EngineAssets | null = null;
let disabled = false;
let contextLost = false;
let engine: Engine | null = null;
const glCanvas = document.createElement('canvas');
const flatCanvas = document.createElement('canvas');
const flatCtx = flatCanvas.getContext('2d')!;
const inksByTheme = new Map<boolean, PickedInks>();
let lastLiveCall = 0;

const disable = (why: string, e?: unknown) => {
	if (disabled) return;
	disabled = true;
	console.warn(`[SuperRiso] disabled for this session: ${why}`, e ?? '');
};

const loadImage = (name: string) => new Promise<HTMLImageElement>((resolve, reject) => {
	const img = new Image();
	img.onload = () => resolve(img);
	img.onerror = () => reject(new Error(`texture ${name} failed to load`));
	img.src = `/textures/superRiso/${name}.png`;
});

Promise.all(TEXTURES.map(loadImage))
	.then(([green, exBlack, exRed, exLut]) => { assets = { green, exBlack, exRed, exLut }; })
	.catch(e => disable('textures', e));

glCanvas.addEventListener('webglcontextlost', (e) => {
	e.preventDefault();
	contextLost = true;
	engine = null;
	console.warn('[SuperRiso] WebGL context lost — frames go out without Super Riso');
});
glCanvas.addEventListener('webglcontextrestored', () => {
	contextLost = false;
	console.warn('[SuperRiso] WebGL context restored — engine will be recreated');
});

mountOverlay();
setHeader(`SUPER RISO spike · pdb ${KNOBS.preserveDrawingBuffer ? 'on' : 'off'} · res ${KNOBS.resScale} · mip ${KNOBS.mip ? 'on' : 'off'}${KNOBS.bypass ? ' · BYPASS' : ''}`);

// Read-only handle for the measurement harness (spike only).
(window as unknown as { __superRiso: unknown }).__superRiso = { KNOBS, snapshot, reset, inksByTheme, get engine() { return engine; }, get disabled() { return disabled; } };

/**
 * @param tick  floor(performance.now() / (1000 / 12)), computed by the caller in phase 3
 * @param live  false for export renders (skipCinematicOverlays): kept out of the live stats
 * @returns true when offCtx now holds the opaque Super Riso frame
 */
export function applySuperRiso(
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	isDarkMode: boolean,
	isPixelArt: boolean,
	tick: number,
	live: boolean,
): boolean {
	const t0 = performance.now();
	if (live) {
		if (lastLiveCall > 0) record('interval', t0 - lastLiveCall);
		lastLiveCall = t0;
	}
	if (disabled || contextLost || !assets || KNOBS.bypass) return false;
	try {
		if (!engine) engine = createEngine(glCanvas, assets, { preserveDrawingBuffer: KNOBS.preserveDrawingBuffer });

		const style = fromPanel(STYLES.clean.panel, w * KNOBS.resScale);
		const simW = Math.round(240 * style.pxmm!);
		const simH = Math.round(simW * h / w);

		// 1. Flatten (what the user sees, minus the paper texture). srmip=0: straight at the
		// simulation size, so the 2D draw IS the reduction pass and no mipmap is needed.
		const fw = KNOBS.mip ? w : Math.min(w, simW);
		const fh = KNOBS.mip ? h : Math.min(h, simH);
		if (flatCanvas.width !== fw || flatCanvas.height !== fh) { flatCanvas.width = fw; flatCanvas.height = fh; }
		const base = baseColor(isDarkMode, isPixelArt);
		flatCtx.setTransform(1, 0, 0, 1, 0, 0);
		flatCtx.globalAlpha = 1;
		flatCtx.globalCompositeOperation = 'source-over';
		flatCtx.fillStyle = base;
		flatCtx.fillRect(0, 0, fw, fh);
		flatCtx.globalCompositeOperation = isDarkMode ? 'source-over' : 'multiply';
		flatCtx.imageSmoothingEnabled = true;
		flatCtx.imageSmoothingQuality = 'medium';
		flatCtx.drawImage(offCtx.canvas, 0, 0, fw, fh);
		flatCtx.globalCompositeOperation = 'source-over';

		// Inks: once per theme, never per frame.
		let inks = inksByTheme.get(isDarkMode);
		if (!inks) {
			const ti = performance.now();
			inks = pickInks(flatCanvas, 'dpal', STYLES.clean.panel.maxInks ?? 6, 1);
			inksByTheme.set(isDarkMode, inks);
			console.info(`[SuperRiso] inks (${isDarkMode ? 'dark' : 'light'}) picked in ${(performance.now() - ti).toFixed(1)} ms:`, inks.names.join(', '));
		}
		// srcPaper: the base colour in light mode. In dark mode the dark base must NOT be the paper
		// (prep divides by srcPaper: everything would turn into paper); white makes it ink.
		// srdarkpaper=bg restores the literal brief (dark base as srcPaper) to compare.
		const srcPaper: RGB = (isDarkMode && !KNOBS.darkPaperFromBase) ? [1, 1, 1] : hex2rgb(base);

		engine.setSource(flatCanvas, KNOBS.mip);
		const t1 = performance.now();
		engine.render({ ...style, inks: inks.inks, names: inks.names, opac: inks.opac, srcPaper, seed: (tick % 9999) + 1 });
		const t2 = performance.now();
		if (engine.gl.isContextLost()) return false;

		// 3. Output: one 'copy' draw replaces offCtx entirely (opaque, full frame) or throws and
		// leaves it untouched — never half-written.
		offCtx.save();
		offCtx.setTransform(1, 0, 0, 1, 0, 0);
		offCtx.globalAlpha = 1;
		offCtx.globalCompositeOperation = 'copy';
		offCtx.imageSmoothingEnabled = !style.crisp;
		offCtx.drawImage(glCanvas, 0, 0, engine.width, engine.height, 0, 0, w, h);
		offCtx.restore();
		const t3 = performance.now();

		if (live) {
			record('flat', t1 - t0);
			record('render', t2 - t1);
			record('back', t3 - t2);
			record('total', t3 - t0);
			if (engine.gpuMs !== null) record('gpu', engine.gpuMs);
			setHeader(`SUPER RISO spike · ${w}×${h} → sim ${engine.width}×${engine.height} · pdb ${KNOBS.preserveDrawingBuffer ? 'on' : 'off'} · res ${KNOBS.resScale} · mip ${KNOBS.mip ? 'on' : 'off'}`);
		} else {
			console.info(`[SuperRiso] export frame ${w}×${h} → sim ${engine.width}×${engine.height}: ${(t3 - t0).toFixed(1)} ms`);
		}
		return true;
	} catch (e) {
		engine = null;
		disable('exception in applySuperRiso', e);
		return false;
	}
}
