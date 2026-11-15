import type { BrushMode, HistorySnapshot, Shape } from '../types/strataTypes';

// Mirror of StrataContext.BASE_DEPTH_STEP — kept local to avoid circular import (see animationFrames.ts)
const BASE_DEPTH_STEP = 150;

export type LayerBrush = { thickness: number; mode: BrushMode };

const isRegenerable = (s: Shape) => !!s.originalPoints && s.originalPoints.length > 0;

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
 */
export function restoreLayerBrushSettings(
	current: { shapes: readonly Shape[]; totalLayers: number; layerBrushSettings: Record<number, LayerBrush> },
	target: HistorySnapshot
): Record<number, LayerBrush> {
	const sameLayers = current.totalLayers === target.totalLayers && sameLayerMembership(current.shapes, target.shapes);
	const out: Record<number, LayerBrush> = {};
	for (let i = 0; i < target.totalLayers; i++) {
		const base = (sameLayers && current.layerBrushSettings[i]) || target.layerBrushSettings[i];
		const brush = resolveLayerBrush(target.shapes, i, base);
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
