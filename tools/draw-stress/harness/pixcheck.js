// Render pixel harness (v3.25.6, option 3): 7 DRAW cases through renderDrawSnapshot, seeded Math.random. Needs the scenes from generate.mjs.
// __pixcheck("before") stores pixels + CPU in IndexedDB; __pixcheck("after") compares (diffPx, hash) and reports CPU before/after.
// Pixel + CPU harness for the option-3 refactor. Run in the dev page; label = 'before' | 'after'.
window.__pixcheck = async (label) => {
	const C = await import('/src/components/strata/StrataContext.tsx');
	const D = await import('/src/components/strata/canvas/drawSnapshot.ts');
	const scenes = {};
	const load = async (url) => {
		const json = await (await fetch(url)).json();
		return C.appReducer(C.initialState, { type: 'LOAD_PROJECT', payload: json });
	};
	scenes.ex = await load('/examples/diorame_onboarding.dior');
	scenes.s2000 = await load('/tools/draw-stress/out/stress-2000-6L.dior');
	scenes.s500 = await load('/tools/draw-stress/out/stress-500-1L.dior');
	const cases = [
		['ex-light-L0', 'ex', false, 0, 1, { x: 0, y: 0 }, 'solid', 1],
		['ex-dark-L3', 'ex', true, 3, 0.8, { x: 120, y: -60 }, 'solid', 1],
		['ex-light-HQ2-L5', 'ex', false, 5, 1.1, { x: -40, y: 30 }, 'solid', 2],
		['s2000-light-L2', 's2000', false, 2, 1.3, { x: -200, y: 100 }, 'solid', 1],
		['s2000-dark-L2-transp', 's2000', true, 2, 1.3, { x: -200, y: 100 }, 'transparent', 1],
		['s500-light', 's500', false, 0, 0.6, { x: 0, y: 0 }, 'solid', 1],
		['s500-dark', 's500', true, 0, 2, { x: 300, y: 200 }, 'solid', 1],
	];
	const seedRandom = () => { let s = 12345; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
	const realRandom = Math.random;
	const opts = (sc, dark, L, zoom, pan) => {
		const st = scenes[sc];
		const camera = { x: 0, y: 0, z: L * -150, rotation: 0 };
		const byZ = new Map();
		for (const s of st.shapes) { if (!byZ.has(s.zIndex)) byZ.set(s.zIndex, []); byZ.get(s.zIndex).push(s); }
		return {
			state: { ...st, isDarkMode: dark, currentLayerIndex: L, camera, drawingZoom: zoom, drawingPan: pan },
			shapesByZ: byZ, sortedZs: [...byZ.keys()].sort((a, b) => b - a), waypoints: [], camera,
			w: 1366, h: 1024, paperImg: null, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null,
			getActiveZ: (i) => i * -150,
		};
	};
	const results = {};
	for (const [name, sc, dark, L, zoom, pan, bg, scale] of cases) {
		seedRandom();
		const cv = D.renderDrawSnapshot(opts(sc, dark, L, zoom, pan), scale, bg);
		const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
		Math.random = realRandom;
		const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
		let ink = 0; for (let i = 3; i < px.length; i += 4) if (bg === 'transparent' ? px[i] > 0 : px[i - 1] !== (dark ? 0 : 255)) ink++;
		results[name] = { w: cv.width, h: cv.height, hash, ink, px };
	}
	// CPU: median of 7 renders per scene (render only, no readback)
	const cpu = {};
	for (const [name, sc, L, zoom, pan] of [['ex', 'ex', 0, 1, { x: 0, y: 0 }], ['s2000-6L', 's2000', 2, 1, { x: 0, y: 0 }], ['s500-1L', 's500', 0, 1, { x: 0, y: 0 }]]) {
		const o = opts(sc, false, L, zoom, pan); const ts = [];
		for (let i = 0; i < 7; i++) { const t0 = performance.now(); D.renderDrawSnapshot(o, 1, 'solid'); ts.push(performance.now() - t0); }
		ts.sort((a, b) => a - b); cpu[name] = +ts[3].toFixed(1);
	}
	// persist / compare
	const db = await new Promise((res, rej) => { const r = indexedDB.open('pixcheck', 1); r.onupgradeneeded = () => r.result.createObjectStore('runs'); r.onsuccess = () => res(r.result); r.onerror = rej; });
	const put = (k, v) => new Promise((res, rej) => { const tx = db.transaction('runs', 'readwrite'); tx.objectStore('runs').put(v, k); tx.oncomplete = res; tx.onerror = rej; });
	const get = (k) => new Promise((res, rej) => { const r = db.transaction('runs').objectStore('runs').get(k); r.onsuccess = () => res(r.result); r.onerror = rej; });
	const store = {}; for (const k in results) store[k] = { ...results[k], px: results[k].px.buffer.slice(0) };
	await put(label, { results: store, cpu });
	const summary = { label, cpu, cases: {} };
	const other = label === 'after' ? await get('before') : null;
	for (const k in results) {
		const r = results[k]; const row = { size: `${r.w}x${r.h}`, hash: r.hash, inkPx: r.ink };
		if (other && other.results[k]) {
			const a = new Uint8Array(other.results[k].px), b = r.px; let diff = 0;
			if (a.length !== b.length) diff = -1; else for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff++;
			row.diffPx = diff; row.beforeHash = other.results[k].hash;
		}
		summary.cases[k] = row;
	}
	if (other) summary.cpuBefore = other.cpu;
	return summary;
};
