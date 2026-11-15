// Characterization of the layer operations: navigation, structure (add, delete, reorder, duplicate)
// and merge. Invariants I4 and I5 of docs/audit-2026-11.md §3.6, plus the reducer semantics table
// of CLAUDE.md (ADD_LAYER / NEXT_LAYER).
//
// Tests tagged [COMPORTAMIENTO ACTUAL · …] pin what the app does TODAY, pending a decision. They
// change only in the commit that takes that decision, visibly, never to make a refactor pass.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MAX_LAYERS } from '../src/components/strata/StrataContext';
import { DRAW_FOCAL_LENGTH } from '../src/constants/renderConstants';
import {
	base, byId, eraser, layerOf, looks, richState, run, spanY, straight, stroke, zOf,
	type Action,
} from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

const regenerable = (s: AppState, layer: number) => s.shapes.filter(x => layerOf(x) === layer && x.originalPoints && x.originalPoints.length > 0);

/** I4: nothing that survives changed its look, and the slider shows the active layer's own strokes. */
const expectNothingLeaked = (before: AppState, after: AppState) => {
	const was = looks(before), is = looks(after);
	for (const id of Object.keys(was)) if (is[id]) expect(JSON.stringify(is[id]), id).toBe(JSON.stringify(was[id]));
	const own = regenerable(after, after.currentLayerIndex);
	if (own.length > 0) {
		expect(own.map(x => x.brushThickness)).toContain(after.currentBrushThickness);
		expect(own.map(x => x.brushMode)).toContain(after.brushMode);
	}
};
const pairOf = (s: AppState) => ({ layer: s.currentLayerIndex, thickness: s.currentBrushThickness, mode: s.brushMode });
const layersOf = (s: AppState) => Object.fromEntries(s.shapes.filter(x => /^l\d-/.test(x.id)).map(x => [x.id, layerOf(x)]));

describe('capas · caracterización', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	it('el estado de partida: tres capas, cada una con su grosor (10 / 30 / 50)', () => {
		const s = richState(1);
		expect(s.totalLayers).toBe(3);
		expect(s.layerBrushSettings).toEqual({ 0: { thickness: 10, mode: 'tapered' }, 1: { thickness: 30, mode: 'ink' }, 2: { thickness: 50, mode: 'uniform' } });
		expect(pairOf(s)).toEqual({ layer: 1, thickness: 30, mode: 'ink' });
	});

	describe('I4: navegar no cambia ninguna forma ni filtra el grosor de una capa a otra', () => {
		it.each([
			['NEXT_LAYER', [{ type: 'NEXT_LAYER' }], { layer: 2, thickness: 50, mode: 'uniform' }],
			['PREV_LAYER', [{ type: 'PREV_LAYER' }], { layer: 0, thickness: 10, mode: 'tapered' }],
			['SET_CURRENT_LAYER 0', [{ type: 'SET_CURRENT_LAYER', payload: 0 }], { layer: 0, thickness: 10, mode: 'tapered' }],
			['SET_CURRENT_LAYER 2', [{ type: 'SET_CURRENT_LAYER', payload: 2 }], { layer: 2, thickness: 50, mode: 'uniform' }],
			['ida y vuelta 1 → 0 → 2 → 1', [{ type: 'PREV_LAYER' }, { type: 'SET_CURRENT_LAYER', payload: 2 }, { type: 'PREV_LAYER' }], { layer: 1, thickness: 30, mode: 'ink' }],
			['TOGGLE_LAYER_VISIBILITY', [{ type: 'TOGGLE_LAYER_VISIBILITY', payload: 0 }], { layer: 1, thickness: 30, mode: 'ink' }],
			['TOGGLE_3D_LOCK', [{ type: 'TOGGLE_3D_LOCK', payload: 2 }], { layer: 1, thickness: 30, mode: 'ink' }],
			['SET_LAYER_SELECTED', [{ type: 'SET_LAYER_SELECTED', payload: false }], { layer: 1, thickness: 30, mode: 'ink' }],
		] as [string, Action[], ReturnType<typeof pairOf>][])('%s', (_label, actions, expected) => {
			const before = richState(1);
			const after = run(before, ...actions);
			expect(after.shapes).toBe(before.shapes);
			expect(after.history).toBe(before.history);
			expect(pairOf(after)).toEqual(expected);
			expectNothingLeaked(before, after);
		});

		it('PREV_LAYER en la capa 0 y SET_CURRENT_LAYER a la capa activa no hacen nada', () => {
			const s = richState(0);
			expect(run(s, { type: 'PREV_LAYER' }).currentLayerIndex).toBe(0);
			expect(pairOf(run(s, { type: 'SET_CURRENT_LAYER', payload: 0 }))).toEqual(pairOf(s));
		});

		it('una caminata larga por las tres capas nunca deja el slider con el grosor de otra capa', () => {
			let s = richState(0);
			const walk: Action[] = [
				{ type: 'NEXT_LAYER' }, { type: 'NEXT_LAYER' }, { type: 'PREV_LAYER' }, { type: 'SET_CURRENT_LAYER', payload: 0 },
				{ type: 'SET_CURRENT_LAYER', payload: 2 }, { type: 'UNDO' }, { type: 'SET_CURRENT_LAYER', payload: 1 }, { type: 'REDO' },
				{ type: 'PREV_LAYER' }, { type: 'TOGGLE_LAYER_VISIBILITY', payload: 1 }, { type: 'NEXT_LAYER' },
			];
			for (const action of walk) {
				s = run(s, action);
				const own = regenerable(s, s.currentLayerIndex);
				if (own.length > 0) expect(own.map(x => x.brushThickness), `tras ${action.type}`).toContain(s.currentBrushThickness);
			}
		});
	});

	describe('ADD_LAYER y NEXT_LAYER (tabla de semántica de CLAUDE.md)', () => {
		it('ADD_LAYER crea la capa encima de la activa, desplaza las de arriba, pasa a ella y es un paso de undo', () => {
			const before = richState(1);
			const after = run(before, { type: 'ADD_LAYER' });
			expect(after.totalLayers).toBe(4);
			expect(after.currentLayerIndex).toBe(2); // the new, empty layer becomes the active one
			expect(layersOf(after)).toEqual({ 'l0-a': 0, 'l0-b': 0, 'l0-blob': 0, 'l0-eraser': 0, 'l1-a': 1, 'l1-b': 1, 'l2-a': 3, 'l2-blob': 3 });
			expect(after.history).toHaveLength(before.history.length + 1);
			expectNothingLeaked(before, after);
			const undone = run(after, { type: 'UNDO' });
			expect(undone.totalLayers).toBe(3);
			expect(JSON.stringify(undone.shapes)).toBe(JSON.stringify(before.shapes));
		});

		it('la capa nueva, vacía, conserva el par que había en el slider', () => {
			const after = run(richState(1), { type: 'ADD_LAYER' });
			expect(pairOf(after)).toEqual({ layer: 2, thickness: 30, mode: 'ink' });
		});

		it('NEXT_LAYER navega; solo crea capa (y paso de undo) si ya estamos en la última', () => {
			const mid = richState(1);
			const moved = run(mid, { type: 'NEXT_LAYER' });
			expect(moved.totalLayers).toBe(3);
			expect(moved.history).toBe(mid.history);
			const top = richState(2);
			const created = run(top, { type: 'NEXT_LAYER' });
			expect(created.totalLayers).toBe(4);
			expect(created.currentLayerIndex).toBe(3);
			expect(created.history).toHaveLength(top.history.length + 1);
			expect(pairOf(created)).toEqual({ layer: 3, thickness: 50, mode: 'uniform' });
		});

		it(`con ${MAX_LAYERS} capas, ADD_LAYER y NEXT_LAYER en la última no hacen nada`, () => {
			let s = base();
			for (let i = 1; i < MAX_LAYERS; i++) s = run(s, { type: 'ADD_LAYER' });
			expect(s.totalLayers).toBe(MAX_LAYERS);
			expect(run(s, { type: 'ADD_LAYER' })).toBe(s);
			expect(run(s, { type: 'NEXT_LAYER' }).totalLayers).toBe(MAX_LAYERS);
		});

		it('G8 [COMPORTAMIENTO ACTUAL · hallazgo de la fase 1, sin decisión] una capa creada en medio de la pila hereda el par guardado de la capa que ocupaba su sitio', () => {
			// ADD_LAYER shifts the per-layer brush pairs up but never clears the new slot (its own
			// comment says «not set»): the empty layer 2 keeps old layer 2's pair, uniform / 50. The
			// slider still shows 30 / ink right after creating it, and switches to 50 / uniform as
			// soon as the user leaves the layer and comes back: one layer's thickness on another.
			const after = run(richState(1), { type: 'ADD_LAYER' });
			expect(regenerable(after, 2)).toHaveLength(0);
			expect(after.layerBrushSettings[2]).toEqual({ thickness: 50, mode: 'uniform' });
			expect(after.layerBrushSettings[3]).toEqual({ thickness: 50, mode: 'uniform' });
			const back = run(after, { type: 'PREV_LAYER' }, { type: 'NEXT_LAYER' });
			expect(pairOf(back)).toEqual({ layer: 2, thickness: 50, mode: 'uniform' });
		});
	});

	describe('I4: borrar, reordenar y duplicar remapean las capas sin tocar las formas', () => {
		it('DELETE_CURRENT_LAYER quita la capa activa y baja las de arriba', () => {
			const before = richState(1);
			const after = run(before, { type: 'DELETE_CURRENT_LAYER' });
			expect(after.totalLayers).toBe(2);
			expect(layersOf(after)).toEqual({ 'l0-a': 0, 'l0-b': 0, 'l0-blob': 0, 'l0-eraser': 0, 'l2-a': 1, 'l2-blob': 1 });
			expect(after.layerBrushSettings).toEqual({ 0: { thickness: 10, mode: 'tapered' }, 1: { thickness: 50, mode: 'uniform' } });
			expect(pairOf(after)).toEqual({ layer: 1, thickness: 50, mode: 'uniform' });
			expectNothingLeaked(before, after);
			expect(JSON.stringify(run(after, { type: 'UNDO' }).shapes)).toBe(JSON.stringify(before.shapes));
		});

		it('DELETE_CURRENT_LAYER con una sola capa no hace nada', () => {
			const s = run(base(), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) });
			expect(run(s, { type: 'DELETE_CURRENT_LAYER' })).toBe(s);
		});

		it('REORDER_LAYERS intercambia dos capas y sus pares', () => {
			const before = richState(1);
			const after = run(before, { type: 'REORDER_LAYERS', payload: { fromIndex: 0, toIndex: 2 } });
			expect(layersOf(after)).toEqual({ 'l0-a': 2, 'l0-b': 2, 'l0-blob': 2, 'l0-eraser': 2, 'l1-a': 1, 'l1-b': 1, 'l2-a': 0, 'l2-blob': 0 });
			expect(after.layerBrushSettings).toEqual({ 0: { thickness: 50, mode: 'uniform' }, 1: { thickness: 30, mode: 'ink' }, 2: { thickness: 10, mode: 'tapered' } });
			expect(pairOf(after)).toEqual({ layer: 1, thickness: 30, mode: 'ink' });
			expectNothingLeaked(before, after);
		});

		it('MOVE_LAYER_TO mueve una capa a otra posición y la capa activa la sigue', () => {
			const before = richState(1);
			const after = run(before, { type: 'MOVE_LAYER_TO', payload: { fromIndex: 2, toIndex: 0 } });
			expect(layersOf(after)).toEqual({ 'l0-a': 1, 'l0-b': 1, 'l0-blob': 1, 'l0-eraser': 1, 'l1-a': 2, 'l1-b': 2, 'l2-a': 0, 'l2-blob': 0 });
			expect(after.layerBrushSettings).toEqual({ 0: { thickness: 50, mode: 'uniform' }, 1: { thickness: 10, mode: 'tapered' }, 2: { thickness: 30, mode: 'ink' } });
			expect(pairOf(after)).toEqual({ layer: 2, thickness: 30, mode: 'ink' });
			expectNothingLeaked(before, after);
		});

		it('DUPLICATE_LAYER copia la capa encima, con el mismo aspecto y el mismo par, y pasa a la copia', () => {
			const before = richState(1);
			const after = run(before, { type: 'DUPLICATE_LAYER', payload: 1 });
			expect(after.totalLayers).toBe(4);
			expect(after.shapes).toHaveLength(before.shapes.length + 2);
			const copies = after.shapes.filter(x => layerOf(x) === 2);
			expect(copies).toHaveLength(2);
			copies.forEach((copy, i) => {
				const original = byId(before, ['l1-a', 'l1-b'][i]);
				expect(copy.id).not.toBe(original.id);
				expect(copy.points).toEqual(original.points);
				expect(copy.originalPoints).toEqual(original.originalPoints);
				expect(copy.brushThickness).toBe(30);
				expect(copy.brushMode).toBe('ink');
			});
			expect(after.layerBrushSettings[2]).toEqual({ thickness: 30, mode: 'ink' });
			expect(after.layerBrushSettings[3]).toEqual({ thickness: 50, mode: 'uniform' });
			expect(pairOf(after)).toEqual({ layer: 2, thickness: 30, mode: 'ink' });
			expectNothingLeaked(before, after);
		});
	});

	describe('I5: acoplar (MERGE_LAYER_DOWN)', () => {
		// A = layer 1 (active) goes onto B = layer 0. A's plane changes, seen from A's own camera.
		const k = (fromLayer: number, toLayer: number, viewLayer: number) =>
			(DRAW_FOCAL_LENGTH + zOf(toLayer) - zOf(viewLayer)) / (DRAW_FOCAL_LENGTH + zOf(fromLayer) - zOf(viewLayer));
		const kA = k(1, 0, 1);     // 1.015
		const kUpper = k(2, 1, 1); // layer 2 moves down one plane as well

		it('el factor de plano es 1,015 (~1,5 % por capa con focal 10000)', () => {
			expect(kA).toBe(1.015);
		});

		it('contorno, spine y brushThickness de la capa acoplada se escalan juntos: la razón contorno / grosor se conserva', () => {
			const before = richState(1);
			const after = run(before, { type: 'MERGE_LAYER_DOWN' });
			expect(after.totalLayers).toBe(2);
			expect(after.currentLayerIndex).toBe(0);
			for (const id of ['l1-a', 'l1-b']) {
				const was = byId(before, id), is = byId(after, id);
				expect(layerOf(is)).toBe(0);
				expect(is.points).toEqual(was.points.map(p => ({ ...p, x: p.x * kA, y: p.y * kA })));
				expect(is.originalPoints).toEqual(was.originalPoints!.map(p => ({ ...p, x: p.x * kA, y: p.y * kA })));
				expect(is.brushThickness).toBe(was.brushThickness! * kA);
			}
			const was = byId(before, 'l1-a'), is = byId(after, 'l1-a');
			expect(spanY(is.points) / is.brushThickness!).toBeCloseTo(spanY(was.points) / was.brushThickness!, 9);
		});

		it('las formas de la capa de abajo quedan intactas (el mismo objeto)', () => {
			const before = richState(1);
			const after = run(before, { type: 'MERGE_LAYER_DOWN' });
			for (const shape of before.shapes.filter(x => layerOf(x) === 0)) expect(byId(after, shape.id), shape.id).toBe(shape);
		});

		it('las capas de arriba bajan un plano con su propio factor', () => {
			const before = richState(1);
			const after = run(before, { type: 'MERGE_LAYER_DOWN' });
			const was = byId(before, 'l2-a'), is = byId(after, 'l2-a');
			expect(layerOf(is)).toBe(1);
			expect(is.points).toEqual(was.points.map(p => ({ ...p, x: p.x * kUpper, y: p.y * kUpper })));
			expect(is.brushThickness).toBe(50 * kUpper);
			expect(after.layerBrushSettings[1].mode).toBe('uniform');
		});

		it('deshacer el acoplado lo restaura todo: formas, capas y pares', () => {
			const before = richState(1);
			const undone = run(before, { type: 'MERGE_LAYER_DOWN' }, { type: 'UNDO' });
			expect(undone.shapes).toBe(before.shapes);
			expect(undone.totalLayers).toBe(3);
			expect(undone.layerBrushSettings).toEqual(before.layerBrushSettings);
		});

		it('G4 [COMPORTAMIENTO ACTUAL · pendiente de D4] la capa resultante mezcla grosores (10 y 30,449999999999996) y el slider enseña 10', () => {
			const after = run(richState(1), { type: 'MERGE_LAYER_DOWN' });
			expect([...new Set(regenerable(after, 0).map(x => x.brushThickness))]).toEqual([10, 30.449999999999996]);
			expect(pairOf(after)).toEqual({ layer: 0, thickness: 10, mode: 'tapered' });
		});

		it('sin goma ni dibujar dentro / detrás, las formas acopladas no llevan grupo', () => {
			const after = run(richState(1), { type: 'MERGE_LAYER_DOWN' });
			for (const shape of after.shapes) expect(shape.group).toBeUndefined();
		});

		it('con una goma en la capa de arriba, sus formas entran en un grupo aislado y las de abajo no', () => {
			const before = run(richState(1), { type: 'ADD_SHAPE', payload: eraser('l1-eraser', 1) });
			const after = run(before, { type: 'MERGE_LAYER_DOWN' });
			const groups = ['l1-a', 'l1-b', 'l1-eraser'].map(id => byId(after, id).group);
			expect(groups[0]).toHaveLength(1);
			expect(groups[1]).toEqual(groups[0]);
			expect(groups[2]).toEqual(groups[0]);
			expect(byId(after, 'l0-a').group).toBeUndefined();
			expect(byId(after, 'l2-a').group).toBeUndefined();
		});

		it('no se acopla desde la capa 0, ni una capa vacía, ni con una capa oculta', () => {
			const bottom = richState(0);
			expect(run(bottom, { type: 'MERGE_LAYER_DOWN' })).toBe(bottom);
			const empty = run(richState(2), { type: 'ADD_LAYER' });
			expect(run(empty, { type: 'MERGE_LAYER_DOWN' })).toBe(empty);
			const hidden = run(richState(1), { type: 'TOGGLE_LAYER_VISIBILITY', payload: 0 });
			expect(run(hidden, { type: 'MERGE_LAYER_DOWN' })).toBe(hidden);
		});
	});
});
