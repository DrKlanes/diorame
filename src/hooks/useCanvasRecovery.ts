import { useEffect, useRef } from 'react';

/**
 * Recovers orphaned gesture state when the app returns to the foreground.
 *
 * On iPad PWA standalone, saving a .dior fires an <a download>.click() which opens
 * the system share sheet → the app goes to background and iOS may not deliver the
 * gesture-closing events (pointerup/leave/cancel/touchend/blur). That leaves gesture
 * flags stuck (gestureRef.isPinching, isDrawingRef, pointerCapture), which blocks both
 * drawing and zoom until a manual refresh.
 *
 * This hook calls `onRecover` ONLY when the document becomes visible again
 * (visibilitychange → visible, plus pageshow as reinforcement). It NEVER fires on the
 * way to hidden: while going to background we cannot know whether a gesture is
 * legitimate, but on return any still-live gesture is necessarily orphaned (a pointer
 * cannot stay physically pressed across a backgrounding). Resetting on hidden would
 * kill legitimate in-progress strokes.
 *
 * The latest `onRecover` is held in a ref so the listener registers once and never
 * re-binds, even if the caller passes a fresh callback each render.
 */
export function useCanvasRecovery(onRecover: () => void): void {
	const cbRef = useRef(onRecover);
	useEffect(() => { cbRef.current = onRecover; }, [onRecover]);

	useEffect(() => {
		const handleVisible = () => {
			if (document.visibilityState === 'visible') cbRef.current();
		};
		document.addEventListener('visibilitychange', handleVisible);
		window.addEventListener('pageshow', handleVisible);
		return () => {
			document.removeEventListener('visibilitychange', handleVisible);
			window.removeEventListener('pageshow', handleVisible);
		};
	}, []);
}
