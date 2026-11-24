import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { shouldIgnoreGlobalKey } from '../utils/keyboardShortcuts';
import type { AppState } from '../types/strataTypes';
import { isFlatView } from '../utils/flatView';
import type { Action } from '../types/strataActions';

/**
 * Space bar on the main canvas (extracted from StrataCanvas.tsx, refactor phase 6, v3.26.50):
 * hold to pan, tap to reset the view. This hook only ARMS and RELEASES the state; the pan itself
 * is done by the pointer handlers, which read the same refs — that is why the refs stay declared
 * in StrataCanvas and are passed in. StrataCanvas calls it at the exact point the inline effect
 * sat, so effect order and listener registration order are unchanged.
 */
export function useSpacePan({ state, dispatch, isDrawingRef, isPanningRef, isSpaceDownRef, spacePanEngagedRef, setCursorOverride }: {
	state: Pick<AppState, 'mode' | 'cinematicType' | 'textSession' | 'isAnimationMode' | 'isAnimationPlaying'>;
	dispatch: Dispatch<Action>;
	isDrawingRef: MutableRefObject<boolean>;
	isPanningRef: MutableRefObject<boolean>;
	isSpaceDownRef: MutableRefObject<boolean>;
	spacePanEngagedRef: MutableRefObject<boolean>;
	setCursorOverride: Dispatch<SetStateAction<string | null>>;
}): void {
	// Space: hold to pan, tap to reset the view. The industry-standard shortcut
	// (Photoshop, Illustrator, Figma, Blender, Procreate) and the reason it is worth
	// the conflict with the existing tap-to-reset.
	useEffect(() => {
		// Releases the pan. `fireTap` is the hold-vs-tap verdict: a press that never
		// crossed the dead zone was a tap, and taps keep the old meaning (reset view).
		const releaseSpace = (fireTap: boolean) => {
			if (!isSpaceDownRef.current) return;
			const wasTap = !spacePanEngagedRef.current;
			isSpaceDownRef.current = false;
			spacePanEngagedRef.current = false;
			isPanningRef.current = false;
			setCursorOverride(null);
			if (fireTap && wasTap) dispatch({ type: 'RESET_DRAWING_VIEW' });
		};

		const handleSpaceDown = (e: KeyboardEvent) => {
			if (e.key !== ' ') return;
			// Holding a key autorepeats keydown at the OS rate. Harmless while Space only
			// did RESET_DRAWING_VIEW (idempotent), fatal now: every repeat would re-seed
			// the pan origin and pin the canvas in place.
			if (e.repeat) return;
			if (shouldIgnoreGlobalKey(e, {
				textSessionActive: state.textSession.isActive,
				animationBlocking: state.isAnimationMode && state.isAnimationPlaying && state.mode === 'drawing',
			})) return;
			if (state.mode !== 'drawing' && !isFlatView(state)) return; // the flat view pans as DRAW (v3.26.74)
			// Mid-stroke: the pen is down and points are being collected. Taking over now
			// would pan the canvas out from under an unfinished stroke and bake the jump
			// into its geometry. Ignore the press entirely — no armed state, so the keyup
			// has nothing to release and the stroke finishes untouched.
			if (isDrawingRef.current) return;
			e.preventDefault();
			isSpaceDownRef.current = true;
			spacePanEngagedRef.current = false;
			setCursorOverride('cursor-grab');
		};

		// NO GUARDS HERE, AND THAT IS DELIBERATE — do not "fix" this by adding them.
		// Every guard on the keydown asks "should this gesture start?". This asks
		// "has the key been let go?", and the answer can never be conditional: the
		// state was already armed, and whatever is true NOW cannot un-arm it. Guard
		// this on textSession and a user who pans, then opens the text tool without
		// releasing Space, is left with a pan stuck on forever. Releasing state is
		// unconditional. Same reason `blur` is wired below: Alt+Tab mid-pan means the
		// keyup is delivered to another window and never arrives here at all.
		const handleSpaceUp = (e: KeyboardEvent) => {
			if (e.key !== ' ') return;
			releaseSpace(true);
		};
		// A lost window is not a tap: release without re-centring.
		const handleBlur = () => releaseSpace(false);

		window.addEventListener('keydown', handleSpaceDown);
		window.addEventListener('keyup', handleSpaceUp);
		window.addEventListener('blur', handleBlur);
		return () => {
			window.removeEventListener('keydown', handleSpaceDown);
			window.removeEventListener('keyup', handleSpaceUp);
			window.removeEventListener('blur', handleBlur);
		};
	}, [dispatch, state.mode, state.cinematicType, state.textSession.isActive, state.isAnimationMode, state.isAnimationPlaying]);
}
