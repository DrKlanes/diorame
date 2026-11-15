// One entry (at least) per reducer action, with a payload that DOES something on richState(1):
// three layers with content, layer 1 (ink, T=30) active. `setup` runs first when the action needs
// a precondition. Used by the smoke test (every action runs) and by the isDirty test (every
// action that changes what a .dior holds must mark the document dirty).
import { stroke, blob, straight, base, diorOf, type Action } from './fixtures';

export type CatalogueEntry = { label: string; setup?: Action[]; action: Action };

const grad: Action = { type: 'SET_PALETTE_MODE', payload: 'grad' };
const animation: Action = { type: 'TOGGLE_ANIMATION_MODE' };
const textOpen: Action[] = [{ type: 'START_TEXT_SESSION', payload: { x: 1, y: 2 } }, { type: 'UPDATE_TEXT_SESSION', payload: { content: 'hola' } }];

export const CATALOGUE: readonly CatalogueEntry[] = [
	// Strokes and history
	{ label: 'ADD_SHAPE', action: { type: 'ADD_SHAPE', payload: stroke('new-a', 'ink', straight(300), 30, 1) } },
	{ label: 'ADD_SHAPES', action: { type: 'ADD_SHAPES', payload: [stroke('new-b', 'ink', straight(320), 30, 1), blob('new-c', 1, 40)] } },
	{ label: 'UNDO', action: { type: 'UNDO' } },
	{ label: 'REDO', setup: [{ type: 'UNDO' }], action: { type: 'REDO' } },
	// Brush thickness and mode
	{ label: 'SET_BRUSH_THICKNESS', action: { type: 'SET_BRUSH_THICKNESS', payload: 44 } },
	{ label: 'SET_BRUSH_THICKNESS_PREVIEW', action: { type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 44 } },
	{ label: 'COMMIT_BRUSH_THICKNESS', setup: [{ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: 44 }], action: { type: 'COMMIT_BRUSH_THICKNESS' } },
	{ label: 'SET_BRUSH_MODE', action: { type: 'SET_BRUSH_MODE', payload: 'tapered' } },
	{ label: 'SCALE_LAYER_THICKNESS_PREVIEW', action: { type: 'SCALE_LAYER_THICKNESS_PREVIEW', payload: 1.5 } },
	{ label: 'COMMIT_BRUSH_THICKNESS (escala)', setup: [{ type: 'SCALE_LAYER_THICKNESS_PREVIEW', payload: 1.5 }], action: { type: 'COMMIT_BRUSH_THICKNESS' } },
	{ label: 'SET_BRUSH_SCALE_PROPORTIONAL', action: { type: 'SET_BRUSH_SCALE_PROPORTIONAL', payload: false } },
	// Transform
	{ label: 'MOVE_LAYER', action: { type: 'MOVE_LAYER', payload: { layerIndex: 1, deltaX: 10, deltaY: -5 } } },
	{ label: 'TRANSFORM_LAYER', action: { type: 'TRANSFORM_LAYER', payload: { layerIndex: 1, transform: { rotation: 0.3, scale: 1.5, dx: 5, dy: 5, centerX: 100, centerY: 100 } } } },
	{ label: 'FLIP_LAYER', action: { type: 'FLIP_LAYER', payload: { layerIndex: 1, direction: 'horizontal', centerX: 0, centerY: 0 } } },
	// Layer structure
	{ label: 'NEXT_LAYER', action: { type: 'NEXT_LAYER' } },
	{ label: 'NEXT_LAYER (crea capa)', setup: [{ type: 'SET_CURRENT_LAYER', payload: 2 }], action: { type: 'NEXT_LAYER' } },
	{ label: 'PREV_LAYER', action: { type: 'PREV_LAYER' } },
	{ label: 'ADD_LAYER', action: { type: 'ADD_LAYER' } },
	{ label: 'SET_CURRENT_LAYER', action: { type: 'SET_CURRENT_LAYER', payload: 0 } },
	{ label: 'SET_LAYER_SELECTED', action: { type: 'SET_LAYER_SELECTED', payload: false } },
	{ label: 'DELETE_CURRENT_LAYER', action: { type: 'DELETE_CURRENT_LAYER' } },
	{ label: 'MERGE_LAYER_DOWN', action: { type: 'MERGE_LAYER_DOWN' } },
	{ label: 'REORDER_LAYERS', action: { type: 'REORDER_LAYERS', payload: { fromIndex: 0, toIndex: 2 } } },
	{ label: 'MOVE_LAYER_TO', action: { type: 'MOVE_LAYER_TO', payload: { fromIndex: 2, toIndex: 0 } } },
	{ label: 'DUPLICATE_LAYER', action: { type: 'DUPLICATE_LAYER', payload: 1 } },
	{ label: 'TOGGLE_LAYER_VISIBILITY', action: { type: 'TOGGLE_LAYER_VISIBILITY', payload: 0 } },
	{ label: 'TOGGLE_3D_LOCK', action: { type: 'TOGGLE_3D_LOCK', payload: 2 } },
	// Palette
	{ label: 'SET_PALETTE_MODE', action: grad },
	{ label: 'SET_PALETTE_GRADIENT_ANGLE', setup: [grad], action: { type: 'SET_PALETTE_GRADIENT_ANGLE', payload: 45 } },
	{ label: 'SET_PALETTE_GRADIENT_INTENSITY', setup: [grad], action: { type: 'SET_PALETTE_GRADIENT_INTENSITY', payload: 0.6 } },
	{ label: 'SET_PALETTE_GRADIENT_TYPE', setup: [grad], action: { type: 'SET_PALETTE_GRADIENT_TYPE', payload: 'fade' } },
	{ label: 'COMMIT_PALETTE_GRADIENT', setup: [grad, { type: 'SET_PALETTE_GRADIENT_ANGLE', payload: 45 }], action: { type: 'COMMIT_PALETTE_GRADIENT' } },
	{ label: 'SET_ACTIVE_PALETTE', action: { type: 'SET_ACTIVE_PALETTE', payload: 'alternative' } },
	{ label: 'TOGGLE_PALETTE_APPLY_TO_ALL', setup: [grad], action: { type: 'TOGGLE_PALETTE_APPLY_TO_ALL' } },
	{ label: 'SET_COLOR_INDEX', action: { type: 'SET_COLOR_INDEX', payload: 5 } },
	// Project
	{ label: 'LOAD_PROJECT', action: { type: 'LOAD_PROJECT', payload: diorOf(base('uniform', 12)) as never } },
	{ label: 'MARK_CLEAN', action: { type: 'MARK_CLEAN' } },
	{ label: 'PROJECT_SAVED', action: { type: 'PROJECT_SAVED', payload: { projectId: 'p-saved', version: 3, createdAt: '2026-11-15T10:00:00.000Z', updatedAt: '2026-11-15T11:00:00.000Z', derivedFrom: null } } },
	{ label: 'DUPLICATE_PROJECT', action: { type: 'DUPLICATE_PROJECT', payload: { projectName: 'Copia' } } },
	{ label: 'SET_PROJECT_NAME', action: { type: 'SET_PROJECT_NAME', payload: 'Otro nombre' } },
	{ label: 'CLEAR_CANVAS', action: { type: 'CLEAR_CANVAS' } },
	// Text
	{ label: 'START_TEXT_SESSION', action: { type: 'START_TEXT_SESSION', payload: { x: 1, y: 2 } } },
	{ label: 'UPDATE_TEXT_SESSION', setup: [textOpen[0]], action: textOpen[1] },
	{ label: 'COMMIT_TEXT_SESSION', setup: textOpen, action: { type: 'COMMIT_TEXT_SESSION' } },
	{ label: 'CANCEL_TEXT_SESSION', setup: textOpen, action: { type: 'CANCEL_TEXT_SESSION' } },
	// FX
	{ label: 'SET_FX_INTENSITY', action: { type: 'SET_FX_INTENSITY', payload: { fx: 'grain', value: 0.7 } } },
	{ label: 'SET_PARTICLE_TYPE', action: { type: 'SET_PARTICLE_TYPE', payload: 'square' } },
	{ label: 'TOGGLE_FX', action: { type: 'TOGGLE_FX', payload: 'vignette' } },
	{ label: 'TOGGLE_FX_MASTER', setup: [{ type: 'TOGGLE_FX', payload: 'vignette' }], action: { type: 'TOGGLE_FX_MASTER' } },
	{ label: 'SET_SUPER_RISO', action: { type: 'SET_SUPER_RISO', payload: { paper: 'cream', maxInks: 3 } } },
	{ label: 'APPLY_SUPER_RISO_STYLE', action: { type: 'APPLY_SUPER_RISO_STYLE', payload: 'zine' } },
	// Camera and CINEMA
	{ label: 'SET_MODE', action: { type: 'SET_MODE', payload: 'cinematic' } },
	{ label: 'SET_CINEMATIC_TYPE', action: { type: 'SET_CINEMATIC_TYPE', payload: 'spiral' } },
	{ label: 'SET_CINEMATIC_SPEED', action: { type: 'SET_CINEMATIC_SPEED', payload: 0.9 } },
	{ label: 'UPDATE_CAMERA', action: { type: 'UPDATE_CAMERA', payload: { x: 12, rotation: 0.1 } } },
	{ label: 'SET_FOCAL_LENGTH', action: { type: 'SET_FOCAL_LENGTH', payload: 2000 } },
	{ label: 'SET_VIEW_ZOOM_OFFSET', action: { type: 'SET_VIEW_ZOOM_OFFSET', payload: -900 } },
	{ label: 'INIT_CINEMA_VIEW', action: { type: 'INIT_CINEMA_VIEW', payload: { focalLength: 3333, viewZoomOffset: -1111, layerSpacingFactor: 1.25, cinematicType: 'orbit' } } },
	{ label: 'SET_LAYER_SPACING_FACTOR', action: { type: 'SET_LAYER_SPACING_FACTOR', payload: 1.5 } },
	{ label: 'TOGGLE_HANDHELD', action: { type: 'TOGGLE_HANDHELD' } },
	{ label: 'SET_HANDHELD_INTENSITY', action: { type: 'SET_HANDHELD_INTENSITY', payload: 'high' } },
	{ label: 'SET_POINT_OF_INTEREST', action: { type: 'SET_POINT_OF_INTEREST', payload: { x: 1, y: 2, z: -150 } } },
	{ label: 'CLEAR_POINT_OF_INTEREST', setup: [{ type: 'SET_POINT_OF_INTEREST', payload: { x: 1, y: 2, z: -150 } }], action: { type: 'CLEAR_POINT_OF_INTEREST' } },
	// DRAW view
	{ label: 'SET_DRAWING_ZOOM', action: { type: 'SET_DRAWING_ZOOM', payload: { zoom: 2, pan: { x: 10, y: 20 } } } },
	{ label: 'RESET_DRAWING_VIEW', setup: [{ type: 'SET_DRAWING_ZOOM', payload: { zoom: 2, pan: { x: 10, y: 20 } } }], action: { type: 'RESET_DRAWING_VIEW' } },
	{ label: 'SET_FORMAT', action: { type: 'SET_FORMAT', payload: { type: '1:1', orientation: 'portrait', rect: { x: -200, y: -200, w: 400, h: 400 } } } },
	{ label: 'SET_VIEWPORT_SIZE', action: { type: 'SET_VIEWPORT_SIZE', payload: { w: 1280, h: 800 } } },
	{ label: 'COMPLETE_FIT_TO_VIEW', action: { type: 'COMPLETE_FIT_TO_VIEW' } },
	{ label: 'TOGGLE_GRID', action: { type: 'TOGGLE_GRID' } },
	// Animation
	{ label: 'TOGGLE_ANIMATION_MODE', action: animation },
	{ label: 'SET_ANIMATION_PLAYING', setup: [animation], action: { type: 'SET_ANIMATION_PLAYING', payload: true } },
	{ label: 'SET_ANIMATION_FRAMERATE', action: { type: 'SET_ANIMATION_FRAMERATE', payload: 8 } },
	{ label: 'SET_ANIMATION_EXPORT_LOOPS', action: { type: 'SET_ANIMATION_EXPORT_LOOPS', payload: 3 } },
	{ label: 'SET_GIF_EXPORT_SCALE', action: { type: 'SET_GIF_EXPORT_SCALE', payload: 0.5 } },
	{ label: 'TOGGLE_ONION_SKIN', action: { type: 'TOGGLE_ONION_SKIN' } },
	{ label: 'TOGGLE_ANIMATION_FLAT_Z', action: { type: 'TOGGLE_ANIMATION_FLAT_Z' } },
	{ label: 'ADVANCE_ANIMATION_FRAME', setup: [animation], action: { type: 'ADVANCE_ANIMATION_FRAME' } },
	{ label: 'STEP_ANIMATION_FRAME', setup: [animation], action: { type: 'STEP_ANIMATION_FRAME', payload: 1 } },
	{ label: 'TOGGLE_ANIMATION_PLAYBACK_MODE', action: { type: 'TOGGLE_ANIMATION_PLAYBACK_MODE' } },
	// UI and tool
	{ label: 'TOGGLE_WELCOME_MODAL', action: { type: 'TOGGLE_WELCOME_MODAL' } },
	{ label: 'SET_SOUNDS_ENABLED', action: { type: 'SET_SOUNDS_ENABLED', payload: false } },
	{ label: 'TOGGLE_UI', action: { type: 'TOGGLE_UI' } },
	{ label: 'SET_DRAWING_ACTIVE', action: { type: 'SET_DRAWING_ACTIVE', payload: true } },
	{ label: 'TOGGLE_SYMMETRY', action: { type: 'TOGGLE_SYMMETRY' } },
	{ label: 'TOGGLE_DRAW_BEHIND', action: { type: 'TOGGLE_DRAW_BEHIND' } },
	{ label: 'TOGGLE_DRAW_INSIDE', action: { type: 'TOGGLE_DRAW_INSIDE' } },
	{ label: 'TOGGLE_ORGANIC_MODE', action: { type: 'TOGGLE_ORGANIC_MODE' } },
	{ label: 'TOGGLE_BLOB_SMOOTHING', action: { type: 'TOGGLE_BLOB_SMOOTHING' } },
	{ label: 'SET_TOOL', action: { type: 'SET_TOOL', payload: 'move' } },
	{ label: 'TOGGLE_DARK_MODE', action: { type: 'TOGGLE_DARK_MODE' } },
	{ label: 'REQUEST_EXPORT', action: { type: 'REQUEST_EXPORT', payload: 'png' } },
	{ label: 'FINISH_EXPORT', setup: [{ type: 'REQUEST_EXPORT', payload: 'png' }], action: { type: 'FINISH_EXPORT' } },
	{ label: 'DISMISS_ONBOARDING', action: { type: 'DISMISS_ONBOARDING' } },
];
