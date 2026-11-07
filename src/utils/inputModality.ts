// Last input device (keyboard or pointer), tracked once for the whole document. :focus-visible alone is not enough in
// the export popover: it moves focus by script when it opens, and Chrome can count that as keyboard focus after a click.

let keyboard = false;

if (typeof document !== 'undefined') {
	document.addEventListener('keydown', () => { keyboard = true; }, true);
	document.addEventListener('pointerdown', () => { keyboard = false; }, true);
}

/** True when `el` took focus from the keyboard: last input was a key AND the browser agrees (:focus-visible). */
export const isKeyboardFocus = (el: Element): boolean => keyboard && el.matches(':focus-visible');
