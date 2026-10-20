// Super Riso — integration (lazy chunk, see flag.ts).
//
// Called from renderPipeline phase 3, in the applyRisoV2 slot. "Prints what you see":
//   1. Flatten: the canvas BASE colour (drawBackground.backgroundBaseColor, no paper texture —
//      Super Riso brings its own paper) with offCtx on top, using the same operator as the
//      transfer (multiply light, source-over dark).
//   2. Engine: parameters from the state (postProcessing.superRiso → panel.fromPanel), inks from
//      the scene's shape colours (sceneInks.ts, cached per scene), seed from the caller's tick.
//   3. Output: ONLY if everything went well, the opaque result replaces offCtx in one 'copy'
//      drawImage. Any failure leaves offCtx untouched and the frame takes the normal route.
//
// Each live frame runs in a Mode (liveMode): the automatic level of quality.ts — full (desktop),
// or preview on devices measured as slow — or, under srdebug with manual knobs, the knobs as they
// are. The 2D ↔ WebGL hand-off and its alternative paths live in bridge.ts. Every live frame
// records the CPU of each stage separately (flat, upload, mip, render, back): in WebKit the
// synchronous waits land in the stage that triggers them.
//
// pipe 1 (C1c; the preview level) — pipelined upload, live frames only. beginSuperRisoFrame(),
// called by renderFrame BEFORE phase 1, uploads the canvas flattened in phase 3 of the PREVIOUS
// frame and runs the engine: at that point no 2D work of the current frame is pending, which is
// what WebKit waits for. Phase 3 then flattens the current offCtx for the next frame and shows the
// result (one frame late). With no valid pending result — first frame, size, theme or parameter
// change — that frame takes the synchronous path, so no frame is ever drawn with a stale size.
// hold (fullQuality on a preview device; srhold) — the engine only runs on the reprint ticks; in
// between, the held result. Refine (preview level, image still) — one full frame, held.
// Exports (skipCinematicOverlays) always take the synchronous path, on their own flatten canvas.
// pipe 2 (C2a, srdebug only) — beginSuperRisoFrame() of frame N+1 first consumes the engine
// launched at the start of N (present → copy into the held 2D canvas), then launches N+1 from N's
// flatten. Shown two frames late.

import { createEngine, type Engine, type EngineAssets, type GLCanvas, type RenderOpts } from './engine';
import type { EngineParams } from './panel';
import * as quality from './quality';
import { isSuperRisoPreviewDevice } from './deviceLevel';
import { detectSample, stillFor, qualityReport, STILL_MS } from './quality';
import { fullMode, liveMode, modeLabel, prepare, engineParams, seedOf, seedTickFor, tickAt, opts, lastFrame, type Mode, type Frame, type SuperRisoInput } from './frame';
import { renderExportFrame } from './exportEngine';
import { record, mountOverlay, setHeader, snapshot, reset } from './perfOverlay';
import { cfg as KNOBS, live, hooks, DEBUG } from './runtimeConfig';
import { runMeasurement } from './measure';
import { flatten, liveFlat, takeBitmap, resetBitmaps, drawBack, drawFrom, holdResult, heldResult, dropHeld, makeGLCanvas, isOffscreen, offscreenWebGL2Available } from './bridge';

export type { SuperRisoInput } from './frame';

const TEXTURES = ['greennoise1024', 'ink_black', 'ink_red', 'ink_lut'] as const;
let assets: EngineAssets | null = null;
let disabled = false;
let contextLost = false;
let engine: Engine | null = null;
// The engine's GL canvas can be replaced: preserveDrawingBuffer is a context attribute and the
// canvas type (DOM vs Offscreen) is fixed per context. Listeners ignore stale canvases.
let glCanvas: GLCanvas = makeGLCanvas(KNOBS.offscreenBack);
let engineIsPdb = KNOBS.preserveDrawingBuffer;
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
	pending = null; ready = null; held = null; refined = null; launch2 = null; res2 = null; dropHeld();
	glCanvas = makeGLCanvas(KNOBS.offscreenBack);
	watchContext(glCanvas);
	(old.getContext('webgl2') as WebGL2RenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
};
hooks.recreateEngine = recreateEngine;
hooks.engineInfo = () => engine ? { gl: engine.gl, width: engine.width, height: engine.height } : null;
hooks.profiler = () => engine ? engine.profiler : null;

const pathLabel = () => [
	`pdb ${KNOBS.preserveDrawingBuffer ? 'on' : 'off'}`, `mip ${KNOBS.mip ? 'on' : 'off'}`, KNOBS.bitmapUpload ? 'bitmap' : '',
	KNOBS.offscreenBack ? (offscreenWebGL2Available ? 'offscreen' : 'offscreen→DOM') : '', KNOBS.bypass ? 'BYPASS' : '',
].filter(Boolean).join(' · ');

// ?srdebug=1 only: the overlay, "Medir" and a read-only handle for the measurement harness.
if (DEBUG) {
	mountOverlay(() => { void runMeasurement(); });
	setHeader(`SUPER RISO · ${pathLabel()}`);
	(window as unknown as { __superRiso: unknown }).__superRiso = { KNOBS, snapshot, reset, live, qualityReport, isSuperRisoPreviewDevice, get lastChange() { return quality.lastChange; }, get inks() { return lastFrame.inks; }, get params() { return lastFrame.params; }, get engine() { return engine; }, get disabled() { return disabled; }, get glCanvas() { return glCanvas; }, get flat() { return liveFlat.canvas; } };
}

function ensureEngine(): Engine {
	if (engine && (engineIsPdb !== KNOBS.preserveDrawingBuffer || isOffscreen(glCanvas) !== (KNOBS.offscreenBack && offscreenWebGL2Available))) recreateEngine();
	if (!engine) {
		engine = createEngine(glCanvas, assets!, { preserveDrawingBuffer: KNOBS.preserveDrawingBuffer });
		engineIsPdb = KNOBS.preserveDrawingBuffer;
	}
	return engine;
}


// ── Pipeline / hold state (all of it lives here) ──────────────────────────────────────────────
let frameNo = 0;
/** liveFlat holds this frame's flatten, waiting to be uploaded at the start of the next frame. */
let pending: { key: string; frame: number; params: Partial<EngineParams> } | null = null;
/** The engine ran in this frame's beginSuperRisoFrame(); its result is in glCanvas. */
let ready: { key: string; frame: number; ew: number; eh: number; crisp: boolean; tick: number } | null = null;
let held: { key: string; tick: number; ew: number; eh: number; crisp: boolean } | null = null;
/** Preview level, image still: the full-level frame held until something moves. */
let refined: { key: string; tick: number; ew: number; eh: number; crisp: boolean } | null = null;
// Stage CPU of the current live frame (the begin part is added to the phase-3 part).
const st = { begin: 0, upload: 0, mip: 0, render: 0, backBegin: 0 };
/** pipe 2: the engine launched at the start of a frame (into its texture), and the consumed one
 *  (copied into the held 2D canvas at the start of the next frame). */
let launch2: { key: string; frame: number; tick: number; ew: number; eh: number; crisp: boolean } | null = null;
let res2: { key: string; frame: number; tick: number; ew: number; eh: number; crisp: boolean } | null = null;

const blocked = () => disabled || contextLost || !assets || KNOBS.bypass;

/**
 * Called by renderFrame BEFORE phase 1 (no 2D of this frame emitted yet). Pipelined modes only:
 * uploads the canvas flattened in the previous frame and runs the engine. Never on export frames.
 */
export function beginSuperRisoFrame(w: number, h: number, inp: SuperRisoInput): void {
	if (!inp.isLive) return;
	frameNo++;
	ready = null;
	st.begin = 0; st.upload = 0; st.mip = 0; st.render = 0; st.backBegin = 0;
	if (blocked()) return;
	const { m } = liveMode(w, h, inp.settings);
	if (!m.pipe || refined) return;
	const t0 = performance.now();
	try {
		const fr = prepare(w, h, inp, m);
		if (m.pipe === 2) { beginPipe2(fr, m, seedTickFor(inp), t0); return; }
		// Pending only counts if it was flattened in the immediately previous live frame with the
		// same key: otherwise (first frame, resize, theme, params) phase 3 goes synchronous.
		if (!pending || pending.key !== fr.key || pending.frame !== frameNo - 1) { pending = null; return; }
		const tick = tickAt(m.holdFps);
		if (m.hold && held && held.key === fr.key && held.tick === tick && heldResult()) return;
		const eng = ensureEngine();
		eng.setSource(liveFlat.canvas, KNOBS.mip);
		const t1 = performance.now();
		eng.render({ ...pending.params, seed: seedOf(seedTickFor(inp)) }, opts(m));
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

/** pipe 2 part of beginSuperRisoFrame: consume the previous frame's launch, launch this one. */
function beginPipe2(fr: Frame, m: Mode, seedTick: number, t0: number): void {
	const tick = tickAt(m.holdFps);
	if (launch2 && launch2.frame === frameNo - 1 && launch2.key === fr.key && engine) {
		const tb = performance.now();
		engine.present();
		holdResult(glCanvas, launch2.ew, launch2.eh);
		st.backBegin = performance.now() - tb;
		res2 = { ...launch2, frame: frameNo };
	}
	launch2 = null;
	if (!pending || pending.key !== fr.key || pending.frame !== frameNo - 1) { pending = null; st.begin = performance.now() - t0; return; }
	// hold: nothing new to print until the next tick.
	if (m.hold && res2 && res2.key === fr.key && res2.tick === tick) { st.begin = performance.now() - t0; return; }
	const eng = ensureEngine();
	eng.setSource(liveFlat.canvas, KNOBS.mip);
	const t1 = performance.now();
	eng.render({ ...pending.params, seed: seedOf(seedTick) }, opts(m, true));
	const t2 = performance.now();
	pending = null;
	if (eng.gl.isContextLost()) return;
	launch2 = { key: fr.key, frame: frameNo, tick, ew: eng.width, eh: eng.height, crisp: !!fr.style.crisp };
	st.upload = eng.lastUploadMs; st.mip = eng.lastMipMs; st.render = t2 - t1;
	st.begin = t2 - t0;
}

/** Shows the engine result now in glCanvas (holding a copy in hold modes). */
function show(offCtx: CanvasRenderingContext2D, w: number, h: number, m: Mode, key: string, ew: number, eh: number, crisp: boolean, holdTick: number): void {
	if (m.hold) {
		const src = holdResult(glCanvas, ew, eh);
		held = { key, tick: holdTick, ew, eh, crisp };
		drawFrom(offCtx, src, ew, eh, w, h, crisp);
	} else {
		drawBack(offCtx, glCanvas, ew, eh, w, h, crisp);
	}
}

/**
 * Synchronous path: upload `flat` (or the newest bitmap, live srbitmap) and run the engine now.
 * seedTick: the reprint tick (frame.seedTickFor).
 * detect: one sample for quality.ts. With a GPU timer (desktop): the engine's GPU ms + the CPU of
 * upload and submit — a readback there would also wait for the frame's own 2D work, which Chrome
 * never makes the live frame wait for (11 ms measured at 1080p for 2.9 ms of engine). Without one
 * (Safari, the iPad): a 1×1 readback, and the ms from upload to readback, where WebKit's real
 * wait for the pending 2D lands.
 */
function runSync(fr: Frame, flat: HTMLCanvasElement, params: Partial<EngineParams>, seedTick: number, o: RenderOpts, detect = false): Engine {
	const eng = ensureEngine();
	const t1 = performance.now();
	const late = KNOBS.bitmapUpload ? takeBitmap(flat, fr.fw, fr.fh) : null;
	const tTake = performance.now() - t1;
	if (late) {
		eng.setSource(late.bmp, KNOBS.mip);
		late.bmp.close();
		live.bitmapLagFrames = late.lag;
	} else {
		eng.setSource(flat, KNOBS.mip);
	}
	const t2 = performance.now();
	eng.render({ ...params, seed: seedOf(seedTick) }, o);
	if (detect && eng.profiler.timerAvailable) detectSample(live.canvasW, live.canvasH, eng.gpuMs === null ? null : eng.gpuMs + performance.now() - t1, 'GPU');
	else if (detect) { eng.finish(); detectSample(live.canvasW, live.canvasH, performance.now() - t1, 'readback'); }
	st.upload += eng.lastUploadMs + tTake; st.mip += eng.lastMipMs; st.render += performance.now() - t2;
	return eng;
}

/**
 * Phase 3, in the applyRisoV2 slot.
 * @param inp   inp.isLive false for export renders (skipCinematicOverlays): kept out of the live
 *              stats, always synchronous and at full level, on their own engine (exportEngine.ts)
 * @returns true when offCtx now holds the opaque Super Riso frame
 */
export function applySuperRiso(
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	inp: SuperRisoInput,
): boolean {
	const t0 = performance.now();
	const { isDarkMode, isLive, info } = inp;
	if (isLive) {
		if (DEBUG && lastLiveCall > 0) record('interval', t0 - lastLiveCall);
		lastLiveCall = t0;
		live.lastCallAt = t0; live.isDark = isDarkMode; live.canvasW = w; live.canvasH = h;
		live.preset = info.preset; live.speed = info.speed;
		live.offscreenFallback = KNOBS.offscreenBack && !offscreenWebGL2Available;
	}
	if (blocked()) return false;
	try {
		if (!isLive) return renderExportFrame(offCtx, w, h, inp, assets!);

		const { m, level } = liveMode(w, h, inp.settings);
		const tick = seedTickFor(inp);
		const fr = prepare(w, h, inp, m);
		live.level = level;
		if (held && (held.key !== fr.key || !m.hold)) { held = null; if (!refined) dropHeld(); }
		const still = stillFor(inp.motion, inp.scene, t0);

		let tFlat = t0, tBack0 = t0;
		const done = (path: string, mm: Mode = m) => {
			live.lastPath = path;
			if (!DEBUG) return true;
			const t4 = performance.now();
			record('flat', tFlat - t0); record('upload', st.upload); record('mip', st.mip); record('render', st.render);
			record('back', st.backBegin + (t4 - tBack0)); record('total', st.begin + (t4 - t0));
			if (engine && engine.gpuMs !== null) record('gpu', engine.gpuMs);
			setHeader(`SUPER RISO · ${level} · ${w}×${h} → sim ${engine ? `${engine.width}×${engine.height}` : '–'} · src ${fr.fw}×${fr.fh} · ${modeLabel(mm)} · ${pathLabel()} · ${path}`);
			return true;
		};

		// Level unknown for this size: full level, synchronous, measured.
		if (level === 'detect') {
			const flat = flatten(liveFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
			tFlat = performance.now();
			const eng = runSync(fr, flat, engineParams(fr), tick, opts(m), true);
			if (eng.gl.isContextLost()) return false;
			tBack0 = performance.now();
			drawBack(offCtx, glCanvas, eng.width, eng.height, w, h, !!fr.style.crisp);
			return done('detect');
		}

		// Preview level with the image still: refine one frame at full level and res 1, and hold it
		// until something moves.
		if (level === 'preview' && still >= STILL_MS) {
			const fm = fullMode();
			const ff = prepare(w, h, inp, fm);
			pending = null; ready = null; held = null;
			const hr = heldResult();
			if (refined && refined.key === ff.key && refined.tick === tick && hr) {
				tBack0 = performance.now();
				drawFrom(offCtx, hr, refined.ew, refined.eh, w, h, refined.crisp);
				live.heldFrames++;
				return done('refined', fm);
			}
			const flat = flatten(liveFlat, offCtx.canvas, ff.fw, ff.fh, ff.base, isDarkMode);
			tFlat = performance.now();
			const eng = runSync(ff, flat, engineParams(ff), tick, opts(fm));
			if (eng.gl.isContextLost()) return false;
			tBack0 = performance.now();
			const src = holdResult(glCanvas, eng.width, eng.height);
			refined = { key: ff.key, tick, ew: eng.width, eh: eng.height, crisp: !!ff.style.crisp };
			drawFrom(offCtx, src, eng.width, eng.height, w, h, refined.crisp);
			return done('refine', fm);
		}
		if (refined) { refined = null; dropHeld(); }

		const heldNow = () => m.hold && held && held.key === fr.key ? heldResult() : null;

		if (m.pipe === 2) {
			// Flatten THIS frame for the next launch, then show what the start of this frame consumed.
			const flat = flatten(liveFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
			tFlat = performance.now();
			const params = engineParams(fr);
			pending = { key: fr.key, frame: frameNo, params };
			tBack0 = performance.now();
			const hr = heldResult();
			if (res2 && res2.key === fr.key && hr && (res2.frame === frameNo || m.hold)) {
				drawFrom(offCtx, hr, res2.ew, res2.eh, w, h, res2.crisp);
				if (res2.frame === frameNo) live.pipeFrames++; else live.heldFrames++;
				return done(res2.frame === frameNo ? 'pipe2' : 'held');
			}
			// Nothing consumable yet (first two frames, size, theme, params): synchronous.
			res2 = null;
			const eng = runSync(fr, flat, params, tick, opts(m));
			if (eng.gl.isContextLost()) return false;
			tBack0 = performance.now();
			drawBack(offCtx, glCanvas, eng.width, eng.height, w, h, !!fr.style.crisp);
			live.pipeSyncFrames++;
			return done('sync');
		}

		if (m.pipe) {
			// (2) flatten THIS frame for the next one — before offCtx is overwritten.
			const flat = flatten(liveFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
			tFlat = performance.now();
			const params = engineParams(fr);
			pending = { key: fr.key, frame: frameNo, params };
			tBack0 = performance.now();
			// (1) show the result the engine produced at the start of this frame.
			if (ready && ready.key === fr.key && ready.frame === frameNo) {
				show(offCtx, w, h, m, fr.key, ready.ew, ready.eh, ready.crisp, ready.tick);
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
			const eng = runSync(fr, flat, params, tick, opts(m));
			if (eng.gl.isContextLost()) return false;
			tBack0 = performance.now();
			show(offCtx, w, h, m, fr.key, eng.width, eng.height, !!fr.style.crisp, tickAt(m.holdFps));
			live.pipeSyncFrames++;
			return done('sync');
		}

		const holdTick = tickAt(m.holdFps);
		const hr = heldNow();
		if (hr && held && held.tick === holdTick) {
			drawFrom(offCtx, hr, held.ew, held.eh, w, h, held.crisp);
			live.heldFrames++;
			return done('held');
		}
		const flat = flatten(liveFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, isDarkMode);
		tFlat = performance.now();
		const eng = runSync(fr, flat, engineParams(fr), tick, opts(m));
		if (eng.gl.isContextLost()) return false;
		tBack0 = performance.now();
		show(offCtx, w, h, m, fr.key, eng.width, eng.height, !!fr.style.crisp, holdTick);
		return done('sync');
	} catch (e) {
		engine = null;
		disable('exception in applySuperRiso', e);
		return false;
	}
}
