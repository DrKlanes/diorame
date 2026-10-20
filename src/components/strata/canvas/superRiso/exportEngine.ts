// Super Riso — exports (PNG HQ, GIF, PNG-sequence). Their own engine instance, created at the first
// frame of an export and destroyed after its last one, so an HQ ×2 or a GIF never reallocates the
// live engine's textures nor leaves its result in the live canvas. Always synchronous, always at
// the full level (decision 5), on their own flatten canvas.
//   PNG HQ: no exportFrame → one frame, created and destroyed in the same call.
//   GIF / PNG-sequence: exportFrame { index, count, fps } → created at 0, destroyed at count − 1
//   (a sequence that dies half-way is replaced at the next export's frame 0).

import { createEngine, type Engine, type EngineAssets } from './engine';
import { fullMode, prepare, engineParams, seedOf, seedTickFor, opts, type SuperRisoInput } from './frame';
import { flatten, exportFlat, drawBack } from './bridge';
import { DEBUG } from './runtimeConfig';

let current: Engine | null = null;

const release = () => { current?.destroy(); current = null; };

/** @returns true when offCtx now holds the opaque Super Riso frame */
export function renderExportFrame(offCtx: CanvasRenderingContext2D, w: number, h: number, inp: SuperRisoInput, assets: EngineAssets): boolean {
	const t0 = performance.now();
	const ef = inp.exportFrame;
	const first = !ef || ef.index === 0;
	const last = !ef || ef.index >= ef.count - 1;
	try {
		if (first) release();
		const eng = current ?? (current = createEngine(document.createElement('canvas'), assets, { preserveDrawingBuffer: true }));
		const m = fullMode();
		const fr = prepare(w, h, inp, m);
		const flat = flatten(exportFlat, offCtx.canvas, fr.fw, fr.fh, fr.base, inp.isDarkMode);
		eng.setSource(flat, true);
		eng.render({ ...engineParams(fr), seed: seedOf(seedTickFor(inp)) }, opts(m));
		if (eng.gl.isContextLost()) return false;
		drawBack(offCtx, eng.canvas, eng.width, eng.height, w, h, !!fr.style.crisp);
		if (DEBUG) console.info(`[SuperRiso] export frame ${ef ? `${ef.index + 1}/${ef.count}` : 'single'} ${w}×${h} → sim ${eng.width}×${eng.height}: ${(performance.now() - t0).toFixed(1)} ms · ${eng.lastVariants}`);
		return true;
	} finally {
		if (last) release();
	}
}
