// Super Riso — internal engine parameters and the 8-control panel → parameters mapping.
// Ported from the lab's superRiso.engine.js. Distances are mm of a virtual sheet.

import type { RGB } from './inks';

export type EngineParams = {
	inks: string[]; names: string[]; opac: number[];
	printW: number; pxmm: number; srcPaper: RGB;
	smooth: number; inkCost: number; pair: number; trap: number; minDot: number; solidLv: number; fill: number; single: number;
	misreg: number; rot: number; scl: number;
	screen: number; grain: number; inkLoad: number; lpi: number; gain: number; bleed: number; edge: number;
	texAmp: number; mottle: number; streak: number; voids: number; starve: number;
	paperTex: number; fibers: number; incl: number; paper: string;
	scanBlur: number; scanNoise: number; normWhite: number; seed: number;
	crisp?: boolean;
};

// Parámetros internos (los que mueve el panel por debajo). Distancias en mm del papel virtual.
export const DEFAULTS: EngineParams = {
	inks: ["#000000"], names: ["Black"], opac: [.32],
	printW: 240, pxmm: 11.8, srcPaper: [1, 1, 1],
	smooth: .25, inkCost: .03, pair: .01, trap: 1, minDot: .06, solidLv: .8, fill: 1, single: .035,
	misreg: .30, rot: .04, scl: .6,
	screen: 0, grain: .16, inkLoad: .6, lpi: 85, gain: .5, bleed: .045, edge: .5,
	texAmp: .85, mottle: .5, streak: 0, voids: .15, starve: .15,
	paperTex: .2, fibers: .25, incl: .15, paper: "#f3efe6",
	scanBlur: .7, scanNoise: .35, normWhite: 1, seed: 1,
};

// ═════════════════════════ Panel → parámetros ═════════════════════════
// Los 8 controles del panel Super Riso, convertidos en los parámetros del motor. Es la parte que Diorame guarda en .dior.
export type PaperId = 'white' | 'natural' | 'recycled' | 'cream';
export type PanelSettings = {
	inkSet: 'own' | 'dpal' | 'cmyk';
	maxInks: number;
	paper: PaperId;
	screen: 'grain' | 'dots';
	screenSize: number;
	imperfection: number;
	resolution: number;
	reprintFps: number;
};

export const PAPERS: Readonly<Record<PaperId, { paper: string; fibers: number; incl: number; paperTex: number }>> = {
	white:    { paper: "#f8f7f3", fibers: .15, incl: 0,   paperTex: .15 },
	natural:  { paper: "#f3efe6", fibers: .25, incl: .12, paperTex: .2  },
	recycled: { paper: "#ebe5d6", fibers: .5,  incl: .6,  paperTex: .35 },
	cream:    { paper: "#f4e9d0", fibers: .3,  incl: .15, paperTex: .22 },
};
export const PANEL_DEFAULTS: PanelSettings = { inkSet: 'own', maxInks: 6, paper: 'natural', screen: 'grain', screenSize: .5, imperfection: .4, resolution: .7, reprintFps: 0 };
export const STYLES: Readonly<Record<'clean' | 'zine' | 'lofi' | 'cmyk', { label: string; panel: Partial<PanelSettings> }>> = {
	clean: { label: 'Taller limpio', panel: { inkSet: 'own',  maxInks: 6, paper: 'white',    screen: 'grain', screenSize: .35, imperfection: .2,  resolution: .85 } },
	zine:  { label: 'Fanzine',       panel: { inkSet: 'dpal', maxInks: 4, paper: 'recycled', screen: 'grain', screenSize: .65, imperfection: .75, resolution: .6  } },
	lofi:  { label: 'Lo-fi',         panel: { inkSet: 'own',  maxInks: 4, paper: 'natural',  screen: 'grain', screenSize: .8,  imperfection: .55, resolution: .1 } },
	cmyk:  { label: 'Cuatricromía',  panel: { inkSet: 'cmyk', maxInks: 4, paper: 'white',    screen: 'dots',  screenSize: .45, imperfection: .45, resolution: .7  } },
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Resolution control → internal scale, shared by Riso and Fotocopia: pxmm (lo-fi = 40 % of the canvas), `crisp` (enlarge
 *  without smoothing below .5) and the scanner's softness and noise. */
export function resolutionParams(r: number, frameW: number) {
	const printW = 240;                                            // el fotograma es una hoja de 240 mm
	return { printW, pxmm: frameW * lerp(.4, 1, r) / printW, crisp: r < .5, scanBlur: lerp(1.0, .65, r), scanNoise: lerp(.6, .35, r) };
}
// panel → parámetros internos. frameW = ancho del fotograma en px (lienzo CINEMA). Devuelve también la escala interna.
export function fromPanel(panel: Partial<PanelSettings>, frameW: number): Partial<EngineParams> {
	const p = Object.assign({}, PANEL_DEFAULTS, panel); const i = p.imperfection, r = p.resolution, z = p.screenSize;
	return Object.assign({
		...resolutionParams(r, frameW),       // pxmm, crisp (ampliar sin suavizado → lo-fi nítido, no borroso), scanBlur, scanNoise
		screen: p.screen === 'dots' ? 1 : 0, grain: lerp(.09, .30, z), lpi: Math.round(lerp(120, 45, z)),
		// lab v18 curve: subtler misregistration, rotation, scale, edge, voids and ink texture at the top of the range
		misreg: .04 + .6 * Math.pow(i, 1.6), rot: lerp(.01, .1, i), scl: lerp(.2, 1.2, i),
		edge: lerp(.2, .65, i), voids: lerp(.05, .4, i), texAmp: lerp(.5, 1.05, i), starve: lerp(.05, .4, i), mottle: lerp(.3, 1.2, i),
		bleed: lerp(.04, .07, i), inkLoad: lerp(.75, .5, i),
	}, PAPERS[p.paper] || PAPERS.natural);
}
