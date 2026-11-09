import { getLayerBoundingBox } from './transformUtils';
import { DRAW_FOCAL_LENGTH, NEAR_CLIP } from '../../../constants/renderConstants';
import type { AppState, Shape } from '../../../types/strataTypes';
import type { Rect } from '../../../utils/formatFrame';

const BASE_DEPTH_STEP = 150; // StrataContext's (not imported: this module must not pull the reducer)
const MARGIN = 0.04;         // of the long side, each side (like frameOf)
const MARGIN_MIN = 32;       // world units = px at zoom 1

/**
 * «Dibujo completo» (v3.25.9): the ink of the visible layers in the LIVE DRAW projection, in the coordinates of the
 * active layer's plane (the format frame's: world = (screen − size/2 − pan) / zoom), plus 4 % of the long side
 * (minimum 32) each side. Null when there is nothing to frame (empty, or every layer with ink hidden).
 *
 * Mirrors the DRAW branch of transformPoint.ts, not frameOf (which is the Lab's contract and puts the camera at 0):
 *   scale = FL / (FL + z − camera.z), with the RAW z: DRAW ignores the CINEMA layer spacing, and in animation it
 *   does not flatten (pinned layers keep their parallax); it only shows the current frame plus the pinned layers
 *   (renderPipeline's renderZs filter). Until v3.25.27 this used z·spacing and k = 1 in animation: the box drifted
 *   from the render.
 * getLayerBoundingBox measures the painted ink (erasers included), so the box is the drawing, not its points.
 */
export function drawingBounds(state: AppState): Rect | null {
	const byZ = new Map<number, Shape[]>();
	for (const s of state.shapes) {
		if (!byZ.has(s.zIndex)) byZ.set(s.zIndex, []);
		byZ.get(s.zIndex)!.push(s);
	}
	const frameZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
	const pinned = new Set(state.locked3DLayers.map(i => i * -BASE_DEPTH_STEP));

	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const [z, shapes] of byZ) {
		if (state.hiddenLayers.includes(Math.round(Math.abs(z / BASE_DEPTH_STEP)))) continue;
		if (state.isAnimationMode && z !== frameZ && !pinned.has(z)) continue;
		const dz = z - state.camera.z;
		if (DRAW_FOCAL_LENGTH + dz <= NEAR_CLIP) continue;
		const k = DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH + dz);
		const bb = getLayerBoundingBox(shapes);
		if (!bb) continue;
		// The box is in whole pixels with its max inclusive (as frameOf reads it).
		minX = Math.min(minX, bb.minX * k); minY = Math.min(minY, bb.minY * k);
		maxX = Math.max(maxX, (bb.maxX + 1) * k); maxY = Math.max(maxY, (bb.maxY + 1) * k);
	}
	if (minX === Infinity) return null;
	const m = Math.max(MARGIN_MIN, MARGIN * Math.max(maxX - minX, maxY - minY));
	return { x: minX - m, y: minY - m, w: maxX - minX + 2 * m, h: maxY - minY + 2 * m };
}
