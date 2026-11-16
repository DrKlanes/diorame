// The app around the drawing: the welcome modal and the onboarding, sounds (the preference is persisted by
// soundManager), hiding the UI, dark mode (saved with the project, so it dirties it), and the export request the
// canvas answers. No undo step. Out of StrataContext.tsx (v3.26.36, refactor phase 3B), moved as it was.
import { setSoundsEnabled as setSoundsManagerEnabled, persistSoundsPreference, playSound } from '../utils/soundManager';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function toggleWelcomeModal(state: AppState): AppState {
	return { ...state, isWelcomeModalOpen: !state.isWelcomeModalOpen };
}

export function dismissOnboarding(state: AppState): AppState {
	return { ...state, isOnboardingVisible: false };
}

export function setSoundsEnabled(state: AppState, action: Extract<Action, { type: 'SET_SOUNDS_ENABLED' }>): AppState {
	setSoundsManagerEnabled(action.payload);
	persistSoundsPreference(action.payload);
	return { ...state, soundsEnabled: action.payload };
}

export function toggleUi(state: AppState): AppState {
	playSound('click');
	return { ...state, isUIHidden: !state.isUIHidden };
}

export function toggleDarkMode(state: AppState): AppState {
	playSound('click');
	return { ...state, isDarkMode: !state.isDarkMode, isDirty: true };
}

export function requestExport(state: AppState, action: Extract<Action, { type: 'REQUEST_EXPORT' }>): AppState {
	return { ...state, exportRequest: action.payload, isExporting: true };
}

export function finishExport(state: AppState): AppState {
	return { ...state, exportRequest: null, isExporting: false };
}
