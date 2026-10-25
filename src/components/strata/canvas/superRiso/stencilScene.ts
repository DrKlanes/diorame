// Super Riso · Stencil — the templates of a frame (lab sLayers / sPaper / sTones / stencilMapsFor) and the policy of its
// CPU work, same family as Fotocopia's maps (xeroxMaps.ts):
//   colour zones  the scene's colours (xeroxMarkers.xPool): stable, cached per scene.
//   thresholds    stencilTones (multilevel Otsu over the frame): computed at once the first time and when their inputs
//                 change; otherwise refreshed only with the camera still. While it moves the last ones are reused (no flicker).
//   maps          drips, splats, bridges and cloud (stencilMaps): computed on the STILL frame, in an idle callback from a
//                 copy of it, at most every THROTTLE_MS (also while moving when there are none yet or their inputs changed). While the camera moves, drips, splats and bridges are OFF (they would
//                 float off the drawing) and the cloud keeps its last map; when it stops they are recomputed and appear.
//   exports       always computed for the exported frame (every frame of a GIF / sequence); thresholds reuse the live
//                 ones when they match, so an animation does not flicker.
// «Still» looks at the camera only (position, rotation, optics, the Move gizmo): the wiggle of the lines and the particles
// do not count, or the maps would never appear with Stop Motion on.

import type { Shape, SuperRisoSettings, StencilSettings } from '../../../../types/strataTypes';
import { STENCIL_SPRAYS, STENCIL_TONES } from '../../../../constants/superRisoStencil';
import { hex2rgb, oklab, type RGB } from './inks';
import { xPool } from './xeroxMarkers';
import { stencilTones, stencilMaps, type StencilLayer, type StencilMaps, type StencilMapOpts } from './stencilCpu';
import type { StencilEngineParams } from './stencilParams';

const THROTTLE_MS = 300;
/** Camera still this long (ms) before the maps count as «at rest». Below quality.STILL_MS, so a refined frame (preview
 *  devices) is always taken after they were requested. */
const REST_MS = 200;

const opFor = (h: string) => oklab(hex2rgb(h))[0] < .3 ? .995 : .97;
export function nearestSpray(h: string): string {
	const L = oklab(hex2rgb(h)); let best = STENCIL_SPRAYS[0][1], bd = 1e9;
	for (const [, m] of STENCIL_SPRAYS) { const M = oklab(hex2rgb(m)); const d = Math.hypot(L[0] - M[0], 2 * (L[1] - M[1]), 2 * (L[2] - M[2])); if (d < bd) { bd = d; best = m; } }
	return best;
}
/** The source paper is only normalised when it is light: with a dark or coloured background, the background is part of the template. */
export const stencilPaper = (srcPaper: RGB): RGB => oklab(srcPaper)[0] > .8 ? srcPaper : [1, 1, 1];

/** Lab sLayers: templates in painting order (light to dark; the accent last); the last 3 paintable ones get a drip channel. */
export function stencilLayers(s: StencilSettings, pool: string[], tones: (n: number) => number[]): { layers: StencilLayer[]; accKey: string | null } {
	const sh = (s.dark - .5) * .5, cl = (v: number) => Math.max(.03, Math.min(.95, v)); let L: StencilLayer[] = [], accKey: string | null = null;
	if (s.mode === 'tone') {
		const n = s.n; const base = tones(n);
		L = base.map((t, k) => ({ kind: 0, thr: cl(t - sh), hex: STENCIL_TONES[n][k] }));
		if (s.accent && pool.length) { accKey = pool[0]; L.push({ kind: 3, hex: s.colors === 'own' ? pool[0] : nearestSpray(pool[0]) }); }
	} else {
		const ks = pool.slice(0, s.n).sort((a, b) => oklab(hex2rgb(b))[0] - oklab(hex2rgb(a))[0]);
		L = ks.map(h => ({ kind: 1, key: h, hex: s.colors === 'own' ? h : nearestSpray(h) }));
		L.push({ kind: 2, thr: cl(Math.max(.5, tones(2)[1]) - sh), hex: '#161616' });
	}
	if (s.manual.length === L.length) L.forEach((l, i) => { l.hex = s.manual[i]; });
	L.forEach(l => { l.op = opFor(l.hex); });
	const paint = L.map((_, i) => i).filter(i => L[i].kind !== 3).slice(-3); paint.forEach((i, c) => { L[i].ch = c; });
	return { layers: L, accKey };
}

// ── Thresholds ────────────────────────────────────────────────────────────────────────────────
const tonesCache = new Map<string, number[]>();
/** What the cached thresholds were measured on (live): the scene, the camera and when. */
let tonesOf: { scene: unknown; cam: number[] | null; at: number } | null = null;

// ── Rest detection (camera only: motion indices 0–6 and 9) ──────────────────────────────────────
type Sig = readonly number[] | undefined;
let lastCam: number[] | null = null, camSince = 0;
const camOf = (m: Sig) => m ? [...m.slice(0, 7), m[9] ?? 0] : null;
function atRest(motion: Sig, now: number): boolean {
	const c = camOf(motion);
	if (!c || !lastCam || c.length !== lastCam.length || c.some((v, i) => v !== lastCam![i])) { lastCam = c; camSince = now; }
	return !!c && now - camSince >= REST_MS;
}

// ── Maps ──────────────────────────────────────────────────────────────────────────────────────
let live: { key: string; maps: StencilMaps; at: number; cam: number[] | null; scene: unknown } | null = null;
let moving: { src: StencilMaps; maps: StencilMaps } | null = null;
let job = false, version = 0;
const stage = document.createElement('canvas');
const idle = (cb: () => void) => { if (typeof requestIdleCallback === 'function') requestIdleCallback(cb, { timeout: THROTTLE_MS }); else setTimeout(cb, 0); };
export const stencilMapsVersion = (): number => version;

export type StencilFrame = { s: StencilSettings; settings: SuperRisoSettings; shapes: readonly Shape[]; hidden: readonly number[]; srcPaper: RGB; darkBase: string | null;
	isLive: boolean; motion?: readonly number[]; scene?: unknown };

/**
 * Called right after the frame was flattened (`flat` holds it): the layers, the CPU maps and what the engine needs.
 * b: the panel → parameters mapping (stencilParams), for the map inputs. seedMaps: the maps' seed (fixed: the reprint
 * changes the GPU seed per tick, never the CPU maps).
 */
export function stencilFrame(fr: StencilFrame, flat: HTMLCanvasElement, b: Partial<StencilEngineParams>, seedMaps: number):
	{ layers: StencilLayer[]; accKey: string | null; maps: StencilMaps | null; srcPaper: RGB } {
	const sp = stencilPaper(fr.srcPaper), now = performance.now();
	const still = fr.isLive ? atRest(fr.motion, now) : true;
	const pool = xPool(fr.settings, fr.shapes, fr.hidden, fr.srcPaper, fr.darkBase);
	if (fr.isLive && still) {
		const cam = camOf(fr.motion);
		const moved = !tonesOf || tonesOf.scene !== fr.scene || !cam || !tonesOf.cam || cam.some((v, i) => v !== tonesOf!.cam![i]);
		if (moved && (!tonesOf || now - tonesOf.at >= THROTTLE_MS)) { tonesCache.clear(); tonesOf = { scene: fr.scene, cam, at: now }; }
	}
	const tones = (n: number) => {
		const k = `${n}|${sp.join(',')}`; let t = tonesCache.get(k);
		if (!t) { t = stencilTones(flat, sp, n); tonesCache.set(k, t); }
		return t;
	};
	const { layers, accKey } = stencilLayers(fr.s, pool, tones);
	const o: StencilMapOpts = {
		layers, accKey, cut: b.cut!, bridges: !!b.bridges, bridgeMm: b.bridgeMm!, drips: b.drips!, dripLen: b.dripLen!, dripW: b.dripW!,
		splat: b.splat!, splatSize: b.splatSize!, cloud: b.cloud!, cloudMm: b.cloudMm!, seed: seedMaps, printW: b.printW!, srcPaper: sp,
	};
	if (!fr.isLive) return { layers, accKey, maps: stencilMaps(flat, o), srcPaper: sp };
	const key = JSON.stringify([layers.map(l => [l.kind, l.thr, l.key, l.ch]), accKey, o.cut, o.bridges, o.drips, o.splat, o.cloud, seedMaps, o.printW, sp]);
	const cam = camOf(fr.motion);
	const stale = !live || live.key !== key || live.scene !== fr.scene || !cam || !live.cam || cam.some((v, i) => v !== live!.cam![i]);
	// At rest: refresh whatever is stale. Moving: only when there are no maps yet or their inputs changed (the cloud needs
	// one; drips, splats and bridges stay off until the camera stops).
	if (stale && (still || !live || live.key !== key) && !job && (!live || now - live.at >= THROTTLE_MS)) {
		// The flatten canvas is overwritten next frame: copy it now at map size, compute when the main thread is idle.
		const sc = Math.min(1, 1024 / Math.max(flat.width, flat.height)), w = Math.max(8, Math.round(flat.width * sc)), h = Math.max(8, Math.round(flat.height * sc));
		if (stage.width !== w || stage.height !== h) { stage.width = w; stage.height = h; }
		stage.getContext('2d')!.drawImage(flat, 0, 0, w, h);
		job = true; const scene = fr.scene;
		if (live) live.at = now;
		idle(() => {
			job = false;
			live = { key, maps: stencilMaps(stage, o), at: performance.now(), cam, scene };
			version++;
		});
	}
	if (!live) return { layers, accKey, maps: null, srcPaper: sp };
	if (still && !stale) return { layers, accKey, maps: live.maps, srcPaper: sp };
	// Moving (or the maps are being redone): no drips, splats nor bridges; the cloud keeps its last map.
	if (!moving || moving.src !== live.maps) { moving = { src: live.maps, maps: { drip: null, bridge: null, cloud: live.maps.cloud } }; version++; }
	return { layers, accKey, maps: moving.maps, srcPaper: sp };
}
