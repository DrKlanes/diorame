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

// Modes that point at a scale handle. 'move' and 'rotate' are absent on purpose:
// 'rotate' is handled above, and 'move' falls through to null (no override → the
// container keeps cursor-move).
const HANDLE_OF_MODE: Record<string, keyof GizmoHandles> = {
	scale_tl: 'tl', scale_tr: 'tr', scale_br: 'br', scale_bl: 'bl',
	scale_t: 'mt', scale_b: 'mb', scale_l: 'ml', scale_r: 'mr',
};

/**
 * Returns the cursor class for a hovered gizmo mode, or null meaning "no override"
 * (the caller falls back to the tool's default cursor).
 *
 * ROTATION IS COMPENSATED, at no extra cost. The handles arrive from drawGizmo
 * already projected, so the layer rotation, the non-uniform (squash & stretch)
 * scale and the drawing zoom/pan are all baked into their screen positions. The
 * vector (handle − center) is therefore the REAL on-screen direction of the drag,
 * never the unrotated one:
 *   · side handles   → it lands exactly on the box's local axis — the same geometry
 *                      drawGizmo uses to orient the mid-side bars;
 *   · corner handles → it is the radial direction a uniform scale actually moves
 *                      the corner along, aspect ratio included.
 * Rounding that angle to the nearest 45° selects one of the 8 native cursors.
 */
export const cursorClassForGizmoMode = (
	mode: TransformMode,
	handles: GizmoHandles | null,
): string | null => {
	if (mode === 'rotate') return ROTATE_CURSOR;

	const key = HANDLE_OF_MODE[mode];
	if (!key || !handles) return null;

	// Undefined on a pure-text layer, where drawGizmo omits the side handles.
	const p = handles[key];
	if (!p) return null;

	const dx = p.x - handles.center.x;
	const dy = p.y - handles.center.y;
	if (dx === 0 && dy === 0) return null;

	const octant = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
	return RESIZE_BY_OCTANT[octant];
};
