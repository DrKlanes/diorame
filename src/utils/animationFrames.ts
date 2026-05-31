import type { AppState } from '../types/strataTypes';

// Mirror of StrataContext.BASE_DEPTH_STEP — kept local to avoid circular import
// (StrataContext imports this module; this module cannot re-import StrataContext)
const BASE_DEPTH_STEP = 150;

/**
 * Returns true when a layer has no drawable content.
 * A layer is considered empty when it has no non-eraser shapes.
 * Uses the same shape-to-layer association as the reducer:
 *   s.zIndex === layerIndex * -BASE_DEPTH_STEP
 */
export function isLayerEmpty(state: AppState, layerIndex: number): boolean {
	const z = layerIndex * -BASE_DEPTH_STEP;
	return !state.shapes.some(s => s.zIndex === z && !s.isEraser);
}

/**
 * Returns the ordered list of layer indices that qualify as animation frames:
 * layers that have drawable content (at least one non-eraser shape)
 * AND are not hidden.
 *
 * Skips hidden layers (state.hiddenLayers is number[]).
 * Returns indices in ascending order (layer 0 first = frame 1 first).
 */
export function getAnimationFrames(state: AppState): number[] {
	const frames: number[] = [];
	for (let i = 0; i < state.totalLayers; i++) {
		if (!isLayerEmpty(state, i) && !state.hiddenLayers.includes(i)) {
			frames.push(i);
		}
	}
	return frames;
}
