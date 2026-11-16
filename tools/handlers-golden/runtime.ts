// Stand-ins for what the handlers of StrataCanvas.tsx close over, and the loop that feeds them
// scripted events (handlers sprint, v3.26.53). Bundled by harness.mjs next to the literal handler
// text. Nothing here decides anything a handler decides: it only provides refs with the same
// initial values as the component, the REAL reducer behind `dispatch`, a clock, a seeded
// Math.random and a counting crypto.randomUUID, and records what each event did.
import { appReducer } from '../../src/state/appReducer';
import { initialState } from '../../src/constants/initialState';
import type { AppState, Shape } from '../../src/types/strataTypes';
import type { HandlerScenario, Step } from '../../tests/helpers/handlerScenarios';

type Rec = Record<string, unknown>;
const log: unknown[] = [];
export const __stubs = {
	toast: {
		error: (title: string) => { log.push(['toast.error', title]); },
		success: (title: string) => { log.push(['toast.success', title]); },
	},
	/** Stand-in for canvas/transformUtils.ts (which scans rendered pixels): the box of the points of the non-eraser shapes. */
	getLayerBoundingBox: (shapes: Shape[]) => {
		const pts = shapes.filter(s => !s.isEraser).flatMap(s => s.points);
		if (pts.length === 0) return null;
		const minX = Math.min(...pts.map(q => q.x)), maxX = Math.max(...pts.map(q => q.x));
		const minY = Math.min(...pts.map(q => q.y)), maxY = Math.max(...pts.map(q => q.y));
		return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
	},
	analytics: new Proxy({}, { get: (_t, k) => (...a: unknown[]) => { log.push([`analytics.${String(k)}`, ...a]); } }),
};

const RECT = { left: 20, top: 10, width: 1000, height: 800 };
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** Same initial values as the useRef calls of StrataCanvas.tsx. */
const makeRefs = () => ({
	canvasRectRef: { current: null as unknown },
	currentPointsRef: { current: [] as unknown[] },
	isDrawingRef: { current: false },
	drawingPointerTypeRef: { current: null as string | null },
	pinchEndTimestampRef: { current: 0 },
	drawingPressureRef: { current: 0.5 },
	gestureRef: { current: {
		isPinching: false, startDist: 0, startZoom: 1, startPan: { x: 0, y: 0 }, startCenter: { x: 0, y: 0 },
		isOrbitTouch: false, orbitTouchStartAzimuth: 0, orbitTouchStartElevation: 0,
		orbitTouchStartPanX: 0, orbitTouchStartPanY: 0, orbitTouchStartZoom: 0, orbitTouchLastPos: { x: 0, y: 0 },
		tapStartTime: 0, tapMoved: false, tapTouchCount: 0,
	} },
	cameraRef: { current: { x: 0, y: 0, z: 0, rotation: 0 } },
	orbitRef: { current: { azimuth: 0, elevation: 0.2, targetAzimuth: 0, targetElevation: 0.2, panOffsetX: 0, panOffsetY: 0 } },
	moveRef: { current: null as unknown },
	lastClickTimeRef: { current: 0 },
	lastClickPosRef: { current: { x: 0, y: 0 } },
	poiMarkerSetAtRef: { current: 0 },
	drawnFrameRef: { current: null as unknown },
	organicPhaseRef: { current: 0 },
	transformRef: { current: {
		isActive: false, mode: 'none', startP: { x: 0, y: 0 },
		startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
		centerX: 0, centerY: 0, layerBB: null,
		currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
		engaged: false,
	} },
	transformHandlesRef: { current: null as unknown },
	isPanningRef: { current: false },
	isSpaceDownRef: { current: false },
	spacePanEngagedRef: { current: false },
	hoverGizmoModeRef: { current: null as unknown },
	activePointerIdRef: { current: null as number | null },
	pendingDeselectRef: { current: false },
});

const mulberry32 = (seed: number) => () => {
	seed |= 0; seed = seed + 0x6D2B79F5 | 0;
	let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
	t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
	return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const digest = (s: AppState) => ({
	mode: s.mode, tool: s.tool, currentLayerIndex: s.currentLayerIndex, totalLayers: s.totalLayers,
	shapes: s.shapes, drawingZoom: s.drawingZoom, drawingPan: s.drawingPan,
	isLayerSelected: s.isLayerSelected, viewZoomOffset: s.viewZoomOffset, pointOfInterest: s.pointOfInterest,
	textSession: s.textSession, historyIndex: s.historyIndex, historyLength: s.history.length,
	isDrawing: s.isDrawing, isOnboardingVisible: s.isOnboardingVisible, isDirty: s.isDirty,
});

const runScenario = (makeHandlers: (env: Rec) => Record<string, (e: unknown) => void>, sc: HandlerScenario) => {
	let now = 1_700_000_000_000;
	let uuid = 0;
	const random = mulberry32(12345);
	const storage: Record<string, string> = {};
	const g = globalThis as Rec;
	const saved = { now: Date.now, random: Math.random, uuid: globalThis.crypto.randomUUID, ls: g.localStorage };
	Date.now = () => now;
	Math.random = random;
	globalThis.crypto.randomUUID = (() => `id-${++uuid}`) as typeof globalThis.crypto.randomUUID;
	g.localStorage = { setItem: (k: string, v: string) => { storage[k] = v; log.push(['localStorage.setItem', k, v]); }, getItem: (k: string) => storage[k] ?? null };
	log.length = 0;

	try {
		let state: AppState = { ...initialState, isWelcomeModalOpen: false, isOnboardingVisible: false, ...(sc.state ?? {}) };
		for (const a of sc.setup ?? []) state = appReducer(state, a);

		const refs = makeRefs();
		let actions: unknown[] = [];
		const dispatch = (a: Parameters<typeof appReducer>[1]) => { actions.push(clone(a)); state = appReducer(state, a); };
		const captured = new Set<number>();
		let capture: string[] = [];
		const canvas = {
			getBoundingClientRect: () => ({ ...RECT }),
			setPointerCapture: (id: number) => { captured.add(id); capture.push(`set:${id}`); },
			hasPointerCapture: (id: number) => captured.has(id),
			releasePointerCapture: (id: number) => { captured.delete(id); capture.push(`release:${id}`); },
		};
		const ui = { cursorOverride: null as string | null, gizmoCursor: null as string | null };
		const env = (): Rec => ({
			...refs, state, dispatch, t: (k: string) => k,
			canvasRef: { current: canvas }, containerRef: { current: null }, stateRef: { current: state },
			setCursorOverride: (v: string | null) => { ui.cursorOverride = v; },
			setGizmoCursor: (v: string | null) => { ui.gizmoCursor = v; },
		});

		const snapshot = (): Rec => clone({
			gesture: refs.gestureRef.current, isDrawing: refs.isDrawingRef.current,
			drawingPointerType: refs.drawingPointerTypeRef.current, pinchEnd: refs.pinchEndTimestampRef.current,
			pressure: refs.drawingPressureRef.current, orbit: refs.orbitRef.current, move: refs.moveRef.current,
			lastClickTime: refs.lastClickTimeRef.current, lastClickPos: refs.lastClickPosRef.current,
			organicPhase: refs.organicPhaseRef.current, transform: refs.transformRef.current,
			isPanning: refs.isPanningRef.current, spacePanEngaged: refs.spacePanEngagedRef.current,
			hoverGizmoMode: refs.hoverGizmoModeRef.current, activePointerId: refs.activePointerIdRef.current,
			pendingDeselect: refs.pendingDeselectRef.current, points: refs.currentPointsRef.current,
			canvasRect: refs.canvasRectRef.current, ...ui,
		});
		let last = snapshot();
		const changed = (): Rec => {
			const cur = snapshot();
			const out: Rec = {};
			for (const k of Object.keys(cur)) if (JSON.stringify(cur[k]) !== JSON.stringify(last[k])) out[k] = cur[k];
			last = cur;
			return out;
		};

		const trace: unknown[] = [];
		const fire = (label: string, handler: string, e: Rec) => {
			actions = []; capture = []; log.length = 0;
			let prevented = 0;
			e.preventDefault = () => { prevented++; };
			e.stopPropagation = () => {};
			makeHandlers(env())[handler](e);
			trace.push({ ev: label, actions, prevented, capture, log: clone(log), refs: changed() });
		};

		const POINTER = { down: 'handlePointerDown', move: 'handlePointerMove', up: 'handlePointerUp', leave: 'handlePointerUp', cancel: 'resetGestureState' } as const;
		const TOUCH = { start: 'handleTouchStart', move: 'handleTouchMove', end: 'handleTouchEnd', cancel: 'handleTouchCancel' } as const;

		const step = (s: Step) => {
			if ('tick' in s) { now += s.tick; return; }
			if ('dispatch' in s) { state = appReducer(state, s.dispatch); last = snapshot(); return; }
			if ('ref' in s) {
				const r = (refs as unknown as Record<string, { current: unknown }>)[s.ref];
				if (!r) throw new Error(`Unknown ref ${s.ref}`);
				r.current = s.merge ? { ...(r.current as Rec), ...clone(s.value as Rec) } : clone(s.value);
				last = snapshot();
				return;
			}
			if ('pointer' in s) {
				fire(`pointer${s.pointer} ${s.x},${s.y}`, POINTER[s.pointer], {
					pointerId: s.id ?? 1, pointerType: s.type ?? 'mouse', isPrimary: s.isPrimary ?? true, button: s.button ?? 0,
					clientX: s.x, clientY: s.y, shiftKey: !!s.shift, altKey: !!s.alt, movementX: s.mx ?? 0, movementY: s.my ?? 0,
					currentTarget: canvas,
				});
				return;
			}
			fire(`touch${s.touch} ${s.touches.length}`, TOUCH[s.touch], { touches: s.touches.map(([clientX, clientY]) => ({ clientX, clientY })) });
		};
		sc.steps.forEach(step);
		return { trace, state: digest(state) };
	} finally {
		Date.now = saved.now;
		Math.random = saved.random;
		globalThis.crypto.randomUUID = saved.uuid;
		g.localStorage = saved.ls;
	}
};

export const runScenarios = (makeHandlers: (env: Rec) => Record<string, (e: unknown) => void>, scenarios: readonly HandlerScenario[]) => {
	const names = scenarios.map(s => s.name);
	const dup = names.find((n, i) => names.indexOf(n) !== i);
	if (dup) throw new Error(`Duplicated scenario name: ${dup}`);
	return Object.fromEntries(scenarios.map(sc => [sc.name, runScenario(makeHandlers, sc)]));
};
