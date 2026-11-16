import type { CanvasHandlerEnv } from './handlerEnv';
import { BASE_DEPTH_STEP } from '../../../constants/layers';
import type { CanvasPointerInput } from '../../../types/strataTypes';
import { toast } from 'sonner@2.0.3';
import { getLayerBoundingBox } from './transformUtils';
import { hitTestGizmo, decideMoveSelection } from './moveGizmoInteraction';
import { clientToWorld } from './pointerMath';
import { isDoubleClick, frameCinemaPoint } from './cinemaFraming';

/**
 * The pointerdown handler of the canvas: which pointers may start a gesture (pen priority, pinch
 * in progress, post-pinch cooldown), middle-button and Space pan, the CINEMA double click, and
 * in DRAW the text tool, the Move tool's selection table and gizmo grab, and the first sample of
 * a stroke.
 *
 * Moved out of StrataCanvas (handlers sprint, v3.26.62). The handler below is the text that was
 * written inside the component, character for character — same early returns, same
 * preventDefault and pointer capture, same order of ref writes and dispatches. What it closed
 * over arrives in `env` (canvas/handlerEnv.ts): the state of the render that created it and the
 * component's refs, read at event time as before. StrataCanvas calls this once per render, where
 * the handler was defined; the canvas prop and the native pen listener bind the same function.
 * No effect and no listener is registered here.
 *
 * Maths and decisions: canvas/pointerMath.ts, canvas/cinemaFraming.ts, canvas/moveGizmoInteraction.ts.
 */
export const createPointerDownHandler = (env: CanvasHandlerEnv) => {
	const { state, dispatch, canvasRef, canvasRectRef, currentPointsRef, drawingPointerTypeRef, drawingPressureRef, organicPhaseRef, activePointerIdRef, gestureRef, pinchEndTimestampRef, isPanningRef, isSpaceDownRef, lastClickTimeRef, lastClickPosRef, drawnFrameRef, moveRef, transformRef, transformHandlesRef, pendingDeselectRef, setIsDrawing, setCursorOverride, getActiveZ } = env;

	const handlePointerDown = (e: CanvasPointerInput) => {
		// Pen Priority: If using a pen, ignore/cancel pinch and allow secondary pointer (palm rejection)
		if (e.pointerType === 'pen') {
			gestureRef.current.isPinching = false;
		} else {
			if (gestureRef.current.isPinching) return;
			if (!e.isPrimary) return;
				// Post-pinch cooldown: ignore touch shortly after pinch to prevent ghost strokes
				if (e.pointerType === 'touch' && (Date.now() - pinchEndTimestampRef.current) < 150) return;
		}

		// Track the active pointer so an orphaned capture (app sent to background mid-gesture)
		// can be released later by resetGestureState. Harmless for gestures that never capture.
		activePointerIdRef.current = e.pointerId;

		if (e.button === 1) { // Middle Mouse Button: Pan/Zoom
			e.preventDefault();

			// In Orbit mode, middle button does zoom (via ref to avoid re-render)
			if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
				// We'll handle zoom in pointer move, just set flag
				isPanningRef.current = true;
				setCursorOverride('cursor-ns-resize'); // vertical resize cursor for zoom
				// Spread, not a wholesale replace: this handler owns the five pan/zoom
				// fields below and nothing else. Replacing the object dropped every orbit
				// and tap field — an accidental side effect of the literal, never a
				// decision. A mouse click has no business erasing the trace of a touch
				// gesture. (v3.17.11)
				gestureRef.current = {
					...gestureRef.current,
					isPinching: false,
					startDist: 0,
					startZoom: state.viewZoomOffset, // Store starting zoom offset
					startPan: { x: 0, y: 0 },
					startCenter: { x: e.clientX, y: e.clientY }
				};
				e.currentTarget.setPointerCapture(e.pointerId);
				return;
			}

			// In Drawing mode, middle button does pan
			isPanningRef.current = true;
			setCursorOverride('cursor-grabbing');
			// Same reasoning as the orbit-mode branch above: spread, not replace.
			gestureRef.current = {
				...gestureRef.current,
				isPinching: false,
				startDist: 0,
				startZoom: state.drawingZoom || 1,
				startPan: { ...state.drawingPan },
				startCenter: { x: e.clientX, y: e.clientY }
			};
			e.currentTarget.setPointerCapture(e.pointerId);
			return;
		}

		// Space held → this press pans instead of drawing. Seeded HERE rather than on the
		// keydown on purpose: a key event carries no pointer position, so the pan would
		// have to start from a stale one. Anchoring it to the pen's first contact makes
		// the canvas follow exactly from where the user put the pen down.
		// Reuses the middle-button pan wholesale — same refs, same pointermove branch,
		// same pointerup teardown. Nothing new to maintain.
		if (isSpaceDownRef.current && state.mode === 'drawing') {
			e.preventDefault();
			isPanningRef.current = true;
			setCursorOverride('cursor-grabbing');
			gestureRef.current = {
				...gestureRef.current,
				startPan: { ...state.drawingPan },
				startCenter: { x: e.clientX, y: e.clientY },
			};
			e.currentTarget.setPointerCapture(e.pointerId);
			return;
		}

		e.preventDefault();
		if (canvasRef.current) canvasRectRef.current = canvasRef.current.getBoundingClientRect();
		const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect();
		const cx = rect.width / 2;
		const cy = rect.height / 2;

		// Calculate World Coordinates (maths extracted to canvas/pointerMath.ts)
		const pointerX = e.clientX - rect.left; // Top-Left (for Gizmo Hit Test)
		const pointerY = e.clientY - rect.top;

		const currentZoom = state.mode === 'drawing' ? state.drawingZoom : 1;
		const currentPan = state.mode === 'drawing' ? state.drawingPan : { x: 0, y: 0 };

		const activeZ = getActiveZ(state.currentLayerIndex);
		const FL = state.focalLength;
		const camZ = state.camera.z;
		const { worldX, worldY } = clientToWorld(e.clientX, e.clientY, rect, currentZoom, currentPan, FL, camZ, activeZ);

		if (state.mode === 'cinematic') {
			const now = Date.now();
			// Test and framing extracted to canvas/cinemaFraming.ts
			if (isDoubleClick(now, lastClickTimeRef.current, pointerX, pointerY, lastClickPosRef.current)) {
				const { framed, framedZ } = frameCinemaPoint({ state, optics: drawnFrameRef.current, pointerX, pointerY, cx, cy });
				lastClickTimeRef.current = 0;
				// null = that plane sits at/behind the near clip, so the forward projection
				// would not have drawn anything there either. Leave the framing untouched
				// rather than aiming the camera at a point that cannot be seen.
				if (framed) {
					dispatch({ type: 'SET_POINT_OF_INTEREST', payload: { x: framed.x, y: framed.y, z: framedZ } });
				}
				return;
			} else {
				// Arms the next candidate. Runs when the gesture failed EITHER test, so a
				// far-away second tap becomes the start of a new pair instead of being
				// swallowed — tap A, tap far B, tap B again still frames B.
				lastClickTimeRef.current = now;
				lastClickPosRef.current = { x: pointerX, y: pointerY };
			}
		}

		if (state.mode === 'drawing') {
			// Block all interactions on hidden layers
			if (state.hiddenLayers.includes(state.currentLayerIndex)) {
				toast.error('Layer is hidden', {
					description: 'Make the layer visible to edit it',
					duration: 2000,
				});
				return;
			}

			if (state.tool === 'text') {
				dispatch({ type: 'START_TEXT_SESSION', payload: { x: worldX, y: worldY } });
				return;
			}
			if (state.tool === 'move') {
				// --- Selection decision (v3.17.8) ---
				//                | inside the box        | outside
				//   selected     | drag (as before)      | deselect, do NOT move
				//   deselected   | select AND drag, one gesture | no-op
				//
				// Runs FIRST so a click that only changes the selection never captures the
				// pointer, never sets isDrawing and never opens a transform. Everything
				// after this block is the pre-existing drag start, unchanged.
				//
				// handles === null means no gizmo is possible at all (empty layer, or the
				// very first frame before the RAF has projected one). Nothing to select or
				// deselect there, so the legacy path runs untouched.
				const handles = transformHandlesRef.current;
				const wasSelected = state.isLayerSelected;
				// The table itself (conditions) extracted to canvas/moveGizmoInteraction.ts
				const selection = decideMoveSelection(pointerX, pointerY, handles, wasSelected);
				if (selection === 'deselect-on-release') {
					// Deselecting is a TAP, and at pointerdown we cannot yet know
					// whether this finger is the first of a two-finger gesture. So it
					// is recorded and confirmed on the release, which is where every
					// other tap in this app is decided (two-finger undo, three-finger
					// redo, Space-tap to centre). Committing it here made every pinch
					// and every undo tap whose first finger landed outside the box
					// deselect the layer, after which the Move tool looked dead until
					// you touched inside the box again — measured, isLayerSelected
					// going true → false on a single touch pointerdown, and invisible
					// on desktop because no desktop gesture has a second pointer.
					// The cell itself is unchanged: same condition, same outcome, same
					// early return with no capture, no isDrawing and no transform.
					pendingDeselectRef.current = true;
					return;
				}
				if (selection === 'ignore') return;
				if (selection === 'select-and-drag') {
					// Select AND drag in the SAME gesture (Figma model). The dispatch
					// only flips a view flag that makes the gizmo paint; the drag itself
					// runs from refs set below in this very event, so nothing waits on
					// React and the user perceives one continuous action.
					dispatch({ type: 'SET_LAYER_SELECTED', payload: true });
				}

				e.currentTarget.setPointerCapture(e.pointerId);
				setIsDrawing(true);
				drawingPointerTypeRef.current = e.pointerType;

				// Gizmo Interaction — extracted to canvas/moveGizmoInteraction.ts
				// Same visibility rule as above: a gesture that began on a deselected layer
				// is always a plain 'move', never a handle grab.
				const mode = wasSelected ? hitTestGizmo(pointerX, pointerY, handles) : 'move';

				const activeLayerZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
				const bb = getLayerBoundingBox(state.shapes.filter(s => s.zIndex === activeLayerZ));

				if (bb) {
					transformRef.current = {
						isActive: true, mode,
						startP: { x: pointerX, y: pointerY },
						startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
						centerX: bb.cx, centerY: bb.cy,
						layerBB: bb,
						currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
						engaged: false,
					};
				} else {
					// An empty layer has no gizmo, so this gesture is a plain layer move and
					// the transform ref must be left INERT — not merely unused. Skipping this
					// was the one path able to corrupt the artwork: a transform orphaned by an
					// earlier gesture (see resetGestureState's note) keeps isActive=true, and
					// handlePointerUp tests isActive BEFORE moveRef — so the release committed
					// a TRANSFORM_LAYER built from the PREVIOUS gesture's startP to history,
					// and the move the user actually made never ran. isActive alone gates the
					// preview in renderLayerBody, but engaged is cleared too so a later drag
					// still has to earn its dead zone.
					transformRef.current.isActive = false;
					transformRef.current.mode = 'none';
					transformRef.current.engaged = false;
					moveRef.current = { startX: worldX, startY: worldY, offsetX: 0, offsetY: 0 };
				}
				return;
			}

			e.currentTarget.setPointerCapture(e.pointerId);
			setIsDrawing(true);
			drawingPointerTypeRef.current = e.pointerType;
			currentPointsRef.current = [{ x: worldX, y: worldY, pressure: 0.5 }];
			drawingPressureRef.current = 0.5;
			organicPhaseRef.current = Math.random() * 1000;

			// Auto-dismiss onboarding when user starts drawing
			if (state.isOnboardingVisible) {
				localStorage.setItem('diorame-onboarding-seen', 'true');
				dispatch({ type: 'DISMISS_ONBOARDING' });
			}
		} else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
			e.currentTarget.setPointerCapture(e.pointerId);
			setIsDrawing(true);
		}
	};

	return handlePointerDown;
};
