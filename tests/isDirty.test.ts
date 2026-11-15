// Cross-cutting isDirty test (CLAUDE.md «isDirty y persistencia»): every USER action that changes
// something a .dior holds must mark the document dirty; otherwise the autosave does not write,
// beforeunload does not warn and opening another file does not ask.
//
// «Changes something a .dior holds» is measured with the real writer: buildDiorData before and
// after the action, on a clean state with content.
//
// The exceptions are an explicit list. H1 and the «found in phase 1» group are pinned as
// [COMPORTAMIENTO ACTUAL]: they are known gaps, scheduled or pending a decision. The commit that
// fixes one must delete it from the list here, and that deletion is the visible proof of the fix.
// A NEW offender, or one that disappears, makes this test fail: both are the point.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CATALOGUE } from './helpers/actions';
import { base, diffKeys, diorOf, richState, run, setThickness, straight, stroke, type Action } from './helpers/fixtures';

const CLEAN: Action = { type: 'MARK_CLEAN' };

/** By design: these leave a document that is, by definition, in sync with its file (or brand new). */
const BY_DESIGN = ['LOAD_PROJECT', 'PROJECT_SAVED', 'CLEAR_CANVAS', 'INIT_CINEMA_VIEW'];

/** Halfway through a drag: the gesture's closing action decides (see «gestos completos» below). */
const DRAG_PREVIEWS: Record<string, string[]> = {
	SET_BRUSH_THICKNESS: ['currentBrushThickness', 'shapes'],
	SET_BRUSH_THICKNESS_PREVIEW: ['currentBrushThickness', 'shapes'],
	SET_PALETTE_GRADIENT_ANGLE: ['layerGradParams'],
	SET_PALETTE_GRADIENT_INTENSITY: ['layerGradParams'],
	SET_PALETTE_GRADIENT_TYPE: ['layerGradParams'],
};

/** H1 (docs/audit-2026-11.md §3.7). Six show up as single actions; the seventh, COMMIT_PALETTE_GRADIENT, as a gesture. */
const H1_KNOWN_GAPS: Record<string, string[]> = {
	SET_BRUSH_MODE: ['brushMode', 'shapes'],
	SET_PALETTE_MODE: ['layerRenderModes'],
	SET_ACTIVE_PALETTE: ['activePaletteId', 'palette', 'shapes'],
	ADD_LAYER: ['layerGradParams', 'layerRenderModes', 'shapes', 'totalLayers'],
	'NEXT_LAYER (crea capa)': ['totalLayers'],
	TOGGLE_PALETTE_APPLY_TO_ALL: ['layerGradParams', 'layerRenderModes', 'paletteApplyToAllActive', 'paletteApplyToAllSnapshot'],
};

/** Not in H1: found by this test when it was written (v3.26.7). No decision yet. */
const FOUND_IN_PHASE_1: Record<string, string[]> = {
	// Saved like hiddenLayers, but TOGGLE_LAYER_VISIBILITY marks dirty and this one does not.
	TOGGLE_3D_LOCK: ['locked3DLayers'],
	// The file carries the active tool…
	SET_TOOL: ['tool'],
	// …and the ACTIVE layer's brush pair, so merely walking between layers changes the file.
	NEXT_LAYER: ['brushMode', 'currentBrushThickness'],
	PREV_LAYER: ['brushMode', 'currentBrushThickness'],
	SET_CURRENT_LAYER: ['brushMode', 'currentBrushThickness'],
	STEP_ANIMATION_FRAME: ['brushMode', 'currentBrushThickness'],
};

/** Every catalogue entry on a clean state: which ones change the .dior and leave isDirty false. */
const offenders = (): Record<string, string[]> => {
	const out: Record<string, string[]> = {};
	for (const entry of CATALOGUE) {
		const before = run(richState(1), ...(entry.setup ?? []), CLEAN);
		const after = run(before, entry.action);
		const changed = diffKeys(diorOf(before), diorOf(after));
		if (changed.length > 0 && !after.isDirty) out[entry.label] = changed;
	}
	return out;
};

describe('isDirty · transversal', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	it('toda acción que cambia lo que guarda un .dior marca isDirty, salvo la lista de excepciones [H1: COMPORTAMIENTO ACTUAL, se arregla tras la fase 1]', () => {
		const found = offenders();
		for (const label of BY_DESIGN) {
			expect(found[label], `${label} debería cambiar el .dior sin ensuciar (por diseño)`).toBeDefined();
			delete found[label];
		}
		expect(found).toEqual({ ...DRAG_PREVIEWS, ...H1_KNOWN_GAPS, ...FOUND_IN_PHASE_1 });
	});

	it('la prueba no es vacía: al menos 25 acciones cambian el .dior y ensucian (29 al escribirla)', () => {
		let dirtying = 0;
		for (const entry of CATALOGUE) {
			const before = run(richState(1), ...(entry.setup ?? []), CLEAN);
			const after = run(before, entry.action);
			if (diffKeys(diorOf(before), diorOf(after)).length > 0 && after.isDirty) dirtying++;
		}
		expect(dirtying).toBeGreaterThanOrEqual(25);
	});

	it.each([
		'ADD_SHAPE', 'ADD_SHAPES', 'UNDO', 'REDO', 'MOVE_LAYER', 'TRANSFORM_LAYER', 'FLIP_LAYER', 'DELETE_CURRENT_LAYER', 'MERGE_LAYER_DOWN',
		'REORDER_LAYERS', 'MOVE_LAYER_TO', 'DUPLICATE_LAYER', 'TOGGLE_LAYER_VISIBILITY', 'COMMIT_TEXT_SESSION', 'TOGGLE_DARK_MODE', 'SET_FORMAT',
		'SET_POINT_OF_INTEREST', 'CLEAR_POINT_OF_INTEREST', 'TOGGLE_FX', 'TOGGLE_FX_MASTER', 'SET_FX_INTENSITY', 'SET_PARTICLE_TYPE', 'SET_SUPER_RISO',
		'APPLY_SUPER_RISO_STYLE', 'SET_PROJECT_NAME', 'DUPLICATE_PROJECT', 'TOGGLE_HANDHELD', 'SET_HANDHELD_INTENSITY', 'SET_CINEMATIC_SPEED',
	])('%s ensucia', (label) => {
		const entry = CATALOGUE.find(e => e.label === label)!;
		const before = run(richState(1), ...(entry.setup ?? []), CLEAN);
		expect(before.isDirty).toBe(false);
		expect(run(before, entry.action).isDirty).toBe(true);
	});

	it.each([
		'TOGGLE_ANIMATION_MODE', 'SET_ANIMATION_PLAYING', 'SET_ANIMATION_FRAMERATE', 'SET_ANIMATION_EXPORT_LOOPS', 'SET_GIF_EXPORT_SCALE',
		'TOGGLE_ONION_SKIN', 'TOGGLE_ANIMATION_FLAT_Z', 'ADVANCE_ANIMATION_FRAME', 'STEP_ANIMATION_FRAME', 'TOGGLE_ANIMATION_PLAYBACK_MODE',
	])('la animación nunca ensucia: %s', (label) => {
		const entry = CATALOGUE.find(e => e.label === label)!;
		const before = run(richState(1), ...(entry.setup ?? []), CLEAN);
		expect(run(before, entry.action).isDirty).toBe(false);
	});

	it('MARK_CLEAN y PROJECT_SAVED limpian; LOAD_PROJECT abre limpio', () => {
		const dirty = richState(1);
		expect(dirty.isDirty).toBe(true);
		expect(run(dirty, CLEAN).isDirty).toBe(false);
		expect(run(dirty, { type: 'PROJECT_SAVED', payload: { ...dirty.projectMeta, version: 1, updatedAt: '2026-11-15T12:00:00.000Z' } }).isDirty).toBe(false);
		expect(run(dirty, { type: 'LOAD_PROJECT', payload: diorOf(dirty) as never }).isDirty).toBe(false);
	});

	describe('gestos completos', () => {
		it('arrastrar el slider de grosor sobre una capa con trazos ensucia al soltar', () => {
			const before = run(richState(1), CLEAN);
			expect(run(before, ...setThickness(44)).isDirty).toBe(true);
		});

		it('elegir grosor en una capa vacía (selección pura) también ensucia: el valor viaja en el archivo', () => {
			const before = run(base(), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) }, { type: 'ADD_LAYER' }, CLEAN);
			const after = run(before, ...setThickness(44));
			expect(diffKeys(diorOf(before), diorOf(after))).toEqual(['currentBrushThickness']);
			expect(after.isDirty).toBe(true);
		});

		it('H1 [COMPORTAMIENTO ACTUAL · se arregla tras la fase 1] arrastrar el ángulo del gradiente y soltar (COMMIT_PALETTE_GRADIENT) cambia el .dior, crea paso de undo y NO ensucia', () => {
			const before = run(richState(1), { type: 'SET_PALETTE_MODE', payload: 'grad' }, CLEAN);
			const after = run(before, { type: 'SET_PALETTE_GRADIENT_ANGLE', payload: 45 }, { type: 'COMMIT_PALETTE_GRADIENT' });
			expect(diffKeys(diorOf(before), diorOf(after))).toEqual(['layerGradParams']);
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(after.isDirty).toBe(false);
		});

		it('H1 [COMPORTAMIENTO ACTUAL · se arregla tras la fase 1] cambiar el modo de pincel re-estila los trazos, crea paso de undo y NO ensucia', () => {
			const before = run(richState(1), CLEAN);
			const after = run(before, { type: 'SET_BRUSH_MODE', payload: 'tapered' });
			expect(after.history).toHaveLength(before.history.length + 1);
			expect(after.isDirty).toBe(false);
		});
	});
});
