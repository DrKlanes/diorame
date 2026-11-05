import { useSyncExternalStore } from 'react';
import { LAYERS_TOOLTIP_VISITED_KEY, LAYERS_TOOLTIP_SEEN_KEY } from '../constants/layersDiscoveryTooltip';

export const TOUR_SEEN_KEY = 'diorame-tour-seen';

// Signs of a previous visit, read ONCE at module load: the app writes some of them during the
// session (first stroke), so reading later would mistake a new user for a returning one.
// Fail-safe: if localStorage is blocked, treat as returning (never show).
const RETURNING_KEYS = [LAYERS_TOOLTIP_VISITED_KEY, LAYERS_TOOLTIP_SEEN_KEY, 'diorame-onboarding-seen'];
let returningAtLoad = true;
try { returningAtLoad = RETURNING_KEYS.some(k => localStorage.getItem(k) !== null); }
catch { /* localStorage blocked: returning */ }

/**
 * Call when a user presses "Start drawing" in the welcome modal. Marks the tour as seen
 * (on open, not on play) and returns true only the first time, for a user with no sign of a
 * previous visit and no autosave. A user with signs of a previous visit is marked WITHOUT showing.
 */
export function claimTourFirstRun(hasAutosave: boolean): boolean {
	try {
		if (localStorage.getItem(TOUR_SEEN_KEY) !== null) return false;
		localStorage.setItem(TOUR_SEEN_KEY, 'true');
		return !returningAtLoad && !hasAutosave;
	} catch {
		return false; // cannot persist: never show, or it would come back every session
	}
}

// Open state outside the reducer: OnboardingOverlayConnected (inside StrataCanvas) must wait for it.
let tourOpen = false;
const listeners = new Set<() => void>();
export function setTourOpen(open: boolean): void {
	tourOpen = open;
	listeners.forEach(l => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useTourOpen(): boolean {
	return useSyncExternalStore(subscribe, () => tourOpen);
}
