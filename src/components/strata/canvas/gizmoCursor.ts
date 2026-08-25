import type { GizmoHandles } from './drawGizmo';
import type { TransformMode } from './moveGizmoInteraction';

/**
 * Maps a gizmo hit-test result to the CSS cursor class that announces what a drag
 * from that spot will do — BEFORE the user presses. With the Move tool the canvas
 * is where the attention is, not the UI, so the cursor is the only affordance the
 * handles have.
 *
 * Pure module: no refs, no DOM, no React. The caller (StrataCanvas) hit-tests with
 * hitTestGizmo, passes the resulting mode plus the already-projected handles in,
 * and writes the returned class to its cursor state.
 */

// The 8 native directional resize cursors, indexed by 45° octant starting at east
// and advancing clockwise on screen (canvas Y grows downward).
//
// Written as literal strings on purpose: the Tailwind v4 JIT scanner does not
// evaluate expressions, so a template literal here would emit class names that are
// never generated into the stylesheet — the cursor would silently fall back to the
// container default with no build error.
const RESIZE_BY_OCTANT = [
	'cursor-e-resize',   // 0
	'cursor-se-resize',  // 1
	'cursor-s-resize',   // 2
	'cursor-sw-resize',  // 3
	'cursor-w-resize',   // 4
	'cursor-nw-resize',  // 5
	'cursor-n-resize',   // 6
	'cursor-ne-resize',  // 7
];

// CSS has no native rotate cursor. Custom curved-arrow cursor defined in
// styles/globals.css (static data-URI rule → zero runtime cost).
const ROTATE_CURSOR = 'cursor-rotate';

// The 2 diagonal cursors, for corner handles. Also literals, same JIT reason.
const DIAGONAL_NWSE = 'cursor-nwse-resize';
const DIAGONAL_NESW = 'cursor-nesw-resize';

// Corner modes → the two handles spanning the box diagonal that corner sits on.
// tl and br share one diagonal, tr and bl the other.
const DIAGONAL_OF_CORNER: Record<string, [keyof GizmoHandles, keyof GizmoHandles]> = {
	scale_tl: ['tl', 'br'], scale_br: ['tl', 'br'],
	scale_tr: ['tr', 'bl'], scale_bl: ['tr', 'bl'],
};

// Mid-side modes → the handle whose direction from the center IS the resize axis.
// 'move' and 'rotate' are absent on purpose: 'rotate' is handled first, and 'move'
// falls through to null (no override → the container keeps cursor-move).
const HANDLE_OF_SIDE: Record<string, keyof GizmoHandles> = {
	scale_t: 'mt', scale_b: 'mb', scale_l: 'ml', scale_r: 'mr',
};

/**
 * Returns the cursor class for a hovered gizmo mode, or null meaning "no override"
 * (the caller falls back to the tool's default cursor).
 *
 * ROTATION IS COMPENSATED, at no extra cost, because the handles arrive from
 * drawGizmo already projected: the layer rotation, the non-uniform (squash &
 * stretch) scale and the drawing zoom/pan are baked into their screen positions.
 * Both branches below read the REAL on-screen geometry, never the unrotated one.
 *
 * CORNERS answer with a DIAGONAL cursor, always — nwse or nesw, whichever axis the
 * box's own diagonal is closer to on screen. The cursor's job is to name what KIND
 * of handle this is (diagonal = proportional scale, axis = one-axis scale), not to
 * trace the vector the point travels along. Deriving the angle from (corner −
 * center) does trace that vector faithfully, and that is exactly why it was wrong:
 * on a 600×80 box the top-left corner sits almost due west of the center, so it
 * answered cursor-w-resize — a cursor that claims "this scales horizontally" about
 * a handle that scales both axes. Figma, Illustrator and Photoshop all show the
 * diagonal here; it is the correct reading of the affordance, not a convention.
 * Fixed in v3.17.2, found by Moisés on an elongated layer.
 *
 * MID-SIDES keep the (handle − center) angle rounded to 45°: there the vector and
 * the meaning agree — that direction IS the single axis being scaled, landing
 * exactly on the box's local axis (the same geometry drawGizmo uses to orient the
 * mid-side bars).
 */
export const cursorClassForGizmoMode = (
	mode: TransformMode,
	handles: GizmoHandles | null,
): string | null => {
	if (mode === 'rotate') return ROTATE_CURSOR;
	if (!handles) return null;

	const diagonal = DIAGONAL_OF_CORNER[mode];
	if (diagonal) {
		const a = handles[diagonal[0]];
		const b = handles[diagonal[1]];
		if (!a || !b) return null;
		// Fold to an AXIS in [0, π): a diagonal has no head or tail, only a slope.
		// Under π/2 the box diagonal runs down-right → the NW–SE axis; over it,
		// down-left → NE–SW. No aspect ratio can push it onto an axis cursor.
		let axis = Math.atan2(b.y - a.y, b.x - a.x) % Math.PI;
		if (axis < 0) axis += Math.PI;
		return axis < Math.PI / 2 ? DIAGONAL_NWSE : DIAGONAL_NESW;
	}

	const key = HANDLE_OF_SIDE[mode];
	if (!key) return null;

	// Undefined on a pure-text layer, where drawGizmo omits the side handles.
	const p = handles[key];
	if (!p) return null;

	const dx = p.x - handles.center.x;
	const dy = p.y - handles.center.y;
	if (dx === 0 && dy === 0) return null;

	const octant = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
	return RESIZE_BY_OCTANT[octant];
};
