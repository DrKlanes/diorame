// Characterization of the hybrid undo contract (CLAUDE.md «Undo híbrido», v3.11.3 + v3.26.3).
// Invariants I1, I2, I3, I13, I14 of docs/audit-2026-11.md §3.6.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MAX_HISTORY_STEPS } from '../src/components/strata/StrataContext';
import { base, blob, eraser, layerOf, richState, run, setThickness, straight, stroke, wavy, type Action } from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

const UNDO: Action = { type: 'UNDO' };
const REDO: Action = { type: 'REDO' };

/** A long editing session: every kind of step that enters the history. One entry = one user gesture. */
const SESSION: Action[][] = [
	[{ type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) }],
	[{ type: 'ADD_SHAPE', payload: stroke('b', 'ink', wavy(), 20) }],
	[{ type: 'ADD_SHAPES', payload: [blob('c'), eraser('d')] }],
	[{ type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0.4, scale: 1.7, dx: 12, dy: -8, centerX: 150, centerY: 0 } } }],
	[{ type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0, scale: 1, scaleX: 1.5, scaleY: 0.8, dx: 0, dy: 0, centerX: 150, centerY: 0 } } }],
	[{ type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'vertical', centerX: 150, centerY: 0 } }],
	[{ type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 33, deltaY: 21 } }],
	setThickness(35),
	[{ type: 'SET_BRUSH_MODE', payload: 'uniform' }],
	[{ type: 'ADD_LAYER' }],
	setThickness(12), // empty layer: pure selection, no step
	[{ type: 'ADD_SHAPE', payload: stroke('e', 'uniform', straight(80), 12, 1) }],
	[{ type: 'ADD_SHAPE', payload: eraser('f', 1) }],
	[{ type: 'START_TEXT_SESSION', payload: { x: 5, y: 5 } }, { type: 'UPDATE_TEXT_SESSION', payload: { content: 'hola' } }, { type: 'COMMIT_TEXT_SESSION' }],
	[{ type: 'SET_PALETTE_MODE', payload: 'grad' }],
	[{ type: 'SET_PALETTE_GRADIENT_ANGLE', payload: 45 }, { type: 'COMMIT_PALETTE_GRADIENT' }],
	[{ type: 'DUPLICATE_LAYER', payload: 1 }],
	[{ type: 'MERGE_LAYER_DOWN' }],
	[{ type: 'SET_ACTIVE_PALETTE', payload: 'alternative' }],
	[{ type: 'REORDER_LAYERS', payload: { fromIndex: 0, toIndex: 1 } }],
	[{ type: 'ADD_LAYER' }],
	[{ type: 'ADD_SHAPE', payload: stroke('g', 'tapered', wavy(10, 10), 12, 2) }],
	[{ type: 'MOVE_LAYER_TO', payload: { fromIndex: 2, toIndex: 0 } }],
	[{ type: 'DELETE_CURRENT_LAYER' }],
];

/** I2: every layer's pair is one its own strokes carry, and the slider shows the active layer's pair. */
const expectSelectorsAgreeWithStrokes = (s: AppState) => {
	for (let i = 0; i < s.totalLayers; i++) {
		const strokes = s.shapes.filter(x => layerOf(x) === i && x.originalPoints && x.originalPoints.length > 0);
		if (strokes.length === 0) continue;
		const entry = s.layerBrushSettings[i];
		expect(entry, `capa ${i} con trazos y sin par`).toBeDefined();
		expect(strokes.map(x => x.brushThickness)).toContain(entry.thickness);
	}
	const active = s.layerBrushSettings[s.currentLayerIndex];
	if (active) {
		expect(s.currentBrushThickness).toBe(active.thickness);
		expect(s.brushMode).toBe(active.mode);
	}
};

describe('historial · caracterización', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	it('I1 + I2: deshacer y rehacer una sesión entera devuelve cada paso idéntico, punto a punto', () => {
		// What the document looked like at each history index, recorded on the way forward.
		const recorded = new Map<number, string>();
		let s = base('tapered', 20);
		recorded.set(s.historyIndex, JSON.stringify(s.shapes));
		for (const gesture of SESSION) {
			s = run(s, ...gesture);
			recorded.set(s.historyIndex, JSON.stringify(s.shapes));
		}
		const last = s.historyIndex;
		expect(last).toBe(23); // 24 gestures, one of them a pure selection (no step)
		expect(s.history).toHaveLength(last + 1);

		for (let i = last - 1; i >= 0; i--) {
			s = run(s, UNDO);
			expect(s.historyIndex).toBe(i);
			expect(JSON.stringify(s.shapes)).toBe(recorded.get(i));
			expect(s.totalLayers).toBe(s.history[i].totalLayers);
			expect(s.currentLayerIndex).toBeLessThan(s.totalLayers);
			expectSelectorsAgreeWithStrokes(s);
		}
		expect(run(s, UNDO)).toBe(s); // nothing before the first snapshot

		for (let i = 1; i <= last; i++) {
			s = run(s, REDO);
			expect(s.historyIndex).toBe(i);
			expect(JSON.stringify(s.shapes)).toBe(recorded.get(i));
			expectSelectorsAgreeWithStrokes(s);
		}
		expect(run(s, REDO)).toBe(s); // nothing after the last one
	});

	it('I1: deshacer devuelve las mismas formas que guardó el snapshot (no una copia recalculada)', () => {
		const a = run(base(), { type: 'ADD_SHAPE', payload: stroke('a', 'ink', wavy(), 20) });
		const b = run(a, { type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0, scale: 2, dx: 0, dy: 0, centerX: 150, centerY: 0 } } });
		const back = run(b, UNDO);
		expect(back.shapes).toBe(a.shapes);
		expect(run(back, REDO).shapes).toBe(b.shapes);
	});

	it('dibujar tras deshacer descarta lo que se podía rehacer', () => {
		let s = run(base(), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) }, { type: 'ADD_SHAPE', payload: stroke('b', 'tapered', straight(40), 20) });
		s = run(s, UNDO, { type: 'ADD_SHAPE', payload: stroke('c', 'tapered', straight(80), 20) });
		expect(s.shapes.map(x => x.id)).toEqual(['a', 'c']);
		expect(s.history).toHaveLength(3);
		expect(run(s, REDO)).toBe(s);
	});

	describe('I3: el par de una capa solo se mueve si el paso cruzado re-estiló SUS trazos (v3.26.3)', () => {
		// Layer 0: tapered T=10. Layer 1: ink T=30, then re-styled to 40. Then a stroke on layer 0.
		const scenario = () => {
			let s = run(richState(1), ...setThickness(40));            // step: layer 1 re-styled 30 → 40
			s = run(s, { type: 'SET_CURRENT_LAYER', payload: 0 });
			s = run(s, { type: 'ADD_SHAPE', payload: stroke('late', 'tapered', straight(-40), 10, 0) }); // step: a stroke on layer 0
			return s;
		};

		it('deshacer un trazo de la capa 0 no toca el par de la capa 1', () => {
			const s = run(scenario(), UNDO);
			expect(s.layerBrushSettings[1]).toEqual({ mode: 'ink', thickness: 40 });
			expect(s.layerBrushSettings[0]).toEqual({ mode: 'tapered', thickness: 10 });
			expect(s.currentBrushThickness).toBe(10);
		});

		it('cruzar el re-estilado de la capa 1 mueve su par (y solo el suyo), y rehacer lo devuelve', () => {
			const s = run(scenario(), UNDO, UNDO);
			expect(s.layerBrushSettings[1]).toEqual({ mode: 'ink', thickness: 30 });
			expect(s.layerBrushSettings[0]).toEqual({ mode: 'tapered', thickness: 10 });
			expect(s.layerBrushSettings[2]).toEqual({ mode: 'uniform', thickness: 50 });
			expect(s.currentLayerIndex).toBe(0);
			expect(s.currentBrushThickness).toBe(10); // the active layer's own value, not layer 1's
			const again = run(s, REDO);
			expect(again.layerBrushSettings[1]).toEqual({ mode: 'ink', thickness: 40 });
		});

		it('una selección pura en una capa vacía sobrevive a deshacer hasta snapshots anteriores a ella', () => {
			// Layer 0 gets two strokes; layer 1 is empty and the user picks 44 there (no step, stamped on
			// the current snapshot only). Undoing the last stroke lands on an OLDER snapshot that never
			// knew about 44: the live value must stand, because that step re-styled nothing on layer 1.
			let s = run(base('tapered', 20),
				{ type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) },
				{ type: 'ADD_LAYER' },
				{ type: 'SET_CURRENT_LAYER', payload: 0 },
				{ type: 'ADD_SHAPE', payload: stroke('b', 'tapered', straight(40), 20) },
				{ type: 'SET_CURRENT_LAYER', payload: 1 },
				...setThickness(44),
				{ type: 'SET_CURRENT_LAYER', payload: 0 },
			);
			const steps = s.history.length;
			expect(s.layerBrushSettings[1].thickness).toBe(44);
			s = run(s, UNDO);
			expect(s.history).toHaveLength(steps);
			expect(s.totalLayers).toBe(2);
			expect(s.layerBrushSettings[1].thickness).toBe(44);
			expect(run(s, { type: 'SET_CURRENT_LAYER', payload: 1 }).currentBrushThickness).toBe(44);
		});

		it('lo mismo en una capa que solo tiene un blob y una goma (nada regenerable): su par no retrocede con el undo de otra capa', () => {
			let s = run(base('tapered', 20),
				{ type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) },
				{ type: 'ADD_LAYER' },
				{ type: 'ADD_SHAPES', payload: [blob('x', 1), eraser('y', 1)] },
				{ type: 'SET_CURRENT_LAYER', payload: 0 },
				{ type: 'ADD_SHAPE', payload: stroke('b', 'tapered', straight(40), 20) },
				{ type: 'SET_CURRENT_LAYER', payload: 1 },
				{ type: 'SET_BRUSH_MODE', payload: 'ink' }, ...setThickness(44),
				{ type: 'SET_CURRENT_LAYER', payload: 0 },
				{ type: 'UNDO' },
			);
			expect(s.shapes.map(x => x.id)).toEqual(['a', 'x', 'y']);
			expect(s.layerBrushSettings[1]).toEqual({ thickness: 44, mode: 'ink' });
			s = run(s, { type: 'SET_CURRENT_LAYER', payload: 1 });
			expect(s.currentBrushThickness).toBe(44);
			expect(s.brushMode).toBe('ink');
		});
	});

	describe('I13: ocultar y fijar capas es estado de vista, nunca entra en el historial', () => {
		it('ningún snapshot guarda otra cosa que las seis claves del contrato', () => {
			let s = base();
			for (const gesture of SESSION) s = run(s, ...gesture, { type: 'TOGGLE_LAYER_VISIBILITY', payload: 0 }, { type: 'TOGGLE_3D_LOCK', payload: 0 });
			const keys = ['activePaletteId', 'layerBrushSettings', 'layerGradParams', 'layerRenderModes', 'shapes', 'totalLayers'];
			for (const snapshot of s.history) expect(Object.keys(snapshot).sort()).toEqual(keys);
		});

		it('ocultar o fijar una capa no crea paso, y deshacer otra cosa no lo revierte', () => {
			const s0 = richState(1);
			const s1 = run(s0, { type: 'TOGGLE_LAYER_VISIBILITY', payload: 0 }, { type: 'TOGGLE_3D_LOCK', payload: 2 });
			expect(s1.history).toBe(s0.history);
			expect(s1.historyIndex).toBe(s0.historyIndex);
			const undone = run(s1, UNDO);
			expect(undone.hiddenLayers).toEqual([0]);
			expect(undone.locked3DLayers).toEqual([2]);
		});
	});

	it(`I14: el historial nunca pasa de ${MAX_HISTORY_STEPS} pasos`, () => {
		let s = base();
		for (let i = 0; i < 60; i++) s = run(s, { type: 'ADD_SHAPE', payload: stroke(`s${i}`, 'tapered', straight(i), 20) });
		expect(MAX_HISTORY_STEPS).toBe(50);
		expect(s.history).toHaveLength(50);
		expect(s.historyIndex).toBe(49);
		for (let i = 0; i < 49; i++) s = run(s, UNDO);
		expect(s.historyIndex).toBe(0);
		expect(s.shapes).toHaveLength(11); // the 11 oldest strokes fell off the bottom: they can no longer be undone
		expect(run(s, UNDO)).toBe(s);
	});
});
