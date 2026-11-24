// Flat front view (CINEMA preset 'flat', v3.26.71; docs/flat-view-proposal.md): the preset's state, its static camera
// tick and the DRAW camera it projects through. Pixels are the browser harness's job (tools/draw-stress/harness/flatcheck.js).
import { describe, it, expect } from 'vitest';
import { initialState } from '../src/components/strata/StrataContext';
import { computeCinematicTick, type OrbitState } from '../src/components/strata/canvas/cinematicCamera';
import { CINEMA_VIEW_DEFAULTS } from '../src/constants/cinemaView';
import { isFlatView, flatViewCamera, flatDistortionApplies, flatDistortFrame } from '../src/utils/flatView';
import { createProjectInto } from '../src/components/strata/canvas/transformPoint';
import type { DrawFormat } from '../src/types/strataTypes';
import { mmToFl } from '../src/utils/cinematic';
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

describe('vista plana · distorsión (v3.26.80)', () => {
	const format: DrawFormat = { type: '4:5', orientation: 'portrait', rect: { x: -300, y: -360, w: 480, h: 600 } };

	it('se aplica solo en Plana, con k ≠ 0 y en capas no fijadas', () => {
		expect(flatDistortionApplies(true, -0.4, false)).toBe(true);
		expect(flatDistortionApplies(false, -0.4, false)).toBe(false);
		expect(flatDistortionApplies(true, 0, false)).toBe(false);
		expect(flatDistortionApplies(true, -0.4, true)).toBe(false);
	});

	it('sin Formato: centro y normalización = medio viewport, como CINEMA', () => {
		expect(flatDistortFrame(null, 0, false, 1.7, { x: 40, y: -9 }, 683, 512)).toEqual({ cx: 683, cy: 512, hx: 683, hy: 512 });
	});

	it('con Formato: centro y medio tamaño del marco en pantalla (zoom y pan incluidos)', () => {
		const f = flatDistortFrame(format, 0, false, 2, { x: 10, y: -20 }, 683, 512);
		expect(f).toEqual({ cx: 683 + (-300 + 240) * 2 + 10, cy: 512 + (-360 + 300) * 2 - 20, hx: 480, hy: 600 });
	});

	// The equivalence the PNG Formato rests on: a world point lands at the same normalised (nx, ny) on screen and on the
	// PNG's canvas (renderRectSnapshot: zoom 1, the frame filling a (w + 0.5) / S logical canvas), from any layer.
	it.each([
		['capa 0', 0, false], ['capa 3 (marco en el plano activo)', -450, false], ['animación, capa 2', -300, true],
	] as const)('pantalla y PNG Formato dan la misma coordenada normalizada · %s', (_, camZ, anim) => {
		const norm = (W: number, H: number, zoom: number, pan: { x: number; y: number }, S: number) => {
			const fr = flatDistortFrame(format, camZ, anim, zoom * S, { x: pan.x * S, y: pan.y * S }, W * S / 2, H * S / 2);
			const out = { x: 0, y: 0, scale: 0, opacity: 0 };
			createProjectInto({ z: -150, isLocked3D: false, camX: 0, camY: 0, layerScale: 1, layerOpacity: 1 },
				{ isCinematic: false, camera: { x: 0, y: 0, z: camZ }, viewZoom: zoom * S, viewPan: { x: pan.x * S, y: pan.y * S },
					centerXScreen: W * S / 2, centerYScreen: H * S / 2, distortCenterX: W / 2, distortCenterY: H / 2, camRot: 0, cosR: 1, sinR: 0,
					poiX: 0, poiY: 0, isArcOrOrbit: false, arcPivotScale: 0, distortionK: 0, cinematicType: 'flat', shake: { x: 0, y: 0 } })(-123.4, 87.6, out);
			return [(out.x - fr.cx) / fr.hx, (out.y - fr.cy) / fr.hy];
		};
		const screen = norm(1366, 1024, 1.37, { x: 55, y: -31 }, 1);
		// The PNG: the frame (in the active plane) at 1080 × 1350 px, as formatSnapshot.ts builds it.
		const r = { ...format.rect };
		const k = anim ? 1 : 10000 / (10000 - camZ);
		const fr = { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k };
		const S = 1080 / fr.w, w = (1080 + 0.5) / S, h = (1350 + 0.5) / S;
		const png = norm(w, h, 1, { x: -w / 2 - fr.x, y: -h / 2 - fr.y }, S);
		expect(png[0]).toBeCloseTo(screen[0], 9);
		expect(png[1]).toBeCloseTo(screen[1], 9);
	});

	it('la fórmula es la de CINEMA: f = 1 + k·r² sobre el desplazamiento al centro; sin flatDistort, DRAW intacto', () => {
		const frame = { isCinematic: false, camera: { x: 0, y: 0, z: 0 }, viewZoom: 1, viewPan: { x: 0, y: 0 }, centerXScreen: 500, centerYScreen: 400,
			distortCenterX: 500, distortCenterY: 400, camRot: 0, cosR: 1, sinR: 0, poiX: 0, poiY: 0, isArcOrOrbit: false, arcPivotScale: 0,
			distortionK: 0, cinematicType: 'flat', shake: { x: 0, y: 0 } };
		const layer = { z: 0, isLocked3D: false, camX: 0, camY: 0, layerScale: 1, layerOpacity: 1 };
		const plain = { x: 0, y: 0, scale: 0, opacity: 0 }, bent = { x: 0, y: 0, scale: 0, opacity: 0 };
		createProjectInto(layer, frame)(250, 200, plain);
		createProjectInto(layer, { ...frame, flatDistort: { cx: 500, cy: 400, hx: 500, hy: 400, k: -0.3 } })(250, 200, bent);
		expect(plain).toEqual({ x: 750, y: 600, scale: 1, opacity: 1 });
		const f = 1 - 0.3 * (0.5 * 0.5 + 0.5 * 0.5);
		expect(bent.x).toBeCloseTo(500 + 250 * f, 12);
		expect(bent.y).toBeCloseTo(400 + 200 * f, 12);
		expect(bent.scale).toBe(1);
	});
});

describe('vista plana · distorsión: límite monótono (opción A, v3.26.80)', () => {
	// renderPipeline's distortionK, mirrored (as cinemaFraming.ts does): the panel's bipolar intensity and the focal.
	const kOf = (d: number, FL: number) => (Math.abs(d) > 0.01 ? (d * -0.8) * (500 / FL) : 0);
	const layer = { z: 0, isLocked3D: false, camX: 0, camY: 0, layerScale: 1, layerOpacity: 1 };
	const frameWith = (k: number) => ({ isCinematic: false, camera: { x: 0, y: 0, z: 0 }, viewZoom: 1, viewPan: { x: 0, y: 0 },
		centerXScreen: 500, centerYScreen: 400, distortCenterX: 500, distortCenterY: 400, camRot: 0, cosR: 1, sinR: 0, poiX: 0, poiY: 0,
		isArcOrOrbit: false, arcPivotScale: 0, distortionK: 0, cinematicType: 'flat', shake: { x: 0, y: 0 },
		flatDistort: { cx: 500, cy: 400, hx: 500, hy: 400, k } });
	const intensities = Array.from({ length: 41 }, (_, i) => -1 + i * 0.05);   // FXRow: bipolar slider −1…1
	const focals = [24, 28, 35, 50, 85, 135, 200, 300].map(mmToFl);            // CameraSlidersZone: 24…300 mm
	const rays: [number, number][] = [[1, 0], [0, 1], [1, 1], [2, -1], [-1, -3]];

	it('nunca pliega: en todo el rango del panel, un punto más lejano nunca cae más cerca ni cruza el centro', () => {
		let checked = 0;
		const folds: string[] = [];
		const out = { x: 0, y: 0, scale: 0, opacity: 0 };
		for (const d of intensities) for (const FL of focals) {
			const k = kOf(d, FL);
			if (k === 0) continue;
			const project = createProjectInto(layer, frameWith(k));
			for (const [ux, uy] of rays) {
				let prev = -Infinity;
				for (let i = 0; i <= 3000; i++) {   // t = 0…60 half-frame units: far beyond any frame
					const t = i * 0.02;
					project(t * 500 * ux, t * 400 * uy, out);
					const nx = (out.x - 500) / 500, ny = (out.y - 400) / 400;
					const r = Math.hypot(nx, ny);
					// Never crosses the centre (the image stays on the point's side: f > 0) and never comes back in.
					if (nx * ux + ny * uy < 0 || r < prev - 1e-9) folds.push(`d ${d.toFixed(2)} FL ${FL} ray ${ux},${uy} t ${t.toFixed(2)}`);
					prev = r;
					checked++;
				}
			}
		}
		expect(folds.slice(0, 5)).toEqual([]);
		expect(checked).toBeGreaterThan(4_000_000);
	});

	it('autocomprobación: sin el límite, ese mismo rango sí pliega (la fórmula de CINEMA tal cual)', () => {
		const k = kOf(1, mmToFl(24));               // the strongest barrel the panel allows
		expect(k).toBeLessThan(-1);
		const unlimited = (r2: number) => 1 + k * r2;
		expect(unlimited(2)).toBeLessThan(0);       // already at the frame's corner
		const kDefault = kOf(0.8, 3840);             // the default focal, intensity 0.8: folds past r ≈ 3.5
		expect(1 + kDefault * 3.6 * 3.6).toBeLessThan(0);
	});

	it('dentro del radio del límite es exactamente la función de CINEMA; con k > 0 (cojín) no hay límite', () => {
		for (const k of [-0.104, -0.5, 0.3]) {
			const out = { x: 0, y: 0, scale: 0, opacity: 0 };
			createProjectInto(layer, frameWith(k))(0.3 * 500, 0.4 * 400, out);   // r² = 0.25, inside every limit here
			expect(out.x).toBeCloseTo(500 + 150 * (1 + k * 0.25), 12);
			expect(out.y).toBeCloseTo(400 + 160 * (1 + k * 0.25), 12);
		}
		const far = { x: 0, y: 0, scale: 0, opacity: 0 };
		createProjectInto(layer, frameWith(0.3))(5 * 500, 0, far);                 // r² = 25, pincushion: unlimited
		expect(far.x).toBeCloseTo(500 + 2500 * (1 + 0.3 * 25), 9);
	});
});
