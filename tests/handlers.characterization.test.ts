/// <reference types="node" />
// Pointer and touch handlers of StrataCanvas.tsx (handlers sprint, v3.26.53): what every scripted
// gesture dispatches and which refs each event changes, against a reference frozen with the
// handlers of v3.26.52 — before any of their logic moved to a module.
//
// tools/handlers-golden/harness.mjs cuts the LITERAL handler text out of the StrataCanvas.tsx of the
// working tree and runs it with the real reducer and the real pure modules it imports. So this
// test needs no change when a handler's logic moves to a module: it runs whatever the file holds
// now, and the trace has to stay the same. A refactor that turns it red changed behaviour.
//
// What it does NOT cover: when the browser delivers each event, React's render timing, the RAF,
// pointer capture by the real DOM, and getLayerBoundingBox (a geometric stand-in here). Those are
// the dev server and the iPad.
//
// The reference (fixtures/handlers.golden.json) is never regenerated to turn this green.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { runHandlers } from '../tools/handlers-golden/harness.mjs';
import { HANDLER_SCENARIOS } from './helpers/handlerScenarios';

type Event = { ev: string; actions: { type: string; payload?: unknown }[]; prevented: number; capture: string[]; log: unknown[]; refs: Record<string, unknown> };
type Trace = { trace: Event[]; state: Record<string, unknown> };

const golden: { _provenance: string; cases: Record<string, Trace> } =
	JSON.parse(readFileSync(join(__dirname, 'fixtures', 'handlers.golden.json'), 'utf8'));

let now: Record<string, Trace> = {};
beforeAll(async () => {
	const source = readFileSync(join(__dirname, '..', 'src', 'components', 'strata', 'StrataCanvas.tsx'), 'utf8');
	now = await runHandlers(source) as Record<string, Trace>;
}, 60_000);

const dispatched = (t: Trace) => t.trace.flatMap(e => e.actions.map(a => a.type));

describe('StrataCanvas handlers · scripted gestures (reference: handlers of v3.26.52)', () => {
	it('the reference covers exactly the current scenarios', () => {
		expect(Object.keys(golden.cases).sort()).toEqual(HANDLER_SCENARIOS.map(s => s.name).sort());
	});

	it.each(HANDLER_SCENARIOS.map(s => [s.name] as const))('%s', name => {
		expect(now[name]).toEqual(golden.cases[name]);
	});
});

// Readable anchors on top of the traces: if a scenario stops doing what its name says, the
// reference was frozen wrong, and this says so without opening a 600 kB fixture.
describe('StrataCanvas handlers · what the reference itself says', () => {
	const g = golden.cases;

	it('micro-strokes: a finger needs more than 2 samples; pen and mouse do not', () => {
		expect(dispatched(g['micro-stroke/touch/1-sample/discarded'])).not.toContain('ADD_SHAPE');
		expect(dispatched(g['micro-stroke/touch/2-samples/discarded'])).not.toContain('ADD_SHAPE');
		expect(dispatched(g['micro-stroke/touch/3-samples/kept'])).toContain('ADD_SHAPE');
		expect(dispatched(g['micro-stroke/pen/1-sample/kept'])).toContain('ADD_SHAPE');
		expect(dispatched(g['micro-stroke/mouse/2-samples/kept'])).toContain('ADD_SHAPE');
	});

	it('two-finger tap = UNDO under 300 ms; three-finger tap = REDO under 250 ms', () => {
		expect(dispatched(g['touch2/tap/299ms/undo'])).toEqual(['UNDO']);
		expect(dispatched(g['touch2/tap/300ms/nothing'])).toEqual([]);
		expect(dispatched(g['touch3/tap/249ms/redo'])).toEqual(['REDO']);
		expect(dispatched(g['touch3/tap/250ms/nothing'])).toEqual([]);
	});

	it('two fingers become a pinch only when their centre moves MORE than 10 px and they started at least 5 px apart', () => {
		expect(dispatched(g['touch2/tap/centre-moved-10px/still-a-tap'])).toEqual(['UNDO']);
		expect(dispatched(g['touch2/pinch/centre-moved-10.01px'])).toEqual(['SET_DRAWING_ZOOM']);
		expect(dispatched(g['touch2/fingers-together-under-5px/moved-but-no-pinch'])).toEqual([]);
		expect(dispatched(g['touch2/start-distance-exactly-5px/pinch'])).toEqual(['SET_DRAWING_ZOOM']);
	});

	it('pinch zoom stays within 0.5 – 3 and the 150 ms cooldown only holds back a finger', () => {
		expect(g['touch2/pinch/zoom-out/clamped-at-0.5'].state.drawingZoom).toBe(0.5);
		expect(g['touch2/pinch/zoom-in/clamped-at-3'].state.drawingZoom).toBe(3);
		expect(dispatched(g['touch2/after-a-pinch/touch-pointerdown/149ms/ignored'])).not.toContain('ADD_SHAPE');
		expect(dispatched(g['touch2/after-a-pinch/touch-pointerdown/150ms/draws'])).toContain('ADD_SHAPE');
		expect(dispatched(g['touch2/after-a-pinch/mouse-pointerdown/no-cooldown'])).toContain('ADD_SHAPE');
	});

	// Phase 6 finding, fixed here as it is: handleTouchMove only turns two fingers into a pinch when
	// their CENTRE moves more than 10 px. A perfectly symmetric spread leaves the centre where it
	// was: no zoom at all, and released under 300 ms it is read as a two-finger tap. Not changed in
	// this sprint; to be characterised on an iPad (real fingers rarely keep the centre still).
	it('[COMPORTAMIENTO ACTUAL · pinch con el centro quieto] spreading two fingers around a still centre never zooms, and released under 300 ms it undoes', () => {
		const quick = g['touch2/still-centre-pinch/released-under-300ms/undo'];
		expect(dispatched(quick)).toEqual(['UNDO']);
		expect(quick.state.drawingZoom).toBe(1);
		expect(quick.trace.some(e => e.refs.gesture && (e.refs.gesture as { isPinching: boolean }).isPinching)).toBe(false);
		const slow = g['touch2/still-centre-pinch/held-over-300ms/no-zoom-no-undo'];
		expect(dispatched(slow)).toEqual([]);
		expect(slow.state.drawingZoom).toBe(1);
	});

	it('Move: deselecting waits for the release, and a second finger or a cancel takes it back', () => {
		const sel = (name: string) => g[name].trace.flatMap(e => e.actions.filter(a => a.type === 'SET_LAYER_SELECTED').map(a => a.payload));
		const tap = g['move/selected/outside/deselect-on-release'];
		expect(tap.trace[0].actions).toEqual([]);
		expect(tap.trace[0].capture).toEqual([]);
		expect(sel('move/selected/outside/deselect-on-release')).toEqual([false]);
		expect(sel('move/selected/outside/second-finger-cancels-the-deselect')).toEqual([]);
		expect(sel('move/selected/outside/pointercancel-keeps-the-selection')).toEqual([]);
		expect(sel('move/deselected/inside/select-and-drag')).toEqual([true]);
		expect(dispatched(g['move/deselected/on-the-invisible-rotate-handle/no-op'])).toEqual([]);
	});

	it('Move: a 2 px drag is a click, every handle commits one TRANSFORM_LAYER, an abandoned drag commits nothing', () => {
		expect(dispatched(g['move/selected/inside/dead-zone/2px-is-a-click'])).not.toContain('TRANSFORM_LAYER');
		for (const name of ['move/selected/inside/drag', 'move/selected/corner/scale', 'move/selected/side/stretch-x', 'move/selected/side/stretch-y', 'move/selected/rotate-handle']) {
			expect(dispatched(g[name]).filter(t => t === 'TRANSFORM_LAYER'), name).toHaveLength(1);
		}
		for (const name of ['move/drag/second-finger-abandons-it', 'move/drag/third-finger-abandons-it', 'move/drag/pointercancel-discards-it']) {
			expect(dispatched(g[name]), name).not.toContain('TRANSFORM_LAYER');
		}
	});

	it('CINEMA double click frames only within 300 ms and 40 px', () => {
		const poi = (name: string) => dispatched(g[name]).filter(t => t === 'SET_POINT_OF_INTEREST').length;
		expect(poi('poi/double-click/299ms')).toBe(1);
		expect(poi('poi/double-click/40px-apart')).toBe(1);
		// The failed pair re-arms: the third click frames.
		expect(g['poi/double-click/300ms/re-arms'].trace.map(e => e.actions.length)).toEqual([0, 0, 1]);
		expect(g['poi/double-click/40.01px-apart/re-arms-on-the-second'].trace.map(e => e.actions.length)).toEqual([0, 0, 1]);
	});
});
