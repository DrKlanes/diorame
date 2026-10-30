// --- Types ---

export type Point = { x: number; y: number; pressure?: number };

// Text local frame → world around the anchor, canvas order (a, b, c, d). Read via utils/textTransform.ts.
export type TextMatrix = readonly [number, number, number, number];

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
  rotation?: number; // with textMatrix: only a hint for older app versions, never read
  textMatrix?: TextMatrix; // stretched/mirrored text (v3.17.56); absent = rotation only
  originalPoints?: Point[]; // Store spine for re-generation
  brushThickness?: number; // Store thickness value
  brushMode?: BrushMode; // Store brush mode (tapered or uniform)
  eraserPolygon?: Point[]; // Expanded polygon for SVG mask export
}

export type AppMode = 'drawing' | 'cinematic';
// Background of a DRAW PNG export: the paper as seen on screen, a plain white/black, or none (alpha).
export type ExportBackground = 'paper' | 'solid' | 'transparent';
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

export type SuperRisoStyle = 'clean' | 'zine' | 'lofi' | 'cmyk';
export type SuperRisoPaper = 'white' | 'natural' | 'recycled' | 'cream';
// Super Riso (v3.17.74): the 8 panel controls + the style they started from + "full quality always".
// Defaults, styles and sanitising in constants/superRiso.ts.
export type SuperRisoSettings = {
    style: SuperRisoStyle;
    inkSet: 'own' | 'cmyk' | 'dpal';
    maxInks: number;            // 1–8
    paper: SuperRisoPaper;
    screen: 'grain' | 'dots';
    screenSize: number;         // 0–1
    imperfection: number;       // 0–1
    resolution: number;         // 0–1 (lo-fi … fine)
    reprintFps: 0 | 4 | 6 | 8 | 12;
    fullQuality: boolean;       // force the full level live (held at the reprint rate)
    technique: 'riso' | 'xerox' | 'stencil';  // v3.19.0: Fotocopia (copy art); v3.20.0: Stencil (plantilla + spray)
    xerox: XeroxSettings;
    stencil: StencilSettings;
};

// Super Riso · Stencil (v3.20.0): the lab's st.s + dropSize and supTex (print settings). Data, styles and sanitising
// in constants/superRisoStencil.ts.
export type StencilStyle = 'banksy' | 'canvas' | 'wall' | 'layers' | 'accent' | 'color' | 'street' | 'bridges';
export type StencilSupport = 'wall' | 'wallw' | 'dark' | 'card' | 'canvas' | 'wood' | 'paper' | 'custom';
export type StencilSettings = {
    style: StencilStyle | '';
    mode: 'tone' | 'color';     // templates by tone, or by the drawing's colour zones (+ black)
    n: number;                  // 1–4 layers (tone) / 1–3 colours (color)
    dark: number;               // 0–1
    cut: number;                // 0–1 «simplify the cut» (minimum cut size)
    bridges: boolean;
    load: number;               // 0–1 paint load
    lift: number;               // 0–1 lifted template (mist under it)
    over: number;               // 0–1 overspray around
    drips: number;              // 0–1
    splat: number;              // 0–1
    sloppy: number;             // 0–1 misregistration, blade edge, uneven pass
    colors: 'spray' | 'own';
    manual: string[];           // per-layer spray colours (only used while their count matches the layers)
    accent: boolean;            // tone mode: one colour accent
    cloud: 'none' | 'white' | 'color';
    cloudHex: string;
    sup: StencilSupport;
    supHex: string;
    supType: number;            // 0 paper, 1 wall, 2 cardboard, 3 canvas, 4 wood
    supTex: number;             // 0–1 support texture (slider; supTex = lerp(0, 1.5, v))
    dropSize: number;           // 0–1 droplet size (drop = lerp(.4, 3, v))
};

// Super Riso · Fotocopia (v3.19.0): the lab's st.x. Data, styles and sanitising in constants/superRisoXerox.ts.
export type XeroxStyle = 'flyer' | 'zine' | 'water' | 'fluor' | 'degen' | 'photo' | 'munari' | 'lid';
export type XeroxPaper = 'copy' | 'recycled' | 'fpink' | 'fyellow' | 'fgreen' | 'forange' | 'blue' | 'custom';
export type XeroxMarkerId = 'red' | 'pink' | 'magenta' | 'orange' | 'yellow' | 'lemon' | 'green' | 'lime'
    | 'turquoise' | 'cyan' | 'blue' | 'violet' | 'brown' | 'skin' | 'warmGray' | 'coolGray';
/** Fine-tuning keys of the lab (no sliders in Diorame: only style overrides land here). */
export type XeroxFineKey = 'hollow' | 'thr' | 'grain' | 'genSpread' | 'dust' | 'hairs' | 'scratch' | 'prints' | 'smear' | 'fog' | 'streak' | 'band'
    | 'lid' | 'motion' | 'lpi' | 'offset' | 'sloppy' | 'wobble' | 'cover' | 'slop' | 'dry' | 'fast' | 'stroke' | 'strokeAng' | 'overlap' | 'strength'
    | 'wobMm' | 'bloom' | 'gran' | 'dryB' | 'scanNoise';
export type XeroxSettings = {
    style: XeroxStyle | '';
    mode: 'line' | 'photo';     // «Trama» in the print settings: line = toner grain, photo = line screen
    screenSize: number;         // 0–1: toner grain (line) or screen ruling (photo), coarser = higher
    dark: number;               // 0–1
    toner: number;              // 0–1 (worn grey … deep black)
    gens: number;               // 1–6
    dirt: number;               // 0–1
    hand: 'none' | 'marker' | 'water';
    what: 'auto' | 'color' | 'fill';  // auto resolves to color when the drawing has colour zones
    pal: 'own' | 'kit';         // colour zones: the drawing's own colours, or the nearest marker / watercolour of the kit
    n: number;                  // 1–6 zones coloured
    over: Record<string, string>;  // zone colour of the drawing → marker hex picked for THAT zone
    box: string[];              // white gaps: the marker box (hexes, 1–6; empty = default)
    sloppy: number;             // 0–1
    paper: XeroxPaper;
    paperHex: string;
    fillCover: number;          // .2–1
    fillSeed: number;
    fine: Partial<Record<XeroxFineKey, number>>;
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
    superRiso: SuperRisoSettings;
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
    superRiso: boolean;
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

// Identity of a drawing (.dior format v2, v3.21.0). Lives in the state and in the autosave; the file adds
// formatVersion, shapeCount and thumbnail when it is written (utils/projectMeta.ts).
export interface ProjectMeta {
  projectId: string;          // fixed from the moment the canvas is created; groups the versions of one drawing
  version: number;            // saves so far (0 = never saved)
  createdAt: string;          // ISO 8601
  updatedAt: string | null;   // ISO 8601 of the last save
  derivedFrom: string | null; // projectId this drawing was duplicated from
}

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
  projectWasLoaded: boolean; // Transient: true once LOAD_PROJECT ran this session (.dior or autosave restore). NOT serialized.
  cinemaViewInitialized: boolean; // Transient: the CINEMA view params (focal, zoom, spacing, preset) hold values of the project's own (true: opened from a file, whose gaps LOAD_PROJECT filled with CINEMA_VIEW_DEFAULTS, or the first CINEMA entry already ran) or still the app's initial placeholders (false: a new project). NOT serialized.
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
  projectMeta: ProjectMeta; // .dior v2 identity — not undo state
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
