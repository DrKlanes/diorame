// LOAD_PROJECT: the reader of a .dior (and of the autosave and the example scene). The saved values rule
// and the defaults fill the gaps, field by field, never with the state of the project that was open
// (CLAUDE.md). Its writer is utils/diorPayload.ts. Out of StrataContext.tsx (v3.26.16, refactor phase 3A),
// moved as it was.
import { initialState } from '../constants/initialState';
import { sanitizeSuperRiso } from '../constants/superRiso';
import { GRADIENT_DEFAULTS, FIXED_PALETTE, ALTERNATIVE_PALETTE } from '../constants/palette';
import { MAX_LAYERS } from '../constants/layers';
import { BRUSH_THICKNESS_MIN, BRUSH_THICKNESS_MAX } from '../constants/brush';
import { CINEMA_VIEW_DEFAULTS } from '../constants/cinemaView';
import { UNTITLED_PROJECT_SENTINEL } from '../constants/project';
import { createProjectMeta, readProjectMeta } from '../utils/projectMeta';
import { resolveLayerBrush } from '../utils/layerBrush';
import { sanitizeFormat } from '../utils/formatFrame';
import type {
	AppState, Shape, ToolType, CinematicType, HandheldIntensity, HistorySnapshot, LayerGradParams, PostProcessingEnabled,
} from '../types/strataTypes';
import type { Action } from '../types/strataActions';


const isPoint = (p: any): boolean => !!p && typeof p === 'object' && Number.isFinite(p.x) && Number.isFinite(p.y);
const isPointList = (v: unknown): boolean => Array.isArray(v) && v.every(isPoint);

/**
 * The shapes of a file that can be drawn (v3.26.20): an object with at least one point, every point
 * with finite x and y, and a finite zIndex. Anything else used to go into the state as it came: a null
 * threw inside LOAD_PROJECT itself, and a shape without points on the first move, transform or flip of
 * its layer. One damaged shape must not take the drawing with it, so it is left out and the rest opens.
 * Exported for the "N shapes loaded" toast (useSaveLoad), which counts what was actually loaded.
 */
export const readableShapes = (raw: unknown): unknown[] => (Array.isArray(raw)
	? raw.filter((s: any) => !!s && typeof s === 'object' && isPointList(s.points) && s.points.length > 0 && Number.isFinite(s.zIndex))
	: []);

export function loadProject(state: AppState, action: Extract<Action, { type: 'LOAD_PROJECT' }>): AppState {
	// Ensure we merge postProcessing settings correctly to avoid undefined values
	// Legacy migration: drop risoInkBlend if present (was never in stable releases)
	const incomingPostProcessing: any = action.payload.postProcessing || {};
	const mergedPostProcessing = {
		...initialState.postProcessing,
		...incomingPostProcessing
	};
	delete (mergedPostProcessing as any).risoInkBlend;
	// Super Riso (v3.17.74): nested object, merged and sanitised field by field (no allow-list
	// here). Files from before it open with the defaults.
	mergedPostProcessing.superRiso = sanitizeSuperRiso(incomingPostProcessing.superRiso);
	// Legacy migration: grungeOverlay -> grunge
	const incomingPostProcessingEnabled: any = action.payload.postProcessingEnabled || {};
	const mergedPostProcessingEnabled = {
		...initialState.postProcessingEnabled,
		...incomingPostProcessingEnabled,
		grunge: incomingPostProcessingEnabled.grunge ?? incomingPostProcessingEnabled.grungeOverlay ?? false
	};
	delete (mergedPostProcessingEnabled as any).grungeOverlay;
	if (typeof mergedPostProcessingEnabled.superRiso !== 'boolean') mergedPostProcessingEnabled.superRiso = initialState.postProcessingEnabled.superRiso;
	// The two risos exclude each other; a file with both on keeps Super Riso.
	if (mergedPostProcessingEnabled.superRiso && mergedPostProcessingEnabled.riso) mergedPostProcessingEnabled.riso = false;
	// Master FX OFF (v3.20.5): while it is off every flag is false and the look that was on lives in the
	// snapshot, so both travel in the file. The snapshot is restored only with the master off, one boolean
	// per known FX; a stray or empty one is dropped, and loading never inherits the previous project's.
	const rawFxSnapshot: any = (action.payload as any).postProcessingSnapshot;
	let loadedFxSnapshot: PostProcessingEnabled | null = null;
	if (action.payload.fxMasterEnabled === false && rawFxSnapshot && typeof rawFxSnapshot === 'object' && !Array.isArray(rawFxSnapshot)) {
		const snap = Object.fromEntries(
			Object.keys(initialState.postProcessingEnabled).map(k => [k, rawFxSnapshot[k] === true])
		) as PostProcessingEnabled;
		if (snap.superRiso && snap.riso) snap.riso = false;
		if (Object.values(snap).some(v => v)) loadedFxSnapshot = snap;
	}

	// Only 'flat' / 'grad' under a layer position (v3.26.20): anything else used to reach the palette selector as it came.
	const rawRenderModes: unknown = action.payload.layerRenderModes;
	const loadedLayerRenderModes = Object.fromEntries(
		Object.entries(rawRenderModes && typeof rawRenderModes === 'object' ? rawRenderModes : {})
			.filter(([k, v]) => /^\d+$/.test(k) && (v === 'flat' || v === 'grad'))
	) as Record<number, 'flat' | 'grad'>;
	const rawGradParams = action.payload.layerGradParams || {};
	const loadedLayerGradParams = Object.fromEntries(
		Object.entries(rawGradParams).map(([k, v]: [string, any]) => [k, { ...GRADIENT_DEFAULTS, ...v }])
	) as Record<number, LayerGradParams>;

	const loadedPaletteId = action.payload.activePaletteId || 'primary';
	const loadedPalette = loadedPaletteId === 'alternative' ? ALTERNATIVE_PALETTE : FIXED_PALETTE;

	// ── Whitelist validation: only accept known keys with type guards ──
	// Per-shape migration: map legacy lineMode/lineThickness → brushMode/brushThickness
	// A shape that cannot be drawn is left out and the rest of the drawing opens (v3.26.20); see readableShapes.
	const rawShapes = readableShapes(action.payload.shapes);
	const safeShapes: Shape[] = rawShapes.map((shape: any) => {
		const brushMode = shape.brushMode ?? shape.lineMode;
		const brushThickness = shape.brushThickness ?? shape.lineThickness;
		const { lineMode: _lm, lineThickness: _lt, ...rest } = shape;
		const result: any = { ...rest };
		if (brushMode !== undefined) result.brushMode = brushMode;
		if (brushThickness !== undefined) result.brushThickness = brushThickness;
		// textMatrix (v3.17.56): texts saved before it have none and read their `rotation`.
		// A malformed or degenerate one is dropped, falling back to that same rotation.
		if ('textMatrix' in result) {
			const m = result.textMatrix;
			const ok = Array.isArray(m) && m.length === 4 && m.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))
				&& Math.abs(m[0] * m[3] - m[1] * m[2]) > 1e-12;
			if (!ok) delete result.textMatrix;
		}
		// Creation time (v3.25.16): a finite number or nothing (older files fall back to the array index).
		if ('t' in result && !(typeof result.t === 'number' && Number.isFinite(result.t))) delete result.t;
		// The spine and the eraser polygon are optional: a damaged one goes, the shape stays (it keeps its outline).
		if (result.originalPoints != null && !isPointList(result.originalPoints)) delete result.originalPoints;
		if (result.eraserPolygon != null && !isPointList(result.eraserPolygon)) delete result.eraserPolygon;
		return result as Shape;
	});
	const safeTotalLayers = (typeof action.payload.totalLayers === 'number' && action.payload.totalLayers > 0)
		? Math.min(action.payload.totalLayers, MAX_LAYERS) : 1;
	// Hidden and pinned layers: positions of layers that exist, each once (v3.26.20).
	const layerIndices = (raw: unknown): number[] => (Array.isArray(raw)
		? [...new Set(raw.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < safeTotalLayers))] : []);
	const safeHiddenLayers = layerIndices(action.payload.hiddenLayers);
	const safeLocked3DLayers = layerIndices(action.payload.locked3DLayers);
	// Per-layer brush pairs (v3.26.22, an additive field: files without it open as before, with none). A pair
	// is kept for a layer that exists when it has a positive thickness and a known mode. A layer with strokes
	// still answers with THEIR pair (resolveLayerBrush): this is what an empty layer keeps of its own.
	const rawBrushSettings: unknown = action.payload.layerBrushSettings;
	const loadedLayerBrushSettings = Object.fromEntries(
		Object.entries(rawBrushSettings && typeof rawBrushSettings === 'object' ? rawBrushSettings : {})
			.filter(([k, v]: [string, any]) => /^\d+$/.test(k) && Number(k) < safeTotalLayers && !!v && typeof v === 'object'
				&& Number.isFinite(v.thickness) && v.thickness > 0 && ['tapered', 'uniform', 'ink'].includes(v.mode))
			.map(([k, v]: [string, any]) => [k, Object.fromEntries(Object.entries(v).filter(([field]) => field === 'thickness' || field === 'mode'))])
	) as AppState['layerBrushSettings'];
	// Tool-value backward compat: until v2.3.0 'brush' was the blob and 'line' the brush. That release
	// renamed both and, in the same commit, the keys the file saves next to them (lineMode /
	// currentLineThickness → brushMode / currentBrushThickness), which every save since then writes.
	// So a file with the new keys already speaks today's names and only an older one is translated.
	// Not the v2 meta: files of v2.3.0–v3.20.x have none, and the autosave carries no formatVersion.
	// (Until v3.26.8 every 'brush' was translated: saving with the brush active reopened with the blob.)
	const savedWithCurrentToolNames = 'brushMode' in action.payload || 'currentBrushThickness' in action.payload;
	let rawTool = action.payload.tool;
	if (!savedWithCurrentToolNames) {
		if (rawTool === 'brush') rawTool = 'blob';
		else if (rawTool === 'line') rawTool = 'brush';
	}
	const safeTool = (typeof rawTool === 'string' && ['blob', 'eraser', 'brush', 'move', 'text'].includes(rawTool))
		? rawTool as ToolType : 'blob';
	// brushMode with fallback to legacy lineMode
	const rawBrushMode = action.payload.brushMode ?? action.payload.lineMode;
	const safeBrushMode = (typeof rawBrushMode === 'string' && ['tapered', 'uniform', 'ink'].includes(rawBrushMode))
		? rawBrushMode : 'tapered';
	// currentBrushThickness with fallback to legacy currentLineThickness
	const rawBrushThickness = (typeof action.payload.currentBrushThickness === 'number' && action.payload.currentBrushThickness > 0)
		? action.payload.currentBrushThickness
		: (typeof action.payload.currentLineThickness === 'number' && action.payload.currentLineThickness > 0)
			? action.payload.currentLineThickness
			: 25;
	// The file's currentBrushThickness is the value of whichever layer was active at save. Layer 0 opens
	// with its own pair: its strokes' (v3.26.3) or, when it has none, the one saved for it (v3.26.22).
	// That pair is what is on the canvas, so it is taken as it is, also outside the slider's range (a
	// resized stroke, D3/D4: stored exact, rounded for display). Only the file's loose tool value is
	// clamped to the range (v3.17.40 lowered MAX from 100 to 70): it is tool state, not geometry, and the
	// control has to land somewhere sane. Shapes are untouched either way (see constants/brush.ts).
	const layer0Brush = resolveLayerBrush(safeShapes, 0, loadedLayerBrushSettings[0]);
	const safeBrushThickness = layer0Brush?.thickness ?? Math.min(Math.max(rawBrushThickness, BRUSH_THICKNESS_MIN), BRUSH_THICKNESS_MAX);
	// Gaps take the defaults, never the previous project's values (v3.20.11 rule; until v3.26.8 these two fell back to state.*).
	const safeIsDarkMode = typeof action.payload.isDarkMode === 'boolean' ? action.payload.isDarkMode : initialState.isDarkMode;
	const safeCinematicType = (typeof action.payload.cinematicType === 'string' && ['flat', 'forward', 'spiral', 'yoyo', 'pulse', 'twist', 'arc', 'crane', 'truck', 'orbit', 'zoom', 'storytelling'].includes(action.payload.cinematicType))
		? action.payload.cinematicType as CinematicType : CINEMA_VIEW_DEFAULTS.cinematicType;
	const rawProjectName = typeof action.payload.projectName === 'string'
		? action.payload.projectName.slice(0, 100) : initialState.projectName;
	// Backward compat: legacy .dior files (pre-v2.1.0) saved the literal 'Untitled Project'
	// instead of the sentinel. Normalize so display goes through i18n.
	const safeProjectName = rawProjectName === 'Untitled Project' ? UNTITLED_PROJECT_SENTINEL : rawProjectName;
	const safeFocalLength = typeof action.payload.focalLength === 'number' ? action.payload.focalLength : CINEMA_VIEW_DEFAULTS.focalLength;
	const safeViewZoomOffset = typeof action.payload.viewZoomOffset === 'number' ? action.payload.viewZoomOffset : CINEMA_VIEW_DEFAULTS.viewZoomOffset;
	const safeLayerSpacingFactor = typeof action.payload.layerSpacingFactor === 'number' ? action.payload.layerSpacingFactor : CINEMA_VIEW_DEFAULTS.layerSpacingFactor;
	const safeCinematicSpeed = typeof action.payload.cinematicSpeed === 'number' ? action.payload.cinematicSpeed : initialState.cinematicSpeed;
	const safeIsHandheldEnabled = typeof action.payload.isHandheldEnabled === 'boolean' ? action.payload.isHandheldEnabled : initialState.isHandheldEnabled;
	const safeHandheldIntensity = (typeof action.payload.handheldIntensity === 'string' && ['low', 'medium', 'high'].includes(action.payload.handheldIntensity as string)) ? action.payload.handheldIntensity as HandheldIntensity : initialState.handheldIntensity;
	const safeFxMasterEnabled = typeof action.payload.fxMasterEnabled === 'boolean' ? action.payload.fxMasterEnabled : true;
	const safePaletteApplyToAllActive = typeof (action.payload as any).paletteApplyToAllActive === 'boolean'
		? (action.payload as any).paletteApplyToAllActive : false;
	const safePaletteApplyToAllSnapshot = ((action.payload as any).paletteApplyToAllSnapshot &&
		typeof (action.payload as any).paletteApplyToAllSnapshot === 'object')
		? (action.payload as any).paletteApplyToAllSnapshot : null;
	// Pre-v3.17.26 .dior files carry no pointOfInterest at all — the field is new.
	// undefined must resolve to null (no CINEMA framing point), never leak a partial
	// or malformed object through: the CINEMA render path reads poi.x/y/z unchecked.
	const rawPoi: any = (action.payload as any).pointOfInterest;
	const safePointOfInterest = (rawPoi && typeof rawPoi === 'object'
		&& typeof rawPoi.x === 'number' && typeof rawPoi.y === 'number' && typeof rawPoi.z === 'number')
		? { x: rawPoi.x, y: rawPoi.y, z: rawPoi.z } : null;

	// Create initial history snapshot with loaded state
	const initialSnapshot: HistorySnapshot = {
		shapes: safeShapes,
		totalLayers: safeTotalLayers,
		layerRenderModes: loadedLayerRenderModes,
		layerGradParams: loadedLayerGradParams,
		layerBrushSettings: loadedLayerBrushSettings,
		activePaletteId: loadedPaletteId
	};

	return {
		...state,
		// Whitelisted fields only — no ...action.payload spread
		shapes: safeShapes,
		totalLayers: safeTotalLayers,
		isDarkMode: safeIsDarkMode,
		cinematicType: safeCinematicType,
		projectName: safeProjectName,
		// .dior v2: a file (or autosave) without meta gets a new identity, written at the next save.
		projectMeta: readProjectMeta((action.payload as any).meta) ?? createProjectMeta(),
		postProcessing: mergedPostProcessing,
		postProcessingEnabled: loadedFxSnapshot
			? Object.fromEntries(Object.keys(mergedPostProcessingEnabled).map(k => [k, false])) as PostProcessingEnabled
			: mergedPostProcessingEnabled,
		fxMasterEnabled: loadedFxSnapshot ? false : safeFxMasterEnabled,
		postProcessingSnapshot: loadedFxSnapshot,
		// Ensure critical state is reset/set correctly
		history: [initialSnapshot],
		historyIndex: 0,
		camera: { x: 0, y: 0, z: 0, rotation: 0 },
		currentLayerIndex: 0,
		mode: 'drawing',
		tool: safeTool,
		hiddenLayers: safeHiddenLayers,
		locked3DLayers: safeLocked3DLayers,
		// Re-derived, never restored from the file — it is not serialized. Opening a
		// project always starts selected, like a fresh session.
		isLayerSelected: true,
		drawingZoom: 1,
		drawingPan: { x: 0, y: 0 },
		layerRenderModes: loadedLayerRenderModes,
		layerGradParams: loadedLayerGradParams,
		layerBrushSettings: loadedLayerBrushSettings,
		paletteMode: loadedLayerRenderModes[0] || 'flat',
		currentBrushThickness: safeBrushThickness,
		brushMode: layer0Brush?.mode ?? safeBrushMode,
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
		pointOfInterest: safePointOfInterest,
		// Absent or malformed → no frame; never the previous project's.
		format: sanitizeFormat((action.payload as any).format),
		isDirty: false,
		projectWasLoaded: true,
		// The file's view stands; its gaps were filled above with the defaults, never with the previous project's.
		cinemaViewInitialized: true,
	};
}
