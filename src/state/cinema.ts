// The camera and the CINEMA view: the mode (DRAW / CINEMA), the camera itself, the preset and its speed, focal length,
// zoom offset, layer spacing, handheld and its intensity, and the point of interest. The view settings the project
// saves dirty it (the setters, only when the value changes); the mode and the camera are not saved and do not, and the
// first CINEMA view of a new project (INIT_CINEMA_VIEW) is app defaults and never dirties. Out of StrataContext.tsx
// (v3.26.33, refactor phase 3B), moved as it was.
import { playSound } from '../utils/soundManager';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function setMode(state: AppState, action: Extract<Action, { type: 'SET_MODE' }>): AppState {
	playSound('modeSwitch');
	return { ...state, mode: action.payload };
}

export function updateCamera(state: AppState, action: Extract<Action, { type: 'UPDATE_CAMERA' }>): AppState {
	return { ...state, camera: { ...state.camera, ...action.payload } };
}

export function setCinematicType(state: AppState, action: Extract<Action, { type: 'SET_CINEMATIC_TYPE' }>): AppState {
	playSound('click');
	return { ...state, cinematicType: action.payload, isDirty: state.isDirty || action.payload !== state.cinematicType };
}

export function setCinematicSpeed(state: AppState, action: Extract<Action, { type: 'SET_CINEMATIC_SPEED' }>): AppState {
	return { ...state, cinematicSpeed: action.payload, isDirty: state.isDirty || action.payload !== state.cinematicSpeed };
}

export function setFocalLength(state: AppState, action: Extract<Action, { type: 'SET_FOCAL_LENGTH' }>): AppState {
	return { ...state, focalLength: action.payload, isDirty: state.isDirty || action.payload !== state.focalLength };
}

export function setViewZoomOffset(state: AppState, action: Extract<Action, { type: 'SET_VIEW_ZOOM_OFFSET' }>): AppState {
	return { ...state, viewZoomOffset: action.payload, isDirty: state.isDirty || action.payload !== state.viewZoomOffset };
}

// First CINEMA view of a session (ControlsV2): app defaults, not a user change — never dirty.
export function initCinemaView(state: AppState, action: Extract<Action, { type: 'INIT_CINEMA_VIEW' }>): AppState {
	// Only a new project reaches here with nothing of its own: an opened project is already `cinemaViewInitialized`
	// (LOAD_PROJECT filled its gaps), so its saved view stands.
	if (state.cinemaViewInitialized) return state;
	return {
		...state,
		cinemaViewInitialized: true,
		focalLength: action.payload.focalLength,
		viewZoomOffset: action.payload.viewZoomOffset,
		layerSpacingFactor: action.payload.layerSpacingFactor,
		cinematicType: action.payload.cinematicType,
	};
}

export function setLayerSpacingFactor(state: AppState, action: Extract<Action, { type: 'SET_LAYER_SPACING_FACTOR' }>): AppState {
	return { ...state, layerSpacingFactor: action.payload, isDirty: state.isDirty || action.payload !== state.layerSpacingFactor };
}

export function toggleHandheld(state: AppState): AppState {
	playSound('click');
	return { ...state, isHandheldEnabled: !state.isHandheldEnabled, isDirty: true };
}

export function setHandheldIntensity(state: AppState, action: Extract<Action, { type: 'SET_HANDHELD_INTENSITY' }>): AppState {
	return { ...state, handheldIntensity: action.payload, isDirty: state.isDirty || action.payload !== state.handheldIntensity };
}

export function setPointOfInterest(state: AppState, action: Extract<Action, { type: 'SET_POINT_OF_INTEREST' }>): AppState {
	return { ...state, pointOfInterest: action.payload, isDirty: true };
}

export function clearPointOfInterest(state: AppState): AppState {
	playSound('click');
	return { ...state, pointOfInterest: null, isDirty: state.isDirty || state.pointOfInterest !== null };
}
