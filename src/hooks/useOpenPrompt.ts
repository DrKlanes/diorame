import { useSyncExternalStore } from 'react';

// Unsaved-changes guard of Open / drop / OS launch (v3.25.3). A file that is already validated waits here as
// `apply` until the user answers; `afterSave` is the same load waiting for "Save first" to finish writing.
// Shared like useSavePrompt: useSaveLoad runs in several components, the dialog is mounted once.
let pending: { apply: () => void } | null = null;
let afterSave: (() => void) | null = null;
const listeners = new Set<() => void>();

export function setOpenPrompt(next: { apply: () => void } | null): void {
	pending = next;
	listeners.forEach(l => l());
}

export function getOpenPrompt() { return pending; }

// Set by "Save first"; run by performSave when the write succeeded, dropped on every other outcome.
export function setAfterSave(fn: (() => void) | null): void { afterSave = fn; }
export function takeAfterSave(): (() => void) | null { const fn = afterSave; afterSave = null; return fn; }

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useOpenPrompt() {
	return useSyncExternalStore(subscribe, () => pending);
}
