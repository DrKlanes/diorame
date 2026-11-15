// The undo history of the document: its snapshots (hybrid contract: CLAUDE.md «Undo híbrido»), their cap
// of MAX_HISTORY_STEPS, and the two actions that travel through them. Out of StrataContext.tsx (v3.26.15,
// refactor phase 3A), moved as it was. Every action that pushes a step or stamps the current snapshot
// goes through the three helpers here.
import { BASE_DEPTH_STEP, MAX_HISTORY_STEPS } from '../constants/layers';
import { FIXED_PALETTE, ALTERNATIVE_PALETTE } from '../constants/palette';
import { restoreLayerBrushSettings } from '../utils/layerBrush';
import { remapLayerIndices, remapFocusLayer } from '../utils/remapViewLayers';
import type { AppState, HistorySnapshot } from '../types/strataTypes';

export function pushHistory(
	history: HistorySnapshot[],
	index: number,
	snapshot: HistorySnapshot
): { history: HistorySnapshot[], index: number } {
	let newHistory = history.slice(0, index + 1);
	newHistory.push(snapshot);

	// Cap history size
	if (newHistory.length > MAX_HISTORY_STEPS) {
		newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_STEPS);
	}

	return {
		history: newHistory,
		index: newHistory.length - 1
	};
}

// Helper to create a snapshot from current state (hybrid contract — see HistorySnapshot).
// CALLERS BEWARE: pass POST-change state. An action that restyles/remaps shapes must
// include its new layerBrushSettings/activePaletteId in the state it snapshots, or the
// snapshot lies (that stale-pair bug caused the original undo complaints — v3.11.1 era).
export function createSnapshot(state: AppState): HistorySnapshot {
	return {
		shapes: state.shapes,
		totalLayers: state.totalLayers,
		layerRenderModes: state.layerRenderModes,
		layerGradParams: state.layerGradParams,
		// Materialize the active layer's EFFECTIVE brush pair if the map has no
		// entry yet: layers only get an entry on their first explicit change, and
		// a snapshot with an empty slot forces undo to fall back to live values —
		// which are the post-change ones, so the selector would never travel back.
		layerBrushSettings: state.layerBrushSettings[state.currentLayerIndex]
			? state.layerBrushSettings
			: {
				...state.layerBrushSettings,
				[state.currentLayerIndex]: { thickness: state.currentBrushThickness, mode: state.brushMode }
			},
		activePaletteId: state.activePaletteId
	};
}

// Last-writer-wins for pure selections (no shapes changed → no undo step): stamp the
// new selector value onto the CURRENT snapshot so undoing back to "now" never
// resurrects the old selection.
export function patchCurrentSnapshot(
	history: HistorySnapshot[],
	index: number,
	patch: Partial<Pick<HistorySnapshot, 'layerBrushSettings' | 'activePaletteId' | 'layerRenderModes' | 'layerGradParams'>>
): HistorySnapshot[] {
	const newHistory = history.slice();
	newHistory[index] = { ...newHistory[index], ...patch };
	return newHistory;
}

export function undo(state: AppState): AppState {
	if (state.historyIndex <= 0) return state;
	const newIndex = state.historyIndex - 1;
	const snapshot = state.history[newIndex];

	// Preserve current layer UNLESS totalLayers changed (layer creation/deletion)
	// If totalLayers changed, clamp currentLayerIndex to valid range
	const layerIndexToUse = snapshot.totalLayers !== state.totalLayers
		? Math.min(state.currentLayerIndex, snapshot.totalLayers - 1)
		: state.currentLayerIndex;

	const currentLayerZ = layerIndexToUse * -BASE_DEPTH_STEP;
	const hasShapesInCurrentLayer = snapshot.shapes.some(s => s.zIndex === currentLayerZ);
	// Hybrid restore: document-property selectors (brush settings, palette) come
	// from the snapshot so canvas and selector never desync — snapshots are
	// consistent (post-change pairs) and pure selections last-writer-win onto the
	// current snapshot, so undoing a plain stroke never moves a selector. Pure
	// view state (hiddenLayers, locked3DLayers) is not in the snapshot at all.
	// Brush pairs: only the layers whose strokes this step restyled move (v3.26.3).
	const layerBrushSettings = restoreLayerBrushSettings(state, snapshot);
	const restoredBrush = layerBrushSettings[layerIndexToUse]
		|| { thickness: state.currentBrushThickness, mode: state.brushMode };

	return {
		...state,
		shapes: snapshot.shapes,
		totalLayers: snapshot.totalLayers,
		currentLayerIndex: layerIndexToUse,
		camera: { ...state.camera, z: layerIndexToUse * -BASE_DEPTH_STEP, rotation: 0 },
		layerRenderModes: snapshot.layerRenderModes,
		paletteMode: snapshot.layerRenderModes[layerIndexToUse] || 'flat',
		layerGradParams: snapshot.layerGradParams,
		layerBrushSettings,
		activePaletteId: snapshot.activePaletteId,
		palette: snapshot.activePaletteId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE,
		currentBrushThickness: restoredBrush.thickness,
		brushMode: restoredBrush.mode,
		hiddenLayers: remapLayerIndices(state.hiddenLayers, state.shapes, snapshot.shapes, snapshot.totalLayers),
		locked3DLayers: remapLayerIndices(state.locked3DLayers, state.shapes, snapshot.shapes, snapshot.totalLayers),
		postProcessing: { ...state.postProcessing, focusTargetLayer: remapFocusLayer(state.postProcessing.focusTargetLayer, state.shapes, snapshot.shapes, snapshot.totalLayers) },
		historyIndex: newIndex,
		isDrawInside: hasShapesInCurrentLayer ? state.isDrawInside : false,
		isDrawBehind: hasShapesInCurrentLayer ? state.isDrawBehind : false,
		isDirty: true,
	};
}

export function redo(state: AppState): AppState {
	if (state.historyIndex >= state.history.length - 1) return state;
	const newIndex = state.historyIndex + 1;
	const snapshot = state.history[newIndex];

	// Preserve current layer UNLESS totalLayers changed (layer creation/deletion)
	// If totalLayers changed, clamp currentLayerIndex to valid range
	const layerIndexToUse = snapshot.totalLayers !== state.totalLayers
		? Math.min(state.currentLayerIndex, snapshot.totalLayers - 1)
		: state.currentLayerIndex;

	const currentLayerZ = layerIndexToUse * -BASE_DEPTH_STEP;
	const hasShapesInCurrentLayer = snapshot.shapes.some(s => s.zIndex === currentLayerZ);
	// Hybrid restore: document-property selectors (brush settings, palette) come
	// from the snapshot so canvas and selector never desync — snapshots are
	// consistent (post-change pairs) and pure selections last-writer-win onto the
	// current snapshot, so redoing a plain stroke never moves a selector. Pure
	// view state (hiddenLayers, locked3DLayers) is not in the snapshot at all.
	// Brush pairs: only the layers whose strokes this step restyled move (v3.26.3).
	const layerBrushSettings = restoreLayerBrushSettings(state, snapshot);
	const restoredBrush = layerBrushSettings[layerIndexToUse]
		|| { thickness: state.currentBrushThickness, mode: state.brushMode };

	return {
		...state,
		shapes: snapshot.shapes,
		totalLayers: snapshot.totalLayers,
		currentLayerIndex: layerIndexToUse,
		camera: { ...state.camera, z: layerIndexToUse * -BASE_DEPTH_STEP, rotation: 0 },
		layerRenderModes: snapshot.layerRenderModes,
		paletteMode: snapshot.layerRenderModes[layerIndexToUse] || 'flat',
		layerGradParams: snapshot.layerGradParams,
		layerBrushSettings,
		activePaletteId: snapshot.activePaletteId,
		palette: snapshot.activePaletteId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE,
		currentBrushThickness: restoredBrush.thickness,
		brushMode: restoredBrush.mode,
		hiddenLayers: remapLayerIndices(state.hiddenLayers, state.shapes, snapshot.shapes, snapshot.totalLayers),
		locked3DLayers: remapLayerIndices(state.locked3DLayers, state.shapes, snapshot.shapes, snapshot.totalLayers),
		postProcessing: { ...state.postProcessing, focusTargetLayer: remapFocusLayer(state.postProcessing.focusTargetLayer, state.shapes, snapshot.shapes, snapshot.totalLayers) },
		historyIndex: newIndex,
		isDrawInside: hasShapesInCurrentLayer ? state.isDrawInside : false,
		isDrawBehind: hasShapesInCurrentLayer ? state.isDrawBehind : false,
		isDirty: true,
	};
}
