export interface ShortcutItem { label: string; shortcut: string; }
export interface ShortcutGroup { category: string; items: ShortcutItem[]; }

export function hasFinePointer(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
}

export function isMac(): boolean {
	return typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
}

export function formatShortcut(s: string): string {
	if (isMac()) {
		return s
			.replace(/Ctrl\+Shift\+/g, '⇧⌘')
			.replace(/Ctrl\+/g, '⌘')
			.replace(/Cmd\+/g, '⌘')
			.replace(/Shift\+/g, '⇧')
			.replace(/Alt\+/g, '⌥')
			.replace(/Option\+/g, '⌥');
	}
	return s;
}

export const SHORTCUTS_GROUPS: ShortcutGroup[] = [
	{ category: 'File', items: [
		{ label: 'Save project', shortcut: 'Ctrl+S' },
		{ label: 'Export SVG', shortcut: 'Ctrl+E' },
		{ label: 'Export SVGZ', shortcut: 'Ctrl+Shift+E' },
	] },
	{ category: 'Edit', items: [
		{ label: 'Undo', shortcut: 'Ctrl+Z' },
		{ label: 'Redo', shortcut: 'Ctrl+Y' },
	] },
	{ category: 'View', items: [
		{ label: 'Dark mode', shortcut: 'Shift+D' },
		{ label: 'Open shortcuts', shortcut: 'Shift+?' },
	] },
	{ category: 'Tools (Draw)', items: [
		{ label: 'Blob', shortcut: 'B' },
		{ label: 'Brush', shortcut: 'L' },
		{ label: 'Eraser', shortcut: 'E' },
		{ label: 'Text', shortcut: 'T' },
		{ label: 'Move', shortcut: 'M' },
	] },
	{ category: 'Layers (Draw)', items: [
		{ label: 'Previous layer', shortcut: '[' },
		{ label: 'Next layer', shortcut: ']' },
	] },
	{ category: 'Canvas (Draw)', items: [
		{ label: 'Reset view', shortcut: 'Space' },
	] },
];
