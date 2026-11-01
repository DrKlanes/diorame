import type { Shape } from '../types/strataTypes';

// Mirror of StrataContext.BASE_DEPTH_STEP — kept local to avoid circular import (see mergeLayers.ts)
const BASE_DEPTH_STEP = 150;

const layerOf = (shape: Shape) => Math.round(Math.abs(shape.zIndex) / BASE_DEPTH_STEP);

/**
 * Hidden / pinned layers are view state, stored as positions and never in a history snapshot, so
 * UNDO/REDO restore the shapes but leave the positions where they were. This follows the CONTENT:
 * each index goes to the layer(s) of `targetShapes` that now hold the shapes it held in
 * `currentShapes` (all of them: undoing a merge of a hidden layer leaves both origins hidden).
 * An index whose content is not in the target (empty layer, or shapes that do not exist there, such
 * as a duplicate's clones) is kept while it is still a layer, dropped otherwise. Known limit: a
 * hidden layer deleted and then restored by undo comes back visible, because nothing recorded it.
 * When the structure did not change every layer maps to itself, so the result equals the input.
 */
export const remapLayerIndices = (
	indices: readonly number[],
	currentShapes: readonly Shape[],
	targetShapes: readonly Shape[],
	targetTotalLayers: number,
): number[] => {
	if (indices.length === 0) return [];
	const where = new Map<string, number>();
	for (const s of targetShapes) where.set(s.id, layerOf(s));
	const out = new Set<number>();
	for (const i of indices) {
		let found = false;
		for (const s of currentShapes) {
			if (layerOf(s) !== i) continue;
			const to = where.get(s.id);
			if (to !== undefined) { out.add(to); found = true; }
		}
		if (!found && i < targetTotalLayers) out.add(i);
	}
	return [...out].sort((a, b) => a - b);
};

/** The pinned depth-of-field layer follows its content; -1 (free focus) stays -1, a vanished one frees the focus. */
export const remapFocusLayer = (
	focus: number,
	currentShapes: readonly Shape[],
	targetShapes: readonly Shape[],
	targetTotalLayers: number,
): number => (focus < 0 ? focus : remapLayerIndices([focus], currentShapes, targetShapes, targetTotalLayers)[0] ?? -1);

/** A layer inserted at `at` (delta 1) or removed at `at` (delta -1): the pinned DoF layer shifts with the ones above; one removed with its layer frees the focus. */
export const shiftFocusLayer = (focus: number, at: number, delta: 1 | -1): number => {
	if (focus < 0) return focus;
	if (delta === 1) return focus >= at ? focus + 1 : focus;
	return focus === at ? -1 : focus > at ? focus - 1 : focus;
};
