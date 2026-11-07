// Extra branches for the renderLayerBody split: CINEMA wiggle + pixel art, Move preview, text. Same storage as pixcheck.js.
window.__pixcheck2 = async (label) => {
	const C = await import('/src/components/strata/StrataContext.tsx');
	const D = await import('/src/components/strata/canvas/drawSnapshot.ts');
	const load = async (url) => C.appReducer(C.initialState, { type: 'LOAD_PROJECT', payload: await (await fetch(url)).json() });
	const ex = await load('/examples/diorame_onboarding.dior');
	const tx = await load('/tools/svg-diff/fixtures/text-legacy-v3.17.55.dior');
	const s500 = await load('/tools/draw-stress/out/stress-500-6L.dior');
	const seedRandom = () => { let s = 999; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
	const realRandom = Math.random;
	const opts = (st, camera, transformState) => {
		const byZ = new Map();
		for (const s of st.shapes) { if (!byZ.has(s.zIndex)) byZ.set(s.zIndex, []); byZ.get(s.zIndex).push(s); }
		return { state: { ...st, camera }, shapesByZ: byZ, sortedZs: [...byZ.keys()].sort((a, b) => b - a), waypoints: [], camera, transformState,
			w: 1366, h: 1024, paperImg: null, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null, getActiveZ: (i) => i * -150 };
	};
	const fxOff = (st) => Object.fromEntries(Object.keys(st.postProcessingEnabled).map(k => [k, false]));
	const cinema = (st, extra) => ({ ...st, mode: 'cinematic', fxMasterEnabled: true, postProcessingEnabled: { ...fxOff(st), ...extra.on }, postProcessing: { ...st.postProcessing, ...extra.pp } });
	const cases = [
		['cinema-wiggle', opts(cinema(ex, { on: { wiggle: true }, pp: { wiggle: 0.9 } }), { x: 0, y: 0, z: 500, rotation: 0 })],
		['cinema-wiggle-pixelart', opts(cinema(s500, { on: { wiggle: true, pixelArt: true }, pp: { wiggle: 0.5, pixelArtSize: 6 } }), { x: 0, y: 0, z: 500, rotation: 0 })],
		['cinema-pixelart-taps', opts(cinema(ex, { on: { pixelArt: true }, pp: { pixelArtSize: 4 } }), { x: 0, y: 0, z: 500, rotation: 0 })],
		['draw-text-legacy', opts({ ...tx, drawingZoom: 1, drawingPan: { x: 0, y: 0 } }, { x: 0, y: 0, z: 0, rotation: 0 })],
		['draw-text-dark-L2', opts({ ...tx, isDarkMode: true, currentLayerIndex: 2, drawingZoom: 0.7, drawingPan: { x: 60, y: -30 } }, { x: 0, y: 0, z: -300, rotation: 0 })],
	];
	// Move preview: tool move, transform active on the active layer (rotate + non-uniform scale + offset)
	for (const [name, st, L] of [['draw-move-preview-ex', ex, 3], ['draw-move-preview-text', tx, 0]]) {
		const ts = { isActive: true, mode: 'scale', startP: { x: 0, y: 0 }, startTransform: { x: 0, y: 0, scale: 1, rotation: 0 }, centerX: 20, centerY: -10, layerBB: null,
			currentTransform: { x: 35, y: -18, scale: 1.1, scaleX: 1.3, scaleY: 0.8, rotation: 0.4 }, engaged: true };
		cases.push([name, { ...opts({ ...st, tool: 'move', currentLayerIndex: L, drawingZoom: 0.9, drawingPan: { x: 0, y: 0 } }, { x: 0, y: 0, z: L * -150, rotation: 0 }), transformState: ts }]);
	}
	const results = {};
	for (const [name, o] of cases) {
		seedRandom();
		// renderSnapshot builds its own idle transformState; for the Move cases render through renderFrame directly
		let cv;
		if (o.transformState) {
			const P = await import('/src/components/strata/canvas/renderPipeline.ts');
			const out = document.createElement('canvas'); const ctx = out.getContext('2d', { alpha: false });
			const mk = () => ({ current: document.createElement('canvas') });
			P.renderFrame(ctx, { ...o, isDrawing: false, currentPoints: [], cameraRef: { current: { ...o.camera } }, storyFocusRef: { current: null }, lastShakeRef: { current: { x: 0, y: 0, z: 0 } },
				transformHandlesRef: { current: null }, poiMarkerSetAtRef: { current: 0 }, drawnFrameRef: { current: null }, lastRenderTimeRef: { current: 0 },
				orbitRef: { current: { azimuth: 0, elevation: 0.2, targetAzimuth: 0, targetElevation: 0.2, panOffsetX: 0, panOffsetY: 0 } }, accumulatedTimeRef: { current: 0 },
				accumulatedHandheldTimeRef: { current: 0 }, lastTimeRef: { current: Date.now() }, wiggleFrameRef: { current: 0 }, shapePatternRef: { current: null },
				offscreenCanvasRef: mk(), helperCanvasRef: mk(), compositionCanvasRef: mk(), pixelCanvasRef: mk(), tempCanvasRef: { current: null }, noiseCanvasRef: { current: null },
				flipButtonsEl: null, skipLiveStroke: true, skipCinematicOverlays: true, renderScale: 1 });
			cv = out;
		} else {
			o.state = { ...o.state, isOnionSkinEnabled: false };
			cv = D.renderSnapshot(o, 1).canvas;
		}
		const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
		Math.random = realRandom;
		const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
		results[name] = { hash, px };
	}
	const db = await new Promise((res, rej) => { const r = indexedDB.open('pixcheck', 1); r.onupgradeneeded = () => r.result.createObjectStore('runs'); r.onsuccess = () => res(r.result); r.onerror = rej; });
	const put = (k, v) => new Promise((res, rej) => { const t = db.transaction('runs', 'readwrite'); t.objectStore('runs').put(v, k); t.oncomplete = res; t.onerror = rej; });
	const get = (k) => new Promise((res) => { const r = db.transaction('runs').objectStore('runs').get(k); r.onsuccess = () => res(r.result); });
	const store = {}; for (const k in results) store[k] = { hash: results[k].hash, px: results[k].px.buffer.slice(0) };
	await put('x-' + label, store);
	const other = label === 'after' ? await get('x-before') : null;
	const out = {};
	for (const k in results) {
		out[k] = { hash: results[k].hash };
		if (other) { const a = new Uint8Array(other[k].px), b = results[k].px; let d = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) d++; out[k].diffPx = d; out[k].beforeHash = other[k].hash; }
	}
	return out;
};
