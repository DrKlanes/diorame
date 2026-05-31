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
  brushThickness?: number; // Store thickness value
  brushMode?: BrushMode; // Store brush mode (tapered or uniform)
  eraserPolygon?: Point[]; // Expanded polygon for SVG mask export
}

export type AppMode = 'drawing' | 'cinematic';
export type ToolType = 'blob' | 'eraser' | 'text' | 'move' | 'brush';
export type CinematicType = 'forward' | 'spiral' | 'yoyo' | 'pulse' | 'twist' | 'arc' | 'crane' | 'truck' | 'orbit' | 'zoom';
export type ExportType = 'png' | 'mp4' | 'svg' | 'svgz';
export type BrushMode = 'tapered' | 'uniform' | 'ink';

export type LayerGradParams = {
    angle: number;
    intensity: number;
    gradType: 'solid' | 'fade';
};

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
    grunge: boolean;
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
    layerGradParams: Record<number, { angle: number; intensity: number; gradType?: 'solid' | 'fade' }>;
    layerBrushSettings: Record<number, { thickness: number; mode: BrushMode }>;
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
  fxMasterEnabled: boolean; // New: Global toggle for all post-processing FX (not undoable)
  postProcessingSnapshot: PostProcessingEnabled | null; // Transient: snapshot for master toggle restore
  history: HistorySnapshot[];
  historyIndex: number;
  exportRequest: ExportType | null;
  isExporting: boolean;
  hiddenLayers: number[]; // Indices of hidden layers
  locked3DLayers: number[]; // Indices of layers with 3D Lock (fixed in VIEW mode)
  isWelcomeModalOpen: boolean;
  isOnboardingVisible: boolean; // New: Onboarding overlay on canvas
  isUIHidden: boolean; // New: Toggle UI visibility in View mode
  isDrawing: boolean; // Transient: true during active pointer drag (draw/move/orbit). NOT serialized.
  isSymmetryEnabled: boolean; // New: Vertical Symmetry Mode
  gridEnabled: boolean; // Composition guide overlay (3x3 dot grid). Persisted in localStorage. NOT serialized in .dior.
  paletteMode: 'flat' | 'grad'; // New: Palette Rendering Mode
  layerRenderModes: Record<number, 'flat' | 'grad'>; // New: Per-layer render mode
  layerGradParams: Record<number, LayerGradParams>; // New: Per-layer gradient params
  paletteApplyToAllActive: boolean; // New: Propagate current layer palette config to all layers
  paletteApplyToAllSnapshot: {
    layerRenderModes: Record<number, 'flat' | 'grad'>;
    layerGradParams: Record<number, LayerGradParams>;
  } | null; // Transient: snapshot for apply-to-all restore
  layerBrushSettings: Record<number, { thickness: number; mode: BrushMode }>; // New: Per-layer brush settings
  pointOfInterest: { x: number; y: number; z: number } | null; // New: Point of Interest for camera focus
  cinematicSpeed: number; // New: Speed multiplier for cinematic moves (0.1 to 1.0)
  isDrawBehind: boolean; // New: Draw Behind mode
  isDrawInside: boolean; // New: Draw Inside (Alpha Lock) mode
  isOrganicMode: boolean; // New: Organic/Fluid line mode
  blobSmoothing: boolean;
  currentBrushThickness: number; // New: Brush Thickness (continuous value)
  brushThicknessBeforePreview: Shape[] | null; // Store shapes before thickness preview
  isHandheldEnabled: boolean; // New: Handheld camera shake
  handheldIntensity: HandheldIntensity; // New: Handheld shake intensity
  brushMode: BrushMode; // New: Brush mode (tapered or uniform)
  projectName: string; // New: Project name for saving
  isDirty: boolean; // true when there are unsaved changes since last save
  soundsEnabled: boolean;
  shouldFitToView?: boolean; // New: Trigger fit-to-view on load
  // --- Animation ---
  isAnimationMode: boolean;              // Animation toggle within DRAW mode
  isAnimationPlaying: boolean;           // Playback play/pause state
  animationFramerate: number;            // Active framerate preset (4 | 6 | 8 fps)
  isOnionSkinEnabled: boolean;           // Onion skin overlay toggle
  isAnimationFlatZ: boolean;             // Flatten layer Z depth for 2D-flat playback in CINEMA
  layerIndexBeforeAnimation: number | null; // Layer active before entering animation mode — restored on exit
}
