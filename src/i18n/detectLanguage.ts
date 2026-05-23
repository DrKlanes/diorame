import type { Language } from './types';

const STORAGE_KEY = 'diorame-language';

/**
 * Returns the initial language to use.
 * Priority: 1) localStorage saved preference, 2) navigator.language prefix, 3) 'en' fallback.
 */
export function getInitialLanguage(): Language {
	// SSR safety (Diorame is client-only but defensive)
	if (typeof window === 'undefined') return 'en';

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'en' || stored === 'es') return stored;

	const browser = navigator.language.toLowerCase();
	return browser.startsWith('es') ? 'es' : 'en';
}

export function persistLanguage(lang: Language): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, lang);
	} catch {
		// localStorage may fail in private mode / quota exceeded — silently ignore
	}
}
