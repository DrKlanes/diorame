import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, BrushMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
} from '../../types/strataTypes';
import { createProjectMeta } from '../../utils/projectMeta';
import { resolveLayerBrush } from '../../utils/layerBrush';

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
import { applySuperRisoStyle, patchSuperRiso } from '../../constants/superRiso';
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

import { getAnimationFrames } from '../../utils/animationFrames';
import { mergeLayerDown } from '../../utils/mergeLayers';
import { fitViewToRect, frameInView } from '../../utils/formatFrame';
import { shiftFocusLayer } from '../../utils/remapViewLayers';

export {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
};

// --- Actions ---

import type { Action } from '../../types/strataActions'; // Moved to types/strataActions.ts

// --- Initial State ---

import { initialState } from '../../constants/initialState';
export { initialState }; // Moved to constants/initialState.ts

import { pushHistory, createSnapshot, patchCurrentSnapshot, undo, redo } from '../../state/history'; // Moved to state/history.ts
import { loadProject } from '../../state/loadProject';
import { setBrushThickness, setBrushThicknessPreview, commitBrushThickness, setBrushMode } from '../../state/brush';
import { moveLayer, transformLayer, flipLayer } from '../../state/layerTransform';

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
		case 'SET_PALETTE_MODE': {
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
		case 'SET_PALETTE_GRADIENT_ANGLE': {
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
		case 'SET_PALETTE_GRADIENT_INTENSITY': {
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
		case 'SET_PALETTE_GRADIENT_TYPE': {
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
		case 'COMMIT_PALETTE_GRADIENT': {
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
			const newShapes = [...state.shapes, { ...action.payload, t: Date.now() }];
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
			const newShapes = [...state.shapes, ...action.payload.map(s => ({ ...s, t }))];
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
		case 'SET_COLOR_INDEX':
			return { ...state, currentColorIndex: action.payload };
		case 'UPDATE_CAMERA':
			return { ...state, camera: { ...state.camera, ...action.payload } };
		case 'NEXT_LAYER': {
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
		case 'PREV_LAYER': {
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
		case 'ADD_LAYER': {
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
			// newBrushSettings[newLayerIndex] not set — new empty layer uses current brush as fallback

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
		case 'SET_LAYER_SELECTED':
			// Pure view state: no pushHistory, no createSnapshot, no patchCurrentSnapshot.
			// Deselecting is not an edit to the document — the geometry was already baked
			// at the last pointerup — so it must not be undoable, exactly like hiddenLayers.
			if (state.isLayerSelected === action.payload) return state;
			return { ...state, isLayerSelected: action.payload };
		case 'SET_CURRENT_LAYER': {
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
		case 'SET_FX_INTENSITY':
			return {
				...state,
				isDirty: true,
				postProcessing: {
					...state.postProcessing,
					[action.payload.fx]: action.payload.value
				}
			};
		case 'SET_PARTICLE_TYPE':
			return {
				...state,
				isDirty: true,
				postProcessing: {
					...state.postProcessing,
					particleType: action.payload
				}
			};
		case 'TOGGLE_FX': {
			playSound('click');
			const turningOn = !state.postProcessingEnabled[action.payload];
			return {
				...state,
				isDirty: true,
				postProcessingEnabled: {
					...state.postProcessingEnabled,
					[action.payload]: turningOn,
					// Super Riso and Riso exclude each other: switching one on switches the other off.
					...(turningOn && action.payload === 'superRiso' ? { riso: false } : {}),
					...(turningOn && action.payload === 'riso' ? { superRiso: false } : {}),
				},
				postProcessingSnapshot: null,
				fxMasterEnabled: true,
			};
		}
		case 'SET_SUPER_RISO':
			return {
				...state,
				isDirty: true,
				postProcessing: { ...state.postProcessing, superRiso: patchSuperRiso(state.postProcessing.superRiso, action.payload) },
			};
		case 'APPLY_SUPER_RISO_STYLE':
			return {
				...state,
				isDirty: true,
				postProcessing: { ...state.postProcessing, superRiso: applySuperRisoStyle(state.postProcessing.superRiso, action.payload) },
			};
		case 'TOGGLE_FX_MASTER': {
			playSound('click');
			const px = state.postProcessingEnabled;
			const hasActiveEffects = Object.values(px).some(v => v);
			if (hasActiveEffects && state.postProcessingSnapshot === null) {
				const allOff = Object.fromEntries(
					Object.keys(px).map(k => [k, false])
				) as PostProcessingEnabled;
				return {
					...state,
					isDirty: true,
					postProcessingSnapshot: { ...px } as PostProcessingEnabled,
					postProcessingEnabled: allOff,
					fxMasterEnabled: false,
				};
			} else if (state.postProcessingSnapshot !== null) {
				return {
					...state,
					isDirty: true,
					postProcessingEnabled: state.postProcessingSnapshot,
					postProcessingSnapshot: null,
					fxMasterEnabled: Object.values(state.postProcessingSnapshot).some(v => v),
				};
			} else {
				return state;
			}
		}
		case 'TOGGLE_PALETTE_APPLY_TO_ALL': {
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
		case 'TOGGLE_LAYER_VISIBILITY': {
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
		case 'TOGGLE_3D_LOCK': {
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
		case 'MOVE_LAYER': return moveLayer(state, action); // Moved to state/layerTransform.ts
		case 'TRANSFORM_LAYER': return transformLayer(state, action); // Moved to state/layerTransform.ts
		case 'FLIP_LAYER': return flipLayer(state, action); // Moved to state/layerTransform.ts
		case 'DELETE_CURRENT_LAYER': {
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
		case 'MERGE_LAYER_DOWN': return mergeLayerDown(state, next => pushHistory(state.history, state.historyIndex, createSnapshot(next)));
		case 'START_TEXT_SESSION':
			return {
				...state,
				textSession: {
					isActive: true,
					x: action.payload.x,
					y: action.payload.y,
					content: '',
					font: 'noir',
					align: 'left'
				}
			};
		case 'UPDATE_TEXT_SESSION':
			return {
				...state,
				textSession: {
					...state.textSession,
					...action.payload
				}
			};
		case 'COMMIT_TEXT_SESSION':
			if (!state.textSession.isActive || !state.textSession.content.trim()) {
				return { ...state, textSession: { ...state.textSession, isActive: false } };
			}

			const textShape: Shape = {
				id: Date.now().toString(),
				type: 'text',
				points: [{ x: state.textSession.x, y: state.textSession.y }],
				color: state.palette[state.currentColorIndex],
				zIndex: state.currentLayerIndex * -BASE_DEPTH_STEP,
				text: state.textSession.content,
				font: state.textSession.font,
				align: state.textSession.align,
				fontSize: 40, // Base font size
				rotation: 0,
				isDrawInside: false,
				isDrawBehind: false,
				t: Date.now(),
			};

			const shapesWithText = [...state.shapes, textShape];
			const { history: textHistory, index: textIndex } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: shapesWithText }));

			return {
				...state,
				shapes: shapesWithText,
				history: textHistory,
				historyIndex: textIndex,
				textSession: { ...state.textSession, isActive: false, content: '' },
				isDirty: true,
			};
		case 'CANCEL_TEXT_SESSION':
			return {
				...state,
				textSession: { ...state.textSession, isActive: false, content: '' }
			};
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
		case 'REORDER_LAYERS': {
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
		case 'MOVE_LAYER_TO': {
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
		case 'DUPLICATE_LAYER': {
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
			const nextGradP = newGradParams[newLayerIndex] || GRADIENT_DEFAULTS;

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
				paletteGradientAngle: nextGradP.angle,
				paletteGradientIntensity: nextGradP.intensity,
				paletteGradientType: nextGradP.gradType || 'solid',
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
		case 'DISMISS_ONBOARDING':
			return { ...state, isOnboardingVisible: false };
		case 'SET_ACTIVE_PALETTE': {
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
		case 'TOGGLE_ANIMATION_MODE': {
			const entering = !state.isAnimationMode;
			if (entering) {
				return {
					...state,
					isAnimationMode: true,
					layerIndexBeforeAnimation: state.currentLayerIndex,
				};
			} else {
				const restored = state.layerIndexBeforeAnimation;
				const safeIndex = (restored != null && restored >= 0 && restored < state.totalLayers)
					? restored
					: state.currentLayerIndex;
				return {
					...state,
					isAnimationMode: false,
					isAnimationPlaying: false,
					currentLayerIndex: safeIndex,
					layerIndexBeforeAnimation: null,
				};
			}
		}
		case 'SET_ANIMATION_PLAYING':
			return { ...state, isAnimationPlaying: action.payload };
		case 'SET_ANIMATION_FRAMERATE':
			return { ...state, animationFramerate: action.payload };
		case 'SET_ANIMATION_EXPORT_LOOPS':
			return { ...state, animationExportLoops: action.payload };
		case 'SET_GIF_EXPORT_SCALE':
			return { ...state, gifExportScale: action.payload };
		case 'TOGGLE_ONION_SKIN':
			return { ...state, isOnionSkinEnabled: !state.isOnionSkinEnabled };
		case 'TOGGLE_ANIMATION_FLAT_Z':
			return { ...state, isAnimationFlatZ: !state.isAnimationFlatZ };
		case 'ADVANCE_ANIMATION_FRAME': {
			const frames = getAnimationFrames(state);
			if (frames.length === 0) return state;
			const currentPos = frames.indexOf(state.currentLayerIndex);
			if (state.animationPlaybackMode !== 'pingpong' || frames.length < 2) {
				// Loop mode (or single frame): always forward, wrap to start
				const nextIndex = currentPos === -1
					? frames[0]
					: frames[(currentPos + 1) % frames.length];
				return { ...state, currentLayerIndex: nextIndex };
			}
			// Ping-pong mode: advance by current direction, reverse at extremities
			const dir = state.animationDirection;
			const pos = currentPos === -1 ? 0 : currentPos;
			let nextPos = pos + dir;
			let nextDir = dir;
			if (nextPos >= frames.length) {
				nextDir = -1;
				nextPos = frames.length - 2; // skip back, don't replay last frame
			} else if (nextPos < 0) {
				nextDir = 1;
				nextPos = 1; // skip forward, don't replay first frame
			}
			return { ...state, currentLayerIndex: frames[nextPos], animationDirection: nextDir as 1 | -1 };
		}
		case 'STEP_ANIMATION_FRAME': {
			// Navigate the real frame sequence with circular wrap, never creating layers.
			// Used by the pill buttons (frame-back / frame-fwd).
			// Keyboard shortcuts [/] keep PREV_LAYER/NEXT_LAYER (construct in DRAW).
			const dir = action.payload;
			const frames = getAnimationFrames(state);
			if (frames.length === 0) return state;
			const pos = frames.indexOf(state.currentLayerIndex);
			// If current layer is empty/hidden (not in sequence): go to first or last frame
			const nextPos = pos === -1
				? (dir > 0 ? 0 : frames.length - 1)
				: (pos + dir + frames.length) % frames.length;
			const nextIndex = frames[nextPos];
			const newZ = nextIndex * -BASE_DEPTH_STEP;
			const hasShapesInNewLayer = state.shapes.some(s => s.zIndex === newZ);
			const nextBrush = resolveLayerBrush(state.shapes, nextIndex, state.layerBrushSettings[nextIndex]) || { thickness: state.currentBrushThickness, mode: state.brushMode };
			return {
				...state,
				currentLayerIndex: nextIndex,
				camera: { ...state.camera, z: newZ, rotation: 0 },
				isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
				isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
				paletteMode: state.layerRenderModes[nextIndex] || 'flat',
				currentBrushThickness: nextBrush.thickness,
				brushMode: nextBrush.mode,
			};
		}
		case 'TOGGLE_ANIMATION_PLAYBACK_MODE':
			return {
				...state,
				animationPlaybackMode: state.animationPlaybackMode === 'loop' ? 'pingpong' : 'loop',
				animationDirection: 1, // reset direction when switching modes
			};
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