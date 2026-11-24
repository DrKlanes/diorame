// Flat front view harness (v3.26.73, docs/flat-view-proposal.md §7). Inject in the dev page and call from the console:
//
//   await __flatCheck()               the 7 pixcheck cases rendered as DRAW and as CINEMA «Plana» (FX master off, a CINEMA
//                                     camera that is NOT DRAW's, R2): 0 px and the same SHA-256. Self-test: the same with
//                                     'forward' must differ in every case. → { pass, cases, selfTest }
//   await __cinemaHash('before'|'after')  seeded renders of non-flat CINEMA (forward, orbit, storytelling, arc, zoom; FX on,
//                                     grain off; anim with and without flat Z; HQ ×2). 'after' compares with 'before'.
//   await __diorRenderHash('before'|'after')  renderDior of dior-render.js (the Lab's contract) on the example scene.
//
// Pixels are read from CPU-backed canvases only through the same procedure on both sides (CLAUDE.md: same backend,
// fresh page). Storage: IndexedDB 'pixcheck' (shared with pixcheck.js), keys prefixed 'flat:'.
(() => {
	const seed = (n) => { let s = n; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
	const realRandom = Math.random;
	const sha = async (px) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].map(b => b.toString(16).padStart(2, '0')).join('');
	const pixels = (cv) => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
	const diffPx = (a, b) => {
		if (a.length !== b.length) return -1;
		let d = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++;
		return d;
	};
	const db = () => new Promise((res, rej) => { const r = indexedDB.open('pixcheck', 1); r.onupgradeneeded = () => r.result.createObjectStore('runs'); r.onsuccess = () => res(r.result); r.onerror = rej; });
	const put = async (k, v) => { const d = await db(); await new Promise((res, rej) => { const tx = d.transaction('runs', 'readwrite'); tx.objectStore('runs').put(v, k); tx.oncomplete = res; tx.onerror = rej; }); };
	const get = async (k) => { const d = await db(); return new Promise((res, rej) => { const r = d.transaction('runs').objectStore('runs').get(k); r.onsuccess = () => res(r.result); r.onerror = rej; }); };
	const modules = async () => ({
		C: await import('/src/components/strata/StrataContext.tsx'),
		D: await import('/src/components/strata/canvas/drawSnapshot.ts'),
	});
	const loader = (C) => async (url) => C.appReducer(C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch(url)).json() });
	const byZ = (st) => {
		const m = new Map();
		for (const s of st.shapes) { if (!m.has(s.zIndex)) m.set(s.zIndex, []); m.get(s.zIndex).push(s); }
		return { shapesByZ: m, sortedZs: [...m.keys()].sort((a, b) => b - a) };
	};
	const opts = (st, camera) => ({
		state: { ...st, camera }, ...byZ(st), waypoints: [], camera,
		w: 1366, h: 1024, paperImg: null, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null,
		getActiveZ: (i) => i * -150,
	});
	// The 7 cases of pixcheck.js: [name, scene, dark, layer, zoom, pan, background, scale]
	const CASES = [
		['ex-light-L0', 'ex', false, 0, 1, { x: 0, y: 0 }, 'solid', 1],
		['ex-dark-L3', 'ex', true, 3, 0.8, { x: 120, y: -60 }, 'solid', 1],
		['ex-light-HQ2-L5', 'ex', false, 5, 1.1, { x: -40, y: 30 }, 'solid', 2],
		['s2000-light-L2', 's2000', false, 2, 1.3, { x: -200, y: 100 }, 'solid', 1],
		['s2000-dark-L2-transp', 's2000', true, 2, 1.3, { x: -200, y: 100 }, 'transparent', 1],
		['s500-light', 's500', false, 0, 0.6, { x: 0, y: 0 }, 'solid', 1],
		['s500-dark', 's500', true, 0, 2, { x: 300, y: 200 }, 'solid', 1],
	];

	window.__flatCheck = async () => {
		const { C, D } = await modules();
		const load = loader(C);
		const scenes = {
			ex: await load('/examples/diorame_onboarding.dior'),
			s2000: await load('/tools/draw-stress/out/stress-2000-6L.dior'),
			s500: await load('/tools/draw-stress/out/stress-500-1L.dior'),
		};
		const run = async (type) => {
			const out = {};
			for (const [name, sc, dark, L, zoom, pan, bg, scale] of CASES) {
				const st = { ...scenes[sc], isDarkMode: dark, currentLayerIndex: L, drawingZoom: zoom, drawingPan: pan };
				seed(12345);
				const a = pixels(D.renderDrawSnapshot(opts(st, { x: 0, y: 0, z: L * -150, rotation: 0 }), scale, bg));
				Math.random = realRandom;
				// CINEMA: the camera the mode switch leaves (z 500) moved off-axis and rolled — Plana must not read it.
				const cin = { ...st, mode: 'cinematic', cinematicType: type, fxMasterEnabled: false };
				seed(12345);
				const b = pixels(D.renderDrawSnapshot(opts(cin, { x: 300, y: -200, z: 500, rotation: 0.3 }), scale, bg));
				Math.random = realRandom;
				const ha = await sha(a), hb = await sha(b);
				out[name] = { diffPx: diffPx(a, b), drawHash: ha.slice(0, 16), cinemaHash: hb.slice(0, 16), sameHash: ha === hb };
			}
			return out;
		};
		const cases = await run('flat');
		const selfTest = await run('forward');
		const flatOk = Object.values(cases).every(r => r.diffPx === 0 && r.sameHash);
		const selfFails = Object.values(selfTest).every(r => r.diffPx !== 0 && !r.sameHash);
		return { pass: flatOk && selfFails, flatOk, selfTestFailsAsItShould: selfFails, cases, selfTest };
	};

	window.__cinemaHash = async (label) => {
		const { C, D } = await modules();
		const load = loader(C);
		const ex = await load('/examples/diorame_onboarding.dior');
		const s500 = await load('/tools/draw-stress/out/stress-500-6L.dior');
		const on = (st, extra) => ({
			...st, mode: 'cinematic', fxMasterEnabled: true,
			postProcessingEnabled: { ...Object.fromEntries(Object.keys(st.postProcessingEnabled).map(k => [k, false])), ...extra },
			postProcessing: { ...st.postProcessing, vignette: 0.6, glow: 0.5, dof: 0.7, fog: 0.6, wiggle: 0.6, chromaticAberration: 0.5, distortion: 0.4, focusDist: 900, pixelArtSize: 5 },
		});
		const fx = { vignette: true, glow: true, dof: true, fog: true, wiggle: true, chromaticAberration: true };
		const cam = { x: 30, y: -12, z: 480, rotation: 0.05 };
		const cases = [
			['forward-fx', { ...on(ex, fx), cinematicType: 'forward' }, cam, 1],
			['orbit-fx', { ...on(ex, fx), cinematicType: 'orbit' }, { x: 260, y: 140, z: -300, rotation: 0 }, 1],
			['storytelling-fx', { ...on(ex, fx), cinematicType: 'storytelling', currentLayerIndex: 2 }, cam, 1],
			['arc-fx-distortion', { ...on(ex, { ...fx, distortion: true }), cinematicType: 'arc' }, cam, 1],
			['zoom-pixelart', { ...on(s500, { pixelArt: true, fog: true }), cinematicType: 'zoom' }, cam, 1],
			['forward-fx-HQ2', { ...on(ex, fx), cinematicType: 'forward' }, cam, 2],
			['forward-anim-depth', { ...on(ex, fx), cinematicType: 'forward', isAnimationMode: true, isAnimationFlatZ: false, currentLayerIndex: 3 }, cam, 1],
			['forward-anim-flatZ', { ...on(ex, fx), cinematicType: 'forward', isAnimationMode: true, isAnimationFlatZ: true, currentLayerIndex: 3 }, cam, 1],
			['flat-fx', { ...on(ex, fx), cinematicType: 'flat', currentLayerIndex: 2, drawingZoom: 1.2, drawingPan: { x: 40, y: -30 } }, cam, 1],
			['flat-anim-fx', { ...on(ex, fx), cinematicType: 'flat', isAnimationMode: true, currentLayerIndex: 3 }, cam, 1],
		];
		const results = {};
		for (const [name, st, camera, scale] of cases) {
			seed(777);
			const px = pixels(D.renderSnapshot(opts({ ...st, isOnionSkinEnabled: false }, camera), scale).canvas);
			Math.random = realRandom;
			results[name] = { hash: (await sha(px)).slice(0, 16), px: px.buffer.slice(0) };
		}
		await put(`flat:cinema:${label}`, results);
		const other = label === 'after' ? await get('flat:cinema:before') : null;
		const summary = {};
		for (const k in results) {
			summary[k] = { hash: results[k].hash };
			if (other?.[k]) { summary[k].beforeHash = other[k].hash; summary[k].diffPx = diffPx(new Uint8Array(other[k].px), new Uint8Array(results[k].px)); }
		}
		return summary;
	};

	// Distortion in the flat view (v3.26.80): with a Formato frame, the PNG Formato must equal pixel for pixel the frame's
	// content on screen (the screen re-rendered without the guide, cropped). docs/flat-view-proposal.md §13.4 explains the
	// set-up, measured before writing the feature:
	// - Math.random is a CONSTANT, not seeded: the resize branch consumes ceil(w/2)·ceil(h/2) randoms before the ink texture
	//   (consumeNoiseRandoms), so canvases of different sizes draw different textures from one seed (121 247 px apart).
	// - every 2D context on the CPU rasterizer (willReadFrequently, as timelapse.js's onCpu): GPU/CPU antialiasing differs.
	// - the frame's corner at (0, 0) on screen, as in the PNG: the rasterizer works in float32 at absolute positions, and the
	//   same curve at x + 556 or x + 300 antialiases differently in the last bits (136 px, ≤ 7 levels, in plain DRAW).
	// - only the strokes that fall wholly inside the frame (60 px margin, so the pincushion cannot push them out): a stroke
	//   that crosses a canvas edge is clipped differently by the screen and the PNG, and Skia's antialiasing follows the clip
	//   (1 610 px, ≤ 24 levels, in plain DRAW). The full scene is still measured and reported against DRAW's own floor.
	// The frame stays far from the viewport's centre (240, 300 vs 683, 512), so a distortion centred on the viewport fails.
	// Controls: distortion OFF must give 0 px (the comparison is sound); ON must differ from OFF (the distortion is there);
	// self-test: the screen without the frame in its state (centred on the viewport) must differ from the PNG.
	window.__flatDistortCheck = async () => {
		const { C, D } = await modules();
		const F = await import('/src/components/strata/canvas/formatSnapshot.ts');
		const ex = await loader(C)('/examples/diorame_onboarding.dior');
		const W = 1366, H = 1024, rect = { x: -300, y: -360, w: 480, h: 600 }, M = 60;
		const format = { type: '4:5', orientation: 'portrait', rect };
		const cam = { x: 0, y: 0, z: 0, rotation: 0 };
		const k = (z) => 10000 / (10000 + z); // DRAW's layer scale seen from layer 0
		const inside = ex.shapes.filter(s => s.points.every(p => p.x * k(s.zIndex) > rect.x + M && p.x * k(s.zIndex) < rect.x + rect.w - M
			&& p.y * k(s.zIndex) > rect.y + M && p.y * k(s.zIndex) < rect.y + rect.h - M));
		const state = (shapes, on, d) => ({
			...ex, shapes, mode: 'cinematic', cinematicType: 'flat', currentLayerIndex: 0, fxMasterEnabled: true, format,
			postProcessingEnabled: { ...Object.fromEntries(Object.keys(ex.postProcessingEnabled).map(k => [k, false])), distortion: on },
			postProcessing: { ...ex.postProcessing, distortion: d },
			drawingZoom: 1, drawingPan: { x: -W / 2 - rect.x, y: -H / 2 - rect.y },
		});
		const P = HTMLCanvasElement.prototype, realGet = P.getContext;
		P.getContext = function (type, attrs) { return type === '2d' ? realGet.call(this, type, { ...(attrs || {}), willReadFrequently: true }) : realGet.call(this, type, attrs); };
		Math.random = () => 0.5;
		try {
			const crop = (st) => D.renderDrawSnapshot({ ...opts(st, cam), w: W, h: H }, 1, 'paper').getContext('2d').getImageData(0, 0, rect.w, rect.h).data;
			const exported = (st) => pixels(F.renderFormatSnapshot({ ...opts(st, cam), w: W, h: H }, format, rect.w, rect.h, 'paper'));
			const out = { strokesInside: inside.length };
			for (const d of [0.6, -0.5, 1, 1.6]) { const st = state(inside, true, d); out[`on ${d}`] = diffPx(crop(st), exported(st)); }
			out.off = diffPx(crop(state(inside, false, 0.6)), exported(state(inside, false, 0.6)));
			out.onVsOff = diffPx(crop(state(inside, true, 0.6)), crop(state(inside, false, 0.6)));
			out.selfTestNoFrameOnScreen = diffPx(crop({ ...state(inside, true, 0.6), format: null }), exported(state(inside, true, 0.6)));
			// Informative: the whole scene (2 369 strokes) against DRAW's own screen-vs-PNG floor.
			const drawFloor = (() => { const st = { ...state(ex.shapes, false, 0), mode: 'drawing' }; return diffPx(crop(st), exported(st)); })();
			out.fullScene = { drawFloor, flatOff: diffPx(crop(state(ex.shapes, false, 0.6)), exported(state(ex.shapes, false, 0.6))), flatOn06: diffPx(crop(state(ex.shapes, true, 0.6)), exported(state(ex.shapes, true, 0.6))) };
			const pass = out['on 0.6'] === 0 && out['on -0.5'] === 0 && out['on 1'] === 0 && out['on 1.6'] === 0 && out.off === 0 && out.onVsOff > 0 && out.selfTestNoFrameOnScreen > 0;
			return { pass, ...out };
		} finally { P.getContext = realGet; Math.random = realRandom; }
	};

	// Animation in the flat view (v3.26.76): the same square on 5 layers = 5 flipbook frames. With fog and DoF on, every
	// frame must come out identical (no flicker on playback). Controls: CINEMA 'forward' with flat Z (already uniform) must
	// pass too; 'forward' with real depth must flicker (self-test). Extra FX / settings can be passed (v3.26.80: distortion).
	window.__flatAnimCheck = async (extraFx = {}, extraPp = {}) => {
		const { C, D } = await modules();
		let st = { ...C.initialState, isWelcomeModalOpen: false };
		for (let i = 1; i < 5; i++) st = C.appReducer(st, { type: 'ADD_LAYER' });
		for (let i = 0; i < 5; i++) {
			st = C.appReducer(st, { type: 'ADD_SHAPE', payload: { id: `sq${i}`, color: '#222222', zIndex: i * -150 || 0, isEraser: false, isDrawInside: false, isDrawBehind: false,
				points: [{ x: -200, y: -150 }, { x: 200, y: -150 }, { x: 200, y: 150 }, { x: -200, y: 150 }] } });
		}
		const fx = { ...Object.fromEntries(Object.keys(st.postProcessingEnabled).map(k => [k, false])), fog: true, dof: true, vignette: true, ...extraFx };
		const base = { ...st, mode: 'cinematic', isAnimationMode: true, fxMasterEnabled: true, postProcessingEnabled: fx,
			postProcessing: { ...st.postProcessing, fog: 0.8, dof: 0.8, vignette: 0.5, focusDist: 600, ...extraPp }, drawingZoom: 0.8, drawingPan: { x: 0, y: 0 } };
		const frames = async (extra) => {
			const out = [];
			for (let L = 0; L < 5; L++) {
				seed(55);
				out.push(pixels(D.renderSnapshot(opts({ ...base, ...extra, currentLayerIndex: L }, { x: 0, y: 0, z: 500, rotation: 0 }), 1).canvas));
				Math.random = realRandom;
			}
			return out.slice(1).map(f => diffPx(out[0], f));
		};
		const flat = await frames({ cinematicType: 'flat', isAnimationFlatZ: false });
		const forwardFlatZ = await frames({ cinematicType: 'forward', isAnimationFlatZ: true });
		const forwardDepth = await frames({ cinematicType: 'forward', isAnimationFlatZ: false });
		const flatOk = flat.every(d => d === 0);
		const selfTest = forwardDepth.some(d => d !== 0);
		return { pass: flatOk && selfTest && forwardFlatZ.every(d => d === 0), flat, forwardFlatZ, forwardDepth };
	};

	window.__diorRenderHash = async (label) => {
		const R = await import('/src/dior-render.ts');
		const project = await R.parseDior(await (await fetch('/examples/diorame_onboarding.dior')).arrayBuffer());
		const frame = R.frameOf(project);
		const out = {};
		for (const [name, args] of [['w1200', { width: 1200 }], ['w800-view', { width: 800, view: { x: frame.x0 + 50, y: frame.y0 + 40, w: 600, h: 450 } }]]) {
			// Warm-up, unseeded: renderDior awaits the paper and the fonts. On the first call that wait hands the thread to the
			// live app's RAF, which draws from the seeded Math.random when it is animating (same trap as pixcheck2, v3.26.82).
			// With both cached the awaits resolve in microtasks and nothing runs between the seed and the readback.
			await R.renderDior(project, args);
			seed(4242);
			const cv = await R.renderDior(project, args);
			const px = pixels(cv);
			Math.random = realRandom;
			out[name] = { size: `${cv.width}x${cv.height}`, hash: await sha(px) };
		}
		await put(`flat:dior:${label}`, out);
		const other = label === 'after' ? await get('flat:dior:before') : null;
		if (other) for (const k in out) out[k].same = other[k]?.hash === out[k].hash;
		return { frame, ...out };
	};
})();
