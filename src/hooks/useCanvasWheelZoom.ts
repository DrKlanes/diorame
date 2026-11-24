import { useEffect, type Dispatch, type RefObject } from 'react';
import type { AppState } from '../types/strataTypes';
import { isFlatView } from '../utils/flatView';
import type { Action } from '../types/strataActions';

/**
 * Wheel zoom of the main canvas (extracted from StrataCanvas.tsx, refactor phase 6, v3.26.49):
 * in DRAW, zoom about the cursor with the world-space pan clamp; in CINEMA orbit, the view zoom
 * offset. A native non-passive listener because React's onWheel is passive and could not
 * preventDefault the page scroll. StrataCanvas calls it at the same point the inline effect sat,
 * so effect order is unchanged.
 */
export function useCanvasWheelZoom({ canvasRef, state, dispatch, MAX_PAN }: {
	canvasRef: RefObject<HTMLCanvasElement>;
	state: Pick<AppState, 'mode' | 'cinematicType' | 'drawingZoom' | 'drawingPan' | 'viewZoomOffset'>;
	dispatch: Dispatch<Action>;
	MAX_PAN: number;
}): void {
	// Wheel Listener for Zoom
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const onWheel = (e: WheelEvent) => {
			// Support wheel zoom in both Drawing mode and Orbit (Free View) mode
			// The flat view (v3.26.74) zooms as in DRAW: it falls through to the drawing-mode branch.
			if (state.mode !== 'drawing' && !isFlatView(state) && !(state.mode === 'cinematic' && state.cinematicType === 'orbit')) return;
			e.preventDefault();

			// Handle Orbit (Free View) mode zoom differently
			if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
				const zoomStep = e.deltaY > 0 ? 100 : -100; // Move camera closer/farther
				const newOffset = Math.min(Math.max(state.viewZoomOffset + zoomStep, -5000), 2000);
				dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: newOffset });
				return;
			}

			// Drawing mode zoom
			const rect = canvas.getBoundingClientRect();
			const cx = rect.width / 2;
			const cy = rect.height / 2;

			const screenX = e.clientX - rect.left - cx;
			const screenY = e.clientY - rect.top - cy;

			const currentZoom = state.drawingZoom || 1;
			const currentPan = state.drawingPan || { x: 0, y: 0 };

			const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
			let newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.5), 3.0); // Allow zoom out to 0.5x

			let newPanX = screenX - ((screenX - currentPan.x) / currentZoom) * newZoom;
			let newPanY = screenY - ((screenY - currentPan.y) / currentZoom) * newZoom;

			// World-space clamp (v3.25.5): the view centre stays within ±MAX_PAN world units at any zoom.
			newPanX = Math.max(-MAX_PAN * newZoom, Math.min(MAX_PAN * newZoom, newPanX));
			newPanY = Math.max(-MAX_PAN * newZoom, Math.min(MAX_PAN * newZoom, newPanY));

			dispatch({
				type: 'SET_DRAWING_ZOOM',
				payload: { zoom: newZoom, pan: { x: newPanX, y: newPanY } }
			});
		};

		canvas.addEventListener('wheel', onWheel, { passive: false });
		return () => canvas.removeEventListener('wheel', onWheel);
	}, [state.mode, state.cinematicType, state.drawingZoom, state.drawingPan, state.viewZoomOffset, dispatch]);
}
