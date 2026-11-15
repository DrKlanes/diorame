// Characterization of the brush thickness model (docs/audit-2026-11.md §3.6): invariants I6–I10,
// I12 and the measured quirks G1, G3, G5, G6.
//
// Tests tagged [COMPORTAMIENTO ACTUAL · …] pin what the app does TODAY, not what it should do.
// They are expected to change — deliberately, in the commit that takes the decision named in the
// tag — and that change must be visible in this file's diff. Never edit one to make a refactor pass.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	MODES, base, blob, byId, eraser, maxDiff, richState, run, setThickness, spanX, spanY, straight, stroke, wavy,
	type Action, type P,
} from './helpers/fixtures';
import type { AppState, BrushMode } from '../src/types/strataTypes';

const EPS = 1e-9;
const one = (mode: BrushMode, spine: P[] = straight(0), t = 20): AppState =>
	run(base(mode, t), { type: 'ADD_SHAPE', payload: stroke('a', mode, spine, t) });
/** Not one shape was regenerated: every element is the very same object (the array itself may be a new one). */
const expectSameShapes = (after: AppState, before: AppState) => {
	expect(after.shapes).toHaveLength(before.shapes.length);
	after.shapes.forEach((shape, i) => expect(shape, shape.id).toBe(before.shapes[i]));
};
const resize = (scale: number, extra: object = {}): Action =>
	({ type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0, scale, dx: 0, dy: 0, centerX: 150, centerY: 0, ...extra } } });

describe('grosor · caracterización', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	describe('redimensionar', () => {
		it.each(MODES.map(m => [m] as const))('I6 [COMPORTAMIENTO ACTUAL · pendiente de D3] %s: redimensionar ×2 dobla contorno y spine, y deja brushThickness y el slider en 20', (mode) => {
			const before = one(mode);
			const after = run(before, resize(2));
			const a = byId(before, 'a'), b = byId(after, 'a');
			expect(maxDiff(b.points, a.points.map(p => ({ x: (p.x - 150) * 2 + 150, y: p.y * 2 })))).toBeLessThanOrEqual(EPS);
			expect(maxDiff(b.originalPoints!, a.originalPoints!.map(p => ({ x: (p.x - 150) * 2 + 150, y: p.y * 2 })))).toBeLessThanOrEqual(EPS);
			expect(spanY(b.points)).toBeCloseTo(2 * spanY(a.points), 9);
			// The number does NOT follow the geometry: this is why the slider «lies» after a resize.
			expect(b.brushThickness).toBe(20);
			expect(after.currentBrushThickness).toBe(20);
			expect(after.layerBrushSettings[0]).toEqual({ thickness: 20, mode });
		});

		it('G1 [COMPORTAMIENTO ACTUAL · pendiente de D3] tras redimensionar ×2, un paso de slider devuelve el trazo al grosor nominal (40 → 21)', () => {
			const resized = run(one('tapered'), resize(2));
			expect(spanY(byId(resized, 'a').points)).toBeCloseTo(40, 6);
			const nudged = run(resized, ...setThickness(21));
			expect(spanY(byId(nudged, 'a').points)).toBeCloseTo(21, 6);
			expect(byId(nudged, 'a').brushThickness).toBe(21);
		});

		it('G1 [COMPORTAMIENTO ACTUAL · pendiente de D3] tras redimensionar ×2, cambiar de modo regenera al grosor nominal', () => {
			const resized = run(one('ink'), resize(2));
			const asTapered = run(resized, { type: 'SET_BRUSH_MODE', payload: 'tapered' });
			expect(spanY(byId(asTapered, 'a').points)).toBeCloseTo(20, 6); // not 40
		});

		it('G3 [COMPORTAMIENTO ACTUAL · pendiente de D4] estirar solo en X no deja «un grosor»: el trazo horizontal sigue en 20, el vertical pasa a 40', () => {
			const stretch = resize(1, { scaleX: 2, scaleY: 1 });
			const horizontal = run(one('tapered'), stretch);
			expect(spanY(byId(horizontal, 'a').points)).toBeCloseTo(20, 6);
			const vertical = run(one('tapered', straight(0).map(p => ({ x: 0, y: p.x }))), stretch);
			expect(spanX(byId(vertical, 'a').points)).toBeCloseTo(40, 6);
			expect(byId(vertical, 'a').brushThickness).toBe(20);
		});

		it('redimensionar una capa vacía no crea paso de undo', () => {
			const s = base();
			expect(run(s, resize(2))).toBe(s);
		});
	});

	describe('I7: re-estilar una capa solo toca sus trazos regenerables', () => {
		const untouchedElsewhere = (before: AppState, after: AppState, restyled: string[]) => {
			for (const shape of before.shapes) {
				if (restyled.includes(shape.id)) continue;
				expect(byId(after, shape.id), shape.id).toBe(shape); // same object: not even copied
			}
		};

		it('cambiar el grosor de la capa 1 deja intactas las capas 0 y 2', () => {
			const before = richState(1);
			const after = run(before, ...setThickness(44));
			untouchedElsewhere(before, after, ['l1-a', 'l1-b']);
			for (const id of ['l1-a', 'l1-b']) {
				expect(byId(after, id).brushThickness).toBe(44);
				expect(byId(after, id).originalPoints).toBe(byId(before, id).originalPoints); // the spine is never regenerated
				expect(byId(after, id).points).not.toEqual(byId(before, id).points);
			}
		});

		it('cambiar el modo de la capa 1 deja intactas las capas 0 y 2', () => {
			const before = richState(1);
			const after = run(before, { type: 'SET_BRUSH_MODE', payload: 'tapered' });
			untouchedElsewhere(before, after, ['l1-a', 'l1-b']);
			for (const id of ['l1-a', 'l1-b']) {
				expect(byId(after, id).brushMode).toBe('tapered');
				expect(byId(after, id).brushThickness).toBe(30);
			}
		});

		it('en la capa 0, el blob, la goma y el texto no se regeneran', () => {
			const before = richState(0);
			const after = run(before, ...setThickness(25));
			untouchedElsewhere(before, after, ['l0-a', 'l0-b']);
			expect(byId(after, 'l0-eraser').brushThickness).toBe(20); // an eraser carries a thickness but no spine
		});
	});

	describe('I8: selección pura (capa sin trazos regenerables)', () => {
		const emptyLayer = () => run(one('tapered'), { type: 'ADD_LAYER' });

		it('cambiar el grosor no crea paso y se estampa en el snapshot actual', () => {
			const before = emptyLayer();
			const after = run(before, ...setThickness(44));
			expect(after.history).toHaveLength(before.history.length);
			expect(after.historyIndex).toBe(before.historyIndex);
			expectSameShapes(after, before);
			expect(after.currentBrushThickness).toBe(44);
			expect(after.history[after.historyIndex].layerBrushSettings[1].thickness).toBe(44);
		});

		it('cambiar el modo no crea paso y se estampa en el snapshot actual', () => {
			const before = emptyLayer();
			const after = run(before, { type: 'SET_BRUSH_MODE', payload: 'ink' });
			expect(after.history).toHaveLength(before.history.length);
			expectSameShapes(after, before);
			expect(after.brushMode).toBe('ink');
			expect(after.history[after.historyIndex].layerBrushSettings[1].mode).toBe('ink');
		});

		it('una capa con solo un blob y una goma también es selección pura', () => {
			const before = run(emptyLayer(), { type: 'ADD_SHAPES', payload: [blob('x', 1), eraser('y', 1)] });
			const after = run(before, ...setThickness(44), { type: 'SET_BRUSH_MODE', payload: 'ink' });
			expect(after.history).toHaveLength(before.history.length);
			expectSameShapes(after, before);
		});

		it('el último valor elegido gana: deshacer el trazo siguiente no resucita la selección anterior', () => {
			let s = run(emptyLayer(), ...setThickness(44), { type: 'SET_BRUSH_MODE', payload: 'ink' });
			s = run(s, { type: 'ADD_SHAPE', payload: stroke('b', 'ink', straight(60), 44, 1) }, { type: 'UNDO' });
			expect(s.currentBrushThickness).toBe(44);
			expect(s.brushMode).toBe('ink');
		});
	});

	describe('I9: un arrastre del slider es un solo paso', () => {
		const drag: Action[] = [25, 30, 35, 40].map(t => ({ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: t } as Action));

		it('N previews + commit = un paso, igual que fijar el valor final de una vez', () => {
			const before = richState(1);
			const dragged = run(before, ...drag, { type: 'COMMIT_BRUSH_THICKNESS' });
			const direct = run(before, ...setThickness(40));
			expect(dragged.history).toHaveLength(before.history.length + 1);
			expect(JSON.stringify(dragged.shapes)).toBe(JSON.stringify(direct.shapes));
			expect(dragged.currentBrushThickness).toBe(40);
			expect(dragged.brushThicknessBeforePreview).toBeNull();
			expect(dragged.isDirty).toBe(true);
		});

		it('el orden real del slider (input → preview, change → set, soltar → commit, dos veces) también deja un paso', () => {
			// ToolOptionsPanel: onInput → PREVIEW, onChange → SET, native change AND pointerup → COMMIT.
			const before = richState(1);
			const after = run(before,
				{ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 35 }, { type: 'SET_BRUSH_THICKNESS', payload: 35 },
				{ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 40 }, { type: 'SET_BRUSH_THICKNESS', payload: 40 },
				{ type: 'COMMIT_BRUSH_THICKNESS' }, { type: 'COMMIT_BRUSH_THICKNESS' });
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(JSON.stringify(after.shapes)).toBe(JSON.stringify(run(before, ...setThickness(40)).shapes));
		});

		it('deshacer el arrastre devuelve los trazos de antes y el slider con ellos', () => {
			const before = richState(1);
			const undone = run(before, ...drag, { type: 'COMMIT_BRUSH_THICKNESS' }, { type: 'UNDO' });
			expect(undone.shapes).toBe(before.shapes);
			expect(undone.currentBrushThickness).toBe(30);
		});

		it('G6 [COMPORTAMIENTO ACTUAL · se decide con «Mixto»] arrastrar y volver al valor inicial (20 → 35 → 20) deja el contorno idéntico y aun así añade un paso de undo', () => {
			const before = one('tapered');
			const after = run(before, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 35 }, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 20 }, { type: 'COMMIT_BRUSH_THICKNESS' });
			expect(maxDiff(byId(after, 'a').points, byId(before, 'a').points)).toBe(0);
			expect(after.history).toHaveLength(before.history.length + 1); // a step that undoes nothing
		});
	});

	describe('I10: re-estilar al mismo grosor no cambia el contorno', () => {
		it.each(MODES.map(m => [m] as const))('%s, trazo sin mover: idéntico', (mode) => {
			const before = one(mode, wavy());
			const after = run(before, ...setThickness(20));
			expect(maxDiff(byId(after, 'a').points, byId(before, 'a').points)).toBeLessThanOrEqual(EPS);
		});

		it.each([['tapered'], ['uniform']] as const)('%s, tras mover la capa: idéntico', (mode) => {
			const moved = run(one(mode, wavy()), { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 10, deltaY: 0 } });
			const after = run(moved, ...setThickness(20));
			expect(maxDiff(byId(after, 'a').points, byId(moved, 'a').points)).toBeLessThanOrEqual(EPS);
		});

		it('G5 [COMPORTAMIENTO ACTUAL · se decide con «Mixto»] ink, tras mover la capa 10 px: re-estilar al MISMO grosor cambia el dibujo del trazo (hasta ~13 px)', () => {
			// Ink's noise seed hashes the absolute coordinates of the spine (_spineSeed), so a moved
			// stroke regenerates with a different wobble. «Mixto» («tocarlo unifica») will hit this.
			const moved = run(one('ink', wavy()), { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 10, deltaY: 0 } });
			const after = run(moved, ...setThickness(20));
			const drift = maxDiff(byId(after, 'a').points, byId(moved, 'a').points);
			expect(drift).toBeGreaterThan(5);
			expect(drift).toBeLessThan(20);
		});
	});

	describe('I12: mover y voltear son isometrías', () => {
		it.each(MODES.map(m => [m] as const))('%s: mover traslada contorno y spine y no toca el grosor', (mode) => {
			const before = one(mode, wavy());
			const after = run(before, { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 33, deltaY: -21 } });
			const a = byId(before, 'a'), b = byId(after, 'a');
			expect(maxDiff(a.points, b.points, 33, -21)).toBeLessThanOrEqual(EPS);
			expect(maxDiff(a.originalPoints!, b.originalPoints!, 33, -21)).toBeLessThanOrEqual(EPS);
			expect(b.brushThickness).toBe(20);
			expect(after.currentBrushThickness).toBe(20);
		});

		it.each(MODES.map(m => [m] as const))('%s: voltear refleja contorno y spine, conserva el ancho, y dos veces es la identidad', (mode) => {
			const flip: Action = { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'horizontal', centerX: 150, centerY: 0 } };
			const before = one(mode, wavy());
			const once = run(before, flip);
			const a = byId(before, 'a'), b = byId(once, 'a');
			expect(maxDiff(b.points, a.points.map(p => ({ x: 300 - p.x, y: p.y })))).toBeLessThanOrEqual(EPS);
			expect(maxDiff(b.originalPoints!, a.originalPoints!.map(p => ({ x: 300 - p.x, y: p.y })))).toBeLessThanOrEqual(EPS);
			expect(spanY(b.points)).toBeCloseTo(spanY(a.points), 9);
			expect(b.brushThickness).toBe(20);
			const twice = byId(run(once, flip), 'a');
			expect(maxDiff(twice.points, a.points)).toBeLessThanOrEqual(EPS);
		});

		it('redimensionar transforma eraserPolygon igual que los puntos', () => {
			const before = run(base(), { type: 'ADD_SHAPE', payload: eraser('e') });
			const after = run(before, { type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: 0, scale: 2, dx: 0, dy: 0, centerX: 0, centerY: 0 } } });
			expect(maxDiff(byId(after, 'e').eraserPolygon!, byId(before, 'e').eraserPolygon!.map(p => ({ x: p.x * 2, y: p.y * 2 })))).toBeLessThanOrEqual(EPS);
		});

		it('H8 [COMPORTAMIENTO ACTUAL · hallazgo de la fase 1, sin decisión] mover y voltear NO transforman eraserPolygon (solo lo lee el marco del SVG)', () => {
			const before = run(base(), { type: 'ADD_SHAPE', payload: eraser('e') });
			const moved = run(before, { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 10, deltaY: 0 } });
			const flipped = run(before, { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'horizontal', centerX: 0, centerY: 0 } });
			expect(byId(moved, 'e').points[0].x).toBe(byId(before, 'e').points[0].x + 10);
			expect(byId(moved, 'e').eraserPolygon).toEqual(byId(before, 'e').eraserPolygon);   // stale
			expect(byId(flipped, 'e').eraserPolygon).toEqual(byId(before, 'e').eraserPolygon); // stale
		});
	});
});
