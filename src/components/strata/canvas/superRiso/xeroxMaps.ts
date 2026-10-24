// Super Riso · Fotocopia — zone maps on the CPU (low resolution, whole frame). Ported 1:1 from the lab
// (engine.studio.js regionMaps):
//   ids  which marker paints each zone (only in "white gaps": the zones closed by the line, as a person colours)
//   ori  stroke direction per colour patch (principal axis), to colour along elongated shapes
// They are EXPENSIVE (getImageData + flood fills): never per live frame. Policy (xeroxMaps below):
//   export   computed synchronously from the export frame, every frame (GIF / sequence included).
//   live     computed at once when what they depend on changes (markers, mode, gaps, seed); otherwise the last result
//            is reused and refreshed at most every THROTTLE_MS, only if the image changed, in an idle callback from a
//            copy of the frame. Colour itself is identified in the XID shader each frame: only orientation and gaps lag.
// version(): bumps with every new live result; frame.ts puts it in the key so held / refined frames pick it up.

import type { XeroxSettings } from '../../../../types/strataTypes';
import { oklab, hex2rgb, rng, type RGB } from './inks';
import type { XeroxMarkers } from './xeroxMarkers';

export type XeroxMaps = { ori: HTMLCanvasElement; ids: HTMLCanvasElement | null };
type MapOpts = { keys: string[]; srcPaper: RGB; fill: boolean; nk: number; cover: number; seed: number };

const mapSize = (W0: number, H0: number, fill: boolean): [number, number] => {
	const maxSide = fill ? 1024 : 560, sc = Math.min(1, maxSide / Math.max(W0, H0));
	return [Math.max(8, Math.round(W0 * sc)), Math.max(8, Math.round(H0 * sc))];
};

function regionMaps(src: HTMLCanvasElement, { keys, srcPaper, fill, nk, cover, seed }: MapOpts): XeroxMaps {
	const [w, h] = mapSize(src.width, src.height, fill);
	const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true })!; x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h);
	const d = x.getImageData(0, 0, w, h).data; const P = oklab(srcPaper);
	const id = new Int8Array(w * h).fill(-1), N = w * h;
	if (!fill) {
		const MK = keys.map(hx => oklab(hex2rgb(hx)));
		for (let i = 0; i < N; i++) {
			const L = oklab([d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255]); const dp = Math.hypot(L[0] - P[0], L[1] - P[1], L[2] - P[2]), ch = Math.hypot(L[1], L[2]);
			if (!(dp > .08 && (L[0] > .32 || ch > .12))) continue; let bi = -1, bd = 1e9;
			for (let k = 0; k < MK.length; k++) { const e0 = (MK[k][0] - L[0]) * .6, e1 = MK[k][1] - L[1], e2 = MK[k][2] - L[2]; const dd = e0 * e0 + e1 * e1 + e2 * e2; if (dd < bd) { bd = dd; bi = k; } }
			if (bd < .045) id[i] = bi;
		}
	} else {
		// line = everything clearly darker than the paper; grown 1 px to close small gaps in the stroke
		const line = new Uint8Array(N); for (let i = 0; i < N; i++) { const L = oklab([d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255]); line[i] = (P[0] - L[0]) > .14 ? 1 : 0; }
		const ln = new Uint8Array(line); for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
			if (!line[py * w + px]) continue; const i = py * w + px;
			if (px > 0) ln[i - 1] = 1; if (px < w - 1) ln[i + 1] = 1; if (py > 0) ln[i - w] = 1; if (py < h - 1) ln[i + w] = 1;
		}
		const comp = new Int32Array(N).fill(-1), stack = new Int32Array(N); const R = rng((seed | 0) * 977 + 13); let nc = 0;
		const minA = Math.max(6, N * .00012);
		for (let s0 = 0; s0 < N; s0++) {
			if (ln[s0] || comp[s0] >= 0) continue; let sp = 0; stack[sp++] = s0; comp[s0] = nc; const mem: number[] = []; let edge = false;
			while (sp) {
				const p = stack[--sp]; mem.push(p); const px = p % w, py = (p / w) | 0; if (px === 0 || py === 0 || px === w - 1 || py === h - 1) edge = true;
				if (px > 0 && !ln[p - 1] && comp[p - 1] < 0) { comp[p - 1] = nc; stack[sp++] = p - 1; } if (px < w - 1 && !ln[p + 1] && comp[p + 1] < 0) { comp[p + 1] = nc; stack[sp++] = p + 1; }
				if (py > 0 && !ln[p - w] && comp[p - w] < 0) { comp[p - w] = nc; stack[sp++] = p - w; } if (py < h - 1 && !ln[p + w] && comp[p + w] < 0) { comp[p + w] = nc; stack[sp++] = p + w; }
			}
			nc++; const r1 = R(), r2 = R();
			if (mem.length < minA) continue;                       // crumbs between lines: nobody colours them
			if (edge && mem.length > N * .05) continue;            // the open background (touching the border) stays white
			if (r1 > cover) continue;                              // not everything gets coloured: it is chosen
			const k = Math.min(nk - 1, Math.floor(r2 * nk)); for (const p of mem) id[p] = k;
		}
		// the colour goes under the line (the toner covers it): no white slits between colour and line
		for (let it = 0; it < 3; it++) {
			const prev = new Int8Array(id);
			for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
				const i = py * w + px; if (prev[i] >= 0 || !ln[i]) continue;
				const v = px > 0 && prev[i - 1] >= 0 ? prev[i - 1] : px < w - 1 && prev[i + 1] >= 0 ? prev[i + 1] : py > 0 && prev[i - w] >= 0 ? prev[i - w] : py < h - 1 && prev[i + w] >= 0 ? prev[i + w] : -1;
				if (v >= 0) id[i] = v;
			}
		}
	}
	let ids: HTMLCanvasElement | null = null;
	if (fill) {
		ids = document.createElement('canvas'); ids.width = w; ids.height = h; const ix = ids.getContext('2d')!; const im = ix.createImageData(w, h);
		for (let i = 0; i < N; i++) { im.data[i * 4] = (id[i] + 1) * 36; im.data[i * 4 + 3] = 255; } ix.putImageData(im, 0, 0);
	}
	const lab = new Int32Array(N).fill(-1), out = x.createImageData(w, h), stack = new Int32Array(N);
	for (let i = 0; i < N; i++) { out.data[i * 4] = 255; out.data[i * 4 + 1] = 128; out.data[i * 4 + 2] = 0; out.data[i * 4 + 3] = 255; }
	let nl = 0;
	for (let s0 = 0; s0 < N; s0++) {
		if (id[s0] < 0 || lab[s0] >= 0) continue; const col = id[s0]; let sp = 0; stack[sp++] = s0; lab[s0] = nl; const mem: number[] = [];
		let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
		while (sp) {
			const p = stack[--sp]; mem.push(p); const px = p % w, py = (p / w) | 0; n++; sx += px; sy += py; sxx += px * px; syy += py * py; sxy += px * py;
			if (px > 0 && id[p - 1] === col && lab[p - 1] < 0) { lab[p - 1] = nl; stack[sp++] = p - 1; } if (px < w - 1 && id[p + 1] === col && lab[p + 1] < 0) { lab[p + 1] = nl; stack[sp++] = p + 1; }
			if (py > 0 && id[p - w] === col && lab[p - w] < 0) { lab[p - w] = nl; stack[sp++] = p - w; } if (py < h - 1 && id[p + w] === col && lab[p + w] < 0) { lab[p + w] = nl; stack[sp++] = p + w; }
		}
		nl++; if (n < 6) continue;
		const mx = sx / n, my = sy / n, cxx = sxx / n - mx * mx, cyy = syy / n - my * my, cxy = sxy / n - mx * my;
		const th = .5 * Math.atan2(2 * cxy, cxx - cyy); const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
		const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc); const asp = Math.sqrt(l2 / l1);          // 1 = round, 0 = a line
		const wAl = Math.max(0, Math.min(1, (.62 - asp) / .3));
		const Rr = Math.round(127.5 + 127.5 * Math.cos(2 * th)), G = Math.round(127.5 + 127.5 * Math.sin(2 * th)), B = Math.round(255 * wAl);
		for (const p of mem) { out.data[p * 4] = Rr; out.data[p * 4 + 1] = G; out.data[p * 4 + 2] = B; }
	}
	// patches grow 2 px so strokes that leave the edge keep their patch's direction
	const o2 = new Uint8ClampedArray(out.data);
	for (let it = 0; it < 2; it++) {
		const src2 = new Uint8ClampedArray(o2);
		for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
			const i = py * w + px; if (src2[i * 4 + 2] > 0) continue;
			for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
				const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue; const j = qy * w + qx;
				if (src2[j * 4 + 2] > 0) { o2[i * 4] = src2[j * 4]; o2[i * 4 + 1] = src2[j * 4 + 1]; o2[i * 4 + 2] = src2[j * 4 + 2]; break; }
			}
		}
	}
	out.data.set(o2); x.putImageData(out, 0, 0); return { ori: c, ids };
}

// ── Live policy ────────────────────────────────────────────────────────────────────────────────
const THROTTLE_MS = 300;
type Sig = { motion: readonly number[] | undefined; scene: unknown };
let live: { key: string; maps: XeroxMaps; at: number; sig: Sig } | null = null;
let version = 0;
let job = false;
const stage = document.createElement('canvas');
const idle = (cb: () => void) => { if (typeof requestIdleCallback === 'function') requestIdleCallback(cb, { timeout: THROTTLE_MS }); else setTimeout(cb, 0); };
const sameSig = (a: Sig, b: Sig) => !!a.motion && !!b.motion && a.scene === b.scene && a.motion.length === b.motion.length && a.motion.every((v, i) => v === b.motion![i]);

export const xeroxMapsVersion = (): number => version;

/** flat: the frame flattened for the engine. motion / scene: live only (what moves the image, the state object). */
export function xeroxMaps(flat: HTMLCanvasElement, mk: XeroxMarkers, x: XeroxSettings, srcPaper: RGB, isLive: boolean, motion?: readonly number[], scene?: unknown): XeroxMaps {
	const fill = mk.what === 'fill';
	const o: MapOpts = { keys: fill ? [] : (mk.keys ?? mk.paint), srcPaper, fill, nk: mk.paint.length, cover: x.fillCover, seed: x.fillSeed };
	if (!isLive) return regionMaps(flat, o);
	const key = JSON.stringify([fill, o.keys, o.nk, fill ? o.cover : 0, fill ? o.seed : 0, srcPaper]);
	const now = performance.now(), sig: Sig = { motion: motion && [...motion], scene };
	if (!live || live.key !== key) {
		live = { key, maps: regionMaps(flat, o), at: now, sig };
		version++;
		return live.maps;
	}
	if (!job && now - live.at >= THROTTLE_MS && !sameSig(sig, live.sig)) {
		// The flatten canvas is overwritten next frame: copy it now at map size (a plain 2D draw), analyse it when idle.
		const [w, h] = mapSize(flat.width, flat.height, fill);
		if (stage.width !== w || stage.height !== h) { stage.width = w; stage.height = h; }
		stage.getContext('2d')!.drawImage(flat, 0, 0, w, h);
		job = true; live.at = now; live.sig = sig;
		idle(() => {
			job = false;
			if (!live || live.key !== key) return;
			live.maps = regionMaps(stage, o);
			version++;
		});
	}
	return live.maps;
}
