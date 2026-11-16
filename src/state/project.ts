// The project as a document: saved or not (MARK_CLEAN, PROJECT_SAVED), its name, a duplicate (new identity, the old
// one kept as its origin), and a new blank canvas (CLEAR_CANVAS: new identity, every setting back to its default,
// history reset). Opening a file is loadProject.ts. Out of StrataContext.tsx (v3.26.37, refactor phase 3B), moved as
// it was.
import { initialState } from '../constants/initialState';
import { createProjectMeta } from '../utils/projectMeta';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function markClean(state: AppState): AppState {
	return { ...state, isDirty: false };
}

export function projectSaved(state: AppState, action: Extract<Action, { type: 'PROJECT_SAVED' }>): AppState {
	return { ...state, projectMeta: action.payload, isDirty: false };
}

export function setProjectName(state: AppState, action: Extract<Action, { type: 'SET_PROJECT_NAME' }>): AppState {
	return { ...state, projectName: action.payload, isDirty: state.isDirty || action.payload !== state.projectName };
}

// A new drawing that starts as a copy of this one: new identity, the old one kept as its origin.
export function duplicateProject(state: AppState, action: Extract<Action, { type: 'DUPLICATE_PROJECT' }>): AppState {
	return { ...state, projectName: action.payload.projectName, projectMeta: createProjectMeta(state.projectMeta.projectId), isDirty: true };
}

export function clearCanvas(state: AppState): AppState {
	return {
		...state,
		// A new canvas is a new drawing.
		projectMeta: createProjectMeta(),
		cinemaViewInitialized: false,
		shapes: [],
		history: [{
			shapes: [],
			totalLayers: 1,
			layerRenderModes: {},
			layerGradParams: {},
			layerBrushSettings: {},
			activePaletteId: state.activePaletteId
		}],
		historyIndex: 0,
		currentLayerIndex: 0,
		totalLayers: 1,
		camera: { x: 0, y: 0, z: 0, rotation: 0 },
		exportRequest: null,
		isExporting: false,
		hiddenLayers: [],
		locked3DLayers: [],
		isLayerSelected: true,
		drawingZoom: 1,
		drawingPan: { x: 0, y: 0 },
		layerRenderModes: {},
		layerGradParams: {},
		layerBrushSettings: {},
		paletteMode: 'flat',
		focalLength: initialState.focalLength,
		viewZoomOffset: initialState.viewZoomOffset,
		layerSpacingFactor: initialState.layerSpacingFactor,
		cinematicSpeed: initialState.cinematicSpeed,
		isHandheldEnabled: initialState.isHandheldEnabled,
		handheldIntensity: initialState.handheldIntensity,
		cinematicType: initialState.cinematicType,
		postProcessing: initialState.postProcessing,
		postProcessingEnabled: initialState.postProcessingEnabled,
		fxMasterEnabled: initialState.fxMasterEnabled,
		postProcessingSnapshot: null,
		paletteApplyToAllActive: false,
		paletteApplyToAllSnapshot: null,
		format: null,
		isDirty: false,
	}
}
