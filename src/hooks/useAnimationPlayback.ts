import { useEffect } from 'react';
import { useStrata } from '../components/strata/StrataContext';

/**
 * Drives animation playback in DRAW mode.
 * When isAnimationPlaying is true, dispatches ADVANCE_ANIMATION_FRAME
 * at the interval defined by animationFramerate (4 / 6 / 8 fps).
 * Cleans up the interval on pause, framerate change, or unmount.
 */
export function useAnimationPlayback(): void {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		if (!state.isAnimationPlaying) return;
		const ms = 1000 / state.animationFramerate;
		const id = setInterval(() => dispatch({ type: 'ADVANCE_ANIMATION_FRAME' }), ms);
		return () => clearInterval(id);
	}, [state.isAnimationPlaying, state.animationFramerate, dispatch]);
}
