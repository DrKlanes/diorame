// The text session: the text being typed on the canvas before it becomes a shape. Starting, updating and cancelling
// leave no trace in the history; committing adds the text shape (one undo step) unless it is empty. Out of
// StrataContext.tsx (v3.26.31, refactor phase 3B), moved as it was.
import { BASE_DEPTH_STEP } from '../constants/layers';
import { pushHistory, createSnapshot } from './history';
import type { AppState, Shape } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function startTextSession(state: AppState, action: Extract<Action, { type: 'START_TEXT_SESSION' }>): AppState {
	return {
		...state,
		textSession: {
			isActive: true,
			x: action.payload.x,
			y: action.payload.y,
			content: '',
			font: 'noir',
			align: 'left'
		}
	};
}

export function updateTextSession(state: AppState, action: Extract<Action, { type: 'UPDATE_TEXT_SESSION' }>): AppState {
	return {
		...state,
		textSession: {
			...state.textSession,
			...action.payload
		}
	};
}

export function commitTextSession(state: AppState): AppState {
	if (!state.textSession.isActive || !state.textSession.content.trim()) {
		return { ...state, textSession: { ...state.textSession, isActive: false } };
	}

	const textShape: Shape = {
		id: Date.now().toString(),
		type: 'text',
		points: [{ x: state.textSession.x, y: state.textSession.y }],
		color: state.palette[state.currentColorIndex],
		zIndex: state.currentLayerIndex * -BASE_DEPTH_STEP,
		text: state.textSession.content,
		font: state.textSession.font,
		align: state.textSession.align,
		fontSize: 40, // Base font size
		rotation: 0,
		isDrawInside: false,
		isDrawBehind: false,
		t: Date.now(),
	};

	const shapesWithText = [...state.shapes, textShape];
	const { history: textHistory, index: textIndex } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: shapesWithText }));

	return {
		...state,
		shapes: shapesWithText,
		history: textHistory,
		historyIndex: textIndex,
		textSession: { ...state.textSession, isActive: false, content: '' },
		isDirty: true,
	};
}

export function cancelTextSession(state: AppState): AppState {
	return {
		...state,
		textSession: { ...state.textSession, isActive: false, content: '' }
	};
}
