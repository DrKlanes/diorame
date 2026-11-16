// The DRAW view: zoom and pan, «Centrar vista» (fits the Formato frame if there is one), the Formato frame itself, the
// viewport size, the end of a fit-to-view, and the grid (a preference kept in localStorage, not in the project). Only
// the format is saved with the project and dirties it. Out of StrataContext.tsx (v3.26.34, refactor phase 3B), moved
// as it was.
import { fitViewToRect, frameInView } from '../utils/formatFrame';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function setDrawingZoom(state: AppState, action: Extract<Action, { type: 'SET_DRAWING_ZOOM' }>): AppState {
	return {
		...state,
		drawingZoom: action.payload.zoom,
		drawingPan: action.payload.pan || state.drawingPan
	};
}

export function resetDrawingView(state: AppState): AppState {
	// With a format frame (v3.25.5), "Centrar vista" fits it as seen from the active layer (frameInView, v3.25.28);
	// without one, zoom 1 at the origin as always.
	const { w, h } = state.viewportSize;
	if (state.format && w > 0 && h > 0) {
		const fit = fitViewToRect(frameInView(state.format, state.camera.z, state.isAnimationMode), w, h);
		return { ...state, drawingZoom: fit.zoom, drawingPan: fit.pan };
	}
	return { ...state, drawingZoom: 1, drawingPan: { x: 0, y: 0 } };
}

export function setFormat(state: AppState, action: Extract<Action, { type: 'SET_FORMAT' }>): AppState {
	// View state, outside undo; a user choice that is saved, so it dirties the project.
	return { ...state, format: action.payload, isDirty: true };
}

export function setViewportSize(state: AppState, action: Extract<Action, { type: 'SET_VIEWPORT_SIZE' }>): AppState {
	if (state.viewportSize.w === action.payload.w && state.viewportSize.h === action.payload.h) return state;
	return { ...state, viewportSize: action.payload };
}

export function completeFitToView(state: AppState): AppState {
	return { ...state, shouldFitToView: false };
}

export function toggleGrid(state: AppState): AppState {
	const newValue = !state.gridEnabled;
	try { window.localStorage.setItem('diorame-grid-enabled', String(newValue)); } catch (_) { /* private mode */ }
	return { ...state, gridEnabled: newValue };
}
