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
export type CinematicType = 'forward' | 'spiral' | 'yoyo' | 'pulse' | 'twist' | 'arc' | 'crane' | 'truck' | 'orbit' | 'zoom' | 'storytelling';

// A content centroid used as a camera waypoint by the 'storytelling' preset.
// x,y = average of a layer's shape points; z = layer depth in cinematic space;
// radius = half the larger bbox side of those points (cheap size for adaptive zoom).
export type Waypoint = { x: number; y: number; z: number; layerIndex: number; radius: number };
export type ExportType = 'png' | 'mp4' | 'svg' | 'svgz' | 'png-sequence' | 'gif';
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

// Canvas gesture state (pinch / orbit / two- and three-finger taps), held in a ref
// by StrataCanvas. The optional groups mirror how the object is actually populated
// at runtime — they are NOT "maybe missing by accident":
//   · tap*  — written only when a 2- or 3-finger touch starts (handleTouchStart).
//     Absent from the initial value, so the first read on a 1-finger gesture is
//     undefined; handleTouchEnd guards on tapTouchCount === 2 / === 3 before using
//     tapStartTime, so undefined falls through harmlessly.
//   · isOrbitTouch / orbitTouch* — dropped when the middle-mouse-button branch of
//     handlePointerDown replaces the whole object with a pan/zoom-only literal.
//     Every read is behind an `if (gestureRef.current.isOrbitTouch)` check.
// Every field is REQUIRED on purpose (they were optional until v3.17.11). Nothing
// here is ever legitimately absent: the ref is seeded with a full object at mount
// and each gesture only overwrites the fields it owns. Optional was never modelling
// "may be missing", it was modelling "whoever wrote the object literal did not list
// it" — so the type asked every reader to handle an undefined that the runtime does
// not produce, while quietly allowing a writer to drop a field with no complaint.
// Required inverts that: the compiler now polices the writers instead of the readers,
// which is where the invariant actually lives. It is what lets the reads stay bare
// (`gestureRef.current.orbitTouchStartPanX`) under strictNullChecks without a single
// `?? 0` papering over a value that would have been wrong anyway.
export type GestureState = {
    isPinching: boolean;
    startDist: number;
    startZoom: number;
    startPan: { x: number, y: number };
    startCenter: { x: number, y: number };
    // Orbit touch gesture state
    isOrbitTouch: boolean;
    orbitTouchStartAzimuth: number;
    orbitTouchStartElevation: number;
    orbitTouchStartPanX: number;
    orbitTouchStartPanY: number;
    orbitTouchStartZoom: number;
    orbitTouchLastPos: { x: number, y: number };
    // Two/three-finger tap detection (undo / redo)
    tapStartTime: number;
    tapMoved: boolean;
    tapTouchCount: number;
};

// The subset of a pointer event that StrataCanvas's pointer-down path actually
// reads. Declared structurally so the hand-built synthetic event used for the iOS
// Apple Pencil path (native capture listener re-invoking the React handler) can
// satisfy it without faking the whole React.PointerEvent surface. A real
// React.PointerEvent<HTMLCanvasElement> is assignable to this.
export type CanvasPointerInput = {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    button: number;
    clientX: number;
    clientY: number;
    preventDefault: () => void;
    currentTarget: { setPointerCapture: (pointerId: number) => void };
};

export type TextSession = {
    isActive: boolean;
    x: number;
    y: number;
    content: string;
    font: 'noir' | 'mansion' | 'pharma' | 'comic' | 'dungeons';
    align: 'left' | 'center' | 'right';
};

// Hybrid contract (v3.11.3): snapshots hold document content PLUS the two
// document-property selectors (per-layer brush settings, active palette) whose
// changes can restyle/remap shapes. When such a change is material it pushes a
// step and the selector travels with undo/redo (canvas and selector never
// desync). When it changes nothing (empty layer/canvas) it pushes no step and
// instead last-writer-wins onto the CURRENT snapshot, so later undos never
// resurrect an old selection. Pure view state (hiddenLayers, locked3DLayers,
// active layer) never enters the history.
export type HistorySnapshot = {
    shapes: Shape[];
    totalLayers: number;
    layerRenderModes: Record<number, 'flat' | 'grad'>;
    // Same shape as AppState.layerGradParams. Every writer of this field copies
    // straight from AppState (createSnapshot) or builds entries from
    // GRADIENT_DEFAULTS, so gradType is never actually absent — the older
    // `gradType?` here was looser than anything ever stored, and made UNDO/REDO
    // fail to restore the map back into AppState.
    layerGradParams: Record<number, LayerGradParams>;
    layerBrushSettings: Record<number, { thickness: number; mode: BrushMode }>;
    activePaletteId: 'primary' | 'alternative';
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
  // Whether the active layer is SELECTED, as distinct from which layer is active
  // (currentLayerIndex, always a valid index). Every other editor shows a transform
  // gizmo because something is selected, not because a tool is active; Diorame had
  // no such concept, so with Move active the gizmo could never go away. This is the
  // resting state it was missing. Pure view state — NEVER enters HistorySnapshot
  // (same category as hiddenLayers / locked3DLayers / active layer, see the contract
  // docblock above) and NOT serialized into .dior: entering a project always starts
  // selected. Read only by the drawGizmo gate and the Move pointerdown decision.
  isLayerSelected: boolean;
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
  gradParamsPendingCommit: boolean; // A gradient slider drag is open, awaiting commit-on-release
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
  animationPlaybackMode: 'loop' | 'pingpong'; // Playback mode: loop forward or bounce back-and-forth
  animationDirection: 1 | -1;           // Runtime direction for ping-pong (not persisted in save)
  animationExportLoops: number;          // Number of complete loops to record in video export (1 | 3 | 6)
  gifExportScale: number;                // GIF export resolution scale: 1 | 0.5 | 0.25
}
