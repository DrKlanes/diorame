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

/**
 * Returns the previous and next frame indices relative to currentLayerIndex
 * in the real animation sequence (non-empty, non-hidden layers).
 *
 * Used by the onion skin render pass in renderPipeline.ts.
 *
 * Two cases:
 *   - Current layer IS a frame (has content): prev/next are the adjacent
 *     frames in the sequence. Standard onion skin.
 *   - Current layer is EMPTY (not a frame): prev/next are determined by
 *     physical position — last frame with index < current, first frame with
 *     index > current. This is the key use case: drawing a new frame while
 *     seeing the surrounding frames as ghosts.
 *
 * Edge cases:
 *   - No frames at all → both null.
 *   - Empty layer before first frame → prev: null, next: first frame.
 *   - Empty layer after last frame  → prev: last frame, next: null.
 *   - Current layer is the only frame → prev/next both null.
 */
export function getOnionGhostZs(state: AppState): { prev: number | null; next: number | null } {
	const frames = getAnimationFrames(state);
	if (frames.length === 0) return { prev: null, next: null };

	const current = state.currentLayerIndex;
	const pos = frames.indexOf(current);

	if (pos !== -1) {
		// Current layer IS a frame: use sequence neighbors
		return {
			prev: pos > 0 ? frames[pos - 1] : null,
			next: pos < frames.length - 1 ? frames[pos + 1] : null,
		};
	}

	// Current layer is EMPTY: find neighbors by physical position.
	// frames is ascending (getAnimationFrames iterates i = 0..totalLayers-1).
	// Scan once: prev keeps updating to the last frame below current;
	// next breaks on the first frame above current.
	let prev: number | null = null;
	let next: number | null = null;
	for (const f of frames) {
		if (f < current) prev = f;
		else if (f > current) { next = f; break; }
	}
	return { prev, next };
}
