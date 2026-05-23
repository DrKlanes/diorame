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
			// Guard 2: input/textarea focused
			const activeEl = document.activeElement;
			if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

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
			if (cmd && !shift && e.key === 's') {
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
					case 'b': dispatch({ type: 'SET_TOOL', payload: 'brush' }); return;
					case 'l': dispatch({ type: 'SET_TOOL', payload: 'line' }); return;
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
	}, [handleExportRequest, handleSaveProject, dispatch, state.textSession.isActive, state.mode]);
}
