// Super Riso — the inks of a scene, from the fill colours of its shapes (L1). No k-means over the
// frame: what the drawing is made of does not change with the camera, so the inks never flicker.
// Cached per scene (shapes / hidden layers / ink set / theme by identity), never per frame.
//
//   own   Dibujo: the shape colours themselves, grouped down to maxInks.
//   dpal  Riso: each of those groups as the nearest Diorame riso ink (no repeats).
//   cmyk  the fixed 4-ink CMYK set.
// The colour that becomes paper (srcPaper) is not an ink. In dark mode the dark background IS ink
// (srcPaper is white there), so it enters as the heaviest colour of the scene.

import type { Shape, SuperRisoSettings } from '../../../../types/strataTypes';
import { DIORAME_RISO, CMYK_RISO, MAXI, hex2rgb, oklab, dP, printedHex, opacityFor, nearestFrom, type InkEntry, type PickedInks, type RGB } from './inks';

type Group = { hex: string; L: RGB; w: number };

/** Mirror of StrataContext.BASE_DEPTH_STEP: a shape's zIndex is its layer index · −150. */
const BASE_DEPTH_STEP = 150;
/** Below this OKLab distance to srcPaper a colour prints as paper, not as an ink. */
const PAPER_DIST = .06;

const weightOf = (s: Shape): number => {
	if (s.type === 'text') return Math.pow(s.fontSize ?? 40, 2) * Math.max(1, s.text?.length ?? 1) * .5;
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const p of s.points) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
	return Number.isFinite(x0) ? (x1 - x0) * (y1 - y0) + 1 : 1;
};

// Lab v18 (analyze): no near-twin inks. A gradient between two similar colours prints with ONE ink in grain, not with two
// inks that split the image into islands; between darks the bar is higher (two dark printed inks look the same).
const tooClose = (a: RGB, b: RGB) => { const m = Math.min(a[0], b[0]); return dP(a, b) < .12 + .055 * Math.max(0, Math.min(1, (.4 - m) / .2)); };

/** Shape colours by usage, merged closest-pair first (the heavier colour survives) down to maxN. noTwins: twins by the
 *  lab's rule are merged first, the one with more surface surviving (Riso «Dibujo» only). */
function groups(shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null, maxN: number, noTwins: boolean): Group[] {
	const byHex = new Map<string, number>();
	const hiddenZ = new Set(hidden.map(i => i * -BASE_DEPTH_STEP));
	for (const s of shapes) {
		if (s.isEraser || !s.color || s.points.length === 0 || hiddenZ.has(s.zIndex)) continue;
		const hex = s.color.toLowerCase();
		byHex.set(hex, (byHex.get(hex) ?? 0) + weightOf(s));
	}
	const P = oklab(srcPaper);
	const gs: Group[] = [];
	for (const [hex, w] of byHex) {
		if (!/^#[0-9a-f]{6}$/.test(hex)) continue;
		const L = oklab(hex2rgb(hex));
		if (dP(L, P) >= PAPER_DIST) gs.push({ hex, L, w });
	}
	if (darkBase) gs.push({ hex: darkBase, L: oklab(hex2rgb(darkBase)), w: Infinity });
	if (noTwins) {
		const kept: Group[] = [];
		for (const g of gs.sort((a, b) => b.w - a.w)) { const twin = kept.find(k => tooClose(k.L, g.L)); if (twin) twin.w += g.w; else kept.push(g); }
		gs.splice(0, gs.length, ...kept);
	}
	while (gs.length > maxN) {
		let bi = 0, bj = 1, bd = Infinity;
		for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
			const d = dP(gs[i].L, gs[j].L);
			if (d < bd) { bd = d; bi = i; bj = j; }
		}
		const [keep, drop] = gs[bi].w >= gs[bj].w ? [bi, bj] : [bj, bi];
		gs[keep].w += gs[drop].w;
		gs.splice(drop, 1);
	}
	return gs.sort((a, b) => b.w - a.w);
}

function build(shapes: readonly Shape[], hidden: readonly number[], inkSet: SuperRisoSettings['inkSet'], maxInks: number, srcPaper: RGB, darkBase: string | null, noTwins: boolean): PickedInks {
	let inks: InkEntry[];
	if (inkSet === 'cmyk') inks = CMYK_RISO.slice();
	else {
		const gs = groups(shapes, hidden, srcPaper, darkBase, Math.min(MAXI, maxInks), noTwins && inkSet === 'own');
		if (inkSet === 'own') inks = gs.map(g => ['', g.hex] as const);
		else {
			const list = DIORAME_RISO.filter(x => x[0] !== 'White'), used = new Set<string>();
			inks = [];
			for (const g of gs) { const b = nearestFrom(list, hex2rgb(g.hex), used); if (b) { used.add(b[0]); inks.push(b); } }
		}
	}
	if (!inks.length) inks = [['Black', '#000000']];
	// Light inks first, as the lab orders them.
	inks.sort((a, b) => oklab(hex2rgb(printedHex(b[1])))[0] - oklab(hex2rgb(printedHex(a[1])))[0]);
	return { inks: inks.map(x => x[1]), names: inks.map(x => x[0]), opac: inks.map(x => opacityFor(x[0], x[1])), srcPaper };
}

let cache: { shapes: readonly Shape[]; hidden: readonly number[]; key: string; inks: PickedInks } | null = null;

/** darkBase: the background colour in dark mode (it prints as ink), null in light mode. noTwins: the lab v18 twin rule (Riso's
 *  own inks; Fotocopia and Stencil call without it, so their colour pools do not change). */
export function sceneInks(shapes: readonly Shape[], hidden: readonly number[], settings: SuperRisoSettings, srcPaper: RGB, darkBase: string | null, noTwins = false): PickedInks {
	const key = `${settings.inkSet}|${settings.maxInks}|${srcPaper.join(',')}|${darkBase}|${+noTwins}`;
	if (cache && cache.shapes === shapes && cache.hidden === hidden && cache.key === key) return cache.inks;
	const inks = build(shapes, hidden, settings.inkSet, settings.maxInks, srcPaper, darkBase, noTwins);
	cache = { shapes, hidden, key, inks };
	return inks;
}
