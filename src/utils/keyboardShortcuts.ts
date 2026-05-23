export interface ShortcutItem { labelKey: string; shortcut: string; }
export interface ShortcutGroup { categoryKey: string; items: ShortcutItem[]; }

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

// Values are i18n keys (resolved via t() at the WelcomeModalV2 render site).
export const SHORTCUTS_GROUPS: ShortcutGroup[] = [
	{ categoryKey: 'shortcuts.category.file', items: [
		{ labelKey: 'shortcuts.label.saveProject', shortcut: 'Ctrl+S' },
		{ labelKey: 'shortcuts.label.exportSvg',   shortcut: 'Ctrl+E' },
		{ labelKey: 'shortcuts.label.exportSvgz',  shortcut: 'Ctrl+Shift+E' },
	] },
	{ categoryKey: 'shortcuts.category.edit', items: [
		{ labelKey: 'shortcuts.label.undo', shortcut: 'Ctrl+Z' },
		{ labelKey: 'shortcuts.label.redo', shortcut: 'Ctrl+Y' },
	] },
	{ categoryKey: 'shortcuts.category.view', items: [
		{ labelKey: 'shortcuts.label.darkMode',       shortcut: 'Shift+D' },
		{ labelKey: 'shortcuts.label.openShortcuts',  shortcut: 'Shift+?' },
	] },
	{ categoryKey: 'shortcuts.category.toolsDraw', items: [
		{ labelKey: 'shortcuts.label.blob',   shortcut: 'B' },
		{ labelKey: 'shortcuts.label.brush',  shortcut: 'L' },
		{ labelKey: 'shortcuts.label.eraser', shortcut: 'E' },
		{ labelKey: 'shortcuts.label.text',   shortcut: 'T' },
		{ labelKey: 'shortcuts.label.move',   shortcut: 'M' },
	] },
	{ categoryKey: 'shortcuts.category.layersDraw', items: [
		{ labelKey: 'shortcuts.label.previousLayer', shortcut: '[' },
		{ labelKey: 'shortcuts.label.nextLayer',     shortcut: ']' },
	] },
	{ categoryKey: 'shortcuts.category.canvasDraw', items: [
		{ labelKey: 'shortcuts.label.resetView', shortcut: 'Space' },
	] },
];
