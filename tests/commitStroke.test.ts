/// <reference types="node" />
// «Pointer samples → shape» (refactor phase 6, v3.26.48): canvas/commitStroke.ts against the
// output of the inline block of handlePointerUp from BEFORE the cut.
//
// The reference (fixtures/commitStroke.golden.json) was frozen in v3.26.47 by
// tools/commit-stroke-golden/generate.mjs, which cut the literal source text out of
// StrataCanvas.tsx and ran it — no copy of the logic. Exact comparison: same code, same engine.
// It also fixes, as current behaviour, that a mirrored eraser keeps the UNMIRRORED eraserPolygon.
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

afterEach(() => { vi.restoreAllMocks(); });

describe('commitStroke · pointer samples → shape (reference: inline code before v3.26.48)', () => {
	it('the reference covers exactly the current cases', () => {
		expect(Object.keys(golden.cases).sort()).toEqual(STROKE_CASES.map(k => k.name).sort());
	});

	it.each(STROKE_CASES.map(k => [k.name, k] as const))('%s', (_name, k) => {
		expect(dispatched(k)).toEqual(golden.cases[k.name]);
	});

	it('does not mutate the samples it is given', () => {
		const k = STROKE_CASES.find(c => c.name === 'brush/tapered/one')!;
		const before = JSON.stringify(k.points);
		dispatched(k);
		expect(JSON.stringify(k.points)).toBe(before);
	});
});
