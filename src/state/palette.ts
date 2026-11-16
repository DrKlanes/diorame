// The palette of the document: flat or gradient per layer (or for all layers at once), the gradient's angle,
// intensity and type, the ink set (primary / alternative: the shapes are remapped by index), and the chosen colour.
// Mode and ink set follow the hybrid undo contract (CLAUDE.md): with shapes to repaint, one undo step; without, a
// stamp on the current snapshot. A gradient drag is one step, on release. Out of StrataContext.tsx (v3.26.28,
// refactor phase 3B), moved as it was.
import { BASE_DEPTH_STEP } from '../constants/layers';
import { GRADIENT_DEFAULTS, FIXED_PALETTE, ALTERNATIVE_PALETTE } from '../constants/palette';
import { playSound } from '../utils/soundManager';
import { pushHistory, createSnapshot, patchCurrentSnapshot } from './history';
import type { AppState, LayerGradParams } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function setPaletteMode(state: AppState, action: Extract<Action, { type: 'SET_PALETTE_MODE' }>): AppState {
	playSound('click');
	if (state.paletteApplyToAllActive) {
		const allModes: Record<number, 'flat' | 'grad'> = {};
		for (let i = 0; i < state.totalLayers; i++) allModes[i] = action.payload;
		const nextState = { ...state, paletteMode: action.payload, layerRenderModes: allModes, isDirty: true };
		// No shapes anywhere → pure selection: no undo step, last-writer-wins.
		if (state.shapes.length === 0) {
			return { ...nextState, history: patchCurrentSnapshot(state.history, state.historyIndex, { layerRenderModes: allModes }) };
		}
		const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(nextState));
		return { ...nextState, history, historyIndex: index };
	}
	const nextLayerRenderModes = { ...state.layerRenderModes, [state.currentLayerIndex]: action.payload };
	const nextState = { ...state, paletteMode: action.payload, layerRenderModes: nextLayerRenderModes, isDirty: true };
	// Current layer has no shapes to re-render → pure selection: no undo step, last-writer-wins.
	const hasLayerShapes = state.shapes.some(s => s.zIndex === state.currentLayerIndex * -BASE_DEPTH_STEP);
	if (!hasLayerShapes) {
		return { ...nextState, history: patchCurrentSnapshot(state.history, state.historyIndex, { layerRenderModes: nextLayerRenderModes }) };
	}
	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(nextState));
	return { ...nextState, history, historyIndex: index };
}

// The three gradient setters mutate layerGradParams live and stay OUT of the
// history: they are the drag preview, same role as SET_BRUSH_THICKNESS_PREVIEW.
// The undo step (or the last-writer-wins patch) lands on release, in
// COMMIT_PALETTE_GRADIENT — see the hybrid contract in CLAUDE.md.
export function setPaletteGradientAngle(state: AppState, action: Extract<Action, { type: 'SET_PALETTE_GRADIENT_ANGLE' }>): AppState {
	const currentParams = state.layerGradParams[state.currentLayerIndex] || GRADIENT_DEFAULTS;
	if (state.paletteApplyToAllActive) {
		const allParams: Record<number, LayerGradParams> = {};
		for (let i = 0; i < state.totalLayers; i++) {
			allParams[i] = { ...(state.layerGradParams[i] || GRADIENT_DEFAULTS), angle: action.payload };
		}
		return { ...state, layerGradParams: allParams, gradParamsPendingCommit: true };
	}
	return {
		...state,
		gradParamsPendingCommit: true,
		layerGradParams: { ...state.layerGradParams, [state.currentLayerIndex]: { ...currentParams, angle: action.payload } }
	};
}

export function setPaletteGradientIntensity(state: AppState, action: Extract<Action, { type: 'SET_PALETTE_GRADIENT_INTENSITY' }>): AppState {
	const currentParams = state.layerGradParams[state.currentLayerIndex] || GRADIENT_DEFAULTS;
	if (state.paletteApplyToAllActive) {
		const allParams: Record<number, LayerGradParams> = {};
		for (let i = 0; i < state.totalLayers; i++) {
			allParams[i] = { ...(state.layerGradParams[i] || GRADIENT_DEFAULTS), intensity: action.payload };
		}
		return { ...state, layerGradParams: allParams, gradParamsPendingCommit: true };
	}
	return {
		...state,
		gradParamsPendingCommit: true,
		layerGradParams: { ...state.layerGradParams, [state.currentLayerIndex]: { ...currentParams, intensity: action.payload } }
	};
}

export function setPaletteGradientType(state: AppState, action: Extract<Action, { type: 'SET_PALETTE_GRADIENT_TYPE' }>): AppState {
	const currentParams = state.layerGradParams[state.currentLayerIndex] || GRADIENT_DEFAULTS;
	let nextParams: Record<number, LayerGradParams>;
	if (state.paletteApplyToAllActive) {
		nextParams = {};
		for (let i = 0; i < state.totalLayers; i++) {
			nextParams[i] = { ...(state.layerGradParams[i] || GRADIENT_DEFAULTS), gradType: action.payload };
		}
	} else {
		nextParams = { ...state.layerGradParams, [state.currentLayerIndex]: { ...currentParams, gradType: action.payload } };
	}
	// TYPE only ever arrives right behind SET_PALETTE_MODE (PaletteHeader fires
	// both for one tap), and MODE already applied the contract for that gesture.
	// Patching completes its post-change pair instead of opening a second undo
	// step for what the user felt as a single action.
	return {
		...state,
		layerGradParams: nextParams,
		history: patchCurrentSnapshot(state.history, state.historyIndex, { layerGradParams: nextParams })
	};
}

export function commitPaletteGradient(state: AppState): AppState {
	// Release with nothing dragged (a tap on the track that landed on the same
	// value) → neither a step nor a patch.
	if (!state.gradParamsPendingCommit) return state;
	const hasShapes = state.paletteApplyToAllActive
		? state.shapes.length > 0
		: state.shapes.some(s => s.zIndex === state.currentLayerIndex * -BASE_DEPTH_STEP);
	if (hasShapes) {
		// Material: the gradient repaints existing ink, so the whole drag folds
		// into ONE undo step whose snapshot already holds the post-drag params.
		const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(state));
		return { ...state, gradParamsPendingCommit: false, history, historyIndex: index, isDirty: true };
	}
	// Nothing to repaint → pure selection: last-writer-wins onto the current
	// snapshot so no later undo resurrects the old gradient.
	return {
		...state,
		gradParamsPendingCommit: false,
		history: patchCurrentSnapshot(state.history, state.historyIndex, { layerGradParams: state.layerGradParams }),
		isDirty: true,
	};
}

export function setActivePalette(state: AppState, action: Extract<Action, { type: 'SET_ACTIVE_PALETTE' }>): AppState {
	playSound('click');
	const newId = action.payload;
	if (newId === state.activePaletteId) return state;

	const newPalette = newId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE;
	const oldPalette = state.palette;

	// Map shapes to new palette colors based on index
	let anyRemapped = false;
	const newShapes = state.shapes.map(shape => {
		// Find index in OLD palette
		const idx = oldPalette.indexOf(shape.color);

		// If color exists in old palette and we have a corresponding color in new palette
		if (idx !== -1 && idx < newPalette.length && newPalette[idx] !== shape.color) {
			anyRemapped = true;
			return { ...shape, color: newPalette[idx] };
		}
		return shape;
	});

	// No shape colors remapped → pure selection: no undo step, last-writer-wins
	// onto the current snapshot so a later undo never reverts this choice.
	if (!anyRemapped) {
		return {
			...state,
			activePaletteId: newId,
			palette: newPalette,
			history: patchCurrentSnapshot(state.history, state.historyIndex, { activePaletteId: newId }),
			isDirty: true,
		};
	}

	// Material remap → undo step; snapshot the POST-change pair (shapes + palette id).
	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes, activePaletteId: newId }));

	return {
		...state,
		activePaletteId: newId,
		palette: newPalette,
		shapes: newShapes,
		history,
		historyIndex: index,
		isDirty: true,
	};
}

export function togglePaletteApplyToAll(state: AppState): AppState {
	playSound('click');
	if (!state.paletteApplyToAllActive) {
		const activeMode = state.layerRenderModes[state.currentLayerIndex] ?? 'flat';
		const activeParams = state.layerGradParams[state.currentLayerIndex] ?? GRADIENT_DEFAULTS;
		const allModes: Record<number, 'flat' | 'grad'> = {};
		const allParams: Record<number, LayerGradParams> = {};
		for (let i = 0; i < state.totalLayers; i++) {
			allModes[i] = activeMode;
			allParams[i] = { ...activeParams };
		}
		return {
			...state,
			paletteApplyToAllActive: true,
			paletteApplyToAllSnapshot: {
				layerRenderModes: { ...state.layerRenderModes },
				layerGradParams: { ...state.layerGradParams },
			},
			layerRenderModes: allModes,
			layerGradParams: allParams,
			isDirty: true,
		};
	} else {
		const snap = state.paletteApplyToAllSnapshot!;
		const restoredModes = {
			...snap.layerRenderModes,
			[state.currentLayerIndex]: state.layerRenderModes[state.currentLayerIndex],
		};
		const restoredParams = {
			...snap.layerGradParams,
			[state.currentLayerIndex]: state.layerGradParams[state.currentLayerIndex],
		};
		return {
			...state,
			paletteApplyToAllActive: false,
			paletteApplyToAllSnapshot: null,
			layerRenderModes: restoredModes,
			layerGradParams: restoredParams,
			paletteMode: state.layerRenderModes[state.currentLayerIndex] ?? 'flat',
			isDirty: true,
		};
	}
}

export function setColorIndex(state: AppState, action: Extract<Action, { type: 'SET_COLOR_INDEX' }>): AppState {
	return { ...state, currentColorIndex: action.payload };
}
