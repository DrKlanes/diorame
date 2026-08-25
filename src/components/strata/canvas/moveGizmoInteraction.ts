import type { GizmoHandles } from './drawGizmo';

/**
 * Pure interaction logic for the Move tool's transform gizmo.
 *
 * Extracted verbatim from StrataCanvas's pointer handlers (Fase 0 of the
 * squash & stretch sprint). The math and behavior are IDENTICAL to the
 * previous inline code — only relocated. These functions never touch React
 * refs or the RAF; the caller (StrataCanvas) reads its refs/state, passes
 * plain values in, and writes the returned values back. "Caller orquesta,
 * módulos puros."
 */

export type TransformMode =
	| 'move' | 'rotate'
	| 'scale_tl' | 'scale_tr' | 'scale_br' | 'scale_bl'  // corners → uniform scale
	| 'scale_t' | 'scale_b' | 'scale_l' | 'scale_r';     // sides → per-axis (squash & stretch)

export type Transform = {
	x: number;
	y: number;
	scale: number;       // uniform scale (corner handles)
	rotation: number;
	// Non-uniform axis scale (side handles, squash & stretch). When absent the
	// uniform `scale` is used for both axes, so a uniform transform is unchanged.
	scaleX?: number;
	scaleY?: number;
};

// Hit radius in screen px. Larger than the visual handle for comfortable touch.
const HIT_RADIUS = 40;

/**
 * Hit-tests the pointer against the gizmo handles and returns the interaction
 * mode. Defaults to 'move' (drag the whole layer) when no handle is hit or no
 * handles are present.
 */
export const hitTestGizmo = (
	pointerX: number,
	pointerY: number,
	handles: GizmoHandles | null,
): TransformMode => {
	let mode: TransformMode = 'move';
	if (handles) {
		const dist = (p: { x: number; y: number }) => Math.hypot(p.x - pointerX, p.y - pointerY);
		if (dist(handles.rotate) < HIT_RADIUS) mode = 'rotate';
		else if (dist(handles.tl) < HIT_RADIUS) mode = 'scale_tl';
		else if (dist(handles.tr) < HIT_RADIUS) mode = 'scale_tr';
		else if (dist(handles.br) < HIT_RADIUS) mode = 'scale_br';
		else if (dist(handles.bl) < HIT_RADIUS) mode = 'scale_bl';
		// Mid-side handles (squash & stretch). Checked AFTER corners so corners win on
		// overlap in small boxes. Optional in the type, but drawGizmo always sets them.
		else if (handles.mt && dist(handles.mt) < HIT_RADIUS) mode = 'scale_t';
		else if (handles.mb && dist(handles.mb) < HIT_RADIUS) mode = 'scale_b';
		else if (handles.ml && dist(handles.ml) < HIT_RADIUS) mode = 'scale_l';
		else if (handles.mr && dist(handles.mr) < HIT_RADIUS) mode = 'scale_r';
	}
	return mode;
};

export type ComputeMoveTransformParams = {
	mode: string;
	startTransform: Transform;
	startP: { x: number; y: number };
	pointerX: number;
	pointerY: number;
	handles: GizmoHandles | null;
	// Inputs for the 'move' mode drawing-parallax scale (so a pointer delta in
	// screen px maps to the right world delta at the active layer's depth).
	focalLength: number;
	cameraZ: number;
	activeZ: number;
	drawingZoom: number;
};

/**
 * Computes the new transform from the active gizmo drag. Returns a fresh
 * Transform derived from startTransform — does not mutate inputs.
 *
 * - 'move':   translate by the pointer delta, divided by the layer's projected
 *             scale so it tracks the cursor in world space.
 * - 'rotate':        add the angle swept around the box center.
 * - 'scale_l/r':     per-axis horizontal stretch (squash & stretch) → scaleX.
 * - 'scale_t/b':     per-axis vertical stretch → scaleY. No rotation involved.
 * - 'scale_tl..bl':  uniform scale by the ratio of current/start distance to center.
 */
export const computeMoveTransform = (p: ComputeMoveTransformParams): Transform => {
	const { mode, startTransform, startP, pointerX, pointerY, handles } = p;
	const dx = pointerX - startP.x;
	const dy = pointerY - startP.y;
	const newT = { ...startTransform };

	if (mode === 'move') {
		const dz = p.activeZ - p.cameraZ;
		const layerScale = p.focalLength / (p.focalLength + dz);
		const s = (p.drawingZoom || 1) * layerScale;
		newT.x += dx / s;
		newT.y += dy / s;
	} else if (mode === 'rotate') {
		if (handles) {
			const hcx = handles.center.x;
			const hcy = handles.center.y;
			const startAngle = Math.atan2(startP.y - hcy, startP.x - hcx);
			const currAngle = Math.atan2(pointerY - hcy, pointerX - hcx);
			newT.rotation += (currAngle - startAngle);
		}
	} else if (mode === 'scale_l' || mode === 'scale_r') {
		// Side handle → pure horizontal (world-X) stretch. Ratio of the pointer's
		// horizontal distance from the box center vs. its start. rotation untouched.
		// Drawing-mode projection has no rotation, so screen-X aligns with world-X.
		if (handles) {
			const hcx = handles.center.x;
			const startDistX = Math.abs(startP.x - hcx);
			const currDistX = Math.abs(pointerX - hcx);
			newT.scaleX = (startTransform.scaleX ?? 1) * (currDistX / Math.max(1, startDistX));
			newT.scaleY = startTransform.scaleY ?? 1;
		}
	} else if (mode === 'scale_t' || mode === 'scale_b') {
		// Side handle → pure vertical (world-Y) stretch.
		if (handles) {
			const hcy = handles.center.y;
			const startDistY = Math.abs(startP.y - hcy);
			const currDistY = Math.abs(pointerY - hcy);
			newT.scaleY = (startTransform.scaleY ?? 1) * (currDistY / Math.max(1, startDistY));
			newT.scaleX = startTransform.scaleX ?? 1;
		}
	} else if (mode.startsWith('scale')) {
		// Corner handles → uniform scale (existing behavior, unchanged).
		if (handles) {
			const hcx = handles.center.x;
			const hcy = handles.center.y;
			const startDist = Math.hypot(startP.x - hcx, startP.y - hcy);
			const currDist = Math.hypot(pointerX - hcx, pointerY - hcy);
			// Prevent division by zero
			const scaleFactor = currDist / Math.max(1, startDist);
			newT.scale *= scaleFactor;
		}
	}

	return newT;
};

// Screen-space drag dead-zone, in CSS px. Same criterion the project already uses to
// discard accidental input (micro-stroke discard, palm-rejection stroke length) — a
// deliberate 3px move reads as intentional, a click that drifts by a fraction of a
// pixel does not. Below this, a Move-tool click anywhere on the canvas (there is no
// containment check — see hitTestGizmo's 'move' fallback) used to still count as a
// drag: the old gate compared the RESULTING transform in world units (0.1), which a
// sub-pixel screen jitter clears trivially once zoom or projection scale divides it
// down further. Measuring the raw screen delta first closes that regardless of zoom.
const DRAG_DEAD_ZONE_PX = 3;

/**
 * Whether a gizmo drag counts as "engaged" — has moved far enough from its start to
 * be a deliberate drag rather than a stationary click.
 *
 * Two properties the caller must preserve, both required for the tool to stay usable
 * for its main job (fine-grained adjustment):
 *  - `startP` is fixed at pointerdown and must NEVER be updated between calls — each
 *    call re-measures the TOTAL displacement since the drag began. Comparing against
 *    the previous pointermove's position instead would measure per-frame delta, which
 *    stays under the threshold for an arbitrarily long slow, deliberate drag.
 *  - `alreadyEngaged` gives this hysteresis: once true, it stays true for the rest of
 *    the gesture regardless of what the distance does afterwards. Without it, a drag
 *    that happens to swing back near its start point mid-gesture would disengage on
 *    its own and start ignoring further movement.
 */
export const isDragEngaged = (
	startP: { x: number; y: number },
	pointerX: number,
	pointerY: number,
	alreadyEngaged: boolean,
): boolean =>
	alreadyEngaged || Math.hypot(pointerX - startP.x, pointerY - startP.y) >= DRAG_DEAD_ZONE_PX;

/**
 * True when the transform departs enough from identity to be worth committing
 * to history (same thresholds as the original inline guard).
 */
export const isSignificantTransform = (t: Transform): boolean =>
	Math.abs(t.x) > 0.1 || Math.abs(t.y) > 0.1 || Math.abs(t.scale - 1) > 0.001 || Math.abs(t.rotation) > 0.001
	|| (t.scaleX !== undefined && Math.abs(t.scaleX - 1) > 0.001)
	|| (t.scaleY !== undefined && Math.abs(t.scaleY - 1) > 0.001);
