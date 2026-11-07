// DRAW timelapse (v3.25.17). Inject in the dev page (localhost:3000) with a <script src="/tools/draw-stress/harness/timelapse.js">.
//   await __timelapseCheck()        → engine checks (no download): last frame = the PNG export, merged-layer ordering, MP4 metadata.
//   await __timelapseTiming()       → 30 s timelapse (975 frames, 1080 × 1920) of the stress scenes and the example: times.
//   await __timelapse({ ... })      → YOUR drawing as an MP4 (downloads it and plays it on the page). Options:
//        source: 'autosave' (default: the drawing open in the app, as last autosaved) or a .dior URL
//        framing: 'format' (default when the drawing has a frame) | 'drawing'      long: 1080 (default) | 1920
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
	const options = async (st, layer) => {
		const L = layer ?? st.currentLayerIndex;
		const camera = { x: 0, y: 0, z: L * -150, rotation: 0 };
		const byZ = new Map();
		for (const s of st.shapes) { if (!byZ.has(s.zIndex)) byZ.set(s.zIndex, []); byZ.get(s.zIndex).push(s); }
		return { state: { ...st, mode: 'drawing', currentLayerIndex: L, camera }, shapesByZ: byZ, sortedZs: [...byZ.keys()].sort((a, b) => b - a), waypoints: [], camera,
			w: 1366, h: 1024, paperImg: await paper, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null, getActiveZ: (i) => i * -150 };
	};
	const pixels = (cv) => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
	const hash = async (px) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
	const diff = (a, b) => { if (a.length !== b.length) return -1; let d = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++; return d; };
	const videoMeta = (blob) => new Promise((res) => { const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.onloadedmetadata = () => { res({ w: v.videoWidth, h: v.videoHeight, s: +v.duration.toFixed(3) }); URL.revokeObjectURL(v.src); }; v.onerror = () => res({ error: true }); v.src = URL.createObjectURL(blob); });
	const load = async (C, url) => C.appReducer(C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch(url)).json() });

	// The last encoded frame against the PNG export of the same framing, size and seed (renderRectSnapshot).
	// Also frame 30 (mid drawing) against the PNG of ITS scene: the texture holds along the whole video, not only at the end.
	const lastFrameVsPng = async (m, o, rect, size, background, extra = {}) => {
		let last = null, mid = null;
		const r = await m.T.renderTimelapse(o, { rect, ...size, background, duration: 2, seed: 4242, inspect: (i, cv) => { const px = new Uint8ClampedArray(pixels(cv)); last = px; if (i === 30) mid = px; }, ...extra });
		const png = (scene) => { const real = Math.random; Math.random = seeded(4242); try { return pixels(m.F.renderRectSnapshot({ ...o, ...scene }, rect, size.width, size.height, background)); } finally { Math.random = real; } };
		const ref = png({});
		const { rank, count } = m.S.appearanceRanks(o.state.shapes, m.S.paintsLayer(o.state));
		const midRef = png(m.S.sceneAt(o.state.shapes, rank, m.S.shapesAtFrame(30, count, 60)));
		return { size: `${size.width}x${size.height}`, frames: r.frames, repaints: r.repaints, codec: r.codec, mb: +(r.blob.size / 1e6).toFixed(2), video: await videoMeta(r.blob),
			diffPx: diff(last, ref) + (mid ? diff(mid, midRef) : -1), lastDiffPx: diff(last, ref), midDiffPx: mid ? diff(mid, midRef) : 'no frame 30', hash: await hash(last), pngHash: await hash(ref), last, ref };
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
		return s;
	};

	window.__timelapseCheck = async () => {
		const m = await mod();
		const out = {};
		const ex = await load(m.C, '/examples/diorame_onboarding.dior');
		const s2000 = await load(m.C, '/tools/draw-stress/out/stress-2000-6L.dior');
		for (const [name, st, L, bg] of [['example-L3-solid', ex, 3, 'solid'], ['example-L3-paper', ex, 3, 'paper'], ['s2000x6-L2-solid', s2000, 2, 'solid']]) {
			const o = await options(st, L);
			const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
			const r = await lastFrameVsPng(m, o, rect, m.T.timelapseSize(rect, 1080), bg);
			delete r.last; delete r.ref;
			out[name] = r;
		}
		// Merged layer: t decides when, the array decides how.
		const ms = await mergedScene(m.C);
		const o = await options(ms, 0);
		const ids = ms.shapes.map(x => x.id);
		const { rank } = m.S.appearanceRanks(ms.shapes, m.S.paintsLayer(o.state));
		const appearance = [...ids].sort((a, b) => rank[ids.indexOf(a)] - rank[ids.indexOf(b)]);
		const at4 = m.S.sceneAt(ms.shapes, rank, 4).shapesByZ.get(0).map(x => x.id);
		const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
		const size = m.T.timelapseSize(rect, 1080);
		const r = await lastFrameVsPng(m, o, rect, size, 'solid');
		// Self-check (must FAIL): painting in t order instead of array order changes the final frame.
		const byT = { ...ms, shapes: appearance.map(id => ms.shapes[ids.indexOf(id)]) };
		const oT = await options(byT, 0);
		const real = Math.random; Math.random = seeded(4242);
		let wrong; try { wrong = pixels(m.F.renderRectSnapshot(oT, rect, size.width, size.height, 'solid')); } finally { Math.random = real; }
		out.merged = {
			arrayOrder: ids.join(' '), appearanceOrder: appearance.join(' '), paintedAtK4: at4.join(' '),
			groupOnA: ms.shapes.filter(x => x.group).map(x => x.id).join(' '),
			lastFrameVsPng_diffPx: r.diffPx, video: r.video, frames: r.frames,
			selfCheck_tOrderPainting_diffPx: diff(wrong, r.ref),
		};
		// Self-check (must FAIL): two renders of the same scene in one session WITHOUT the per-render seed differ — the
		// half-pixel rect re-creates the ink texture on every render. This is the flicker the engine's seed prevents.
		const fl = m.F.createRectSession(o, rect, size.width, size.height, 'solid');
		const full = m.S.sceneAt(ms.shapes, rank, ms.shapes.length);
		const f1 = new Uint8ClampedArray(pixels(fl.render(full)));
		const f2 = pixels(fl.render(full));
		fl.release();
		out.merged.selfCheck_unseededRerender_diffPx = diff(f1, f2);
		out.pass = Object.values(out).every(v => typeof v !== 'object' || (v.diffPx ?? v.lastFrameVsPng_diffPx) === 0)
			&& out.merged.selfCheck_tOrderPainting_diffPx > 0
			&& out.merged.selfCheck_unseededRerender_diffPx > 0
			&& out.merged.appearanceOrder === 'B1 A1 A2 A3 B2 C1 C2'
			&& out.merged.paintedAtK4 === 'B1 A1 A2 A3';
		return out;
	};

	window.__timelapseTiming = async (files = ['stress-500-1L', 'stress-2000-6L', 'example']) => {
		const m = await mod();
		const out = {};
		for (const f of files) {
			const st = await load(m.C, f === 'example' ? '/examples/diorame_onboarding.dior' : `/tools/draw-stress/out/${f}.dior`);
			const o = await options(st, f === 'example' ? 3 : 0);
			const rect = m.T.timelapseRect(o.state, 'drawing', { w: 1366, h: 1024 });
			const r = await m.T.renderTimelapse(o, { rect, width: 1080, height: 1920, background: 'paper', duration: 30 });
			out[f] = { shapes: r.shapes, frames: r.frames, repaints: r.repaints, totalS: +(r.ms / 1000).toFixed(1), renderS: +(r.renderMs / 1000).toFixed(1),
				encodeWaitS: +(r.encodeMs / 1000).toFixed(1), msPerFrame: +(r.ms / r.frames).toFixed(1), mb: +(r.blob.size / 1e6).toFixed(1), codec: r.codec, video: await videoMeta(r.blob) };
		}
		return out;
	};

	window.__timelapse = async ({ source = 'autosave', framing, long = 1080, duration = 15, background = 'paper', layer, download = true } = {}) => {
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
		const r = await m.T.renderTimelapse(o, { rect, ...size, background, duration, onProgress: (d, t) => { const p = Math.floor(d / t * 10); if (p > shown) { shown = p; console.log(`[timelapse] ${p * 10} %`); } } });
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
