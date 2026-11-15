// The reducer's action union, and the payload LOAD_PROJECT reads. Out of StrataContext.tsx (v3.26.13,
// refactor phase 2c). Types only: nothing in this file exists at runtime.
import type {
	Shape, AppState, AppMode, ToolType, CinematicType, ExportType, BrushMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, ProjectMeta, DrawFormat, SuperRisoStyle, XeroxStyle, StencilStyle,
} from './strataTypes';
import type { SuperRisoPatch } from '../constants/superRiso';

// LOAD_PROJECT's payload is JSON.parse() of a saved .dior file (or an
// autosave/onboarding snapshot), which may predate one or more field
// renames. It is NOT validated AppState — the whitelist below (case
// 'LOAD_PROJECT') re-checks every field with typeof/includes guards before
// trusting it, so this type only needs to document which legacy shapes are
// still read, not enforce correctness.
// History: 'brush' (old name for 'blob') and 'line' (old name for 'brush')
// were renamed; 'lineMode'/'currentLineThickness' were renamed to
// 'brushMode'/'currentBrushThickness'. Text shapes gained an optional
// 'textMatrix' in v3.17.56: older files have none and are read through their
// 'rotation' (utils/textTransform.ts), so they need no migration.
type LegacyShape = Omit<Shape, 'brushMode'> & {
	brushMode?: BrushMode;
	lineMode?: BrushMode;      // pre-rename key for brushMode
	lineThickness?: number;    // pre-rename key for brushThickness
};

type LegacyProjectPayload = Partial<Omit<AppState, 'shapes' | 'tool'>> & {
	shapes?: LegacyShape[];
	tool?: ToolType | 'line';  // pre-rename tool value
	lineMode?: BrushMode;      // pre-rename key for brushMode
	currentLineThickness?: number; // pre-rename key for currentBrushThickness
};

export type Action =
	| { type: 'ADD_SHAPE'; payload: Shape }
	| { type: 'ADD_SHAPES'; payload: Shape[] }
	| { type: 'UNDO' }
	| { type: 'REDO' }
	| { type: 'SET_MODE'; payload: AppMode }
	| { type: 'SET_TOOL'; payload: ToolType }
	| { type: 'SET_CINEMATIC_TYPE'; payload: CinematicType }
	| { type: 'SET_COLOR_INDEX'; payload: number }
	| { type: 'UPDATE_CAMERA'; payload: { x?: number; y?: number; z?: number; rotation?: number } }
	| { type: 'NEXT_LAYER' }
	| { type: 'PREV_LAYER' }
	| { type: 'ADD_LAYER' }
	| { type: 'SET_CURRENT_LAYER'; payload: number }
	| { type: 'SET_FOCAL_LENGTH'; payload: number }
	| { type: 'SET_VIEW_ZOOM_OFFSET'; payload: number }
	| { type: 'SET_DRAWING_ZOOM'; payload: { zoom: number; pan?: { x: number; y: number } } }
	| { type: 'TOGGLE_DARK_MODE' }
	| { type: 'SET_FX_INTENSITY'; payload: { fx: keyof PostProcessingSettings; value: number } }
	| { type: 'SET_PARTICLE_TYPE'; payload: 'circle' | 'square' | 'stroke' }
	| { type: 'TOGGLE_FX'; payload: keyof PostProcessingEnabled }
	| { type: 'TOGGLE_FX_MASTER' }
	| { type: 'SET_SUPER_RISO'; payload: SuperRisoPatch }
	| { type: 'APPLY_SUPER_RISO_STYLE'; payload: SuperRisoStyle | XeroxStyle | StencilStyle }
	| { type: 'REQUEST_EXPORT'; payload: ExportType }
	| { type: 'FINISH_EXPORT' }
	| { type: 'CLEAR_CANVAS' }
	| { type: 'LOAD_PROJECT'; payload: LegacyProjectPayload }
	| { type: 'SET_LAYER_SELECTED'; payload: boolean }
	| { type: 'TOGGLE_LAYER_VISIBILITY'; payload: number }
	| { type: 'TOGGLE_3D_LOCK'; payload: number }
	| { type: 'MOVE_LAYER'; payload: { layerIndex: number; deltaX: number; deltaY: number } }
	| { type: 'TRANSFORM_LAYER'; payload: { layerIndex: number; transform: { rotation: number; scale: number; dx: number; dy: number; centerX: number; centerY: number; scaleX?: number; scaleY?: number } } }
	| { type: 'TOGGLE_WELCOME_MODAL' }
	| { type: 'TOGGLE_UI' }
	| { type: 'SET_DRAWING_ACTIVE'; payload: boolean }
	| { type: 'TOGGLE_SYMMETRY' }
	| { type: 'TOGGLE_GRID' }
	| { type: 'SET_PALETTE_MODE'; payload: 'flat' | 'grad' }
	| { type: 'SET_PALETTE_GRADIENT_ANGLE'; payload: number }
	| { type: 'SET_PALETTE_GRADIENT_INTENSITY'; payload: number }
	| { type: 'SET_PALETTE_GRADIENT_TYPE'; payload: 'solid' | 'fade' }
	| { type: 'COMMIT_PALETTE_GRADIENT' }
	| { type: 'RESET_DRAWING_VIEW' }
	| { type: 'SET_FORMAT'; payload: DrawFormat | null }
	| { type: 'SET_VIEWPORT_SIZE'; payload: { w: number; h: number } }
	| { type: 'DELETE_CURRENT_LAYER' }
	| { type: 'MERGE_LAYER_DOWN' }
	| { type: 'START_TEXT_SESSION'; payload: { x: number; y: number } }
	| { type: 'UPDATE_TEXT_SESSION'; payload: Partial<TextSession> }
	| { type: 'COMMIT_TEXT_SESSION' }
	| { type: 'CANCEL_TEXT_SESSION' }
	| { type: 'SET_POINT_OF_INTEREST'; payload: { x: number; y: number; z: number } }
	| { type: 'CLEAR_POINT_OF_INTEREST' }
	| { type: 'SET_CINEMATIC_SPEED'; payload: number }
	| { type: 'INIT_CINEMA_VIEW'; payload: { focalLength: number; viewZoomOffset: number; layerSpacingFactor: number; cinematicType: CinematicType } }
	| { type: 'TOGGLE_DRAW_BEHIND' }
	| { type: 'TOGGLE_DRAW_INSIDE' }
	| { type: 'TOGGLE_ORGANIC_MODE' }
	| { type: 'TOGGLE_BLOB_SMOOTHING' }
	| { type: 'SET_BRUSH_THICKNESS'; payload: number }
	| { type: 'SET_BRUSH_THICKNESS_PREVIEW'; payload: number }
	| { type: 'COMMIT_BRUSH_THICKNESS' }
	| { type: 'SCALE_LAYER_THICKNESS_PREVIEW'; payload: number }
	| { type: 'SET_BRUSH_SCALE_PROPORTIONAL'; payload: boolean }
	| { type: 'TOGGLE_HANDHELD' }
	| { type: 'SET_HANDHELD_INTENSITY'; payload: HandheldIntensity }
	| { type: 'SET_BRUSH_MODE'; payload: BrushMode }
	| { type: 'SET_LAYER_SPACING_FACTOR'; payload: number }
	| { type: 'SET_PROJECT_NAME'; payload: string }
	| { type: 'REORDER_LAYERS'; payload: { fromIndex: number; toIndex: number } }
	| { type: 'MOVE_LAYER_TO'; payload: { fromIndex: number; toIndex: number } }
	| { type: 'DUPLICATE_LAYER'; payload: number }
	| { type: 'DISMISS_ONBOARDING' }
	| { type: 'SET_ACTIVE_PALETTE'; payload: 'primary' | 'alternative' }
	| { type: 'COMPLETE_FIT_TO_VIEW' }
	| { type: 'FLIP_LAYER'; payload: { layerIndex: number; direction: 'horizontal' | 'vertical'; centerX: number; centerY: number } }
	| { type: 'TOGGLE_PALETTE_APPLY_TO_ALL' }
	| { type: 'MARK_CLEAN' }
	| { type: 'PROJECT_SAVED'; payload: ProjectMeta }
	| { type: 'DUPLICATE_PROJECT'; payload: { projectName: string } }
	| { type: 'SET_SOUNDS_ENABLED'; payload: boolean }
	| { type: 'TOGGLE_ANIMATION_MODE' }
	| { type: 'SET_ANIMATION_PLAYING'; payload: boolean }
	| { type: 'SET_ANIMATION_FRAMERATE'; payload: number }
	| { type: 'TOGGLE_ONION_SKIN' }
	| { type: 'TOGGLE_ANIMATION_FLAT_Z' }
	| { type: 'ADVANCE_ANIMATION_FRAME' }
	| { type: 'STEP_ANIMATION_FRAME'; payload: 1 | -1 }
	| { type: 'TOGGLE_ANIMATION_PLAYBACK_MODE' }
	| { type: 'SET_ANIMATION_EXPORT_LOOPS'; payload: number }
	| { type: 'SET_GIF_EXPORT_SCALE'; payload: number };
