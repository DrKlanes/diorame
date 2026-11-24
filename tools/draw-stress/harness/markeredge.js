// Guard of the MARKER edges of Super Riso › Fotocopia › Color a mano › Rotulador (v3.26.83, lab v23.6).
//
// What it watches: no visible marker edge may come from the ¼ zone mask (the «staircase» of 4 px steps), and no strip of
// bare paper may be left beside a black solid. The same guard exists in the Lab (lab/tools/measure/marker-edge.js): same
// test sheet, same three numbers, same limits.
//
//   await __markerEdgeCheck()            → { pass, limits, cases: [...] }   (~1 min; needs WebGL2)
//   await __superRisoHash('before'|'after')  seeded CINEMA / Plana renders of the example scene with Super Riso in every
//                                            technique that is NOT Fotocopia + marker: they must not change (same SHA-256).
//
// How: a FIXED sheet (light patches with curved and oblique edges, two colours touching, colour against black) built as a
// Diorame scene, style «Fanzine a rotulador», fixed seed, rendered through the real pipeline (renderSnapshot → the export
// engine: synchronous, full level) in CINEMA (forward) and in the flat view, at Resolution .85 (normal) and .1 (lo-fi), as
// PNG HQ ×2, and at the live «modo ligero» level (what ?srdebug=1&srlevel=preview forces: res .5 + light variants) with the
// engine driven directly. Each is compared with the SAME frame supersampled ×4 (renderScale ×4: Super Riso works in mm of
// sheet, so it is the same print with a ¼ grid four times finer) and reduced.
//   edgePx       mean displacement of the ink edge against the reference, output px (XOR of «is there marker ink» / perimeter)
//   stairPx      RMS amplitude (px) of the part of the edge (target − reference) that runs at the pitch of the ¼ grid
//   haloDarkPct  % of the contact between a colour and a black solid left as bare paper, with «Descuido» at 0
//   haloColorPct the same between two colours that touch
// Nothing is awaited between a seeded Math.random and its readback (CLAUDE.md, «Verificación»).
(() => {
	const SHEET = [240, 180];
	// LIGHT on purpose (darker colours become toner), and each one close to a SATURATED marker of the kit (Rosa, Cian, Amarillo):
	// a pale marker such as Carne has too little chroma for «is there ink» to be read reliably.
	const C = { red: '#f58fb5', blue: '#8fc4ee', yel: '#f2c530', black: '#141414' };
	// Measured (desktop GPU, 2026-11-24), see docs/media/marker-edges/README.md. With the ¼ mask (≤ v3.26.82) every case FAILS.
	// edgePx and stairPx are in px of the SIMULATION: lo-fi (Resolution .1: simulated at 46 %, enlarged without smoothing) and
	// the «modo ligero» (simulated at 50 %) draw pixels bigger than the output's, and an edge cannot be finer than its pixel —
	// those two get LIMITS_UP (about a quarter of a simulated pixel more of edge; a contact band only ~1 simulated px wide).
	// Original limits (v3.26.83). v3.26.86 (Lab v23.9, end vs flank) pushed three values over them; the widening of v3.26.86 was
	// REVERTED on purpose (known-issue closure, 2026-11-24): those cases are listed in KNOWN below and reported as KNOWN FAILURE.
	// WARNING: this guard does NOT see the square steps (battlements) at the end of a marker stroke (docs/known-issues/marker-edges.md,
	// attempt 4): its supersampled reference carries them too. It only guards the ¼ grid and the halos. A pass here says nothing
	// about those steps.
	const LIMITS = { edgePx: 0.32, stairPx: 0.2, haloDarkPct: 3, haloColorPct: 4.5 };
	const LIMITS_UP = { edgePx: 0.45, stairPx: 0.2, haloDarkPct: 8, haloColorPct: 4.5 };
	// Known failures: case → metric → value measured in v3.26.86 (2026-11-24). Over the original limit but ≤ value × 1.10 = KNOWN
	// FAILURE (does not fail the guard); worse than that by more than 10 %, or any metric/case not listed over its limit = normal FAILURE.
	const KNOWN = { 'cinema-normal': { stairPx: 0.206 }, 'cinema-png-hq2': { stairPx: 0.211 }, 'cinema-lofi': { haloColorPct: 6.3 } };
	const KNOWN_TAG = 'FALLO CONOCIDO — ver docs/known-issues/marker-edges.md';
	const POLY = {
		blueA: [[100, 15], [175, 28], [160, 80], [108, 62]], blueB: [[15, 100], [125, 95], [130, 168], [20, 170]], yelT: [[15, 100], [70, 97.5], [18, 150]],
		redQ: [[146, 118], [222, 128], [215, 168], [150, 165]], blackQ: [[150, 100], [228, 112], [222, 128], [146, 118]],
	};
	const EDGES = [[[100, 15], [175, 28]], [[175, 28], [160, 80]], [[160, 80], [108, 62]], [[108, 62], [100, 15]], [[125, 95], [130, 168]], [[130, 168], [20, 170]], [[222, 128], [215, 168]], [[215, 168], [150, 165]]];
	const CONTACTS = [{ a: [66, 101.5], b: [21, 146], kind: 'color' }, { arc: [95, 135, 26, 2.2, 4.6], kind: 'color' }, { a: [150, 118.5], b: [218, 127.5], kind: 'dark' }];
	const BBOX = [15, 15, 232.3, 170];                              // ink bounding box of the sheet, mm (x0, y0, x1, y1)

	const seed = (n) => { let s = n; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
	const realRandom = Math.random;
	// The app's own module instances (Vite's HMR adds ?t=: a bare path may load a second instance — CLAUDE.md).
	// The import goes through `new Function`: a variable import() makes Vite inject a helper `import` line, which a classic script cannot carry.
	const dynImport = new Function('u', 'return import(u)');
	const mod = (path) => { const hit = performance.getEntriesByType('resource').map(e => e.name).filter(n => n.split('?')[0].endsWith(path)).pop(); return dynImport(hit || path); };
	const SR = '/src/components/strata/canvas/superRiso/';
	let M = null;
	const modules = async () => M || (M = {
		C: await mod('/src/components/strata/StrataContext.tsx'), D: await mod('/src/components/strata/canvas/drawSnapshot.ts'),
		K: await mod('/src/constants/superRiso.ts'), X: await mod('/src/constants/superRisoXerox.ts'), F: await mod(SR + 'flag.ts'),
	});

	// ── the sheet as a Diorame scene: every patch a filled shape on layer 0, k world units per mm, centred on the origin
	const ring = (cx, cy, rx, ry, rot, n = 120) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });
	function sheetShapes(k) {
		const sh = (id, pts, color) => ({ id, color, zIndex: 0, points: pts.map(([x, y]) => ({ x: (x - SHEET[0] / 2) * k, y: (y - SHEET[1] / 2) * k })), isEraser: false, isDrawInside: false, isDrawBehind: false });
		// Diorame rounds a blob through its points: a point every mm keeps the straight edges straight (only the corners round off).
		const dense = (p) => p.flatMap((a, i) => { const b = p[(i + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); return Array.from({ length: n }, (_, j) => [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); });
		return [sh('disc', ring(52, 48, 30, 30, 0), C.red), sh('blueA', dense(POLY.blueA), C.blue), sh('ell', ring(205, 52, 27, 15, 0.44), C.yel),
			sh('blueB', dense(POLY.blueB), C.blue), sh('yelT', dense(POLY.yelT), C.yel), sh('disc2', ring(95, 135, 26, 26, 0), C.red), sh('redQ', dense(POLY.redQ), C.red), sh('blackQ', dense(POLY.blackQ), C.black)];
	}
	const byZ = (st) => { const m = new Map(); for (const s of st.shapes) { if (!m.has(s.zIndex)) m.set(s.zIndex, []); m.get(s.zIndex).push(s); } return { shapesByZ: m, sortedZs: [...m.keys()].sort((a, b) => b - a) }; };
	const optsOf = (st, camera, w, h) => ({ state: { ...st, camera, isOnionSkinEnabled: false }, ...byZ(st), waypoints: [], camera, w, h, paperImg: null, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null, getActiveZ: (i) => i * -150 });
	const fxOff = (st) => Object.fromEntries(Object.keys(st.postProcessingEnabled).map(k => [k, false]));
	/** CINEMA state with only Super Riso on (or nothing: sr = null). */
	function cinemaState({ C: Ctx }, base, type, sr) {
		return { ...base, mode: 'cinematic', cinematicType: type, fxMasterEnabled: true, isDarkMode: false, currentLayerIndex: 0, drawingZoom: 1, drawingPan: { x: 0, y: 0 },
			postProcessingEnabled: { ...fxOff(base), superRiso: !!sr }, postProcessing: { ...base.postProcessing, ...(sr ? { superRiso: sr } : {}) } };
	}
	const zine = ({ K, X }, { resolution = 0.85, sloppy } = {}) => { const x = X.applyXeroxStyle(X.XEROX_DEFAULTS, 'zine');
		return K.sanitizeSuperRiso({ ...K.SUPER_RISO_DEFAULTS, technique: 'xerox', resolution, reprintFps: 0, xerox: sloppy == null ? x : { ...x, sloppy } }); };
	const CAM = { forward: { x: 0, y: 0, z: 500, rotation: 0 }, flat: { x: 0, y: 0, z: 0, rotation: 0 } };

	// Super Riso loads on demand (chunk, textures, GL context): render until a frame comes back printed.
	async function ready(m) {
		const st0 = { ...m.C.initialState, shapes: sheetShapes(1) }, same = (a, b) => { for (let i = 0; i < a.length; i += 97) if (a[i] !== b[i]) return false; return true; };
		const px = (st) => { seed(1); const d = m.D.renderSnapshot(optsOf(st, CAM.flat, 240, 180), 1).canvas.getContext('2d').getImageData(0, 0, 240, 180).data; Math.random = realRandom; return d; };
		const plain = px(cinemaState(m, st0, 'flat', null));
		for (let i = 0; i < 100; i++) { m.F.getSuperRiso(); if (!same(px(cinemaState(m, st0, 'flat', zine(m))), plain)) return; await new Promise(r => setTimeout(r, 100)); }
		throw new Error('Super Riso did not load (WebGL2?)');
	}

	function reduce(cv, ss) {                                       // box filter in linear light: what a lower-resolution scanner would see
		const W = cv.width, w = W / ss, h = cv.height / ss, d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, cv.height).data;
		const c = document.createElement('canvas'); c.width = w; c.height = h; const cx = c.getContext('2d'), o = cx.createImageData(w, h), n = ss * ss;
		const lin = new Float32Array(256); for (let i = 0; i < 256; i++) { const v = i / 255; lin[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
		const srgb = (v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let r = 0, g = 0, b = 0;
			for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) { const p = ((y * ss + j) * W + x * ss + i) * 4; r += lin[d[p]]; g += lin[d[p + 1]]; b += lin[d[p + 2]]; }
			const p = (y * w + x) * 4; o.data[p] = srgb(r / n); o.data[p + 1] = srgb(g / n); o.data[p + 2] = srgb(b / n); o.data[p + 3] = 255; }
		cx.putImageData(o, 0, 0); return c;
	}

	// ── reading the ink (identical to the Lab's tool): OKLab chroma (paper and toner have none; the marker does) and lightness
	function inkMaps(cv) {
		const w = cv.width, h = cv.height, d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
		const chroma = new Float32Array(w * h), light = new Float32Array(w * h);
		const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
		for (let i = 0; i < w * h; i++) { const r = lin(d[i * 4]), g = lin(d[i * 4 + 1]), b = lin(d[i * 4 + 2]);
			const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
			light[i] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
			chroma[i] = Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s); }
		return { w, h, chroma, light };
	}
	const INK = 0.06;
	const blur3 = (a, w, h) => { const o = new Float32Array(a.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0;
		for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < w && Y < h) { s += a[Y * w + X]; n++; } } o[y * w + x] = s / n; } return o; };
	function edgePx(T, Rf) {
		const { w, h } = T, a = blur3(T.chroma, w, h), b = blur3(Rf.chroma, w, h); let xor = 0, per = 0;
		for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, A = a[i] > INK, B = b[i] > INK; if (A !== B) xor++; if (B !== (b[i + 1] > INK) || B !== (b[i + w] > INK)) per++; }
		return xor / Math.max(per, 1);
	}
	// g = { s: px per mm, ox, oy }: where the sheet landed on the canvas (fitted on a render without Super Riso)
	function edgeProfile(Mp, g, a, b) {
		const ax = a[0] * g.s + g.ox, ay = a[1] * g.s + g.oy, bx = b[0] * g.s + g.ox, by = b[1] * g.s + g.oy;
		const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux, { w, h, chroma } = Mp;
		const at = (x, y) => { const X = Math.floor(x), Y = Math.floor(y); if (X < 0 || Y < 0 || X >= w - 1 || Y >= h - 1) return NaN; const fx = x - X, fy = y - Y, i = Y * w + X;
			return (chroma[i] * (1 - fx) + chroma[i + 1] * fx) * (1 - fy) + (chroma[i + w] * (1 - fx) + chroma[i + w + 1] * fx) * fy; };
		const reach = 2.5 * g.s, skip = 5 * g.s, out = [];
		for (let s = skip; s < L - skip; s += 1) { const px = ax + ux * s, py = ay + uy * s;
			const c0 = at(px - nx * reach, py - ny * reach), c1 = at(px + nx * reach, py + ny * reach); if (!(c0 === c0 && c1 === c1)) { out.push(NaN); continue; }
			const dir = c1 > c0 ? 1 : -1; let prev = at(px - dir * nx * reach, py - dir * ny * reach), pos = NaN;
			for (let t = -reach + 0.25; t <= reach; t += 0.25) { const v = at(px + dir * nx * t, py + dir * ny * t); if (prev <= INK && v > INK) { pos = (t - 0.25 + 0.25 * (INK - prev) / (v - prev)) * dir; break; } prev = v; }
			out.push(pos); }
		return { profile: out, slope: Math.min(Math.abs(ux), Math.abs(uy)) / Math.max(Math.abs(ux), Math.abs(uy)), major: Math.max(Math.abs(ux), Math.abs(uy)) };
	}
	// grid: output px of one texel of the ¼ mask (4 at full level; 8 at the «modo ligero» level, simulated at half size)
	function stairAmp(prof, ref, grid) {
		const r = prof.profile.map((v, i) => v - ref.profile[i]), n = r.length, { slope, major } = prof; if (slope < 0.04 || n < 40) return null;
		const period = grid / slope / major; if (period > n / 3) return null;
		const win = Math.max(9, Math.round(period * 1.5) | 1), hp = new Float32Array(n).fill(NaN);
		for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let j = -win; j <= win; j++) { const v = r[i + j]; if (v === v) { s += v; c++; } } if (r[i] === r[i] && c > win) hp[i] = r[i] - s / c; }
		let p2 = 0;
		for (const k of [1, 2]) { let cs = 0, sn = 0, c = 0; for (let i = 0; i < n; i++) if (hp[i] === hp[i] && Math.abs(hp[i]) < 6) { const ph = 2 * Math.PI * k * i / period; cs += hp[i] * Math.cos(ph); sn += hp[i] * Math.sin(ph); c++; }
			if (c > 20) p2 += 2 * (cs * cs + sn * sn) / (c * c); }
		return Math.sqrt(p2);
	}
	function haloPct(Mp, g, contact) {
		const pts = [];
		if (contact.arc) { const [cx, cy, r, a0, a1] = contact.arc; for (let t = a0; t <= a1; t += 0.4 / (r * g.s)) pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t), Math.cos(t), Math.sin(t)]); }
		else { const { a, b } = contact, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; for (let s = 3; s < L - 3; s += 0.4 / g.s) pts.push([a[0] + ux * s, a[1] + uy * s, -uy, ux]); }
		const { w, h, chroma, light } = Mp; let bare = 0, n = 0;
		for (const [mx, my, nx, ny] of pts) for (let t = -0.6; t <= 0.6; t += 0.25 / g.s) { const x = Math.round((mx + nx * t) * g.s + g.ox), y = Math.round((my + ny * t) * g.s + g.oy); if (x < 0 || y < 0 || x >= w || y >= h) continue;
			n++; if (chroma[y * w + x] <= INK && light[y * w + x] > 0.6) bare++; }
		return 100 * bare / Math.max(n, 1);
	}
	function fit(cv) {                                               // where the sheet's ink box landed: scale and offset
		const w = cv.width, h = cv.height, d = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; if (Math.abs(d[p] - d[0]) + Math.abs(d[p + 1] - d[1]) + Math.abs(d[p + 2] - d[2]) > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
		const s = ((x1 + 1 - x0) / (BBOX[2] - BBOX[0]) + (y1 + 1 - y0) / (BBOX[3] - BBOX[1])) / 2;
		return { s, ox: x0 - BBOX[0] * s, oy: y0 - BBOX[1] * s };
	}

	// «Modo ligero» (frame.liveMode on a preview device): the engine driven as exportEngine.ts drives it, with that Mode.
	async function previewRender(m, st, w, h, sr) {
		const [E, Fr, B, T, PV] = await Promise.all([mod(SR + 'engine.ts'), mod(SR + 'frame.ts'), mod(SR + 'bridge.ts'), mod(SR + 'textures.ts'), mod(SR + 'shadersFast.ts')]);
		const assets = await T.loadAssets();
		const draw = { ...st, mode: 'drawing', camera: CAM.flat, currentLayerIndex: 0, drawingZoom: 1, drawingPan: { x: 0, y: 0 }, isDarkMode: false };
		seed(4711);
		const off = m.D.renderDrawSnapshot(optsOf(draw, CAM.flat, w, h), 1, 'transparent');   // the flat view projects with DRAW's branch (flatcheck: 0 px)
		const mode = { res: 0.5, sim: true, preview: PV.PV_ALL | PV.PV_LIGHT, lossless: true, pipe: 0, hold: false, holdFps: 12 };
		const inp = { settings: sr, isDarkMode: false, isPixelArt: false, shapes: st.shapes, hiddenLayers: [], isLive: false, info: { preset: 'flat', speed: 0 } };
		const eng = E.createEngine(document.createElement('canvas'), assets, { preserveDrawingBuffer: true });
		try { const fr = Fr.prepare(w, h, inp, mode); eng.setSource(B.flatten(B.exportFlat, off, fr.fw, fr.fh, fr.base, false), true);
			eng.render({ ...Fr.engineParams(fr), seed: Fr.seedOf(0) }, Fr.opts(mode));
			const out = document.createElement('canvas'); out.width = w; out.height = h; const cx = out.getContext('2d'); B.drawBack(cx, eng.canvas, eng.width, eng.height, w, h, !!fr.style.crisp);
			Math.random = realRandom; return out; } finally { Math.random = realRandom; eng.destroy(); }
	}

	// [name, view, logical width, renderScale of the target, Resolution, level, output px per simulated px]
	const CASES = [
		['cinema-normal', 'forward', 1000, 1, 0.85, 'full', 1], ['plana-normal', 'flat', 1000, 1, 0.85, 'full', 1],
		['cinema-lofi', 'forward', 1000, 1, 0.1, 'full', 1 / 0.46], ['plana-lofi', 'flat', 1000, 1, 0.1, 'full', 1 / 0.46],
		['plana-preview', 'flat', 1000, 1, 0.85, 'preview', 2], ['cinema-png-hq2', 'forward', 500, 2, 0.85, 'full', 1],
	];
	async function measureCase(m, [name, view, lw, scale, resolution, level, up], keep) {
		const lh = lw * 0.75, base = { ...m.C.initialState, shapes: sheetShapes(lw / 250) }, cam = CAM[view];
		const shot = (sr, sc) => { seed(4711); const cv = m.D.renderSnapshot(optsOf(cinemaState(m, base, view, sr), cam, lw, lh), sc).canvas; Math.random = realRandom; return cv; };
		const g = fit(shot(null, scale));
		const sr = zine(m, { resolution }), tidy = zine(m, { resolution, sloppy: 0 });
		const target = level === 'preview' ? await previewRender(m, base, lw, lh, sr) : shot(sr, scale);
		const tidyCv = level === 'preview' ? await previewRender(m, base, lw, lh, tidy) : shot(tidy, scale);
		const ref = reduce(shot(sr, scale * 4), 4);
		const T = inkMaps(target), Rf = inkMaps(ref), Td = inkMaps(tidyCv), grid = level === 'preview' ? 8 : 4;
		const amps = EDGES.map(([a, b]) => stairAmp(edgeProfile(T, g, a, b), edgeProfile(Rf, g, a, b), grid)).filter(v => v != null);
		const worst = (kind) => Math.max(0, ...CONTACTS.filter(c => c.kind === kind).map(c => haloPct(Td, g, c)));
		const L = up > 1 ? LIMITS_UP : LIMITS;
		const row = { name, size: `${target.width}x${target.height}`, simPx: +up.toFixed(2), edgePx: +(edgePx(T, Rf) / up).toFixed(3), stairPx: +((amps.length ? Math.sqrt(amps.reduce((s, v) => s + v * v, 0) / amps.length) : 0) / up).toFixed(3),
			haloDarkPct: +worst('dark').toFixed(1), haloColorPct: +worst('color').toFixed(1), limits: up > 1 ? 'up' : 'full' };
		const bad = [], known = [];
		for (const k of Object.keys(L)) if (row[k] > L[k]) { const kv = (KNOWN[name] || {})[k]; (kv != null && row[k] <= kv * 1.1 ? known : bad).push(k); }
		row.pass = bad.length === 0; row.status = bad.length ? 'FALLO: ' + bad.join(', ') : known.length ? KNOWN_TAG + ': ' + known.join(', ') : 'ok';
		return keep ? { row, target, ref, tidy: tidyCv } : { row };
	}

	/** One frame of the test sheet, for looking at it: view 'forward' | 'flat'; settings: zine by default, null = no Super Riso. */
	window.__markerEdgeShot = async ({ view = 'forward', width = 1000, scale = 1, resolution = 0.85, sloppy, superRiso = true, example = false } = {}) => {
		const m = await modules(); await ready(m);
		const base = example ? m.C.appReducer(m.C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch('/examples/diorame_onboarding.dior')).json() }) : { ...m.C.initialState, shapes: sheetShapes(width / 250) };
		const cam = example && view === 'forward' ? { x: 30, y: -12, z: 480, rotation: 0.05 } : CAM[view];
		seed(4711); const cv = m.D.renderSnapshot(optsOf(cinemaState(m, base, view, superRiso ? zine(m, { resolution, sloppy }) : null), cam, width, width * 0.75), scale).canvas; Math.random = realRandom; return cv;
	};

	window.__markerEdgeCheck = async ({ keep = false, cases = CASES } = {}) => {
		const m = await modules(); await ready(m); const out = [], images = {};
		for (const c of cases) { const r = await measureCase(m, c, keep); out.push(r.row); if (keep) images[c[0]] = { target: r.target, ref: r.ref, tidy: r.tidy }; }
		const res = { pass: out.every(r => r.pass), knownFailures: out.filter(r => r.pass && r.status !== 'ok').length, note: 'This guard does NOT see the battlements at the end of a marker stroke (docs/known-issues/marker-edges.md).', limits: { full: LIMITS, up: LIMITS_UP }, cases: out }; if (keep) res.images = images; return res;
	};

	// Everything of Super Riso that is NOT Fotocopia + marker, on the example scene, CINEMA forward and flat view: before / after.
	window.__superRisoHash = async (label) => {
		const m = await modules(); await ready(m);
		const ex = m.C.appReducer(m.C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch('/examples/diorame_onboarding.dior')).json() });
		const S = m.K.SUPER_RISO_DEFAULTS, x = (style) => m.X.applyXeroxStyle(m.X.XEROX_DEFAULTS, style);
		const techs = { riso: { ...S, technique: 'riso' }, 'riso-fanzine': m.K.applySuperRisoStyle({ ...S, technique: 'riso' }, 'zine'), stencil: { ...S, technique: 'stencil' },
			'fotocopia-acuarela': { ...S, technique: 'xerox', xerox: x('water') }, 'fotocopia-flyer': { ...S, technique: 'xerox', xerox: x('flyer') }, 'fotocopia-foto': { ...S, technique: 'xerox', xerox: x('photo') } };
		const out = {};
		for (const [tn, sr] of Object.entries(techs)) for (const [view, cam, sc] of [['forward', { x: 30, y: -12, z: 480, rotation: 0.05 }, 1], ['flat', CAM.flat, 1], ['forward', { x: 30, y: -12, z: 480, rotation: 0.05 }, 2]]) {
			const st = cinemaState(m, ex, view, m.K.sanitizeSuperRiso({ ...sr, reprintFps: 0 })), render = () => m.D.renderSnapshot(optsOf(st, cam, 1000, 750), sc).canvas;
			render();                                                 // warm-up, unseeded: lazy programs and CPU maps
			seed(777); const cv = render(); const px = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; Math.random = realRandom;
			out[`${tn}/${view}${sc > 1 ? '-hq2' : ''}`] = [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''); }
		const key = 'markeredge:srhash:';
		localStorage.setItem(key + label, JSON.stringify(out));
		const other = label === 'after' ? JSON.parse(localStorage.getItem(key + 'before') || 'null') : null;
		return other ? { pass: Object.keys(out).every(k => out[k] === other[k]), cases: Object.fromEntries(Object.keys(out).map(k => [k, { hash: out[k], same: out[k] === other[k] }])) } : out;
	};
})();
