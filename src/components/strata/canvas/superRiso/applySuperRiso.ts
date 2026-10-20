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
//
// srpipe=1 (C1c) — pipelined upload, live frames only. beginSuperRisoFrame(), called by
// renderFrame BEFORE phase 1, uploads the canvas flattened in phase 3 of the PREVIOUS frame and
// runs the engine: at that point no 2D work of the current frame is pending, which is what WebKit
// waits for. Phase 3 then flattens the current offCtx for the next frame and shows the result
// (one frame late). With no valid pending result — first frame, size, theme or parameter change
// — that frame takes the synchronous path, so no frame is ever drawn with a stale size or theme.
// srhold=1 — the engine only runs on the 12 fps reprint ticks; in between, the held result.
// Exports (skipCinematicOverlays) always take the synchronous path, on their own flatten canvas.

import { createEngine, type Engine, type EngineAssets, type GLCanvas } from './engine';
import type { EngineParams } from './panel';
import { pickInks, hex2rgb, type PickedInks, type RGB } from './inks';
import { STYLES, fromPanel } from './panel';
import { record, mountOverlay, setHeader, snapshot, reset } from './perfOverlay';
import { cfg as KNOBS, live, hooks } from './runtimeConfig';
import { runMeasurement } from './measure';
import { flatten, liveFlat, exportFlat, takeBitmap, resetBitmaps, drawBack, drawFrom, holdResult, heldResult, dropHeld, makeGLCanvas, isOffscreen, offscreenWebGL2Available } from './bridge';

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
	pending = null; ready = null; held = null; dropHeld();
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
	KNOBS.pipe ? 'PIPE' : '', KNOBS.hold ? 'HOLD' : '',
	KNOBS.bypass ? 'BYPASS' : '',
].filter(Boolean).join(' · ');

mountOverlay(() => { void runMeasurement(); });
setHeader(`SUPER RISO · ${pathLabel()}`);

// Read-only handle for the measurement harness.
(window as unknown as { __superRiso: unknown }).__superRiso = { KNOBS, snapshot, reset, inksByTheme, live, get engine() { return engine; }, get disabled() { return disabled; }, get glCanvas() { return glCanvas; } };

// ── Per-frame preparation ──────────────────────────────────────────────────────────────────────
type Frame = { style: Partial<EngineParams>; fw: number; fh: number; base: string; srcPaper: RGB; key: string };

function prepare(w: number, h: number, isDarkMode: boolean, isPixelArt: boolean): Frame {
	const style = fromPanel(STYLES.clean.panel, w * KNOBS.resScale);
	const simW = Math.round(240 * style.pxmm!);
	const simH = Math.round(simW * h / w);
	// srsim=1: flatten straight at the simulation size (the 2D draw IS the reduction pass).
	const fw = KNOBS.simUpload ? Math.min(w, simW) : w;
	const fh = KNOBS.simUpload ? Math.min(h, simH) : h;
	const base = baseColor(isDarkMode, isPixelArt);
	// srcPaper: the base colour in light mode. In dark mode the dark base must NOT be the paper
	// (prep divides by srcPaper: everything would turn into paper); white makes it ink.
	// srdarkpaper=bg restores the literal brief (dark base as srcPaper) to compare.
	const srcPaper: RGB = (isDarkMode && !KNOBS.darkPaperFromBase) ? [1, 1, 1] : hex2rgb(base);
	// Anything that changes what a pending/held result means: size, theme, parameters, context.
	const key = [w, h, +isDarkMode, +isPixelArt, KNOBS.resScale, +KNOBS.simUpload, +KNOBS.mip, +KNOBS.offscreenBack, +KNOBS.preserveDrawingBuffer, +KNOBS.darkPaperFromBase].join('|');
	return { style, fw, fh, base, srcPaper, key };
}

function ensureEngine(): Engine {
	if (engine && (engineIsPdb !== KNOBS.preserveDrawingBuffer || isOffscreen(glCanvas) !== (KNOBS.offscreenBack && offscreenWebGL2Available))) recreateEngine();
	if (!engine) {
		engine = createEngine(glCanvas, assets!, { preserveDrawingBuffer: KNOBS.preserveDrawingBuffer });
		engineIsPdb = KNOBS.preserveDrawingBuffer;
	}
	return engine;
}

/** Once per theme, never per frame. */
function inksFor(isDarkMode: boolean, flat: HTMLCanvasElement): PickedInks {
	let inks = inksByTheme.get(isDarkMode);
	if (!inks) {
		const ti = performance.now();
		inks = pickInks(flat, 'dpal', STYLES.clean.panel.maxInks ?? 6, 1);
		inksByTheme.set(isDarkMode, inks);
		console.info(`[SuperRiso] inks (${isDarkMode ? 'dark' : 'light'}) picked in ${(performance.now() - ti).toFixed(1)} ms:`, inks.names.join(', '));
	}
	return inks;
}

const engineParams = (fr: Frame, inks: PickedInks): Partial<EngineParams> =>
	({ ...fr.style, inks: inks.inks, names: inks.names, opac: inks.opac, srcPaper: fr.srcPaper });
const seedOf = (tick: number) => (tick % 9999) + 1;
const tickNow = () => Math.floor(performance.now() / (1000 / 12));

// ── Pipeline / hold state (all of it lives here) ──────────────────────────────────────────────
let frameNo = 0;
/** liveFlat holds this frame's flatten, waiting to be uploaded at the start of the next frame. */
let pending: { key: string; frame: number; params: Partial<EngineParams> } | null = null;
/** The engine ran in this frame's beginSuperRisoFrame(); its result is in glCanvas. */
let ready: { key: string; frame: number; ew: number; eh: number; crisp: boolean; tick: number } | null = null;
let held: { key: string; tick: number; ew: number; eh: number; crisp: boolean } | null = null;
// Stage CPU of the current live frame (the begin part is added to the phase-3 part).
const st = { begin: 0, upload: 0, mip: 0, render: 0 };

const blocked = () => disabled || contextLost || !assets || KNOBS.bypass;

/**
 * Called by renderFrame BEFORE phase 1 (no 2D of this frame emitted yet). srpipe only: uploads
 * the canvas flattened in the previous frame and runs the engine. Never on export frames.
 */
export function beginSuperRisoFrame(w: number, h: number, isDarkMode: boolean, isPixelArt: boolean, isLive: boolean): void {
	if (!isLive) return;
	frameNo++;
	ready = null;
	st.begin = 0; st.upload = 0; st.mip = 0; st.render = 0;
	if (!KNOBS.pipe || blocked()) return;
	const t0 = performance.now();
	try {
		const fr = prepare(w, h, isDarkMode, isPixelArt);
		// Pending only counts if it was flattened in the immediately previous live frame with the
		// same key: otherwise (first frame, resize, theme, params) phase 3 goes synchronous.
		if (!pending || pending.key !== fr.key || pending.frame !== frameNo - 1) { pending = null; return; }
		const tick = tickNow();
		if (KNOBS.hold && held && held.key === fr.key && held.tick === tick && heldResult()) return;
		const eng = ensureEngine();
		eng.setSource(liveFlat.canvas, KNOBS.mip);
		const t1 = performance.now();
		eng.render({ ...pending.params, seed: seedOf(tick) });
		const t2 = performance.now();
		pending = null;
		if (eng.gl.isContextLost()) return;
		ready = { key: fr.key, frame: frameNo, ew: eng.width, eh: eng.height, crisp: !!fr.style.crisp, tick };
		st.upload = eng.lastUploadMs; st.mip = eng.lastMipMs; st.render = t2 - t1;
		st.begin = t2 - t0;
	} catch (e) {
		engine = null;
		disable('exception in beginSuperRisoFrame', e);
	}
}

/** Shows the engine result now in glCanvas (holding a copy with srhold). */
function show(offCtx: CanvasRenderingContext2D, w: number, h: number, key: string, ew: number, eh: number, crisp: boolean, tick: number): void {
	if (KNOBS.hold) {
		const src = holdResult(glCanvas, ew, eh);
		held = { key, tick, ew, eh, crisp };
		drawFrom(offCtx, src, ew, eh, w, h, crisp);
	} else {
		drawBack(offCtx, glCanvas, ew, eh, w, h, crisp);
	}
}

/** Synchronous path: upload `flat` (or the newest bitmap, live srbitmap) and run the engine now. */
function runSync(fr: Frame, flat: HTMLCanvasElement, params: Partial<EngineParams>, tick: number, isLive: boolean): Engine {
	const eng = ensureEngine();
	const t1 = performance.now();
	const late = (KNOBS.bitmapUpload && isLive) ? takeBitmap(flat, fr.fw, fr.fh) : null;
	const tTake = performance.now() - t1;
	if (late) {
		eng.setSource(late.bmp, KNOBS.mip);
		late.bmp.close();
		live.bitmapLagFrames = late.lag;
	} else {
		eng.setSource(flat, KNOBS.mip);
	}
	const t2 = performance.now();
	eng.render({ ...params, seed: seedOf(tick) });
	st.upload += eng.lastUploadMs + tTake; st.mip += eng.lastMipMs; st.render += performance.now() - t2;
	return eng;
}

/**
 * Phase 3, in the applyRisoV2 slot.
 * @param tick  floor(performance.now() / (1000 / 12)), computed by the caller in phase 3
 * @param isLive false for export renders (skipCinematicOverlays): kept out of the live stats and
 *               always synchronous (an export frame must be its own frame)
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
	if (blocked()) return false;
	try {
		const fr = prepare(w, h, isDarkMode, isPixelArt);
		if (held && held.key !== fr.key) { held = null; dropHeld(); }

		// Exports: always synchronous, on their own canvas.
		if (!isLive) {
			const flat = flatten(exportFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
			const eng = runSync(fr, flat, engineParams(fr, inksFor(isDarkMode, flat)), tick, false);
			if (eng.gl.isContextLost()) return false;
			drawBack(offCtx, glCanvas, eng.width, eng.height, w, h, !!fr.style.crisp);
			console.info(`[SuperRiso] export frame ${w}×${h} → sim ${eng.width}×${eng.height}: ${(performance.now() - t0).toFixed(1)} ms`);
			return true;
		}

		let tFlat = t0, tBack0 = t0;
		const done = (path: string) => {
			const t4 = performance.now();
			record('flat', tFlat - t0); record('upload', st.upload); record('mip', st.mip); record('render', st.render);
			record('back', t4 - tBack0); record('total', st.begin + (t4 - t0));
			if (engine && engine.gpuMs !== null) record('gpu', engine.gpuMs);
			live.lastPath = path;
			setHeader(`SUPER RISO · ${w}×${h} → sim ${engine ? `${engine.width}×${engine.height}` : '–'} · src ${fr.fw}×${fr.fh} · ${pathLabel()} · ${path}`);
			return true;
		};
		const heldNow = () => KNOBS.hold && held && held.key === fr.key ? heldResult() : null;

		if (KNOBS.pipe) {
			// (2) flatten THIS frame for the next one — before offCtx is overwritten.
			const flat = flatten(liveFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
			tFlat = performance.now();
			const params = engineParams(fr, inksFor(isDarkMode, flat));
			pending = { key: fr.key, frame: frameNo, params };
			tBack0 = performance.now();
			// (1) show the result the engine produced at the start of this frame.
			if (ready && ready.key === fr.key && ready.frame === frameNo) {
				show(offCtx, w, h, fr.key, ready.ew, ready.eh, ready.crisp, ready.tick);
				live.pipeFrames++;
				return done('pipe');
			}
			const hr = heldNow();
			if (hr && held) {
				drawFrom(offCtx, hr, held.ew, held.eh, w, h, held.crisp);
				live.heldFrames++;
				return done('held');
			}
			// No valid result (first frame, resize, theme, params): this frame goes synchronous.
			const eng = runSync(fr, flat, params, tick, true);
			if (eng.gl.isContextLost()) return false;
			tBack0 = performance.now();
			show(offCtx, w, h, fr.key, eng.width, eng.height, !!fr.style.crisp, tick);
			live.pipeSyncFrames++;
			return done('sync');
		}

		const hr = heldNow();
		if (hr && held && held.tick === tick) {
			drawFrom(offCtx, hr, held.ew, held.eh, w, h, held.crisp);
			live.heldFrames++;
			return done('held');
		}
		const flat = flatten(liveFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
		tFlat = performance.now();
		const eng = runSync(fr, flat, engineParams(fr, inksFor(isDarkMode, flat)), tick, true);
		if (eng.gl.isContextLost()) return false;
		tBack0 = performance.now();
		show(offCtx, w, h, fr.key, eng.width, eng.height, !!fr.style.crisp, tick);
		return done('sync');
	} catch (e) {
		engine = null;
		disable('exception in applySuperRiso', e);
		return false;
	}
}
