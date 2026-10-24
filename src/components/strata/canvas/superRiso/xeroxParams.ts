// Super Riso · Fotocopia — internal engine parameters and the panel → parameters mapping.
// Ported from the lab: XDEFAULTS (engine.studio.js), xBase() and xparams() (ui.src.html). Distances in mm of the sheet.
// The lab's fine-tuning has no sliders in Diorame: its values come from xBase(); only style overrides (state.fine)
// go on top, exactly as xparams() does.

import type { XeroxSettings } from '../../../../types/strataTypes';
import { XEROX_PAPERS } from '../../../../constants/superRisoXerox';
import type { RGB } from './inks';

export type XeroxEngineParams = {
	tech: 'xerox'; printW: number; pxmm: number; seed: number; smooth: number;
	dark: number; soft: number; motion: number; photo: number; lpi: number; lid: number;
	gens: number; genSpread: number; thr: number; grain: number; dust: number; fog: number; streak: number; hollow: number; band: number;
	hand: number; colorSmooth: number; sloppy: number; offset: number; wobble: number; cover: number; stroke: number; strokeAng: number; overlap: number; strength: number;
	paper: string; paperTex: number; fibers: number; scanBlur: number; scanNoise: number; srcPaper: RGB;
	tonerK: number; fast: number; hairs: number; scratch: number; prints: number; smear: number; slop: number; dry: number; wobMm: number; gran: number; dryB: number; bloom: number;
	/** Paint colour of each marker, and the colour of the ORIGINAL that marks its zone (lab: markers.paint / markers.keys). */
	markers: string[]; keys: string[] | null;
	/** CPU maps (xeroxMaps.ts): marker ids of the "white gaps" mode, and stroke orientation per colour patch. */
	regionMap: HTMLCanvasElement | null; orientMap: HTMLCanvasElement | null;
};

export const XDEFAULTS: XeroxEngineParams = {
	tech: 'xerox', printW: 240, pxmm: 11.8, seed: 1, smooth: .12, dark: .5, soft: .05, motion: 0, photo: 0, lpi: 40, lid: 0,
	gens: 2, genSpread: .05, thr: .44, grain: .06, dust: .4, fog: .4, streak: .3, hollow: .35, band: .3,
	hand: 0, markers: [], keys: null, colorSmooth: .6, sloppy: .5, offset: .8, wobble: .5, cover: 1, stroke: 5, strokeAng: 35, overlap: .34, strength: 1,
	paper: '#f6f6f2', paperTex: .12, fibers: .1, scanBlur: .6, scanNoise: .3, srcPaper: [1, 1, 1],
	tonerK: .75, fast: .35, hairs: .4, scratch: .3, prints: .15, smear: .2, slop: .5, dry: .5, wobMm: .6, gran: .6, dryB: .3, bloom: .5,
	regionMap: null, orientMap: null,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Lab xBase(): the derived and fixed values of every engine parameter, from the macro controls. */
function xBase(x: XeroxSettings) {
	const d = x.dirt, sl = x.sloppy;
	const pap = x.paper === 'custom' ? { paper: x.paperHex, fibers: .15, paperTex: .12 } : XEROX_PAPERS[x.paper];
	return {
		dark: x.dark, tonerK: x.toner, soft: .05,
		hairs: lerp(.1, 1, d), scratch: lerp(0, .7, d), prints: lerp(0, .45, d), smear: lerp(0, .5, d),
		slop: sl, dry: .5, fast: .35, wobMm: lerp(.3, 1.2, sl), gran: .6, dryB: .3, bloom: .5, gens: x.gens, photo: x.mode === 'photo' ? 1 : 0, lpi: 40, motion: 0, lid: 0,
		dust: lerp(.05, 1, d), fog: lerp(.05, 1, d), streak: lerp(0, .8, d), band: lerp(.1, .8, d), hollow: lerp(.2, .7, d), grain: .06, thr: .44, genSpread: .05,
		hand: x.hand === 'marker' ? 1 : x.hand === 'water' ? 2 : 0, offset: lerp(.1, 2.2, sl), sloppy: lerp(.25, 1.2, sl), wobble: lerp(.2, .9, sl), cover: lerp(1, .75, sl),
		stroke: 5, strokeAng: 35, overlap: .28, strength: 1, colorSmooth: .25,
		paper: pap.paper, fibers: pap.fibers, paperTex: pap.paperTex, smooth: .12, scanBlurMm: .06, scanNoise: .3,
	};
}

/**
 * Lab xparams() minus what comes from the frame (markers, maps, srcPaper, seed: frame.ts engineParams).
 * frameW: frame width in px of the simulation. The frame is a 240 mm sheet, as in Riso; no lo-fi resolution
 * control in Fotocopia: pxmm = frameW / 240.
 */
export function xeroxParams(x: XeroxSettings, frameW: number): Partial<XeroxEngineParams> {
	const printW = 240, pxmm = frameW / printW;
	const b = Object.assign(xBase(x), x.fine);
	const { scanBlurMm, ...rest } = b;
	return { ...rest, tech: 'xerox', printW, pxmm, scanBlur: Math.max(.05, scanBlurMm * pxmm) };
}
