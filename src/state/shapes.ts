// Adding shapes to the drawing: one (a stroke, a blob, an eraser pass) or several at once. Each is one undo step and
// dirties the project; the creation time `t` (the timelapse's clock) and the seed of an Ink stroke are stamped here,
// and the active layer's brush pair is materialized in the state. Out of StrataContext.tsx (v3.26.32, refactor
// phase 3B), moved as it was.
import { withInkSeed } from '../utils/layerBrush';
import { playSound } from '../utils/soundManager';
import { pushHistory, createSnapshot } from './history';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function addShape(state: AppState, action: Extract<Action, { type: 'ADD_SHAPE' }>): AppState {
	if (state.tool === 'blob' || state.tool === 'brush') playSound('brushStroke');
	// Creation time stamped here, not in the pointer handler (v3.25.16): the timelapse's clock.
	// An Ink stroke gets the seed of its noise here too (v3.26.22): the one its outline was just drawn with.
	const newShapes = [...state.shapes, withInkSeed({ ...action.payload, t: Date.now() })];
	const snapshot = createSnapshot({ ...state, shapes: newShapes });
	const { history, index } = pushHistory(state.history, state.historyIndex, snapshot);

	return {
		...state,
		shapes: newShapes,
		// The layer's brush pair, materialized in the state too (not only in the snapshot): a
		// later patchCurrentSnapshot copies this map over the snapshot and must not drop it.
		layerBrushSettings: snapshot.layerBrushSettings,
		history,
		historyIndex: index,
		isDirty: true,
	};
}

export function addShapes(state: AppState, action: Extract<Action, { type: 'ADD_SHAPES' }>): AppState {
	if (state.tool === 'blob' || state.tool === 'brush') playSound('brushStroke');
	const t = Date.now();
	const newShapes = [...state.shapes, ...action.payload.map(s => withInkSeed({ ...s, t }))];
	const snapshot = createSnapshot({ ...state, shapes: newShapes });
	const { history, index } = pushHistory(state.history, state.historyIndex, snapshot);

	return {
		...state,
		shapes: newShapes,
		layerBrushSettings: snapshot.layerBrushSettings,
		history,
		historyIndex: index,
		isDirty: true,
	};
}
