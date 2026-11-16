import type React from 'react';
import type { CanvasHandlerEnv } from './handlerEnv';
import { BASE_DEPTH_STEP } from '../../../constants/layers';
import { buildStrokeShapes } from './commitStroke';
import { analytics } from '../../../analytics/analytics';
import { hitTestGizmo, computeMoveTransform, isSignificantTransform, isDragEngaged, transformLayerPayload, isSignificantMove } from './moveGizmoInteraction';
import { clientToWorld, organicWiggle, dragPan, orbitDragZoomOffset, orbitPointerDrag, isTouchMicroStroke } from './pointerMath';
import { cursorClassForGizmoMode } from './gizmoCursor';

/**
 * The pointermove and pointerup handlers of the canvas. Move: middle-button / Space pan, the live
 * gizmo transform behind its dead zone, the gizmo hover cursor, the samples of a stroke (with the
 * organic wiggle) and the mouse controls of CINEMA orbit. Up (also bound to pointerleave): release
 * the capture, confirm a pending deselect, end a pan, commit TRANSFORM_LAYER / MOVE_LAYER, and
 * turn the samples into a shape after the finger micro-stroke filter.
 *
 * Moved out of StrataCanvas (handlers sprint, v3.26.63). The two handlers below are the text that
 * was written inside the component, character for character — same guards, same order of ref
 * writes, dispatches and cleanup (the flags are still cleared AFTER the points are processed).
 * What they closed over arrives in `env` (canvas/handlerEnv.ts): the state of the render that
 * created them and the component's refs, read at event time as before. StrataCanvas calls this
 * once per render, where the handlers were defined, and binds them to the same canvas props.
 * No effect and no listener is registered here. Nothing here touches the live stroke's timing:
 * the render loop still reads currentPointsRef / isDrawingRef on its own schedule.
 *
 * Maths and decisions: canvas/pointerMath.ts, canvas/moveGizmoInteraction.ts, canvas/gizmoCursor.ts,
 * canvas/commitStroke.ts.
 */
export const createPointerMoveUpHandlers = (env: CanvasHandlerEnv) => {
	const { state, dispatch, canvasRef, canvasRectRef, currentPointsRef, isDrawingRef, drawingPointerTypeRef, drawingPressureRef, organicPhaseRef, activePointerIdRef, gestureRef, isPanningRef, isSpaceDownRef, spacePanEngagedRef, orbitRef, moveRef, transformRef, transformHandlesRef, hoverGizmoModeRef, pendingDeselectRef, setIsDrawing, setCursorOverride, setGizmoCursor, getActiveZ, MAX_PAN } = env;

	const handlePointerMove = (e: React.PointerEvent) => {
		if (isPanningRef.current) {
			const dx = e.clientX - gestureRef.current.startCenter.x;
			const dy = e.clientY - gestureRef.current.startCenter.y;

			// Space pan only: has this become a real pan? Reuses the Move tool's 3px
			// screen-space dead zone with its hysteresis, so "moved" means the same
			// thing everywhere in the app. Measured against startCenter (fixed at
			// pointerdown), never frame to frame. Middle-button pan is untouched — it
			// has no tap meaning to decide.
			if (isSpaceDownRef.current) {
				spacePanEngagedRef.current = isDragEngaged(
					gestureRef.current.startCenter, e.clientX, e.clientY, spacePanEngagedRef.current,
				);
			}

			// In Orbit mode with middle button, use vertical movement for zoom
			// (maths of both branches extracted to canvas/pointerMath.ts)
			if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
				dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: orbitDragZoomOffset(gestureRef.current.startZoom, dy) });
				return;
			}

			// Drawing mode: pan
			dispatch({ type: 'SET_DRAWING_ZOOM', payload: { zoom: state.drawingZoom, pan: dragPan(gestureRef.current.startPan, dx, dy, state.drawingZoom, MAX_PAN) } });
			return;
		}

		// --- Transform Logic --- (math extracted to canvas/moveGizmoInteraction.ts)
		// isDrawingRef gates this on a gesture actually being in flight. isActive alone was
		// not enough: an orphaned transform made every pointermove drag the layer with no
		// pointer pressed at all (measured: 260x220px from a bare hover). The two are written
		// consecutively in the same pointerdown (setIsDrawing at the top of the move branch,
		// isActive right below it, both synchronous), so a legitimate drag can never have one
		// without the other — this narrows the entry, it does not change the order of
		// anything. When it now falls through, the hover-cursor block below is skipped by its
		// own !isActive guard and the isDrawingRef guard after it returns: nothing new runs.
		if (state.tool === 'move' && transformRef.current.isActive && isDrawingRef.current) {
			const t = transformRef.current;
			const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect();
			const pointerX = e.clientX - rect.left;
			const pointerY = e.clientY - rect.top;

			// Dead-zone gate (canvas/moveGizmoInteraction.ts, isDragEngaged). startP is the
			// pointerdown position, fixed for the whole gesture, so this always measures the
			// TOTAL screen-space displacement — never a frame-to-frame delta, which would let
			// a slow deliberate drag never cross the threshold. `t.engaged` carries the
			// hysteresis forward: once true it can only stay true, so a drag that swings back
			// near its start mid-gesture does not un-engage. Below the threshold,
			// currentTransform is simply never written, so it stays at the identity set at
			// pointerdown — no jitter reaches the preview or the pointerup significance check.
			const engaged = isDragEngaged(t.startP, pointerX, pointerY, t.engaged);
			transformRef.current.engaged = engaged;
			if (engaged) {
				transformRef.current.currentTransform = computeMoveTransform({
					mode: t.mode,
					startTransform: t.startTransform,
					startP: t.startP,
					pointerX,
					pointerY,
					handles: transformHandlesRef.current,
					focalLength: state.focalLength,
					cameraZ: state.camera.z,
					activeZ: state.currentLayerIndex * -BASE_DEPTH_STEP,
					drawingZoom: state.drawingZoom,
				});
			}
			return;
		}

		// --- Move gizmo hover cursor --- (mapping extracted to canvas/gizmoCursor.ts)
		// Runs ONLY when no drag is in flight: during a transform the cursor stays pinned
		// to the mode grabbed at pointerdown, so it cannot flicker mid-resize. Falls
		// through without returning — every path below is reached exactly as before.
		if (state.tool === 'move' && !transformRef.current.isActive) {
			// Cache the rect on first hover rather than measuring per event: the RAF loop
			// invalidates layout every frame, so a getBoundingClientRect() here would be a
			// real reflow on a hot path. pointerdown always refreshes it before an actual
			// transform, so a stale rect can only ever misplace the cursor HINT.
			if (!canvasRectRef.current && canvasRef.current) canvasRectRef.current = canvasRef.current.getBoundingClientRect();
			const hoverRect = canvasRectRef.current;
			if (hoverRect) {
				const hoverMode = hitTestGizmo(e.clientX - hoverRect.left, e.clientY - hoverRect.top, transformHandlesRef.current);
				// Touch React only when the hovered node CHANGES — not once per pointermove.
				if (hoverMode !== hoverGizmoModeRef.current) {
					hoverGizmoModeRef.current = hoverMode;
					setGizmoCursor(cursorClassForGizmoMode(hoverMode, transformHandlesRef.current));
				}
			}
		}

		if (!isDrawingRef.current || gestureRef.current.isPinching) return;

		if (state.mode === 'drawing') {
			const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect();

			const currentZoom = state.drawingZoom;
			const currentPan = state.drawingPan;

			const activeZ = getActiveZ(state.currentLayerIndex);
			const FL = state.focalLength;
			const camZ = state.camera.z;
			// Maths extracted to canvas/pointerMath.ts
			const { worldX, worldY } = clientToWorld(e.clientX, e.clientY, rect, currentZoom, currentPan, FL, camZ, activeZ);

			if (state.tool === 'move' && moveRef.current) {
				moveRef.current.offsetX = worldX - moveRef.current.startX;
				moveRef.current.offsetY = worldY - moveRef.current.startY;
				return;
			}

			const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
			if (!lastPoint) return;

			// Apply Organic Wiggle
			let finalX = worldX;
			let finalY = worldY;

			if (state.isOrganicMode && (state.tool === 'blob' || state.tool === 'eraser')) {
				// Maths extracted to canvas/pointerMath.ts
				const wiggled = organicWiggle(organicPhaseRef.current, worldX, worldY, lastPoint);
				organicPhaseRef.current = wiggled.phase;
				finalX = wiggled.finalX;
				finalY = wiggled.finalY;
			}

			const dist = Math.hypot(finalX - lastPoint.x, finalY - lastPoint.y);
			// Disable pressure sensitivity as requested
			const fixedPressure = 0.5;

			// Increase threshold to reduce number of points and improve performance
			if (dist > 3) {
				currentPointsRef.current.push({ x: finalX, y: finalY, pressure: fixedPressure });
				drawingPressureRef.current = fixedPressure;
			}
		} else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
			// New Free View controls:
			// Shift + Drag = Orbit (rotate around center)
			// Normal Drag = Pan camera (move X, Y)
			// Alt + Drag = Elevation control


			// Maths extracted to canvas/pointerMath.ts. Written onto the same object, field by field.
			Object.assign(orbitRef.current, orbitPointerDrag(orbitRef.current, e.movementX, e.movementY, e.shiftKey, e.altKey));
		}
	};

	const handlePointerUp = (e: React.PointerEvent) => {

		try { if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
		activePointerIdRef.current = null;

		// The release that confirms a deselection recorded by the Move selection table, if no
		// second touch cancelled it in the meantime. Self-contained and unreachable by every
		// other path: that pointerdown returned early without setting isDrawing or isPanning,
		// so nothing below this ever ran for it and nothing below it is reordered by this.
		if (pendingDeselectRef.current) {
			pendingDeselectRef.current = false;
			dispatch({ type: 'SET_LAYER_SELECTED', payload: false });
		}

		if (isPanningRef.current) {
			isPanningRef.current = false;
			// Space still held → back to 'grab' (ready to pan again), not to no cursor.
			// The pan ends with the pen, the ARMED state ends with the key.
			setCursorOverride(isSpaceDownRef.current ? 'cursor-grab' : null);
			return;
		}
		if (!isDrawingRef.current) return;

		if (state.mode === 'drawing') {
			if (state.tool === 'move') {
				setIsDrawing(false);
				drawingPointerTypeRef.current = null;
				if (transformRef.current.isActive) {
					const ct = transformRef.current.currentTransform;
					// Only dispatch if significant change (guard extracted to module)
					if (isSignificantTransform(ct)) {
						dispatch({
							type: 'TRANSFORM_LAYER',
							// Payload built in canvas/moveGizmoInteraction.ts
							payload: transformLayerPayload(state.currentLayerIndex, ct, transformRef.current.centerX, transformRef.current.centerY)
						});
					}
					transformRef.current.isActive = false;
					transformRef.current.mode = 'none';
				} else if (moveRef.current) {
					const { offsetX, offsetY } = moveRef.current;
					if (isSignificantMove(offsetX, offsetY)) {
						dispatch({
							type: 'MOVE_LAYER',
							payload: { layerIndex: state.currentLayerIndex, deltaX: offsetX, deltaY: offsetY }
						});
					}
					moveRef.current = null;
				}
				return;
			}

			if (currentPointsRef.current.length > 0) {
				// Discard micro-strokes from finger/palm touches (not pen or mouse)
					if (isTouchMicroStroke(drawingPointerTypeRef.current, currentPointsRef.current.length)) {
						currentPointsRef.current = [];
						setIsDrawing(false);
						drawingPointerTypeRef.current = null;
						return;
					}
				// Extracted to canvas/commitStroke.ts
				const { shapeOriginal, shapeMirrored } = buildStrokeShapes(currentPointsRef.current, state, getActiveZ(state.currentLayerIndex));
				if (shapeMirrored) {
					dispatch({ type: 'ADD_SHAPES', payload: [shapeOriginal, shapeMirrored] });
				} else {
					dispatch({ type: 'ADD_SHAPE', payload: shapeOriginal });
				}
				analytics.strokeEnded(state.tool);
			}

			// Move flags cleanup to AFTER processing points to allow late pointerMove events
			currentPointsRef.current = [];
			setIsDrawing(false);
			drawingPointerTypeRef.current = null;
		} else {
			setIsDrawing(false);
			drawingPointerTypeRef.current = null;
		}
	};

	return { handlePointerMove, handlePointerUp };
};
