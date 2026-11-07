// Pixel-art brush-tap globalAlpha leak (fixed in v3.25.15) — self-contained regression check, no baseline needed.
// In the dev page (npm run dev → localhost:3000), inject this file and run: await __alphaLeakCheck()
// A pixel-art brush tap (blob dot, ≤ 3 points) used to return after setting globalAlpha = the layer's opacity, which
// leaked into the layer's pixel-art copy ('copy' under that alpha) and into the next layer on the shared aux canvas.
// Every case renders the same scene with the tap painted LAST and FIRST: both orders must give alpha 255 and 0 px.
window.__alphaLeakCheck = async () => {
	const C = await import('/src/components/strata/StrataContext.tsx');
	const D = await import('/src/components/strata/canvas/drawSnapshot.ts');
	await document.fonts.load('700 40px "Inter"');
	const base = C.appReducer(C.initialState, { type: 'LOAD_PROJECT', payload: { shapes: [] } });
	const fxOff = Object.fromEntries(Object.keys(base.postProcessingEnabled).map(k => [k, false]));
	const seed = () => { let s = 5; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
	const real = Math.random;
	const render = (byZ, sortedZs, camZ, spacing) => {
		const shapes = sortedZs.flatMap(z => byZ.get(z));
		const st = { ...base, shapes, totalLayers: sortedZs.length, mode: 'cinematic', fxMasterEnabled: true, focalLength: 800, viewZoomOffset: 0, layerSpacingFactor: spacing,
			postProcessingEnabled: { ...fxOff, pixelArt: true }, postProcessing: { ...base.postProcessing, pixelArtSize: 4 } };
		seed();
		try {
			const r = D.renderSnapshot({ state: st, shapesByZ: byZ, sortedZs, waypoints: [], camera: { x: 0, y: 0, z: camZ, rotation: 0 }, w: 800, h: 600,
				paperImg: null, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null, getActiveZ: i => i * -150 }, 1);
			return r.layers.getContext('2d').getImageData(0, 0, 800, 600).data;
		} finally { Math.random = real; }
	};
	const stats = (d) => { let n = 0, mx = 0, mn = 255; for (let i = 3; i < d.length; i += 4) if (d[i]) { n++; if (d[i] > mx) mx = d[i]; if (d[i] < mn) mn = d[i]; } return { inkPx: n, minAlpha: n ? mn : 0, maxAlpha: mx }; };
	const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) n++; return n; };
	const sq = { id: 'sq', points: [{ x: -200, y: -150 }, { x: 200, y: -150 }, { x: 200, y: 150 }, { x: -200, y: 150 }], color: '#e0457b', zIndex: 0 };
	const tp = { id: 'tp', points: [{ x: 300, y: 200 }, { x: 301.5, y: 201.5 }, { x: 298.5, y: 201.5 }], color: '#e0457b', zIndex: 0 };
	// Layer 0 off screen (still painted, ends with the tap) + a text-only layer 1 nearer the camera.
	const sqOff = { ...sq, points: [{ x: -900, y: -900 }, { x: -860, y: -900 }, { x: -860, y: -860 }, { x: -900, y: -860 }] };
	const tpOff = { ...tp, points: [{ x: -880, y: -880 }, { x: -878.5, y: -878.5 }, { x: -881.5, y: -878.5 }] };
	const tx = { id: 'tx', type: 'text', text: 'CAPA 2', font: 'pharma', fontSize: 16, align: 'center', points: [{ x: 0, y: 0 }], color: '#223d57', zIndex: -150 };
	const cases = [
		// camera z 650 → layer 0 at FL + dz = 150 → opacity 0.5; z 700 → 100 → 0.25
		['same layer · opacity 0.5', (order) => render(new Map([[0, order === 'last' ? [sq, tp] : [tp, sq]]]), [0], 650, 1)],
		['same layer · opacity 0.25', (order) => render(new Map([[0, order === 'last' ? [sq, tp] : [tp, sq]]]), [0], 700, 1)],
		['next layer (text only)', (order) => render(new Map([[0, order === 'last' ? [sqOff, tpOff] : [tpOff, sqOff]], [-150, [tx]]]), [0, -150], 650, 0.1)],
	];
	const out = {};
	let pass = true;
	for (const [name, fn] of cases) {
		const last = fn('last'), first = fn('first');
		const sl = stats(last), sf = stats(first), d = diff(last, first);
		const ok = d === 0 && sl.inkPx > 0 && sl.minAlpha === 255 && sf.minAlpha === 255;
		if (!ok) pass = false;
		out[name] = { pass: ok, diffPx: d, tapLast: sl, tapFirst: sf };
	}
	return { pass, cases: out };
};
