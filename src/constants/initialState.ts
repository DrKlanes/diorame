// The state a new session starts from. Out of StrataContext.tsx (v3.26.14, refactor phase 2d), which
// re-exports it. As before, evaluated once when the module loads: a fresh project identity
// (createProjectMeta) and the grid preference read from localStorage.
import type { AppState } from '../types/strataTypes';
import { FIXED_PALETTE } from './palette';
import { SUPER_RISO_DEFAULTS } from './superRiso';
import { UNTITLED_PROJECT_SENTINEL } from './project';
import { createProjectMeta } from '../utils/projectMeta';

export const initialState: AppState = {
	shapes: [],
	palette: FIXED_PALETTE,
	activePaletteId: 'primary',
	currentColorIndex: 0,
	mode: 'drawing',
	tool: 'blob',
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
		grungeIntensity: 0.5, // Default Medium
		superRiso: SUPER_RISO_DEFAULTS,
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
		grunge: false,
		superRiso: false,
	},
	fxMasterEnabled: true, // Master toggle for all FX (defaults ON)
	postProcessingSnapshot: null,
	history: [{
		shapes: [],
		totalLayers: 1,
		layerRenderModes: {},
		layerGradParams: {},
		layerBrushSettings: {},
		activePaletteId: 'primary'
	}],
	historyIndex: 0,
	exportRequest: null,
	isExporting: false,
	hiddenLayers: [],
	locked3DLayers: [],
	// Starts selected. The app boots with tool: 'blob', so this is only ever read once
	// the user reaches Move — and every route into Move (SET_TOOL, the layer panel,
	// [ / ]) reselects anyway, so `true` is the value that agrees with all of them.
	// Booting deselected would also cost a click before the tool could do anything.
	isLayerSelected: true,
	isWelcomeModalOpen: true,
	isOnboardingVisible: true, // New: Onboarding overlay on canvas
	isUIHidden: false,
	isDrawing: false,
	projectWasLoaded: false,
	cinemaViewInitialized: false,
	isSymmetryEnabled: false,
	gridEnabled: typeof window !== 'undefined' && window.localStorage?.getItem('diorame-grid-enabled') === 'true',
	paletteMode: 'flat',
	layerRenderModes: {},
	layerGradParams: {},
	layerBrushSettings: {},
	pointOfInterest: null,
	format: null,
	viewportSize: { w: 0, h: 0 },
	cinematicSpeed: 1.0, // Default Normal Speed
	isDrawBehind: false,
	isDrawInside: false,
	isOrganicMode: false,
	blobSmoothing: false,
	currentBrushThickness: 25,
	brushThicknessBeforePreview: null,
	gradParamsPendingCommit: false,
	isHandheldEnabled: false,
	handheldIntensity: 'medium',
	brushMode: 'tapered',
	projectName: UNTITLED_PROJECT_SENTINEL, // Default project name (sentinel; resolved via t() at render time)
	projectMeta: createProjectMeta(),
	paletteApplyToAllActive: false,
	paletteApplyToAllSnapshot: null,
	isDirty: false,
	soundsEnabled: false,
	shouldFitToView: false,
	isAnimationMode: false,
	isAnimationPlaying: false,
	animationFramerate: 6,
	animationExportLoops: 1,
	gifExportScale: 1,
	isOnionSkinEnabled: false,
	isAnimationFlatZ: false,
	layerIndexBeforeAnimation: null,
	animationPlaybackMode: 'loop',
	animationDirection: 1,
};
