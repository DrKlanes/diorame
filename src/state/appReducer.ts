// The app reducer: the `switch` over every action, each case one line that delegates to the function of its subject
// in src/state/ (refactor phase 3, v3.26.15–3.26.37). Out of StrataContext.tsx (v3.26.38, refactor phase 3B), which
// re-exports it. No React: canvas/diorRender.ts (the Lab contract), tools/ and tests/ run it outside the app.
import { mergeLayerDown } from '../utils/mergeLayers';
import { pushHistory, createSnapshot, undo, redo } from './history';
import { loadProject } from './loadProject';
import { setBrushThickness, setBrushThicknessPreview, commitBrushThickness, setBrushMode, scaleLayerThicknessPreview, setBrushScaleProportional } from './brush';
import { moveLayer, transformLayer, flipLayer } from './layerTransform';
import { nextLayer, prevLayer, addLayer, setLayerSelected, setCurrentLayer, deleteCurrentLayer, toggleLayerVisibility, toggle3dLock } from './layerNav';
import { reorderLayers, moveLayerTo, duplicateLayer } from './layerReorder';
import { setPaletteMode, setPaletteGradientAngle, setPaletteGradientIntensity, setPaletteGradientType, commitPaletteGradient, setActivePalette, togglePaletteApplyToAll, setColorIndex } from './palette';
import { setFxIntensity, setParticleType, toggleFx, setSuperRiso, setSuperRisoStyle, toggleFxMaster } from './fx';
import { toggleAnimationMode, setAnimationPlaying, setAnimationFramerate, setAnimationExportLoops, setGifExportScale, toggleOnionSkin, toggleAnimationFlatZ, advanceAnimationFrame, stepAnimationFrame, toggleAnimationPlaybackMode } from './animation';
import { startTextSession, updateTextSession, commitTextSession, cancelTextSession } from './textSession';
import { addShape, addShapes } from './shapes';
import { setMode, updateCamera, setCinematicType, setCinematicSpeed, setFocalLength, setViewZoomOffset, initCinemaView, setLayerSpacingFactor, toggleHandheld, setHandheldIntensity, setPointOfInterest, clearPointOfInterest } from './cinema';
import { setDrawingZoom, resetDrawingView, setFormat, setViewportSize, completeFitToView, toggleGrid } from './drawView';
import { setTool, setDrawingActive, toggleSymmetry, toggleDrawBehind, toggleDrawInside, toggleOrganicMode, toggleBlobSmoothing } from './tool';
import { toggleWelcomeModal, dismissOnboarding, setSoundsEnabled, toggleUi, toggleDarkMode, requestExport, finishExport } from './ui';
import { markClean, projectSaved, setProjectName, duplicateProject, clearCanvas } from './project';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';

// Exported for tools/text-check (runs the real TRANSFORM_LAYER / FLIP_LAYER / LOAD_PROJECT outside React).
export function appReducer(state: AppState, action: Action): AppState {
	switch (action.type) {
		case 'TOGGLE_WELCOME_MODAL': return toggleWelcomeModal(state); // Moved to state/ui.ts
		case 'MARK_CLEAN': return markClean(state); // Moved to state/project.ts
		case 'PROJECT_SAVED': return projectSaved(state, action); // Moved to state/project.ts
		case 'DUPLICATE_PROJECT': return duplicateProject(state, action); // Moved to state/project.ts
		case 'SET_SOUNDS_ENABLED': return setSoundsEnabled(state, action); // Moved to state/ui.ts
		case 'TOGGLE_UI': return toggleUi(state); // Moved to state/ui.ts
		case 'SET_DRAWING_ACTIVE': return setDrawingActive(state, action); // Moved to state/tool.ts
		case 'TOGGLE_SYMMETRY': return toggleSymmetry(state); // Moved to state/tool.ts
		case 'TOGGLE_GRID': return toggleGrid(state); // Moved to state/drawView.ts
		case 'TOGGLE_DRAW_BEHIND': return toggleDrawBehind(state); // Moved to state/tool.ts
		case 'TOGGLE_DRAW_INSIDE': return toggleDrawInside(state); // Moved to state/tool.ts
		case 'TOGGLE_ORGANIC_MODE': return toggleOrganicMode(state); // Moved to state/tool.ts
		case 'TOGGLE_BLOB_SMOOTHING': return toggleBlobSmoothing(state); // Moved to state/tool.ts
		case 'SET_PALETTE_MODE': return setPaletteMode(state, action); // Moved to state/palette.ts
		case 'SET_PALETTE_GRADIENT_ANGLE': return setPaletteGradientAngle(state, action); // Moved to state/palette.ts
		case 'SET_PALETTE_GRADIENT_INTENSITY': return setPaletteGradientIntensity(state, action); // Moved to state/palette.ts
		case 'SET_PALETTE_GRADIENT_TYPE': return setPaletteGradientType(state, action); // Moved to state/palette.ts
		case 'COMMIT_PALETTE_GRADIENT': return commitPaletteGradient(state); // Moved to state/palette.ts
		case 'RESET_DRAWING_VIEW': return resetDrawingView(state); // Moved to state/drawView.ts
		case 'SET_FORMAT': return setFormat(state, action); // Moved to state/drawView.ts
		case 'SET_VIEWPORT_SIZE': return setViewportSize(state, action); // Moved to state/drawView.ts
		case 'ADD_SHAPE': return addShape(state, action); // Moved to state/shapes.ts
		case 'ADD_SHAPES': return addShapes(state, action); // Moved to state/shapes.ts
		case 'UNDO': return undo(state); // Moved to state/history.ts
		case 'REDO': return redo(state); // Moved to state/history.ts
		case 'SET_MODE': return setMode(state, action); // Moved to state/cinema.ts
		case 'SET_TOOL': return setTool(state, action); // Moved to state/tool.ts
		case 'SET_CINEMATIC_TYPE': return setCinematicType(state, action); // Moved to state/cinema.ts
		case 'SET_COLOR_INDEX': return setColorIndex(state, action); // Moved to state/palette.ts
		case 'UPDATE_CAMERA': return updateCamera(state, action); // Moved to state/cinema.ts
		case 'NEXT_LAYER': return nextLayer(state); // Moved to state/layerNav.ts
		case 'PREV_LAYER': return prevLayer(state); // Moved to state/layerNav.ts
		case 'ADD_LAYER': return addLayer(state); // Moved to state/layerNav.ts
		case 'SET_LAYER_SELECTED': return setLayerSelected(state, action); // Moved to state/layerNav.ts
		case 'SET_CURRENT_LAYER': return setCurrentLayer(state, action); // Moved to state/layerNav.ts
		case 'SET_FOCAL_LENGTH': return setFocalLength(state, action); // Moved to state/cinema.ts
		case 'SET_VIEW_ZOOM_OFFSET': return setViewZoomOffset(state, action); // Moved to state/cinema.ts
		case 'INIT_CINEMA_VIEW': return initCinemaView(state, action); // Moved to state/cinema.ts
		case 'SET_DRAWING_ZOOM': return setDrawingZoom(state, action); // Moved to state/drawView.ts
		case 'TOGGLE_DARK_MODE': return toggleDarkMode(state); // Moved to state/ui.ts
		case 'SET_FX_INTENSITY': return setFxIntensity(state, action); // Moved to state/fx.ts
		case 'SET_PARTICLE_TYPE': return setParticleType(state, action); // Moved to state/fx.ts
		case 'TOGGLE_FX': return toggleFx(state, action); // Moved to state/fx.ts
		case 'SET_SUPER_RISO': return setSuperRiso(state, action); // Moved to state/fx.ts
		case 'APPLY_SUPER_RISO_STYLE': return setSuperRisoStyle(state, action); // Moved to state/fx.ts
		case 'TOGGLE_FX_MASTER': return toggleFxMaster(state); // Moved to state/fx.ts
		case 'TOGGLE_PALETTE_APPLY_TO_ALL': return togglePaletteApplyToAll(state); // Moved to state/palette.ts
		case 'REQUEST_EXPORT': return requestExport(state, action); // Moved to state/ui.ts
		case 'FINISH_EXPORT': return finishExport(state); // Moved to state/ui.ts
		case 'CLEAR_CANVAS': return clearCanvas(state); // Moved to state/project.ts
		case 'LOAD_PROJECT': return loadProject(state, action); // Moved to state/loadProject.ts
		case 'COMPLETE_FIT_TO_VIEW': return completeFitToView(state); // Moved to state/drawView.ts
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
		case 'SET_POINT_OF_INTEREST': return setPointOfInterest(state, action); // Moved to state/cinema.ts
		case 'CLEAR_POINT_OF_INTEREST': return clearPointOfInterest(state); // Moved to state/cinema.ts
		case 'SET_CINEMATIC_SPEED': return setCinematicSpeed(state, action); // Moved to state/cinema.ts
		case 'SET_BRUSH_THICKNESS': return setBrushThickness(state, action); // Moved to state/brush.ts
		case 'SET_BRUSH_THICKNESS_PREVIEW': return setBrushThicknessPreview(state, action); // Moved to state/brush.ts
		case 'COMMIT_BRUSH_THICKNESS': return commitBrushThickness(state); // Moved to state/brush.ts
		case 'SCALE_LAYER_THICKNESS_PREVIEW': return scaleLayerThicknessPreview(state, action);
		case 'SET_BRUSH_SCALE_PROPORTIONAL': return setBrushScaleProportional(state, action);
		case 'TOGGLE_HANDHELD': return toggleHandheld(state); // Moved to state/cinema.ts
		case 'SET_HANDHELD_INTENSITY': return setHandheldIntensity(state, action); // Moved to state/cinema.ts
		case 'SET_BRUSH_MODE': return setBrushMode(state, action); // Moved to state/brush.ts
		case 'SET_LAYER_SPACING_FACTOR': return setLayerSpacingFactor(state, action); // Moved to state/cinema.ts
		case 'SET_PROJECT_NAME': return setProjectName(state, action); // Moved to state/project.ts
		case 'REORDER_LAYERS': return reorderLayers(state, action); // Moved to state/layerReorder.ts
		case 'MOVE_LAYER_TO': return moveLayerTo(state, action); // Moved to state/layerReorder.ts
		case 'DUPLICATE_LAYER': return duplicateLayer(state, action); // Moved to state/layerReorder.ts
		case 'DISMISS_ONBOARDING': return dismissOnboarding(state); // Moved to state/ui.ts
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
