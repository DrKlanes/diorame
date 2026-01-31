import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// --- Types ---

export type Point = { x: number; y: number; pressure?: number };

export interface Shape {
  id: string;
  type?: 'stroke' | 'text';
  points: Point[];
  color: string;
  zIndex: number; // For layer depth
  isEraser?: boolean;
  isDrawInside?: boolean;
  isDrawBehind?: boolean;
  text?: string;
  font?: 'noir' | 'mansion' | 'pharma' | 'comic' | 'dungeons';
  align?: 'left' | 'center' | 'right';
  fontSize?: number;
  rotation?: number;
  originalPoints?: Point[]; // Store spine for re-generation
  lineThickness?: number; // Store thickness value
  lineMode?: LineMode; // Store line mode (tapered or uniform)
}

export type AppMode = 'drawing' | 'cinematic';
export type ToolType = 'brush' | 'eraser' | 'text' | 'move' | 'line';
export type CinematicType = 'forward' | 'spiral' | 'yoyo' | 'pulse' | 'twist' | 'arc' | 'crane' | 'truck' | 'orbit' | 'zoom';
export type ExportType = 'none' | 'png' | 'webm' | 'mp4' | 'svg' | 'svgz';
export type LineMode = 'tapered' | 'uniform';

export type PostProcessingSettings = {
    grain: number;      // 0 to 1
    vignette: number;   // 0 to 1
    distortion: number; // 0 to 1
    dof: number;        // 0 to 1 (Intensity)
    focusDist: number;  // Distance from camera to focus plane
    focusTargetLayer: number; // Layer index to track (-1 for manual)
    chromaticAberration: number; // 0 to 1
    fog: number;        // 0 to 1
    particles: number;  // 0 to 1 (Intensity/Amount)
    particleType: 'circle' | 'square' | 'stroke'; // New: Type of particles
    wiggle: number;     // 0 (Light), 0.5 (Medium), 1 (Heavy)
    glow: number;       // 0 to 1 (Glow intensity)
    riso: number;       // 0 to 1 (RISO texture intensity)
    pixelArtSize: number; // 2 to 16 (Pixel size)
    pixelArtDepth: number; // 2 to 32 (Color levels per channel)
    pixelArtDither: number; // 0 to 1 (Dither intensity, 0 = Off)
    grungeIntensity: number; // 0 (Subtle), 0.5 (Medium), 1 (Intense)
};

export type PostProcessingEnabled = {
    grain: boolean;
    vignette: boolean;
    distortion: boolean;
    dof: boolean;
    wiggle: boolean;
    chromaticAberration: boolean;
    fog: boolean;
    particles: boolean;
    glow: boolean;
    riso: boolean;
    pixelArt: boolean;
    grungeOverlay: boolean;
};

export type HandheldIntensity = 'low' | 'medium' | 'high';

export type TextSession = {
    isActive: boolean;
    x: number;
    y: number;
    content: string;
    font: 'noir' | 'mansion' | 'pharma' | 'comic' | 'dungeons';
    align: 'left' | 'center' | 'right';
};

export type HistorySnapshot = {
    shapes: Shape[];
    totalLayers: number;
    currentLayerIndex: number;
    hiddenLayers: number[];
    locked3DLayers: number[];
    layerRenderModes: Record<number, 'flat' | 'grad'>;
    layerGradParams: Record<number, { angle: number; intensity: number }>;
    layerBrushSettings: Record<number, { thickness: number; mode: LineMode }>;
};

export interface AppState {
  shapes: Shape[];
  palette: string[];
  activePaletteId: 'primary' | 'alternative'; // New
  currentColorIndex: number;
  mode: AppMode;
  tool: ToolType;
  textSession: TextSession;
  cinematicType: CinematicType;
  camera: { x: number; y: number; z: number; rotation: number }; 
  currentLayerIndex: number;
  totalLayers: number;
  focalLength: number;
  viewZoomOffset: number; // New: Manual zoom offset for View mode
  drawingZoom: number;    // New: 2D Canvas Zoom for Drawing
  drawingPan: { x: number, y: number }; // New: 2D Canvas Pan for Drawing
  isDarkMode: boolean;    // New: Dark paper mode
  layerSpacingFactor: number; // New: Z-spacing multiplier for layers in VIEW mode (0.5 to 2.0, default 1.0)
  postProcessing: PostProcessingSettings; 
  postProcessingEnabled: PostProcessingEnabled;
  history: HistorySnapshot[];
  historyIndex: number;
  exportRequest: ExportType; 
  isExporting: boolean; 
  hiddenLayers: number[]; // Indices of hidden layers
  locked3DLayers: number[]; // Indices of layers with 3D Lock (fixed in VIEW mode)
  isWelcomeModalOpen: boolean;
  isOnboardingVisible: boolean; // New: Onboarding overlay on canvas
  isUIHidden: boolean; // New: Toggle UI visibility in View mode
  isSymmetryEnabled: boolean; // New: Vertical Symmetry Mode
  paletteMode: 'flat' | 'grad'; // New: Palette Rendering Mode
  layerRenderModes: Record<number, 'flat' | 'grad'>; // New: Per-layer render mode
  layerGradParams: Record<number, { angle: number; intensity: number }>; // New: Per-layer gradient params
  layerBrushSettings: Record<number, { thickness: number; mode: LineMode }>; // New: Per-layer brush settings
  paletteGradientAngle: number; // New: Gradient Angle in degrees
  paletteGradientIntensity: number; // New: Gradient Intensity (0 to 1)
  pointOfInterest: { x: number; y: number; z: number } | null; // New: Point of Interest for camera focus
  cinematicSpeed: number; // New: Speed multiplier for cinematic moves (0.1 to 1.0)
  isDrawBehind: boolean; // New: Draw Behind mode
  isDrawInside: boolean; // New: Draw Inside (Alpha Lock) mode
  isOrganicMode: boolean; // New: Organic/Fluid line mode
  currentLineThickness: number; // New: Line Thickness (continuous value)
  lineThicknessBeforePreview: Shape[] | null; // Store shapes before thickness preview
  isHandheldEnabled: boolean; // New: Handheld camera shake
  handheldIntensity: HandheldIntensity; // New: Handheld shake intensity
  lineMode: LineMode; // New: Line mode (tapered or uniform)
  projectName: string; // New: Project name for saving
}

// --- Constants ---
export const BASE_DEPTH_STEP = 150;  
export const MAX_LAYERS = 10;
export const APP_VERSION = "1.7.4"; // Release version
export const MAX_HISTORY_STEPS = 50; // History limit

export const FIXED_PALETTE = [
    '#000000',
    '#2f2f30',
    '#d0ddd9',
    '#FFFFFF',
    '#2B5735',
    '#3E7A66',
    '#42AA6C',
    '#6FD452',
    '#8BF989',
    '#223d57',
    '#4261a1',
    '#387fba',
    '#5ba3d3',
    '#b2e0e1',
    '#80355b',
    '#8569cd',
    '#bd301e',
    '#e73d3d',
    '#E66FB1',
    '#F2BDC1',
    '#BD9357',
    '#ed8d51',
    '#F5DB6A',
    '#FDEAC9',
];

export const ALTERNATIVE_PALETTE = [
    // Row 1
    '#120F16', // Black
    '#2A2F38', // Dark Grey
    '#D0D0C8', // Light Grey
    '#F2F0EA', // Off White
    '#2F3D1E', // Dark Green
    '#355A1E', // Green
    '#6E7B3F', // Olive
    '#9DBA7A', // Light Green
    
    // Row 2
    '#c0af8a', // Beige
    '#27454A', // Dark Teal
    '#4E5F78', // Blue Grey
    '#5F7FA6', // Blue
    '#5C8F8C', // Teal
    '#8FA9C4', // Light Blue
    '#422c50', // Dark Purple
    '#7476db', // Grey Blue
    
    // Row 3
    '#661e40', // Dark Maroon
    '#a53729', // Rust
    '#C94A4A', // Red
    '#dabec4', // Dark Brown
    '#8A5231', // Brown
    '#D07A2D', // Orange
    '#C2B84D', // Yellow Green
    '#e9dd71'  // Yellow
];

export const generateTaperedStroke = (points: {x:number, y:number}[], maxThickness: number = 20) => {
    if (points.length < 2) return points;

    const leftSide: {x:number, y:number}[] = [];
    const rightSide: {x:number, y:number}[] = [];
    const totalLength = points.length;

    for (let i = 0; i < totalLength; i++) {
        const curr = points[i];
        // Determine direction
        let dirX = 0, dirY = 0;
        if (i === 0) {
            const next = points[i + 1];
            dirX = next.x - curr.x;
            dirY = next.y - curr.y;
        } else if (i === totalLength - 1) {
            const prev = points[i - 1];
            dirX = curr.x - prev.x;
            dirY = curr.y - prev.y;
        } else {
            const prev = points[i - 1];
            const next = points[i + 1];
            dirX = next.x - prev.x;
            dirY = next.y - prev.y;
        }

        const len = Math.hypot(dirX, dirY);
        if (len === 0) continue;
        const normX = -dirY / len;
        const normY = dirX / len;

        // Tapering logic
        // 0 -> 1 -> 0 based on progress
        const t = i / (totalLength - 1);
        const thicknessFactor = Math.sin(t * Math.PI); // Simple sine arch
        const halfWidth = (maxThickness / 2) * thicknessFactor;

        leftSide.push({
            x: curr.x + normX * halfWidth,
            y: curr.y + normY * halfWidth
        });
        rightSide.push({
            x: curr.x - normX * halfWidth,
            y: curr.y - normY * halfWidth
        });
    }

    // Combine: Left side forward, Right side reversed
    return [...leftSide, ...rightSide.reverse()];
};

export const generateUniformStroke = (points: {x:number, y:number}[], thickness: number = 20) => {
    if (points.length < 2) return points;

    // Step 1: Densify the input points to ensure consistent width
    // This is crucial for fast strokes with few sample points
    const densifiedPoints: {x:number, y:number}[] = [];
    const targetSegmentLength = Math.max(thickness / 4, 2); // Adaptive based on thickness
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        
        densifiedPoints.push(p1);
        
        // Insert intermediate points if segment is too long
        if (dist > targetSegmentLength) {
            const numSegments = Math.ceil(dist / targetSegmentLength);
            for (let j = 1; j < numSegments; j++) {
                const t = j / numSegments;
                densifiedPoints.push({
                    x: p1.x + dx * t,
                    y: p1.y + dy * t
                });
            }
        }
    }
    densifiedPoints.push(points[points.length - 1]);

    // Step 2: Apply aggressive smoothing using weighted averaging (multiple passes)
    // This creates smooth curves while maintaining point density for uniform width
    let smoothedSpine = [...densifiedPoints];
    const smoothingPasses = 3; // Multiple passes for smoother curves
    const smoothingWeight = 0.3; // How much to blend with neighbors
    
    for (let pass = 0; pass < smoothingPasses; pass++) {
        const tempSpine: {x:number, y:number}[] = [];
        
        for (let i = 0; i < smoothedSpine.length; i++) {
            if (i === 0 || i === smoothedSpine.length - 1) {
                // Keep endpoints as-is
                tempSpine.push(smoothedSpine[i]);
            } else {
                // Weighted average with neighbors
                const prev = smoothedSpine[i - 1];
                const curr = smoothedSpine[i];
                const next = smoothedSpine[i + 1];
                
                tempSpine.push({
                    x: curr.x * (1 - smoothingWeight) + (prev.x + next.x) * smoothingWeight * 0.5,
                    y: curr.y * (1 - smoothingWeight) + (prev.y + next.y) * smoothingWeight * 0.5
                });
            }
        }
        smoothedSpine = tempSpine;
    }

    // Step 3: Generate stroke outline with consistent perpendiculars
    const leftSide: {x:number, y:number}[] = [];
    const rightSide: {x:number, y:number}[] = [];
    const totalLength = smoothedSpine.length;
    const halfWidth = thickness / 2;

    for (let i = 0; i < totalLength; i++) {
        const curr = smoothedSpine[i];
        let dirX = 0, dirY = 0;
        
        if (i === 0 && totalLength > 1) {
            const next = smoothedSpine[i + 1];
            dirX = next.x - curr.x;
            dirY = next.y - curr.y;
        } else if (i > 0) {
            const prev = smoothedSpine[i - 1];
            dirX = curr.x - prev.x;
            dirY = curr.y - prev.y;
        }

        const len = Math.hypot(dirX, dirY);
        if (len === 0) continue;
        
        const normX = -dirY / len;
        const normY = dirX / len;

        leftSide.push({
            x: curr.x + normX * halfWidth,
            y: curr.y + normY * halfWidth
        });
        rightSide.push({
            x: curr.x - normX * halfWidth,
            y: curr.y - normY * halfWidth
        });
    }

    return [...leftSide, ...rightSide.reverse()];
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
  | { type: 'SET_FOCAL_LENGTH'; payload: number }
  | { type: 'SET_VIEW_ZOOM_OFFSET'; payload: number }
  | { type: 'SET_DRAWING_ZOOM'; payload: { zoom: number; pan?: { x: number; y: number } } }
  | { type: 'TOGGLE_DARK_MODE' }
  | { type: 'SET_FX_INTENSITY'; payload: { fx: keyof PostProcessingSettings; value: number } }
  | { type: 'TOGGLE_FX'; payload: keyof PostProcessingEnabled }
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
  | { type: 'TOGGLE_SYMMETRY' }
  | { type: 'SET_PALETTE_MODE'; payload: 'flat' | 'grad' }
  | { type: 'SET_PALETTE_GRADIENT_ANGLE'; payload: number }
  | { type: 'SET_PALETTE_GRADIENT_INTENSITY'; payload: number }
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
  | { type: 'SET_LINE_THICKNESS'; payload: number }
  | { type: 'SET_LINE_THICKNESS_PREVIEW'; payload: number }
  | { type: 'COMMIT_LINE_THICKNESS' }
  | { type: 'TOGGLE_HANDHELD' }
  | { type: 'SET_HANDHELD_INTENSITY'; payload: HandheldIntensity }
  | { type: 'SET_LINE_MODE'; payload: LineMode }
  | { type: 'SET_LAYER_SPACING_FACTOR'; payload: number }
  | { type: 'SET_PROJECT_NAME'; payload: string }
  | { type: 'REORDER_LAYERS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'DUPLICATE_LAYER'; payload: number }
  | { type: 'DISMISS_ONBOARDING' }
  | { type: 'SET_ACTIVE_PALETTE'; payload: 'primary' | 'alternative' };

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
      distortion: 0,
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
      grungeOverlay: false
  },
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
  exportRequest: 'none',
  isExporting: false,
  hiddenLayers: [],
  locked3DLayers: [],
  isWelcomeModalOpen: true,
  isOnboardingVisible: true, // New: Onboarding overlay on canvas
  isUIHidden: false,
  isSymmetryEnabled: false,
  paletteMode: 'flat',
  layerRenderModes: {},
  layerGradParams: {},
  layerBrushSettings: {},
  paletteGradientAngle: 90, // Default Vertical
  paletteGradientIntensity: 0.2,
  pointOfInterest: null,
  cinematicSpeed: 1.0, // Default Normal Speed
  isDrawBehind: false,
  isDrawInside: false,
  isOrganicMode: false,
  currentLineThickness: 25,
  lineThicknessBeforePreview: null,
  isHandheldEnabled: false,
  handheldIntensity: 'medium',
  lineMode: 'tapered',
  projectName: 'Untitled Project' // Default project name
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
    case 'TOGGLE_SYMMETRY':
      return { ...state, isSymmetryEnabled: !state.isSymmetryEnabled };
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
      return { ...state, isOrganicMode: !state.isOrganicMode };
    case 'SET_PALETTE_MODE':
      return { 
          ...state, 
          paletteMode: action.payload,
          layerRenderModes: {
              ...state.layerRenderModes,
              [state.currentLayerIndex]: action.payload
          }
      };
    case 'SET_PALETTE_GRADIENT_ANGLE': {
      const currentParams = state.layerGradParams[state.currentLayerIndex] || { angle: 90, intensity: 0.2 };
      return { 
          ...state, 
          paletteGradientAngle: action.payload,
          layerGradParams: {
              ...state.layerGradParams,
              [state.currentLayerIndex]: { ...currentParams, angle: action.payload }
          }
      };
    }
    case 'SET_PALETTE_GRADIENT_INTENSITY': {
      const currentParams = state.layerGradParams[state.currentLayerIndex] || { angle: 90, intensity: 0.2 };
      return { 
          ...state, 
          paletteGradientIntensity: action.payload,
          layerGradParams: {
              ...state.layerGradParams,
              [state.currentLayerIndex]: { ...currentParams, intensity: action.payload }
          }
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
      const currentLayerZ = snapshot.currentLayerIndex * -BASE_DEPTH_STEP;
      const hasShapesInCurrentLayer = snapshot.shapes.some(s => s.zIndex === currentLayerZ);
      
      // Restore full snapshot
      return {
        ...state,
        shapes: snapshot.shapes,
        totalLayers: snapshot.totalLayers,
        currentLayerIndex: snapshot.currentLayerIndex,
        camera: { ...state.camera, z: snapshot.currentLayerIndex * -BASE_DEPTH_STEP, rotation: 0 },
        hiddenLayers: snapshot.hiddenLayers,
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
      const currentLayerZ = snapshot.currentLayerIndex * -BASE_DEPTH_STEP;
      const hasShapesInCurrentLayer = snapshot.shapes.some(s => s.zIndex === currentLayerZ);
      
      // Restore full snapshot
      return {
        ...state,
        shapes: snapshot.shapes,
        totalLayers: snapshot.totalLayers,
        currentLayerIndex: snapshot.currentLayerIndex,
        camera: { ...state.camera, z: snapshot.currentLayerIndex * -BASE_DEPTH_STEP, rotation: 0 },
        hiddenLayers: snapshot.hiddenLayers,
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
          const nextParams = state.layerGradParams[nextIndex] || { angle: 90, intensity: 0.2 };
          const nextBrush = state.layerBrushSettings[nextIndex] || { thickness: 25, mode: 'tapered' as LineMode };
          return {
              ...state,
              currentLayerIndex: nextIndex,
              camera: { ...state.camera, z: newZ, rotation: 0 },
              isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
              isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
              paletteMode: state.layerRenderModes[nextIndex] || 'flat',
              paletteGradientAngle: nextParams.angle,
              paletteGradientIntensity: nextParams.intensity,
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
              paletteGradientAngle: 90,
              paletteGradientIntensity: 0.2,
              currentLineThickness: 25,
              lineMode: 'tapered'
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
            const prevParams = state.layerGradParams[prevIndex] || { angle: 90, intensity: 0.2 };
            const prevBrush = state.layerBrushSettings[prevIndex] || { thickness: 25, mode: 'tapered' as LineMode };
            return {
                ...state,
                currentLayerIndex: prevIndex,
                camera: { ...state.camera, z: newZ, rotation: 0 },
                isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
                isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
                paletteMode: state.layerRenderModes[prevIndex] || 'flat',
                paletteGradientAngle: prevParams.angle,
                paletteGradientIntensity: prevParams.intensity,
                currentLineThickness: prevBrush.thickness,
                lineMode: prevBrush.mode
            };
        }
        return state;
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
    case 'TOGGLE_FX':
      return {
          ...state,
          postProcessingEnabled: {
              ...state.postProcessingEnabled,
              [action.payload]: !state.postProcessingEnabled[action.payload]
          }
      };
    case 'REQUEST_EXPORT':
      return { ...state, exportRequest: action.payload, isExporting: true };
    case 'FINISH_EXPORT':
      return { ...state, exportRequest: 'none', isExporting: false };
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
          exportRequest: 'none',
          isExporting: false,
          hiddenLayers: [],
          locked3DLayers: [],
          drawingZoom: 1,
          drawingPan: { x: 0, y: 0 },
          layerRenderModes: {},
          layerGradParams: {},
          layerBrushSettings: {},
          paletteMode: 'flat',
          paletteGradientAngle: 90,
          paletteGradientIntensity: 0.2
      }
    case 'LOAD_PROJECT':
      // Ensure we merge postProcessing settings correctly to avoid undefined values
      const mergedPostProcessing = {
          ...initialState.postProcessing,
          ...(action.payload.postProcessing || {})
      };
      const mergedPostProcessingEnabled = {
          ...initialState.postProcessingEnabled,
          ...(action.payload.postProcessingEnabled || {})
      };
      
      const loadedLayerRenderModes = action.payload.layerRenderModes || {};
      const loadedLayerGradParams = action.payload.layerGradParams || {};
      const loadedLayerBrushSettings = action.payload.layerBrushSettings || {};
      const firstLayerParams = loadedLayerGradParams[0] || { angle: 90, intensity: 0.2 };
      
      const loadedPaletteId = action.payload.activePaletteId || 'primary';
      const loadedPalette = loadedPaletteId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE;

      // Create initial history snapshot with loaded state
      const initialSnapshot: HistorySnapshot = {
          shapes: action.payload.shapes || [],
          totalLayers: action.payload.totalLayers || 1,
          currentLayerIndex: 0,
          hiddenLayers: action.payload.hiddenLayers || [],
          locked3DLayers: action.payload.locked3DLayers || [],
          layerRenderModes: loadedLayerRenderModes,
          layerGradParams: loadedLayerGradParams,
          layerBrushSettings: loadedLayerBrushSettings
      };

      return {
          ...state,
          ...action.payload,
          postProcessing: mergedPostProcessing,
          postProcessingEnabled: mergedPostProcessingEnabled,
          // Ensure critical state is reset/set correctly if not in payload or to ensure consistency
          history: [initialSnapshot],
          historyIndex: 0,
          camera: { x: 0, y: 0, z: 0, rotation: 0 },
          currentLayerIndex: 0,
          mode: 'drawing',
          tool: action.payload.tool || 'brush',
          hiddenLayers: action.payload.hiddenLayers || [],
          // Allow any layer to be locked
          locked3DLayers: action.payload.locked3DLayers || [],
          drawingZoom: 1,
          drawingPan: { x: 0, y: 0 },
          layerRenderModes: loadedLayerRenderModes,
          layerGradParams: loadedLayerGradParams,
          layerBrushSettings: loadedLayerBrushSettings,
          paletteMode: loadedLayerRenderModes[0] || 'flat',
          paletteGradientAngle: firstLayerParams.angle,
          paletteGradientIntensity: firstLayerParams.intensity,
          currentLineThickness: action.payload.currentLineThickness || 25,
          lineMode: action.payload.lineMode || 'tapered',
          activePaletteId: loadedPaletteId,
          palette: loadedPalette
      };
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
        const nextBrush = newBrushSettings[newCurrentLayer] || { thickness: 25, mode: 'tapered' as LineMode };
        
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
        const currentSettings = state.layerBrushSettings[layerIdx] || { mode: 'tapered' as LineMode, thickness: 25 };
        const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };
        
        // Also update shapes immediately (for onChange events)
        const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
        const newShapes = state.shapes.map(s => {
             if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
                 const effectiveMode = currentSettings.mode;
                 let newPoints: Point[] = [];
                 if (effectiveMode === 'tapered') {
                     newPoints = generateTaperedStroke(s.originalPoints, thickness);
                 } else {
                     newPoints = generateUniformStroke(s.originalPoints, thickness);
                 }
                 return { ...s, lineThickness: thickness, lineMode: effectiveMode, points: newPoints };
             }
             return s;
        });

        return { ...state, currentLineThickness: thickness, layerBrushSettings: newLayerSettings, shapes: newShapes };
    }
    case 'SET_LINE_THICKNESS_PREVIEW': {
        const thickness = action.payload;
        const layerIdx = state.currentLayerIndex;
        const currentSettings = state.layerBrushSettings[layerIdx] || { mode: 'tapered' as LineMode, thickness: 25 };
        const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };
        
        const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
        const newShapes = state.shapes.map(s => {
             if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
                 const effectiveMode = currentSettings.mode;
                 let newPoints: Point[] = [];
                 if (effectiveMode === 'tapered') {
                     newPoints = generateTaperedStroke(s.originalPoints, thickness);
                 } else {
                     newPoints = generateUniformStroke(s.originalPoints, thickness);
                 }
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
             const { history, index } = pushHistory(state.history, state.historyIndex, state.shapes);
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
        const currentSettings = state.layerBrushSettings[layerIdx] || { mode: 'tapered' as LineMode, thickness: 25 };
        const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, mode } };
        const thickness = currentSettings.thickness;

        const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
        const newShapes = state.shapes.map(s => {
             if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
                 let newPoints: Point[] = [];
                 if (mode === 'tapered') {
                     newPoints = generateTaperedStroke(s.originalPoints, thickness);
                 } else {
                     newPoints = generateUniformStroke(s.originalPoints, thickness);
                 }
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
        newBrushSettings[newLayerIndex] = newBrushSettings[layerIndex] ? { ...newBrushSettings[layerIndex] } : { thickness: 25, mode: 'tapered' as LineMode };

        // Sync global
        const nextBrush = newBrushSettings[newLayerIndex];

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

export const StrataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

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