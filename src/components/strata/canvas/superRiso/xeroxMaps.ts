// Super Riso · Fotocopia — zone maps on the CPU (low resolution, whole frame). Ported 1:1 from the lab
// (engine.studio.js regionMaps):
//   ids  which marker paints each zone (only in "white gaps": the zones closed by the line, as a person colours)
//   ori  stroke direction per colour patch (principal axis), to colour along elongated shapes; since lab v23.18 one row per
//        marker at half resolution (the nearest patch of ITS colour, the next one and the distance to the seam between both)
// They are EXPENSIVE (getImageData + flood fills): never per live frame. Policy (xeroxMaps below):
//   export   computed synchronously from the export frame, every frame (GIF / sequence included).
//   live     computed at once when what they depend on changes (markers, mode, gaps, seed); otherwise the last result
//            is reused and refreshed at most every THROTTLE_MS, only if the image changed, in an idle callback from a
//            copy of the frame. Colour itself is identified in the XID shader each frame: only orientation and gaps lag.
// version(): bumps with every new live result; frame.ts puts it in the key so held / refined frames pick it up.

import type { XeroxSettings } from '../../../../types/strataTypes';
import { oklab, hex2rgb, rng, type RGB } from './inks';
import type { XeroxMarkers } from './xeroxMarkers';

/** The orientation map (lab v23.18): one row of 3 columns per marker; __srOriRows = rows (XCOLOR's uOriRows). */
export type OriMap = HTMLCanvasElement & { __srOriRows?: number };
export type XeroxMaps = { ori: OriMap; ids: HTMLCanvasElement | null };
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
	let nl = 0; const csz: number[] = [];
	for (let s0 = 0; s0 < N; s0++) {
		if (id[s0] < 0 || lab[s0] >= 0) continue; const col = id[s0]; let sp = 0; stack[sp++] = s0; lab[s0] = nl; const mem: number[] = [];
		let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
		while (sp) {
			const p = stack[--sp]; mem.push(p); const px = p % w, py = (p / w) | 0; n++; sx += px; sy += py; sxx += px * px; syy += py * py; sxy += px * py;
			if (px > 0 && id[p - 1] === col && lab[p - 1] < 0) { lab[p - 1] = nl; stack[sp++] = p - 1; } if (px < w - 1 && id[p + 1] === col && lab[p + 1] < 0) { lab[p + 1] = nl; stack[sp++] = p + 1; }
			if (py > 0 && id[p - w] === col && lab[p - w] < 0) { lab[p - w] = nl; stack[sp++] = p - w; } if (py < h - 1 && id[p + w] === col && lab[p + w] < 0) { lab[p + w] = nl; stack[sp++] = p + w; }
		}
		nl++; csz.push(n); if (n < 6) continue;
		const mx = sx / n, my = sy / n, cxx = sxx / n - mx * mx, cyy = syy / n - my * my, cxy = sxy / n - mx * my;
		const th = .5 * Math.atan2(2 * cxy, cxx - cyy); const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
		const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc); const asp = Math.sqrt(l2 / l1);          // 1 = round, 0 = a line
		const wAl = Math.max(0, Math.min(1, (.62 - asp) / .3));
		const Rr = Math.round(127.5 + 127.5 * Math.cos(2 * th)), G = Math.round(127.5 + 127.5 * Math.sin(2 * th)), B = Math.round(255 * wAl);
		for (const p of mem) { out.data[p * 4] = Rr; out.data[p * 4 + 1] = G; out.data[p * 4 + 2] = B; }
	}
	// Lab v23.18 · orientation PER COLOUR and without cells. It used to be one map (every patch of every colour, grown 2 px) read
	// with NEAREST: strokes that left their patch read the orientation of the neighbouring patch, of another colour or the default,
	// cell by cell (0.5 mm): a mosaic of blocks. Now, for each marker k, each texel carries the orientation of the nearest patch of
	// ITS colour (crumbs under ~0.04 % of the image inherit, they do not rule), and beside it the next nearest one and the distance
	// to the bisector between both: the shader decides the seam with that distance, interpolated, not with the grid. Canvas: 3
	// columns (mine, the other, distance in texels ×60) × nk rows (__srOriRows). At half resolution (≤ 280 texels): the seam does
	// not come from the cell but from the interpolated distance, and the map stays cheap. A texel is a seed if any of its 4 children is.
	const w2 = (w + 1) >> 1, h2 = (h + 1) >> 1, N2 = w2 * h2;
	const nkT = Math.max(1, Math.min(6, fill ? nk : keys.length)), minA = Math.max(6, Math.round(N * .0004));
	const T: OriMap = document.createElement('canvas'); T.width = 3 * w2; T.height = nkT * h2;
	const tx = T.getContext('2d')!, tim = tx.createImageData(3 * w2, nkT * h2), td = tim.data, DEF = (255 << 16) | (128 << 8);
	const cl = new Int32Array(N2), sx1 = new Int16Array(N2), sy1 = new Int16Array(N2), d1 = new Float32Array(N2), near = new Uint8Array(N2), nr2 = new Uint8Array(N2), M = 8;
	const t32 = new Uint32Array(td.buffer), pk = (v: number) => (255 << 24 | (v & 255) << 16 | (v >> 8 & 255) << 8 | v >> 16) >>> 0, DEFp = pk(DEF), D4 = (255 << 24 | 240) >>> 0;
	const bx0 = new Array<number>(nkT).fill(w2), bx1 = new Array<number>(nkT).fill(-1), by0 = new Array<number>(nkT).fill(h2), by1 = new Array<number>(nkT).fill(-1);
	for (let py = 0, i = 0; py < h; py++) for (let px = 0; px < w; px++, i++) {
		const k = id[i]; if (k < 0 || k >= nkT) continue; const qx = px >> 1, qy = py >> 1;
		if (qx < bx0[k]) bx0[k] = qx; if (qx > bx1[k]) bx1[k] = qx; if (qy < by0[k]) by0[k] = qy; if (qy > by1[k]) by1[k] = qy;
	}
	const ori = (i: number) => (out.data[i * 4] << 16) | (out.data[i * 4 + 1] << 8) | out.data[i * 4 + 2];
	for (let k = 0; k < nkT; k++) {
		// outside this marker's box (its texels + 8) it does not paint: default orientation, no seam
		for (let py = 0; py < h2; py++) { const r = (k * h2 + py) * 3 * w2; t32.fill(DEFp, r, r + 2 * w2); t32.fill(D4, r + 2 * w2, r + 3 * w2); }
		if (bx1[k] < 0) continue;
		const x0 = Math.max(0, bx0[k] - M), x1 = Math.min(w2 - 1, bx1[k] + M), y0 = Math.max(0, by0[k] - M), y1 = Math.min(h2 - 1, by1[k] + M); let any = false;
		for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
			const i = py * w2 + px; cl[i] = -1; d1[i] = 1e9; near[i] = 0;
			for (let c = 0; c < 4 && cl[i] < 0; c++) {
				const fx = 2 * px + (c & 1), fy = 2 * py + (c >> 1); if (fx >= w || fy >= h) continue; const j = fy * w + fx;
				if (id[j] === k && csz[lab[j]] >= minA) { cl[i] = ori(j); sx1[i] = px; sy1[i] = py; d1[i] = 0; any = true; }
			}
		}
		if (!any) continue;
		// the nearest patch (Euclidean distance to the seed texel, propagated in one forward and one backward sweep)
		const relax = (i: number, px: number, py: number, j: number) => {
			if (cl[j] < 0) return; const ex = px - sx1[j], ey = py - sy1[j], dd = ex * ex + ey * ey;
			if (dd < d1[i]) { d1[i] = dd; cl[i] = cl[j]; sx1[i] = sx1[j]; sy1[i] = sy1[j]; }
		};
		for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
			const i = py * w2 + px;
			if (px > x0) { relax(i, px, py, i - 1); if (py > y0) relax(i, px, py, i - w2 - 1); } if (py > y0) { relax(i, px, py, i - w2); if (px < x1) relax(i, px, py, i - w2 + 1); }
		}
		for (let py = y1; py >= y0; py--) for (let px = x1; px >= x0; px--) {
			const i = py * w2 + px;
			if (px < x1) { relax(i, px, py, i + 1); if (py < y1) relax(i, px, py, i + w2 + 1); } if (py < y1) { relax(i, px, py, i + w2); if (px > x0) relax(i, px, py, i + w2 - 1); }
		}
		// only the texels within 3 of a seam look for the other patch (label edge grown 3 texels, by rows and columns)
		for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
			const i = py * w2 + px;
			if ((px < x1 && cl[i + 1] !== cl[i]) || (py < y1 && cl[i + w2] !== cl[i])) { near[i] = 1; if (px < x1) near[i + 1] = 1; if (py < y1) near[i + w2] = 1; }
		}
		for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { let m = 0; for (let d = -3; d <= 3 && !m; d++) { const qx = px + d; if (qx >= x0 && qx <= x1) m = near[py * w2 + qx]; } nr2[py * w2 + px] = m; }
		for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) { let m = 0; for (let d = -3; d <= 3 && !m; d++) { const qy = py + d; if (qy >= y0 && qy <= y1) m = nr2[qy * w2 + px]; } near[py * w2 + px] = m; }
		for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
			const i = py * w2 + px, A = cl[i] >= 0 ? cl[i] : DEF;
			// the other nearest patch with ANOTHER orientation, among the neighbours up to 3 texels: distance to the bisector
			let B = A, sg = 4;
			if (near[i] && cl[i] >= 0) {
				let best = 1e9;
				for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
					const qx = px + dx, qy = py + dy; if (qx < x0 || qy < y0 || qx > x1 || qy > y1) continue; const j = qy * w2 + qx; if (cl[j] === A || cl[j] < 0) continue;
					const ax = sx1[i] - px, ay = sy1[i] - py, bx = sx1[j] - px, by = sy1[j] - py, ab = Math.hypot(sx1[j] - sx1[i], sy1[j] - sy1[i]);
					if (ab < 1e-3) continue; const dl = (bx * bx + by * by - ax * ax - ay * ay) / (2 * ab); if (dl < best) { best = dl; B = cl[j]; }
				}
				if (B !== A) sg = Math.min(4, Math.max(0, best));
			}
			const o = px + (k * h2 + py) * 3 * w2; t32[o] = pk(A); t32[o + w2] = pk(B); t32[o + 2 * w2] = (255 << 24 | Math.round(sg * 60)) >>> 0;
		}
	}
	tx.putImageData(tim, 0, 0); T.__srOriRows = nkT;
	return { ori: T, ids };
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
