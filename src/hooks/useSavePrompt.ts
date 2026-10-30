import { useSyncExternalStore } from 'react';

// The questions the save flow asks before writing (v3.21.0). Shared state: useSaveLoad runs in several
// components (top bar, Ctrl+S), and the dialogs are mounted once (SaveDialogsV2 in ControlsV2).
export type SaveIntent = 'save' | 'saveAs' | 'duplicate';
export type SavePrompt = { step: 'empty' | 'name'; intent: SaveIntent };

let prompt: SavePrompt | null = null;
const listeners = new Set<() => void>();

export function setSavePrompt(next: SavePrompt | null): void {
	prompt = next;
	listeners.forEach(l => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useSavePrompt(): SavePrompt | null {
	return useSyncExternalStore(subscribe, () => prompt);
}
