// Super Riso · Stencil (plantilla + spray) — panel data, styles, defaults and sanitising.
// Ported from the lab v14 (diorame-riso-lab/tools/studio/ui.src.html: SPRAYS, TONES, SUPPORTS, SSTYLES, st.s, applySStyle).
// Pure data, shared by the reducer (state, .dior), the panel and the engine mapping (canvas/superRiso/stencilParams.ts).

import type { StencilSettings, StencilStyle, StencilSupport } from '../types/strataTypes';

/** Spray cans (names in i18n: fx.superRiso.stencil.spray.<id>). */
export const STENCIL_SPRAYS: readonly (readonly [string, string])[] = [
	['black', '#161616'], ['darkGray', '#4a4a48'], ['midGray', '#8a8a87'], ['lightGray', '#c6c6c2'], ['white', '#f4f4f0'], ['cream', '#efe2c2'],
	['red', '#d3242b'], ['burgundy', '#7a1f2b'], ['pink', '#f06aa3'], ['orange', '#f2701d'], ['yellow', '#f6cf17'], ['lime', '#9acd32'], ['green', '#1f9e4a'],
	['turquoise', '#16a3a3'], ['skyBlue', '#62b3e4'], ['blue', '#1f55b6'], ['violet', '#6a3d9f'], ['brown', '#6c4428'],
];
export const stencilSprayId = (hex: string): string | undefined => STENCIL_SPRAYS.find(s => s[1] === hex.toLowerCase())?.[0];

/** Greys of the tone layers, light to dark, per number of layers. */
export const STENCIL_TONES: Readonly<Record<number, readonly string[]>> = {
	1: ['#161616'], 2: ['#8a8a87', '#161616'], 3: ['#c6c6c2', '#8a8a87', '#161616'], 4: ['#c6c6c2', '#8a8a87', '#4a4a48', '#161616'],
};

/** Supports: colour, generator type (0 paper, 1 wall, 2 cardboard, 3 canvas, 4 wood) and default texture. */
export const STENCIL_SUPPORTS: Readonly<Record<Exclude<StencilSupport, 'custom'>, { type: number; hex: string; tex: number }>> = {
	wall:   { type: 1, hex: '#c9c6bf', tex: .75 },
	wallw:  { type: 1, hex: '#ecebe6', tex: .6 },
	dark:   { type: 1, hex: '#3d3c3a', tex: .6 },
	card:   { type: 2, hex: '#c39d6c', tex: .75 },
	canvas: { type: 3, hex: '#efece4', tex: .6 },
	wood:   { type: 4, hex: '#c9a37a', tex: .7 },
	paper:  { type: 0, hex: '#f6f5f1', tex: .4 },
};
export const STENCIL_SUPPORT_ORDER: readonly Exclude<StencilSupport, 'custom'>[] = ['wall', 'wallw', 'dark', 'card', 'canvas', 'wood', 'paper'];
/** Slider value (0–1) that gives a support its own texture: supTex = lerp(0, 1.5, v). */
export const supTexSlider = (sup: StencilSupport): number => sup === 'custom' ? .4 : STENCIL_SUPPORTS[sup].tex / 1.5;
/** Default droplet-size slider: drop = lerp(.4, 3, v) = 1, the lab's droplet. */
export const STENCIL_DROP_DEFAULT = .6 / 2.6;

type StyleFields = Partial<Omit<StencilSettings, 'style' | 'manual'>>;
/** The lab's SSTYLES. */
export const STENCIL_STYLES: Readonly<Record<StencilStyle, StyleFields>> = {
	banksy:  { mode: 'tone', n: 1, dark: .5, cut: .3, bridges: false, load: .7, lift: .35, over: .25, drips: .12, splat: .05, sloppy: .25, accent: false, cloud: 'white', sup: 'card' },
	canvas:  { mode: 'tone', n: 1, dark: .5, cut: .25, bridges: false, load: .75, lift: .15, over: .15, drips: 0, splat: 0, sloppy: .15, accent: false, cloud: 'none', sup: 'canvas' },
	wall:    { mode: 'tone', n: 1, dark: .5, cut: .35, bridges: false, load: .75, lift: .55, over: .45, drips: .6, splat: .15, sloppy: .35, accent: false, cloud: 'none', sup: 'wall' },
	layers:  { mode: 'tone', n: 3, dark: .5, cut: .35, bridges: false, load: .7, lift: .35, over: .3, drips: .25, splat: .1, sloppy: .45, accent: false, cloud: 'none', sup: 'wallw' },
	accent:  { mode: 'tone', n: 1, dark: .5, cut: .3, bridges: false, load: .75, lift: .2, over: .2, drips: .05, splat: 0, sloppy: .2, accent: true, cloud: 'none', sup: 'paper' },
	color:   { mode: 'color', n: 3, dark: .5, cut: .35, bridges: false, load: .75, lift: .3, over: .3, drips: .3, splat: .2, sloppy: .4, accent: false, cloud: 'none', sup: 'wallw' },
	street:  { mode: 'tone', n: 2, dark: .55, cut: .4, bridges: false, load: .65, lift: .85, over: .7, drips: .75, splat: .7, sloppy: .7, accent: false, cloud: 'color', cloudHex: '#16a3a3', sup: 'wall' },
	bridges: { mode: 'tone', n: 1, dark: .5, cut: .2, bridges: true, load: .8, lift: .25, over: .2, drips: .1, splat: 0, sloppy: .2, accent: false, cloud: 'none', sup: 'paper' },
};
export const STENCIL_STYLE_ORDER: readonly StencilStyle[] = ['banksy', 'canvas', 'wall', 'layers', 'accent', 'color', 'street', 'bridges'];

/** The lab's st.s defaults («Banksy en cartón»). */
export const STENCIL_DEFAULTS: Readonly<StencilSettings> = {
	style: 'banksy', mode: 'tone', n: 1, dark: .5, cut: .3, bridges: false, load: .7, lift: .35, over: .25, drips: .12, splat: .05, sloppy: .25,
	colors: 'spray', manual: [], accent: false, cloud: 'white', cloudHex: '#16a3a3', sup: 'card', supHex: '#c39d6c', supType: 2,
	supTex: supTexSlider('card'), dropSize: STENCIL_DROP_DEFAULT,
};

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
const oneOf = <T>(v: unknown, list: readonly T[], d: T): T => (list as readonly unknown[]).includes(v) ? v as T : d;
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** Same contract as sanitizeSuperRiso: every field clamped / checked, so a .dior can never break the engine. */
export function sanitizeStencil(incoming: unknown): StencilSettings {
	const s = (incoming && typeof incoming === 'object' ? incoming : {}) as Partial<Record<keyof StencilSettings, unknown>>;
	const d = STENCIL_DEFAULTS;
	const mode = oneOf(s.mode, ['tone', 'color'] as const, d.mode);
	const sup = oneOf(s.sup, [...STENCIL_SUPPORT_ORDER, 'custom'] as const, d.sup);
	return {
		style: s.style === '' ? '' : oneOf(s.style, STENCIL_STYLE_ORDER, d.style),
		mode,
		n: Math.round(num(s.n, 1, mode === 'color' ? 3 : 4, d.n)),
		dark: num(s.dark, 0, 1, d.dark), cut: num(s.cut, 0, 1, d.cut),
		bridges: typeof s.bridges === 'boolean' ? s.bridges : d.bridges,
		load: num(s.load, 0, 1, d.load), lift: num(s.lift, 0, 1, d.lift), over: num(s.over, 0, 1, d.over),
		drips: num(s.drips, 0, 1, d.drips), splat: num(s.splat, 0, 1, d.splat), sloppy: num(s.sloppy, 0, 1, d.sloppy),
		colors: oneOf(s.colors, ['spray', 'own'] as const, d.colors),
		manual: Array.isArray(s.manual) ? s.manual.filter(isHex).map(h => h.toLowerCase()).slice(0, 5) : [],
		accent: typeof s.accent === 'boolean' ? s.accent : d.accent,
		cloud: oneOf(s.cloud, ['none', 'white', 'color'] as const, d.cloud),
		cloudHex: isHex(s.cloudHex) ? s.cloudHex.toLowerCase() : d.cloudHex,
		sup,
		supHex: isHex(s.supHex) ? s.supHex.toLowerCase() : sup === 'custom' ? d.supHex : STENCIL_SUPPORTS[sup].hex,
		supType: Math.round(num(s.supType, 0, 4, sup === 'custom' ? d.supType : STENCIL_SUPPORTS[sup].type)),
		supTex: num(s.supTex, 0, 1, supTexSlider(sup)),
		dropSize: num(s.dropSize, 0, 1, d.dropSize),
	};
}

/** Lab applySStyle: manual colours cleared and sprays back, then the style; the support fixes colour, type and texture. */
export function applyStencilStyle(current: StencilSettings, style: StencilStyle): StencilSettings {
	const next = sanitizeStencil({ ...current, manual: [], colors: 'spray', ...STENCIL_STYLES[style], style });
	if (next.sup !== 'custom') { const sp = STENCIL_SUPPORTS[next.sup]; next.supHex = sp.hex; next.supType = sp.type; next.supTex = supTexSlider(next.sup); }
	return next;
}

/** A style chip stays lit while the controls still match it. */
export function stencilStyleMatches(s: StencilSettings, id: StencilStyle): boolean {
	return s.style === id && Object.entries(STENCIL_STYLES[id]).every(([k, v]) => (s as unknown as Record<string, unknown>)[k] === v);
}
