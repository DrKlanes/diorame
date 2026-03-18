// Render constants extracted from StrataCanvas.tsx

/** Number of floating particles in cinematic mode */
export const PARTICLE_COUNT = 700;

/** Minimum touch-pointer points required to register a stroke (palm rejection) */
export const MIN_TOUCH_STROKE_POINTS = 2;

/** Base density multiplier for exponential fog calculation */
export const FOG_DENSITY_FACTOR = 0.0004;

/** Base frequency (Hz) for the handheld sway component (body/breathing movement) */
export const HANDHELD_SWAY_FREQ = 1.5;

/** Base frequency (Hz) for the handheld tremor component (muscle tension) */
export const HANDHELD_TREMOR_FREQ = 8.0;

/** Max time (ms) between two clicks to be considered a double-click */
export const DOUBLE_CLICK_DELAY = 300;

/** Minimum ms between render frames while drawing (~120 fps cap) */
export const RENDER_THROTTLE_MS = 8;
