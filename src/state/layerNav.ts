// The layer stack: moving between layers ([ / ], the layer panel), adding one above the active layer, deleting the
// active one, and the layer panel's per-row switches (selected, hidden, 3D lock). Adding and deleting shift every
// per-layer record with the shapes and are one undo step; navigating and the switches are not. Out of
// StrataContext.tsx (v3.26.26, refactor phase 3B), moved as it was.
import { BASE_DEPTH_STEP, MAX_LAYERS } from '../constants/layers';
import { GRADIENT_DEFAULTS } from '../constants/palette';
import { resolveLayerBrush } from '../utils/layerBrush';
import { playSound } from '../utils/soundManager';
import { shiftFocusLayer } from '../utils/remapViewLayers';
import { pushHistory, createSnapshot } from './history';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function nextLayer(state: AppState): AppState {
	if (state.currentLayerIndex < state.totalLayers - 1) {
		// Just move to next existing layer
		const nextIndex = state.currentLayerIndex + 1;
		const newZ = nextIndex * -BASE_DEPTH_STEP;
		const hasShapesInNewLayer = state.shapes.some(s => s.zIndex === newZ);
		const nextBrush = resolveLayerBrush(state.shapes, nextIndex, state.layerBrushSettings[nextIndex]) || { thickness: state.currentBrushThickness, mode: state.brushMode };
		return {
			...state,
			currentLayerIndex: nextIndex,
			// Navigating to a layer ([ / ]) is wanting to work on it — same reading
			// as clicking its row in the panel.
			isLayerSelected: true,
			camera: { ...state.camera, z: newZ, rotation: 0 },
			isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
			isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
			paletteMode: state.layerRenderModes[nextIndex] || 'flat',
			currentBrushThickness: nextBrush.thickness,
			brushMode: nextBrush.mode
		};
	} else if (state.totalLayers < MAX_LAYERS) {
		// Create new layer (always empty) - Save to history
		const nextIndex = state.currentLayerIndex + 1;
		const newZ = nextIndex * -BASE_DEPTH_STEP;

		const propagatedMode = state.layerRenderModes[state.currentLayerIndex] ?? 'flat';
		const propagatedParams = state.layerGradParams[state.currentLayerIndex] ?? GRADIENT_DEFAULTS;
		const newPaletteMode = state.paletteApplyToAllActive ? propagatedMode : 'flat';
		const newGradP = state.paletteApplyToAllActive ? propagatedParams : GRADIENT_DEFAULTS;
		const newLayerRenderModes = state.paletteApplyToAllActive
			? { ...state.layerRenderModes, [nextIndex]: propagatedMode }
			: state.layerRenderModes;
		const newLayerGradParams = state.paletteApplyToAllActive
			? { ...state.layerGradParams, [nextIndex]: { ...propagatedParams } }
			: state.layerGradParams;
		const newApplySnapshot = state.paletteApplyToAllActive && state.paletteApplyToAllSnapshot
			? {
				layerRenderModes: { ...state.paletteApplyToAllSnapshot.layerRenderModes, [nextIndex]: 'flat' as const },
				layerGradParams: { ...state.paletteApplyToAllSnapshot.layerGradParams, [nextIndex]: { ...GRADIENT_DEFAULTS } },
			}
			: state.paletteApplyToAllSnapshot;

		const newState = {
			...state,
			currentLayerIndex: nextIndex,
			isLayerSelected: true,
			totalLayers: state.totalLayers + 1,
			camera: { ...state.camera, z: newZ, rotation: 0 },
			isDrawInside: false,
			isDrawBehind: false,
			paletteMode: newPaletteMode,
			layerRenderModes: newLayerRenderModes,
			layerGradParams: newLayerGradParams,
			paletteApplyToAllSnapshot: newApplySnapshot,
			paletteGradientAngle: newGradP.angle,
			paletteGradientIntensity: newGradP.intensity,
			paletteGradientType: newGradP.gradType || 'solid',
			currentBrushThickness: state.currentBrushThickness,
			brushMode: state.brushMode,
			// Like ADD_LAYER: the new layer owns the active layer's pair from the start (v3.26.22).
			layerBrushSettings: { ...state.layerBrushSettings, [nextIndex]: { thickness: state.currentBrushThickness, mode: state.brushMode } },
			isDirty: true,
		};

		const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(newState));

		return {
			...newState,
			history,
			historyIndex: index
		};
	}
	return state;
}

export function prevLayer(state: AppState): AppState {
	if (state.currentLayerIndex > 0) {
		const prevIndex = state.currentLayerIndex - 1;
		const newZ = prevIndex * -BASE_DEPTH_STEP;
		const hasShapesInNewLayer = state.shapes.some(s => s.zIndex === newZ);
		const prevBrush = resolveLayerBrush(state.shapes, prevIndex, state.layerBrushSettings[prevIndex]) || { thickness: state.currentBrushThickness, mode: state.brushMode };
		return {
			...state,
			currentLayerIndex: prevIndex,
			isLayerSelected: true,
			camera: { ...state.camera, z: newZ, rotation: 0 },
			isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
			isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
			paletteMode: state.layerRenderModes[prevIndex] || 'flat',
			currentBrushThickness: prevBrush.thickness,
			brushMode: prevBrush.mode
		};
	}
	return state;
}

export function addLayer(state: AppState): AppState {
	if (state.totalLayers >= MAX_LAYERS) return state;

	const newLayerIndex = state.currentLayerIndex + 1;
	const newZ = newLayerIndex * -BASE_DEPTH_STEP;

	// Shift shapes: layers at index >= newLayerIndex move one slot farther
	const newShapes = state.shapes.map(s =>
		s.zIndex <= newZ ? { ...s, zIndex: s.zIndex - BASE_DEPTH_STEP } : s
	);

	// Shift hidden/locked index arrays
	const newHidden = state.hiddenLayers.map(i => i >= newLayerIndex ? i + 1 : i);
	const newLocked = state.locked3DLayers.map(i => i >= newLayerIndex ? i + 1 : i);

	// Shift per-layer dicts
	const newRenderModes   = { ...state.layerRenderModes };
	const newGradParams    = { ...state.layerGradParams };
	const newBrushSettings = { ...state.layerBrushSettings };
	for (let i = state.totalLayers - 1; i >= newLayerIndex; i--) {
		newRenderModes[i + 1]   = newRenderModes[i];
		newGradParams[i + 1]    = newGradParams[i];
		newBrushSettings[i + 1] = newBrushSettings[i];
	}

	// New slot: propagate from current layer (paletteApplyToAllActive-aware)
	const propagatedMode   = state.layerRenderModes[state.currentLayerIndex] ?? 'flat';
	const propagatedParams = state.layerGradParams[state.currentLayerIndex] ?? GRADIENT_DEFAULTS;
	const newPaletteMode = state.paletteApplyToAllActive ? propagatedMode : 'flat';
	const newGradP       = state.paletteApplyToAllActive ? propagatedParams : GRADIENT_DEFAULTS;
	newRenderModes[newLayerIndex] = newPaletteMode;
	newGradParams[newLayerIndex]  = { ...newGradP };
	// The new layer starts with the active layer's pair (v3.26.22). Until then its slot kept, after the
	// shift above, the pair of the layer that used to be at this position.
	newBrushSettings[newLayerIndex] = { thickness: state.currentBrushThickness, mode: state.brushMode };

	// Shift paletteApplyToAllSnapshot (if active)
	let newApplySnapshot = state.paletteApplyToAllSnapshot;
	if (state.paletteApplyToAllActive && state.paletteApplyToAllSnapshot) {
		const snapModes  = { ...state.paletteApplyToAllSnapshot.layerRenderModes };
		const snapParams = { ...state.paletteApplyToAllSnapshot.layerGradParams };
		for (let i = state.totalLayers - 1; i >= newLayerIndex; i--) {
			snapModes[i + 1]  = snapModes[i];
			snapParams[i + 1] = snapParams[i];
		}
		snapModes[newLayerIndex]  = 'flat' as const;
		snapParams[newLayerIndex] = { ...GRADIENT_DEFAULTS };
		newApplySnapshot = { layerRenderModes: snapModes, layerGradParams: snapParams };
	}

	const newState = {
		...state,
		shapes: newShapes,
		totalLayers: state.totalLayers + 1,
		currentLayerIndex: newLayerIndex,
		camera: { ...state.camera, z: newZ, rotation: 0 },
		postProcessing: { ...state.postProcessing, focusTargetLayer: shiftFocusLayer(state.postProcessing.focusTargetLayer, newLayerIndex, 1) },
		hiddenLayers: newHidden,
		locked3DLayers: newLocked,
		layerRenderModes: newRenderModes,
		layerGradParams: newGradParams,
		layerBrushSettings: newBrushSettings,
		paletteApplyToAllSnapshot: newApplySnapshot,
		isDrawInside: false,
		isDrawBehind: false,
		paletteMode: newPaletteMode,
		paletteGradientAngle: newGradP.angle,
		paletteGradientIntensity: newGradP.intensity,
		paletteGradientType: newGradP.gradType || 'solid',
		currentBrushThickness: state.currentBrushThickness,
		brushMode: state.brushMode,
		isDirty: true,
	};

	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(newState));
	return { ...newState, history, historyIndex: index };
}

export function setLayerSelected(state: AppState, action: Extract<Action, { type: 'SET_LAYER_SELECTED' }>): AppState {
	// Pure view state: no pushHistory, no createSnapshot, no patchCurrentSnapshot.
	// Deselecting is not an edit to the document — the geometry was already baked
	// at the last pointerup — so it must not be undoable, exactly like hiddenLayers.
	if (state.isLayerSelected === action.payload) return state;
	return { ...state, isLayerSelected: action.payload };
}

export function setCurrentLayer(state: AppState, action: Extract<Action, { type: 'SET_CURRENT_LAYER' }>): AppState {
	const targetIndex = action.payload;
	if (targetIndex === state.currentLayerIndex) return state;
	if (targetIndex < 0 || targetIndex >= state.totalLayers) return state;
	playSound('click');
	const newZ = targetIndex * -BASE_DEPTH_STEP;
	const hasShapesInNewLayer = state.shapes.some(s => s.zIndex === newZ);
	const targetBrush = resolveLayerBrush(state.shapes, targetIndex, state.layerBrushSettings[targetIndex]) || { thickness: state.currentBrushThickness, mode: state.brushMode };
	return {
		...state,
		currentLayerIndex: targetIndex,
		// Clicking a row in the layer panel means "I want to work on this".
		isLayerSelected: true,
		camera: { ...state.camera, z: newZ, rotation: 0 },
		isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
		isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
		paletteMode: state.layerRenderModes[targetIndex] || 'flat',
		currentBrushThickness: targetBrush.thickness,
		brushMode: targetBrush.mode
	};
}

export function deleteCurrentLayer(state: AppState): AppState {
	if (state.totalLayers <= 1) return state;

	const layerToDelete = state.currentLayerIndex;
	const targetZ = layerToDelete * -BASE_DEPTH_STEP;

	// Remove shapes in this layer
	let newShapes = state.shapes.filter(s => s.zIndex !== targetZ);

	// Shift layers below up (if any) - Actually in Strata layers are fixed slots, but we might want to shift content?
	// Current implementation: Just delete content, then we decrease totalLayers and shift remaining layers content UP?
	// Let's look at standard behavior: usually deleting a layer shifts subsequent layers down or up.
	// Here we just remove the content and decrease count.

	// To maintain continuity, we should shift content from higher indices down to fill the gap.
	for (let i = layerToDelete + 1; i < state.totalLayers; i++) {
		const oldZ = i * -BASE_DEPTH_STEP;
		const newZ = (i - 1) * -BASE_DEPTH_STEP;

		newShapes = newShapes.map(s => {
			if (s.zIndex === oldZ) {
				return { ...s, zIndex: newZ };
			}
			return s;
		});
	}

	// Adjust locked/hidden arrays
	const newHidden = state.hiddenLayers
		.filter(i => i !== layerToDelete)
		.map(i => i > layerToDelete ? i - 1 : i);

	const newLocked = state.locked3DLayers
		.filter(i => i !== layerToDelete)
		.map(i => i > layerToDelete ? i - 1 : i);

	// Adjust properties
	const newRenderModes = { ...state.layerRenderModes };
	const newGradParams = { ...state.layerGradParams };
	const newBrushSettings = { ...state.layerBrushSettings };

	for (let i = layerToDelete; i < state.totalLayers - 1; i++) {
		newRenderModes[i] = newRenderModes[i+1];
		newGradParams[i] = newGradParams[i+1];
		newBrushSettings[i] = newBrushSettings[i+1];
	}
	delete newRenderModes[state.totalLayers - 1];
	delete newGradParams[state.totalLayers - 1];
	delete newBrushSettings[state.totalLayers - 1];

	// Determine new current layer
	const newCurrentLayer = Math.min(state.currentLayerIndex, state.totalLayers - 2);

	// Sync global settings with new current layer
	const nextBrush = newBrushSettings[newCurrentLayer] || { thickness: state.currentBrushThickness, mode: state.brushMode };

	// Snapshot the FINAL state (shapes reindexed AND totalLayers/maps updated) —
	// snapshotting {...state, shapes} here recorded the old layer count with the
	// new shapes, so redo/undo across a delete resurrected a phantom layer.
	const newState = {
		...state,
		shapes: newShapes,
		totalLayers: state.totalLayers - 1,
		currentLayerIndex: newCurrentLayer,
		camera: { ...state.camera, z: newCurrentLayer * -BASE_DEPTH_STEP, rotation: 0 },
		postProcessing: { ...state.postProcessing, focusTargetLayer: shiftFocusLayer(state.postProcessing.focusTargetLayer, layerToDelete, -1) },
		hiddenLayers: newHidden,
		locked3DLayers: newLocked,
		layerRenderModes: newRenderModes,
		layerGradParams: newGradParams,
		layerBrushSettings: newBrushSettings,
		paletteMode: newRenderModes[newCurrentLayer] || 'flat',
		currentBrushThickness: nextBrush.thickness,
		brushMode: nextBrush.mode,
		isDirty: true,
	};
	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(newState));
	return { ...newState, history, historyIndex: index };
}

export function toggleLayerVisibility(state: AppState, action: Extract<Action, { type: 'TOGGLE_LAYER_VISIBILITY' }>): AppState {
	playSound('click');
	const layerIndex = action.payload;
	const isHidden = state.hiddenLayers.includes(layerIndex);
	return {
		...state,
		hiddenLayers: isHidden
			? state.hiddenLayers.filter(i => i !== layerIndex)
			: [...state.hiddenLayers, layerIndex],
		isDirty: true,
	};
}

export function toggle3dLock(state: AppState, action: Extract<Action, { type: 'TOGGLE_3D_LOCK' }>): AppState {
	playSound('click');
	const layerIndex = action.payload;
	const isLocked = state.locked3DLayers.includes(layerIndex);
	return {
		...state,
		locked3DLayers: isLocked
			? state.locked3DLayers.filter(i => i !== layerIndex)
			: [...state.locked3DLayers, layerIndex],
		isDirty: true,
	};
}
