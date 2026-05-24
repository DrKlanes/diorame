import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, LineMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
} from '../../types/strataTypes';
import { UNTITLED_PROJECT_SENTINEL } from '../../constants/project';

export type {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, LineMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
};

// --- Constants ---
export const BASE_DEPTH_STEP = 150;  
export const MAX_LAYERS = 10;
export { APP_VERSION } from '../../constants/version'; // Moved to constants/version.ts
export const MAX_HISTORY_STEPS = 50; // History limit

import { PALETTE_PRIMARY, PALETTE_ALTERNATIVE, GRADIENT_DEFAULTS } from '../../constants/palette';
export type { PaletteColor } from '../../constants/palette';
export { PALETTE_PRIMARY, PALETTE_ALTERNATIVE, GRADIENT_DEFAULTS };

export const FIXED_PALETTE: string[] = PALETTE_PRIMARY.map(c => c.hex);
export const ALTERNATIVE_PALETTE: string[] = PALETTE_ALTERNATIVE.map(c => c.hex);

import {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
} from '../../utils/strokeGenerators';

export {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
};

// --- Actions ---

type Action =
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
  | { type: 'SET_CURRENT_LAYER'; payload: number }
  | { type: 'SET_FOCAL_LENGTH'; payload: number }
  | { type: 'SET_VIEW_ZOOM_OFFSET'; payload: number }
  | { type: 'SET_DRAWING_ZOOM'; payload: { zoom: number; pan?: { x: number; y: number } } }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_FX_INTENSITY'; payload: { fx: keyof PostProcessingSettings; value: number } }
  | { type: 'SET_PARTICLE_TYPE'; payload: 'circle' | 'square' | 'stroke' }
  | { type: 'TOGGLE_FX'; payload: keyof PostProcessingEnabled }
  | { type: 'TOGGLE_FX_MASTER' }
  | { type: 'REQUEST_EXPORT'; payload: ExportType }
  | { type: 'FINISH_EXPORT' }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'LOAD_PROJECT'; payload: Partial<AppState> }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; payload: number }
  | { type: 'TOGGLE_3D_LOCK'; payload: number }
  | { type: 'MOVE_LAYER'; payload: { layerIndex: number; deltaX: number; deltaY: number } }
  | { type: 'TRANSFORM_LAYER'; payload: { layerIndex: number; transform: { rotation: number; scale: number; dx: number; dy: number; centerX: number; centerY: number } } }
  | { type: 'TOGGLE_WELCOME_MODAL' }
  | { type: 'TOGGLE_UI' }
  | { type: 'SET_DRAWING_ACTIVE'; payload: boolean }
  | { type: 'TOGGLE_SYMMETRY' }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_PALETTE_MODE'; payload: 'flat' | 'grad' }
  | { type: 'SET_PALETTE_GRADIENT_ANGLE'; payload: number }
  | { type: 'SET_PALETTE_GRADIENT_INTENSITY'; payload: number }
  | { type: 'SET_PALETTE_GRADIENT_TYPE'; payload: 'solid' | 'fade' }
  | { type: 'RESET_DRAWING_VIEW' }
  | { type: 'DELETE_CURRENT_LAYER' }
  | { type: 'START_TEXT_SESSION'; payload: { x: number; y: number } }
  | { type: 'UPDATE_TEXT_SESSION'; payload: Partial<TextSession> }
  | { type: 'COMMIT_TEXT_SESSION' }
  | { type: 'CANCEL_TEXT_SESSION' }
  | { type: 'SET_POINT_OF_INTEREST'; payload: { x: number; y: number; z: number } }
  | { type: 'CLEAR_POINT_OF_INTEREST' }
  | { type: 'SET_CINEMATIC_SPEED'; payload: number }
  | { type: 'TOGGLE_DRAW_BEHIND' }
  | { type: 'TOGGLE_DRAW_INSIDE' }
  | { type: 'TOGGLE_ORGANIC_MODE' }
  | { type: 'TOGGLE_BLOB_SMOOTHING' }
  | { type: 'SET_LINE_THICKNESS'; payload: number }
  | { type: 'SET_LINE_THICKNESS_PREVIEW'; payload: number }
  | { type: 'COMMIT_LINE_THICKNESS' }
  | { type: 'TOGGLE_HANDHELD' }
  | { type: 'SET_HANDHELD_INTENSITY'; payload: HandheldIntensity }
  | { type: 'SET_LINE_MODE'; payload: LineMode }
  | { type: 'SET_LAYER_SPACING_FACTOR'; payload: number }
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'REORDER_LAYERS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'MOVE_LAYER_TO'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'DUPLICATE_LAYER'; payload: number }
  | { type: 'DISMISS_ONBOARDING' }
  | { type: 'SET_ACTIVE_PALETTE'; payload: 'primary' | 'alternative' }
  | { type: 'COMPLETE_FIT_TO_VIEW' }
  | { type: 'FLIP_LAYER'; payload: { layerIndex: number; direction: 'horizontal' | 'vertical'; centerX: number; centerY: number } }
  | { type: 'TOGGLE_PALETTE_APPLY_TO_ALL' };

// --- Initial State ---

const initialState: AppState = {
  shapes: [],
  palette: FIXED_PALETTE,
  activePaletteId: 'primary',
  currentColorIndex: 0,
  mode: 'drawing',
  tool: 'brush',
  textSession: {
      isActive: false,
      x: 0,
      y: 0,
      content: '',
      font: 'noir',
      align: 'left'
  },
  cinematicType: 'forward',
  camera: { x: 0, y: 0, z: 0, rotation: 0 },
  currentLayerIndex: 0,
  totalLayers: 1,
  focalLength: 800, 
  viewZoomOffset: -600,
  drawingZoom: 1,
  drawingPan: { x: 0, y: 0 },
  isDarkMode: false,
  layerSpacingFactor: 1.0,
  postProcessing: {
      grain: 0.5,
      vignette: 0.5,
      distortion: -0.3, // Non-neutral default: ensures visible effect on first toggle
      dof: 0.5,
      focusDist: 800, // Default focus distance
      focusTargetLayer: -1, // Default: -1 (Manual/Free Focus). 0+ = Lock to Layer Index
      chromaticAberration: 0.5,
      fog: 0.5,
      particles: 0.5,
      particleType: 'circle', // Default particle type
      wiggle: 0.5, // Default to Medium (Current behavior)
      glow: 0.5, // Default glow intensity
      riso: 0.5, // Default RISO texture intensity
      pixelArtSize: 4, // Default pixel size
      pixelArtDepth: 4, // Default color depth (4 levels = 64 colors)
      pixelArtDither: 0, // Default dither (0 = Clean/None)
      grungeIntensity: 0.5 // Default Medium
  },
  postProcessingEnabled: {
      grain: false,
      vignette: false,
      distortion: false,
      dof: false,
      wiggle: false,
      chromaticAberration: false,
      fog: false,
      particles: false,
      glow: false,
      riso: false,
      pixelArt: false,
      grunge: false
  },
  fxMasterEnabled: true, // Master toggle for all FX (defaults ON)
  postProcessingSnapshot: null,
  history: [{
      shapes: [],
      totalLayers: 1,
      currentLayerIndex: 0,
      hiddenLayers: [],
      locked3DLayers: [],
      layerRenderModes: {},
      layerGradParams: {},
      layerBrushSettings: {}
  }],
  historyIndex: 0,
  exportRequest: null,
  isExporting: false,
  hiddenLayers: [],
  locked3DLayers: [],
  isWelcomeModalOpen: true,
  isOnboardingVisible: true, // New: Onboarding overlay on canvas
  isUIHidden: false,
  isDrawing: false,
  isSymmetryEnabled: false,
  gridEnabled: typeof window !== 'undefined' && window.localStorage?.getItem('diorame-grid-enabled') === 'true',
  paletteMode: 'flat',
  layerRenderModes: {},
  layerGradParams: {},
  layerBrushSettings: {},
  pointOfInterest: null,
  cinematicSpeed: 1.0, // Default Normal Speed
  isDrawBehind: false,
  isDrawInside: false,
  isOrganicMode: false,
  blobSmoothing: false,
  currentLineThickness: 25,
  lineThicknessBeforePreview: null,
  isHandheldEnabled: false,
  handheldIntensity: 'medium',
  lineMode: 'tapered',
  projectName: UNTITLED_PROJECT_SENTINEL, // Default project name (sentinel; resolved via t() at render time)
  paletteApplyToAllActive: false,
  paletteApplyToAllSnapshot: null,
  shouldFitToView: false
};

// --- Helper: Push to History with Limit ---
function pushHistory(
    history: HistorySnapshot[], 
    index: number, 
    snapshot: HistorySnapshot
): { history: HistorySnapshot[], index: number } {
    let newHistory = history.slice(0, index + 1);
    newHistory.push(snapshot);
    
    // Cap history size
    if (newHistory.length > MAX_HISTORY_STEPS) {
        newHistory = newHistory.slice(newHistory.length - MAX_HISTORY_STEPS);
    }
    
    return {
        history: newHistory,
        index: newHistory.length - 1
    };
}

// Helper to create a snapshot from current state
function createSnapshot(state: AppState): HistorySnapshot {
    return {
        shapes: state.shapes,
        totalLayers: state.totalLayers,
        currentLayerIndex: state.currentLayerIndex,
        hiddenLayers: state.hiddenLayers,
        locked3DLayers: state.locked3DLayers,
        layerRenderModes: state.layerRenderModes,
        layerGradParams: state.layerGradParams,
        layerBrushSettings: state.layerBrushSettings
    };
}

// --- Reducer ---

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TOGGLE_WELCOME_MODAL':
      return { ...state, isWelcomeModalOpen: !state.isWelcomeModalOpen };
    case 'TOGGLE_UI':
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
      if (state.paletteApplyToAllActive) {
          const allModes: Record<number, 'flat' | 'grad'> = {};
          for (let i = 0; i < state.totalLayers; i++) allModes[i] = action.payload;
          return { ...state, paletteMode: action.payload, layerRenderModes: allModes };
      }
      return {
          ...state,
          paletteMode: action.payload,
          layerRenderModes: { ...state.layerRenderModes, [state.currentLayerIndex]: action.payload }
      };
    }
    case 'SET_PALETTE_GRADIENT_ANGLE': {
      const currentParams = state.layerGradParams[state.currentLayerIndex] || GRADIENT_DEFAULTS;
      if (state.paletteApplyToAllActive) {
          const allParams: Record<number, LayerGradParams> = {};
          for (let i = 0; i < state.totalLayers; i++) {
              allParams[i] = { ...(state.layerGradParams[i] || GRADIENT_DEFAULTS), angle: action.payload };
          }
          return { ...state, layerGradParams: allParams };
      }
      return {
          ...state,
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
          return { ...state, layerGradParams: allParams };
      }
      return {
          ...state,
          layerGradParams: { ...state.layerGradParams, [state.currentLayerIndex]: { ...currentParams, intensity: action.payload } }
      };
    }
    case 'SET_PALETTE_GRADIENT_TYPE': {
      const currentParams = state.layerGradParams[state.currentLayerIndex] || GRADIENT_DEFAULTS;
      if (state.paletteApplyToAllActive) {
          const allParams: Record<number, LayerGradParams> = {};
          for (let i = 0; i < state.totalLayers; i++) {
              allParams[i] = { ...(state.layerGradParams[i] || GRADIENT_DEFAULTS), gradType: action.payload };
          }
          return { ...state, layerGradParams: allParams };
      }
      return {
          ...state,
          layerGradParams: { ...state.layerGradParams, [state.currentLayerIndex]: { ...currentParams, gradType: action.payload } }
      };
    }
    case 'RESET_DRAWING_VIEW':
      return { ...state, drawingZoom: 1, drawingPan: { x: 0, y: 0 } };
    case 'ADD_SHAPE': {
      const newShapes = [...state.shapes, action.payload];
      const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
      
      return {
        ...state,
        shapes: newShapes,
        history,
        historyIndex: index,
      };
    }
    case 'ADD_SHAPES': {
        const newShapes = [...state.shapes, ...action.payload];
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        
        return {
          ...state,
          shapes: newShapes,
          history,
          historyIndex: index,
        };
      }
    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];
      
      // Preserve current layer UNLESS totalLayers changed (layer creation/deletion)
      // If totalLayers changed, clamp currentLayerIndex to valid range
      const layerIndexToUse = snapshot.totalLayers !== state.totalLayers
        ? Math.min(state.currentLayerIndex, snapshot.totalLayers - 1)
        : state.currentLayerIndex;
      
      const currentLayerZ = layerIndexToUse * -BASE_DEPTH_STEP;
      const hasShapesInCurrentLayer = snapshot.shapes.some(s => s.zIndex === currentLayerZ);
      
      // Restore snapshot WITHOUT changing active layer (unless layer count changed)
      return {
        ...state,
        shapes: snapshot.shapes,
        totalLayers: snapshot.totalLayers,
        currentLayerIndex: layerIndexToUse,
        camera: { ...state.camera, z: layerIndexToUse * -BASE_DEPTH_STEP, rotation: 0 },
        hiddenLayers: state.hiddenLayers, // Preserve current visibility (view-only, not undoable)
        locked3DLayers: snapshot.locked3DLayers,
        layerRenderModes: snapshot.layerRenderModes,
        layerGradParams: snapshot.layerGradParams,
        layerBrushSettings: snapshot.layerBrushSettings,
        historyIndex: newIndex,
        isDrawInside: hasShapesInCurrentLayer ? state.isDrawInside : false,
        isDrawBehind: hasShapesInCurrentLayer ? state.isDrawBehind : false
      };
    }
    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];
      
      // Preserve current layer UNLESS totalLayers changed (layer creation/deletion)
      // If totalLayers changed, clamp currentLayerIndex to valid range
      const layerIndexToUse = snapshot.totalLayers !== state.totalLayers
        ? Math.min(state.currentLayerIndex, snapshot.totalLayers - 1)
        : state.currentLayerIndex;
      
      const currentLayerZ = layerIndexToUse * -BASE_DEPTH_STEP;
      const hasShapesInCurrentLayer = snapshot.shapes.some(s => s.zIndex === currentLayerZ);
      
      // Restore snapshot WITHOUT changing active layer (unless layer count changed)
      return {
        ...state,
        shapes: snapshot.shapes,
        totalLayers: snapshot.totalLayers,
        currentLayerIndex: layerIndexToUse,
        camera: { ...state.camera, z: layerIndexToUse * -BASE_DEPTH_STEP, rotation: 0 },
        hiddenLayers: state.hiddenLayers, // Preserve current visibility (view-only, not undoable)
        locked3DLayers: snapshot.locked3DLayers,
        layerRenderModes: snapshot.layerRenderModes,
        layerGradParams: snapshot.layerGradParams,
        layerBrushSettings: snapshot.layerBrushSettings,
        historyIndex: newIndex,
        isDrawInside: hasShapesInCurrentLayer ? state.isDrawInside : false,
        isDrawBehind: hasShapesInCurrentLayer ? state.isDrawBehind : false
      };
    }
    case 'SET_MODE':
      if (action.payload === 'cinematic') {
          return {
              ...state,
              mode: action.payload,
              tool: 'brush', // Reset tool when entering cinematic
          };
      }
      return { ...state, mode: action.payload };
    case 'SET_TOOL':
      if (action.payload === 'move') {
          return {
              ...state,
              tool: 'move',
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
        isOrganicMode: action.payload === 'line' ? false : state.isOrganicMode
      };
    case 'SET_CINEMATIC_TYPE':
      return { ...state, cinematicType: action.payload };
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
          const nextBrush = state.layerBrushSettings[nextIndex] || { thickness: state.currentLineThickness, mode: state.lineMode };
          return {
              ...state,
              currentLayerIndex: nextIndex,
              camera: { ...state.camera, z: newZ, rotation: 0 },
              isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
              isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
              paletteMode: state.layerRenderModes[nextIndex] || 'flat',
              currentLineThickness: nextBrush.thickness,
              lineMode: nextBrush.mode
          };
      } else if (state.totalLayers < MAX_LAYERS) {
          // Create new layer (always empty) - Save to history
          const nextIndex = state.currentLayerIndex + 1;
          const newZ = nextIndex * -BASE_DEPTH_STEP;
          
          const newState = {
              ...state,
              currentLayerIndex: nextIndex,
              totalLayers: state.totalLayers + 1,
              camera: { ...state.camera, z: newZ, rotation: 0 },
              isDrawInside: false,
              isDrawBehind: false,
              paletteMode: 'flat',
              currentLineThickness: state.currentLineThickness,
              lineMode: state.lineMode
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
            const prevBrush = state.layerBrushSettings[prevIndex] || { thickness: state.currentLineThickness, mode: state.lineMode };
            return {
                ...state,
                currentLayerIndex: prevIndex,
                camera: { ...state.camera, z: newZ, rotation: 0 },
                isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
                isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
                paletteMode: state.layerRenderModes[prevIndex] || 'flat',
                currentLineThickness: prevBrush.thickness,
                lineMode: prevBrush.mode
            };
        }
        return state;
    }
    case 'SET_CURRENT_LAYER': {
        const targetIndex = action.payload;
        if (targetIndex === state.currentLayerIndex) return state;
        if (targetIndex < 0 || targetIndex >= state.totalLayers) return state;
        const newZ = targetIndex * -BASE_DEPTH_STEP;
        const hasShapesInNewLayer = state.shapes.some(s => s.zIndex === newZ);
        const targetBrush = state.layerBrushSettings[targetIndex] || { thickness: state.currentLineThickness, mode: state.lineMode };
        return {
            ...state,
            currentLayerIndex: targetIndex,
            camera: { ...state.camera, z: newZ, rotation: 0 },
            isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
            isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
            paletteMode: state.layerRenderModes[targetIndex] || 'flat',
            currentLineThickness: targetBrush.thickness,
            lineMode: targetBrush.mode
        };
    }
    case 'SET_FOCAL_LENGTH':
      return { ...state, focalLength: action.payload };
    case 'SET_VIEW_ZOOM_OFFSET':
      return { ...state, viewZoomOffset: action.payload };
    case 'SET_DRAWING_ZOOM':
      return { 
          ...state, 
          drawingZoom: action.payload.zoom,
          drawingPan: action.payload.pan || state.drawingPan
      };
    case 'TOGGLE_DARK_MODE':
      return { ...state, isDarkMode: !state.isDarkMode };
    case 'SET_FX_INTENSITY':
      return {
          ...state,
          postProcessing: {
              ...state.postProcessing,
              [action.payload.fx]: action.payload.value
          }
      };
    case 'SET_PARTICLE_TYPE':
      return {
          ...state,
          postProcessing: {
              ...state.postProcessing,
              particleType: action.payload
          }
      };
    case 'TOGGLE_FX':
      return {
          ...state,
          postProcessingEnabled: {
              ...state.postProcessingEnabled,
              [action.payload]: !state.postProcessingEnabled[action.payload]
          },
          postProcessingSnapshot: null,
          fxMasterEnabled: true,
      };
    case 'TOGGLE_FX_MASTER': {
      const px = state.postProcessingEnabled;
      const hasActiveEffects = Object.values(px).some(v => v);
      if (hasActiveEffects && state.postProcessingSnapshot === null) {
          const allOff = Object.fromEntries(
              Object.keys(px).map(k => [k, false])
          ) as PostProcessingEnabled;
          return {
              ...state,
              postProcessingSnapshot: { ...px } as PostProcessingEnabled,
              postProcessingEnabled: allOff,
              fxMasterEnabled: false,
          };
      } else if (state.postProcessingSnapshot !== null) {
          return {
              ...state,
              postProcessingEnabled: state.postProcessingSnapshot,
              postProcessingSnapshot: null,
              fxMasterEnabled: Object.values(state.postProcessingSnapshot).some(v => v),
          };
      } else {
          return state;
      }
    }
    case 'TOGGLE_PALETTE_APPLY_TO_ALL': {
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
          shapes: [],
          history: [{
              shapes: [],
              totalLayers: 1,
              currentLayerIndex: 0,
              hiddenLayers: [],
              locked3DLayers: [],
              layerRenderModes: {},
              layerGradParams: {},
              layerBrushSettings: {}
          }],
          historyIndex: 0,
          currentLayerIndex: 0,
          totalLayers: 1,
          camera: { x: 0, y: 0, z: 0, rotation: 0 },
          exportRequest: null,
          isExporting: false,
          hiddenLayers: [],
          locked3DLayers: [],
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
      }
    case 'LOAD_PROJECT':
      // Ensure we merge postProcessing settings correctly to avoid undefined values
      // Legacy migration: drop risoInkBlend if present (was never in stable releases)
      const incomingPostProcessing: any = action.payload.postProcessing || {};
      const mergedPostProcessing = {
          ...initialState.postProcessing,
          ...incomingPostProcessing
      };
      delete (mergedPostProcessing as any).risoInkBlend;
      // Legacy migration: grungeOverlay -> grunge
      const incomingPostProcessingEnabled: any = action.payload.postProcessingEnabled || {};
      const mergedPostProcessingEnabled = {
          ...initialState.postProcessingEnabled,
          ...incomingPostProcessingEnabled,
          grunge: incomingPostProcessingEnabled.grunge ?? incomingPostProcessingEnabled.grungeOverlay ?? false
      };
      delete (mergedPostProcessingEnabled as any).grungeOverlay;
      
      const loadedLayerRenderModes = action.payload.layerRenderModes || {};
      const rawGradParams = action.payload.layerGradParams || {};
      const loadedLayerGradParams = Object.fromEntries(
          Object.entries(rawGradParams).map(([k, v]: [string, any]) => [k, { ...GRADIENT_DEFAULTS, ...v }])
      ) as Record<number, LayerGradParams>;
      const loadedLayerBrushSettings = action.payload.layerBrushSettings || {};
      
      const loadedPaletteId = action.payload.activePaletteId || 'primary';
      const loadedPalette = loadedPaletteId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE;

      // ── Whitelist validation: only accept known keys with type guards ──
      const safeShapes = Array.isArray(action.payload.shapes) ? action.payload.shapes : [];
      const safeTotalLayers = (typeof action.payload.totalLayers === 'number' && action.payload.totalLayers > 0)
          ? Math.min(action.payload.totalLayers, MAX_LAYERS) : 1;
      const safeHiddenLayers = Array.isArray(action.payload.hiddenLayers) ? action.payload.hiddenLayers : [];
      const safeLocked3DLayers = Array.isArray(action.payload.locked3DLayers) ? action.payload.locked3DLayers : [];
      const safeTool = (typeof action.payload.tool === 'string' && ['brush', 'eraser', 'line', 'move', 'lasso'].includes(action.payload.tool))
          ? action.payload.tool : 'brush';
      const safeLineMode = (typeof action.payload.lineMode === 'string' && ['tapered', 'uniform', 'ink'].includes(action.payload.lineMode))
          ? action.payload.lineMode : 'tapered';
      const safeLineThickness = (typeof action.payload.currentLineThickness === 'number' && action.payload.currentLineThickness > 0)
          ? action.payload.currentLineThickness : 25;
      const safeIsDarkMode = typeof action.payload.isDarkMode === 'boolean' ? action.payload.isDarkMode : state.isDarkMode;
      const safeCinematicType = (typeof action.payload.cinematicType === 'string' && ['forward', 'spiral', 'yoyo', 'pulse', 'twist', 'arc', 'crane', 'truck', 'orbit', 'zoom'].includes(action.payload.cinematicType))
          ? action.payload.cinematicType as CinematicType : state.cinematicType;
      const rawProjectName = typeof action.payload.projectName === 'string'
          ? action.payload.projectName.slice(0, 100) : state.projectName;
      // Backward compat: legacy .dior files (pre-v2.1.0) saved the literal 'Untitled Project'
      // instead of the sentinel. Normalize so display goes through i18n.
      const safeProjectName = rawProjectName === 'Untitled Project' ? UNTITLED_PROJECT_SENTINEL : rawProjectName;
      const safeFocalLength = typeof action.payload.focalLength === 'number' ? action.payload.focalLength : state.focalLength;
      const safeViewZoomOffset = typeof action.payload.viewZoomOffset === 'number' ? action.payload.viewZoomOffset : state.viewZoomOffset;
      const safeLayerSpacingFactor = typeof action.payload.layerSpacingFactor === 'number' ? action.payload.layerSpacingFactor : state.layerSpacingFactor;
      const safeCinematicSpeed = typeof action.payload.cinematicSpeed === 'number' ? action.payload.cinematicSpeed : state.cinematicSpeed;
      const safeIsHandheldEnabled = typeof action.payload.isHandheldEnabled === 'boolean' ? action.payload.isHandheldEnabled : state.isHandheldEnabled;
      const safeHandheldIntensity = (typeof action.payload.handheldIntensity === 'string' && ['low', 'medium', 'high'].includes(action.payload.handheldIntensity as string)) ? action.payload.handheldIntensity as HandheldIntensity : state.handheldIntensity;
      const safeFxMasterEnabled = typeof action.payload.fxMasterEnabled === 'boolean' ? action.payload.fxMasterEnabled : true;
      const safePaletteApplyToAllActive = typeof (action.payload as any).paletteApplyToAllActive === 'boolean'
          ? (action.payload as any).paletteApplyToAllActive : false;
      const safePaletteApplyToAllSnapshot = ((action.payload as any).paletteApplyToAllSnapshot &&
          typeof (action.payload as any).paletteApplyToAllSnapshot === 'object')
          ? (action.payload as any).paletteApplyToAllSnapshot : null;

      // Create initial history snapshot with loaded state
      const initialSnapshot: HistorySnapshot = {
          shapes: safeShapes,
          totalLayers: safeTotalLayers,
          currentLayerIndex: 0,
          hiddenLayers: safeHiddenLayers,
          locked3DLayers: safeLocked3DLayers,
          layerRenderModes: loadedLayerRenderModes,
          layerGradParams: loadedLayerGradParams,
          layerBrushSettings: loadedLayerBrushSettings
      };

      return {
          ...state,
          // Whitelisted fields only — no ...action.payload spread
          shapes: safeShapes,
          totalLayers: safeTotalLayers,
          isDarkMode: safeIsDarkMode,
          cinematicType: safeCinematicType,
          projectName: safeProjectName,
          postProcessing: mergedPostProcessing,
          postProcessingEnabled: mergedPostProcessingEnabled,
          fxMasterEnabled: safeFxMasterEnabled,
          // Ensure critical state is reset/set correctly
          history: [initialSnapshot],
          historyIndex: 0,
          camera: { x: 0, y: 0, z: 0, rotation: 0 },
          currentLayerIndex: 0,
          mode: 'drawing',
          tool: safeTool,
          hiddenLayers: safeHiddenLayers,
          locked3DLayers: safeLocked3DLayers,
          drawingZoom: 1,
          drawingPan: { x: 0, y: 0 },
          layerRenderModes: loadedLayerRenderModes,
          layerGradParams: loadedLayerGradParams,
          layerBrushSettings: loadedLayerBrushSettings,
          paletteMode: loadedLayerRenderModes[0] || 'flat',
          currentLineThickness: safeLineThickness,
          lineMode: safeLineMode,
          activePaletteId: loadedPaletteId,
          palette: loadedPalette,
          focalLength: safeFocalLength,
          viewZoomOffset: safeViewZoomOffset,
          layerSpacingFactor: safeLayerSpacingFactor,
          cinematicSpeed: safeCinematicSpeed,
          isHandheldEnabled: safeIsHandheldEnabled,
          handheldIntensity: safeHandheldIntensity,
          shouldFitToView: true,
          isDrawing: false,
          paletteApplyToAllActive: safePaletteApplyToAllActive,
          paletteApplyToAllSnapshot: safePaletteApplyToAllSnapshot,
      };
    case 'COMPLETE_FIT_TO_VIEW':
        return { ...state, shouldFitToView: false };
    case 'TOGGLE_LAYER_VISIBILITY': {
        const layerIndex = action.payload;
        const isHidden = state.hiddenLayers.includes(layerIndex);
        return {
            ...state,
            hiddenLayers: isHidden 
                ? state.hiddenLayers.filter(i => i !== layerIndex)
                : [...state.hiddenLayers, layerIndex]
        };
    }
    case 'TOGGLE_3D_LOCK': {
        const layerIndex = action.payload;
        const isLocked = state.locked3DLayers.includes(layerIndex);
        return {
            ...state,
            locked3DLayers: isLocked 
                ? state.locked3DLayers.filter(i => i !== layerIndex)
                : [...state.locked3DLayers, layerIndex]
        };
    }
    case 'MOVE_LAYER': {
        const { layerIndex, deltaX, deltaY } = action.payload;
        const newShapes = state.shapes.map(shape => {
            if (shape.zIndex === layerIndex * -BASE_DEPTH_STEP) {
                const updatedShape = {
                    ...shape,
                    points: shape.points.map(point => ({
                        x: point.x + deltaX,
                        y: point.y + deltaY,
                        pressure: point.pressure
                    }))
                };

                if (shape.originalPoints) {
                    updatedShape.originalPoints = shape.originalPoints.map(point => ({
                        x: point.x + deltaX,
                        y: point.y + deltaY,
                        pressure: point.pressure
                    }));
                }
                return updatedShape;
            }
            return shape;
        });
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        return {
            ...state,
            shapes: newShapes,
            history,
            historyIndex: index
        };
    }
    case 'TRANSFORM_LAYER': {
        const { layerIndex, transform } = action.payload;
        const { rotation, scale, dx, dy, centerX, centerY } = transform;
        const sin = Math.sin(rotation);
        const cos = Math.cos(rotation);

        const newShapes = state.shapes.map(shape => {
            if (shape.zIndex === layerIndex * -BASE_DEPTH_STEP) {
                // Handle Text specific transforms
                let newProps = {};
                if (shape.type === 'text') {
                    newProps = {
                        fontSize: (shape.fontSize || 40) * scale,
                        rotation: (shape.rotation || 0) + rotation
                    };
                }

                const transformPoint = (point: Point) => {
                    // 1. Translate to origin
                    const ox = point.x - centerX;
                    const oy = point.y - centerY;
                    
                    // 2. Rotate & Scale
                    const rx = (ox * cos - oy * sin) * scale;
                    const ry = (ox * sin + oy * cos) * scale;

                    // 3. Translate back & Apply delta
                    return {
                        x: rx + centerX + dx,
                        y: ry + centerY + dy,
                        pressure: point.pressure
                    };
                };

                const updatedShape = {
                    ...shape,
                    ...newProps,
                    points: shape.points.map(transformPoint)
                };

                if (shape.originalPoints) {
                    updatedShape.originalPoints = shape.originalPoints.map(transformPoint);
                }

                return updatedShape;
            }
            return shape;
        });
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        return {
            ...state,
            shapes: newShapes,
            history,
            historyIndex: index
        };
    }
    case 'FLIP_LAYER': {
        const { layerIndex, direction, centerX, centerY } = action.payload;
        const layerZ = layerIndex * -BASE_DEPTH_STEP;

        const newShapes = state.shapes.map(shape => {
            if (shape.zIndex !== layerZ) return shape;

            const flipPoint = (point: Point): Point => {
                if (direction === 'horizontal') {
                    return { ...point, x: 2 * centerX - point.x };
                } else {
                    return { ...point, y: 2 * centerY - point.y };
                }
            };

            let newProps: Partial<Shape> = {};
            if (shape.type === 'text') {
                // Negate rotation on flip
                newProps.rotation = -(shape.rotation || 0);
                // Swap text alignment on horizontal flip
                if (direction === 'horizontal') {
                    if (shape.align === 'left') newProps.align = 'right';
                    else if (shape.align === 'right') newProps.align = 'left';
                }
            }

            const updatedShape: Shape = {
                ...shape,
                ...newProps,
                points: shape.points.map(flipPoint)
            };

            if (shape.originalPoints) {
                updatedShape.originalPoints = shape.originalPoints.map(flipPoint);
            }

            return updatedShape;
        });

        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        return {
            ...state,
            shapes: newShapes,
            history,
            historyIndex: index
        };
    }
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
        const nextBrush = newBrushSettings[newCurrentLayer] || { thickness: state.currentLineThickness, mode: state.lineMode };
        
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        
        return {
            ...state,
            shapes: newShapes,
            totalLayers: state.totalLayers - 1,
            currentLayerIndex: newCurrentLayer,
            camera: { ...state.camera, z: newCurrentLayer * -BASE_DEPTH_STEP, rotation: 0 },
            hiddenLayers: newHidden,
            locked3DLayers: newLocked,
            layerRenderModes: newRenderModes,
            layerGradParams: newGradParams,
            layerBrushSettings: newBrushSettings,
            paletteMode: newRenderModes[newCurrentLayer] || 'flat',
            currentLineThickness: nextBrush.thickness,
            lineMode: nextBrush.mode,
            history,
            historyIndex: index
        };
    }
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
            isDrawBehind: false
        };
        
        const shapesWithText = [...state.shapes, textShape];
        const { history: textHistory, index: textIndex } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: shapesWithText }));
        
        return {
            ...state,
            shapes: shapesWithText,
            history: textHistory,
            historyIndex: textIndex,
            textSession: { ...state.textSession, isActive: false, content: '' }
        };
    case 'CANCEL_TEXT_SESSION':
        return {
            ...state,
            textSession: { ...state.textSession, isActive: false, content: '' }
        };
    case 'SET_POINT_OF_INTEREST':
        return { ...state, pointOfInterest: action.payload };
    case 'CLEAR_POINT_OF_INTEREST':
        return { ...state, pointOfInterest: null };
    case 'SET_CINEMATIC_SPEED':
        return { ...state, cinematicSpeed: action.payload };
    case 'SET_LINE_THICKNESS': {
        const thickness = action.payload;
        const layerIdx = state.currentLayerIndex;
        const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.lineMode, thickness: state.currentLineThickness };
        const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };
        
        // Also update shapes immediately (for onChange events)
        const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
        const newShapes = state.shapes.map(s => {
             if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
                 const effectiveMode = s.lineMode || currentSettings.mode;
                 const newPoints = generateStrokeForMode(effectiveMode, s.originalPoints, thickness);
                 return { ...s, lineThickness: thickness, lineMode: effectiveMode, points: newPoints };
             }
             return s;
        });

        return { ...state, currentLineThickness: thickness, layerBrushSettings: newLayerSettings, shapes: newShapes };
    }
    case 'SET_LINE_THICKNESS_PREVIEW': {
        const thickness = action.payload;
        const layerIdx = state.currentLayerIndex;
        const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.lineMode, thickness: state.currentLineThickness };
        const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };
        
        const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
        const newShapes = state.shapes.map(s => {
             if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
                 const effectiveMode = s.lineMode || currentSettings.mode;
                 const newPoints = generateStrokeForMode(effectiveMode, s.originalPoints, thickness);
                 return { ...s, lineThickness: thickness, lineMode: effectiveMode, points: newPoints };
             }
             return s;
        });

        // Store current shapes state if not already stored
        return { 
            ...state, 
            currentLineThickness: thickness,
            layerBrushSettings: newLayerSettings,
            lineThicknessBeforePreview: state.lineThicknessBeforePreview || state.shapes,
            shapes: newShapes
        };
    }
    case 'COMMIT_LINE_THICKNESS': {
        const prevShapes = state.lineThicknessBeforePreview;
        if (prevShapes) {
             const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(state));
             return { ...state, lineThicknessBeforePreview: null, history, historyIndex: index };
        }
        return { ...state, lineThicknessBeforePreview: null };
    }
    case 'TOGGLE_HANDHELD':
        return { ...state, isHandheldEnabled: !state.isHandheldEnabled };
    case 'SET_HANDHELD_INTENSITY':
        return { ...state, handheldIntensity: action.payload };
    case 'SET_LINE_MODE': {
        const mode = action.payload;
        const layerIdx = state.currentLayerIndex;
        const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.lineMode, thickness: state.currentLineThickness };
        const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, mode } };
        const thickness = currentSettings.thickness;

        const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
        const newShapes = state.shapes.map(s => {
             if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
                 let newPoints: Point[] = [];
                 newPoints = generateStrokeForMode(mode, s.originalPoints, thickness);
                 return { ...s, lineThickness: thickness, lineMode: mode, points: newPoints };
             }
             return s;
        });
        
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        
        return { 
            ...state, 
            lineMode: mode, 
            layerBrushSettings: newLayerSettings,
            shapes: newShapes,
            history, 
            historyIndex: index
        };
    }
    case 'SET_LAYER_SPACING_FACTOR':
        return { ...state, layerSpacingFactor: action.payload };
    case 'SET_PROJECT_NAME':
        return { ...state, projectName: action.payload };
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
            historyIndex: index
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
            historyIndex: index
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
        const clonedShapes = sourceShapes.map(s => ({
            ...s,
            id: Date.now() + Math.random().toString(),
            zIndex: newZ
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
        newBrushSettings[newLayerIndex] = newBrushSettings[layerIndex] ? { ...newBrushSettings[layerIndex] } : { thickness: state.currentLineThickness, mode: state.lineMode };

        // Sync global
        const nextBrush = newBrushSettings[newLayerIndex];
        const nextGradP = newGradParams[newLayerIndex] || GRADIENT_DEFAULTS;

        const newState = {
            ...state,
            shapes: [...newShapes, ...clonedShapes],
            totalLayers: state.totalLayers + 1,
            currentLayerIndex: newLayerIndex,
            camera: { ...state.camera, z: newLayerIndex * -BASE_DEPTH_STEP, rotation: 0 },
            hiddenLayers: newHidden,
            locked3DLayers: newLocked,
            layerRenderModes: newRenderModes,
            layerGradParams: newGradParams,
            layerBrushSettings: newBrushSettings,
            paletteMode: newRenderModes[newLayerIndex] || 'flat',
            paletteGradientAngle: nextGradP.angle,
            paletteGradientIntensity: nextGradP.intensity,
            paletteGradientType: nextGradP.gradType || 'solid',
            currentLineThickness: nextBrush.thickness,
            lineMode: nextBrush.mode
        };
        
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(newState));
        
        return {
            ...newState,
            history,
            historyIndex: index
        };
    }
    case 'DISMISS_ONBOARDING':
        return { ...state, isOnboardingVisible: false };
    case 'SET_ACTIVE_PALETTE': {
        const newId = action.payload;
        if (newId === state.activePaletteId) return state;
        
        const newPalette = newId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE;
        const oldPalette = state.palette;
        
        // Map shapes to new palette colors based on index
        const newShapes = state.shapes.map(shape => {
            // Find index in OLD palette
            const idx = oldPalette.indexOf(shape.color);
            
            // If color exists in old palette and we have a corresponding color in new palette
            if (idx !== -1 && idx < newPalette.length) {
                return { ...shape, color: newPalette[idx] };
            }
            return shape;
        });
        
        const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
        
        return {
            ...state,
            activePaletteId: newId,
            palette: newPalette,
            shapes: newShapes,
            history,
            historyIndex: index
        };
    }
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