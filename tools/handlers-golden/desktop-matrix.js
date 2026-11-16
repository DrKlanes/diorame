// Desktop validation matrix of the canvas handlers (handlers sprint, v3.26.55) — in-page, no baseline.
// In the dev page (npm run dev → localhost:3000), on a FRESH load with an empty canvas, inject this
// file with a <script> and run:  await __handlersMatrix()  → { pass, checks: [{ name, ok, detail }] }.
//
// It drives the REAL app: synthetic PointerEvent / TouchEvent / WheelEvent / KeyboardEvent on the
// real canvas, through React and the real handlers, and reads the Provider's state back. What it
// proves is that each gesture still does its job end to end on desktop — it complements
// tests/handlers.characterization.test.ts (exact traces, no DOM) and replaces neither the iPad
// (real fingers, Pencil, palm rejection) nor Moisés' eyes.
//
// Needs the render loop running: the gizmo handles and the CINEMA optics are written by the RAF.
// With the built-in browser pane hidden the rAF is frozen and every Move gesture falls back to a
// plain move. If the pane cannot be shown, load the app in a page where requestAnimationFrame was
// replaced by a timer BEFORE main.tsx is imported (the matrix reports `rafAlive`).
//
// Viewport: fix it first (1366x1024 or 1920x1080). In a pane whose width was changing, with an
// odd-sized canvas (half-pixel centre), two checks came out wrong with untouched handlers: the Ink
// stroke kept 9 samples instead of 8 and the wheel pan was off by 0.05 px. Not investigated.
//
// Pointer ids: always 1. setPointerCapture throws for an id with no active pointer, and 1 is the
// mouse. `pointerType` is what the handlers branch on, and that one is set per gesture.
window.__handlersMatrix = async () => {
	const canvas = document.querySelector('[data-drawing-canvas]');
	const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
	const ctx = () => { let f = canvas[fiberKey]; while (f) { const v = f.memoizedProps && f.memoizedProps.value; if (v && v.state && v.dispatch && v.state.shapes) return v; f = f.return; } throw new Error('Provider not found'); };
	const st = () => ctx().state;
	const sleep = ms => new Promise(r => setTimeout(r, ms));
	const d = async a => { ctx().dispatch(a); await sleep(60); };
	const C = () => { const r = canvas.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
	const pe = (type, x, y, o = {}) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: o.type ?? 'mouse', isPrimary: true, button: o.button ?? 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y, shiftKey: !!o.shift, altKey: !!o.alt, movementX: o.mx ?? 0, movementY: o.my ?? 0 }));
	/** down → moves → up; points relative to the centre of the canvas. */
	const drag = async (pts, o = {}) => {
		const c = C();
		pe('pointerdown', c.x + pts[0][0], c.y + pts[0][1], o); await sleep(20);
		for (const [x, y] of pts.slice(1)) { pe('pointermove', c.x + x, c.y + y, o); await sleep(8); }
		pe(o.end ?? 'pointerup', c.x + pts[pts.length - 1][0], c.y + pts[pts.length - 1][1], o); await sleep(80);
	};
	const te = (type, pts) => {
		const c = C();
		const mk = ([x, y], i) => new Touch({ identifier: i + 10, target: canvas, clientX: c.x + x, clientY: c.y + y });
		const touches = pts.map(mk);
		canvas.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches, targetTouches: touches, changedTouches: touches.length ? touches : [mk([0, 0], 0)] }));
	};
	const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code, bubbles: true, cancelable: true }));
	const hist = () => `${st().historyIndex}/${st().history.length}`;
	const layerShapes = () => st().shapes.filter(s => s.zIndex === (st().currentLayerIndex * -150 || 0));
	const bb = () => { const p = layerShapes().flatMap(s => s.points); const xs = p.map(q => q.x), ys = p.map(q => q.y); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
	const near = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;
	const errors = [];
	const onError = e => errors.push(String(e.message || e.reason));
	window.addEventListener('error', onError); window.addEventListener('unhandledrejection', onError);
	const consoleError = console.error; console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 200)); consoleError(...a); };

	const checks = [];
	const check = (name, ok, detail) => checks.push({ name, ok: !!ok, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });

	let frames = 0; const count = () => { frames++; id = requestAnimationFrame(count); }; let id = requestAnimationFrame(count);
	await sleep(300); cancelAnimationFrame(id);
	check('rafAlive (the render loop runs: gizmo handles and CINEMA optics exist)', frames > 3, { framesIn300ms: frames });

	if (st().shapes.length) { check('fresh canvas', false, `${st().shapes.length} shapes already on the canvas: reload first`); return { pass: false, checks }; }
	if (st().isWelcomeModalOpen) await d({ type: 'TOGGLE_WELCOME_MODAL' });
	const WAVE = [[-200, -150], [-170, -130], [-140, -120], [-100, -135], [-60, -160], [-20, -150], [20, -120], [60, -110]];
	const down = dy => WAVE.map(([x, y]) => [x, y + dy]);

	// ── Drawing ─────────────────────────────────────────────────────────────────────────────────
	await d({ type: 'SET_TOOL', payload: 'brush' });
	for (const [i, mode] of ['tapered', 'uniform', 'ink'].entries()) {
		await d({ type: 'ADD_LAYER' }); await d({ type: 'SET_BRUSH_MODE', payload: mode });
		const n = st().shapes.length;
		await drag(down(i * 30), { type: i ? 'pen' : 'mouse' });
		const s = st().shapes.at(-1);
		check(`brush ${mode}: one stroke, its mode and its samples`, st().shapes.length === n + 1 && s.brushMode === mode && s.originalPoints.length === WAVE.length, { added: st().shapes.length - n, mode: s.brushMode, samples: s.originalPoints.length, outline: s.points.length });
	}
	{ const n = st().shapes.length; await drag([[150, -200]]); check('dot: press and release without moving draws', st().shapes.length === n + 1, { added: st().shapes.length - n }); }
	{
		const n = st().shapes.length; await d({ type: 'TOGGLE_SYMMETRY' }); await drag(down(110), { type: 'pen' }); await d({ type: 'TOGGLE_SYMMETRY' });
		const [a, b] = st().shapes.slice(-2);
		check('symmetry: the stroke and its mirror image, one undo step', st().shapes.length === n + 2 && near(a.originalPoints[0].x, -b.originalPoints[0].x, 1e-9), { added: st().shapes.length - n });
	}
	await d({ type: 'ADD_LAYER' }); await d({ type: 'SET_TOOL', payload: 'blob' });
	{ const n = st().shapes.length; await drag([[100, 50], [250, 60], [260, 200], [110, 210], [100, 60]]); check('blob', st().shapes.length === n + 1 && !st().shapes.at(-1).brushMode, { added: st().shapes.length - n }); }
	await d({ type: 'TOGGLE_DRAW_INSIDE' }); await drag([[150, 100], [300, 120], [280, 260], [140, 150]]); await d({ type: 'TOGGLE_DRAW_INSIDE' });
	check('draw inside', st().shapes.at(-1).isDrawInside === true && !st().shapes.at(-1).isDrawBehind, {});
	await d({ type: 'TOGGLE_DRAW_BEHIND' }); await drag([[50, 0], [200, 10], [180, 120], [60, 100]]); await d({ type: 'TOGGLE_DRAW_BEHIND' });
	check('draw behind', st().shapes.at(-1).isDrawBehind === true && !st().shapes.at(-1).isDrawInside, {});
	await d({ type: 'SET_TOOL', payload: 'eraser' });
	{ const n = st().shapes.length; await drag([[120, 80], [180, 120], [230, 160]]); const s = st().shapes.at(-1); check('eraser, with its polygon', st().shapes.length === n + 1 && s.isEraser && Array.isArray(s.eraserPolygon), { added: st().shapes.length - n }); }
	await d({ type: 'SET_TOOL', payload: 'brush' });
	{
		const n = st().shapes.length;
		await drag([[-300, 200], [-290, 200]], { type: 'touch' }); const afterTwo = st().shapes.length;
		await drag([[-300, 200], [-280, 205], [-260, 200], [-240, 210]], { type: 'touch' });
		check('micro-stroke: a finger with 2 samples draws nothing, with 4 it draws', afterTwo === n && st().shapes.length === n + 1, { twoSamples: afterTwo - n, fourSamples: st().shapes.length - afterTwo });
	}
	{ const n = st().shapes.length; await drag(down(260), { type: 'pen', end: 'pointercancel' }); check('pointercancel discards the stroke', st().shapes.length === n && st().isDrawing === false, { added: st().shapes.length - n, isDrawing: st().isDrawing }); }
	await d({ type: 'SET_TOOL', payload: 'text' });
	{
		const n = st().shapes.length; const c = C();
		pe('pointerdown', c.x - 250, c.y + 280); await sleep(80); pe('pointerup', c.x - 250, c.y + 280); await sleep(60);
		const opened = st().textSession.isActive;
		await d({ type: 'UPDATE_TEXT_SESSION', payload: { content: 'Hola handlers' } }); await d({ type: 'COMMIT_TEXT_SESSION' });
		check('text: a click opens the session where it landed, and it commits', opened && st().shapes.length === n + 1 && st().shapes.at(-1).type === 'text', { opened, added: st().shapes.length - n });
	}
	await d({ type: 'SET_TOOL', payload: 'brush' });

	// ── Two and three fingers ───────────────────────────────────────────────────────────────────
	{
		const h0 = hist();
		te('touchstart', [[-50, 0]]); te('touchstart', [[-50, 0], [50, 0]]); await sleep(80); te('touchend', [[50, 0]]); te('touchend', []); await sleep(80);
		const h1 = hist();
		te('touchstart', [[-60, 0], [0, 10], [60, 0]]); await sleep(80); te('touchend', []); await sleep(80);
		check('two-finger tap undoes, three-finger tap redoes', st().historyIndex === +h0.split('/')[0] && +h1.split('/')[0] === st().historyIndex - 1, { before: h0, afterTwo: h1, afterThree: hist() });
	}
	{
		const n = st().shapes.length, h0 = hist();
		te('touchstart', [[-50, 0], [50, 0]]); await sleep(30); te('touchmove', [[-70, 15], [80, 25]]); await sleep(20); te('touchmove', [[-110, 30], [130, 50]]); await sleep(20); te('touchend', [[130, 50]]); te('touchend', []); await sleep(80);
		const z = st().drawingZoom, pan = st().drawingPan;
		// fingers 100 px apart → 240.83 px apart; centre (0,0) → (10,40)
		check('pinch with a moving centre: zoom by the ratio of distances, pan follows the centre, nothing drawn or undone', near(z, Math.hypot(240, 20) / 100, 1e-6) && near(pan.x, 10, 1e-6) && near(pan.y, 40, 1e-6) && st().shapes.length === n && hist() === h0, { zoom: z, pan, shapes: st().shapes.length - n });
		await sleep(200);
		const m = st().shapes.length; await drag(down(300), { type: 'touch' });
		check('a finger draws again once the pinch cooldown (150 ms) is over', st().shapes.length === m + 1, { added: st().shapes.length - m });
		await d({ type: 'UNDO' }); await d({ type: 'RESET_DRAWING_VIEW' });
	}
	{
		const h0 = hist();
		te('touchstart', [[-50, 0], [50, 0]]); await sleep(40); te('touchmove', [[-150, 0], [150, 0]]); await sleep(40); te('touchend', []); await sleep(80);
		check('[COMPORTAMIENTO ACTUAL] pinch around a still centre: no zoom, and released under 300 ms it undoes', st().drawingZoom === 1 && st().historyIndex === +h0.split('/')[0] - 1, { before: h0, after: hist(), zoom: st().drawingZoom });
		await d({ type: 'REDO' });
	}

	// ── Move tool (new layer with one square) ───────────────────────────────────────────────────
	await d({ type: 'ADD_LAYER' }); await d({ type: 'SET_TOOL', payload: 'blob' });
	await drag([[100, 100], [300, 100], [300, 250], [100, 250], [100, 105]]);
	await d({ type: 'SET_TOOL', payload: 'move' }); await sleep(300);
	const settle = () => sleep(300); // the next gesture needs the handles of the new box
	{
		const b0 = bb(), h0 = hist();
		await drag([[200, 175], [202, 175]]);
		check('Move: a 2 px drag is a click — nothing moves, no undo step', JSON.stringify(bb()) === JSON.stringify(b0) && hist() === h0, {});
		await drag([[200, 175], [215, 180], [240, 190], [260, 205]]);
		const b1 = bb();
		check('Move: dragging inside the box translates the layer by the pointer travel', near(b1[0] - b0[0], 60) && near(b1[1] - b0[1], 30) && near(b1[2] - b0[2], 60), { dx: b1[0] - b0[0], dy: b1[1] - b0[1] });
		await settle();
	}
	{
		const g = bb(), cx = (g[0] + g[2]) / 2, cy = (g[1] + g[3]) / 2;
		await drag([[g[2], g[3]], [g[2] + 20, g[3] + 15], [g[2] + 60, g[3] + 45]]);
		const b = bb(), kx = (b[2] - b[0]) / (g[2] - g[0]), ky = (b[3] - b[1]) / (g[3] - g[1]);
		const expected = Math.hypot(g[2] + 60 - cx, g[3] + 45 - cy) / Math.hypot(g[2] - cx, g[3] - cy);
		check('Move: a corner scales uniformly around the centre', near(kx, expected, 0.02) && near(ky, expected, 0.02), { kx, ky, expected });
		await settle();
	}
	{
		const g = bb(), cy = (g[1] + g[3]) / 2, cx = (g[0] + g[2]) / 2;
		await drag([[g[2], cy], [g[2] + 30, cy], [g[2] + 80, cy]]);
		const b = bb(), kx = (b[2] - b[0]) / (g[2] - g[0]), ky = (b[3] - b[1]) / (g[3] - g[1]);
		check('Move: a side handle stretches one axis only', near(kx, (g[2] + 80 - cx) / (g[2] - cx), 0.02) && near(ky, 1, 1e-6), { kx, ky });
		await settle();
	}
	{
		const g = bb(), cx = (g[0] + g[2]) / 2, cy = (g[1] + g[3]) / 2, h0 = hist();
		// The rotate handle sits 120 px above the top edge. A quarter turn clockwise around the centre.
		const r = cy - (g[1] - 120);
		await drag([[cx, g[1] - 120], [cx + r * 0.38, cy - r * 0.92], [cx + r * 0.71, cy - r * 0.71], [cx + r, cy]]);
		const b = bb();
		check('Move: the rotate handle turns the layer (a quarter turn swaps its width and height)', near(b[2] - b[0], g[3] - g[1], 1) && near(b[3] - b[1], g[2] - g[0], 1) && near((b[0] + b[2]) / 2, cx, 1) && st().historyIndex === +h0.split('/')[0] + 1, { before: [g[2] - g[0], g[3] - g[1]], after: [b[2] - b[0], b[3] - b[1]] });
		await settle();
	}
	{
		const g = bb(), cx = (g[0] + g[2]) / 2, cy = (g[1] + g[3]) / 2;
		const c = C(); pe('pointerdown', c.x - 500, c.y - 400); await sleep(30);
		const duringPress = st().isLayerSelected;
		pe('pointerup', c.x - 500, c.y - 400); await sleep(80);
		const afterTap = st().isLayerSelected;
		await settle();
		await drag([[-500, -400], [-450, -350]]);
		const noop = JSON.stringify(bb()) === JSON.stringify(g) && st().isLayerSelected === false;
		await drag([[cx, cy], [cx + 30, cy], [cx + 50, cy]]);
		check('Move: a tap outside deselects ON RELEASE; deselected, outside does nothing; inside selects and drags at once', duringPress === true && afterTap === false && noop && st().isLayerSelected === true && near(bb()[0] - g[0], 50), { duringPress, afterTap, noop, selectedAfterInsideDrag: st().isLayerSelected, dx: bb()[0] - g[0] });
		await settle();
	}
	{
		const g = bb(), cx = (g[0] + g[2]) / 2, cy = (g[1] + g[3]) / 2, h0 = hist();
		const c = C(); pe('pointerdown', c.x + cx, c.y + cy, { type: 'touch' }); await sleep(20); pe('pointermove', c.x + cx + 80, c.y + cy + 40, { type: 'touch' }); await sleep(20);
		te('touchstart', [[cx + 80, cy + 40], [cx + 200, cy + 100]]); await sleep(400); te('touchend', []); pe('pointerup', c.x + cx + 80, c.y + cy + 40, { type: 'touch' }); await sleep(80);
		check('Move: a second finger abandons the drag — nothing moves, no undo step', JSON.stringify(bb()) === JSON.stringify(g) && hist() === h0, { before: h0, after: hist() });
	}
	{ const h0 = +hist().split('/')[0]; await d({ type: 'UNDO' }); await d({ type: 'UNDO' }); const h1 = +hist().split('/')[0]; await d({ type: 'REDO' }); await d({ type: 'REDO' }); check('undo / redo across the transforms', h1 === h0 - 2 && +hist().split('/')[0] === h0, {}); }

	// ── Pan and zoom on desktop ─────────────────────────────────────────────────────────────────
	await d({ type: 'SET_TOOL', payload: 'brush' });
	{
		const n = st().shapes.length;
		key('keydown', 'Space'); await sleep(40); await drag([[0, 0], [20, 10], [60, -40], [120, -70]]); const panned = { ...st().drawingPan };
		key('keyup', 'Space'); await sleep(60); const afterHold = { ...st().drawingPan };
		key('keydown', 'Space'); await sleep(40); key('keyup', 'Space'); await sleep(60);
		check('Space: hold + drag pans without drawing, releasing keeps the view, a tap resets it', panned.x === 120 && panned.y === -70 && afterHold.x === 120 && st().drawingPan.x === 0 && st().drawingPan.y === 0 && st().shapes.length === n, { panned, afterHold, afterTap: st().drawingPan });
	}
	{
		const c = C();
		canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: c.x + 100, clientY: c.y + 50, bubbles: true, cancelable: true })); await sleep(80);
		check('wheel: zoom ×1.1 anchored at the cursor', near(st().drawingZoom, 1.1, 1e-9) && near(st().drawingPan.x, -10, 1e-6) && near(st().drawingPan.y, -5, 1e-6), { zoom: st().drawingZoom, pan: st().drawingPan });
		const before = { ...st().drawingPan };
		await drag([[0, 0], [40, 30], [90, 60]], { button: 1 });
		check('middle button: pan', near(st().drawingPan.x - before.x, 90, 1e-6) && near(st().drawingPan.y - before.y, 60, 1e-6), { pan: st().drawingPan });
		await d({ type: 'RESET_DRAWING_VIEW' });
	}

	// ── CINEMA ──────────────────────────────────────────────────────────────────────────────────
	await d({ type: 'SET_MODE', payload: 'cinematic' }); await sleep(400);
	{
		const c = C(); const click = async (x, y) => { pe('pointerdown', c.x + x, c.y + y); await sleep(20); pe('pointerup', c.x + x, c.y + y); await sleep(60); };
		await click(40, 30); const armed = st().pointOfInterest;
		await click(42, 31); const poi = st().pointOfInterest;
		check('CINEMA: a double click sets the framing point, a single one does not', poi !== armed && poi && Number.isFinite(poi.x) && Number.isFinite(poi.y), { poi });
	}
	await d({ type: 'SET_CINEMATIC_TYPE', payload: 'orbit' }); await sleep(200);
	{
		const v0 = st().viewZoomOffset;
		te('touchstart', [[-100, 0], [100, 0]]); await sleep(30); te('touchmove', [[-110, 5], [110, 5]]); await sleep(30); te('touchend', []); await sleep(80);
		const v1 = st().viewZoomOffset;
		await drag([[0, 0], [0, 30]], { button: 1 });
		check('CINEMA orbit: a pinch and the middle button move the view zoom', near(v1 - v0, -700, 1e-6) && near(st().viewZoomOffset - v1, -300, 1e-6), { pinch: v1 - v0, middle: st().viewZoomOffset - v1 });
		const h0 = hist(); await drag([[0, 0], [30, 10], [60, 20]]);
		check('CINEMA orbit: dragging neither draws nor adds history', hist() === h0, {});
	}
	await d({ type: 'SET_MODE', payload: 'drawing' });

	window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onError); console.error = consoleError;
	check('no errors', errors.length === 0, errors);
	return { pass: checks.every(c => c.ok), checks };
};
