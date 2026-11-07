// DRAW timelapse (v3.25.17). Inject in the dev page (localhost:3000) with a <script src="/tools/draw-stress/harness/timelapse.js">.
//   await __timelapseCheck()        → engine checks (no download): last frame = the PNG export, merged-layer ordering, MP4 metadata.
//   await __timelapseTiming()       → 30 s timelapse (975 frames, 1080 × 1920) of the stress scenes and the example: times.
//   await __timelapse({ ... })      → YOUR drawing as an MP4 (downloads it and plays it on the page). Options:
//        source: 'autosave' (default: the drawing open in the app, as last autosaved) or a .dior URL
//        framing: 'format' (default when the drawing has a frame) | 'view' | 'drawing'      long: 1080 (default) | 1920
//        duration: 15 (default) | 30 | 60      background: 'paper' (default) | 'solid'      layer: active layer (projection)
(() => {
	const mod = async () => ({
		C: await import('/src/components/strata/StrataContext.tsx'),
		T: await import('/src/components/strata/canvas/timelapse.ts'),
		S: await import('/src/components/strata/canvas/timelapseSchedule.ts'),
		F: await import('/src/components/strata/canvas/formatSnapshot.ts'),
	});
	const seeded = (seed) => { let s = seed | 0; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
	const paper = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/src/assets/texture-paper.png'; });
	// A flat paper (v3.25.18): the paper code path (main canvas, background, multiply transfer) with an image whose resampling is
	// exact. The real 5000 × 3333 texture is NOT a pixel oracle in Chrome: two one-shot PNG renders of the same scene and seed,
	// before and after another export, differed by up to 61 levels on 557 000 px (the browser's decode/raster state of a scaled
	// image). It is reported, never judged.
	const flatPaper = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#efe6d2'; x.fillRect(0, 0, 64, 64); return c; })();
	const options = async (st, layer, paperImg) => {
		const L = layer ?? st.currentLayerIndex;
		const camera = { x: 0, y: 0, z: L * -150, rotation: 0 };
		const byZ = new Map();
		for (const s of st.shapes) { if (!byZ.has(s.zIndex)) byZ.set(s.zIndex, []); byZ.get(s.zIndex).push(s); }
		return { state: { ...st, mode: 'drawing', currentLayerIndex: L, camera }, shapesByZ: byZ, sortedZs: [...byZ.keys()].sort((a, b) => b - a), waypoints: [], camera,
			w: 1366, h: 1024, paperImg: paperImg === undefined ? await paper : paperImg, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null, getActiveZ: (i) => i * -150 };
	};
	const pixels = (cv) => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
	const hash = async (px) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
	let maxErr = 0; // largest channel difference of the last diff() call
	const diff = (a, b) => { if (a.length !== b.length) return -1; let d = 0; maxErr = 0; for (let i = 0; i < a.length; i += 4) { const e = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3])); if (e) { d++; if (e > maxErr) maxErr = e; } } return d; };
	const videoMeta = (blob) => new Promise((res) => { const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.onloadedmetadata = () => { res({ w: v.videoWidth, h: v.videoHeight, s: +v.duration.toFixed(3) }); URL.revokeObjectURL(v.src); }; v.onerror = () => res({ error: true }); v.src = URL.createObjectURL(blob); });
	const load = async (C, url) => C.appReducer(C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch(url)).json() });

	// Sampled frames (v3.25.20): first, 25 / 50 / 75 % and last of a 4 s video at 15 fps (60 drawing frames + 38 of hold), with
	// the per-layer cache AND with the full re-render (layerCache: false, the v3.25.17 path), each against the other and against
	// the PNG export of that frame's scene with the same seed (renderRectSnapshot).
	// Forces every 2D context created meanwhile onto the CPU rasterizer (willReadFrequently), engine and PNG alike. Chrome picks GPU
	// or CPU per canvas by its own state (memory pressure after loading big scenes); a long-lived session canvas and a later
	// one-shot PNG can land on different backends, whose antialiasing differs (measured up to 61 levels). Same backend = the logic.
	const onCpu = async (fn) => {
		const P = HTMLCanvasElement.prototype, real = P.getContext;
		P.getContext = function (type, attrs) { return type === '2d' ? real.call(this, type, { ...(attrs || {}), willReadFrequently: true }) : real.call(this, type, attrs); };
		try { return await fn(); } finally { P.getContext = real; }
	};
	const SAMPLE = { duration: 4, fps: 15 };
	const lastFrameVsPng = (m, o, rect, size, background, extra = {}) => onCpu(() => lastFrameVsPngAnyBackend(m, o, rect, size, background, extra));
	const lastFrameVsPngAnyBackend = async (m, o, rect, size, background, extra = {}) => {
		const { rank, count } = m.S.appearanceRanks(o.state.shapes, m.S.paintsLayer(o.state));
		const drawFrames = SAMPLE.duration * SAMPLE.fps, total = drawFrames + Math.round(2.5 * SAMPLE.fps);
		// First frame, 25 / 50 / 75 % of the DRAWING phase (the hold repeats the last), and the very last frame.
		const frames = [...[0, 0.25, 0.5, 0.75].map(f => Math.round(f * (drawFrames - 1))), total - 1];
		const ks = frames.map(i => m.S.shapesAtFrame(i, count, drawFrames));
		const capture = async (layerCache) => {
			const want = new Set(ks), got = new Map();
			const t0 = performance.now();
			const r = await m.T.renderTimelapse(o, { rect, ...size, background, ...SAMPLE, seed: 4242, layerCache, ...extra,
				inspect: (i, cv) => { const k = m.S.shapesAtFrame(i, count, drawFrames); if (want.has(k)) got.set(k, new Uint8ClampedArray(pixels(cv))); } });
			return { r, got, s: (performance.now() - t0) / 1000 };
		};
		const cached = await capture(true), full = await capture(false);
		const png = (scene) => { const real = Math.random; Math.random = seeded(4242); try { return new Uint8ClampedArray(pixels(m.F.renderRectSnapshot({ ...o, ...scene }, rect, size.width, size.height, background))); } finally { Math.random = real; } };
		let diffPx = 0;
		const samples = frames.map((i, j) => {
			const k = ks[j], c = cached.got.get(k), f = full.got.get(k), ref = png(m.S.sceneAt(o.state.shapes, rank, k));
			const vsFull = diff(c, f), e1 = maxErr, vsPng = diff(c, ref), e2 = maxErr;
			diffPx += vsFull + vsPng;
			return `f${i}/k${k}: cache≠full ${vsFull}${e1 ? ` (max ${e1})` : ''}, cache≠png ${vsPng}${e2 ? ` (max ${e2})` : ''}`;
		});
		const last = cached.got.get(ks[4]), ref = png({});
		const lastDiffPx = diff(last, ref), lastMaxErr = maxErr;
		return { size: `${size.width}x${size.height}`, frames: cached.r.frames, repaints: cached.r.repaints, codec: cached.r.codec, mb: +(cached.r.blob.size / 1e6).toFixed(2),
			video: await videoMeta(cached.r.blob), samples, diffPx, lastDiffPx, lastMaxErr, work: { cache: cached.r.work, full: full.r.work },
			hash: await hash(last), pngHash: await hash(ref), last, ref };
	};

	// Merged layer: B (layer 0) gets strokes; A (layer 1) gets strokes + an eraser + a drawInside → merge down (isolated group, A's
	// shapes go to the END of the array with their EARLIER t); then two more strokes on the merged layer.
	const mergedScene = async (C) => {
		const R = C.appReducer; let s = C.initialState; const sleep = (ms) => new Promise(r => setTimeout(r, ms));
		const blob = (id, x, y, r, color, extra = {}) => ({ id, color: s.palette[color], zIndex: s.currentLayerIndex * -150, ...extra,
			points: Array.from({ length: 24 }, (_, i) => ({ x: x + Math.cos(i / 24 * Math.PI * 2) * r, y: y + Math.sin(i / 24 * Math.PI * 2) * r })) });
		const add = async (shape) => { s = R(s, { type: 'ADD_SHAPE', payload: shape }); await sleep(2); };
		await add(blob('B1', -60, 0, 90, 3));
		s = R(s, { type: 'NEXT_LAYER' });
		await add(blob('A1', 40, 0, 110, 8));
		await add(blob('A2', 0, 40, 60, 14, { isEraser: true }));
		await add(blob('A3', 60, -40, 70, 18, { isDrawInside: true }));
		s = R(s, { type: 'SET_CURRENT_LAYER', payload: 0 });
		await add(blob('B2', 20, -20, 80, 5));          // drawn on B AFTER A's shapes existed
		s = R(s, { type: 'SET_CURRENT_LAYER', payload: 1 });
		s = R(s, { type: 'MERGE_LAYER_DOWN' });
		await add(blob('C1', -20, 60, 70, 11));        // after the merge
		await add(blob('C2', 90, 50, 50, 1, { isDrawInside: true }));
		s = R(s, { type: 'NEXT_LAYER' });
		await add(blob('D1', -150, -120, 50, 20));     // a new layer above the merged one, off the B2 / A overlap (the self-check below needs it visible)
		return s;
	};

	// Three layers, shapes WITHOUT t (an old file), drawn interleaved: c1(L2) b1(L1) a1(L0) c2(L2) b2(L1) a2(L0); then merge 1→0
	// (layer 2 untouched, becomes layer 1) and one new shape on it, which gets a real t. The merge stamps a synthetic negative t on
	// EVERY untimed shape of the project (global index), so the timelapse order stays the drawing order: c1 b1 a1 c2 b2 a2 new.
	const threeLayerScene = async (C) => {
		const R = C.appReducer; let s = C.initialState;
		const blob = (id, x, y, r, color) => ({ id, color: s.palette[color], zIndex: s.currentLayerIndex * -150,
			points: Array.from({ length: 24 }, (_, i) => ({ x: x + Math.cos(i / 24 * Math.PI * 2) * r, y: y + Math.sin(i / 24 * Math.PI * 2) * r })) });
		const add = (id, layer, x, y, r, color) => { s = R(s, { type: 'SET_CURRENT_LAYER', payload: layer }); s = R(s, { type: 'ADD_SHAPE', payload: blob(id, x, y, r, color) }); };
		s = R(s, { type: 'NEXT_LAYER' }); s = R(s, { type: 'NEXT_LAYER' });
		add('c1', 2, -80, -60, 50, 3); add('b1', 1, -40, 0, 70, 8); add('a1', 0, 0, 0, 90, 14);
		add('c2', 2, 60, 40, 50, 5); add('b2', 1, 40, 30, 60, 18); add('a2', 0, -60, 60, 60, 11);
		s = { ...s, shapes: s.shapes.map(({ t, ...x }) => x) };      // an old file: no t anywhere
		s = R(s, { type: 'SET_CURRENT_LAYER', payload: 1 });
		s = R(s, { type: 'MERGE_LAYER_DOWN' });
		add('new', 1, 90, -70, 40, 1);                                // layer 2 is now layer 1
		return s;
	};

	window.__tlDebug = { mod, options, lastFrameVsPng, load, pixels, diff: (a, b) => [diff(a, b), maxErr] };

	window.__timelapseCheck = async () => {
		const m = await mod();
		const out = {};
		const ex = await load(m.C, '/examples/diorame_onboarding.dior');
		const s2000 = await load(m.C, '/tools/draw-stress/out/stress-2000-6L.dior');
		for (const [name, st, L, bg, paperImg] of [['example-L3-solid', ex, 3, 'solid'], ['example-L3-paper-flat', ex, 3, 'paper', flatPaper], ['s2000x6-L2-solid', s2000, 2, 'solid']]) {
			const o = await options(st, L, paperImg);
			const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
			const r = await lastFrameVsPng(m, o, rect, m.T.timelapseSize(rect, 1080), bg);
			delete r.last; delete r.ref;
			out[name] = r;
		}
		// The real paper texture: informative only (see flatPaper). Expect small or zero differences, browser-dependent.
		{
			const o = await options(ex, 3);
			const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
			const r = await lastFrameVsPngAnyBackend(m, o, rect, m.T.timelapseSize(rect, 1080), 'paper');
			out.info_realPaperTexture = { lastDiffPx: r.lastDiffPx, lastMaxErr: r.lastMaxErr, midDiffPx: r.midDiffPx, midMaxErr: r.midMaxErr, note: 'default (GPU) backend, real texture: informative, not judged' };
		}
		// Merged layer: t decides when, the array decides how.
		const ms = await mergedScene(m.C);
		const o = await options(ms, 0);
		const ids = ms.shapes.map(x => x.id);
		const { rank } = m.S.appearanceRanks(ms.shapes, m.S.paintsLayer(o.state));
		const appearance = [...ids].sort((a, b) => rank[ids.indexOf(a)] - rank[ids.indexOf(b)]);
		const at4 = m.S.sceneAt(ms.shapes, rank, 4).shapesByZ.get(0).map(x => x.id);
		const layersAtEnd = new Set(ms.shapes.map(x => x.zIndex)).size;
		const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
		const size = m.T.timelapseSize(rect, 1080);
		const r = await lastFrameVsPng(m, o, rect, size, 'solid');
		// Self-check (must FAIL): painting in t order instead of array order changes the final frame.
		const byT = { ...ms, shapes: appearance.map(id => ms.shapes[ids.indexOf(id)]) };
		const oT = await options(byT, 0);
		const real = Math.random; Math.random = seeded(4242);
		let wrong; try { wrong = await onCpu(() => new Uint8ClampedArray(pixels(m.F.renderRectSnapshot(oT, rect, size.width, size.height, 'solid')))); } finally { Math.random = real; }
		out.merged = {
			arrayOrder: ids.join(' '), appearanceOrder: appearance.join(' '), paintedAtK4: at4.join(' '),
			groupOnA: ms.shapes.filter(x => x.group).map(x => x.id).join(' '),
			lastFrameVsPng_diffPx: r.diffPx, samples: r.samples, layersAtEnd, video: r.video, frames: r.frames,
			selfCheck_tOrderPainting_diffPx: diff(wrong, r.ref),
		};
		// Stability (v3.25.18): two renders of the same scene in one session WITHOUT any seed are identical — the ink texture
		// is made once. Before v3.25.18 the half-pixel rect re-created it on every render (~199 000 px apart: flicker).
		const fl = m.F.createRectSession(o, rect, size.width, size.height, 'solid');
		const full = m.S.sceneAt(ms.shapes, rank, ms.shapes.length);
		const f1 = new Uint8ClampedArray(pixels(fl.render(full)));
		const f2 = pixels(fl.render(full));
		fl.release();
		out.merged.stability_unseededRerender_diffPx = diff(f1, f2);
		// Three layers, untimed shapes: the merge stamps ALL of them, not only the merged layers'.
		{
			const s3 = await threeLayerScene(m.C);
			const order = (shapes) => { const { rank } = m.S.appearanceRanks(shapes, () => true); return shapes.map((x, i) => [rank[i], x.id]).sort((a, b) => a[0] - b[0]).map(p => p[1]).join(' '); };
			// Self-check (must DIFFER): stamping restricted to the merged layers leaves layer 1's (the old layer 2) untimed → they rank first.
			const restricted = s3.shapes.map(({ t, ...x }) => (x.zIndex === -150 && x.id !== 'new' ? x : { ...x, t }));
			out.merged.threeLayer = {
				arrayOrder: s3.shapes.map(x => x.id).join(' '), appearanceOrder: order(s3.shapes),
				untimedLeft: s3.shapes.filter(x => x.t === undefined).length, syntheticOnAll: s3.shapes.filter(x => x.id !== 'new').every(x => x.t < 0),
				layersAtEnd: new Set(s3.shapes.map(x => x.zIndex)).size,
				selfCheck_restrictedStampingOrder: order(restricted),
			};
		}
		out.pass = Object.entries(out).every(([k, v]) => k.startsWith('info_') || typeof v !== 'object' || (v.diffPx ?? v.lastFrameVsPng_diffPx) === 0)
			&& out.merged.selfCheck_tOrderPainting_diffPx > 0
			&& out.merged.stability_unseededRerender_diffPx === 0
			&& out.merged.appearanceOrder === 'B1 A1 A2 A3 B2 C1 C2 D1'
			&& out.merged.paintedAtK4 === 'B1 A1 A2 A3'
			&& out.merged.threeLayer.appearanceOrder === 'c1 b1 a1 c2 b2 a2 new'
			&& out.merged.threeLayer.untimedLeft === 0 && out.merged.threeLayer.syntheticOnAll && out.merged.threeLayer.layersAtEnd === 2
			&& out.merged.threeLayer.selfCheck_restrictedStampingOrder !== 'c1 b1 a1 c2 b2 a2 new';
		return out;
	};

	// Per-layer cache vs the full re-render (v3.25.20), same video: 60 s at 15 fps, long side 1920 (the iPad case that took ~420 s).
	window.__timelapseTiming = async (files = ['stress-500-1L', 'stress-2000-6L', 'example'], { duration = 60, fps = 15, long = 1920 } = {}) => {
		const m = await mod();
		const out = {};
		for (const f of files) {
			const st = await load(m.C, f === 'example' ? '/examples/diorame_onboarding.dior' : `/tools/draw-stress/out/${f}.dior`);
			const o = await options(st, f === 'example' ? 3 : 0);
			const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
			const size = m.T.timelapseSize(rect, long);
			const row = { size: `${size.width}x${size.height}`, layers: new Set(st.shapes.map(s => s.zIndex)).size };
			for (const layerCache of [false, true]) {
				const eta = [], t0 = performance.now();
				const r = await m.T.renderTimelapse(o, { rect, ...size, background: 'paper', duration, fps, layerCache,
					onProgress: (p) => { for (const q of [0.1, 0.5, 0.9]) if (p.fraction >= q && p.etaMs !== null && !eta.some(e => e.at === q)) eta.push({ at: q, frame: p.done, predictedS: +(p.etaMs / 1000).toFixed(1), elapsed: performance.now() - t0 }); } });
				const totalMs = performance.now() - t0;
				for (const e of eta) { e.actualS = +((totalMs - e.elapsed) / 1000).toFixed(1); delete e.elapsed; }
				row[layerCache ? 'cache' : 'full'] = { totalS: +(r.ms / 1000).toFixed(1), renderS: +(r.renderMs / 1000).toFixed(1), encodeS: +(r.encodeMs / 1000).toFixed(1), frames: r.frames, repaints: r.repaints, work: r.work, mb: +(r.blob.size / 1e6).toFixed(1), eta };
			}
			row.speedup = +(row.full.totalS / row.cache.totalS).toFixed(2);
			out[f] = row;
		}
		return out;
	};

	window.__timelapse = async ({ source = 'autosave', framing, long = 1080, duration = 15, fps = 15, background = 'paper', layer, download = true } = {}) => {
		const m = await mod();
		let payload;
		if (source === 'autosave') {
			const db = await new Promise((res, rej) => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => res(r.result); r.onerror = rej; });
			payload = await new Promise((res, rej) => { const r = db.transaction('keyval').objectStore('keyval').get('diorame-autosave-v1'); r.onsuccess = () => res(r.result); r.onerror = rej; });
			if (!payload) throw new Error('No autosave yet: draw something (or pass source: "/path/file.dior")');
		} else payload = await (await fetch(source)).json();
		const st = m.C.appReducer(m.C.initialState, { type: 'LOAD_PROJECT', payload });
		const o = await options(st, layer);
		const fr = framing ?? (st.format ? 'format' : 'drawing');
		const rect = m.T.timelapseRect(o.state, fr, { w: innerWidth, h: innerHeight });
		if (!rect) throw new Error(`Nothing to frame with "${fr}"`);
		const size = m.T.timelapseSize(rect, long);
		console.log(`[timelapse] ${st.shapes.length} shapes (${st.shapes.filter(s => s.t !== undefined).length} with t) · ${fr} · ${size.width}×${size.height} · ${duration}+2.5 s · ${background}`);
		let shown = 0;
		const r = await m.T.renderTimelapse(o, { rect, ...size, background, duration, fps, onProgress: (q) => { const p = Math.floor(q.fraction * 10); if (p > shown) { shown = p; console.log(`[timelapse] ${p * 10} %` + (q.etaMs !== null ? ` · ~${Math.ceil(q.etaMs / 1000)} s` : '')); } } });
		const url = URL.createObjectURL(r.blob);
		if (download) { const a = document.createElement('a'); a.href = url; a.download = `${st.projectName || 'diorame'} timelapse.mp4`.replace(/[\\/:*?"<>|]/g, ''); document.body.appendChild(a); a.click(); a.remove(); }
		const box = document.createElement('div');
		box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center';
		box.innerHTML = `<video src="${url}" controls autoplay loop playsinline style="max-width:90vw;max-height:90vh"></video>`;
		box.onclick = (e) => { if (e.target === box) { box.remove(); } };
		document.body.appendChild(box);
		const summary = { codec: r.codec, size: `${size.width}x${size.height}`, frames: r.frames, repaints: r.repaints, seconds: +(r.ms / 1000).toFixed(1), mb: +(r.blob.size / 1e6).toFixed(1) };
		console.log('[timelapse] done (click outside the video to close)', summary);
		return summary;
	};
})();
