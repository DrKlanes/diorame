// G1 · toner staircase guard of Super Riso › Fotocopia (v3.26.106), the Lab's G1 ported to the app.
//
//   await __g1Check()                 → { pass, limit: 12, worst, runs: [{ pan, J, edgePx }], canvas, sim }   (~15 s; WebGL2)
//   await __g1Check({ dpr: 2 })       the devicePixelRatio the live view sees (default 1.5: Fotocopia follows the DPR since v3.26.105)
//
// What it measures — the Lab's G1 (lab\tools\measure\guards\lib.mjs, stair(), copied verbatim below): along every black/light
// contour of the toner, the sub-pixel edge position per column (and per row); J = % of contour points whose second difference
// jumps > 0.25 px. An antialiased contour gives ~3 %; one decided per pixel keeps its steps. Limit 12 % (the Lab's: margin ×3.5
// over a 4× supersampled reference when it was calibrated). Lab v23.18: 6.0–6.2 %.
//
// How (CLAUDE.md: every visual guard of Super Riso is measured on the VISIBLE canvas, through the UI): the Lab's toner sheet
// (discs, oblique bars, wavy band; its two rings are left out — a Diorame blob has no hole) is written as a .dior with
// Super Riso › Fotocopia › «Flyer punk», Dirt 0 (specks touching a contour are real bumps, as in the Lab), Screen size .35,
// flat view; dropped on the window (the real drop handler, useFileDrop → the loader), «Cine» clicked, and the visible canvas
// read once it stops changing. Three pans of the sheet (0, 3.3, 7.1 units) stand in for the Lab's three seeds.
// Run it on a fresh page (no unsaved changes: the «unsaved changes» dialog would stop the drop) at a fixed viewport
// (1366×1024 is the reference; the panel of the built-in browser must be visible, or rAF stops).
//
// Calibration (2026-11-26, RTX 5070 Ti, 1366×1024, DPR 1.5): v3.26.104 FAILS 14.0–14.1 %; v3.26.105 PASSES 6.5 %.
// G2 (marker walls), G2 interno, G3 (zoom) and G4 (compile) exist only in the Lab (lab\tools\measure\guards).
(() => {
	const LIMIT = 12;
	const sleep = (ms) => new Promise(r => setTimeout(r, ms));
	const dynImport = new Function('u', 'return import(u)');
	const mod = (path) => { const hit = performance.getEntriesByType('resource').map(e => e.name).filter(n => n.split('?')[0].endsWith(path)).pop(); return dynImport(hit || path); };

	// ── the Lab's toner sheet (2400×1697 px) in world units, centred, 92 % of the canvas width
	function tonerShapes(W, pan) {
		const s = W * 0.92 / 2400, P = ([x, y]) => ({ x: (x - 1200) * s + pan, y: (y - 848) * s }), K = '#111111';
		const shape = (id, pts) => ({ id, color: K, zIndex: 0, points: pts.map(P), isEraser: false, isDrawInside: false, isDrawBehind: false });
		const ring = (cx, cy, r, n = 200) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
		const dense = (p, step) => p.flatMap((a, i) => { const b = p[(i + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); return Array.from({ length: n }, (_, j) => [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); });
		const bar = (x0, y0, L, th, ang) => { const a = ang * Math.PI / 180, c = Math.cos(a), si = Math.sin(a); return dense([[0, -th / 2], [L, -th / 2], [L, th / 2], [0, th / 2]].map(([u, v]) => [x0 + u * c - v * si, y0 + u * si + v * c]), 3); };
		const out = [];
		for (const [cx, cy, r] of [[420, 430, 300], [1010, 300, 170], [1010, 680, 110], [1400, 250, 60]]) out.push(shape('d' + cx, ring(cx, cy, r)));
		[[3, 60], [7, 30], [13, 60], [23, 16], [41, 60]].forEach(([a, th], i) => out.push(shape('b' + i, bar(150 + i * 30, 900 + i * 130, 1000, th, a))));
		[[87, 60], [83, 30], [77, 60], [67, 16]].forEach(([a, th], i) => out.push(shape('v' + i, bar(1450 + i * 230, 880, 720, th, a))));
		const top = [], bot = []; for (let px = 100; px < 1300; px += 3) { const y = 1600 + 40 * Math.sin(px / 90); top.push([px, y - 13]); bot.unshift([px, y + 13]); }
		out.push(shape('wave', [...top, ...bot]));
		return out;
	}
	async function diorFile(W, pan) {
		const K = await mod('/src/constants/superRiso.ts'), X = await mod('/src/constants/superRisoXerox.ts');
		const ex = await (await fetch('/examples/diorame_onboarding.dior')).json();
		const sr = K.sanitizeSuperRiso({ ...K.SUPER_RISO_DEFAULTS, technique: 'xerox', resolution: 0.85, reprintFps: 0,
			xerox: { ...X.applyXeroxStyle(X.XEROX_DEFAULTS, 'flyer'), dirt: 0, screenSize: 0.35 } });
		const dior = { shapes: tonerShapes(W, pan), palette: ex.palette, totalLayers: 1, isDarkMode: false,
			postProcessing: { ...ex.postProcessing, superRiso: sr }, postProcessingEnabled: { ...Object.fromEntries(Object.keys(ex.postProcessingEnabled).map(k => [k, false])), superRiso: true },
			fxMasterEnabled: true, cinematicType: 'flat', hiddenLayers: [], locked3DLayers: [], projectName: `g1-toner-${pan}` };
		return new File([JSON.stringify(dior)], `g1-toner-${pan}.dior`, { type: 'application/json' });
	}
	const buttonByText = (t) => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === t);
	async function dropFile(file) {
		const dt = new DataTransfer(); dt.items.add(file);
		for (const type of ['dragenter', 'dragover', 'drop']) window.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
	}
	async function until(fn, ms, what) { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(100); } throw new Error('timeout: ' + what); }
	// The visible canvas, once it stops changing (three equal reads 300 ms apart).
	async function settledCanvas(cv) {
		const read = () => cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height);
		const key = (im) => { let h = 0; for (let i = 0; i < im.data.length; i += 4093) h = (h * 31 + im.data[i]) | 0; return h; };
		let last = null, same = 0;
		for (let i = 0; i < 100; i++) { await sleep(300); const im = read(), k = key(im); same = k === last ? same + 1 : 0; last = k; if (same >= 2) return im; }
		throw new Error('the canvas never settled');
	}

	// ── the Lab's stair() (lib.mjs), verbatim logic
	const lum = im => { const L = new Float32Array(im.w * im.h); for (let i = 0, j = 0; i < L.length; i++, j += 4) L[i] = (im.d[j] * .2126 + im.d[j + 1] * .7152 + im.d[j + 2] * .0722) / 255; return L; };
	function stairDir(L, w, h, get) {
		const TD = .22, PMIN = .42; const cols = Array.from({ length: w }, () => []);
		const med3 = (a, b, c) => Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
		for (const flip of [false, true]) {
			const at = (x, y) => get(L, x, flip ? h - 1 - y : y);
			for (let x = 0; x < w; x++) for (let y = 2; y < h - 7; y++) {
				if (!(at(x, y) <= TD && at(x, y - 1) <= TD && at(x, y - 2) <= TD && at(x, y + 1) > TD)) continue;
				const d0 = (at(x, y) + at(x, y - 1) + at(x, y - 2)) / 3, p = med3(at(x, y + 4), at(x, y + 5), at(x, y + 6));
				if (p < PMIN || Math.abs(at(x, y + 4) - at(x, y + 6)) >= .12) continue;
				let pos = y; for (let k = 1; k <= 3; k++) pos += 1 - Math.min(1, Math.max(0, (at(x, y + k) - d0) / (p - d0)));
				cols[x].push(flip ? h - 1 - pos : pos);
			}
		}
		let open = [], n = 0, jumps = 0, sum = 0;
		const close = ch => { if (ch.length < 12) return; for (let i = 1; i < ch.length - 1; i++) { const d2 = Math.abs(ch[i + 1] - 2 * ch[i] + ch[i - 1]); sum += d2; if (d2 > .25) jumps++; n++; } };
		for (let x = 0; x < w; x++) {
			const cur = cols[x].sort((a, b) => a - b), used = new Array(cur.length).fill(false), nxt = [];
			for (const ch of open) { const last = ch[ch.length - 1]; let best = -1, bd = 1.5; for (let i = 0; i < cur.length; i++) if (!used[i] && Math.abs(cur[i] - last) < bd) { bd = Math.abs(cur[i] - last); best = i; }
				if (best >= 0) { used[best] = true; ch.push(cur[best]); nxt.push(ch); } else close(ch); }
			for (let i = 0; i < cur.length; i++) if (!used[i]) nxt.push([cur[i]]);
			open = nxt;
		}
		open.forEach(close); return { n, jumps, sum };
	}
	function stair(im) {
		const L = lum(im), a = stairDir(L, im.w, im.h, (L, x, y) => L[y * im.w + x]), b = stairDir(L, im.h, im.w, (L, x, y) => L[x * im.w + y]);
		const n = a.n + b.n; return { edgePx: n, J: n ? 100 * (a.jumps + b.jumps) / n : 0 };
	}

	window.__g1Check = async ({ dpr = 1.5, pans = [0, 3.3, 7.1], keep = false } = {}) => {
		Object.defineProperty(window, 'devicePixelRatio', { get: () => dpr, configurable: true });
		// No click on the welcome modal: the drop loads under it and the loader closes it (clicking first leaves the modal in
		// the DOM during its exit animation, and the drop handler refuses a drop while a dialog is open).
		const cv = document.querySelector('canvas'); const runs = [], shots = [];
		// Engine size actually used (the guard is only meaningful with Super Riso printing the frame).
		const sims = new Set(), proto = WebGL2RenderingContext.prototype, vp = proto.viewport;
		proto.viewport = function (...a) { sims.add(a[2] + 'x' + a[3]); return vp.apply(this, a); };
		try {
			for (const pan of pans) {
				await dropFile(await diorFile(cv.width, pan));
				await until(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === `g1-toner-${pan}`), 8000, 'project loaded');
				const cine = await until(() => buttonByText('Cine') || buttonByText('Cinema'), 3000, 'Cine button'); cine.click();
				// Cold start: the engine chunk, its textures and programs load on demand; the raw drawing can sit still meanwhile.
				sims.clear(); await until(() => sims.size, 30000, 'Super Riso printing the frame');
				const im = await settledCanvas(cv);
				const r = stair({ w: im.width, h: im.height, d: im.data }); runs.push({ pan, J: +r.J.toFixed(2), edgePx: r.edgePx });
				if (keep) { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').putImageData(im, 0, 0); shots.push(c); }
				(buttonByText('Dibujar') || buttonByText('Draw'))?.click(); await sleep(300);
			}
		} finally { proto.viewport = vp; }
		const worst = Math.max(...runs.map(r => r.J));
		const res = { pass: worst <= LIMIT, limit: LIMIT, worst: +worst.toFixed(2), runs, canvas: `${cv.width}x${cv.height}`, dpr, sim: [...sims].sort((a, b) => eval(b.replace('x', '*')) - eval(a.replace('x', '*')))[0] };
		if (keep) res.shots = shots; return res;
	};
})();
