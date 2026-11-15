/// <reference types="node" />
// .dior v2: the writer (utils/diorPayload.ts, buildDiorData) against the reader (LOAD_PROJECT).
// Invariant I11 of docs/audit-2026-11.md, the migration of older files, and «loading B after A
// inherits nothing from A» (CLAUDE.md: the file's values rule, defaults fill the gaps, never state.*).
//
// Tests tagged [COMPORTAMIENTO ACTUAL · …] pin what the app does TODAY, pending a decision. They
// change only in the commit that takes that decision, visibly, never to make a refactor pass.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initialState } from '../src/components/strata/StrataContext';
import { CINEMA_VIEW_DEFAULTS } from '../src/constants/cinemaView';
import { UNTITLED_PROJECT_SENTINEL } from '../src/constants/project';
import { DIOR_FORMAT_VERSION } from '../src/utils/projectMeta';
import { base, diffKeys, diorOf, richState, run, setThickness, straight, stroke, type Action } from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

const load = (payload: unknown, from: AppState = initialState): AppState =>
	run(from, { type: 'LOAD_PROJECT', payload: payload as never });

/** A project with something set in every corner a .dior saves. Ends on layer 2 (uniform, T=50). */
const projectA = (): AppState => run(richState(2), ...([
	{ type: 'TOGGLE_DARK_MODE' },
	{ type: 'SET_FORMAT', payload: { type: '1:1', orientation: 'portrait', rect: { x: -200, y: -200, w: 400, h: 400 } } },
	{ type: 'TOGGLE_LAYER_VISIBILITY', payload: 0 }, { type: 'TOGGLE_3D_LOCK', payload: 2 },
	{ type: 'SET_POINT_OF_INTEREST', payload: { x: 1, y: 2, z: -150 } },
	{ type: 'SET_PROJECT_NAME', payload: 'Proyecto A' },
	{ type: 'SET_ACTIVE_PALETTE', payload: 'alternative' },
	{ type: 'TOGGLE_FX', payload: 'vignette' }, { type: 'SET_FX_INTENSITY', payload: { fx: 'grain', value: 0.7 } },
	{ type: 'SET_SUPER_RISO', payload: { paper: 'cream', maxInks: 3 } },
	{ type: 'INIT_CINEMA_VIEW', payload: { focalLength: 3840, viewZoomOffset: -2500, layerSpacingFactor: 1, cinematicType: 'forward' } },
	{ type: 'SET_FOCAL_LENGTH', payload: 2000 }, { type: 'SET_VIEW_ZOOM_OFFSET', payload: -900 },
	{ type: 'SET_LAYER_SPACING_FACTOR', payload: 1.5 }, { type: 'SET_CINEMATIC_TYPE', payload: 'spiral' },
	{ type: 'TOGGLE_HANDHELD' }, { type: 'SET_HANDHELD_INTENSITY', payload: 'high' }, { type: 'SET_CINEMATIC_SPEED', payload: 0.9 },
	{ type: 'SET_PALETTE_MODE', payload: 'grad' }, { type: 'SET_PALETTE_GRADIENT_ANGLE', payload: 45 }, { type: 'COMMIT_PALETTE_GRADIENT' },
	{ type: 'SET_TOOL', payload: 'move' },
] as Action[]));

describe('.dior · ida y vuelta', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	describe('I11: guardar y cargar', () => {
		it('las formas vuelven idénticas: contorno, spine, grosor y modo de cada trazo', () => {
			const A = projectA();
			const loaded = load(diorOf(A));
			expect(JSON.stringify(loaded.shapes)).toBe(JSON.stringify(A.shapes));
		});

		it('todo lo que el archivo guarda vuelve igual, salvo el par del slider, que se abre con el de los trazos de la capa 0 (v3.26.3)', () => {
			const A = projectA();
			const saved = diorOf(A);
			const loaded = load(saved);
			expect(diffKeys(saved, diorOf(loaded))).toEqual(['brushMode', 'currentBrushThickness']);
			expect(saved.currentBrushThickness).toBe(50); // layer 2 was active when saving
			expect(loaded.currentLayerIndex).toBe(0);
			expect(loaded.currentBrushThickness).toBe(10);
			expect(loaded.brushMode).toBe('tapered');
		});

		it('el archivo declara el formato v2 y lleva la identidad del proyecto', () => {
			const A = projectA();
			const saved = diorOf(A) as { meta: Record<string, unknown> };
			expect(DIOR_FORMAT_VERSION).toBe(2);
			expect(saved.meta.formatVersion).toBe(2);
			expect(saved.meta.projectId).toBe(A.projectMeta.projectId);
			expect(load(saved).projectMeta).toEqual(A.projectMeta);
		});

		it('las claves que escribe un .dior son estas 29 (añadir o quitar una es cambiar el formato)', () => {
			expect(Object.keys(diorOf(projectA())).sort()).toEqual([
				'activePaletteId', 'brushMode', 'cinematicSpeed', 'cinematicType', 'currentBrushThickness', 'focalLength', 'format',
				'fxMasterEnabled', 'handheldIntensity', 'hiddenLayers', 'isDarkMode', 'isHandheldEnabled', 'layerGradParams',
				'layerRenderModes', 'layerSpacingFactor', 'locked3DLayers', 'meta', 'palette', 'paletteApplyToAllActive',
				'paletteApplyToAllSnapshot', 'pointOfInterest', 'postProcessing', 'postProcessingEnabled', 'postProcessingSnapshot',
				'projectName', 'shapes', 'tool', 'totalLayers', 'viewZoomOffset',
			]);
		});

		it('cargar lo recién cargado y vuelto a guardar ya no cambia nada', () => {
			const once = diorOf(load(diorOf(projectA())));
			expect(diffKeys(once, diorOf(load(once)))).toEqual([]);
		});

		it('un proyecto abierto empieza limpio, en la capa 0, en DRAW, con un solo paso de historial y la vista por ajustar', () => {
			const loaded = load(diorOf(projectA()));
			expect(loaded.isDirty).toBe(false);
			expect(loaded.projectWasLoaded).toBe(true);
			expect(loaded.cinemaViewInitialized).toBe(true);
			expect(loaded.mode).toBe('drawing');
			expect(loaded.currentLayerIndex).toBe(0);
			expect(loaded.history).toHaveLength(1);
			expect(loaded.historyIndex).toBe(0);
			expect(loaded.history[0].shapes).toBe(loaded.shapes);
			expect(loaded.drawingZoom).toBe(1);
			expect(loaded.drawingPan).toEqual({ x: 0, y: 0 });
			expect(loaded.shouldFitToView).toBe(true);
			expect(loaded.isLayerSelected).toBe(true);
			expect(loaded.paletteMode).toBe('flat'); // layer 0's, not the one of the layer that was active
			expect(run(loaded, { type: 'UNDO' })).toBe(loaded);
		});

		it('un proyecto nuevo que nunca entró en CINEMA guarda los valores por defecto de la vista, no los marcadores del estado inicial', () => {
			const fresh = run(base(), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 20) });
			expect(fresh.cinemaViewInitialized).toBe(false);
			const saved = diorOf(fresh);
			for (const key of Object.keys(CINEMA_VIEW_DEFAULTS) as (keyof typeof CINEMA_VIEW_DEFAULTS)[]) expect(saved[key]).toBe(CINEMA_VIEW_DEFAULTS[key]);
		});

		it('G7 [COMPORTAMIENTO ACTUAL · se decide con «Mixto»] el grosor por capa no viaja en el archivo: una capa vacía con grosor 44 reabre en 10', () => {
			const before = run(base('tapered', 10), { type: 'ADD_SHAPE', payload: stroke('a', 'tapered', straight(0), 10) }, { type: 'ADD_LAYER' }, ...setThickness(44));
			expect(before.layerBrushSettings[1].thickness).toBe(44);
			const saved = diorOf(before);
			expect('layerBrushSettings' in saved).toBe(false);
			const loaded = load(saved);
			expect(loaded.layerBrushSettings).toEqual({});
			expect(run(loaded, { type: 'SET_CURRENT_LAYER', payload: 1 }).currentBrushThickness).toBe(10);
		});

		it.each([['blob'], ['brush'], ['eraser'], ['text'], ['move']] as const)('la herramienta %s vuelve igual', (tool) => {
			expect(load({ ...diorOf(projectA()), tool }).tool).toBe(tool);
		});

		it('guardar con el pincel activo reabre con el pincel (H7, v3.26.8)', () => {
			const withBrush = run(projectA(), { type: 'SET_TOOL', payload: 'brush' });
			const saved = diorOf(withBrush);
			expect(saved.tool).toBe('brush');
			expect(load(saved).tool).toBe('brush');
		});
	});

	// Until v2.3.0 the tool values were 'brush' (the blob) and 'line' (the brush). That release renamed
	// them and, in the same commit, the keys saved next to them: lineMode / currentLineThickness →
	// brushMode / currentBrushThickness. LOAD_PROJECT tells the two generations apart by those keys.
	describe('H7: el valor «brush» de tool, según la generación del archivo', () => {
		it('archivo actual (v2, con meta): «brush» es el pincel', () => {
			const saved = diorOf(projectA());
			expect((saved.meta as { formatVersion: number }).formatVersion).toBe(2);
			expect(load({ ...saved, tool: 'brush' }).tool).toBe('brush');
		});

		it('archivo real de v3.17.55 (formato v1, sin meta, ya con las claves nuevas): abre con su herramienta, y «brush» es el pincel', () => {
			const real = JSON.parse(readFileSync(join(__dirname, '..', 'tools', 'svg-diff', 'fixtures', 'text-legacy-v3.17.55.dior'), 'utf8'));
			expect('meta' in real).toBe(false);
			expect('brushMode' in real && 'currentBrushThickness' in real).toBe(true);
			expect(real.tool).toBe('blob');
			expect(load(real).tool).toBe('blob');
			expect(load({ ...real, tool: 'brush' }).tool).toBe('brush');
		});

		it('autoguardado (sin formatVersion, con las claves nuevas): «brush» es el pincel', () => {
			const withBrush = run(projectA(), { type: 'SET_TOOL', payload: 'brush' });
			const { meta: _fileMeta, ...fields } = diorOf(withBrush);
			expect(load({ ...fields, meta: withBrush.projectMeta }).tool).toBe('brush');
		});

		it('archivo antiguo (anterior a v2.3.0, con lineMode / currentLineThickness): «brush» sigue abriendo con el blob y «line» con el pincel', () => {
			const old = { shapes: [], lineMode: 'tapered', currentLineThickness: 25 };
			expect(load({ ...old, tool: 'brush' }).tool).toBe('blob');
			expect(load({ ...old, tool: 'line' }).tool).toBe('brush');
			expect(load({ ...old, tool: 'eraser' }).tool).toBe('eraser');
		});

		it('archivo sin ninguna de las dos generaciones de claves: se lee como antiguo («brush» → blob)', () => {
			expect(load({ shapes: [], tool: 'brush' }).tool).toBe('blob');
		});

		it('en un archivo actual «line» ya no existe: cae al blob', () => {
			expect(load({ ...diorOf(projectA()), tool: 'line' }).tool).toBe('blob');
		});
	});

	describe('archivos antiguos', () => {
		const legacy = {
			shapes: [
				{ id: 'x', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }], color: '#000', zIndex: 0, lineMode: 'uniform', lineThickness: 33, originalPoints: [{ x: 0, y: 0 }, { x: 2, y: 0 }] },
				{ id: 't', type: 'text', points: [{ x: 0, y: 0 }], color: '#000', zIndex: 0, text: 'a', textMatrix: [1, 2, 2, 4], t: 'ayer' },
			],
			tool: 'line', lineMode: 'uniform', currentLineThickness: 33, projectName: 'Untitled Project', totalLayers: 99,
			postProcessingEnabled: { grungeOverlay: true }, postProcessing: { risoInkBlend: 1 },
		};

		it('lineMode / lineThickness de cada trazo pasan a brushMode / brushThickness', () => {
			const shape = load(legacy).shapes[0];
			expect(shape.brushMode).toBe('uniform');
			expect(shape.brushThickness).toBe(33);
			expect('lineMode' in shape).toBe(false);
			expect('lineThickness' in shape).toBe(false);
			expect(shape.points).toEqual(legacy.shapes[0].points); // baked geometry is never reinterpreted
		});

		it('la herramienta «line» de entonces es el pincel de hoy; sin tool, el blob', () => {
			expect(load(legacy).tool).toBe('brush');
			expect(load({ shapes: [] }).tool).toBe('blob');
			expect(load({ shapes: [], tool: 'no-existe' }).tool).toBe('blob');
		});

		it('una textMatrix degenerada y un tiempo de creación que no es un número se descartan', () => {
			const text = load(legacy).shapes[1];
			expect('textMatrix' in text).toBe(false); // determinant 0
			expect('t' in text).toBe(false);
		});

		it('«Untitled Project», grungeOverlay, risoInkBlend y un totalLayers imposible se normalizan', () => {
			const loaded = load(legacy);
			expect(loaded.projectName).toBe(UNTITLED_PROJECT_SENTINEL);
			expect(loaded.postProcessingEnabled.grunge).toBe(true);
			expect('grungeOverlay' in loaded.postProcessingEnabled).toBe(false);
			expect('risoInkBlend' in loaded.postProcessing).toBe(false);
			expect(loaded.totalLayers).toBe(10);
		});

		it('un archivo v1, sin meta, recibe una identidad nueva; sin punto de encuadre ni formato, quedan en null', () => {
			const loaded = load(legacy);
			expect(loaded.projectMeta.projectId).toMatch(/^[0-9a-f-]{36}$/);
			expect(loaded.projectMeta.version).toBe(0);
			expect(loaded.pointOfInterest).toBeNull();
			expect(loaded.format).toBeNull();
		});

		it('un grosor de slider guardado por encima del máximo actual (70) se recorta; el de los trazos no', () => {
			const loaded = load({ shapes: [{ ...stroke('a', 'tapered', straight(0), 20), originalPoints: undefined, brushThickness: 95 }], currentBrushThickness: 95 });
			expect(loaded.currentBrushThickness).toBe(70);
			expect(loaded.shapes[0].brushThickness).toBe(95);
		});
	});

	describe('cargar B tras A no hereda nada de A', () => {
		const B = { shapes: [] }; // the emptiest file that still opens: every field is a gap to fill

		it('un archivo sin isDarkMode ni projectName los recibe de los valores por defecto, no de A; igual que todo lo demás que se guarda (H6, v3.26.8)', () => {
			const A = projectA();
			expect(A.isDarkMode).toBe(true);
			expect(A.projectName).toBe('Proyecto A');
			const afterA = load(B, A);
			const afterNothing = load(B);
			expect(diffKeys(diorOf(afterA), diorOf(afterNothing)).filter(k => k !== 'meta')).toEqual([]);
			expect(afterA.isDarkMode).toBe(initialState.isDarkMode);
			expect(afterA.isDarkMode).toBe(false);
			expect(afterA.projectName).toBe(UNTITLED_PROJECT_SENTINEL);
		});

		it('el tema y el nombre que el archivo sí trae mandan, también sobre un proyecto anterior en claro', () => {
			const dark = load({ shapes: [], isDarkMode: true, projectName: 'Nocturno' });
			expect(dark.isDarkMode).toBe(true);
			expect(dark.projectName).toBe('Nocturno');
		});

		it('un archivo que sí trae isDarkMode y projectName no hereda nada de lo que se guarda', () => {
			const full = { shapes: [], projectName: 'B', isDarkMode: false };
			expect(diffKeys(diorOf(load(full, projectA())), diorOf(load(full))).filter(k => k !== 'meta')).toEqual([]);
		});

		it('del resto del estado solo sobrevive lo que es de la sesión, no del proyecto', () => {
			const full = { shapes: [], projectName: 'B', isDarkMode: false };
			const afterA = load(full, projectA()) as unknown as Record<string, unknown>;
			const afterNothing = load(full) as unknown as Record<string, unknown>;
			const survived = Object.keys(afterA).filter(k => JSON.stringify(afterA[k]) !== JSON.stringify(afterNothing[k])).sort();
			expect(survived).toEqual([
				'isWelcomeModalOpen',       // session UI (the fixtures close the welcome modal)
				// Written by ADD_LAYER / NEXT_LAYER / DUPLICATE_LAYER, declared nowhere and read by nobody: dead fields.
				'paletteGradientAngle', 'paletteGradientIntensity', 'paletteGradientType',
				'projectMeta',              // a file without meta gets a fresh random identity each time
				'textSession',              // where the last text was typed; inactive
			]);
		});

		it('ni el historial ni los pares de grosor por capa de A llegan a B', () => {
			const afterA = load(B, projectA());
			expect(afterA.history).toHaveLength(1);
			expect(afterA.layerBrushSettings).toEqual({});
			expect(afterA.hiddenLayers).toEqual([]);
			expect(afterA.locked3DLayers).toEqual([]);
			expect(afterA.pointOfInterest).toBeNull();
			expect(afterA.format).toBeNull();
			expect(afterA.totalLayers).toBe(1);
			expect(afterA.activePaletteId).toBe('primary');
			expect(afterA.focalLength).toBe(CINEMA_VIEW_DEFAULTS.focalLength);
			expect(afterA.cinematicType).toBe(CINEMA_VIEW_DEFAULTS.cinematicType);
		});
	});
});
