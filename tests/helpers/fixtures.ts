// Shared fixtures of the characterization suite. Everything here drives the REAL reducer and the
// REAL generators: no mocks. `stroke()` mirrors what StrataCanvas stamps on pointerup
// (handlePointerUp: outline in `points`, raw samples in `originalPoints`, brushThickness, brushMode).
import { appReducer, initialState } from '../../src/components/strata/StrataContext';
import { generateStrokeForMode } from '../../src/utils/strokeGenerators';
import { buildDiorData } from '../../src/utils/diorPayload';
import { DIOR_FORMAT_VERSION } from '../../src/utils/projectMeta';
import type { AppState, BrushMode, Point, Shape } from '../../src/types/strataTypes';

export type Action = Parameters<typeof appReducer>[1];
export type P = { x: number; y: number };

export const DEPTH = 150; // BASE_DEPTH_STEP
/** zIndex of a layer. `|| 0` keeps layer 0 at +0 (0 * -150 is -0, which toEqual tells apart from 0). */
export const zOf = (layer: number): number => layer * -DEPTH || 0;

export const run = (state: AppState, ...actions: Action[]): AppState =>
	actions.reduce((s, a) => appReducer(s, a), state);

// ── Spines (raw pointer samples) ────────────────────────────────────────────────────────────────
/** Slow stroke: every span (1.2 px) is shorter than Ink's shortest segLen (1.5), so nothing is densified. */
export const slowLine = (): P[] => Array.from({ length: 200 }, (_, i) => ({ x: i * 1.2, y: 10 * Math.sin(i / 20) }));
/** Fast stroke: 6 samples on a 100 px arc, spans of ~62 px. What v3.26.4's curved densify is for. */
export const fastArc = (): P[] => [0, 1, 2, 3, 4, 5].map(i => ({ x: 100 * Math.cos(i * Math.PI / 5), y: 100 * Math.sin(i * Math.PI / 5) }));
export const zigzag = (): P[] => [{ x: 0, y: 0 }, { x: 40, y: 30 }, { x: 80, y: 0 }, { x: 120, y: 30 }, { x: 160, y: 0 }, { x: 160, y: 60 }];
export const tap = (): P[] => [{ x: 10, y: 10 }, { x: 10.1, y: 10.1 }];
export const repeated = (): P[] => [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 0 }, { x: 60, y: 10 }];
export const single = (): P[] => [{ x: 5, y: 5 }];
/** Straight 300 px line, dense samples: the stroke the audit measured (docs/audit-2026-11.md §3.6). */
export const straight = (y = 0, x0 = 0): P[] => Array.from({ length: 61 }, (_, i) => ({ x: x0 + i * 5, y }));
/** A wavy stroke off the origin, non-integer coordinates. */
export const wavy = (dx = 0, dy = 0): P[] => Array.from({ length: 61 }, (_, i) => ({ x: i * 5 + 3.3 + dx, y: 40 * Math.sin(i / 9) + 7.7 + dy }));

export const SPINES = { slowLine, fastArc, zigzag, tap, repeated, single } as const;
export const MODES: readonly BrushMode[] = ['tapered', 'uniform', 'ink'];
export const THICKNESSES: readonly number[] = [1, 20, 70];

// ── Shapes ──────────────────────────────────────────────────────────────────────────────────────
export const stroke = (id: string, mode: BrushMode, spine: P[], thickness: number, layer = 0, extra: Partial<Shape> = {}): Shape => ({
	id, color: initialState.palette[2], zIndex: zOf(layer),
	points: generateStrokeForMode(mode, spine, thickness), originalPoints: spine,
	brushThickness: thickness, brushMode: mode,
	isEraser: false, isDrawInside: false, isDrawBehind: false,
	...extra,
});
/** Blob: a filled polygon, no spine, no thickness. Never regenerated. */
export const blob = (id: string, layer = 0, at = 0): Shape => ({
	id, color: '#222222', zIndex: zOf(layer),
	points: [{ x: at, y: at }, { x: at + 80, y: at + 5 }, { x: at + 70, y: at + 60 }, { x: at + 10, y: at + 50 }],
	isEraser: false, isDrawInside: false, isDrawBehind: false,
});
/** Eraser: outline + eraserPolygon + brushThickness, but NO originalPoints (so it is not regenerable). */
export const eraser = (id: string, layer = 0): Shape => {
	const pts: Point[] = [{ x: 20, y: 20 }, { x: 60, y: 22 }, { x: 58, y: 40 }, { x: 22, y: 38 }];
	return { id, color: '#000000', zIndex: zOf(layer), points: pts, eraserPolygon: generateStrokeForMode('tapered', pts, 20), brushThickness: 20, isEraser: true, isDrawInside: false, isDrawBehind: false };
};

// ── States ──────────────────────────────────────────────────────────────────────────────────────
export const base = (mode: BrushMode = 'tapered', thickness = 20): AppState =>
	({ ...initialState, tool: 'brush', brushMode: mode, currentBrushThickness: thickness, isWelcomeModalOpen: false });

/** PREVIEW + COMMIT: one full slider gesture. */
export const setThickness = (t: number): Action[] => [{ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: t }, { type: 'COMMIT_BRUSH_THICKNESS' }];

/**
 * Three layers with content, each with its own thickness (10 / 30 / 50), ending on `layer`:
 *   0: tapered ×2 (T=10), a blob, an eraser, a text
 *   1: ink ×2 (T=30)
 *   2: uniform ×1 (T=50), a blob
 */
export const richState = (layer = 1): AppState => {
	let s = base('tapered', 10);
	s = run(s,
		{ type: 'ADD_SHAPE', payload: stroke('l0-a', 'tapered', straight(0), 10, 0) },
		{ type: 'ADD_SHAPE', payload: stroke('l0-b', 'tapered', wavy(), 10, 0) },
		{ type: 'ADD_SHAPE', payload: blob('l0-blob', 0, 200) },
		{ type: 'ADD_SHAPE', payload: eraser('l0-eraser', 0) },
		{ type: 'START_TEXT_SESSION', payload: { x: 50, y: -80 } },
		{ type: 'UPDATE_TEXT_SESSION', payload: { content: 'Diorame' } },
		{ type: 'COMMIT_TEXT_SESSION' },
		{ type: 'ADD_LAYER' }, { type: 'SET_CURRENT_LAYER', payload: 1 },
		{ type: 'SET_BRUSH_MODE', payload: 'ink' }, ...setThickness(30),
		{ type: 'ADD_SHAPE', payload: stroke('l1-a', 'ink', straight(100), 30, 1) },
		{ type: 'ADD_SHAPE', payload: stroke('l1-b', 'ink', wavy(20, 150), 30, 1) },
		{ type: 'ADD_LAYER' }, { type: 'SET_CURRENT_LAYER', payload: 2 },
		{ type: 'SET_BRUSH_MODE', payload: 'uniform' }, ...setThickness(50),
		{ type: 'ADD_SHAPE', payload: stroke('l2-a', 'uniform', straight(250), 50, 2) },
		{ type: 'ADD_SHAPE', payload: blob('l2-blob', 2, -150) },
		{ type: 'SET_CURRENT_LAYER', payload: layer },
	);
	return s;
};

// ── Measures ────────────────────────────────────────────────────────────────────────────────────
/** Layer index of a shape. `|| 0` for the same reason as zOf: 0 / -150 is -0. */
export const layerOf = (s: Shape): number => Math.round(s.zIndex / -DEPTH) || 0;
export const byId = (state: AppState, id: string): Shape => {
	const s = state.shapes.find(x => x.id === id);
	if (!s) throw new Error(`shape ${id} not found`);
	return s;
};
/** Width of the outline's envelope across a horizontal stroke. */
export const spanY = (pts: readonly P[]): number => Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
export const spanX = (pts: readonly P[]): number => Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x));
/** Largest distance between matching points of two outlines (b shifted by −dx, −dy); Infinity if the counts differ. */
export const maxDiff = (a: readonly P[], b: readonly P[], dx = 0, dy = 0): number =>
	a.length !== b.length ? Infinity : a.reduce((m, p, i) => Math.max(m, Math.hypot(p.x + dx - b[i].x, p.y + dy - b[i].y)), 0);

/** What a shape LOOKS like: the fields a re-style, a transform or a merge can change. */
export const look = (s: Shape) => ({ points: s.points, originalPoints: s.originalPoints, brushThickness: s.brushThickness, brushMode: s.brushMode });
export const looks = (state: AppState): Record<string, ReturnType<typeof look>> =>
	Object.fromEntries(state.shapes.map(s => [s.id, look(s)]));

// ── .dior ───────────────────────────────────────────────────────────────────────────────────────
/** The JSON a `.dior` holds for this state, as it comes back from disk (thumbnail left out). */
export const diorOf = (state: AppState): Record<string, unknown> =>
	JSON.parse(JSON.stringify(buildDiorData(state, state.projectName, {
		formatVersion: DIOR_FORMAT_VERSION, ...state.projectMeta, shapeCount: state.shapes.length, thumbnail: null,
	})));
/** Top-level keys of the two payloads whose values differ. */
export const diffKeys = (a: Record<string, unknown>, b: Record<string, unknown>): string[] =>
	[...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).sort();
