// Changing the order of the layers: swapping two (REORDER_LAYERS), moving one to a position with the ones in between
// shifting (MOVE_LAYER_TO), and duplicating one into a new layer right above it (DUPLICATE_LAYER). The shapes and every
// per-layer record (hidden, locked, render mode, gradient, brush pair, focus layer) are remapped together, one undo
// step each. Out of StrataContext.tsx (v3.26.27, refactor phase 3B), moved as it was.
import { BASE_DEPTH_STEP, MAX_LAYERS } from '../constants/layers';
import { GRADIENT_DEFAULTS } from '../constants/palette';
import { shiftFocusLayer } from '../utils/remapViewLayers';
import { pushHistory, createSnapshot } from './history';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function reorderLayers(state: AppState, action: Extract<Action, { type: 'REORDER_LAYERS' }>): AppState {
	const { fromIndex, toIndex } = action.payload;
	if (fromIndex === toIndex) return state;

	// We need to swap the z-indices of shapes in these layers
	const fromZ = fromIndex * -BASE_DEPTH_STEP;
	const toZ = toIndex * -BASE_DEPTH_STEP;

	const newShapes = state.shapes.map(shape => {
		if (shape.zIndex === fromZ) return { ...shape, zIndex: toZ };
		if (shape.zIndex === toZ) return { ...shape, zIndex: fromZ };
		return shape;
	});

	// Swap hidden/locked states if needed (not actually needed as these track INDICES, but content moved)
	// Wait, if I move Layer 1 content to Layer 2 position:
	// The content at Index 1 goes to Index 2.
	// The "Hidden" state at Index 1 should probably stay at Index 1 (the slot)?
	// Or move with content? Standard UI behavior: Move with content.

	const newHidden = state.hiddenLayers.map(i => {
		if (i === fromIndex) return toIndex;
		if (i === toIndex) return fromIndex;
		return i;
	});

	const newLocked = state.locked3DLayers.map(i => {
		if (i === fromIndex) return toIndex;
		if (i === toIndex) return fromIndex;
		return i;
	});

	const newRenderModes = { ...state.layerRenderModes };
	const modeFrom = newRenderModes[fromIndex];
	const modeTo = newRenderModes[toIndex];
	newRenderModes[fromIndex] = modeTo;
	newRenderModes[toIndex] = modeFrom;

	const newGradParams = { ...state.layerGradParams };
	const paramFrom = newGradParams[fromIndex];
	const paramTo = newGradParams[toIndex];
	newGradParams[fromIndex] = paramTo;
	newGradParams[toIndex] = paramFrom;

	const newBrushSettings = { ...state.layerBrushSettings };
	const brushFrom = newBrushSettings[fromIndex];
	const brushTo = newBrushSettings[toIndex];
	newBrushSettings[fromIndex] = brushTo;
	newBrushSettings[toIndex] = brushFrom;

	// If current layer was moved, update currentLayerIndex
	let newCurrent = state.currentLayerIndex;
	if (state.currentLayerIndex === fromIndex) newCurrent = toIndex;
	else if (state.currentLayerIndex === toIndex) newCurrent = fromIndex;

	// No need to sync global settings as they stick with the logical layer index if it moved?
	// Actually if I move the CURRENT layer, newCurrent changes to follow it.
	// So I'm still on the same "content" layer.
	// And brushSettings moved with it.
	// So currentLineThickness (global) is still valid for the content.

	const newState = {
		...state,
		shapes: newShapes,
		currentLayerIndex: newCurrent,
		camera: { ...state.camera, z: newCurrent * -BASE_DEPTH_STEP, rotation: 0 },
		hiddenLayers: newHidden,
		locked3DLayers: newLocked,
		layerRenderModes: newRenderModes,
		layerGradParams: newGradParams,
		layerBrushSettings: newBrushSettings
	};

	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(newState));

	return {
		...newState,
		history,
		historyIndex: index,
		isDirty: true,
	};
}

export function moveLayerTo(state: AppState, action: Extract<Action, { type: 'MOVE_LAYER_TO' }>): AppState {
	const { fromIndex, toIndex } = action.payload;

	// Guards
	if (fromIndex === toIndex) return state;
	if (fromIndex < 0 || fromIndex >= state.totalLayers) return state;
	if (toIndex < 0 || toIndex >= state.totalLayers) return state;

	// Helper: given an old layer index, return its new index after the move.
	// Case A (from < to): items in (from, to] shift down by 1; fromIndex jumps to toIndex.
	// Case B (from > to): items in [to, from) shift up by 1; fromIndex jumps to toIndex.
	const remap = (oldIdx: number): number => {
		if (oldIdx === fromIndex) return toIndex;
		if (fromIndex < toIndex) {
			if (oldIdx > fromIndex && oldIdx <= toIndex) return oldIdx - 1;
		} else {
			if (oldIdx >= toIndex && oldIdx < fromIndex) return oldIdx + 1;
		}
		return oldIdx;
	};

	// 1. Reindex shapes via zIndex
	const newShapes = state.shapes.map(shape => {
		const oldLayerIdx = Math.round(shape.zIndex / -BASE_DEPTH_STEP);
		const newLayerIdx = remap(oldLayerIdx);
		if (newLayerIdx === oldLayerIdx) return shape;
		return { ...shape, zIndex: newLayerIdx * -BASE_DEPTH_STEP };
	});

	// 2. Reindex index arrays
	const newHidden = state.hiddenLayers.map(remap);
	const newLocked = state.locked3DLayers.map(remap);

	// 3. Reindex Records (Record<number, T>)
	const remapRecord = <T,>(record: Record<number, T>): Record<number, T> => {
		const result: Record<number, T> = {};
		for (let i = 0; i < state.totalLayers; i++) {
			if (record[i] !== undefined) {
				result[remap(i)] = record[i];
			}
		}
		return result;
	};

	const newRenderModes = remapRecord(state.layerRenderModes);
	const newGradParams = remapRecord(state.layerGradParams);
	const newBrushSettings = remapRecord(state.layerBrushSettings);

	// 4. Reindex currentLayerIndex (active layer follows its content)
	const newCurrent = remap(state.currentLayerIndex);

	// 5. Reindex focusTargetLayer (cinematic focus follows its target layer when not -1/manual)
	const oldFocusTarget = state.postProcessing.focusTargetLayer;
	const newFocusTarget = (typeof oldFocusTarget === 'number' && oldFocusTarget >= 0)
		? remap(oldFocusTarget)
		: oldFocusTarget;

	const newState = {
		...state,
		shapes: newShapes,
		hiddenLayers: newHidden,
		locked3DLayers: newLocked,
		layerRenderModes: newRenderModes,
		layerGradParams: newGradParams,
		layerBrushSettings: newBrushSettings,
		currentLayerIndex: newCurrent,
		camera: {
			...state.camera,
			z: newCurrent * -BASE_DEPTH_STEP,
			rotation: 0
		},
		postProcessing: {
			...state.postProcessing,
			focusTargetLayer: newFocusTarget
		}
	};

	const { history, index } = pushHistory(
		state.history,
		state.historyIndex,
		createSnapshot(newState)
	);

	return {
		...newState,
		history,
		historyIndex: index,
		isDirty: true,
	};
}

export function duplicateLayer(state: AppState, action: Extract<Action, { type: 'DUPLICATE_LAYER' }>): AppState {
	const layerIndex = action.payload;
	if (state.totalLayers >= MAX_LAYERS) return state;

	const sourceZ = layerIndex * -BASE_DEPTH_STEP;
	const newLayerIndex = layerIndex + 1;
	const newZ = newLayerIndex * -BASE_DEPTH_STEP;

	// Shift existing layers down
	const newShapes = state.shapes.map(s => {
		if (s.zIndex <= newZ) {
			return { ...s, zIndex: s.zIndex - BASE_DEPTH_STEP };
		}
		return s;
	});

	// Clone shapes from source layer
	const sourceShapes = state.shapes.filter(s => s.zIndex === sourceZ);
	// The copy is new content: it is created now (t = duplication time, v3.25.16).
	const duplicatedAt = Date.now();
	const clonedShapes = sourceShapes.map(s => ({
		...s,
		id: Date.now() + Math.random().toString(),
		zIndex: newZ,
		t: duplicatedAt,
	}));

	// Update hidden/locked - Shift indices
	const newHidden = state.hiddenLayers.map(i => i >= newLayerIndex ? i + 1 : i);
	const newLocked = state.locked3DLayers.map(i => i >= newLayerIndex ? i + 1 : i);

	// Update props
	const newRenderModes = { ...state.layerRenderModes };
	const newGradParams = { ...state.layerGradParams };
	const newBrushSettings = { ...state.layerBrushSettings };

	// Shift props
	for (let i = state.totalLayers - 1; i >= newLayerIndex; i--) {
		newRenderModes[i+1] = newRenderModes[i];
		newGradParams[i+1] = newGradParams[i];
		newBrushSettings[i+1] = newBrushSettings[i];
	}

	// Copy props to new layer
	newRenderModes[newLayerIndex] = newRenderModes[layerIndex];
	newGradParams[newLayerIndex] = newGradParams[layerIndex];
	newBrushSettings[newLayerIndex] = newBrushSettings[layerIndex] ? { ...newBrushSettings[layerIndex] } : { thickness: state.currentBrushThickness, mode: state.brushMode };

	// Sync global
	const nextBrush = newBrushSettings[newLayerIndex];

	// Update paletteApplyToAllSnapshot if active
	let newApplySnapshot = state.paletteApplyToAllSnapshot;
	if (state.paletteApplyToAllActive && state.paletteApplyToAllSnapshot) {
		const snapModes = { ...state.paletteApplyToAllSnapshot.layerRenderModes };
		const snapParams = { ...state.paletteApplyToAllSnapshot.layerGradParams };
		for (let i = state.totalLayers - 1; i >= newLayerIndex; i--) {
			snapModes[i+1] = snapModes[i];
			snapParams[i+1] = snapParams[i];
		}
		snapModes[newLayerIndex] = snapModes[layerIndex];
		snapParams[newLayerIndex] = snapParams[layerIndex] ? { ...snapParams[layerIndex] } : { ...GRADIENT_DEFAULTS };
		newApplySnapshot = { layerRenderModes: snapModes, layerGradParams: snapParams };
	}

	const newState = {
		...state,
		shapes: [...newShapes, ...clonedShapes],
		totalLayers: state.totalLayers + 1,
		currentLayerIndex: newLayerIndex,
		camera: { ...state.camera, z: newLayerIndex * -BASE_DEPTH_STEP, rotation: 0 },
		postProcessing: { ...state.postProcessing, focusTargetLayer: shiftFocusLayer(state.postProcessing.focusTargetLayer, newLayerIndex, 1) },
		hiddenLayers: newHidden,
		locked3DLayers: newLocked,
		layerRenderModes: newRenderModes,
		layerGradParams: newGradParams,
		layerBrushSettings: newBrushSettings,
		paletteApplyToAllSnapshot: newApplySnapshot,
		paletteMode: newRenderModes[newLayerIndex] || 'flat',
		currentBrushThickness: nextBrush.thickness,
		brushMode: nextBrush.mode
	};

	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(newState));

	return {
		...newState,
		history,
		historyIndex: index,
		isDirty: true,
	};
}
