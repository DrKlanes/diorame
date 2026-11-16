import type { AppState } from '../../../types/strataTypes';
import { BASE_DEPTH_STEP } from '../../../constants/layers';
import { DOUBLE_CLICK_DELAY, DOUBLE_CLICK_MAX_DISTANCE } from '../../../constants/renderConstants';
import { isLayerEmpty } from '../../../utils/animationFrames';
import { unprojectCinematicPoint, referencePlaneZ } from './unprojectPoint';
import { pickLayerAtPoint } from './pickLayerAtPoint';
import { CINEMATIC_DEPTH_MULTIPLIER } from './cinematicCamera';
import type { DrawnFrameOptics } from './renderPipeline';

/**
 * The CINEMA double click: whether a click completes one, and which world point it frames.
 *
 * Extracted from StrataCanvas's handlePointerDown (handlers sprint, v3.26.56): the body of
 * frameCinemaPoint is the block that was inline, moved with its comments. Pure — it reads the
 * state and the optics of the last drawn frame that the handler passes in, and returns the point;
 * the handler still decides WHEN (the click test on its own refs, disarming the pair, the
 * SET_POINT_OF_INTEREST dispatch).
 */

/** A second click within DOUBLE_CLICK_DELAY and DOUBLE_CLICK_MAX_DISTANCE of the one that armed the pair. */
export const isDoubleClick = (
	now: number,
	lastClickTime: number,
	pointerX: number,
	pointerY: number,
	lastClickPos: { x: number; y: number },
): boolean => {
	// Both tests, not just the clock: two taps far apart are two taps, however
	// quickly they follow each other.
	const nearLast = Math.hypot(
		pointerX - lastClickPos.x,
		pointerY - lastClickPos.y,
	) <= DOUBLE_CLICK_MAX_DISTANCE;
	return now - lastClickTime < DOUBLE_CLICK_DELAY && nearLast;
};

export type FrameCinemaPointParams = {
	state: AppState;
	/** drawnFrameRef.current: the optics of the frame on screen, or null before the first one. */
	optics: DrawnFrameOptics | null;
	/** Pointer in canvas px (client − rect origin). */
	pointerX: number;
	pointerY: number;
	/** Centre of the canvas, in canvas px. */
	cx: number;
	cy: number;
};

/**
 * The world point a CINEMA double click frames: the content under the pointer on the nearest
 * layer that has some there, or the mid-plane of the layers with content. `framed` is null when
 * that plane sits at or behind the near clip.
 */
export const frameCinemaPoint = (p: FrameCinemaPointParams): { framed: { x: number; y: number } | null; framedZ: number } => {
	const { state, optics, pointerX, pointerY, cx, cy } = p;
	// Framing, not focus: where the camera aims in X/Y. Nothing to do with the
	// DoF's Z. Uses the real inverse projection (canvas/unprojectPoint.ts)
	// instead of the DRAW-mode maths computed above — worldX/worldY are wrong
	// here, they assume a different camera. See that module's header.
	//
	// PICKING PER LAYER (v3.17.23): un-project the touched pixel onto EVERY
	// candidate layer and ask which one has content there. A fixed reference
	// plane could not do this — the same pixel on the mid-plane is a different
	// world position than on layer 10, so touching a nose framed a point on the
	// same line of sight but at the wrong depth. Deterministic and still useless.
	// Las ópticas del frame que el usuario ESTÁ VIENDO, no las de AppState.
	// state.camera se congela al entrar en CINEMA —ControlsV2 la fija en
	// {0,0,500} y nadie la vuelve a escribir, mientras el tick mueve cameraRef
	// cada frame—, state.focalLength no conoce el barrido del preset 'zoom', y
	// ninguno de los dos sabe de la cuantización de pixel art. Invertir con
	// esos valores es invertir un frame que no existe.
	// Sin frame dibujado todavía (primer pointerdown antes del primer RAF) se
	// cae a AppState, que es lo mejor disponible en ese instante.
	const frameCamera = optics ? optics.camera : state.camera;
	const frameFocalLength = optics ? optics.focalLength : state.focalLength;
	const frameViewZoomOffset = optics ? optics.viewZoomOffset : state.viewZoomOffset;

	const fxOn = state.fxMasterEnabled && state.postProcessingEnabled.distortion;
	const fxDistortion = fxOn ? state.postProcessing.distortion : 0;
	// Mirrors renderPipeline's distortionK. Kept in step by hand rather than
	// shared, to avoid reaching into the render pipeline for a scalar — if that
	// formula ever moves, this is the other place that reads it. A lens that
	// bends the image has to bend the un-projection too.
	const distortionK = Math.abs(fxDistortion) > 0.01
		? (fxDistortion * -0.8) * (500 / frameFocalLength)
		: 0;
	// Deshacer el pivote de arc/orbit ANTES de invertir. transformPoint desplaza
	// cada punto por (cámara ideal − POI)·arcPivotScale en esos dos presets, así
	// que el píxel tocado viene corrido en esa misma cantidad.
	// El POI que usa el pivote es el ANTERIOR —el que ya estaba en state cuando
	// se dibujó el frame—, no el que se está calculando: no hay dependencia
	// circular y basta una resta, sin iterar. La sacudida (handheld) va incluida
	// en la cámara, y transformPoint se la resta para recuperar la ideal, así que
	// aquí se hace igual.
	let pivotDX = 0, pivotDY = 0;
	if (optics && optics.isArcOrOrbit) {
		const idealCamX = optics.camera.x - optics.shake.x;
		const idealCamY = optics.camera.y - optics.shake.y;
		pivotDX = (idealCamX - optics.pivotPoiX) * optics.arcPivotScale;
		if (optics.cinematicType === 'orbit') {
			pivotDY = (idealCamY - optics.pivotPoiY) * optics.arcPivotScale;
		}
	}
	const unprojectOn = (referenceZ: number) => unprojectCinematicPoint({
		screenX: pointerX - pivotDX, screenY: pointerY - pivotDY,
		centerXScreen: cx, centerYScreen: cy,
		camera: frameCamera,
		focalLength: frameFocalLength,
		viewZoomOffset: frameViewZoomOffset,
		layerSpacingFactor: state.layerSpacingFactor,
		referenceZ,
		viewZoom: 1,
		viewPan: { x: 0, y: 0 },
		distortionK,
	});

	// Candidates, front to back by REAL distance to the camera. Not by layer
	// index: with the camera moving in z and layerSpacingFactor variable, index
	// order and depth order are not the same. Empty layers (nothing to hit) and
	// hidden ones (cannot point at what you cannot see) are dropped first.
	const effCamZ = frameCamera.z + frameViewZoomOffset;
	const candidates: number[] = [];
	for (let i = 0; i < state.totalLayers; i++) {
		if (state.hiddenLayers.includes(i)) continue;
		if (isLayerEmpty(state, i)) continue;
		candidates.push(i);
	}
	const dzOf = (i: number) =>
		(i * -BASE_DEPTH_STEP) * state.layerSpacingFactor * CINEMATIC_DEPTH_MULTIPLIER - effCamZ;
	candidates.sort((a, b) => dzOf(a) - dzOf(b));

	const activeLayerZ = (i: number) => i * -BASE_DEPTH_STEP;
	const hit = pickLayerAtPoint(
		candidates,
		(i) => state.shapes.filter(sh => sh.zIndex === activeLayerZ(i)),
		(i) => unprojectOn(activeLayerZ(i)),
		BASE_DEPTH_STEP,
	);

	// Nothing under the pointer → the mid-plane of the layers with content.
	// It stops being the main answer and becomes the fallback, which is where it
	// always belonged: the honest reply when there is nothing to point at.
	let framed: { x: number; y: number } | null = null;
	let framedZ = 0;
	if (hit) {
		framed = { x: hit.x, y: hit.y };
		framedZ = hit.z;
	} else {
		framedZ = referencePlaneZ(state.totalLayers, (i) => !isLayerEmpty(state, i), BASE_DEPTH_STEP);
		framed = unprojectOn(framedZ);
	}
	return { framed, framedZ };
};
