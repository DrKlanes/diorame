// Lab ↔ Diorame comparison of Fotocopia with the SAME inputs (REFERENCE.md §14, trap 9; v3.26.104, port of Lab v23.18).
//
//   await __cmp({ lab: 'v23.18', scene: 'example' | 'sheet', W: 960, hand: 'marker' | 'water' | 'none', sloppy: .55 })
//   → { oriMapIdentical, meanAbs, pctOver16, max, labSha, dioSha, … }
//
// The Lab engine is built from its sources at a tag (as lab\tools\measure\marker-edge.js does) inside the Diorame dev page; both
// engines get the same source canvas (the drawing without Super Riso, from markeredge.js), the same parameters (Diorame's
// xeroxParams) and the same orientation map (the Lab's regionMaps); the maps of both ports are compared byte for byte too.
// Expected residual (RTX 5070 Ti, v3.26.104 vs v23.18 and v3.26.103 vs v23.16): meanAbs 0.001–0.010, pctOver16 ≤ 0.008 — the Lab
// renders in tiles with a margin, Diorame the whole frame. Compare the new pair with the previous pair (old app vs old Lab tag)
// and with the cross pair (new app vs old Lab tag), which must differ: that proves the instrument sees the change.
//
// Setup (temporaries OUTSIDE Diorame\, CLAUDE.md):
//   1. Stage the sources in a scratch folder SRV:  for t in v23.16 v23.18: git -C lab\tools show $t:studio/<f> > SRV/$t/<f>
//      for f in shaders.studio.js shaders.xerox.js shaders.stencil.js engine.common.js engine.studio.js;
//      SRV/lab-build/{paper.part.js,riso_lib.json} (git show <tag>:lab-build/…); SRV/dist/*.png ← lab\lab\dist\ (the 4 textures).
//   2. Serve SRV on 127.0.0.1:8777 WITH CORS (a 6-line Python SimpleHTTPRequestHandler that adds Access-Control-Allow-Origin: *).
//   3. npm run dev -- --open false → localhost:3000; in the console load markeredge.js and this file with <script>, then call __cmp.
//   The «before» app: `git archive HEAD | tar -x` into a scratch folder, a junction to app\node_modules, its own cacheDir in
//   vite.config.ts, `npx vite --port 3001 --strictPort --open false`. Remove the junction with `cmd /c rmdir`, never recursively.
// Same source canvas, same engine parameters (Diorame's xeroxParams), same orientation map fed to both engines.
(() => {
	const BASE = window.__labCompareBase || 'http://127.0.0.1:8777/';
	const dynImport = new Function('u', 'return import(u)');
	const mod = (path) => { const hit = performance.getEntriesByType('resource').map(e => e.name).filter(n => n.split('?')[0].endsWith(path)).pop(); return dynImport(hit || path); };
	const SR = '/src/components/strata/canvas/superRiso/';
	const txt = async (u) => { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); };
	const image = (u) => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error(u)); i.src = u; });
	const labs = {};
	async function lab(v) {
		if (labs[v]) return labs[v];
		const p = BASE + v + '/';
		const parts = [await txt(p + 'shaders.studio.js'), await txt(p + 'shaders.xerox.js'), await txt(p + 'shaders.stencil.js'), await txt(BASE + 'lab-build/paper.part.js'),
			(await txt(p + 'engine.common.js')).replace('%%RISOLIB%%', await txt(BASE + 'lab-build/riso_lib.json')), await txt(p + 'engine.studio.js')];
		const g = {}; new Function('global', "'use strict';\nconst EX_PXMM=17.2;\n" + parts.join('\n') + '\n')(g);
		const R = g.SuperRiso; const [green, exBlack, exRed, exLut] = await Promise.all(['greennoise1024.png', 'ink_black.png', 'ink_red.png', 'ink_lut.png'].map(n => image(BASE + 'dist/' + n)));
		return (labs[v] = { R, eng: R.create({ green, exBlack, exRed, exLut }) });
	}
	let M = null;
	const modules = async () => M || (M = { E: await mod(SR + 'engine.ts'), T: await mod(SR + 'textures.ts'), XP: await mod(SR + 'xeroxParams.ts'), XM: await mod(SR + 'xeroxMaps.ts'),
		MK: await mod(SR + 'xeroxMarkers.ts'), K: await mod('/src/constants/superRiso.ts'), X: await mod('/src/constants/superRisoXerox.ts'), C: await mod('/src/components/strata/StrataContext.tsx') });
	let dio = null;
	const pix = (cv) => cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
	const to2d = (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(src, 0, 0, w, h); return c; };
	const sha = async (d) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', d))].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');
	function diff(a, b, w, h, border = 24) {
		let n = 0, s = 0, big = 0, mx = 0;
		for (let y = border; y < h - border; y++) for (let x = border; x < w - border; x++) { const i = (y * w + x) * 4; let m = 0;
			for (let c = 0; c < 3; c++) { const d = Math.abs(a[i + c] - b[i + c]); s += d; if (d > m) m = d; }
			n++; if (m > 16) big++; if (m > mx) mx = m; }
		return { meanAbs: +(s / n / 3).toFixed(3), pctOver16: +(100 * big / n).toFixed(3), max: mx };
	}
	window.__cmpSrc = null;
	window.__cmp = async ({ lab: lv = 'v23.18', scene = 'example', W = 960, hand = 'marker', sloppy = .55, seed = 1, keep = false } = {}) => {
		const m = await modules(); const L = await lab(lv);
		if (!dio) dio = m.E.createEngine(document.createElement('canvas'), await m.T.loadAssets(), { preserveDrawingBuffer: true });
		// source: the drawing without Super Riso (markeredge.js harness), W × 0.75W
		const src = to2d(await window.__markerEdgeShot({ example: scene === 'example', view: scene === 'example' ? 'forward' : 'flat', width: W, superRiso: false }), W, W * .75);
		const H = src.height;
		const style = hand === 'water' ? 'water' : hand === 'none' ? 'flyer' : 'zine';
		const x = { ...m.X.applyXeroxStyle(m.X.XEROX_DEFAULTS, style), sloppy, hand };
		const sr = m.K.sanitizeSuperRiso({ ...m.K.SUPER_RISO_DEFAULTS, technique: 'xerox', resolution: .85, reprintFps: 0, xerox: x });
		let mk;
		if (scene === 'example') { const ex = m.C.appReducer(m.C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch('/examples/diorame_onboarding.dior')).json() }); mk = m.MK.xeroxMarkers(sr, ex.shapes, [], [1, 1, 1], null); }
		else mk = { paint: ['#ff5fa2', '#22b0e6', '#ffd400'], keys: ['#f58fb5', '#8fc4ee', '#f2c530'], what: 'color' };
		const keys = mk.keys ?? mk.paint;
		const oriLab = L.R.regionMaps(src, { keys, srcPaper: [1, 1, 1] }).ori;
		const oriDio = m.XM.xeroxMaps(src, mk, sr.xerox, [1, 1, 1], false).ori;
		const mapSame = oriLab.width === oriDio.width && oriLab.height === oriDio.height && (await sha(pix(oriLab))) === (await sha(pix(oriDio))) && oriLab.__srOriRows === oriDio.__srOriRows;
		const P = { ...m.XP.xeroxParams(sr.xerox, W, .85), printW: 240, pxmm: W / 240, tex: 0, markers: mk.paint, keys, regionMap: null, orientMap: oriLab, srcPaper: [1, 1, 1], seed, tech: 'xerox' };
		const outLab = await L.R.renderImage(L.eng, src, W, H, { ...P });
		dio.setSource(src, true); dio.render({ ...P }); const outDio = to2d(dio.canvas, dio.width, dio.height);
		const a = pix(outLab), b = pix(outDio);
		const res = { lab: lv, scene, W, H, hand, sloppy, dioSize: dio.width + 'x' + dio.height, oriRowsLab: oriLab.__srOriRows, oriRowsDio: oriDio.__srOriRows, oriMapIdentical: mapSame, labSha: await sha(a), dioSha: await sha(b), ...diff(a, b, W, H) };
		if (keep) window.__cmpOut = { src, outLab, outDio };
		return res;
	};
})();
