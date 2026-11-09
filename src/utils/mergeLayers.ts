import { DRAW_FOCAL_LENGTH } from '../constants/renderConstants';
import { GRADIENT_DEFAULTS } from '../constants/palette';
import { isLayerEmpty } from './animationFrames';
import { bakeTextTransform } from './textTransform';
import type { AppState, HistorySnapshot, LayerGradParams, Point, Shape } from '../types/strataTypes';

// Mirror of StrataContext.BASE_DEPTH_STEP — kept local to avoid circular import (see animationFrames.ts)
const BASE_DEPTH_STEP = 150;

const zOf = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;
const layerOf = (shape: Shape) => Math.round(shape.zIndex / -BASE_DEPTH_STEP);

/** Same guards for the button, the shortcut and the reducer. An open text session blocks: it is never committed for the user. */
export const canMergeDown = (state: AppState): boolean => {
	const i = state.currentLayerIndex;
	return i > 0
		&& !isLayerEmpty(state, i)
		&& !state.hiddenLayers.includes(i)
		&& !state.hiddenLayers.includes(i - 1)
		&& !state.textSession.isActive
		&& !state.isDrawing
		&& !(state.isAnimationMode && state.isAnimationPlaying);
};

const sameGradient = (a: LayerGradParams | undefined, b: LayerGradParams | undefined) => {
	const pa = a || GRADIENT_DEFAULTS, pb = b || GRADIENT_DEFAULTS;
	return pa.angle === pb.angle && pa.intensity === pb.intensity && (pa.gradType || 'solid') === (pb.gradType || 'solid');
};

/** The merged layer takes the render mode of the one below: true when that repaints the upper layer's ink. */
export const mergeChangesGradient = (state: AppState): boolean => {
	const a = state.currentLayerIndex, b = a - 1;
	const modeA = state.layerRenderModes[a] || 'flat', modeB = state.layerRenderModes[b] || 'flat';
	return modeA !== modeB || (modeA === 'grad' && !sameGradient(state.layerGradParams[a], state.layerGradParams[b]));
};

// A shape keeps its screen position across a change of plane only if its world coordinates absorb
// the change: DRAW projects each layer at F / (F + z − camera.z) around the world origin, ~1.5 % per
// layer (F = 10000 since v3.25.29; ~3 % at 5000). A plane change keeps the look exactly from ONE
// camera: since v3.25.28 it is A's, the one the user drew with, so what was drawn touching B (or the
// format frame, on layer 0's plane) keeps touching it. Until then it was B's (where DRAW opens after
// the merge): ~0.09 % off per merge at F = 5000.
const planeScale = (fromZ: number, toZ: number, cameraZ: number) =>
	(DRAW_FOCAL_LENGTH + toZ - cameraZ) / (DRAW_FOCAL_LENGTH + fromZ - cameraZ);

const onPlane = (shape: Shape, toZ: number, k: number): Shape => {
	const scaled = (p: Point): Point => ({ ...p, x: p.x * k, y: p.y * k });
	const out: Shape = { ...shape, zIndex: toZ, points: shape.points.map(scaled) };
	if (shape.originalPoints) out.originalPoints = shape.originalPoints.map(scaled);
	if (shape.eraserPolygon) out.eraserPolygon = shape.eraserPolygon.map(scaled);
	if (shape.brushThickness !== undefined) out.brushThickness = shape.brushThickness * k;
	// nonUniform: the matrix absorbs the scale and fontSize stays, so the glyphs rasterize as they did.
	if (shape.type === 'text') Object.assign(out, bakeTextTransform(shape, { rotation: 0, scale: k, sx: k, sy: k, nonUniform: true }));
	return out;
};

// Slots above the removed one move down a place; the merged layer keeps the entry of the one below.
const shiftRecord = <T,>(record: Record<number, T>, removed: number): Record<number, T> => {
	const out: Record<number, T> = {};
	for (const key of Object.keys(record)) {
		const k = Number(key);
		if (k !== removed) out[k > removed ? k - 1 : k] = record[k];
	}
	return out;
};
const shiftIndices = (list: number[], removed: number) => list.filter(i => i !== removed).map(i => (i > removed ? i - 1 : i));

/**
 * MERGE_LAYER_DOWN: the active layer A onto B, the one below it in the panel (index − 1).
 *
 * Eraser, drawInside and drawBehind act on all that is already painted on a layer's canvas, so an A
 * with any of them goes into an isolated group (Shape.group, canvas/renderShapeRun.ts, svgGeometry.ts)
 * and keeps acting on A alone. Whatever is drawn later has no group and acts on the merged layer.
 * B's shapes stay untouched; A's go after them, in order. A and the layers above change plane, so
 * they are rescaled to stay where they were on screen from A's camera (planeScale, viewZ).
 */
export const mergeLayerDown = (
	state: AppState,
	pushStep: (next: AppState) => { history: HistorySnapshot[]; index: number },
): AppState => {
	if (!canMergeDown(state)) return state;
	const a = state.currentLayerIndex, b = a - 1;
	const camZ = zOf(b);
	const viewZ = zOf(a);   // the camera the merged and upper shapes keep their look from (planeScale)

	// The merge moves A's shapes to the end of the array, which loses the order they were drawn in. Shapes from before
	// the creation time (v3.25.16) have none: give them a negative one that keeps their current array order, so the
	// timelapse still shows them in it (it ranks by `t`) and they stay before every real timestamp.
	const all = state.shapes.map((s, i) => (s.t === undefined ? { ...s, t: i - state.shapes.length } : s));
	const upper = all.filter(s => layerOf(s) === a);
	const needsGroup = upper.some(s => s.isEraser || s.isDrawInside || s.isDrawBehind);
	const groupId = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	const kA = planeScale(zOf(a), zOf(b), viewZ);
	const merged = upper.map(s => {
		const placed = onPlane(s, zOf(b), kA);
		return needsGroup ? { ...placed, group: [groupId, ...(s.group ?? [])] } : placed;
	});
	const rest = all.flatMap(s => {
		const i = layerOf(s);
		if (i === a) return [];
		return i < a ? [s] : [onPlane(s, zOf(i - 1), planeScale(zOf(i), zOf(i - 1), viewZ))];
	});

	const layerRenderModes = shiftRecord(state.layerRenderModes, a);
	const layerGradParams = shiftRecord(state.layerGradParams, a);
	const layerBrushSettings = shiftRecord(state.layerBrushSettings, a);
	const brush =layerBrushSettings[b] || { thickness: state.currentBrushThickness, mode: state.brushMode };
	const snap = state.paletteApplyToAllSnapshot;
	const focus = state.postProcessing.focusTargetLayer;

	const next: AppState = {
		...state,
		shapes: [...rest, ...merged],
		totalLayers: state.totalLayers - 1,
		currentLayerIndex: b,
		isLayerSelected: true,
		camera: { ...state.camera, z: camZ, rotation: 0 },
		hiddenLayers: shiftIndices(state.hiddenLayers, a),
		locked3DLayers: shiftIndices(state.locked3DLayers, a),
		layerRenderModes,
		layerGradParams,
		layerBrushSettings,
		paletteApplyToAllSnapshot: snap && {
			layerRenderModes: shiftRecord(snap.layerRenderModes, a),
			layerGradParams: shiftRecord(snap.layerGradParams, a),
		},
		paletteMode: layerRenderModes[b] || 'flat',
		currentBrushThickness: brush.thickness,
		brushMode: brush.mode,
		postProcessing: focus >= a ? { ...state.postProcessing, focusTargetLayer: focus - 1 } : state.postProcessing,
		isDirty: true,
	};
	const { history, index } = pushStep(next);
	return { ...next, history, historyIndex: index };
};
