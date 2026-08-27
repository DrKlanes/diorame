import { NEAR_CLIP } from '../../../constants/renderConstants';
import { CINEMATIC_DEPTH_MULTIPLIER } from './cinematicCamera';

/**
 * Screen → world for CINEMA mode: the inverse of the cinematic branch of
 * createTransformPoint (canvas/transformPoint.ts).
 *
 * It exists because there was no inverse at all. The CINEMA double-click reused
 * the DRAW-mode world-coordinate maths that happened to sit a few lines above it
 * in handlePointerDown — a different camera and a different matrix. That inverse
 * dropped camera.x/y, CINEMATIC_DEPTH_MULTIPLIER, viewZoomOffset,
 * layerSpacingFactor and the camera rotation, and referenced the ACTIVE LAYER's
 * depth. The three depth errors cancel out at exactly one layer index (2, when
 * layerSpacingFactor is 1) and nowhere else, which is why aiming the camera felt
 * like a lottery: it was correct only when a leftover DRAW-mode selection happened
 * to sit on that one layer.
 *
 * MIRROR THIS FILE AGAINST transformPoint.ts. Every term here is the algebraic
 * undo of a term there, in reverse order. If the forward projection changes, this
 * breaks silently — the round-trip test is what catches it.
 *
 * NOT INVERTED (deliberate, v3.17.17):
 *   - Lens distortion. `r' = r(1 + k·r²)` has no closed-form inverse; it needs a
 *     couple of Newton steps. Residual error is zero at the centre and grows with
 *     the square of the distance to it, so it only matters for a click near a
 *     corner with distortion turned up.
 *   - The arc/orbit pivot offset. It is a function of the POI, which is the very
 *     thing being computed — a circular dependency that deserves its own pass.
 *     Those two presets keep a residual offset.
 */

export type CinematicUnprojectParams = {
	/** Pointer position in px from the canvas element's top-left corner. */
	screenX: number;
	screenY: number;
	/** Screen-space centre used by the forward projection (canvas w/2, h/2). */
	centerXScreen: number;
	centerYScreen: number;
	camera: { x: number; y: number; z: number; rotation: number };
	/** state.focalLength — the CINEMA focal length (default 800). */
	focalLength: number;
	viewZoomOffset: number;
	layerSpacingFactor: number;
	/**
	 * RAW layer-space z of the plane the click should land on, i.e.
	 * layerIndex * -BASE_DEPTH_STEP. May be fractional (the mid-plane usually is).
	 * The spacing factor and the depth multiplier are applied HERE, exactly as
	 * renderLayerBody does — pass the raw value, not a pre-multiplied one.
	 */
	referenceZ: number;
	/** 1 in CINEMA, but taken as a parameter so the inverse never assumes it. */
	viewZoom: number;
	viewPan: { x: number; y: number };
};

/**
 * Returns the world point under the pointer on the reference plane, or null when
 * that plane is at or behind the near clip — the same condition that makes
 * renderLayerBody skip a layer, so a null here means "the forward projection
 * would not have drawn anything there either".
 */
export const unprojectCinematicPoint = (p: CinematicUnprojectParams): { x: number; y: number } | null => {
	// Depth of the reference plane, mirroring renderLayerBody's baseZ/shapeZ.
	const shapeZ = p.referenceZ * p.layerSpacingFactor * CINEMATIC_DEPTH_MULTIPLIER;
	const effectiveCameraZ = p.camera.z + p.viewZoomOffset;
	const dz = shapeZ - effectiveCameraZ;

	const denom = p.focalLength + dz;
	if (denom <= NEAR_CLIP) return null;
	const layerScale = p.focalLength / denom;
	if (layerScale === 0 || !Number.isFinite(layerScale)) return null;
	if (p.viewZoom === 0 || !Number.isFinite(p.viewZoom)) return null;

	// 1. Undo the viewport: centre offset, zoom and pan.
	let sx = (p.screenX - p.centerXScreen - p.viewPan.x) / p.viewZoom;
	let sy = (p.screenY - p.centerYScreen - p.viewPan.y) / p.viewZoom;

	// 2. Undo the camera rotation. Forward rotates by +R
	//    (rx = sx·cos − sy·sin, ry = sx·sin + sy·cos), so this rotates by −R.
	const camRot = p.camera.rotation || 0;
	if (camRot !== 0) {
		const cosR = Math.cos(camRot);
		const sinR = Math.sin(camRot);
		const ux = sx * cosR + sy * sinR;
		const uy = -sx * sinR + sy * cosR;
		sx = ux; sy = uy;
	}

	// 3. Undo the perspective scale and the camera translation.
	return {
		x: sx / layerScale + p.camera.x,
		y: sy / layerScale + p.camera.y,
	};
};

/**
 * The reference plane for un-projecting a CINEMA click: the middle of the layers
 * that actually hold content.
 *
 * NOT the active layer, which is what the old code used. In CINEMA the active
 * layer is a leftover from DRAW mode — invisible, not chosen with CINEMA in mind,
 * and with no reason to govern framing. Depending on invisible state was the bug.
 * The mid-plane is predictable instead: the same pixel gives the same answer every
 * time, whatever happened in DRAW mode before.
 *
 * Content-aware rather than a plain range midpoint, because a diorama with 8
 * layers and drawing only in the first 3 should not reference empty space.
 *
 * Falls back to the midpoint of ALL layers when nothing is drawn yet — the same
 * convention renderPipeline already uses for its default centerZ, so an unset POI
 * and a click on an empty canvas agree on where the middle is.
 *
 * @param totalLayers  state.totalLayers
 * @param hasContent   Predicate: does this layer index hold non-eraser shapes?
 * @param baseDepthStep BASE_DEPTH_STEP
 * @returns RAW layer-space z (may be fractional), ready for `referenceZ`.
 */
export const referencePlaneZ = (
	totalLayers: number,
	hasContent: (layerIndex: number) => boolean,
	baseDepthStep: number,
): number => {
	let first = -1;
	let last = -1;
	for (let i = 0; i < totalLayers; i++) {
		if (!hasContent(i)) continue;
		if (first === -1) first = i;
		last = i;
	}
	const midIndex = first === -1
		? (totalLayers - 1) / 2
		: (first + last) / 2;
	return midIndex * -baseDepthStep;
};
