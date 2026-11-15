/// <reference types="node" />
// LOAD_PROJECT against damaged files (finding H3 of docs/audit-2026-11.md): what cannot be drawn is left
// out and the rest of the drawing opens. The healthy round trip is in dior.roundtrip.test.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initialState } from '../src/components/strata/StrataContext';
import { readableShapes } from '../src/state/loadProject';
import { diorOf, run, setThickness, straight, stroke } from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

const load = (payload: unknown, from: AppState = initialState): AppState =>
	run(from, { type: 'LOAD_PROJECT', payload: payload as never });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
afterEach(() => { vi.useRealTimers(); });

// H3 (docs/audit-2026-11.md §3.7), closed in v3.26.20. Until then whatever `shapes` held went into the state:
// a null threw inside LOAD_PROJECT itself, and a shape without points on the first move of its layer.
describe('archivos dañados: lo que no se puede dibujar se deja fuera y el resto abre', () => {
	const good = () => stroke('ok', 'tapered', straight(0), 20);
	const other = () => stroke('ok-2', 'ink', straight(60), 20);
	const pts = () => [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 9, y: 0 }];
	const DAMAGED: [string, unknown][] = [
		['un null', null],
		['un número', 5],
		['una cadena', 'x'],
		['un array', [1, 2]],
		['una forma sin points', { id: 'a', color: '#000', zIndex: 0 }],
		['points que no es una lista', { id: 'a', color: '#000', zIndex: 0, points: 'no' }],
		['points vacío', { id: 'a', color: '#000', zIndex: 0, points: [] }],
		['un punto null', { id: 'a', color: '#000', zIndex: 0, points: [{ x: 0, y: 0 }, null] }],
		['un punto con coordenada null (un NaN guardado)', { id: 'a', color: '#000', zIndex: 0, points: [{ x: 0, y: null }, { x: 1, y: 1 }] }],
		['un punto con coordenada de texto', { id: 'a', color: '#000', zIndex: 0, points: [{ x: '0', y: 0 }] }],
		['una forma sin zIndex', { id: 'a', color: '#000', points: pts() }],
		['zIndex que no es un número', { id: 'a', color: '#000', zIndex: 'cero', points: pts() }],
	];
	/** What a user does next with the layer the damaged shape was on. */
	const useLayer0 = (s: AppState) => {
		const transform = { rotation: 0.2, scale: 1.5, dx: 0, dy: 0, centerX: 0, centerY: 0 };
		run(s, { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 5, deltaY: 5 } });
		run(s, { type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform } });
		run(s, { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'horizontal', centerX: 0, centerY: 0 } });
		run(s, ...setThickness(33));
		run(s, { type: 'SET_BRUSH_MODE', payload: 'ink' }, { type: 'SET_ACTIVE_PALETTE', payload: 'alternative' }, { type: 'DUPLICATE_LAYER', payload: 0 });
		run(s, { type: 'ADD_LAYER' }, { type: 'ADD_SHAPE', payload: stroke('n', 'tapered', straight(9), 20, 1) }, { type: 'MERGE_LAYER_DOWN' });
		JSON.stringify(diorOf(s));
	};

	it.each(DAMAGED)('%s entre dos trazos sanos: se descarta, los sanos quedan intactos y la capa se puede seguir usando', (_label, damaged) => {
		const loaded = load({ shapes: [good(), damaged, other()] });
		expect(loaded.shapes.map(s => s.id)).toEqual(['ok', 'ok-2']);
		expect(JSON.stringify(loaded.shapes)).toBe(JSON.stringify([good(), other()]));
		expect(() => useLayer0(loaded)).not.toThrow();
	});

	it('readableShapes cuenta lo que se carga (lo que anuncia el aviso «N formas»)', () => {
		expect(readableShapes([good(), ...DAMAGED.map(d => d[1]), other()])).toHaveLength(2);
		expect(readableShapes('no es una lista')).toEqual([]);
		expect(readableShapes(undefined)).toEqual([]);
	});

	it('un spine o un polígono de goma dañado se quita, pero la forma se queda con su contorno', () => {
		const noSpine = load({ shapes: [{ ...good(), originalPoints: 7 }, { ...other(), originalPoints: [{ x: 0, y: 0 }, null] }] });
		expect(noSpine.shapes).toHaveLength(2);
		for (const shape of noSpine.shapes) expect('originalPoints' in shape).toBe(false);
		expect(noSpine.shapes[0].points).toEqual(good().points);
		expect(() => useLayer0(noSpine)).not.toThrow();

		const noPolygon = load({ shapes: [{ id: 'e', color: '#000', zIndex: 0, isEraser: true, points: pts(), eraserPolygon: 'x' }] });
		expect(noPolygon.shapes).toHaveLength(1);
		expect('eraserPolygon' in noPolygon.shapes[0]).toBe(false);
		expect(() => useLayer0(noPolygon)).not.toThrow();
	});

	it('capas ocultas y fijadas: solo posiciones de capas que existen, cada una una vez y en su orden', () => {
		const loaded = load({ shapes: [good()], totalLayers: 3, hiddenLayers: ['0', null, 99, -1, 1.5, 2, 1, 2], locked3DLayers: [3, 0, 0, 'x'] });
		expect(loaded.hiddenLayers).toEqual([2, 1]);
		expect(loaded.locked3DLayers).toEqual([0]);
		expect(load({ shapes: [], hiddenLayers: 'todas', locked3DLayers: { 0: true } }).hiddenLayers).toEqual([]);
	});

	it('modos de render por capa: solo «flat» o «grad» bajo una posición de capa', () => {
		const loaded = load({ shapes: [good()], totalLayers: 3, layerRenderModes: { 0: 'rayas', 1: null, 2: 'grad', x: 'grad' } });
		expect(loaded.layerRenderModes).toEqual({ 2: 'grad' });
		expect(loaded.paletteMode).toBe('flat');
		expect(load({ shapes: [], layerRenderModes: 'grad' }).layerRenderModes).toEqual({});
		expect(load({ shapes: [], layerRenderModes: { 0: 'grad' } }).paletteMode).toBe('grad');
	});

	it('un archivo sano no pierde nada: el .dior real de v3.17.55 y la escena de ejemplo cargan todas sus formas con la misma geometría', () => {
		// The example scene predates v2.3.0 (its strokes carry lineMode / lineThickness, which the migration renames),
		// so the comparison is field by field on what a shape is drawn with, not on the JSON as a whole.
		const drawn = (s: Record<string, unknown>) => JSON.stringify([s.id, s.zIndex, s.color, s.points, s.originalPoints ?? null, s.eraserPolygon ?? null, s.brushThickness ?? s.lineThickness ?? null, s.brushMode ?? s.lineMode ?? null]);
		for (const path of [['tools', 'svg-diff', 'fixtures', 'text-legacy-v3.17.55.dior'], ['public', 'examples', 'diorame_onboarding.dior']]) {
			const file = JSON.parse(readFileSync(join(__dirname, '..', ...path), 'utf8'));
			const loaded = load(file);
			expect(file.shapes.length, path.join('/')).toBeGreaterThan(10);
			expect(loaded.shapes, path.join('/')).toHaveLength(file.shapes.length);
			expect(loaded.shapes.map(s => drawn(s as unknown as Record<string, unknown>)), path.join('/')).toEqual(file.shapes.map(drawn));
			expect(loaded.hiddenLayers).toEqual(file.hiddenLayers ?? []);
			expect(loaded.locked3DLayers).toEqual(file.locked3DLayers ?? []);
			expect(loaded.layerRenderModes).toEqual(file.layerRenderModes ?? {});
		}
		// The v3.17.55 file already uses today's keys: its shapes come back identical, byte for byte.
		const modern = JSON.parse(readFileSync(join(__dirname, '..', 'tools', 'svg-diff', 'fixtures', 'text-legacy-v3.17.55.dior'), 'utf8'));
		expect(JSON.stringify(load(modern).shapes)).toBe(JSON.stringify(modern.shapes));
	});
});
