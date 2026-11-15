// Proportional scale of a «Mixto» layer (v3.26.25): with the lock closed, the slider multiplies every
// regenerable brush stroke of the active layer by k (on the thickness it had when the gesture began),
// instead of unifying them. The lock is a UI preference: not in the .dior, not in the history, never
// dirty. The panel itself (×k, the band, the lock) is validated by eye in localhost:3000 and on iPad.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { layerScaleBounds, layerThicknessRange } from '../src/utils/layerBrush';
import { generateStrokeForMode } from '../src/utils/strokeGenerators';
import { base, byId, diorOf, layerOf, richState, run, setThickness, straight, stroke, wavy, type Action } from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

/** One layer, two tapered strokes: thin (10) and thick (30). The pair in force is 10. */
const twoThicknesses = (): AppState => run(base('tapered', 10),
	{ type: 'ADD_SHAPE', payload: stroke('thin', 'tapered', straight(0), 10) },
	{ type: 'ADD_SHAPE', payload: stroke('thick', 'tapered', straight(60), 30) });
const scale = (k: number): Action => ({ type: 'SCALE_LAYER_THICKNESS_PREVIEW', payload: k });
const COMMIT: Action = { type: 'COMMIT_BRUSH_THICKNESS' };
const CLEAN: Action = { type: 'MARK_CLEAN' };
const scaled = (k: number): Action[] => [scale(k), COMMIT];
const thicknesses = (s: AppState, layer = 0) => s.shapes.filter(x => layerOf(x) === layer && x.originalPoints).map(x => x.brushThickness as number);
const rangeOf = (s: AppState, layer = s.currentLayerIndex) => layerThicknessRange(s.shapes, layer);

describe('escalado proporcional de una capa «Mixto»', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	describe('qué hace con los trazos', () => {
		it('×2 lleva 10 y 30 a 20 y 60, y la capa sigue mixta', () => {
			const after = run(twoThicknesses(), ...scaled(2));
			expect(thicknesses(after)).toEqual([20, 60]);
			expect(rangeOf(after)).toEqual({ min: 20, max: 60, mixed: true });
			expect(after.brushScaleGesture).toBeNull();
		});

		it.each([0.3, 0.7, 1.3, 1.7, 2.1])('×%f conserva las razones entre trazos (1e-9), también con grosores no enteros de un acoplado', (k) => {
			const merged = run(richState(1), { type: 'MERGE_LAYER_DOWN' }); // layer 0: strokes of 10 and 30.45
			const before = thicknesses(merged);
			const after = thicknesses(run(merged, ...scaled(k)));
			expect(after).toHaveLength(before.length);
			for (let i = 0; i < before.length; i++) {
				expect(after[i]).toBeCloseTo(before[i] * k, 9);
				expect(after[i] / after[0]).toBeCloseTo(before[i] / before[0], 9);
			}
		});

		it('el multiplicador va sobre el grosor del inicio del gesto, no sobre el del tick anterior', () => {
			const after = run(twoThicknesses(), scale(1.2), scale(1.5), scale(0.8), scale(2), COMMIT);
			expect(thicknesses(after)).toEqual([20, 60]);
		});

		it('cada trazo conserva modo, semilla Ink e inkMirrored; solo cambia el grosor y se regenera el contorno', () => {
			let s = run(base('ink', 12),
				{ type: 'ADD_SHAPE', payload: stroke('ink', 'ink', wavy(), 12) },
				{ type: 'ADD_SHAPE', payload: stroke('tap', 'tapered', straight(90), 36) });
			s = run(s, { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'horizontal', centerX: 150, centerY: 0 } });
			const ink = byId(s, 'ink');
			expect(ink.inkSeed).toBeDefined();
			const after = run(s, ...scaled(1.5));
			const inkAfter = byId(after, 'ink');
			expect(inkAfter.brushMode).toBe('ink');
			expect(inkAfter.inkSeed).toBe(ink.inkSeed);
			expect(inkAfter.inkMirrored).toBe(ink.inkMirrored);
			expect(inkAfter.originalPoints).toBe(ink.originalPoints);
			expect(inkAfter.brushThickness).toBeCloseTo(18, 9);
			expect(inkAfter.points).toEqual(generateStrokeForMode('ink', ink.originalPoints!, ink.brushThickness! * 1.5, ink.inkSeed, ink.inkMirrored));
			expect(byId(after, 'tap').brushMode).toBe('tapered');
			expect(byId(after, 'tap').brushThickness).toBe(54);
		});

		it('solo escala la capa activa', () => {
			const merged = run(richState(1), { type: 'MERGE_LAYER_DOWN' }); // layer 0 mixed, layer 1 = old layer 2 (50)
			const after = run(merged, ...scaled(0.5));
			expect(thicknesses(after, 1)).toEqual(thicknesses(merged, 1));
		});
	});

	describe('límites de k', () => {
		it('10 y 30: k va de 0,1 (10 → 1, el mínimo) a 2,3 (30 → 69, sin pasar de 70)', () => {
			expect(layerScaleBounds(twoThicknesses().shapes, 0)).toEqual({ kMin: 0.1, kMax: 2.3 });
		});

		it('pedir más allá se queda en el límite, por arriba y por abajo', () => {
			const up = run(twoThicknesses(), scale(5));
			expect(up.brushScaleGesture?.k).toBe(2.3);
			expect(thicknesses(run(up, COMMIT))).toEqual([10 * 2.3, 30 * 2.3]);
			expect(Math.max(...thicknesses(up))).toBeLessThanOrEqual(70);
			const down = run(twoThicknesses(), scale(0.01));
			expect(down.brushScaleGesture?.k).toBe(0.1);
			expect(Math.min(...thicknesses(down))).toBeGreaterThanOrEqual(1);
		});

		it('una capa que ya pasa de un límite no puede ir más allá, pero sí volver', () => {
			const file = run(base('tapered', 10),
				{ type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 10) },
				{ type: 'ADD_SHAPE', payload: stroke('b', 'tapered', straight(60), 80) });
			expect(layerScaleBounds(file.shapes, 0)).toEqual({ kMin: 0.1, kMax: 1 });
			expect(thicknesses(run(file, ...scaled(1.5)))).toEqual([10, 80]);
			expect(thicknesses(run(file, ...scaled(0.5)))).toEqual([5, 40]);
		});

		it('una capa sin trazos de pincel no escala: k queda en 1', () => {
			expect(layerScaleBounds(base().shapes, 0)).toEqual({ kMin: 1, kMax: 1 });
		});
	});

	describe('historia', () => {
		it('un gesto = un paso de undo, y ensucia', () => {
			const before = run(twoThicknesses(), CLEAN);
			const after = run(before, scale(1.2), scale(1.6), scale(2), COMMIT, COMMIT);
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(after.isDirty).toBe(true);
		});

		it('deshacer devuelve a cada trazo su grosor exacto, y el slider al par que regía; rehacer, al escalado', () => {
			const before = run(richState(1), { type: 'MERGE_LAYER_DOWN' });
			const undone = run(before, ...scaled(1.7), { type: 'UNDO' });
			expect(undone.shapes).toBe(before.shapes);
			expect(thicknesses(undone)).toEqual(thicknesses(before));
			expect(undone.currentBrushThickness).toBe(before.currentBrushThickness);
			expect(thicknesses(run(undone, { type: 'REDO' }))).toEqual(thicknesses(before).map(t => t * 1.7));
		});

		it('k = 1 al soltar no deja paso (G6), ni ensucia', () => {
			const before = run(twoThicknesses(), CLEAN);
			const after = run(before, scale(1.5), scale(1), COMMIT);
			expect(after.history).toBe(before.history);
			expect(after.shapes).toBe(before.shapes);
			expect(after.isDirty).toBe(false);
			expect(after.brushScaleGesture).toBeNull();
			expect(after.brushThicknessBeforePreview).toBeNull();
		});
	});

	describe('un trazo nuevo tras escalar', () => {
		it('toma el grosor vigente de la capa escalado por el mismo k (10 × 2 = 20)', () => {
			const after = run(twoThicknesses(), ...scaled(2));
			expect(after.currentBrushThickness).toBe(20);
			expect(after.layerBrushSettings[0].thickness).toBe(20);
			const drawn = run(after, { type: 'ADD_SHAPE', payload: stroke('new', 'tapered', straight(120), after.currentBrushThickness) });
			expect(thicknesses(drawn)).toEqual([20, 60, 20]);
		});

		it('ese par se mantiene al salir de la capa y volver', () => {
			const back = run(twoThicknesses(), ...scaled(2), { type: 'ADD_LAYER' }, ...setThickness(55), { type: 'PREV_LAYER' });
			expect(back.currentBrushThickness).toBe(20);
		});
	});

	describe('el interruptor (preferencia de UI)', () => {
		it('por defecto, proporcional', () => {
			expect(base().brushScaleProportional).toBe(true);
		});

		it('no entra en el .dior, ni en la historia, ni ensucia', () => {
			const before = run(twoThicknesses(), CLEAN);
			const after = run(before, { type: 'SET_BRUSH_SCALE_PROPORTIONAL', payload: false });
			expect(after.brushScaleProportional).toBe(false);
			expect(diorOf(after)).toEqual(diorOf(before));
			expect(after.history).toBe(before.history);
			expect(after.isDirty).toBe(false);
			expect(JSON.stringify(diorOf(after))).not.toMatch(/brushScale/);
		});

		it('dura la sesión: abrir un proyecto no lo cambia', () => {
			const off = run(base(), { type: 'SET_BRUSH_SCALE_PROPORTIONAL', payload: false });
			const loaded = run(off, { type: 'LOAD_PROJECT', payload: diorOf(twoThicknesses()) as never });
			expect(loaded.brushScaleProportional).toBe(false);
		});

		it('modo unificar: tocar el slider hace lo de siempre, con el interruptor como esté', () => {
			const on = run(twoThicknesses(), ...setThickness(22));
			const off = run(twoThicknesses(), { type: 'SET_BRUSH_SCALE_PROPORTIONAL', payload: false }, ...setThickness(22));
			expect(thicknesses(off)).toEqual([22, 22]);
			expect({ ...off, brushScaleProportional: true }).toEqual(on);
		});
	});
});
