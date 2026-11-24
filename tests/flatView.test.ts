// Flat front view (CINEMA preset 'flat', v3.26.71; docs/flat-view-proposal.md): the preset's state, its static camera
// tick and the DRAW camera it projects through. Pixels are the browser harness's job (tools/draw-stress/harness/flatcheck.js).
import { describe, it, expect } from 'vitest';
import { initialState } from '../src/components/strata/StrataContext';
import { computeCinematicTick, type OrbitState } from '../src/components/strata/canvas/cinematicCamera';
import { CINEMA_VIEW_DEFAULTS } from '../src/constants/cinemaView';
import { isFlatView, flatViewCamera } from '../src/utils/flatView';
import { base, diorOf, richState, run } from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

const load = (payload: unknown, from: AppState = initialState): AppState =>
	run(from, { type: 'LOAD_PROJECT', payload: payload as never });

const orbit = (): OrbitState => ({ azimuth: 0, elevation: 0, targetAzimuth: 0, targetElevation: 0, panOffsetX: 0, panOffsetY: 0 });

const tick = (type: string, handheld: boolean, camera = { x: 12, y: -7, z: 500, rotation: 0.1 }) =>
	computeCinematicTick(0.016, 1_000_000, 3, 2, 1, type, camera, 4, handheld, 'high', 5, 6, -900, orbit(), [], 3840, -2500, 1, 1000);

describe('vista plana · estado', () => {
	it('isFlatView: solo CINEMA con el preset flat', () => {
		expect(isFlatView({ mode: 'cinematic', cinematicType: 'flat' })).toBe(true);
		expect(isFlatView({ mode: 'drawing', cinematicType: 'flat' })).toBe(false);
		expect(isFlatView({ mode: 'cinematic', cinematicType: 'forward' })).toBe(false);
	});

	it('flatViewCamera es la cámara de DRAW: la capa activa a escala 1', () => {
		expect(flatViewCamera({ currentLayerIndex: 3 })).toEqual({ x: 0, y: 0, z: -450, rotation: 0 });
		expect(flatViewCamera({ currentLayerIndex: 0 }).z + 0).toBe(0);
	});

	it('elegir Plana ensucia el proyecto como cualquier preset', () => {
		const s = run({ ...base(), isDirty: false }, { type: 'SET_CINEMATIC_TYPE', payload: 'flat' });
		expect(s.cinematicType).toBe('flat');
		expect(s.isDirty).toBe(true);
	});

	it('.dior: flat va y vuelve; un preset desconocido cae al default', () => {
		const A = run(richState(2),
			{ type: 'INIT_CINEMA_VIEW', payload: CINEMA_VIEW_DEFAULTS },
			{ type: 'SET_CINEMATIC_TYPE', payload: 'flat' });
		expect(load(diorOf(A)).cinematicType).toBe('flat');
		expect(load({ ...diorOf(A), cinematicType: 'plana' }).cinematicType).toBe(CINEMA_VIEW_DEFAULTS.cinematicType);
	});

	it('el default de CINEMA no cambia (sigue siendo forward)', () => {
		expect(CINEMA_VIEW_DEFAULTS.cinematicType).toBe('forward');
	});
});

describe('vista plana · Centrar vista (v3.26.73)', () => {
	const format = { type: '1:1' as const, orientation: 'portrait' as const, rect: { x: -200, y: -150, w: 400, h: 400 } };
	const at = (extra: Partial<AppState>): AppState =>
		run({ ...base(), viewportSize: { w: 1000, h: 800 }, format, currentLayerIndex: 3, ...extra }, { type: 'RESET_DRAWING_VIEW' });

	it('encaja el Formato con la cámara de DRAW (capa activa), no con la de CINEMA', () => {
		const draw = at({ mode: 'drawing', camera: { x: 0, y: 0, z: -450, rotation: 0 } });
		const flat = at({ mode: 'cinematic', cinematicType: 'flat', camera: { x: 40, y: -10, z: 500, rotation: 0 } });
		expect(flat.drawingZoom).toBe(draw.drawingZoom);
		expect(flat.drawingPan).toEqual(draw.drawingPan);
	});

	it('los demás presets de CINEMA siguen leyendo state.camera, como antes', () => {
		const forward = at({ mode: 'cinematic', cinematicType: 'forward', camera: { x: 0, y: 0, z: 500, rotation: 0 } });
		const drawAt500 = at({ mode: 'drawing', camera: { x: 0, y: 0, z: 500, rotation: 0 } });
		expect(forward.drawingPan).toEqual(drawAt500.drawingPan);
		expect(forward.drawingZoom).toBe(drawAt500.drawingZoom);
	});
});

describe('vista plana · tick de cámara', () => {
	it('estática: la cámara no se mueve y no hay foco de Narrativa', () => {
		const r = tick('flat', false);
		expect(r.newCamera).toEqual({ x: 12, y: -7, z: 500, rotation: 0.1 });
		expect(r.focusLayerIndex).toBeNull();
	});

	it('ignora la cámara en mano (D7) aunque esté activa', () => {
		const r = tick('flat', true);
		expect(r.newShake).toEqual({ x: 0, y: 0, z: 0 });
		expect(r.newCamera).toEqual({ x: 12, y: -7, z: 500, rotation: 0.1 });
	});

	it('el tiempo y Stop Motion siguen corriendo', () => {
		const r = tick('flat', false);
		expect(r.accumulatedTime).toBeCloseTo(3.016);
		expect(r.accumulatedHandheldTime).toBeCloseTo(2.016);
		expect(r.wiggleFrame).toBe(4000);
	});

	it('los demás presets conservan su cámara en mano', () => {
		expect(tick('zoom', true).newShake.x).not.toBe(0);
	});
});
