// Scripted gestures for the pointer / touch handlers of StrataCanvas.tsx (handlers sprint,
// v3.26.53). Pure data: tools/handlers-golden/ runs each scenario against the literal handler text
// and records what every event dispatched and which refs it changed.
//
// Geometry of the stand-in canvas (tools/handlers-golden/runtime.ts): its rect is
// { left: 20, top: 10, width: 1000, height: 800 }, so the centre of the canvas is client (520, 410)
// and, at zoom 1 / pan 0 on layer 0, world (wx, wy) is client (520 + wx, 410 + wy).
//
// Adding a scenario changes the reference: a new name must be frozen with the generator, which is
// only legitimate in a commit that does not move handler code (see tools/handlers-golden/generate.mjs).
import type { Action } from '../../src/types/strataActions';
import type { AppState, Shape } from '../../src/types/strataTypes';

type PointerKind = 'down' | 'move' | 'up' | 'leave' | 'cancel';
type PointerOpts = { type?: 'mouse' | 'pen' | 'touch'; button?: number; isPrimary?: boolean; id?: number; shift?: boolean; alt?: boolean; mx?: number; my?: number };
export type Step =
	| { tick: number }
	| { dispatch: Action }
	| { ref: string; value: unknown; merge?: boolean }
	| ({ pointer: PointerKind; x: number; y: number } & PointerOpts)
	| { touch: 'start' | 'move' | 'end' | 'cancel'; touches: [number, number][] };
export type HandlerScenario = { name: string; state?: Partial<AppState>; setup?: Action[]; steps: Step[] };

// ── Builders ────────────────────────────────────────────────────────────────────────────────────
const CX = 520, CY = 410;
const p = (pointer: PointerKind, wx: number, wy: number, o: PointerOpts = {}): Step => ({ pointer, x: CX + wx, y: CY + wy, ...o });
const tick = (ms: number): Step => ({ tick: ms });
const touch = (kind: 'start' | 'move' | 'end' | 'cancel', ...pts: [number, number][]): Step => ({ touch: kind, touches: pts.map(([x, y]) => [CX + x, CY + y] as [number, number]) });
const ref = (name: string, value: unknown, merge = false): Step => ({ ref: name, value, merge });

/** down → moves → up, all with the same pointer options. */
const drag = (pts: [number, number][], o: PointerOpts = {}, end: PointerKind = 'up'): Step[] => [
	p('down', pts[0][0], pts[0][1], o),
	...pts.slice(1).map(([x, y]) => p('move', x, y, o)),
	p(end, pts[pts.length - 1][0], pts[pts.length - 1][1], o),
];
const WAVE: [number, number][] = [[-100, 0], [-80, 12], [-55, 20], [-30, 8], [0, -10], [30, -22], [60, -5], [95, 15]];

const square = (id: string, layer: number, x0 = 100, y0 = 100, x1 = 300, y1 = 250): Shape => ({
	id, color: '#222222', zIndex: layer * -150 || 0,
	points: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }],
	isEraser: false, isDrawInside: false, isDrawBehind: false,
});
const add = (s: Shape): Action => ({ type: 'ADD_SHAPE', payload: s });

/**
 * The gizmo handles the render loop would have projected for `square()` on layer 0 at zoom 1,
 * pan 0, in canvas px (client − rect origin): world + (500, 400). An INPUT of the scenarios.
 */
const HANDLES = {
	tl: { x: 600, y: 500 }, tr: { x: 800, y: 500 }, br: { x: 800, y: 650 }, bl: { x: 600, y: 650 },
	mt: { x: 700, y: 500 }, mb: { x: 700, y: 650 }, ml: { x: 600, y: 575 }, mr: { x: 800, y: 575 },
	rotate: { x: 700, y: 380 }, center: { x: 700, y: 575 },
};
const moveSetup: Pick<HandlerScenario, 'state' | 'setup'> = { state: { tool: 'move' }, setup: [add(square('sq', 0))] };
const withHandles = ref('transformHandlesRef', HANDLES);
const brush = (brushMode: AppState['brushMode'], extra: Partial<AppState> = {}): Partial<AppState> => ({ tool: 'brush', brushMode, ...extra });

const threeStrokes: Action[] = [add(square('a', 0, 0, 0, 20, 20)), add(square('b', 0, 30, 0, 50, 20)), add(square('c', 0, 60, 0, 80, 20))];

const cinema = (cinematicType: AppState['cinematicType'], extra: Partial<AppState> = {}): Partial<AppState> =>
	({ mode: 'cinematic', cinematicType, camera: { x: 0, y: 0, z: 500, rotation: 0 }, ...extra });
const threeLayers: Action[] = [
	{ type: 'ADD_LAYER' }, { type: 'ADD_LAYER' },
	// A higher layer index is CLOSER to the camera (z = index × −150, and depth is z − camera z).
	add(square('back', 0, -300, -200, 300, 200)), add(square('mid', 1, -120, -90, 40, 60)), add(square('front', 2, 20, 10, 140, 110)),
];
const OPTICS = {
	camera: { x: 30, y: -12, z: 480, rotation: 0 }, viewZoomOffset: -550, focalLength: 760,
	isArcOrOrbit: true, arcPivotScale: 0.35, pivotPoiX: 10, pivotPoiY: 5, cinematicType: 'arc', shake: { x: 2, y: -1 },
};

// ── Scenarios ───────────────────────────────────────────────────────────────────────────────────
export const HANDLER_SCENARIOS: readonly HandlerScenario[] = [
	// Drawing: one gesture, one shape
	{ name: 'draw/brush-tapered/mouse', state: brush('tapered'), steps: drag(WAVE) },
	{ name: 'draw/brush-uniform/pen', state: brush('uniform', { currentBrushThickness: 12 }), steps: drag(WAVE, { type: 'pen' }) },
	{ name: 'draw/brush-ink/pen/symmetry', state: brush('ink', { isSymmetryEnabled: true }), steps: drag(WAVE, { type: 'pen' }) },
	{ name: 'draw/brush/dot-tap/mouse', state: brush('tapered'), steps: drag([[40, 40]]) },
	{ name: 'draw/brush/dot-tap/pen', state: brush('ink'), steps: drag([[40, 40]], { type: 'pen' }) },
	{ name: 'draw/blob/mouse', steps: drag(WAVE) },
	{ name: 'draw/blob/smoothing', state: { blobSmoothing: true }, steps: drag([...WAVE, [60, 60], [-40, 70]]) },
	{ name: 'draw/blob/organic', state: { isOrganicMode: true }, steps: drag(WAVE) },
	{ name: 'draw/eraser/organic/symmetry', state: { tool: 'eraser', isOrganicMode: true, isSymmetryEnabled: true }, steps: drag(WAVE, { type: 'pen' }) },
	{ name: 'draw/eraser/mouse', state: { tool: 'eraser' }, setup: [add(square('sq', 0))], steps: drag(WAVE) },
	{ name: 'draw/brush/organic-flag-is-ignored', state: brush('tapered', { isOrganicMode: true }), steps: drag(WAVE) },
	{ name: 'draw/blob/draw-inside', state: { isDrawInside: true }, setup: [add(square('sq', 0))], steps: drag(WAVE) },
	{ name: 'draw/blob/draw-behind', state: { isDrawBehind: true }, setup: [add(square('sq', 0))], steps: drag(WAVE) },
	{ name: 'draw/brush/zoom-2-pan', state: brush('tapered', { drawingZoom: 2, drawingPan: { x: 50, y: -30 } }), steps: drag(WAVE) },
	{ name: 'draw/brush/layer-2', state: brush('uniform'), setup: [{ type: 'ADD_LAYER' }, { type: 'ADD_LAYER' }], steps: drag(WAVE) },
	// state.camera.z normally sits on the active layer's plane (scale 1). Off it, the layer's projected scale is not 1.
	{ name: 'draw/brush/camera-off-the-layer-plane', state: brush('uniform', { camera: { x: 0, y: 0, z: -100, rotation: 0 } }), steps: drag(WAVE, { type: 'pen' }) },
	{ name: 'draw/sample-spacing/3px-is-not-enough', state: brush('uniform'), steps: drag([[0, 0], [3, 0], [3, 3], [6.01, 3], [6.01, 3]]) },
	{ name: 'draw/pointerleave-ends-the-stroke', state: brush('tapered'), steps: drag(WAVE, {}, 'leave') },
	{ name: 'draw/pointercancel-discards-the-stroke', state: brush('tapered'), steps: drag(WAVE, { type: 'pen' }, 'cancel') },
	{ name: 'draw/two-strokes-in-a-row', state: brush('ink'), steps: [...drag(WAVE, { type: 'pen' }), tick(400), ...drag(WAVE.map(([x, y]) => [x, y + 80] as [number, number]), { type: 'pen' })] },
	{ name: 'draw/onboarding-is-dismissed-by-the-first-stroke', state: brush('tapered', { isOnboardingVisible: true }), steps: drag(WAVE) },
	{ name: 'draw/hidden-layer/toast-and-nothing-else', state: brush('tapered', { hiddenLayers: [0] }), steps: drag(WAVE) },
	{ name: 'draw/text-tool/starts-a-session', state: { tool: 'text' }, steps: drag([[40, -60], [80, -60]]) },
	{ name: 'draw/pointerup-without-a-down', state: brush('tapered'), steps: [p('move', 10, 10), p('up', 10, 10)] },

	// Micro-stroke filter (finger / palm): MIN_TOUCH_STROKE_POINTS = 2
	{ name: 'micro-stroke/touch/1-sample/discarded', state: brush('tapered'), steps: drag([[0, 0]], { type: 'touch' }) },
	{ name: 'micro-stroke/touch/2-samples/discarded', state: brush('tapered'), steps: drag([[0, 0], [10, 0]], { type: 'touch' }) },
	{ name: 'micro-stroke/touch/3-samples/kept', state: brush('tapered'), steps: drag([[0, 0], [10, 0], [20, 0]], { type: 'touch' }) },
	{ name: 'micro-stroke/touch/blob/2-samples/discarded', steps: drag([[0, 0], [10, 0]], { type: 'touch' }) },
	{ name: 'micro-stroke/pen/1-sample/kept', state: brush('tapered'), steps: drag([[0, 0]], { type: 'pen' }) },
	{ name: 'micro-stroke/mouse/2-samples/kept', state: brush('tapered'), steps: drag([[0, 0], [10, 0]]) },

	// Which pointers may start a gesture
	{ name: 'pointer/mouse/non-primary/ignored', state: brush('tapered'), steps: drag(WAVE, { isPrimary: false }) },
	{ name: 'pointer/pen/non-primary/draws', state: brush('tapered'), steps: drag(WAVE, { type: 'pen', isPrimary: false }) },
	{ name: 'pointer/touch/while-pinching/ignored', state: brush('tapered'), steps: [ref('gestureRef', { isPinching: true }, true), ...drag(WAVE, { type: 'touch' })] },
	{ name: 'pointer/move-while-a-pinch-is-flagged/no-sample', state: brush('tapered'), steps: [p('down', 0, 0, { type: 'pen' }), p('move', 10, 0, { type: 'pen' }), ref('gestureRef', { isPinching: true }, true), p('move', 30, 5, { type: 'pen' }), p('move', 50, 10, { type: 'pen' }), ref('gestureRef', { isPinching: false }, true), p('move', 70, 12, { type: 'pen' }), p('up', 70, 12, { type: 'pen' })] },
	{ name: 'pointer/pen/while-pinching/clears-the-pinch-and-draws', state: brush('tapered'), steps: [ref('gestureRef', { isPinching: true }, true), ...drag(WAVE, { type: 'pen' })] },

	// Middle button and Space: pan (DRAW) / zoom (CINEMA orbit)
	{ name: 'pan/middle-button/draw', state: brush('tapered', { drawingPan: { x: 12, y: -7 } }), steps: drag([[0, 0], [40, 25], [-90, 60]], { button: 1 }) },
	{ name: 'pan/middle-button/draw/zoom-2/clamped', state: { drawingZoom: 2 }, steps: drag([[0, 0], [2000, -4000], [3100, 1]], { button: 1 }) },
	{ name: 'pan/middle-button/draw/clamped-negative', steps: drag([[0, 0], [-2000, 4000], [-1499, 1499]], { button: 1 }) },
	{ name: 'pan/middle-button/orbit-is-zoom', state: cinema('orbit'), steps: drag([[0, 0], [5, 40], [5, -900], [5, 700]], { button: 1 }) },
	{ name: 'pan/space/tap-without-moving', state: brush('tapered'), steps: [ref('isSpaceDownRef', true), ...drag([[0, 0], [2, 0]])] },
	{ name: 'pan/space/drag-engages', state: brush('tapered'), steps: [ref('isSpaceDownRef', true), ...drag([[0, 0], [2, 0], [3, 0], [40, -30], [1, 0]], { type: 'pen' })] },
	{ name: 'pan/space/ignored-in-cinema', state: cinema('forward'), steps: [ref('isSpaceDownRef', true), ...drag([[0, 0], [40, -30]])] },

	// Two fingers: tap (undo) vs pinch. Thresholds: centre moved > 10 px, start distance >= 5 px, release < 300 ms
	{ name: 'touch2/tap/undo', setup: threeStrokes, steps: [touch('start', [-50, 0]), touch('start', [-50, 0], [50, 0]), tick(120), touch('end', [50, 0]), touch('end')] },
	{ name: 'touch2/tap/299ms/undo', setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(299), touch('end')] },
	{ name: 'touch2/tap/300ms/nothing', setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(300), touch('end')] },
	{ name: 'touch2/tap/centre-moved-10px/still-a-tap', setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(50), touch('move', [-40, 0], [60, 0]), tick(50), touch('end')] },
	{ name: 'touch2/pinch/centre-moved-10.01px', setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(50), touch('move', [-39.99, 0], [60.01, 0]), tick(50), touch('end', [60, 0]), touch('end')] },
	{ name: 'touch2/pinch/zoom-in-with-moving-centre', setup: threeStrokes, steps: [
		touch('start', [-50, 0]), touch('start', [-50, 0], [50, 0]), tick(30),
		touch('move', [-60, 10], [70, 20]), tick(16), touch('move', [-90, 25], [110, 45]), tick(16), touch('move', [-140, 30], [160, 70]),
		tick(16), touch('end', [160, 70]), touch('end'),
	] },
	{ name: 'touch2/pinch/zoom-out/clamped-at-0.5', steps: [touch('start', [-200, 0], [200, 0]), touch('move', [-100, 30], [100, 30]), touch('move', [-10, 60], [10, 60]), touch('end')] },
	{ name: 'touch2/pinch/zoom-in/clamped-at-3', state: { drawingZoom: 2, drawingPan: { x: 300, y: -200 } }, steps: [touch('start', [-20, 0], [20, 0]), touch('move', [-200, 40], [200, 40]), touch('move', [-400, 900], [400, 900]), touch('end')] },
	{ name: 'touch2/pinch/zoom-out/pan-clamped', state: { drawingPan: { x: 700, y: -700 } }, steps: [touch('start', [-200, 0], [200, 0]), touch('move', [400, -450], [600, -450]), touch('end')] },
	{ name: 'touch2/pinch/zoom-out/pan-clamped/opposite-corner', state: { drawingPan: { x: -700, y: 700 } }, steps: [touch('start', [-200, 0], [200, 0]), touch('move', [-600, 450], [-400, 450]), touch('end')] },
	{ name: 'touch2/pinch/start-distance-0-falls-back-to-1', steps: [ref('gestureRef', { isPinching: true, startDist: 0, startZoom: 1, tapMoved: true }, true), touch('move', [-1, 0], [1, 0]), touch('end')] },
	{ name: 'touch2/pinch/non-finite-distance/ignored', steps: [ref('gestureRef', { isPinching: true, startDist: 100, startZoom: 1, tapMoved: true }, true), touch('move', [NaN, 0], [10, 0]), touch('end')] },
	{ name: 'touch2/fingers-together-under-5px/moved-but-no-pinch', setup: threeStrokes, steps: [touch('start', [0, 0], [4.9, 0]), touch('move', [30, 0], [80, 0]), touch('move', [60, 0], [200, 0]), tick(50), touch('end')] },
	{ name: 'touch2/start-distance-exactly-5px/pinch', steps: [touch('start', [0, 0], [5, 0]), touch('move', [30, 0], [80, 0]), touch('end')] },
	{ name: 'touch2/tap/text-session-active/no-undo', setup: [...threeStrokes, { type: 'SET_TOOL', payload: 'text' }, { type: 'START_TEXT_SESSION', payload: { x: 0, y: 0 } }], steps: [touch('start', [-50, 0], [50, 0]), tick(100), touch('end')] },
	{ name: 'touch2/pinch/one-finger-lifts/cooldown-starts', steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), tick(40), touch('end', [80, 40]), tick(500), touch('end')] },
	{ name: 'touch2/touchcancel/resets', steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), tick(40), touch('cancel')] },
	{ name: 'touch2/after-a-pinch/touch-pointerdown/149ms/ignored', state: brush('tapered'), steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), touch('end'), tick(149), ...drag([[0, 0], [10, 0], [20, 0], [30, 0]], { type: 'touch' })] },
	{ name: 'touch2/after-a-pinch/touch-pointerdown/150ms/draws', state: brush('tapered'), steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), touch('end'), tick(150), ...drag([[0, 0], [10, 0], [20, 0], [30, 0]], { type: 'touch' })] },
	{ name: 'touch2/after-a-pinch/mouse-pointerdown/no-cooldown', state: brush('tapered'), steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), touch('end'), tick(10), ...drag([[0, 0], [10, 0], [20, 0]])] },
	{ name: 'touch2/second-finger-cancels-a-finger-stroke', state: brush('tapered'), steps: [p('down', 0, 0, { type: 'touch' }), p('move', 10, 0, { type: 'touch' }), p('move', 20, 5, { type: 'touch' }), touch('start', [20, 5], [90, 40]), p('move', 30, 5, { type: 'touch' }), tick(500), touch('end'), p('up', 30, 5, { type: 'touch' })] },
	{ name: 'touch2/palm-while-the-pen-draws/ignored', state: brush('tapered'), steps: [p('down', 0, 0, { type: 'pen' }), p('move', 10, 0, { type: 'pen' }), touch('start', [200, 200], [260, 240]), p('move', 30, 5, { type: 'pen' }), touch('end'), p('up', 30, 5, { type: 'pen' })] },

	// [COMPORTAMIENTO ACTUAL] A pinch whose centre stays put never becomes a pinch (phase 6 finding)
	{ name: 'touch2/still-centre-pinch/released-under-300ms/undo', setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(60), touch('move', [-120, 0], [120, 0]), tick(60), touch('move', [-200, 0], [200, 0]), tick(60), touch('end')] },
	{ name: 'touch2/still-centre-pinch/held-over-300ms/no-zoom-no-undo', setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(200), touch('move', [-120, 0], [120, 0]), tick(200), touch('move', [-200, 0], [200, 0]), tick(60), touch('end')] },

	// Three fingers: tap (redo), release < 250 ms
	{ name: 'touch3/tap/redo', setup: [...threeStrokes, { type: 'UNDO' }, { type: 'UNDO' }], steps: [touch('start', [-60, 0]), touch('start', [-60, 0], [0, 10]), touch('start', [-60, 0], [0, 10], [60, 0]), tick(120), touch('end', [0, 10], [60, 0]), touch('end', [60, 0]), touch('end')] },
	{ name: 'touch3/tap/249ms/redo', setup: [...threeStrokes, { type: 'UNDO' }], steps: [touch('start', [-60, 0], [0, 10], [60, 0]), tick(249), touch('end')] },
	{ name: 'touch3/tap/250ms/nothing', setup: [...threeStrokes, { type: 'UNDO' }], steps: [touch('start', [-60, 0], [0, 10], [60, 0]), tick(250), touch('end')] },
	{ name: 'touch3/centre-moved-over-10px/nothing', setup: [...threeStrokes, { type: 'UNDO' }], steps: [touch('start', [-60, 0], [0, 10], [60, 0]), tick(50), touch('move', [-60, 12], [0, 22], [60, 12]), tick(50), touch('end')] },
	{ name: 'touch3/centre-moved-10px/still-a-tap', setup: [...threeStrokes, { type: 'UNDO' }], steps: [touch('start', [-60, 0], [0, 9], [60, 0]), tick(50), touch('move', [-60, 10], [0, 19], [60, 10]), tick(50), touch('end')] },
	{ name: 'touch3/third-finger-after-a-moved-pinch', setup: [...threeStrokes, { type: 'UNDO' }], steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), tick(30), touch('start', [-80, 40], [80, 40], [0, 90]), tick(60), touch('end')] },

	// CINEMA orbit: touch and mouse
	{ name: 'orbit/touch1/pan', state: cinema('orbit'), steps: [touch('start', [0, 0]), touch('move', [30, -20]), touch('move', [75, 10]), touch('end')] },
	{ name: 'orbit/touch2/rotate-and-pinch', state: cinema('orbit'), steps: [touch('start', [-60, 0]), touch('start', [-60, 0], [60, 0]), touch('move', [-90, 30], [110, 50]), touch('move', [-20, -400], [20, -380]), touch('end', [20, -380]), touch('move', [50, -300]), touch('end')] },
	{ name: 'orbit/touch2/pinch/zoom-clamps', state: cinema('orbit'), steps: [touch('start', [-200, 0], [200, 0]), touch('move', [-2, 0], [2, 0]), touch('move', [-900, 0], [900, 0]), touch('end')] },
	{ name: 'orbit/touch2/pinch/within-range', state: cinema('orbit'), steps: [touch('start', [-100, 0], [100, 0]), touch('move', [-110, 5], [110, 5]), touch('move', [-90, -8], [90, -8]), touch('end')] },
	{ name: 'orbit/touch2/elevation-clamps-both-ways', state: cinema('orbit'), steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-50, 400], [50, 400]), touch('move', [-50, -500], [50, -500]), touch('end')] },
	{ name: 'orbit/touch2/fingers-on-the-same-spot/no-zoom', state: cinema('orbit'), steps: [touch('start', [0, 0], [0, 0]), touch('move', [-10, 0], [10, 0]), touch('end')] },
	{ name: 'orbit/touch/not-armed-without-a-touchstart', state: cinema('orbit'), steps: [touch('move', [30, -20]), touch('end')] },
	{ name: 'orbit/mouse/pan-shift-alt', state: cinema('orbit'), steps: [p('down', 0, 0), p('move', 10, 5, { mx: 10, my: 5 }), p('move', 30, 5, { mx: 20, my: 0, shift: true }), p('move', 30, 400, { mx: 0, my: 395, shift: true }), p('move', 30, 380, { mx: 0, my: -20, alt: true }), p('up', 30, 380)] },
	{ name: 'cinema/forward/touch-is-ignored', state: cinema('forward'), steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-80, 40], [80, 40]), touch('end')] },

	// CINEMA double click: framing point. DOUBLE_CLICK_DELAY = 300 ms, DOUBLE_CLICK_MAX_DISTANCE = 40 px
	{ name: 'poi/double-click/hits-the-front-layer', state: cinema('arc'), setup: threeLayers, steps: [p('down', 60, 40), p('up', 60, 40), tick(120), p('down', 62, 41), p('up', 62, 41)] },
	{ name: 'poi/double-click/hits-the-mid-layer', state: cinema('forward'), setup: threeLayers, steps: [p('down', -40, -20), p('up', -40, -20), tick(120), p('down', -40, -20), p('up', -40, -20)] },
	{ name: 'poi/double-click/over-the-back-layer-only', state: cinema('forward'), setup: threeLayers, steps: [p('down', 200, -150), tick(120), p('down', 200, -150)] },
	{ name: 'poi/double-click/nothing-under-it/mid-plane', state: cinema('forward'), setup: threeLayers, steps: [p('down', 420, -330), p('up', 420, -330), tick(120), p('down', 420, -330), p('up', 420, -330)] },
	// Hidden AFTER the layers exist: ADD_LAYER shifts the indices of hiddenLayers, so a `state` patch would hide nothing here.
	{ name: 'poi/double-click/hidden-layer-is-skipped', state: cinema('forward'), setup: [...threeLayers, { type: 'TOGGLE_LAYER_VISIBILITY', payload: 2 }], steps: [p('down', 60, 40), tick(100), p('down', 60, 40)] },
	{ name: 'poi/double-click/empty-layers-around-the-content', state: cinema('forward'), setup: [{ type: 'ADD_LAYER' }, { type: 'ADD_LAYER' }, { type: 'ADD_LAYER' }, add(square('only', 1, -120, -90, 140, 110))], steps: [p('down', 30, 20), tick(100), p('down', 30, 20), tick(500), p('down', 420, -330), tick(100), p('down', 420, -330)] },
	{ name: 'poi/double-click/299ms', state: cinema('forward'), setup: threeLayers, steps: [p('down', 60, 40), tick(299), p('down', 60, 40)] },
	{ name: 'poi/double-click/300ms/re-arms', state: cinema('forward'), setup: threeLayers, steps: [p('down', 60, 40), tick(300), p('down', 60, 40), tick(100), p('down', 60, 40)] },
	{ name: 'poi/double-click/40px-apart', state: cinema('forward'), setup: threeLayers, steps: [p('down', 60, 40), tick(100), p('down', 100, 40)] },
	{ name: 'poi/double-click/40.01px-apart/re-arms-on-the-second', state: cinema('forward'), setup: threeLayers, steps: [p('down', 60, 40), tick(100), p('down', 100.01, 40), tick(100), p('down', 100.01, 40)] },
	{ name: 'poi/double-click/drawn-frame-optics/arc-pivot', state: cinema('arc'), setup: threeLayers, steps: [ref('drawnFrameRef', OPTICS), p('down', 60, 40), tick(100), p('down', 60, 40)] },
	{ name: 'poi/double-click/drawn-frame-optics/orbit-pivot', state: cinema('orbit'), setup: threeLayers, steps: [ref('drawnFrameRef', { ...OPTICS, cinematicType: 'orbit' }), p('down', 60, 40), p('up', 60, 40), tick(100), p('down', 60, 40), p('up', 60, 40)] },
	{ name: 'poi/double-click/lens-distortion', state: cinema('forward', { postProcessingEnabled: { grain: false, vignette: false, distortion: true, dof: false, wiggle: false, chromaticAberration: false, fog: false, particles: false, glow: false, riso: false, pixelArt: false, grunge: false, superRiso: false } }), setup: threeLayers, steps: [p('down', 110, 80), tick(100), p('down', 110, 80)] },
	{ name: 'poi/double-click/layer-spacing-2', state: cinema('forward', { layerSpacingFactor: 2 }), setup: threeLayers, steps: [p('down', -200, 150), tick(100), p('down', -200, 150)] },
	{ name: 'poi/double-click/empty-scene', state: cinema('forward'), steps: [p('down', 60, 40), tick(100), p('down', 60, 40)] },

	// Move tool: selection table, gizmo handles, dead zone
	{ name: 'move/selected/inside/drag', ...moveSetup, steps: [withHandles, ...drag([[180, 160], [182, 160], [183, 161], [230, 190], [260, 140]])] },
	{ name: 'move/selected/inside/dead-zone/2px-is-a-click', ...moveSetup, steps: [withHandles, ...drag([[180, 160], [182, 160], [181, 161]])] },
	{ name: 'move/selected/inside/hysteresis/back-to-the-start', ...moveSetup, steps: [withHandles, ...drag([[180, 160], [200, 160], [180.5, 160]])] },
	{ name: 'move/selected/inside/drag/zoom-2', state: { tool: 'move', drawingZoom: 2 }, setup: moveSetup.setup, steps: [withHandles, ...drag([[180, 160], [230, 190], [260, 140]], { type: 'pen' })] },
	{ name: 'move/selected/corner/scale', ...moveSetup, steps: [withHandles, ...drag([[285, 245], [320, 280], [360, 300]])] },
	{ name: 'move/selected/side/stretch-x', ...moveSetup, steps: [withHandles, ...drag([[282, 172], [330, 175], [390, 180]])] },
	{ name: 'move/selected/side/stretch-y', ...moveSetup, steps: [withHandles, ...drag([[200, 98], [205, 60], [210, 20]], { type: 'touch' })] },
	{ name: 'move/selected/rotate-handle', ...moveSetup, steps: [withHandles, ...drag([[200, -22], [260, 0], [300, 60]])] },
	{ name: 'move/selected/outside/deselect-on-release', ...moveSetup, steps: [withHandles, ...drag([[-200, -150], [-190, -150]])] },
	{ name: 'move/selected/outside/second-finger-cancels-the-deselect', ...moveSetup, steps: [withHandles, p('down', -200, -150, { type: 'touch' }), touch('start', [-200, -150], [-100, -150]), tick(100), touch('end'), p('up', -200, -150, { type: 'touch' })] },
	{ name: 'move/selected/outside/pointercancel-keeps-the-selection', ...moveSetup, steps: [withHandles, p('down', -200, -150, { type: 'touch' }), p('cancel', -200, -150, { type: 'touch' }), p('up', -200, -150, { type: 'touch' })] },
	{ name: 'move/deselected/outside/no-op', state: { tool: 'move', isLayerSelected: false }, setup: moveSetup.setup, steps: [withHandles, ...drag([[-200, -150], [-150, -100]])] },
	{ name: 'move/deselected/inside/select-and-drag', state: { tool: 'move', isLayerSelected: false }, setup: moveSetup.setup, steps: [withHandles, ...drag([[180, 160], [230, 190], [260, 140]])] },
	{ name: 'move/deselected/on-the-invisible-rotate-handle/no-op', state: { tool: 'move', isLayerSelected: false }, setup: moveSetup.setup, steps: [withHandles, ...drag([[200, -22], [260, 0]])] },
	{ name: 'move/deselected/on-a-corner-inside-the-box/plain-move', state: { tool: 'move', isLayerSelected: false }, setup: moveSetup.setup, steps: [withHandles, ...drag([[295, 245], [330, 280]])] },
	{ name: 'move/no-handles-yet/legacy-path', ...moveSetup, steps: drag([[180, 160], [230, 190], [260, 140]]) },
	{ name: 'move/empty-layer/move-ref', state: { tool: 'move' }, steps: drag([[0, 0], [40, 25], [70, -15]]) },
	{ name: 'move/empty-layer/move-ref/zoom-2-pan/layer-1', state: { tool: 'move', drawingZoom: 2, drawingPan: { x: 50, y: -30 } }, setup: [{ type: 'ADD_LAYER' }], steps: drag([[0, 0], [40, 25], [70, -15]], { type: 'pen' }) },
	{ name: 'move/empty-layer/move-ref/camera-off-the-layer-plane', state: { tool: 'move', camera: { x: 0, y: 0, z: 120, rotation: 0 } }, steps: drag([[0, 0], [40, 25], [70, -15]]) },
	{ name: 'move/selected/inside/drag/camera-off-the-layer-plane', state: { tool: 'move', camera: { x: 0, y: 0, z: 120, rotation: 0 } }, setup: moveSetup.setup, steps: [withHandles, ...drag([[180, 160], [230, 190], [260, 140]])] },
	{ name: 'move/empty-layer/under-0.1/nothing', state: { tool: 'move' }, steps: drag([[0, 0], [0.05, 0.05]]) },
	{ name: 'move/empty-layer/orphaned-transform-is-made-inert', state: { tool: 'move' }, steps: [ref('transformRef', { isActive: true, mode: 'rotate', engaged: true, currentTransform: { x: 50, y: 50, scale: 2, rotation: 1 } }, true), ...drag([[0, 0], [40, 25]])] },
	{ name: 'move/drag/second-finger-abandons-it', ...moveSetup, steps: [withHandles, p('down', 180, 160, { type: 'touch' }), p('move', 230, 190, { type: 'touch' }), touch('start', [230, 190], [300, 300]), p('move', 260, 200, { type: 'touch' }), tick(500), touch('end'), p('up', 260, 200, { type: 'touch' })] },
	{ name: 'move/drag/third-finger-abandons-it', ...moveSetup, steps: [withHandles, p('down', 180, 160, { type: 'touch' }), p('move', 230, 190, { type: 'touch' }), touch('start', [230, 190], [300, 300], [350, 200]), tick(500), touch('end'), p('up', 260, 200, { type: 'touch' })] },
	{ name: 'move/drag/pointercancel-discards-it', ...moveSetup, steps: [withHandles, p('down', 180, 160, { type: 'pen' }), p('move', 230, 190, { type: 'pen' }), p('cancel', 230, 190, { type: 'pen' }), p('move', 260, 200, { type: 'pen' }), p('up', 260, 200, { type: 'pen' })] },
	{ name: 'move/hover/cursor-follows-the-handles', ...moveSetup, steps: [withHandles, p('move', -200, -150), p('move', 180, 160), p('move', 282, 172), p('move', 284, 173), p('move', 285, 245), p('move', 200, -22), p('move', 200, 98), p('move', -200, -150)] },
	{ name: 'move/hover/orphaned-transform-does-not-drag', ...moveSetup, steps: [withHandles, ref('transformRef', { isActive: true, mode: 'move', startP: { x: 100, y: 100 } }, true), p('move', 180, 160), p('move', 260, 220)] },
	{ name: 'move/hidden-layer/toast', state: { tool: 'move', hiddenLayers: [0] }, setup: moveSetup.setup, steps: [withHandles, ...drag([[180, 160], [230, 190]])] },
	{ name: 'move/layer-2/drag', state: { tool: 'move' }, setup: [{ type: 'ADD_LAYER' }, { type: 'ADD_LAYER' }, add(square('sq2', 2))], steps: [withHandles, ...drag([[180, 160], [230, 190], [260, 140]])] },

	// Flat front view (CINEMA preset 'flat', v3.26.71; docs/flat-view-proposal.md §2): DRAW's pan and zoom instead of the
	// orbit. Frozen with the handlers of v3.26.71, before the flat view had gestures; the commit that gives them inverts these.
	{ name: 'flat/space/drag-pans', state: cinema('flat', { drawingPan: { x: 12, y: -7 } }), steps: [ref('isSpaceDownRef', true), ...drag([[0, 0], [2, 0], [3, 0], [40, -30], [1, 0]], { type: 'pen' })] },
	{ name: 'flat/middle-button/pans', state: cinema('flat', { drawingZoom: 1.5, drawingPan: { x: 12, y: -7 } }), steps: drag([[0, 0], [40, 25], [-90, 60]], { button: 1 }) },
	{ name: 'flat/mouse/drag-pans', state: cinema('flat', { drawingPan: { x: 12, y: -7 } }), steps: drag([[0, 0], [40, 25], [-90, 60]]) },
	{ name: 'flat/mouse/drag-pans/clamped', state: cinema('flat', { drawingZoom: 2 }), steps: drag([[0, 0], [2000, -4000], [3100, 1]]) },
	{ name: 'flat/touch1/drag-pans', state: cinema('flat'), steps: [touch('start', [0, 0]), ...drag([[0, 0], [30, -20], [75, 10]], { type: 'touch' }), touch('end')] },
	{ name: 'flat/pen/drag-pans', state: cinema('flat'), steps: drag([[0, 0], [30, -20], [75, 10]], { type: 'pen' }) },
	{ name: 'flat/touch2/pinch/zoom-in-with-moving-centre', state: cinema('flat'), setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), touch('move', [-70, 10], [70, 10]), touch('move', [-120, 40], [130, 40]), touch('end', [130, 40]), touch('end')] },
	{ name: 'flat/touch2/pinch/zoom-out/pan-clamped', state: cinema('flat', { drawingPan: { x: 700, y: -700 } }), steps: [touch('start', [-200, 0], [200, 0]), touch('move', [400, -450], [600, -450]), touch('end')] },
	{ name: 'flat/touch2/tap/undo', state: cinema('flat'), setup: threeStrokes, steps: [touch('start', [-50, 0], [50, 0]), tick(120), touch('end')] },
	{ name: 'flat/touch3/tap/redo', state: cinema('flat'), setup: [...threeStrokes, { type: 'UNDO' }], steps: [touch('start', [-50, 0], [0, 40], [50, 0]), tick(120), touch('end')] },
	{ name: 'flat/double-click/no-poi', state: cinema('flat'), setup: threeLayers, steps: [p('down', 60, 40), p('up', 60, 40), tick(100), p('down', 60, 40), p('up', 60, 40)] },
	{ name: 'flat/pen/no-stroke', state: cinema('flat', { tool: 'brush' }), steps: drag(WAVE, { type: 'pen' }) },
];
