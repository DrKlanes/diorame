export interface ShortcutItem { labelKey: string; shortcut: string; }
export interface ShortcutGroup { categoryKey: string; items: ShortcutItem[]; }

/**
 * Whether a global keyboard shortcut must stand down because focus belongs to
 * something that owns the key, or because the app is in a state where shortcuts
 * are blocked.
 *
 * Shared BY DESIGN between the two places that listen for keys on `window`:
 * `useKeyboardShortcuts` (in ControlsV2) and the Space pan in `StrataCanvas`.
 * They are siblings and cannot share a ref, so the Space handling had to move to
 * StrataCanvas — and the moment there are two entry points, these guards are the
 * one thing that must never drift apart. A user typing in the text session who
 * presses Space and gets a canvas pan instead of a space character is a silent
 * failure: nothing looks broken, the character just never appears.
 *
 * Only for KEYDOWN. A keyup that RELEASES state must never be guarded — see the
 * comment on the Space keyup in StrataCanvas.
 */
export function shouldIgnoreGlobalKey(
	e: KeyboardEvent,
	ctx: { textSessionActive: boolean; animationBlocking: boolean },
): boolean {
	// A text session owns every key while it is open.
	if (ctx.textSessionActive) return true;

	// Text entry — sliders (type="range") are excluded intentionally, so the tool
	// shortcuts keep working while a slider has focus.
	const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
	const isTextEntry = activeEl && (
		activeEl.tagName === 'TEXTAREA' ||
		(activeEl instanceof HTMLInputElement && activeEl.type !== 'range')
	);
	if (isTextEntry) return true;

	// Space and Enter ARE how the browser presses a focused button, link or option.
	// Scoped to those two keys on purpose: letters and Cmd-combos do not activate
	// controls, and blocking them would break Cmd+Z for anyone who just clicked a UI
	// button. (v3.17.14)
	const isActivationKey = e.key === ' ' || e.key === 'Enter';
	const isInteractiveControl = activeEl instanceof HTMLElement && (
		activeEl.tagName === 'BUTTON' ||
		activeEl.tagName === 'A' ||
		activeEl.getAttribute('role') === 'button' ||
		activeEl.getAttribute('role') === 'option'
	);
	if (isActivationKey && isInteractiveControl) return true;

	// Animation playback in DRAW mode blocks every shortcut.
	if (ctx.animationBlocking) return true;

	return false;
}

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
