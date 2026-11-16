import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, BrushMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
} from '../../types/strataTypes';
import { createProjectMeta } from '../../utils/projectMeta';
import { withInkSeed } from '../../utils/layerBrush';

export type {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, BrushMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
};

// --- Constants ---
import { BASE_DEPTH_STEP, MAX_LAYERS, MAX_HISTORY_STEPS } from '../../constants/layers';
export { BASE_DEPTH_STEP, MAX_LAYERS, MAX_HISTORY_STEPS }; // Moved to constants/layers.ts
export { APP_VERSION } from '../../constants/version'; // Moved to constants/version.ts

import { PALETTE_PRIMARY, PALETTE_ALTERNATIVE, GRADIENT_DEFAULTS, FIXED_PALETTE, ALTERNATIVE_PALETTE } from '../../constants/palette';
export type { PaletteColor } from '../../constants/palette';
export { PALETTE_PRIMARY, PALETTE_ALTERNATIVE, GRADIENT_DEFAULTS };

export { FIXED_PALETTE, ALTERNATIVE_PALETTE }; // Moved to constants/palette.ts

import {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
} from '../../utils/strokeGenerators';

import {
	setSoundsEnabled as setSoundsManagerEnabled,
	persistSoundsPreference,
	playSound,
} from '../../utils/soundManager';

import { mergeLayerDown } from '../../utils/mergeLayers';
import { fitViewToRect, frameInView } from '../../utils/formatFrame';

export {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
};

// --- Actions ---

import type { Action } from '../../types/strataActions'; // Moved to types/strataActions.ts

// --- Initial State ---

import { initialState } from '../../constants/initialState';
export { initialState }; // Moved to constants/initialState.ts

import { pushHistory, createSnapshot, undo, redo } from '../../state/history'; // Moved to state/history.ts
import { loadProject } from '../../state/loadProject';
import { setBrushThickness, setBrushThicknessPreview, commitBrushThickness, setBrushMode, scaleLayerThicknessPreview, setBrushScaleProportional } from '../../state/brush';
import { moveLayer, transformLayer, flipLayer } from '../../state/layerTransform';
import { nextLayer, prevLayer, addLayer, setLayerSelected, setCurrentLayer, deleteCurrentLayer, toggleLayerVisibility, toggle3dLock } from '../../state/layerNav';
import { reorderLayers, moveLayerTo, duplicateLayer } from '../../state/layerReorder';
import { setPaletteMode, setPaletteGradientAngle, setPaletteGradientIntensity, setPaletteGradientType, commitPaletteGradient, setActivePalette, togglePaletteApplyToAll, setColorIndex } from '../../state/palette';
import { setFxIntensity, setParticleType, toggleFx, setSuperRiso, setSuperRisoStyle, toggleFxMaster } from '../../state/fx';
import { toggleAnimationMode, setAnimationPlaying, setAnimationFramerate, setAnimationExportLoops, setGifExportScale, toggleOnionSkin, toggleAnimationFlatZ, advanceAnimationFrame, stepAnimationFrame, toggleAnimationPlaybackMode } from '../../state/animation';
import { startTextSession, updateTextSession, commitTextSession, cancelTextSession } from '../../state/textSession';

// --- Reducer ---

// Exported for tools/text-check (runs the real TRANSFORM_LAYER / FLIP_LAYER / LOAD_PROJECT outside React).
export function appReducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'TOGGLE_WELCOME_MODAL':
			return { ...state, isWelcomeModalOpen: !state.isWelcomeModalOpen };
		case 'MARK_CLEAN':
			return { ...state, isDirty: false };
		case 'PROJECT_SAVED':
			return { ...state, projectMeta: action.payload, isDirty: false };
		// A new drawing that starts as a copy of this one: new identity, the old one kept as its origin.
		case 'DUPLICATE_PROJECT':
			return { ...state, projectName: action.payload.projectName, projectMeta: createProjectMeta(state.projectMeta.projectId), isDirty: true };
		case 'SET_SOUNDS_ENABLED':
			setSoundsManagerEnabled(action.payload);
			persistSoundsPreference(action.payload);
			return { ...state, soundsEnabled: action.payload };
		case 'TOGGLE_UI':
			playSound('click');
			return { ...state, isUIHidden: !state.isUIHidden };
		case 'SET_DRAWING_ACTIVE':
			return { ...state, isDrawing: action.payload };
		case 'TOGGLE_SYMMETRY':
			return { ...state, isSymmetryEnabled: !state.isSymmetryEnabled };
		case 'TOGGLE_GRID': {
			const newValue = !state.gridEnabled;
			try { window.localStorage.setItem('diorame-grid-enabled', String(newValue)); } catch (_) { /* private mode */ }
			return { ...state, gridEnabled: newValue };
		}
		case 'TOGGLE_DRAW_BEHIND':
			if (state.tool === 'eraser') return state;
			const willBeBehind = !state.isDrawBehind;
			return {
				...state,
				isDrawBehind: willBeBehind,
				isDrawInside: willBeBehind ? false : state.isDrawInside
			};
		case 'TOGGLE_DRAW_INSIDE':
			if (state.tool === 'eraser') return state;
			const willBeInside = !state.isDrawInside;
			return {
				...state,
				isDrawInside: willBeInside,
				isDrawBehind: willBeInside ? false : state.isDrawBehind
			};
		case 'TOGGLE_ORGANIC_MODE':
			return {
				...state,
				isOrganicMode: !state.isOrganicMode,
				blobSmoothing: state.isOrganicMode ? state.blobSmoothing : false
			};
		case 'TOGGLE_BLOB_SMOOTHING':
			return {
				...state,
				blobSmoothing: !state.blobSmoothing,
				isOrganicMode: state.blobSmoothing ? state.isOrganicMode : false
			};
		case 'SET_PALETTE_MODE': return setPaletteMode(state, action); // Moved to state/palette.ts
		case 'SET_PALETTE_GRADIENT_ANGLE': return setPaletteGradientAngle(state, action); // Moved to state/palette.ts
		case 'SET_PALETTE_GRADIENT_INTENSITY': return setPaletteGradientIntensity(state, action); // Moved to state/palette.ts
		case 'SET_PALETTE_GRADIENT_TYPE': return setPaletteGradientType(state, action); // Moved to state/palette.ts
		case 'COMMIT_PALETTE_GRADIENT': return commitPaletteGradient(state); // Moved to state/palette.ts
		case 'RESET_DRAWING_VIEW': {
			// With a format frame (v3.25.5), "Centrar vista" fits it as seen from the active layer (frameInView, v3.25.28);
			// without one, zoom 1 at the origin as always.
			const { w, h } = state.viewportSize;
			if (state.format && w > 0 && h > 0) {
				const fit = fitViewToRect(frameInView(state.format, state.camera.z, state.isAnimationMode), w, h);
				return { ...state, drawingZoom: fit.zoom, drawingPan: fit.pan };
			}
			return { ...state, drawingZoom: 1, drawingPan: { x: 0, y: 0 } };
		}
		case 'SET_FORMAT':
			// View state, outside undo; a user choice that is saved, so it dirties the project.
			return { ...state, format: action.payload, isDirty: true };
		case 'SET_VIEWPORT_SIZE':
			if (state.viewportSize.w === action.payload.w && state.viewportSize.h === action.payload.h) return state;
			return { ...state, viewportSize: action.payload };
		case 'ADD_SHAPE': {
			if (state.tool === 'blob' || state.tool === 'brush') playSound('brushStroke');
			// Creation time stamped here, not in the pointer handler (v3.25.16): the timelapse's clock.
			// An Ink stroke gets the seed of its noise here too (v3.26.22): the one its outline was just drawn with.
			const newShapes = [...state.shapes, withInkSeed({ ...action.payload, t: Date.now() })];
			const snapshot = createSnapshot({ ...state, shapes: newShapes });
			const { history, index } = pushHistory(state.history, state.historyIndex, snapshot);

			return {
				...state,
				shapes: newShapes,
				// The layer's brush pair, materialized in the state too (not only in the snapshot): a
				// later patchCurrentSnapshot copies this map over the snapshot and must not drop it.
				layerBrushSettings: snapshot.layerBrushSettings,
				history,
				historyIndex: index,
				isDirty: true,
			};
		}
		case 'ADD_SHAPES': {
			if (state.tool === 'blob' || state.tool === 'brush') playSound('brushStroke');
			const t = Date.now();
			const newShapes = [...state.shapes, ...action.payload.map(s => withInkSeed({ ...s, t }))];
			const snapshot = createSnapshot({ ...state, shapes: newShapes });
			const { history, index } = pushHistory(state.history, state.historyIndex, snapshot);

			return {
				...state,
				shapes: newShapes,
				layerBrushSettings: snapshot.layerBrushSettings,
				history,
				historyIndex: index,
				isDirty: true,
			};
		}
		case 'UNDO': return undo(state); // Moved to state/history.ts
		case 'REDO': return redo(state); // Moved to state/history.ts
		case 'SET_MODE':
			playSound('modeSwitch');
			return { ...state, mode: action.payload };
		case 'SET_TOOL':
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
		case 'SET_CINEMATIC_TYPE':
			playSound('click');
			return { ...state, cinematicType: action.payload, isDirty: state.isDirty || action.payload !== state.cinematicType };
		case 'SET_COLOR_INDEX': return setColorIndex(state, action); // Moved to state/palette.ts
		case 'UPDATE_CAMERA':
			return { ...state, camera: { ...state.camera, ...action.payload } };
		case 'NEXT_LAYER': return nextLayer(state); // Moved to state/layerNav.ts
		case 'PREV_LAYER': return prevLayer(state); // Moved to state/layerNav.ts
		case 'ADD_LAYER': return addLayer(state); // Moved to state/layerNav.ts
		case 'SET_LAYER_SELECTED': return setLayerSelected(state, action); // Moved to state/layerNav.ts
		case 'SET_CURRENT_LAYER': return setCurrentLayer(state, action); // Moved to state/layerNav.ts
		case 'SET_FOCAL_LENGTH':
			return { ...state, focalLength: action.payload, isDirty: state.isDirty || action.payload !== state.focalLength };
		case 'SET_VIEW_ZOOM_OFFSET':
			return { ...state, viewZoomOffset: action.payload, isDirty: state.isDirty || action.payload !== state.viewZoomOffset };
		// First CINEMA view of a session (ControlsV2): app defaults, not a user change — never dirty.
		case 'INIT_CINEMA_VIEW':
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
		case 'SET_DRAWING_ZOOM':
			return {
				...state,
				drawingZoom: action.payload.zoom,
				drawingPan: action.payload.pan || state.drawingPan
			};
		case 'TOGGLE_DARK_MODE':
			playSound('click');
			return { ...state, isDarkMode: !state.isDarkMode, isDirty: true };
		case 'SET_FX_INTENSITY': return setFxIntensity(state, action); // Moved to state/fx.ts
		case 'SET_PARTICLE_TYPE': return setParticleType(state, action); // Moved to state/fx.ts
		case 'TOGGLE_FX': return toggleFx(state, action); // Moved to state/fx.ts
		case 'SET_SUPER_RISO': return setSuperRiso(state, action); // Moved to state/fx.ts
		case 'APPLY_SUPER_RISO_STYLE': return setSuperRisoStyle(state, action); // Moved to state/fx.ts
		case 'TOGGLE_FX_MASTER': return toggleFxMaster(state); // Moved to state/fx.ts
		case 'TOGGLE_PALETTE_APPLY_TO_ALL': return togglePaletteApplyToAll(state); // Moved to state/palette.ts
		case 'REQUEST_EXPORT':
			return { ...state, exportRequest: action.payload, isExporting: true };
		case 'FINISH_EXPORT':
			return { ...state, exportRequest: null, isExporting: false };
		case 'CLEAR_CANVAS':
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
		case 'LOAD_PROJECT': return loadProject(state, action); // Moved to state/loadProject.ts
		case 'COMPLETE_FIT_TO_VIEW':
			return { ...state, shouldFitToView: false };
		case 'TOGGLE_LAYER_VISIBILITY': return toggleLayerVisibility(state, action); // Moved to state/layerNav.ts
		case 'TOGGLE_3D_LOCK': return toggle3dLock(state, action); // Moved to state/layerNav.ts
		case 'MOVE_LAYER': return moveLayer(state, action); // Moved to state/layerTransform.ts
		case 'TRANSFORM_LAYER': return transformLayer(state, action); // Moved to state/layerTransform.ts
		case 'FLIP_LAYER': return flipLayer(state, action); // Moved to state/layerTransform.ts
		case 'DELETE_CURRENT_LAYER': return deleteCurrentLayer(state); // Moved to state/layerNav.ts
		case 'MERGE_LAYER_DOWN': return mergeLayerDown(state, next => pushHistory(state.history, state.historyIndex, createSnapshot(next)));
		case 'START_TEXT_SESSION': return startTextSession(state, action); // Moved to state/textSession.ts
		case 'UPDATE_TEXT_SESSION': return updateTextSession(state, action); // Moved to state/textSession.ts
		case 'COMMIT_TEXT_SESSION': return commitTextSession(state); // Moved to state/textSession.ts
		case 'CANCEL_TEXT_SESSION': return cancelTextSession(state); // Moved to state/textSession.ts
		case 'SET_POINT_OF_INTEREST':
			return { ...state, pointOfInterest: action.payload, isDirty: true };
		case 'CLEAR_POINT_OF_INTEREST':
			playSound('click');
			return { ...state, pointOfInterest: null, isDirty: state.isDirty || state.pointOfInterest !== null };
		case 'SET_CINEMATIC_SPEED':
			return { ...state, cinematicSpeed: action.payload, isDirty: state.isDirty || action.payload !== state.cinematicSpeed };
		case 'SET_BRUSH_THICKNESS': return setBrushThickness(state, action); // Moved to state/brush.ts
		case 'SET_BRUSH_THICKNESS_PREVIEW': return setBrushThicknessPreview(state, action); // Moved to state/brush.ts
		case 'COMMIT_BRUSH_THICKNESS': return commitBrushThickness(state); // Moved to state/brush.ts
		case 'SCALE_LAYER_THICKNESS_PREVIEW': return scaleLayerThicknessPreview(state, action);
		case 'SET_BRUSH_SCALE_PROPORTIONAL': return setBrushScaleProportional(state, action);
		case 'TOGGLE_HANDHELD':
			playSound('click');
			return { ...state, isHandheldEnabled: !state.isHandheldEnabled, isDirty: true };
		case 'SET_HANDHELD_INTENSITY':
			return { ...state, handheldIntensity: action.payload, isDirty: state.isDirty || action.payload !== state.handheldIntensity };
		case 'SET_BRUSH_MODE': return setBrushMode(state, action); // Moved to state/brush.ts
		case 'SET_LAYER_SPACING_FACTOR':
			return { ...state, layerSpacingFactor: action.payload, isDirty: state.isDirty || action.payload !== state.layerSpacingFactor };
		case 'SET_PROJECT_NAME':
			return { ...state, projectName: action.payload, isDirty: state.isDirty || action.payload !== state.projectName };
		case 'REORDER_LAYERS': return reorderLayers(state, action); // Moved to state/layerReorder.ts
		case 'MOVE_LAYER_TO': return moveLayerTo(state, action); // Moved to state/layerReorder.ts
		case 'DUPLICATE_LAYER': return duplicateLayer(state, action); // Moved to state/layerReorder.ts
		case 'DISMISS_ONBOARDING':
			return { ...state, isOnboardingVisible: false };
		case 'SET_ACTIVE_PALETTE': return setActivePalette(state, action); // Moved to state/palette.ts
		case 'TOGGLE_ANIMATION_MODE': return toggleAnimationMode(state); // Moved to state/animation.ts
		case 'SET_ANIMATION_PLAYING': return setAnimationPlaying(state, action); // Moved to state/animation.ts
		case 'SET_ANIMATION_FRAMERATE': return setAnimationFramerate(state, action); // Moved to state/animation.ts
		case 'SET_ANIMATION_EXPORT_LOOPS': return setAnimationExportLoops(state, action); // Moved to state/animation.ts
		case 'SET_GIF_EXPORT_SCALE': return setGifExportScale(state, action); // Moved to state/animation.ts
		case 'TOGGLE_ONION_SKIN': return toggleOnionSkin(state); // Moved to state/animation.ts
		case 'TOGGLE_ANIMATION_FLAT_Z': return toggleAnimationFlatZ(state); // Moved to state/animation.ts
		case 'ADVANCE_ANIMATION_FRAME': return advanceAnimationFrame(state); // Moved to state/animation.ts
		case 'STEP_ANIMATION_FRAME': return stepAnimationFrame(state, action); // Moved to state/animation.ts
		case 'TOGGLE_ANIMATION_PLAYBACK_MODE': return toggleAnimationPlaybackMode(state); // Moved to state/animation.ts
		default:
			return state;
	}
}

// --- Context & Provider ---

const StrataContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const StrataProvider: React.FC<{ children: ReactNode; initialStateOverride?: Partial<AppState> }> = ({ children, initialStateOverride }) => {
	const merged = initialStateOverride ? { ...initialState, ...initialStateOverride } : initialState;
	const [state, dispatch] = useReducer(appReducer, merged);

	return (
		<StrataContext.Provider value={{ state, dispatch }}>
			{children}
		</StrataContext.Provider>
	);
};

export const useStrata = () => {
	const context = useContext(StrataContext);
	if (!context) {
		throw new Error('useStrata must be used within a StrataProvider');
	}
	return context;
};