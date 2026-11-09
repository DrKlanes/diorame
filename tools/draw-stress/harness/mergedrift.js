// Merge down vs the Formato frame (v3.25.28) — self-contained, no baseline. In the dev page (npm run dev → localhost:3000)
// inject this file and run: await __mergeDriftCheck()  → pass: true.
//
// Everything goes through the real reducer (appReducer: SET_FORMAT, NEXT_LAYER, ADD_SHAPE, MERGE_LAYER_DOWN) and the
// geometry is measured on screen with the DRAW projection of transformPoint.ts (zoom 1, pan 0): p · F / (F + z − camera.z).
// A stroke is "drawn" where the user sees its target: the active layer has scale 1, so world = screen.
//   S1   5 × (new layer → stroke along the frame → merge)            frame error must be 0
//   S2   4 layers, each along the frame from its own camera, 3→2→1→0  frame error ≤ 0.4 % of the far corner (second order)
//   S4   layer 0 bubble; on layer 1 an arrow touching the bubble and the frame corner; merge  both errors 0
//   S4c  the same arrow on layer 3, cascade 3→0                         both ≤ 0.4 % of the far corner
//   PNG  Formato export from layer 2 = from layer 0 (only layer 0 has ink): the frame crops the same region of layer 0
// Each run uses a frame centred on the origin and one far from it. Self-checks (must FAIL) put back the v3.25.27 behaviour:
// the frame on the active layer's plane, the merge's planeScale from B's camera, and the export cropping format.rect as is.
window.__mergeDriftCheck = async () => {
	const C = await import('/src/components/strata/StrataContext.tsx');
	const FF = await import('/src/utils/formatFrame.ts');
	const RC = await import('/src/constants/renderConstants.ts');
	const FS = await import('/src/components/strata/canvas/formatSnapshot.ts');
	const F = RC.DRAW_FOCAL_LENGTH, STEP = 150, R = C.appReducer;
	// Frame as seen from the camera (active plane, zoom 1). Code before v3.25.28 has no frameInView: the frame was format.rect.
	const seenNew = (st) => (FF.frameInView ? FF.frameInView(st.format, st.camera.z, st.isAnimationMode) : st.format.rect);
	const seenOld = (st) => st.format.rect;
	const corners = (r) => [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
	const proj = (p, z, camZ) => { const k = F / (F + z - camZ); return [p.x * k, p.y * k]; };
	const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
	let n = 0;
	const add = (st, tag, pts) => R(st, { type: 'ADD_SHAPE', payload: { id: `${tag}-${n++}`, tag, color: st.palette[3], zIndex: st.currentLayerIndex * -STEP, points: pts.map(([x, y]) => ({ x, y })) } });
	const onScreen = (st, tag) => { const s = st.shapes.find(x => x.tag === tag); return s.points.map(p => proj(p, s.zIndex, st.camera.z)); };
	const start = (rect) => R(R(C.initialState, { type: 'LOAD_PROJECT', payload: { shapes: [] } }), { type: 'SET_FORMAT', payload: { type: 'A', orientation: 'landscape', rect } });

	const geometry = (rect, seen) => {
		const out = {};
		// S1
		let st = start(rect);
		st = add(st, 'L0', corners(seen(st)));
		for (let c = 1; c <= 5; c++) { st = R(st, { type: 'NEXT_LAYER' }); st = add(st, `c${c}`, corners(seen(st))); st = R(st, { type: 'MERGE_LAYER_DOWN' }); }
		out.S1 = Math.max(...[1, 2, 3, 4, 5].map(c => Math.max(...onScreen(st, `c${c}`).map((p, i) => dist(p, corners(seen(st))[i])))));
		out.S1_layers = st.totalLayers;
		// S2
		st = start(rect);
		st = add(st, 'L0', corners(seen(st)));
		for (let i = 1; i <= 3; i++) { st = R(st, { type: 'NEXT_LAYER' }); st = add(st, `L${i}`, corners(seen(st))); }
		for (let i = 3; i >= 1; i--) st = R(st, { type: 'MERGE_LAYER_DOWN' });
		out.S2 = Math.max(...[1, 2, 3].map(i => Math.max(...onScreen(st, `L${i}`).map((p, j) => dist(p, corners(seen(st))[j])))));
		out.S2_layers = st.totalLayers;
		// S4 / S4c
		const bubble = { x: rect.x + rect.w * 0.9, y: rect.y + rect.h * 0.5 };
		const s4 = (top, oldMerge) => {
			let t = add(start(rect), 'bubble', [[bubble.x, bubble.y]]);
			for (let i = 1; i <= top; i++) t = R(t, { type: 'NEXT_LAYER' });
			t = add(t, 'arrow', [proj(bubble, 0, t.camera.z), corners(seen(t))[2]]);
			for (let i = top; i >= 1; i--) {
				t = R(t, { type: 'MERGE_LAYER_DOWN' });
				// Self-check: the v3.25.27 merge scaled by F/(F − STEP) (B's camera) instead of (F + STEP)/F (A's).
				if (oldMerge) t = { ...t, shapes: t.shapes.map(s => (s.tag === 'arrow' ? { ...s, points: s.points.map(p => ({ ...p, x: p.x * (F / (F - STEP)) / ((F + STEP) / F), y: p.y * (F / (F - STEP)) / ((F + STEP) / F) })) } : s)) };
			}
			const a = onScreen(t, 'arrow');
			return { bubble: dist(a[0], proj(bubble, 0, t.camera.z)), frame: dist(a[1], corners(seen(t))[2]), layers: t.totalLayers };
		};
		out.S4 = s4(1, false); out.S4c = s4(3, false); out.S4_oldMerge = s4(1, true);
		return out;
	};

	// Formato PNG from layer 2 vs from layer 0: only layer 0 has ink; seeded, transparent, same size.
	const exportCase = async (rect) => {
		let st = start(rect);
		for (const [cx, cy, r, c] of [[0.3, 0.3, 0.12, 3], [0.62, 0.45, 0.18, 8], [0.45, 0.72, 0.1, 14], [0.85, 0.2, 0.08, 18]]) {
			const x = rect.x + rect.w * cx, y = rect.y + rect.h * cy, rr = rect.h * r;
			st = R(st, { type: 'ADD_SHAPE', payload: { id: `b${c}`, color: st.palette[c], zIndex: 0, points: Array.from({ length: 48 }, (_, i) => ({ x: x + Math.cos(i / 48 * Math.PI * 2) * rr, y: y + Math.sin(i / 48 * Math.PI * 2) * rr })) } });
		}
		st = R(R(st, { type: 'NEXT_LAYER' }), { type: 'NEXT_LAYER' });
		const opts = (L) => {
			const camera = { x: 0, y: 0, z: L * -STEP, rotation: 0 };
			const byZ = new Map(); for (const s of st.shapes) { if (!byZ.has(s.zIndex)) byZ.set(s.zIndex, []); byZ.get(s.zIndex).push(s); }
			return { state: { ...st, currentLayerIndex: L, camera }, shapesByZ: byZ, sortedZs: [...byZ.keys()].sort((a, b) => b - a), waypoints: [], camera,
				w: 1366, h: 1024, paperImg: null, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null, getActiveZ: (i) => i * -STEP };
		};
		const W = 900, H = Math.round(900 / Math.SQRT2);
		const real = Math.random;
		const px = (fn) => { let s = 31; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
			try { const cv = fn(); return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; } finally { Math.random = real; } };
		// The ink's SHAPE is what the frame decides: compare alpha. The colour carries the ink grain, whose cell is renderScale px
		// (S = width / rect.w changes by 1/k from layer 2), so it differs by a few levels everywhere: reported, not judged.
		const diff = (a, b) => { let d = 0, mx = 0, ink = 0, rgb = 0; for (let i = 0; i < a.length; i += 4) { if (a[i + 3] > 0) ink++; const e = Math.abs(a[i + 3] - b[i + 3]); if (e > 8) d++; if (e > mx) mx = e;
			rgb = Math.max(rgb, Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); } return { alphaDiffPx: d, alphaMaxErr: mx, inkPx: ink, rgbMaxErr: rgb }; };
		const L0 = px(() => FS.renderFormatSnapshot(opts(0), st.format, W, H, 'transparent'));
		const L2 = px(() => FS.renderFormatSnapshot(opts(2), st.format, W, H, 'transparent'));
		// Self-check: crop format.rect as is from layer 2 (v3.25.27): layer 0 comes out ~5.7 % smaller.
		const L2old = px(() => FS.renderRectSnapshot(opts(2), st.format.rect, W, H, 'transparent'));
		return { size: `${W}x${H}`, L2_vs_L0: diff(L2, L0), selfCheck_oldCrop: diff(L2old, L0) };
	};

	const frames = { centred: { x: -600, y: -400, w: 1200, h: 1200 / Math.SQRT2 }, offset: { x: 400, y: 300, w: 1200, h: 1200 / Math.SQRT2 } };
	const out = {};
	let pass = true;
	for (const [name, rect] of Object.entries(frames)) {
		const far = Math.max(...corners(rect).map(c => Math.hypot(c[0], c[1])));
		const tol2 = 0.004 * far;   // second order: a plane change keeps the look from one camera only
		const g = geometry(rect, seenNew), old = geometry(rect, seenOld), png = await exportCase(rect);
		const ok = {
			S1: g.S1 < 0.01 && g.S1_layers === 1,
			S2: g.S2 <= tol2 && g.S2_layers === 1,
			S4: g.S4.bubble < 0.01 && g.S4.frame < 0.01,
			S4c: g.S4c.bubble <= tol2 && g.S4c.frame <= tol2,
			png: png.L2_vs_L0.alphaDiffPx <= 0.002 * png.L2_vs_L0.inkPx,
			// Self-checks: each must catch the old behaviour.
			selfCheck_frameOnActivePlane: old.S1 > 1 && old.S4.frame > 1,
			selfCheck_mergeFromB: g.S4_oldMerge.bubble > 0.05,
			selfCheck_oldCrop: png.selfCheck_oldCrop.alphaDiffPx > 20 * Math.max(1, png.L2_vs_L0.alphaDiffPx),
		};
		const r1 = (v) => +v.toFixed(3);
		out[name] = {
			rect: Object.values(rect).map(v => +v.toFixed(1)), tol2: r1(tol2),
			S1: r1(g.S1), S2: r1(g.S2), S4: { bubble: r1(g.S4.bubble), frame: r1(g.S4.frame) }, S4c: { bubble: r1(g.S4c.bubble), frame: r1(g.S4c.frame) },
			png: { size: png.size, L2_vs_L0: png.L2_vs_L0, selfCheck_oldCrop: png.selfCheck_oldCrop },
			selfChecks: { frameOnActivePlane_S1: r1(old.S1), frameOnActivePlane_S4frame: r1(old.S4.frame), mergeFromB_S4bubble: r1(g.S4_oldMerge.bubble) },
			ok,
		};
		pass = pass && Object.values(ok).every(Boolean);
	}
	out.pass = pass;
	return out;
};
