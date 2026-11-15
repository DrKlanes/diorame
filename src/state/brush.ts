// Brush thickness and mode of a layer. They are properties of the document: changing one re-styles every
// regenerable stroke of the layer (outline regenerated from its spine), and a layer with none takes it as
// a pure selection (hybrid undo contract, CLAUDE.md). Out of StrataContext.tsx (v3.26.17, refactor
// phase 3A), moved as it was.
import { BASE_DEPTH_STEP } from '../constants/layers';
import { generateStrokeForMode } from '../utils/strokeGenerators';
import { pushHistory, createSnapshot, patchCurrentSnapshot } from './history';
import type { AppState, Point } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function setBrushThickness(state: AppState, action: Extract<Action, { type: 'SET_BRUSH_THICKNESS' }>): AppState {
	const thickness = action.payload;
	const layerIdx = state.currentLayerIndex;
	const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.brushMode, thickness: state.currentBrushThickness };
	const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };

	// Also update shapes immediately (for onChange events)
	const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
	const newShapes = state.shapes.map(s => {
		if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
			const effectiveMode = s.brushMode || currentSettings.mode;
			const newPoints = generateStrokeForMode(effectiveMode, s.originalPoints, thickness);
			return { ...s, brushThickness: thickness, brushMode: effectiveMode, points: newPoints };
		}
		return s;
	});

	return { ...state, currentBrushThickness: thickness, layerBrushSettings: newLayerSettings, shapes: newShapes };
}

export function setBrushThicknessPreview(state: AppState, action: Extract<Action, { type: 'SET_BRUSH_THICKNESS_PREVIEW' }>): AppState {
	const thickness = action.payload;
	const layerIdx = state.currentLayerIndex;
	const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.brushMode, thickness: state.currentBrushThickness };
	const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };

	const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
	const newShapes = state.shapes.map(s => {
		if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
			const effectiveMode = s.brushMode || currentSettings.mode;
			const newPoints = generateStrokeForMode(effectiveMode, s.originalPoints, thickness);
			return { ...s, brushThickness: thickness, brushMode: effectiveMode, points: newPoints };
		}
		return s;
	});

	// Store current shapes state if not already stored
	return {
		...state,
		currentBrushThickness: thickness,
		layerBrushSettings: newLayerSettings,
		brushThicknessBeforePreview: state.brushThicknessBeforePreview || state.shapes,
		shapes: newShapes
	};
}

export function commitBrushThickness(state: AppState): AppState {
	const prevShapes = state.brushThicknessBeforePreview;
	if (prevShapes) {
		// Only commit an undo step if the thickness cycle actually restyled
		// strokes (state already holds the post-preview shapes + settings).
		const currentLayerZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
		const strokesWereRestyled = state.shapes.some(s => s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0);
		if (strokesWereRestyled) {
			const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot(state));
			return { ...state, brushThicknessBeforePreview: null, history, historyIndex: index, isDirty: true };
		}
	}
	// Pure selection (no strokes restyled) → last-writer-wins onto the current snapshot.
	return {
		...state,
		brushThicknessBeforePreview: null,
		isDirty: state.isDirty || prevShapes !== null,
		history: patchCurrentSnapshot(state.history, state.historyIndex, { layerBrushSettings: state.layerBrushSettings })
	};
}

export function setBrushMode(state: AppState, action: Extract<Action, { type: 'SET_BRUSH_MODE' }>): AppState {
	const mode = action.payload;
	const layerIdx = state.currentLayerIndex;
	const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.brushMode, thickness: state.currentBrushThickness };
	const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, mode } };
	const thickness = currentSettings.thickness;

	const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
	const hasRegenerableStrokes = state.shapes.some(s => s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0);

	// No strokes to restyle → pure selection: no undo step, last-writer-wins
	// onto the current snapshot so a later undo never reverts this choice.
	if (!hasRegenerableStrokes) {
		return {
			...state,
			brushMode: mode,
			layerBrushSettings: newLayerSettings,
			history: patchCurrentSnapshot(state.history, state.historyIndex, { layerBrushSettings: newLayerSettings }),
			isDirty: true,
		};
	}

	const newShapes = state.shapes.map(s => {
		if (s.zIndex === currentLayerZ && s.originalPoints && s.originalPoints.length > 0) {
			let newPoints: Point[] = [];
			newPoints = generateStrokeForMode(mode, s.originalPoints, thickness);
			return { ...s, brushThickness: thickness, brushMode: mode, points: newPoints };
		}
		return s;
	});

	// Material restyle → undo step; snapshot the POST-change pair (shapes + settings).
	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes, layerBrushSettings: newLayerSettings }));

	return {
		...state,
		brushMode: mode,
		layerBrushSettings: newLayerSettings,
		shapes: newShapes,
		history,
		historyIndex: index,
		isDirty: true,
	};
}
