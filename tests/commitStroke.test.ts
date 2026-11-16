/// <reference types="node" />
// «Pointer samples → shape» (refactor phase 6, v3.26.48): canvas/commitStroke.ts against the
// output of the inline block of handlePointerUp from BEFORE the cut.
//
// The reference (fixtures/commitStroke.golden.json) was frozen in v3.26.47 by
// tools/commit-stroke-golden/generate.mjs, which cut the literal source text out of
// StrataCanvas.tsx and ran it — no copy of the logic. Exact comparison: same code, same engine.
//
// H11 (fixed in v3.26.52): the fixture still records that a mirrored eraser kept the UNMIRRORED
// eraserPolygon — that is what the code before the cut did. For those cases (H11_FIXED) the
// expectation is the fixture with that polygon mirrored, and nothing else changes.
//
// Never regenerate the fixture from the extracted module: it is the «before» side of the cut.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildStrokeShapes } from '../src/components/strata/canvas/commitStroke';
import { BASE_DEPTH_STEP } from '../src/constants/layers';
import { STROKE_CASES } from './helpers/commitStrokeCases';

const golden: { _provenance: string; cases: Record<string, unknown> } =
	JSON.parse(readFileSync(join(__dirname, 'fixtures', 'commitStroke.golden.json'), 'utf8'));

/** What handlePointerUp dispatches for one finished gesture, with ids counted per gesture. */
const dispatched = (k: (typeof STROKE_CASES)[number]) => {
	let n = 0;
	vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `id-${++n}` as `${string}-${string}-${string}-${string}-${string}`);
	const getActiveZ = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;
	const { shapeOriginal, shapeMirrored } = buildStrokeShapes(k.points, k.state, getActiveZ(k.state.currentLayerIndex));
	const action = shapeMirrored
		? { type: 'ADD_SHAPES', payload: [shapeOriginal, shapeMirrored] }
		: { type: 'ADD_SHAPE', payload: shapeOriginal };
	return JSON.parse(JSON.stringify(action));
};

type P = { x: number; y: number };
type ShapeJson = { points: P[]; eraserPolygon?: P[]; isEraser?: boolean };
type ActionJson = { type: string; payload: ShapeJson | ShapeJson[] };
const mirror = (pts: P[]) => pts.map(p => ({ ...p, x: -p.x || 0 }));

/** The cases the fixture pinned with H11: an eraser drawn with symmetry on. */
const H11_FIXED = ['eraser/one/symmetry', 'eraser/two/symmetry', 'eraser/normal/symmetry', 'eraser/loop/smoothing/symmetry/layer-1'];

/** Fixture, with H11's expectation changed: the mirrored eraser's polygon is the original's, mirrored. */
const expected = (name: string): unknown => {
	const before = golden.cases[name] as ActionJson;
	if (!H11_FIXED.includes(name)) return before;
	const [original, mirrored] = before.payload as ShapeJson[];
	return { ...before, payload: [original, { ...mirrored, eraserPolygon: mirror(original.eraserPolygon!) }] };
};

afterEach(() => { vi.restoreAllMocks(); });

describe('commitStroke · pointer samples → shape (reference: inline code before v3.26.48)', () => {
	it('the reference covers exactly the current cases', () => {
		expect(Object.keys(golden.cases).sort()).toEqual(STROKE_CASES.map(k => k.name).sort());
	});

	it.each(STROKE_CASES.map(k => [k.name, k] as const))('%s', (_name, k) => {
		expect(dispatched(k)).toEqual(expected(k.name));
	});

	it('H11: the list of fixed cases is exactly the erasers drawn with symmetry', () => {
		expect(STROKE_CASES.filter(k => k.state.tool === 'eraser' && k.state.isSymmetryEnabled).map(k => k.name).sort()).toEqual([...H11_FIXED].sort());
	});

	it.each(H11_FIXED.map(n => [n] as const))('H11 · %s: points and eraserPolygon of the mirrored eraser are the mirror image of the original\'s', name => {
		const k = STROKE_CASES.find(c => c.name === name)!;
		const [original, mirrored] = (dispatched(k) as ActionJson).payload as ShapeJson[];
		expect(mirrored.points.map(p => ({ x: p.x, y: p.y }))).toEqual(mirror(original.points).map(p => ({ x: p.x, y: p.y })));
		expect(mirrored.eraserPolygon).toEqual(mirror(original.eraserPolygon!));
		// Both on the same side of the axis: the polygon wraps the points it was built around.
		const cx = (pts: P[]) => (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2;
		expect(Math.sign(cx(mirrored.eraserPolygon!))).toBe(Math.sign(cx(mirrored.points)));
		expect(cx(mirrored.eraserPolygon!)).toBeCloseTo(-cx(original.eraserPolygon!), 9);
	});

	it('does not mutate the samples it is given', () => {
		const k = STROKE_CASES.find(c => c.name === 'brush/tapered/one')!;
		const before = JSON.stringify(k.points);
		dispatched(k);
		expect(JSON.stringify(k.points)).toBe(before);
	});
});
