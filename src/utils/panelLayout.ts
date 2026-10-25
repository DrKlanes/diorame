import { SPACE } from '../design-system/tokens';

// Real anchors of the fixed UI. A panel docked on the right edge lives between them: it is centred in
// that band and never taller than it, so it cannot cover the TopBar pills or the bottom bar.
const TOP_BAR_PILL_HEIGHT = 40;
const PANEL_GAP = 8;

/** Height of the CINEMA camera bar: one row, or two when `useIsCameraBarCompact`. */
export const CAMERA_BAR_HEIGHT = { wide: 40, compact: 88 } as const;

/**
 * `top` / `bottom` CSS values for an absolutely positioned wrapper that spans the free band on the
 * right edge. `bottomBarHeight` is the height of whatever sits at the bottom edge (a bar; 0 = none).
 * `isStandalone`: the TopBar adds the iOS safe-area inset to its top padding in an installed PWA.
 */
export function rightPanelInsets(bottomBarHeight: number, isStandalone: boolean): { top: string; bottom: string } {
	const top = SPACE.edge + TOP_BAR_PILL_HEIGHT + PANEL_GAP;
	const bottom = SPACE.edge + bottomBarHeight + PANEL_GAP;
	return {
		top: isStandalone ? `calc(env(safe-area-inset-top, 0px) + ${top}px)` : `${top}px`,
		bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)`,
	};
}
