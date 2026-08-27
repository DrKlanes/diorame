import { useEffect } from 'react';
import { useStrata } from '../components/strata/StrataContext';

interface KeyboardShortcutsDeps {
	handleExportRequest: (format: 'svg' | 'svgz') => void;
	handleSaveProject: () => void;
}

export function useKeyboardShortcuts({ handleExportRequest, handleSaveProject }: KeyboardShortcutsDeps): void {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Guard 1: text session active
			if (state.textSession.isActive) return;
			// Guard 2: focus belongs to a control that owns its own keys.
			//
			// Text entry — sliders (type="range") are excluded intentionally, so the
			// tool shortcuts keep working while a slider has focus.
			const activeEl = document.activeElement;
			const isTextEntry = activeEl && (
				activeEl.tagName === 'TEXTAREA' ||
				(activeEl instanceof HTMLInputElement && activeEl.type !== 'range')
			);
			if (isTextEntry) return;
			// Activation keys on a focused interactive control. Space and Enter ARE how
			// the browser presses a focused button, link or option; a global shortcut has
			// no business overriding that. Without this, ' ' below reached preventDefault()
			// and re-centred the canvas instead of pressing the focused button (71 of them
			// on screen — anyone who clicks one and then taps space hit it), and it
			// double-fired on DiSelectorOption: the option was chosen AND the view reset.
			// Verified in-browser before the fix: with a button focused, preventDefault ran
			// and the button never activated.
			//
			// Scoped to ' ' and Enter ON PURPOSE, rather than skipping every shortcut when
			// a control has focus. Letters and Cmd-combos do not activate controls, so
			// blocking those would break Cmd+Z (and B/L/E/T/M, [ , ]) for anyone who just
			// clicked a UI button — a worse bug than the one being fixed.
			//
			// Deliberate consequence: RESET_DRAWING_VIEW (' ') now only fires when focus is
			// on the canvas or on nothing, not from any focus as before.
			const isActivationKey = e.key === ' ' || e.key === 'Enter';
			const isInteractiveControl = activeEl instanceof HTMLElement && (
				activeEl.tagName === 'BUTTON' ||
				activeEl.tagName === 'A' ||
				activeEl.getAttribute('role') === 'button' ||
				activeEl.getAttribute('role') === 'option'
			);
			if (isActivationKey && isInteractiveControl) return;
			// Guard 3: animation playback active in DRAW mode — all shortcuts blocked
			if (state.isAnimationMode && state.isAnimationPlaying && state.mode === 'drawing') return;

			const cmd = e.metaKey || e.ctrlKey;
			const shift = e.shiftKey;

			// === EXISTING SHORTCUTS ===
			if (cmd && e.key.toLowerCase() === 'e' && !shift) {
				e.preventDefault();
				handleExportRequest('svg');
				return;
			}
			if (cmd && shift && e.key.toLowerCase() === 'e') {
				e.preventDefault();
				handleExportRequest('svgz');
				return;
			}
			if (shift && e.key.toLowerCase() === 'd') {
				e.preventDefault();
				dispatch({ type: 'TOGGLE_DARK_MODE' });
				return;
			}
			if (cmd && !shift && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				dispatch({ type: 'UNDO' });
				return;
			}
			if (cmd && e.key.toLowerCase() === 'y') {
				e.preventDefault();
				dispatch({ type: 'REDO' });
				return;
			}

			// === NEW GLOBAL SHORTCUTS ===
			if (cmd && !shift && e.key.toLowerCase() === 's') {
				e.preventDefault();
				handleSaveProject();
				return;
			}
			if (!cmd && shift && e.key === '?') {
				dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
				return;
			}

			// === DRAWING MODE ONLY (Guard 3) ===
			if (state.mode !== 'drawing') return;

			if (!cmd && !shift) {
				switch (e.key.toLowerCase()) {
					case 'b': dispatch({ type: 'SET_TOOL', payload: 'blob' }); return;
					case 'l': dispatch({ type: 'SET_TOOL', payload: 'brush' }); return;
					case 'e': dispatch({ type: 'SET_TOOL', payload: 'eraser' }); return;
					case 't': dispatch({ type: 'SET_TOOL', payload: 'text' }); return;
					case 'm': dispatch({ type: 'SET_TOOL', payload: 'move' }); return;
				}
				if (e.key === '[') { dispatch({ type: 'PREV_LAYER' }); return; }
				if (e.key === ']') { dispatch({ type: 'NEXT_LAYER' }); return; }
				if (e.key === ' ') { e.preventDefault(); dispatch({ type: 'RESET_DRAWING_VIEW' }); return; }
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleExportRequest, handleSaveProject, dispatch, state.textSession.isActive, state.mode, state.isAnimationMode, state.isAnimationPlaying]);
}
