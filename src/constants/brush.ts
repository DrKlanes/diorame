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

/**
 * Slider control curve (v3.17.41).
 *
 * The <input type="range"> no longer holds the thickness value directly — it holds a
 * PHYSICAL POSITION on its own 0-100 scale, converted to/from real thickness by
 * utils/brushThicknessCurve.ts at the point of dispatch and at the point of display.
 * Nothing downstream of that conversion (reducer, strokeGenerators, shape.brushThickness,
 * .dior, autosave) ever sees a position — only real thickness, exactly as before this
 * curve existed. See ToolOptionsPanel.tsx for where the two meet.
 *
 * Exponent 1.5, chosen by Moisés against a table of concrete values (not eyeballed):
 * position 10% -> ~3px, 25% -> ~10px, 50% -> ~25px, 75% -> ~46px, 90% -> ~60px, 100% -> 70px.
 * Verified: every integer thickness in [MIN, MAX] is reachable at step=1 on the position
 * scale, and the curve round-trips exactly (thickness -> position -> thickness) for all
 * 70 of them — no off-by-one anywhere in the range.
 */
export const BRUSH_SLIDER_POSITION_MIN = 0;
export const BRUSH_SLIDER_POSITION_MAX = 100;
export const BRUSH_SLIDER_POSITION_STEP = 1;
export const BRUSH_THICKNESS_CURVE_EXPONENT = 1.5;
