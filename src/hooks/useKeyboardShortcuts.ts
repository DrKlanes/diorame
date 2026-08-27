import { useEffect } from 'react';
import { useStrata } from '../components/strata/StrataContext';
import { shouldIgnoreGlobalKey } from '../utils/keyboardShortcuts';

interface KeyboardShortcutsDeps {
	handleExportRequest: (format: 'svg' | 'svgz') => void;
	handleSaveProject: () => void;
}

export function useKeyboardShortcuts({ handleExportRequest, handleSaveProject }: KeyboardShortcutsDeps): void {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Focus / text-session / animation guards. Shared with the Space pan handler
			// in StrataCanvas so the two window listeners cannot drift apart.
			if (shouldIgnoreGlobalKey(e, {
				textSessionActive: state.textSession.isActive,
				animationBlocking: state.isAnimationMode && state.isAnimationPlaying && state.mode === 'drawing',
			})) return;

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
				// ' ' is NOT handled here since v3.17.15. It became hold-to-pan /
				// tap-to-reset, which needs the pan refs (isPanningRef, gestureRef,
				// isDrawingRef) and a keyup — all of which live in StrataCanvas, a
				// sibling of this hook's host. One owner, not two.
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleExportRequest, handleSaveProject, dispatch, state.textSession.isActive, state.mode, state.isAnimationMode, state.isAnimationPlaying]);
}
