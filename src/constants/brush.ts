/**
 * Brush thickness range.
 *
 * The value dispatched via SET_BRUSH_THICKNESS is world-space pixel width, not an
 * abstract slider position — it flows unchanged into strokeGenerators (bakes
 * shape.points), into shape.brushThickness (read directly at render for uniform/dot/
 * eraser), and into state.currentBrushThickness (persisted in .dior and autosave).
 * Changing this range never touches stored geometry: shape.points is baked once and
 * replayed as-is, never regenerated on load.
 *
 * MAX was 100 through v3.17.39. Lowered to 70 (v3.17.40): the ceiling was rarely
 * reached in practice, and a 100px stroke on a canvas that is itself ~1280px wide
 * (default zoom) is disproportionate — see docs/ux-debt.md if that reasoning needs
 * revisiting later.
 */
export const BRUSH_THICKNESS_MIN = 1;
export const BRUSH_THICKNESS_MAX = 70;
export const BRUSH_THICKNESS_STEP = 1;
