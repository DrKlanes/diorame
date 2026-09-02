import {
	BRUSH_THICKNESS_MIN, BRUSH_THICKNESS_MAX,
	BRUSH_SLIDER_POSITION_MIN, BRUSH_SLIDER_POSITION_MAX,
	BRUSH_THICKNESS_CURVE_EXPONENT,
} from '../constants/brush';

/**
 * Slider position (0-100, the <input>'s own linear scale) -> real thickness in
 * world-space pixels. Called at the point of dispatch, in ToolOptionsPanel.tsx —
 * everything past that dispatch keeps meaning "real thickness", same as before
 * this curve existed.
 */
export function sliderPositionToThickness(position: number): number {
	const p = (position - BRUSH_SLIDER_POSITION_MIN) / (BRUSH_SLIDER_POSITION_MAX - BRUSH_SLIDER_POSITION_MIN);
	const raw = BRUSH_THICKNESS_MIN + (BRUSH_THICKNESS_MAX - BRUSH_THICKNESS_MIN) * Math.pow(p, BRUSH_THICKNESS_CURVE_EXPONENT);
	return Math.round(raw);
}

/**
 * The inverse: real thickness -> slider position. Drives the <input>'s `value` on every
 * render, so the handle lands in the right spot no matter WHY currentBrushThickness
 * changed — dragging the slider itself, switching layers, undo/redo, or loading a
 * .dior — without any of those call sites knowing the curve exists.
 */
export function thicknessToSliderPosition(thickness: number): number {
	const clamped = Math.min(Math.max(thickness, BRUSH_THICKNESS_MIN), BRUSH_THICKNESS_MAX);
	const p = (clamped - BRUSH_THICKNESS_MIN) / (BRUSH_THICKNESS_MAX - BRUSH_THICKNESS_MIN);
	const position = BRUSH_SLIDER_POSITION_MIN + Math.pow(p, 1 / BRUSH_THICKNESS_CURVE_EXPONENT) * (BRUSH_SLIDER_POSITION_MAX - BRUSH_SLIDER_POSITION_MIN);
	return Math.round(position);
}
