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
		// I6 · D3 (v3.26.22). Until then the number stayed at 20 while the outline doubled: the slider «lied».
		it.each(MODES.map(m => [m] as const))('I6 · D3 %s: redimensionar ×2 dobla contorno, spine y brushThickness, y el slider marca 40', (mode) => {
			const before = one(mode);
			const after = run(before, resize(2));
			const a = byId(before, 'a'), b = byId(after, 'a');
			expect(maxDiff(b.points, a.points.map(p => ({ x: (p.x - 150) * 2 + 150, y: p.y * 2 })))).toBeLessThanOrEqual(EPS);
			expect(maxDiff(b.originalPoints!, a.originalPoints!.map(p => ({ x: (p.x - 150) * 2 + 150, y: p.y * 2 })))).toBeLessThanOrEqual(EPS);
			expect(spanY(b.points)).toBeCloseTo(2 * spanY(a.points), 9);
			// The number follows the geometry, in the three modes (Uniform is painted with it: it thickens too).
			expect(b.brushThickness).toBe(40);
			expect(after.currentBrushThickness).toBe(40);
			expect(after.layerBrushSettings[0]).toEqual({ thickness: 40, mode });
			expect(after.history[after.historyIndex].layerBrushSettings[0]).toEqual({ thickness: 40, mode });
		});

		it('D3: deshacer el redimensionado devuelve el trazo y el slider a 20, y rehacerlo a 40', () => {
			const before = one('tapered');
			const after = run(before, resize(2));
			const undone = run(after, { type: 'UNDO' });
			expect(undone.shapes).toBe(before.shapes);
			expect(undone.currentBrushThickness).toBe(20);
			expect(undone.layerBrushSettings[0].thickness).toBe(20);
			expect(run(undone, { type: 'REDO' }).currentBrushThickness).toBe(40);
		});

		it('D3: redimensionar una capa que no es la activa mueve su par y deja el slider donde estaba', () => {
			const before = richState(1); // layer 1 active (ink, 30); layer 0 holds tapered strokes of 10
			const after = run(before, resize(3));
			expect(byId(after, 'l0-a').brushThickness).toBe(30);
			expect(byId(after, 'l0-eraser').brushThickness).toBe(60); // every shape that carries a thickness
			expect(after.layerBrushSettings[0]).toEqual({ thickness: 30, mode: 'tapered' });
			expect(after.currentBrushThickness).toBe(30);             // layer 1's own 30, untouched
			expect(after.brushMode).toBe('ink');
			expect(byId(after, 'l1-a')).toBe(byId(before, 'l1-a'));
		});

		it('D3: una rotación o un escalado ×1 no tocan el grosor', () => {
			const before = one('ink');
			const rotated = run(before, resize(1, { rotation: 0.7 }));
			expect(byId(rotated, 'a').brushThickness).toBe(20);
			expect(rotated.currentBrushThickness).toBe(20);
		});

		it('D4: el grosor se guarda exacto (×1,37 → 27,400000000000002) y es el redondeo al mostrar el que lo deja en 27', () => {
			const after = run(one('tapered'), resize(1.37));
			expect(byId(after, 'a').brushThickness).toBe(20 * 1.37);
			expect(after.currentBrushThickness).toBe(20 * 1.37);
			expect(Math.round(after.currentBrushThickness)).toBe(27);
		});

		// G1 · D3 (v3.26.22). Until then the slider still said 20, and its first step took the stroke from 40 to 21.
		it('G1 · D3 tras redimensionar ×2 el slider está en 40, y un paso lo lleva a 41: el trazo ya no salta', () => {
			const resized = run(one('tapered'), resize(2));
			expect(spanY(byId(resized, 'a').points)).toBeCloseTo(40, 6);
			expect(resized.currentBrushThickness).toBe(40);
			const nudged = run(resized, ...setThickness(41));
			expect(spanY(byId(nudged, 'a').points)).toBeCloseTo(41, 6);
			expect(byId(nudged, 'a').brushThickness).toBe(41);
		});

		// G1 · D3 (v3.26.22). Until then a change of mode redrew the resized stroke at its old 20.
		it('G1 · D3 tras redimensionar ×2, cambiar de modo conserva los 40', () => {
			const resized = run(one('ink'), resize(2));
			const asTapered = run(resized, { type: 'SET_BRUSH_MODE', payload: 'tapered' });
			expect(spanY(byId(asTapered, 'a').points)).toBeCloseTo(40, 6);
			expect(byId(asTapered, 'a').brushThickness).toBe(40);
		});

		// G3 · D4 (v3.26.22). A per-axis stretch still leaves no single width on the canvas (a horizontal stroke
		// keeps its 20, a vertical one becomes 40); the stored number, which stayed at 20, is now the
		// geometric mean of the two factors: 20 · √(2 · 1) = 28.28…
		it('G3 · D4 estirar solo en X ×2: el grosor guardado es la media geométrica (20 · √2), para un trazo horizontal y para uno vertical', () => {
			const stretch = resize(1, { scaleX: 2, scaleY: 1 });
			const horizontal = run(one('tapered'), stretch);
			expect(spanY(byId(horizontal, 'a').points)).toBeCloseTo(20, 6);
			const vertical = run(one('tapered', straight(0).map(p => ({ x: 0, y: p.x }))), stretch);
			expect(spanX(byId(vertical, 'a').points)).toBeCloseTo(40, 6);
			expect(byId(horizontal, 'a').brushThickness).toBe(20 * Math.sqrt(2));
			expect(byId(vertical, 'a').brushThickness).toBe(20 * Math.sqrt(2));
			expect(horizontal.currentBrushThickness).toBeCloseTo(28.284, 3);
			// Squashed as much as stretched: the mean is 1 and the number does not move.
			expect(byId(run(one('tapered'), resize(1, { scaleX: 2, scaleY: 0.5 })), 'a').brushThickness).toBe(20);
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

		it('cambiar el modo en una capa con varios grosores conserva el de cada trazo (el botón de modo no unifica)', () => {
			// Until v3.26.22 every stroke of the layer was redrawn at the slider's value.
			const mixed = run(base('tapered', 10),
				{ type: 'ADD_SHAPE', payload: stroke('thin', 'tapered', straight(0), 10) },
				{ type: 'ADD_SHAPE', payload: stroke('thick', 'tapered', straight(60), 30) });
			const after = run(mixed, { type: 'SET_BRUSH_MODE', payload: 'uniform' });
			expect(byId(after, 'thin').brushThickness).toBe(10);
			expect(byId(after, 'thick').brushThickness).toBe(30);
			expect(spanY(byId(after, 'thick').points)).toBeCloseTo(30, 6);
			expect(after.shapes.map(s => s.brushMode)).toEqual(['uniform', 'uniform']);
			expect(run(after, { type: 'UNDO' }).shapes).toBe(mixed.shapes);
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

		// G6 (v3.26.22). Until then this left a step in the history that undid nothing.
		it.each(MODES.map(m => [m] as const))('G6 %s: arrastrar y volver al valor inicial (20 → 35 → 20) no crea paso de undo y deja las formas como estaban', (mode) => {
			const before = run(one(mode), { type: 'MARK_CLEAN' });
			const after = run(before, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 35 }, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 20 }, { type: 'COMMIT_BRUSH_THICKNESS' });
			expect(after.shapes).toBe(before.shapes);
			expect(after.history).toBe(before.history);
			expect(after.historyIndex).toBe(before.historyIndex);
			expect(after.brushThicknessBeforePreview).toBeNull();
			expect(after.currentBrushThickness).toBe(20);
			expect(after.isDirty).toBe(false);
		});

		it('G6: el siguiente gesto vuelve a contar: 20 → 35 es un paso', () => {
			const before = one('tapered');
			const idle = run(before, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 35 }, { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 20 }, { type: 'COMMIT_BRUSH_THICKNESS' });
			const after = run(idle, ...setThickness(35));
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(run(after, { type: 'UNDO' }).shapes).toBe(before.shapes);
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

		// G5 (v3.26.22). Ink's noise seed was a hash of the spine's absolute coordinates, so a moved stroke
		// regenerated with another wobble (up to ~13 px at thickness 20). Now the stroke carries its seed, and
		// the fact of having been flipped. Regenerated for real: through another thickness and back in two
		// gestures (20 → 21 → 20), and through another mode and back.
		const viaThickness = (s: AppState) => run(s, ...setThickness(21), ...setThickness(20));
		const viaMode = (s: AppState) => run(s, { type: 'SET_BRUSH_MODE', payload: 'tapered' }, { type: 'SET_BRUSH_MODE', payload: 'ink' });
		const H: Action = { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'horizontal', centerX: 150, centerY: 0 } };
		const V: Action = { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'vertical', centerX: 150, centerY: 30 } };

		it.each([
			['mover 10 px', [{ type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 10, deltaY: 0 } }]],
			['voltear en horizontal', [H]],
			['voltear en vertical', [V]],
			['voltear en horizontal y en vertical', [H, V]],
			['voltear dos veces', [H, H]],
			['girar 0,7 rad', [resize(1, { rotation: 0.7 })]],
			['girar y voltear', [resize(1, { rotation: 0.7 }), V]],
		] as [string, Action[]][])('G5 ink, tras %s: re-estilar y volver al mismo grosor o al mismo modo deja el contorno idéntico', (_label, actions) => {
			const moved = run(one('ink', wavy()), ...actions);
			expect(maxDiff(byId(viaThickness(moved), 'a').points, byId(moved, 'a').points)).toBeLessThanOrEqual(EPS);
			expect(maxDiff(byId(viaMode(moved), 'a').points, byId(moved, 'a').points)).toBeLessThanOrEqual(EPS);
		});

		it('G5 ink, tras redimensionar ×2 (20 → 40): el contorno regenerado es el redimensionado', () => {
			// The noise is laid in units of the thickness, which now scales with the stroke (D3). It holds while
			// both thicknesses are at least 7.5 px; under that, two floors in px (1.5 px between points, 35 px of
			// bump wavelength) do not scale. Measured, not changed: docs/audit-2026-11.md, phase 4.
			const resized = run(one('ink', wavy()), resize(2));
			expect(maxDiff(byId(viaMode(resized), 'a').points, byId(resized, 'a').points)).toBeLessThanOrEqual(1e-6);
		});

		it('G5: un trazo Ink recibe su semilla al añadirse; un tapered o un uniform, ninguna', () => {
			expect(typeof byId(one('ink', wavy()), 'a').inkSeed).toBe('number');
			expect('inkSeed' in byId(one('tapered', wavy()), 'a')).toBe(false);
			expect('inkSeed' in byId(one('uniform', wavy()), 'a')).toBe(false);
			expect('inkMirrored' in byId(one('ink', wavy()), 'a')).toBe(false);
		});

		it('G5: voltear marca el trazo como espejado, y voltearlo otra vez quita la marca', () => {
			const once = run(one('ink', wavy()), H);
			expect(byId(once, 'a').inkMirrored).toBe(true);
			expect('inkMirrored' in byId(run(once, V), 'a')).toBe(false);
			expect('inkMirrored' in byId(run(one('tapered', wavy()), H), 'a')).toBe(false); // no seed, nothing to remember
		});

		it('G5: un trazo que pasa a Ink recibe la semilla en ese momento y la conserva al volver', () => {
			const asInk = run(one('tapered', wavy()), { type: 'SET_BRUSH_MODE', payload: 'ink' });
			const seed = byId(asInk, 'a').inkSeed;
			expect(typeof seed).toBe('number');
			const back = run(asInk, { type: 'SET_BRUSH_MODE', payload: 'uniform' }, { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 40, deltaY: 9 } }, { type: 'SET_BRUSH_MODE', payload: 'ink' });
			expect(byId(back, 'a').inkSeed).toBe(seed);
			expect(maxDiff(byId(asInk, 'a').points, byId(back, 'a').points, 40, 9)).toBeLessThanOrEqual(EPS);
		});

		it('G5: un trazo Ink antiguo, sin semilla en el archivo, la recibe al moverse por primera vez y ya no cambia de dibujo', () => {
			const { inkSeed: _seed, ...old } = byId(one('ink', wavy()), 'a');
			const opened = run(base('ink', 20), { type: 'LOAD_PROJECT', payload: { shapes: [old], brushMode: 'ink', currentBrushThickness: 20 } as never });
			expect('inkSeed' in byId(opened, 'a')).toBe(false); // loading migrates nothing
			const moved = run(opened, { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 10, deltaY: 0 } });
			expect(typeof byId(moved, 'a').inkSeed).toBe('number');
			expect(maxDiff(byId(viaThickness(moved), 'a').points, byId(moved, 'a').points)).toBeLessThanOrEqual(EPS);
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

		// H8 (v3.26.22). Until then only a resize carried the eraser's polygon; a move or a flip left it behind.
		it('H8 mover y voltear transforman eraserPolygon igual que los puntos', () => {
			const before = run(base(), { type: 'ADD_SHAPE', payload: eraser('e') });
			const moved = run(before, { type: 'MOVE_LAYER', payload: { layerIndex: 0, deltaX: 10, deltaY: -4 } });
			const flippedH = run(before, { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'horizontal', centerX: 5, centerY: 0 } });
			const flippedV = run(before, { type: 'FLIP_LAYER', payload: { layerIndex: 0, direction: 'vertical', centerX: 0, centerY: 5 } });
			const polygon = byId(before, 'e').eraserPolygon!;
			expect(byId(moved, 'e').points[0].x).toBe(byId(before, 'e').points[0].x + 10);
			expect(maxDiff(polygon, byId(moved, 'e').eraserPolygon!, 10, -4)).toBeLessThanOrEqual(EPS);
			expect(maxDiff(byId(flippedH, 'e').eraserPolygon!, polygon.map(p => ({ x: 10 - p.x, y: p.y })))).toBeLessThanOrEqual(EPS);
			expect(maxDiff(byId(flippedV, 'e').eraserPolygon!, polygon.map(p => ({ x: p.x, y: 10 - p.y })))).toBeLessThanOrEqual(EPS);
		});
	});
});
