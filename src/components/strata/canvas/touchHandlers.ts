import type React from 'react';
import type { CanvasHandlerEnv } from './handlerEnv';
import { isFlatView } from '../../../utils/flatView';
import { twoTouchMetrics, threeTouchCenter, hasTapMoved, canStartPinch, tapGestureAction, pinchZoom, pinchPan, orbitTouchPan, orbitTouchRotation, orbitPinchZoomOffset } from './touchGestures';

/**
 * The touch handlers of the canvas: two-finger tap (undo), three-finger tap (redo) and pinch in
 * DRAW; pan, rotate and pinch in CINEMA orbit.
 *
 * Moved out of StrataCanvas (handlers sprint, v3.26.61). The four handlers below are the text
 * that was written inside the component, character for character — same branches, same order of
 * ref writes and dispatches. What they closed over arrives in `env` (canvas/handlerEnv.ts): the
 * state of the render that created them and the component's refs, read at event time as before.
 * StrataCanvas calls this once per render, where the handlers were defined, and binds the four
 * functions to the same canvas props. No effect and no listener is registered here.
 *
 * Maths and thresholds: canvas/touchGestures.ts. A pinch whose centre stays still is read as a
 * two-finger tap — current behaviour, pinned by tests/handlers.characterization.test.ts.
 */
export const createTouchHandlers = (env: CanvasHandlerEnv) => {
	const { state, dispatch, canvasRef, currentPointsRef, isDrawingRef, drawingPointerTypeRef, gestureRef, pinchEndTimestampRef, isPanningRef, orbitRef, transformRef, pendingDeselectRef, setIsDrawing, MAX_PAN } = env;

	const handleTouchStart = (e: React.TouchEvent) => {
		if (state.textSession.isActive) return;
		// Support both drawing mode and orbit (free view) mode; the flat view (v3.26.74) takes DRAW's gestures.
		if (state.mode === 'drawing' || isFlatView(state)) {
			// Protect Pen Drawing: If we are already drawing with a pen, ignore touch gestures (palm rejection)
			if (isDrawingRef.current && drawingPointerTypeRef.current === 'pen') return;

			if (e.touches.length === 2) {
				setIsDrawing(false);
				currentPointsRef.current = [];
				// Flat view: the first finger's plain-drag pan gives way to the pinch (DRAW has no such pan to end).
				if (isFlatView(state)) isPanningRef.current = false;
				// A second finger turns this into a multi-touch gesture, so the
				// single-pointer gizmo drag is ABANDONED — never committed. Same contract
				// as pointercancel and as Escape: TRANSFORM_LAYER only fires on pointerup,
				// so the shapes were never touched and there is nothing to undo.
				// Without this the drag is orphaned: setIsDrawing(false) above makes
				// handlePointerUp bail at its isDrawingRef guard, which is the very line
				// that would have cleared isActive.
				transformRef.current.isActive = false;
				transformRef.current.mode = 'none';
				transformRef.current.engaged = false;
				// And the deselection the first finger may have recorded: a multi-touch
				// gesture cancels it for the same reason it cancels the drag above — this
				// was never the tap the table thought it was.
				pendingDeselectRef.current = false;
				// Maths extracted to canvas/touchGestures.ts
				const { dist, cx, cy } = twoTouchMetrics(e.touches[0], e.touches[1]);
				drawingPointerTypeRef.current = null; // Clear to prevent orphan touch strokes
				gestureRef.current = {
					...gestureRef.current,
					startDist: dist,
					startZoom: state.drawingZoom || 1,
					startPan: { ...state.drawingPan },
					startCenter: { x: cx, y: cy },
					tapStartTime: Date.now(),
					tapMoved: false,
					tapTouchCount: 2,
				};
			} else if (e.touches.length === 3) {
				setIsDrawing(false);
				currentPointsRef.current = [];
				if (isFlatView(state)) isPanningRef.current = false;
				drawingPointerTypeRef.current = null;
				// Same abandonment as the 2-touch branch above.
				transformRef.current.isActive = false;
				transformRef.current.mode = 'none';
				transformRef.current.engaged = false;
				pendingDeselectRef.current = false;
				const { cx, cy } = threeTouchCenter(e.touches[0], e.touches[1], e.touches[2]);
				gestureRef.current = {
					...gestureRef.current,
					startCenter: { x: cx, y: cy },
					tapStartTime: Date.now(),
					tapMoved: false,
					tapTouchCount: 3,
				};
			}
		} else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
			// Orbit mode touch gestures
			if (e.touches.length === 1) {
				// Single touch: Pan
				const t = e.touches[0];
				gestureRef.current = {
					...gestureRef.current,
					isOrbitTouch: true,
					orbitTouchStartPanX: orbitRef.current.panOffsetX,
					orbitTouchStartPanY: orbitRef.current.panOffsetY,
					orbitTouchStartAzimuth: orbitRef.current.targetAzimuth,
					orbitTouchStartElevation: orbitRef.current.targetElevation,
					orbitTouchStartZoom: state.viewZoomOffset,
					orbitTouchLastPos: { x: t.clientX, y: t.clientY }
				};
			} else if (e.touches.length === 2) {
				// Two touches: Orbit rotation or pinch zoom
				const { dist, cx, cy } = twoTouchMetrics(e.touches[0], e.touches[1]);

				gestureRef.current = {
					...gestureRef.current,
					isOrbitTouch: true,
					isPinching: true,
					startDist: dist,
					orbitTouchStartAzimuth: orbitRef.current.targetAzimuth,
					orbitTouchStartElevation: orbitRef.current.targetElevation,
					orbitTouchStartZoom: state.viewZoomOffset,
					orbitTouchLastPos: { x: cx, y: cy },
					startCenter: { x: cx, y: cy }
				};
			}
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (state.mode === 'drawing' || isFlatView(state)) {
			if (e.touches.length === 2) {
				// Thresholds and pinch maths extracted to canvas/touchGestures.ts
				if (!gestureRef.current.tapMoved) {
					const { cx, cy } = twoTouchMetrics(e.touches[0], e.touches[1]);
					if (hasTapMoved(gestureRef.current.startCenter, cx, cy)) {
						gestureRef.current.tapMoved = true;
						if (canStartPinch(gestureRef.current.startDist)) {
							gestureRef.current.isPinching = true;
						}
					}
				}
				if (gestureRef.current.isPinching) {
					e.preventDefault();
					const { dist, cx, cy } = twoTouchMetrics(e.touches[0], e.touches[1]);

					const newZoom = pinchZoom(gestureRef.current, dist);
					if (newZoom === null) return;

					const rect = canvasRef.current?.getBoundingClientRect();
					if (!rect) return;

					dispatch({
						type: 'SET_DRAWING_ZOOM',
						payload: { zoom: newZoom, pan: pinchPan(gestureRef.current, newZoom, cx, cy, rect, MAX_PAN) }
					});
				}
			} else if (e.touches.length === 3 && !gestureRef.current.tapMoved) {
				const { cx, cy } = threeTouchCenter(e.touches[0], e.touches[1], e.touches[2]);
				if (hasTapMoved(gestureRef.current.startCenter, cx, cy)) {
					gestureRef.current.tapMoved = true;
				}
			}
		} else if (state.mode === 'cinematic' && state.cinematicType === 'orbit' && gestureRef.current.isOrbitTouch) {
			e.preventDefault();

			if (e.touches.length === 1) {
				// Single touch: Pan camera (maths extracted to canvas/touchGestures.ts)
				const pan = orbitTouchPan(gestureRef.current, e.touches[0]);
				orbitRef.current.panOffsetX = pan.panOffsetX;
				orbitRef.current.panOffsetY = pan.panOffsetY;

			} else if (e.touches.length === 2) {
				// Two touches: Calculate both orbit rotation and pinch zoom
				const { dist, cx, cy } = twoTouchMetrics(e.touches[0], e.touches[1]);

				const rotation = orbitTouchRotation(gestureRef.current, cx, cy);
				orbitRef.current.targetAzimuth = rotation.targetAzimuth;
				orbitRef.current.targetElevation = rotation.targetElevation;

				// Pinch zoom
				if (gestureRef.current.isPinching && gestureRef.current.startDist > 0) {
					dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: orbitPinchZoomOffset(gestureRef.current, dist) });
				}
			}
		}
	};

	const handleTouchEnd = (e: React.TouchEvent) => {
		if (state.mode === 'drawing' || isFlatView(state)) {
			if (e.touches.length === 0) {
				const { tapMoved, tapStartTime, tapTouchCount } = gestureRef.current;
				if (!tapMoved && !state.textSession.isActive) {
					// Decision extracted to canvas/touchGestures.ts
					const tap = tapGestureAction(tapTouchCount, Date.now() - tapStartTime);
					if (tap === 'UNDO') {
						gestureRef.current.tapStartTime = 0;
						gestureRef.current.tapMoved = false;
						gestureRef.current.tapTouchCount = 0;
						gestureRef.current.isPinching = false;
						dispatch({ type: 'UNDO' });
						return;
					}
					if (tap === 'REDO') {
						gestureRef.current.tapStartTime = 0;
						gestureRef.current.tapMoved = false;
						gestureRef.current.tapTouchCount = 0;
						gestureRef.current.isPinching = false;
						dispatch({ type: 'REDO' });
						return;
					}
				}
				gestureRef.current.tapStartTime = 0;
				gestureRef.current.tapMoved = false;
				gestureRef.current.tapTouchCount = 0;
			}
			// Pinch end cooldown: only fires if isPinching was activated (real movement, not a tap)
			if (gestureRef.current.isPinching && e.touches.length < 2) {
				pinchEndTimestampRef.current = Date.now(); // cooldown to prevent ghost strokes
				gestureRef.current.isPinching = false;
			}
		} else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
			if (e.touches.length === 0) {
				gestureRef.current.isOrbitTouch = false;
				gestureRef.current.isPinching = false;
			} else if (e.touches.length === 1 && gestureRef.current.isPinching) {
				// Transition from 2-finger to 1-finger: switch from orbit to pan
				gestureRef.current.isPinching = false;
				const t = e.touches[0];
				gestureRef.current.orbitTouchStartPanX = orbitRef.current.panOffsetX;
				gestureRef.current.orbitTouchStartPanY = orbitRef.current.panOffsetY;
				gestureRef.current.orbitTouchLastPos = { x: t.clientX, y: t.clientY };
			}
		}
	};

	const handleTouchCancel = (e: React.TouchEvent) => {
		pinchEndTimestampRef.current = Date.now();
		gestureRef.current.isPinching = false;
		gestureRef.current.isOrbitTouch = false;
		gestureRef.current.tapStartTime = 0;
		gestureRef.current.tapMoved = false;
		gestureRef.current.tapTouchCount = 0;
	};

	return { handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel };
};
