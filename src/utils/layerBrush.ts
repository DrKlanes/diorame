import type { BrushMode, HistorySnapshot, Shape } from '../types/strataTypes';
import { BASE_DEPTH_STEP } from '../constants/layers';
import { BRUSH_THICKNESS_MIN, BRUSH_THICKNESS_MAX } from '../constants/brush';
import { inkSeedFor } from './strokeGenerators';

export type LayerBrush = { thickness: number; mode: BrushMode };

const isRegenerable = (s: Shape) => !!s.originalPoints && s.originalPoints.length > 0;

/**
 * An Ink stroke with the seed of its noise on it (v3.26.22). Called when a stroke is added and before
 * anything moves its coordinates: an older stroke without a seed gets the one its outline was drawn
 * with (a hash of its spine as it is now), so re-styling it after a move, flip or resize no longer
 * deals it a new pattern. Not an Ink stroke, or already seeded: returned as it is.
 */
export const withInkSeed = (s: Shape): Shape =>
	(s.brushMode === 'ink' && s.inkSeed === undefined && isRegenerable(s) ? { ...s, inkSeed: inkSeedFor(s.originalPoints!) } : s);

/**
 * A layer's brush is a document property its regenerable strokes already carry: a thickness
 * or mode change restyles every one of them. So the strokes are the truth, and a map entry
 * only stands while it agrees with one of them (or the layer has none). Undefined = an empty
 * layer nobody has set yet. Never fall back to the live currentBrushThickness for a layer
 * with strokes: that is how one layer's value leaked into another (v3.26.3).
 */
export function resolveLayerBrush(shapes: readonly Shape[], layerIndex: number, entry: LayerBrush | undefined): LayerBrush | undefined {
	const z = layerIndex * -BASE_DEPTH_STEP;
	let last: Shape | undefined;
	for (const s of shapes) {
		if (s.zIndex !== z || !isRegenerable(s) || s.brushThickness === undefined) continue;
		if (entry && s.brushThickness === entry.thickness && (s.brushMode ?? entry.mode) === entry.mode) return entry;
		last = s;
	}
	if (!last) return entry;
	return { thickness: last.brushThickness as number, mode: last.brushMode ?? entry?.mode ?? 'tapered' };
}

/**
 * UNDO/REDO: a layer's brush only moves when the step being crossed restyled that layer's
 * strokes. The live entry is kept while it agrees with the target's strokes; the snapshot's
 * entry is only the base when the layers themselves changed (count or shape membership).
 * When the live entry agrees with none of the target's strokes, the snapshot's own entry is asked
 * before settling for the last stroke's (v3.26.23): on a layer of several thicknesses, undoing a
 * unification has to bring back the pair that was in force, not whichever stroke comes last.
 */
export function restoreLayerBrushSettings(
	current: { shapes: readonly Shape[]; totalLayers: number; layerBrushSettings: Record<number, LayerBrush> },
	target: HistorySnapshot
): Record<number, LayerBrush> {
	const sameLayers = current.totalLayers === target.totalLayers && sameLayerMembership(current.shapes, target.shapes);
	const out: Record<number, LayerBrush> = {};
	for (let i = 0; i < target.totalLayers; i++) {
		const saved = target.layerBrushSettings[i];
		const base = (sameLayers && current.layerBrushSettings[i]) || saved;
		let brush = resolveLayerBrush(target.shapes, i, base);
		if (brush !== base && saved && saved !== base) brush = resolveLayerBrush(target.shapes, i, saved);
		if (brush) out[i] = brush;
	}
	return out;
}

function sameLayerMembership(a: readonly Shape[], b: readonly Shape[]): boolean {
	const zById = new Map<string, number>();
	for (const s of a) if (s.id) zById.set(s.id, s.zIndex);
	for (const s of b) {
		if (!s.id) continue;
		const z = zById.get(s.id);
		if (z !== undefined && z !== s.zIndex) return false;
	}
	return true;
}

/**
 * A thickness as the panel shows it (D4, v3.26.23): it is stored exact and rounded here, to whole
 * numbers — the slider moves in whole steps, and a merge's 1.5 % per plane (30 → 30.45) would
 * otherwise read as a second thickness. Under 1 it keeps one decimal, so that it never reads 0.
 */
export const shownThickness = (thickness: number): number =>
	(thickness < 1 ? Math.max(0.1, Math.round(thickness * 10) / 10) : Math.round(thickness));

/**
 * The thicknesses of a layer's regenerable brush strokes, as shown (v3.26.23). `mixed`: the layer holds
 * more than one — after a merge, or strokes drawn at different sizes — and the panel says «Mixto» in
 * place of a number until the slider unifies them. null = a layer with no such strokes.
 */
export function layerThicknessRange(shapes: readonly Shape[], layerIndex: number): { min: number; max: number; mixed: boolean } | null {
	const z = layerIndex * -BASE_DEPTH_STEP;
	let min = Infinity, max = -Infinity;
	for (const s of shapes) {
		if (s.zIndex !== z || !isRegenerable(s) || s.brushThickness === undefined) continue;
		const shown = shownThickness(s.brushThickness);
		if (shown < min) min = shown;
		if (shown > max) max = shown;
	}
	return max === -Infinity ? null : { min, max, mixed: min !== max };
}

/**
 * How far a proportional scale of a layer can go (v3.26.25): k in steps of 0.1, so that no stroke ends
 * thinner than the slider's minimum or thicker than its maximum. Measured on the stored thicknesses, not
 * the shown ones. A layer that is already past a limit (a file loaded with strokes over 70) cannot be
 * pushed further that way, but can still go the other: the bound never crosses 1.
 */
export function layerScaleBounds(shapes: readonly Shape[], layerIndex: number): { kMin: number; kMax: number } {
	const z = layerIndex * -BASE_DEPTH_STEP;
	let min = Infinity, max = -Infinity;
	for (const s of shapes) {
		if (s.zIndex !== z || !isRegenerable(s) || s.brushThickness === undefined) continue;
		if (s.brushThickness < min) min = s.brushThickness;
		if (s.brushThickness > max) max = s.brushThickness;
	}
	if (max === -Infinity) return { kMin: 1, kMax: 1 };
	return {
		kMin: Math.min(1, Math.ceil(BRUSH_THICKNESS_MIN / min * 10 - 1e-9) / 10),
		kMax: Math.max(1, Math.floor(BRUSH_THICKNESS_MAX / max * 10 + 1e-9) / 10),
	};
}
