// Super Riso · Fotocopia (copy art / xerox) — panel data, styles, defaults and sanitising.
// Ported from the lab (diorame-riso-lab/tools/studio/ui.src.html: XPAPERS, MARKERS, XSTYLES, XFINE, st.x).
// Pure data, shared by the reducer (state, .dior), the panel and the engine mapping (canvas/superRiso/xeroxParams.ts).

import type { XeroxSettings, XeroxStyle, XeroxPaper, XeroxMarkerId, XeroxFineKey } from '../types/strataTypes';

/** Copy papers: tint, fibres and paper texture as the engine prints them. */
export const XEROX_PAPERS: Readonly<Record<Exclude<XeroxPaper, 'custom'>, { paper: string; fibers: number; paperTex: number }>> = {
	copy:     { paper: '#f6f6f2', fibers: .08, paperTex: .1 },
	recycled: { paper: '#e8e3d6', fibers: .45, paperTex: .3 },
	fpink:    { paper: '#ff8cc0', fibers: .1,  paperTex: .12 },
	fyellow:  { paper: '#f8f05c', fibers: .1,  paperTex: .12 },
	fgreen:   { paper: '#bdf274', fibers: .1,  paperTex: .12 },
	forange:  { paper: '#ffaa5c', fibers: .1,  paperTex: .12 },
	blue:     { paper: '#c6e0ef', fibers: .12, paperTex: .12 },
};
export const XEROX_PAPER_ORDER: readonly Exclude<XeroxPaper, 'custom'>[] = ['copy', 'recycled', 'fpink', 'fyellow', 'fgreen', 'forange', 'blue'];

/** The 16 markers of the lab's library (names in i18n: fx.superRiso.xerox.marker.<id>). */
export const XEROX_MARKERS: readonly (readonly [XeroxMarkerId, string])[] = [
	['red', '#e8202a'], ['pink', '#ff5aa5'], ['magenta', '#d4237a'], ['orange', '#ff7a1a'], ['yellow', '#ffd51a'], ['lemon', '#f0ee3a'], ['green', '#2fb24c'], ['lime', '#8fd33a'],
	['turquoise', '#14b5b0'], ['cyan', '#19a7e6'], ['blue', '#2b5fd0'], ['violet', '#7a3fb8'], ['brown', '#8a5a33'], ['skin', '#f2b38a'], ['warmGray', '#a59e94'], ['coolGray', '#8f99a3'],
];
/** Without colour zones in the drawing: these markers, in this order (lab FILL_DEFAULT). */
export const XEROX_FILL_DEFAULT: readonly XeroxMarkerId[] = ['red', 'yellow', 'cyan', 'pink', 'green', 'blue'];
export const xeroxMarkerId = (hex: string): XeroxMarkerId | undefined => XEROX_MARKERS.find(m => m[1] === hex.toLowerCase())?.[0];

type StyleFields = Partial<Omit<XeroxSettings, 'style' | 'fine' | 'over' | 'box'>> & { fine?: Partial<Record<XeroxFineKey, number>> };
/** The lab's XSTYLES. `fine` overrides (Munari → motion, Tapa abierta → lid) have no slider: they live in state.fine. */
export const XEROX_STYLES: Readonly<Record<XeroxStyle, StyleFields>> = {
	flyer:  { mode: 'line', dark: .55, toner: .85, gens: 2, dirt: .55, hand: 'none', paper: 'copy' },
	zine:   { mode: 'line', dark: .5, gens: 2, dirt: .4, hand: 'marker', pal: 'kit', n: 3, sloppy: .55, paper: 'copy' },
	water:  { mode: 'line', dark: .45, gens: 1, dirt: .3, hand: 'water', pal: 'own', n: 4, sloppy: .4, paper: 'copy' },
	fluor:  { mode: 'line', dark: .55, gens: 2, dirt: .45, hand: 'none', paper: 'fpink' },
	degen:  { mode: 'line', dark: .6, toner: .5, gens: 5, dirt: .85, hand: 'none', paper: 'recycled' },
	photo:  { mode: 'photo', screenSize: .6, dark: .5, gens: 1, dirt: .35, hand: 'none', paper: 'copy' },
	munari: { mode: 'line', dark: .5, gens: 1, dirt: .3, hand: 'none', paper: 'copy', fine: { motion: 10 } },
	lid:    { mode: 'line', dark: .55, gens: 2, dirt: .5, hand: 'marker', pal: 'kit', n: 2, sloppy: .6, paper: 'copy', fine: { lid: 1 } },
};
export const XEROX_STYLE_ORDER: readonly XeroxStyle[] = ['flyer', 'zine', 'water', 'fluor', 'degen', 'photo', 'munari', 'lid'];

/** Lab XFINE ranges: the only valid values of a `fine` override. */
export const XEROX_FINE_RANGES: Readonly<Record<XeroxFineKey, readonly [number, number]>> = {
	hollow: [0, 1], thr: [.3, .6], grain: [.02, .2], genSpread: [.01, .15],
	dust: [0, 1.5], hairs: [0, 1.5], scratch: [0, 1.5], prints: [0, 1.5], smear: [0, 1.5], fog: [0, 1.5], streak: [0, 1.5], band: [0, 1],
	lid: [0, 1], motion: [0, 30], lpi: [15, 80],
	offset: [0, 4], sloppy: [0, 2], wobble: [0, 1.2], cover: [.3, 1],
	slop: [0, 1.5], dry: [0, 1], fast: [0, 1], stroke: [1.5, 10], strokeAng: [0, 180], overlap: [.05, .5], strength: [.4, 1.6],
	wobMm: [0, 2.5], bloom: [0, 1.5], gran: [0, 1.5], dryB: [0, 1],
	scanNoise: [0, 1.5],
};

/** The lab's st.x defaults ("Fanzine a rotulador"). */
export const XEROX_DEFAULTS: Readonly<XeroxSettings> = {
	style: 'zine', mode: 'line', screenSize: .35, dark: .5, toner: .75, gens: 2, dirt: .4, hand: 'marker', what: 'auto', pal: 'kit', n: 3, over: {}, box: [], sloppy: .55,
	paper: 'copy', paperHex: '#f6f6f2', fillCover: .85, fillSeed: 1, fine: {},
};

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v)) ? Math.min(hi, Math.max(lo, v)) : d;
const int = (v: unknown, lo: number, hi: number, d: number) => Math.round(num(v, lo, hi, d));
const oneOf = <T>(v: unknown, list: readonly T[], d: T): T => (list as readonly unknown[]).includes(v) ? v as T : d;
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

const hexList = (v: unknown): string[] => Array.isArray(v) ? v.filter(isHex).map(h => h.toLowerCase()).slice(0, 6) : [];
function sanitizeOver(v: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	if (v && typeof v === 'object') for (const [k, h] of Object.entries(v as Record<string, unknown>)) if (isHex(k) && isHex(h)) out[k.toLowerCase()] = h.toLowerCase();
	return out;
}

/** Same contract as sanitizeSuperRiso: every field clamped / checked, so a .dior can never break the engine. */
export function sanitizeXerox(incoming: unknown): XeroxSettings {
	// Pre-3.19.1 scenes carried `colors` ('own'|'markers'|'manual') and `manual`: migrated here (markers/manual → kit; manual of white gaps → box).
	const s = (incoming && typeof incoming === 'object' ? incoming : {}) as Partial<Record<keyof XeroxSettings | 'colors' | 'manual', unknown>>;
	const d = XEROX_DEFAULTS;
	const fine: Partial<Record<XeroxFineKey, number>> = {};
	if (s.fine && typeof s.fine === 'object') {
		for (const [k, v] of Object.entries(s.fine as Record<string, unknown>)) {
			const r = XEROX_FINE_RANGES[k as XeroxFineKey];
			if (r && typeof v === 'number' && Number.isFinite(v)) fine[k as XeroxFineKey] = Math.min(r[1], Math.max(r[0], v));
		}
	}
	return {
		style: s.style === '' ? '' : oneOf(s.style, XEROX_STYLE_ORDER, d.style),
		mode: oneOf(s.mode, ['line', 'photo'] as const, d.mode),
		screenSize: num(s.screenSize, 0, 1, d.screenSize),
		dark: num(s.dark, 0, 1, d.dark),
		toner: num(s.toner, 0, 1, d.toner),
		gens: int(s.gens, 1, 6, d.gens),
		dirt: num(s.dirt, 0, 1, d.dirt),
		hand: oneOf(s.hand, ['none', 'marker', 'water'] as const, d.hand),
		what: oneOf(s.what, ['auto', 'color', 'fill'] as const, d.what),
		pal: oneOf(s.pal ?? (s.colors === 'own' ? 'own' : s.colors ? 'kit' : undefined), ['own', 'kit'] as const, d.pal),
		n: int(s.n, 1, 6, d.n),
		over: sanitizeOver(s.over),
		box: hexList(s.box ?? (s.what === 'fill' ? s.manual : undefined)),
		sloppy: num(s.sloppy, 0, 1, d.sloppy),
		paper: oneOf(s.paper, [...XEROX_PAPER_ORDER, 'custom'] as const, d.paper),
		paperHex: isHex(s.paperHex) ? s.paperHex.toLowerCase() : d.paperHex,
		fillCover: num(s.fillCover, .2, 1, d.fillCover),
		fillSeed: int(s.fillSeed, 1, 1e6, d.fillSeed),
		fine,
	};
}

/** Lab applyXStyle: fine cleared and toner back to .75, then the style; everything else stays. */
export function applyXeroxStyle(current: XeroxSettings, style: XeroxStyle): XeroxSettings {
	const s = XEROX_STYLES[style];
	const next = sanitizeXerox({ ...current, fine: {}, toner: .75, over: {}, what: 'auto', ...s, style });
	if (next.paper !== 'custom') next.paperHex = XEROX_PAPERS[next.paper].paper;
	return next;
}

/** A style chip stays lit while the controls (and its fine overrides) still match it. */
export function xeroxStyleMatches(x: XeroxSettings, id: XeroxStyle): boolean {
	const { fine = {}, ...s } = XEROX_STYLES[id];
	const fields = { toner: .75, ...s } as Record<string, unknown>;
	const fk = Object.keys(fine) as XeroxFineKey[];
	return x.style === id && Object.entries(fields).every(([k, v]) => (x as unknown as Record<string, unknown>)[k] === v)
		&& fk.length === Object.keys(x.fine).length && fk.every(k => x.fine[k] === fine[k]);
}
