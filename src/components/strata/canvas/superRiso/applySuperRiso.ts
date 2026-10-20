// Super Riso — experimental integration (loaded only behind ?superriso=1, see flag.ts).
//
// Called from renderPipeline phase 3, in the applyRisoV2 slot. "Prints what you see":
//   1. Flatten: the canvas BASE colour (no paper texture — Super Riso brings its own paper) with
//      offCtx on top, using the same operator as the transfer (multiply light, source-over dark).
//   2. Engine: fixed "Taller limpio" style, inks in 'dpal' mode picked ONCE per theme, seed from
//      the caller's 12 fps tick.
//   3. Output: ONLY if everything went well, the opaque result replaces offCtx in one 'copy'
//      drawImage. Any failure leaves offCtx untouched and the frame takes the normal route.
//
// The 2D ↔ WebGL hand-off and its alternative paths live in bridge.ts; the knobs in
// runtimeConfig.ts. Every live frame records the CPU of each stage separately (flat, upload, mip,
// render, back): in WebKit the synchronous waits land in the stage that triggers them.

import { createEngine, type Engine, type EngineAssets, type GLCanvas } from './engine';
import { pickInks, hex2rgb, type PickedInks, type RGB } from './inks';
import { STYLES, fromPanel } from './panel';
import { record, mountOverlay, setHeader, snapshot, reset } from './perfOverlay';
import { cfg as KNOBS, live, hooks } from './runtimeConfig';
import { runMeasurement } from './measure';
import { flatten, takeBitmap, resetBitmaps, drawBack, makeGLCanvas, isOffscreen, offscreenWebGL2Available } from './bridge';

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
// The engine's GL canvas can be replaced: preserveDrawingBuffer is a context attribute and the
// canvas type (DOM vs Offscreen) is fixed per context. Listeners ignore stale canvases.
let glCanvas: GLCanvas = makeGLCanvas(KNOBS.offscreenBack);
let engineIsPdb = KNOBS.preserveDrawingBuffer;
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

const watchContext = (c: GLCanvas) => {
	c.addEventListener('webglcontextlost', (e) => {
		e.preventDefault();
		if (c !== glCanvas) return;
		contextLost = true;
		engine = null;
		console.warn('[SuperRiso] WebGL context lost — frames go out without Super Riso');
	});
	c.addEventListener('webglcontextrestored', () => {
		if (c !== glCanvas) return;
		contextLost = false;
		console.warn('[SuperRiso] WebGL context restored — engine will be recreated');
	});
};
watchContext(glCanvas);

/** Drops the engine and its context; the next frame creates a fresh one on a new canvas. */
const recreateEngine = () => {
	const old = glCanvas;
	engine = null;
	resetBitmaps();
	glCanvas = makeGLCanvas(KNOBS.offscreenBack);
	watchContext(glCanvas);
	(old.getContext('webgl2') as WebGL2RenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
};
hooks.recreateEngine = recreateEngine;
hooks.engineInfo = () => engine ? { gl: engine.gl, width: engine.width, height: engine.height } : null;

const pathLabel = () => [
	`pdb ${KNOBS.preserveDrawingBuffer ? 'on' : 'off'}`, `res ${KNOBS.resScale}`, `mip ${KNOBS.mip ? 'on' : 'off'}`,
	KNOBS.simUpload ? 'sim-upload' : '', KNOBS.bitmapUpload ? 'bitmap' : '',
	KNOBS.offscreenBack ? (offscreenWebGL2Available ? 'offscreen' : 'offscreen→DOM') : '',
	KNOBS.bypass ? 'BYPASS' : '',
].filter(Boolean).join(' · ');

mountOverlay(() => { void runMeasurement(); });
setHeader(`SUPER RISO · ${pathLabel()}`);

// Read-only handle for the measurement harness.
(window as unknown as { __superRiso: unknown }).__superRiso = { KNOBS, snapshot, reset, inksByTheme, live, get engine() { return engine; }, get disabled() { return disabled; }, get glCanvas() { return glCanvas; } };

/**
 * @param tick  floor(performance.now() / (1000 / 12)), computed by the caller in phase 3
 * @param isLive false for export renders (skipCinematicOverlays): kept out of the live stats and
 *               never on the one-frame-late bitmap path (an export frame must be its own frame)
 * @returns true when offCtx now holds the opaque Super Riso frame
 */
export function applySuperRiso(
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	isDarkMode: boolean,
	isPixelArt: boolean,
	tick: number,
	isLive: boolean,
	info: { preset: string; speed: number },
): boolean {
	const t0 = performance.now();
	if (isLive) {
		if (lastLiveCall > 0) record('interval', t0 - lastLiveCall);
		lastLiveCall = t0;
		live.lastCallAt = t0; live.isDark = isDarkMode; live.canvasW = w; live.canvasH = h;
		live.preset = info.preset; live.speed = info.speed;
		live.offscreenFallback = KNOBS.offscreenBack && !offscreenWebGL2Available;
	}
	if (disabled || contextLost || !assets || KNOBS.bypass) return false;
	try {
		if (engine && (engineIsPdb !== KNOBS.preserveDrawingBuffer || isOffscreen(glCanvas) !== (KNOBS.offscreenBack && offscreenWebGL2Available))) recreateEngine();
		if (!engine) {
			engine = createEngine(glCanvas, assets, { preserveDrawingBuffer: KNOBS.preserveDrawingBuffer });
			engineIsPdb = KNOBS.preserveDrawingBuffer;
		}

		const style = fromPanel(STYLES.clean.panel, w * KNOBS.resScale);
		const simW = Math.round(240 * style.pxmm!);
		const simH = Math.round(simW * h / w);

		// 1. Flatten (what the user sees, minus the paper texture). srsim=1: straight at the
		// simulation size, so this 2D draw IS the reduction pass and the upload shrinks with srres.
		const fw = KNOBS.simUpload ? Math.min(w, simW) : w;
		const fh = KNOBS.simUpload ? Math.min(h, simH) : h;
		const base = baseColor(isDarkMode, isPixelArt);
		const flat = flatten(offCtx.canvas, fw, fh, base, isDarkMode);
		const tFlat = performance.now();

		// Inks: once per theme, never per frame.
		let inks = inksByTheme.get(isDarkMode);
		if (!inks) {
			const ti = performance.now();
			inks = pickInks(flat, 'dpal', STYLES.clean.panel.maxInks ?? 6, 1);
			inksByTheme.set(isDarkMode, inks);
			console.info(`[SuperRiso] inks (${isDarkMode ? 'dark' : 'light'}) picked in ${(performance.now() - ti).toFixed(1)} ms:`, inks.names.join(', '));
		}
		// srcPaper: the base colour in light mode. In dark mode the dark base must NOT be the paper
		// (prep divides by srcPaper: everything would turn into paper); white makes it ink.
		// srdarkpaper=bg restores the literal brief (dark base as srcPaper) to compare.
		const srcPaper: RGB = (isDarkMode && !KNOBS.darkPaperFromBase) ? [1, 1, 1] : hex2rgb(base);

		// 2. Upload: the canvas, or (live only) the newest resolved bitmap of an earlier frame.
		const t1 = performance.now();
		const late = (KNOBS.bitmapUpload && isLive) ? takeBitmap(flat, fw, fh) : null;
		const tTake = performance.now();
		if (late) {
			engine.setSource(late.bmp, KNOBS.mip);
			late.bmp.close();
			live.bitmapLagFrames = late.lag;
		} else {
			engine.setSource(flat, KNOBS.mip);
		}
		const t2 = performance.now();
		engine.render({ ...style, inks: inks.inks, names: inks.names, opac: inks.opac, srcPaper, seed: (tick % 9999) + 1 });
		const t3 = performance.now();
		if (engine.gl.isContextLost()) return false;

		// 3. Output.
		drawBack(offCtx, glCanvas, engine.width, engine.height, w, h, !!style.crisp);
		const t4 = performance.now();

		if (isLive) {
			record('flat', tFlat - t0);
			record('upload', engine.lastUploadMs + (tTake - t1));
			record('mip', engine.lastMipMs);
			record('render', t3 - t2);
			record('back', t4 - t3);
			record('total', t4 - t0);
			if (engine.gpuMs !== null) record('gpu', engine.gpuMs);
			setHeader(`SUPER RISO · ${w}×${h} → sim ${engine.width}×${engine.height} · src ${fw}×${fh} · ${pathLabel()}`);
		} else {
			console.info(`[SuperRiso] export frame ${w}×${h} → sim ${engine.width}×${engine.height}: ${(t4 - t0).toFixed(1)} ms`);
		}
		return true;
	} catch (e) {
		engine = null;
		disable('exception in applySuperRiso', e);
		return false;
	}
}
