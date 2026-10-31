// Super Riso · Stencil — internal engine parameters and the panel → parameters mapping.
// Ported from the lab v14: SDEFAULTS (engine.studio.js) and sBase() (ui.src.html). Distances in mm of the sheet.
// The lab's fine-tuning (SFINE) has no sliders in Diorame: its values come from sBase(). The print settings add
// support texture, droplet size and resolution (the same translation as Riso and Fotocopia: panel.resolutionParams).

import type { StencilSettings } from '../../../../types/strataTypes';
import { STENCIL_SUPPORTS } from '../../../../constants/superRisoStencil';
import { resolutionParams } from './panel';
import type { RGB } from './inks';
import type { StencilLayer, StencilMaps } from './stencilCpu';

export type StencilEngineParams = {
	tech: 'stencil'; printW: number; pxmm: number; seed: number; smooth: number; cut: number; facet: number; misreg: number;
	layers: StencilLayer[]; accKey: string | null;
	lift: number; liftMm: number; liftScale: number; over: number; load: number; mist: number; drop: number;
	cloud: number; cloudHex: string; support: string; supType: number; supTex: number;
	scanBlur: number; scanNoise: number; srcPaper: RGB; maps: StencilMaps | null;
	// CPU-map inputs (stencilScene.ts)
	drips: number; dripLen: number; dripW: number; splat: number; splatSize: number; cloudMm: number; bridges: boolean; bridgeMm: number;
};

export const SDEFAULTS: StencilEngineParams = {
	tech: 'stencil', printW: 240, pxmm: 11.8, seed: 1, smooth: .12, cut: 1, facet: .6, misreg: .5, layers: [], accKey: null,
	lift: .35, liftMm: 2.2, liftScale: 22, over: .3, load: 1, mist: .4, drop: 1, cloud: 0, cloudHex: '#f4f4f0',
	support: '#cfccc5', supType: 1, supTex: .7, scanBlur: .6, scanNoise: .3, srcPaper: [1, 1, 1], maps: null,
	drips: 0, dripLen: 8, dripW: .9, splat: 0, splatSize: .8, cloudMm: 18, bridges: false, bridgeMm: .9,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Lab sBase() (minus the scanner, which follows Resolution) + support texture and droplet size of the print settings. */
function sBase(s: StencilSettings) {
	const sl = s.sloppy;
	const sup = s.sup === 'custom' ? { type: s.supType, hex: s.supHex } : STENCIL_SUPPORTS[s.sup];
	return {
		cut: lerp(.3, 4, Math.pow(s.cut, 1.5)), facet: lerp(.3, 1.1, sl), misreg: lerp(0, 2.2, sl), lift: s.lift, liftMm: lerp(1.2, 3.2, s.lift), liftScale: 22, over: s.over,
		load: lerp(.72, 1.25, s.load), mist: lerp(.2, .85, sl), drop: lerp(.4, 3, s.dropSize), drips: s.drips, dripLen: lerp(3, 26, s.drips), dripW: .9, splat: s.splat, splatSize: .8,
		cloud: s.cloud === 'none' ? 0 : 1, cloudHex: s.cloud === 'white' ? '#f4f4f0' : s.cloudHex, cloudMm: 18, bridges: s.bridges, bridgeMm: .9,
		support: s.sup === 'custom' ? s.supHex : sup.hex, supType: sup.type, supTex: lerp(0, 1.5, s.supTex), smooth: .12,
	};
}

/** Engine parameters without what comes from the frame (layers, maps, srcPaper, seed: frame.ts engineParams). */
export function stencilParams(s: StencilSettings, frameW: number, resolution: number): Partial<StencilEngineParams> {
	return { ...resolutionParams(resolution, frameW), ...sBase(s), tech: 'stencil' };
}
