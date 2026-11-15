// Brush thickness and mode of a layer. They are properties of the document: changing one re-styles every
// regenerable stroke of the layer (outline regenerated from its spine), and a layer with none takes it as
// a pure selection (hybrid undo contract, CLAUDE.md). Out of StrataContext.tsx (v3.26.17, refactor
// phase 3A). Since v3.26.22 a layer may hold strokes of several thicknesses («Mixto»): the slider unifies
// them, the mode button does not.
import { BASE_DEPTH_STEP } from '../constants/layers';
import { generateStrokeForMode, inkSeedFor } from '../utils/strokeGenerators';
import { pushHistory, createSnapshot, patchCurrentSnapshot } from './history';
import type { AppState, BrushMode, Shape } from '../types/strataTypes';
import type { Action } from '../types/strataActions';

const isRegenerable = (s: Shape, layerZ: number) => s.zIndex === layerZ && !!s.originalPoints && s.originalPoints.length > 0;

// One stroke re-styled: its outline regenerated from its spine. An Ink stroke is redrawn with ITS seed
// (v3.26.22), so re-styling it never deals it a new noise pattern; one that has none yet gets it here, from
// its coordinates as they are, and carries it from then on (also through tapered / uniform and back).
const restyle = (s: Shape, mode: BrushMode, thickness: number): Shape => {
	const inkSeed = mode === 'ink' ? (s.inkSeed ?? inkSeedFor(s.originalPoints!)) : s.inkSeed;
	const restyled = { ...s, brushThickness: thickness, brushMode: mode, points: generateStrokeForMode(mode, s.originalPoints!, thickness, inkSeed, s.inkMirrored) };
	return inkSeed === undefined ? restyled : { ...restyled, inkSeed };
};

export function setBrushThickness(state: AppState, action: Extract<Action, { type: 'SET_BRUSH_THICKNESS' }>): AppState {
	const thickness = action.payload;
	const layerIdx = state.currentLayerIndex;
	const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.brushMode, thickness: state.currentBrushThickness };
	const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };

	// Also update shapes immediately (for onChange events)
	const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
	const newShapes = state.shapes.map(s => (isRegenerable(s, currentLayerZ) ? restyle(s, s.brushMode || currentSettings.mode, thickness) : s));

	return { ...state, currentBrushThickness: thickness, layerBrushSettings: newLayerSettings, shapes: newShapes };
}

export function setBrushThicknessPreview(state: AppState, action: Extract<Action, { type: 'SET_BRUSH_THICKNESS_PREVIEW' }>): AppState {
	const thickness = action.payload;
	const layerIdx = state.currentLayerIndex;
	const currentSettings = state.layerBrushSettings[layerIdx] || { mode: state.brushMode, thickness: state.currentBrushThickness };
	const newLayerSettings = { ...state.layerBrushSettings, [layerIdx]: { ...currentSettings, thickness } };

	const currentLayerZ = layerIdx * -BASE_DEPTH_STEP;
	const newShapes = state.shapes.map(s => (isRegenerable(s, currentLayerZ) ? restyle(s, s.brushMode || currentSettings.mode, thickness) : s));

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
		const strokesWereRestyled = state.shapes.some(s => isRegenerable(s, currentLayerZ));
		if (strokesWereRestyled) {
			// The drag came back to where it started (v3.26.22): every stroke has the thickness it had, so the
			// shapes of before stand and there is no step. It used to leave one that undid nothing.
			const backWhereItStarted = state.shapes.length === prevShapes.length
				&& state.shapes.every((s, i) => s.brushThickness === prevShapes[i].brushThickness);
			if (backWhereItStarted) return { ...state, shapes: prevShapes, brushThicknessBeforePreview: null };
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
	const hasRegenerableStrokes = state.shapes.some(s => isRegenerable(s, currentLayerZ));

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

	// Each stroke keeps ITS thickness (v3.26.22): the mode button changes the mode, it does not unify a
	// layer of several thicknesses. Until then every stroke was redrawn at the slider's value.
	const newShapes = state.shapes.map(s => (isRegenerable(s, currentLayerZ) ? restyle(s, mode, s.brushThickness ?? thickness) : s));

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
