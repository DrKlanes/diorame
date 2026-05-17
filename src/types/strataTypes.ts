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
  eraserPolygon?: Point[]; // Expanded polygon for SVG mask export
}

export type AppMode = 'drawing' | 'cinematic';
export type ToolType = 'brush' | 'eraser' | 'text' | 'move' | 'line';
export type CinematicType = 'forward' | 'spiral' | 'yoyo' | 'pulse' | 'twist' | 'arc' | 'crane' | 'truck' | 'orbit' | 'zoom';
export type ExportType = 'png' | 'mp4' | 'svg' | 'svgz';
export type LineMode = 'tapered' | 'uniform' | 'ink';

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
  fxMasterEnabled: boolean; // New: Global toggle for all post-processing FX (not undoable)
  history: HistorySnapshot[];
  historyIndex: number;
  exportRequest: ExportType | null;
  isExporting: boolean;
  hiddenLayers: number[]; // Indices of hidden layers
  locked3DLayers: number[]; // Indices of layers with 3D Lock (fixed in VIEW mode)
  isWelcomeModalOpen: boolean;
  isOnboardingVisible: boolean; // New: Onboarding overlay on canvas
  isUIHidden: boolean; // New: Toggle UI visibility in View mode
  isSymmetryEnabled: boolean; // New: Vertical Symmetry Mode
  paletteMode: 'flat' | 'grad'; // New: Palette Rendering Mode
  layerRenderModes: Record<number, 'flat' | 'grad'>; // New: Per-layer render mode
  layerGradParams: Record<number, { angle: number; intensity: number; gradType?: 'solid' | 'fade' }>; // New: Per-layer gradient params
  layerBrushSettings: Record<number, { thickness: number; mode: LineMode }>; // New: Per-layer brush settings
  paletteGradientAngle: number; // New: Gradient Angle in degrees
  paletteGradientIntensity: number; // New: Gradient Intensity (0 to 1)
  paletteGradientType: 'solid' | 'fade'; // New: Gradient type (solid-to-solid vs solid-to-transparent)
  pointOfInterest: { x: number; y: number; z: number } | null; // New: Point of Interest for camera focus
  cinematicSpeed: number; // New: Speed multiplier for cinematic moves (0.1 to 1.0)
  isDrawBehind: boolean; // New: Draw Behind mode
  isDrawInside: boolean; // New: Draw Inside (Alpha Lock) mode
  isOrganicMode: boolean; // New: Organic/Fluid line mode
  blobSmoothing: boolean;
  currentLineThickness: number; // New: Line Thickness (continuous value)
  lineThicknessBeforePreview: Shape[] | null; // Store shapes before thickness preview
  isHandheldEnabled: boolean; // New: Handheld camera shake
  handheldIntensity: HandheldIntensity; // New: Handheld shake intensity
  lineMode: LineMode; // New: Line mode (tapered or uniform)
  projectName: string; // New: Project name for saving
  shouldFitToView?: boolean; // New: Trigger fit-to-view on load
}
