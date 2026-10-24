// Super Riso · Fotocopia — which markers colour the copy, and which colour of the original each one paints.
// Ported from the lab (ui.src.html: xPool, updateMarkers, assignKeys). The lab analyses the image (k-means); Diorame
// takes the colours the scene is made of, as Riso does (sceneInks.ts): they do not change with the camera, so the
// palette never flickers. Cached per scene and settings, never per frame.

import type { Shape, SuperRisoSettings, XeroxSettings } from '../../../../types/strataTypes';
import { XEROX_MARKERS, XEROX_FILL_DEFAULT, xeroxMarkerId } from '../../../../constants/superRisoXerox';
import { sceneInks } from './sceneInks';
import { hex2rgb, oklab, dP, type RGB } from './inks';
import type { XeroxMarker } from './xeroxPalette';

/** paint: the marker colours; keys: the colour of the ORIGINAL that marks each zone (null in "white gaps"). */
export type XeroxMarkers = { list: XeroxMarker[]; paint: string[]; keys: string[] | null; what: 'color' | 'fill'; unused: number };

const marker = (id: string): XeroxMarker => { const m = XEROX_MARKERS.find(e => e[0] === id)!; return { hex: m[1], id: m[0] }; };
const okd = (a: RGB, b: RGB) => { const e0 = (a[0] - b[0]) * .6, e1 = a[1] - b[1], e2 = a[2] - b[2]; return e0 * e0 + e1 * e1 + e2 * e2; };

/** Colours of the drawing a marker can take: the most vivid ones (not the paper, not the near-black, which is toner). */
function xPool(s: SuperRisoSettings, shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null): string[] {
	const P = oklab(srcPaper);
	return sceneInks(shapes, hidden, { ...s, inkSet: 'own', maxInks: 8 }, srcPaper, darkBase).inks
		.filter(h => { const L = oklab(hex2rgb(h)); return L[0] > .36 && Math.hypot(L[0] - P[0], L[1] - P[1], L[2] - P[2]) > .08; })
		.sort((a, b) => { const A = oklab(hex2rgb(a)), B = oklab(hex2rgb(b)); return Math.hypot(B[1], B[2]) - Math.hypot(A[1], A[2]); }).slice(0, 6);
}

// Markers chosen by hand → colour zones of the drawing. Each marker takes the zone most like it (no repeats while
// zones remain); leftover zones go to the nearest marker. Nobody is left unpainted for not "matching".
function assignKeys(pool: string[], chosen: XeroxMarker[]) {
	const K = pool.map(h => oklab(hex2rgb(h))), C = chosen.map(m => oklab(hex2rgb(m.hex)));
	const pairs: [number, number, number][] = []; K.forEach((k, i) => C.forEach((c, j) => pairs.push([okd(k, c), i, j]))); pairs.sort((a, b) => a[0] - b[0]);
	const kOf = K.map(() => -1), used = C.map(() => false);
	for (const [, i, j] of pairs) { if (kOf[i] >= 0 || used[j]) continue; kOf[i] = j; used[j] = true; }
	K.forEach((k, i) => { if (kOf[i] >= 0) return; let bj = 0, bd = 1e9; C.forEach((c, j) => { const d = okd(k, c); if (d < bd) { bd = d; bj = j; } }); kOf[i] = bj; });
	return { keys: pool.slice(), paint: kOf.map(j => chosen[j].hex), unused: used.filter(u => !u).length };
}

function build(s: SuperRisoSettings, shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null): XeroxMarkers {
	const x: XeroxSettings = s.xerox, pool = xPool(s, shapes, hidden, srcPaper, darkBase);
	const what = x.what === 'auto' ? (pool.length ? 'color' : 'fill') : x.what;
	let list: XeroxMarker[], src: string[] | null = null;
	if (x.colors === 'manual') list = (x.manual.length ? x.manual : ['#e8202a']).slice(0, 6).map(h => ({ hex: h, id: xeroxMarkerId(h) }));
	else if (!pool.length) list = XEROX_FILL_DEFAULT.slice(0, x.n).map(marker);
	else if (x.colors === 'own') list = pool.slice(0, x.n).map(h => ({ hex: h }));
	else {
		const used = new Set<string>(); list = []; src = [];
		for (const h of pool) {
			if (list.length >= x.n) break;
			const L = oklab(hex2rgb(h)); let best: (typeof XEROX_MARKERS)[number] | null = null, bd = 1e9;
			for (const m of XEROX_MARKERS) { if (used.has(m[0])) continue; const d = dP(L, oklab(hex2rgb(m[1]))); if (d < bd) { bd = d; best = m; } }
			if (best) { used.add(best[0]); list.push({ hex: best[1], id: best[0] }); src.push(h); }
		}
	}
	if (!list.length) list = [marker('red')];
	let paint = list.map(m => m.hex), keys: string[] | null = null, unused = 0;
	if (what !== 'fill') {
		if (x.colors === 'manual') { const a = assignKeys(pool, list); keys = a.keys; paint = a.paint; unused = a.unused; }
		else keys = src || paint.slice();                       // Rotuladores: the zone is marked by the original colour, not the marker's
	}
	return { list, paint, keys, what, unused };
}

let cache: { shapes: readonly Shape[]; hidden: readonly number[]; key: string; mk: XeroxMarkers } | null = null;

export function xeroxMarkers(s: SuperRisoSettings, shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null): XeroxMarkers {
	const x = s.xerox;
	const key = JSON.stringify([x.what, x.colors, x.n, x.manual, srcPaper, darkBase]);
	if (cache && cache.shapes === shapes && cache.hidden === hidden && cache.key === key) return cache.mk;
	const mk = build(s, shapes, hidden, srcPaper, darkBase);
	cache = { shapes, hidden, key, mk };
	return mk;
}
