// «Mixto» (v3.26.23): a layer whose brush strokes have more than one thickness. The logic behind
// what ToolOptionsPanel shows — which layers are mixed, the range of the band on the slider's
// track, and what touching the slider does (unify, one undo step). The panel itself is a view of
// these values and is validated by eye (localhost:3000 and iPad).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { layerThicknessRange, shownThickness } from '../src/utils/layerBrush';
import {
	base, blob, byId, diorOf, eraser, layerOf, richState, run, setThickness, spanY, straight, stroke,
	type Action,
} from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

/** One layer, two tapered strokes: thin (10) and thick (30). */
const twoThicknesses = (): AppState => run(base('tapered', 10),
	{ type: 'ADD_SHAPE', payload: stroke('thin', 'tapered', straight(0), 10) },
	{ type: 'ADD_SHAPE', payload: stroke('thick', 'tapered', straight(60), 30) });
const rangeOf = (s: AppState, layer = s.currentLayerIndex) => layerThicknessRange(s.shapes, layer);
const thicknesses = (s: AppState, layer = 0) => s.shapes.filter(x => layerOf(x) === layer && x.originalPoints).map(x => x.brushThickness);

describe('grosor «Mixto»', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	describe('cómo se muestra un grosor (D4: se guarda exacto, se redondea al mostrar)', () => {
		it.each([[20, 20], [27.400000000000002, 27], [30.449999999999996, 30], [2.5, 3], [69.6, 70], [137, 137], [1, 1], [0.96, 1], [0.4, 0.4], [0.04, 0.1]])('%f se muestra como %f', (stored, shown) => {
			expect(shownThickness(stored)).toBe(shown);
		});
	});

	describe('qué capas son mixtas', () => {
		it('una capa sin trazos de pincel no tiene rango', () => {
			expect(rangeOf(base())).toBeNull();
			expect(rangeOf(run(base(), { type: 'ADD_SHAPES', payload: [blob('b'), eraser('e')] }))).toBeNull();
		});

		it('una capa con un solo grosor no es mixta', () => {
			const s = richState(1);
			expect(rangeOf(s, 0)).toEqual({ min: 10, max: 10, mixed: false });
			expect(rangeOf(s, 1)).toEqual({ min: 30, max: 30, mixed: false });
			expect(rangeOf(s, 2)).toEqual({ min: 50, max: 50, mixed: false });
		});

		it('una capa con trazos de 10 y de 30 es mixta, de 10 a 30', () => {
			expect(rangeOf(twoThicknesses())).toEqual({ min: 10, max: 30, mixed: true });
		});

		it('la goma lleva un grosor pero no es un trazo de pincel: no cuenta', () => {
			const s = run(base('tapered', 10), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 10) }, { type: 'ADD_SHAPE', payload: eraser('e') });
			expect(byId(s, 'e').brushThickness).toBe(20);
			expect(rangeOf(s)).toEqual({ min: 10, max: 10, mixed: false });
		});

		it('acoplar dos capas del mismo grosor NO da una capa mixta: 30 y 30,45 se muestran igual', () => {
			let s = run(base('tapered', 30), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 30) }, { type: 'ADD_LAYER' });
			s = run(s, { type: 'ADD_SHAPE', payload: stroke('b', 'tapered', straight(60), 30, 1) }, { type: 'MERGE_LAYER_DOWN' });
			expect(thicknesses(s)).toEqual([30, 30.449999999999996]);
			expect(rangeOf(s)).toEqual({ min: 30, max: 30, mixed: false });
		});

		it('acoplar capas de grosores distintos da una capa mixta (G4: 10 abajo, 30 arriba)', () => {
			const merged = run(richState(1), { type: 'MERGE_LAYER_DOWN' });
			expect(rangeOf(merged)).toEqual({ min: 10, max: 30, mixed: true });
			expect(run(merged, { type: 'UNDO' }).currentLayerIndex).toBe(0);
			expect(rangeOf(run(merged, { type: 'UNDO' }), 0)).toEqual({ min: 10, max: 10, mixed: false });
		});

		it('redimensionar una capa mixta escala su rango entero', () => {
			const resized = run(twoThicknesses(), { type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0, scale: 2, dx: 0, dy: 0, centerX: 0, centerY: 0 } } });
			expect(rangeOf(resized)).toEqual({ min: 20, max: 60, mixed: true });
		});

		it('guardar y cargar conserva la capa mixta', () => {
			const loaded = run(base(), { type: 'LOAD_PROJECT', payload: diorOf(twoThicknesses()) as never });
			expect(rangeOf(loaded)).toEqual({ min: 10, max: 30, mixed: true });
		});
	});

	describe('tocar el slider unifica', () => {
		it('todos los trazos de la capa pasan al valor elegido, en un solo paso de undo', () => {
			const before = twoThicknesses();
			const after = run(before, ...setThickness(22));
			expect(thicknesses(after)).toEqual([22, 22]);
			expect(spanY(byId(after, 'thick').points)).toBeCloseTo(22, 6);
			expect(rangeOf(after)).toEqual({ min: 22, max: 22, mixed: false });
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(after.currentBrushThickness).toBe(22);
			expect(after.isDirty).toBe(true);
		});

		it('un arrastre largo (varias vistas previas) sigue siendo un solo paso', () => {
			const before = twoThicknesses();
			const drag: Action[] = [12, 15, 19, 22].flatMap(t => [{ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: t }, { type: 'SET_BRUSH_THICKNESS', payload: t }] as Action[]);
			const after = run(before, ...drag, { type: 'COMMIT_BRUSH_THICKNESS' }, { type: 'COMMIT_BRUSH_THICKNESS' });
			expect(thicknesses(after)).toEqual([22, 22]);
			expect(after.history).toHaveLength(before.history.length + 1);
		});

		it('deshacer devuelve a cada trazo su grosor de antes, y la capa vuelve a ser mixta', () => {
			const before = twoThicknesses();
			const undone = run(before, ...setThickness(22), { type: 'UNDO' });
			expect(undone.shapes).toBe(before.shapes);
			expect(thicknesses(undone)).toEqual([10, 30]);
			expect(rangeOf(undone)).toEqual({ min: 10, max: 30, mixed: true });
			expect(thicknesses(run(undone, { type: 'REDO' }))).toEqual([22, 22]);
		});

		it('deshacer también devuelve el slider al par que regía (10), no al del último trazo (30); rehacer, al unificado', () => {
			const before = twoThicknesses();
			const undone = run(before, ...setThickness(22), { type: 'UNDO' });
			expect(undone.currentBrushThickness).toBe(10);
			expect(undone.layerBrushSettings[0]).toEqual(before.layerBrushSettings[0]);
			expect(run(undone, { type: 'REDO' }).currentBrushThickness).toBe(22);
			// The same on a merged layer whose pair in force is the lower layer's.
			const merged = run(richState(1), { type: 'MERGE_LAYER_DOWN' });
			const back = run(merged, ...setThickness(22), { type: 'UNDO' });
			expect(back.currentBrushThickness).toBe(merged.currentBrushThickness);
			expect(back.brushMode).toBe(merged.brushMode);
		});

		it('unificar al grosor que ya tenía uno de los trazos también es un paso: el otro cambia', () => {
			// The slider rests on 10 (the pair in force); the user drags away and back to 10. For the
			// slider the gesture ends where it started, but the stroke of 30 did change: it counts (G6
			// compares the strokes, not the slider).
			const before = twoThicknesses();
			expect(before.currentBrushThickness).toBe(10);
			const after = run(before, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 11 }, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 10 }, { type: 'COMMIT_BRUSH_THICKNESS' });
			expect(thicknesses(after)).toEqual([10, 10]);
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(thicknesses(run(after, { type: 'UNDO' }))).toEqual([10, 30]);
		});

		it('solo unifica la capa activa', () => {
			const before = run(richState(1), { type: 'MERGE_LAYER_DOWN' }); // layer 0 mixed (10 and 30), layer 1 = old layer 2
			const after = run(before, { type: 'SET_CURRENT_LAYER', payload: 1 }, ...setThickness(22));
			expect(rangeOf(after, 0)).toEqual({ min: 10, max: 30, mixed: true });
			expect(rangeOf(after, 1)).toEqual({ min: 22, max: 22, mixed: false });
		});

		it('el botón de modo no unifica: la capa sigue mixta, con el modo nuevo en todos sus trazos', () => {
			const after = run(twoThicknesses(), { type: 'SET_BRUSH_MODE', payload: 'ink' });
			expect(thicknesses(after)).toEqual([10, 30]);
			expect(after.shapes.map(s => s.brushMode)).toEqual(['ink', 'ink']);
			expect(rangeOf(after)).toEqual({ min: 10, max: 30, mixed: true });
		});
	});

	describe('un trazo nuevo en una capa mixta', () => {
		it('se dibuja con el par vigente de la capa, y la capa sigue mixta', () => {
			// The pair in force is the one the layer already had, while one of its strokes carries it (10 here).
			const mixed = twoThicknesses();
			expect(mixed.currentBrushThickness).toBe(10);
			const after = run(mixed, { type: 'ADD_SHAPE', payload: stroke('new', 'tapered', straight(120), mixed.currentBrushThickness) });
			expect(thicknesses(after)).toEqual([10, 30, 10]);
			expect(rangeOf(after)).toEqual({ min: 10, max: 30, mixed: true });
			expect(after.currentBrushThickness).toBe(10);
		});

		it('al volver a la capa, el slider sigue en ese par', () => {
			let s = run(twoThicknesses(), { type: 'ADD_LAYER' });
			s = run(s, ...setThickness(55), { type: 'PREV_LAYER' });
			expect(s.currentLayerIndex).toBe(0);
			expect(s.currentBrushThickness).toBe(10);
			expect(rangeOf(s)).toEqual({ min: 10, max: 30, mixed: true });
		});

		it('si ningún trazo lleva ya el par de la capa, manda el del trazo más reciente', () => {
			// A file whose saved pair for the layer (44) matches none of its strokes: the last stroke's is taken.
			const file = { ...diorOf(twoThicknesses()), layerBrushSettings: { 0: { thickness: 44, mode: 'tapered' } } };
			const loaded = run(base(), { type: 'LOAD_PROJECT', payload: file as never });
			expect(loaded.currentBrushThickness).toBe(30);
			expect(rangeOf(loaded)).toEqual({ min: 10, max: 30, mixed: true });
		});

		it('tras acoplar, el par vigente es el de la capa de abajo, no el del trazo acoplado más reciente', () => {
			// resolveLayerBrush keeps the layer's own pair while one of its strokes still carries it.
			const merged = run(richState(1), { type: 'MERGE_LAYER_DOWN' });
			expect(merged.currentBrushThickness).toBe(10);
			expect(merged.brushMode).toBe('tapered');
		});
	});
});
