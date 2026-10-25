// Super Riso · Stencil — CPU side, ported 1:1 from the lab v14 (engine.studio.js): the spray field texture, the
// automatic tone thresholds (multilevel Otsu) and the whole-image maps (drips and splats, bridges, cloud).
// All of it is EXPENSIVE: never per live frame (policy in stencilScene.ts).

import { oklab, hex2rgb, lin, rng, type RGB } from './inks';

const s2l = (v: number) => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const l2s = (x: number) => x <= .0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - .055;

/** One stencil layer, in painting order. kind: 0 tone, 1 colour zone, 2 black, 3 accent. ch: drip/bridge channel (≤ 3). */
export type StencilLayer = { kind: number; thr?: number; key?: string; hex: string; op?: number; ch?: number };
export type StencilMaps = { drip: HTMLCanvasElement | null; bridge: HTMLCanvasElement | null; cloud: HTMLCanvasElement | null };

// Spray field: each texel holds when the first droplet reaches it (0–1, equalised: coverage = load). Log-normal droplet
// sizes (fine + a few big ones), no grid; it repeats every 61 mm and is rotated per layer. Generated ONCE per session.
let field: HTMLCanvasElement | null = null;
export const SPRAY_N = 2048;
export function sprayField(): HTMLCanvasElement {
	if (field) return field;
	const N = SPRAY_N, T = new Float32Array(N * N).fill(2), R = rng(7);
	const nrm = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * R()); };
	let area = 0; const target = 4.6 * N * N;
	while (area < target) {
		const big = R() < .07; const r = Math.min(16, Math.max(.6, (big ? 5.5 : 2.6) * Math.exp(.45 * nrm()))); const t = R();
		const cx = R() * N, cy = R() * N, ix = Math.floor(cx), iy = Math.floor(cy), ri = Math.ceil(r), r2 = r * r;
		for (let dy = -ri; dy <= ri; dy++) {
			const fy = iy + dy + .5 - cy; if (fy * fy > r2) continue; const row = (((iy + dy) % N + N) % N) * N;
			for (let dx = -ri; dx <= ri; dx++) { const fx = ix + dx + .5 - cx; if (fx * fx + fy * fy > r2) continue; const i = row + (((ix + dx) % N + N) % N); if (t < T[i]) T[i] = t; }
		}
		area += Math.PI * r2;
	}
	const B = 4096, H = new Uint32Array(B); let cov = 0; for (let i = 0; i < N * N; i++) if (T[i] < 2) { H[Math.min(B - 1, (T[i] * B) | 0)]++; cov++; }
	const cdf = new Float32Array(B); let acc = 0; for (let b = 0; b < B; b++) { acc += H[b]; cdf[b] = acc / cov; }
	const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!; const im = x.createImageData(N, N);
	for (let i = 0; i < N * N; i++) { const v = T[i] < 2 ? cdf[Math.min(B - 1, (T[i] * B) | 0)] * .985 : 1; const b = Math.round(v * 255); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; }
	x.putImageData(im, 0, 0);
	field = c;
	return c;
}

function boxBlur(a: Float32Array, w: number, h: number, sig: number): Float32Array {
	if (sig < .5) return a;
	const r = Math.max(1, Math.round((Math.sqrt(4 * sig * sig + 1) - 1) / 2)); let A = a; const Bf = new Float32Array(a.length);
	for (let pass = 0; pass < 3; pass++) {
		for (let y = 0; y < h; y++) {
			let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += A[o + Math.min(w - 1, Math.max(0, x))];
			for (let x = 0; x < w; x++) { Bf[o + x] = s / (2 * r + 1); s += A[o + Math.min(w - 1, x + r + 1)] - A[o + Math.max(0, x - r)]; }
		}
		for (let x = 0; x < w; x++) {
			let s = 0; for (let y = -r; y <= r; y++) s += Bf[Math.min(h - 1, Math.max(0, y)) * w + x];
			for (let y = 0; y < h; y++) { A = (A === a ? new Float32Array(a.length) : A); A[y * w + x] = s / (2 * r + 1); s += Bf[Math.min(h - 1, y + r + 1) * w + x] - Bf[Math.max(0, y - r) * w + x]; }
		}
	}
	return A;
}

function vn2(x: number, y: number, s: number): number {
	const h = (i: number, j: number) => { let n = (i * 374761393 + j * 668265263 + s * 982451653) | 0; n = (n ^ (n >>> 13)) * 1274126177 | 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
	const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
	return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
}

/** «Ink» of each pixel at ≤ 256 px: darkness + saturation, after normalising the source paper. */
function inkSample(src: HTMLCanvasElement, srcPaper: RGB) {
	const sc = Math.min(1, 256 / Math.max(src.width, src.height)), w = Math.max(4, Math.round(src.width * sc)), h = Math.max(4, Math.round(src.height * sc));
	const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true })!; x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h);
	return { D: x.getImageData(0, 0, w, h).data, w, h, sp: lin(srcPaper).map(v => Math.max(v, .02)) };
}

// Automatic template thresholds: 1D clustering of the «ink» of the whole image (n layers → n + 1 groups). Separates figure
// and background whatever the background (white, black or coloured paper), as whoever cuts the template would.
// bg (v3.20.1): the scene's background colour (the one Diorame flattens under the drawing). Its pixels are left out of the
// histogram, so the thresholds are measured on the drawing alone (in light and dark mode); if less than 5 % would remain,
// the whole histogram is used.
const BG_DIST = .04;
export function stencilTones(src: HTMLCanvasElement, srcPaper: RGB, n: number, bg: RGB | null = null): number[] {
	const { D, w, h, sp } = inkSample(src, srcPaper), H = new Float64Array(256), Hall = new Float64Array(256);
	const BG = bg ? oklab(bg) : null; let kept = 0;
	for (let i = 0; i < w * h; i++) {
		const L = oklab([0, 1, 2].map(j => l2s(Math.min(1, s2l(D[i * 4 + j] / 255) / sp[j]))) as RGB); const d = Math.max(0, Math.min(1, 1 - L[0] + .3 * Math.hypot(L[1], L[2])));
		const b = Math.min(255, (d * 256) | 0); Hall[b]++;
		if (BG) { const R = oklab([D[i * 4] / 255, D[i * 4 + 1] / 255, D[i * 4 + 2] / 255]); if (Math.hypot(R[0] - BG[0], R[1] - BG[1], R[2] - BG[2]) < BG_DIST) continue; }
		H[b]++; kept++;
	}
	if (kept < w * h * .05) H.set(Hall);
	{ let tot = 0, ink = 0; for (let b = 0; b < 256; b++) { tot += H[b]; if (b >= 20) ink += H[b]; } if (ink > tot * .05) for (let b = 0; b < 20; b++) H[b] = 0; }   // the paper does not count: tones are spread inside the drawing
	// exact multilevel Otsu (64 levels): thresholds that maximise the between-class variance; a uniform background is not split in two
	const B = 64, P = new Float64Array(B); for (let b = 0; b < 256; b++) P[b >> 2] += H[b];
	const W = new Float64Array(B + 1), M = new Float64Array(B + 1); for (let b = 0; b < B; b++) { W[b + 1] = W[b] + P[b]; M[b + 1] = M[b] + P[b] * (b + .5) / B; }
	const cls = (i: number, j: number) => { const ww = W[j] - W[i]; return ww > 0 ? (M[j] - M[i]) * (M[j] - M[i]) / ww : 0; };   // group [i,j)
	let best = -1, bt: number[] = []; const t = new Array<number>(n).fill(0);
	const rec = (k: number, from: number, acc: number) => {
		if (k === n) { const v = acc + cls(from, B); if (v > best) { best = v; bt = t.slice(); } return; }
		for (let c = from + 1; c <= B - (n - k); c++) { t[k] = c; rec(k + 1, c, acc + cls(from, c)); }
	};
	rec(0, 0, 0);
	return bt.map(c => Math.max(.04, Math.min(.95, c / B)));
}

export type StencilMapOpts = {
	layers: StencilLayer[]; accKey: string | null; cut: number; bridges: boolean; bridgeMm: number; drips: number; dripLen: number; dripW: number;
	splat: number; splatSize: number; cloud: number; cloudMm: number; seed: number; printW: number; srcPaper: RGB;
};

// Whole-image maps (normalised coordinates; independent of the render resolution):
//  drip:   drips and splats (channel R/G/B = layer slot), high resolution
//  bridge: template bridges (same channel layout)
//  cloud:  freehand cloud (density), low resolution
export function stencilMaps(src: HTMLCanvasElement, o: StencilMapOpts): StencilMaps {
	const printW = o.printW || 210, seed = o.seed | 0, R = rng(seed * 7919 + 5), layers = o.layers || [];
	const nrm = () => { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * R()); };
	const W0 = src.width, H0 = src.height, sc = Math.min(1, 1024 / Math.max(W0, H0)), w = Math.max(8, Math.round(W0 * sc)), h = Math.max(8, Math.round(H0 * sc)), N = w * h;
	const mmPx = printW / w;
	const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const cx = cv.getContext('2d', { willReadFrequently: true })!; cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(src, 0, 0, w, h);
	const D = cx.getImageData(0, 0, w, h).data; const sp = lin(o.srcPaper || [1, 1, 1]).map(v => Math.max(v, .02));
	const Lab = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const c = [0, 1, 2].map(j => l2s(Math.min(1, s2l(D[i * 4 + j] / 255) / sp[j]))) as RGB; const L = oklab(c); Lab[i * 3] = L[0]; Lab[i * 3 + 1] = L[1]; Lab[i * 3 + 2] = L[2]; }
	const kd = (i: number, K: RGB) => { const e0 = (K[0] - Lab[i * 3]) * .6, e1 = K[1] - Lab[i * 3 + 1], e2 = K[2] - Lab[i * 3 + 2]; return e0 * e0 + e1 * e1 + e2 * e2; };
	const sig = Math.max(.3, (o.cut || 1) * .5 / mmPx);
	const dark = new Float32Array(N); for (let i = 0; i < N; i++) dark[i] = Math.max(0, Math.min(1, 1 - Lab[i * 3] + .3 * Math.hypot(Lab[i * 3 + 1], Lab[i * 3 + 2])));
	const darkB = boxBlur(dark, w, h, sig);
	const acc = o.accKey ? oklab(hex2rgb(o.accKey)) : null; let accB: Float32Array | null = null;
	if (acc) { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = (kd(i, acc) < .045 && Math.hypot(Lab[i * 3 + 1], Lab[i * 3 + 2]) > .06) ? 1 : 0; accB = boxBlur(a, w, h, sig); }
	const keys = layers.map(l => l.kind === 1 && l.key ? oklab(hex2rgb(l.key)) : null);
	const M = layers.map((l, k) => {
		const m = new Uint8Array(N);
		if (l.kind === 3) { if (accB) for (let i = 0; i < N; i++) m[i] = accB[i] > .5 ? 1 : 0; return m; }
		if (l.kind === 1) {
			const a = new Float32Array(N), K = keys[k]!, kc = Math.hypot(K[1], K[2]);
			for (let i = 0; i < N; i++) {
				const dk = kd(i, K); if (dk > .06) continue; if (kc > .06 && Math.hypot(Lab[i * 3 + 1], Lab[i * 3 + 2]) < .5 * kc) continue;
				let ok = true; for (let j = 0; j < keys.length; j++) if (j !== k && keys[j] && kd(i, keys[j]!) < dk) { ok = false; break; } a[i] = ok ? 1 : 0;
			}
			const b = boxBlur(a, w, h, sig); for (let i = 0; i < N; i++) m[i] = b[i] > .5 ? 1 : 0; return m;
		}
		for (let i = 0; i < N; i++) m[i] = (darkB[i] > l.thr! && !(accB && accB[i] > .5)) ? 1 : 0; return m;
	});
	// high-resolution canvas for drips, splats and bridges
	const hs = 3072 / Math.max(w, h); const HW = Math.round(w * hs), HH = Math.round(h * hs), pxmm = HW / printW;
	const mk = (): [HTMLCanvasElement, CanvasRenderingContext2D] => { const c = document.createElement('canvas'); c.width = HW; c.height = HH; const x = c.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, HW, HH); x.globalCompositeOperation = 'lighter'; return [c, x]; };
	const CH = ['#ff0000', '#00ff00', '#0000ff'];
	let bridge: HTMLCanvasElement | null = null;
	if (o.bridges) {
		const [bc, bx] = mk(); bridge = bc; const bw = (o.bridgeMm || .9) * pxmm; bx.lineCap = 'butt';
		const comp = new Int32Array(N), stack = new Int32Array(N), stamp = new Int32Array(N).fill(-1), par = new Int32Array(N), dist = new Int32Array(N);
		layers.forEach((l, k) => {
			if (l.ch == null || l.ch < 0) return; const m = M[k]; comp.fill(-1); let nc = 0; const isl: [number, number[]][] = [];
			for (let s0 = 0; s0 < N; s0++) {
				if (m[s0] || comp[s0] >= 0) continue; let sp2 = 0; stack[sp2++] = s0; comp[s0] = nc; const mem: number[] = []; let edge = false;
				while (sp2) {
					const p = stack[--sp2]; mem.push(p); const px = p % w, py = (p / w) | 0; if (px === 0 || py === 0 || px === w - 1 || py === h - 1) edge = true;
					if (px > 0 && !m[p - 1] && comp[p - 1] < 0) { comp[p - 1] = nc; stack[sp2++] = p - 1; } if (px < w - 1 && !m[p + 1] && comp[p + 1] < 0) { comp[p + 1] = nc; stack[sp2++] = p + 1; }
					if (py > 0 && !m[p - w] && comp[p - w] < 0) { comp[p - w] = nc; stack[sp2++] = p - w; } if (py < h - 1 && !m[p + w] && comp[p + w] < 0) { comp[p + w] = nc; stack[sp2++] = p + w; }
				}
				if (!edge && mem.length * mmPx * mmPx >= .6) isl.push([nc, mem]); nc++;
			}
			bx.strokeStyle = CH[l.ch]; bx.lineWidth = bw; const maxD = Math.round(12 / mmPx); let sid = 0;
			for (const [cid, mem] of isl.slice(0, 600)) {
				const areaMm = mem.length * mmPx * mmPx; const nb = areaMm < 40 ? 1 : areaMm < 400 ? 2 : 3; const starts: number[] = [];
				const bnd = mem.filter(p => { const px = p % w; return (px > 0 && m[p - 1]) || (px < w - 1 && m[p + 1]) || m[p - w] || m[p + w]; });
				const exclR = Math.sqrt(mem.length) * .75;
				for (let b = 0; b < nb; b++) {
					sid++; const q: number[] = []; let qh = 0;
					for (const p of bnd) { if (starts.some(s => Math.hypot(s % w - p % w, ((s / w) | 0) - ((p / w) | 0)) < exclR)) continue; stamp[p] = sid; par[p] = -1; dist[p] = 0; q.push(p); }
					let hit = -1;
					while (qh < q.length) {
						const p = q[qh++]; const px = p % w, py = (p / w) | 0; if (dist[p] > maxD) break;
						for (const n of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1]) {
							if (n < 0 || stamp[n] === sid) continue;
							if (!m[n]) { if (comp[n] !== cid) { par[n] = p; hit = n; break; } continue; }
							stamp[n] = sid; par[n] = p; dist[n] = dist[p] + 1; q.push(n);
						}
						if (hit >= 0) break;
					}
					if (hit < 0) break; let a = hit; while (par[a] >= 0 && m[par[a]]) a = par[a]; const st0 = par[a] >= 0 ? par[a] : a;
					starts.push(st0);
					const x0 = (st0 % w + .5) / w * HW, y0 = (((st0 / w) | 0) + .5) / h * HH, x1 = (hit % w + .5) / w * HW, y1 = (((hit / w) | 0) + .5) / h * HH; const L = Math.hypot(x1 - x0, y1 - y0) || 1, ex = (x1 - x0) / L * .5 * pxmm, ey = (y1 - y0) / L * .5 * pxmm;
					bx.beginPath(); bx.moveTo(x0 - ex, y0 - ey); bx.lineTo(x1 + ex, y1 + ey); bx.stroke();
				}
			}
		});
	}
	// drips: born on the lower edge of the most loaded zones, hanging down
	const [dc, dx] = mk(); const area = printW * printW * h / w;
	const dripLen = o.dripLen || 8, dripW = o.dripW || .9, drips = o.drips || 0, splat = o.splat || 0;
	const slots = layers.map((l, k) => [l, k] as const).filter(([l]) => l.ch != null && l.ch >= 0);
	slots.forEach(([l, k], si) => {
		if (drips <= 0) return; const m = M[k]; const edges: number[] = [];
		for (let i = 0; i < N - w; i++) if (m[i] && !m[i + w]) edges.push(i);
		const wk = .35 + .65 * (si + 1) / slots.length; const n = Math.min(260, Math.round(drips * edges.length * mmPx * .06 * wk)); if (!edges.length) return;
		dx.fillStyle = CH[l.ch!]; let made = 0, tries = 0;
		while (made < n && tries < n * 8) {
			tries++; const e = edges[(R() * edges.length) | 0]; const ex = e % w, ey = (e / w) | 0;
			if (R() > .15 + vn2(ex * mmPx / 14, ey * mmPx / 14, seed + k * 31)) continue; made++;
			let len = dripLen * Math.exp(.75 * nrm()); if (R() < .25) len *= .25; len = Math.max(.8, Math.min(150, len));
			const w0 = dripW * (.55 + .9 * R()) * (.7 + .3 * Math.min(1, len / 10));
			const x0 = (ex + R()) * mmPx, y0 = (ey + 1) * mmPx - (.3 + R() * 1.2), drift = (R() - .5) * .8, wob = .06 + R() * .12, wl = 2 + R() * 4, ph = R() * 6.28;
			dx.beginPath(); const step = Math.max(.04, w0 * .18);
			let X = x0, Y = y0, r = w0 / 2;
			for (let t = 0; t <= 1.0001; t += step / len) {
				Y = y0 + t * len; X = x0 + drift * t + wob * Math.sin(t * len / wl + ph); r = w0 / 2 * (1 - .45 * t) * (t < .08 ? 1 + (.08 - t) / .08 * .6 : 1);
				const rp = Math.max(.6, r * pxmm); dx.moveTo(X * pxmm + rp, Y * pxmm); dx.arc(X * pxmm, Y * pxmm, rp, 0, 6.2832);
			}
			const rb = r * (1.45 + .6 * R()); dx.moveTo(X * pxmm + rb * pxmm, (Y + rb * .4) * pxmm); dx.arc(X * pxmm, (Y + rb * .4) * pxmm, Math.max(.7, rb * pxmm), 0, 6.2832); dx.fill();
		}
	});
	// splats: big drops with satellites (a nozzle that spits, a shaken can)
	if (splat > 0 && slots.length) {
		const top = slots[slots.length - 1]; const tm = M[top[1]]; const painted: number[] = []; for (let i = 0; i < N; i += 3) if (tm[i]) painted.push(i);
		const n = Math.min(900, Math.round(splat * 220 * area / 62370)); const ss = o.splatSize || .8;
		for (let j = 0; j < n; j++) {
			const L = R() < .75 ? top : slots[(R() * slots.length) | 0]; dx.fillStyle = CH[L[0].ch!];
			let X: number, Y: number;
			if (painted.length && R() < .65) { const p = painted[(R() * painted.length) | 0]; X = (p % w + .5) * mmPx + nrm() * 22; Y = (((p / w) | 0) + .5) * mmPx + nrm() * 22; } else { X = R() * printW; Y = R() * printW * h / w; }
			const r = Math.max(.06, Math.min(4.5, ss * .5 * Math.exp(.8 * nrm()))); dx.beginPath();
			if (R() < .12) { const a = R() * 6.28; dx.ellipse(X * pxmm, Y * pxmm, r * pxmm * 2.4, r * pxmm * .8, a, 0, 6.2832); } else dx.arc(X * pxmm, Y * pxmm, Math.max(.6, r * pxmm), 0, 6.2832);
			if (R() < .45) {
				const ms = 2 + ((R() * 6) | 0), dir = R() * 6.28;
				for (let q = 0; q < ms; q++) {
					const dd = r * (1.3 + R() * 2.6), a = dir + (R() - .5) * 1.3, rr = Math.max(.04, r * (.1 + R() * .3));
					const qx = (X + Math.cos(a) * dd) * pxmm, qy = (Y + Math.sin(a) * dd) * pxmm; dx.moveTo(qx + rr * pxmm, qy); dx.arc(qx, qy, Math.max(.5, rr * pxmm), 0, 6.2832);
				}
			}
			dx.fill();
		}
	}
	// cloud: soft density around everything painted (the freehand spray halo behind)
	let cloud: HTMLCanvasElement | null = null;
	if (o.cloud) {
		const f = 4, lw = Math.ceil(w / f), lh = Math.ceil(h / f); const U = new Float32Array(lw * lh);
		for (let i = 0; i < N; i++) { let on = 0; for (const m of M) if (m[i]) { on = 1; break; } if (on) { const j = ((i / w | 0) / f | 0) * lw + ((i % w) / f | 0); U[j] = 1; } }
		const b = boxBlur(U, lw, lh, (o.cloudMm || 18) / (mmPx * f)); let mx = 0; for (const v of b) mx = Math.max(mx, v);
		cloud = document.createElement('canvas'); cloud.width = lw; cloud.height = lh; const x = cloud.getContext('2d')!; const im = x.createImageData(lw, lh);
		for (let i = 0; i < lw * lh; i++) { const v = Math.min(1, b[i] / (mx * .55 + 1e-6)); im.data[i * 4] = Math.round(255 * Math.pow(v, .8)); im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0);
	}
	return { drip: dc, bridge, cloud };
}
