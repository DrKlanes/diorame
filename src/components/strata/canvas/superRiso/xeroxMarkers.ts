// Super Riso · Fotocopia — which markers colour the copy, and which colour of the original each one paints.
// Ported from the lab (ui.src.html: xPool, updateMarkers, assignKeys). The lab analyses the image (k-means); Diorame
// takes the colours the scene is made of, as Riso does (sceneInks.ts): they do not change with the camera, so the
// palette never flickers. Cached per scene and settings, never per frame.

import type { Shape, SuperRisoSettings, XeroxSettings } from '../../../../types/strataTypes';
import { XEROX_MARKERS, XEROX_FILL_DEFAULT, xeroxMarkerId } from '../../../../constants/superRisoXerox';
import { sceneInks } from './sceneInks';
import { hex2rgb, oklab, dP, type RGB } from './inks';
import type { XeroxMarker, XeroxRow } from './xeroxPalette';

/** rows: what the panel lists. paint: the colour of each row; keys: the colour of the ORIGINAL that marks each zone
 *  (null in "white gaps"); zones: how many colour zones the drawing has. */
export type XeroxMarkers = { rows: XeroxRow[]; paint: string[]; keys: string[] | null; what: 'color' | 'fill'; zones: number };

const marker = (id: string): XeroxMarker => { const m = XEROX_MARKERS.find(e => e[0] === id)!; return { hex: m[1], id: m[0] }; };
const okd = (a: RGB, b: RGB) => { const e0 = (a[0] - b[0]) * .6, e1 = a[1] - b[1], e2 = a[2] - b[2]; return e0 * e0 + e1 * e1 + e2 * e2; };

/** Colours of the drawing a marker can take: the most vivid ones (not the paper, not the near-black, which is toner). */
export function xPool(s: SuperRisoSettings, shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null): string[] {
	const P = oklab(srcPaper);
	return sceneInks(shapes, hidden, { ...s, inkSet: 'own', maxInks: 8 }, srcPaper, darkBase).inks
		.filter(h => { const L = oklab(hex2rgb(h)); return L[0] > .36 && Math.hypot(L[0] - P[0], L[1] - P[1], L[2] - P[2]) > .08; })
		.sort((a, b) => { const A = oklab(hex2rgb(a)), B = oklab(hex2rgb(b)); return Math.hypot(B[1], B[2]) - Math.hypot(A[1], A[2]); }).slice(0, 6);
}

/** The override key each zone takes (null: none). An override is tied to the nearest zone colour within tolerance, not to
 *  the exact hex (the drawing changes while it is painted and its colours drift a little). Lab v23.18 xOverBind: ONE TO ONE —
 *  each override goes to its nearest zone and each zone takes one at most. Before, each zone took the nearest override within
 *  the tolerance (.012 in squared distance ≈ 0.11 OKLab): two similar zones (two reds) shared the same override, and changing
 *  one row changed the other too. */
function xOverBind(over: Record<string, string>, zones: readonly string[]): (string | null)[] {
	const Z = zones.map(h => oklab(hex2rgb(h))), pairs: [number, string, number][] = [];
	for (const k of Object.keys(over)) { const K = oklab(hex2rgb(k)); Z.forEach((z, i) => { const d = okd(K, z); if (d < .012) pairs.push([d, k, i]); }); }
	pairs.sort((a, b) => a[0] - b[0]); const zk: (string | null)[] = zones.map(() => null), done = new Set<string>();
	for (const [, k, i] of pairs) { if (zk[i] !== null || done.has(k)) continue; zk[i] = k; done.add(k); }
	return zk;
}

function build(s: SuperRisoSettings, shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null): XeroxMarkers {
	const x: XeroxSettings = s.xerox, pool = xPool(s, shapes, hidden, srcPaper, darkBase);
	const what = x.what === 'auto' ? (pool.length ? 'color' : 'fill') : x.what;
	let rows: XeroxRow[], keys: string[] | null = null;
	if (what === 'fill') {
		rows = (x.box.length ? x.box : XEROX_FILL_DEFAULT.slice(0, 3).map(id => marker(id).hex)).slice(0, 6).map((hex, i) => ({ hex, id: xeroxMarkerId(hex), box: i }));
	} else {
		// Each row is a ZONE of the drawing → the colour it is painted with. Editing a row only touches its own entry.
		const zones = pool.slice(0, Math.max(1, Math.min(x.n, pool.length))), used = new Set<string>();
		const ovr = xOverBind(x.over, zones);
		rows = zones.map((zone, zi) => {
			const ok = ovr[zi]; let hex = ok ? x.over[ok] : null;
			if (!hex) {
				if (x.pal === 'own') hex = zone;
				else { // the nearest marker not yet used, zones by chroma (lab updateMarkers)
					const L = oklab(hex2rgb(zone)); let bd = 1e9;
					for (const m of XEROX_MARKERS) { if (used.has(m[1])) continue; const d = dP(L, oklab(hex2rgb(m[1]))); if (d < bd) { bd = d; hex = m[1]; } }
				}
			}
			used.add(hex!);
			return { hex: hex!, id: x.pal === 'own' && !ok ? undefined : xeroxMarkerId(hex!), zone, over: ok ?? undefined };
		});
		keys = zones.slice();
	}
	if (!rows.length) rows = [{ ...marker('red'), id: 'red' }];
	return { rows, paint: rows.map(r => r.hex), keys, what, zones: pool.length };
}

let cache: { shapes: readonly Shape[]; hidden: readonly number[]; key: string; mk: XeroxMarkers } | null = null;

export function xeroxMarkers(s: SuperRisoSettings, shapes: readonly Shape[], hidden: readonly number[], srcPaper: RGB, darkBase: string | null): XeroxMarkers {
	const x = s.xerox;
	const key = JSON.stringify([x.what, x.pal, x.n, x.over, x.box, srcPaper, darkBase]);
	if (cache && cache.shapes === shapes && cache.hidden === hidden && cache.key === key) return cache.mk;
	const mk = build(s, shapes, hidden, srcPaper, darkBase);
	cache = { shapes, hidden, key, mk };
	return mk;
}
