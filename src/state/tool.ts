// The drawing tool and its switches: the tool itself (Move arrives with the layer selected and the drawing switches
// off), symmetry, draw behind / draw inside (exclusive, never with the eraser), organic mode and blob smoothing
// (exclusive), and whether a stroke is in progress. No undo step, and choosing a tool does not dirty (CLAUDE.md, the
// decided exception). Out of StrataContext.tsx (v3.26.35, refactor phase 3B), moved as it was.
import { playSound } from '../utils/soundManager';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function setTool(state: AppState, action: Extract<Action, { type: 'SET_TOOL' }>): AppState {
	playSound('click');
	if (action.payload === 'move') {
		return {
			...state,
			tool: 'move',
			// Reaching for Move means wanting to transform the layer, so it arrives
			// selected. The toolbar dispatches SET_TOOL unconditionally (no "already
			// on this tool" guard in DrawingToolbar), so re-tapping Move while
			// already in Move runs this again — that is the cheapest way back from a
			// deselected state, with no extra UI.
			isLayerSelected: true,
			isDrawBehind: false,
			isDrawInside: false,
			isSymmetryEnabled: false,
			isOrganicMode: false
		};
	}
	return {
		...state,
		tool: action.payload,
		isDrawBehind: action.payload === 'eraser' ? false : state.isDrawBehind,
		isDrawInside: action.payload === 'eraser' ? false : state.isDrawInside,
		isOrganicMode: action.payload === 'brush' ? false : state.isOrganicMode
	};
}

export function setDrawingActive(state: AppState, action: Extract<Action, { type: 'SET_DRAWING_ACTIVE' }>): AppState {
	return { ...state, isDrawing: action.payload };
}

export function toggleSymmetry(state: AppState): AppState {
	return { ...state, isSymmetryEnabled: !state.isSymmetryEnabled };
}

export function toggleDrawBehind(state: AppState): AppState {
	if (state.tool === 'eraser') return state;
	const willBeBehind = !state.isDrawBehind;
	return {
		...state,
		isDrawBehind: willBeBehind,
		isDrawInside: willBeBehind ? false : state.isDrawInside
	};
}

export function toggleDrawInside(state: AppState): AppState {
	if (state.tool === 'eraser') return state;
	const willBeInside = !state.isDrawInside;
	return {
		...state,
		isDrawInside: willBeInside,
		isDrawBehind: willBeInside ? false : state.isDrawBehind
	};
}

export function toggleOrganicMode(state: AppState): AppState {
	return {
		...state,
		isOrganicMode: !state.isOrganicMode,
		blobSmoothing: state.isOrganicMode ? state.blobSmoothing : false
	};
}

export function toggleBlobSmoothing(state: AppState): AppState {
	return {
		...state,
		blobSmoothing: !state.blobSmoothing,
		isOrganicMode: state.blobSmoothing ? state.isOrganicMode : false
	};
}
