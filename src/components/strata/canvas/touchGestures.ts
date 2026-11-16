import type { GestureState } from '../../../types/strataTypes';

/**
 * Pure maths and thresholds of the touch gestures of the canvas: two- and three-finger taps
 * (undo / redo), the pinch of DRAW and the touch controls of CINEMA orbit.
 *
 * Extracted from StrataCanvas's handleTouchStart / Move / End (handlers sprint, v3.26.54): the
 * arithmetic and the comparisons are the lines that were inline, relocated. Nothing here touches
 * a ref, the DOM or React: the handlers read their refs, pass plain values in and write the
 * results back, in the same order as before. They still decide WHEN; this decides WHAT.
 */

type TouchPoint = { clientX: number; clientY: number };

/** Distance between two touches and the point halfway between them, in client px. */
export const twoTouchMetrics = (t1: TouchPoint, t2: TouchPoint) => {
	const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
	const cx = (t1.clientX + t2.clientX) / 2;
	const cy = (t1.clientY + t2.clientY) / 2;
	return { dist, cx, cy };
};

/** Centre of three touches, in client px. */
export const threeTouchCenter = (t1: TouchPoint, t2: TouchPoint, t3: TouchPoint) => {
	const cx = (t1.clientX + t2.clientX + t3.clientX) / 3;
	const cy = (t1.clientY + t2.clientY + t3.clientY) / 3;
	return { cx, cy };
};

/**
 * Whether the centre of a two- or three-finger touch has left the spot where it landed: MORE
 * than 10 px. Until it does, the gesture is still a candidate tap (undo / redo).
 *
 * It is measured on the CENTRE, not on the fingers. Two fingers spreading symmetrically around a
 * still centre therefore never "move": they do not become a pinch and, released in time, they
 * count as a tap. Current behaviour, pinned by tests/handlers.characterization.test.ts.
 */
export const hasTapMoved = (startCenter: { x: number; y: number }, cx: number, cy: number): boolean =>
	Math.hypot(cx - startCenter.x, cy - startCenter.y) > 10;

/** Two fingers that landed closer than 5 px cannot pinch: the ratio of distances would be noise. */
export const canStartPinch = (startDist: number): boolean => startDist >= 5;

/**
 * What a multi-finger touch that never moved means when its last finger lifts: two fingers under
 * 300 ms undo, three fingers under 250 ms redo, anything else nothing.
 */
export const tapGestureAction = (tapTouchCount: number, elapsed: number): 'UNDO' | 'REDO' | null => {
	if (tapTouchCount === 2 && elapsed < 300) return 'UNDO';
	if (tapTouchCount === 3 && elapsed < 250) return 'REDO';
	return null;
};

/** Zoom of a DRAW pinch: the start zoom times the ratio of finger distances, within 0.5 – 3. null if the ratio is not finite. */
export const pinchZoom = (gesture: Pick<GestureState, 'startDist' | 'startZoom'>, dist: number): number | null => {
	const startDist = gesture.startDist || 1;
	const scaleChange = dist / startDist;
	if (!Number.isFinite(scaleChange)) return null;

	let newZoom = Math.min(Math.max(gesture.startZoom * scaleChange, 0.5), 3.0); // Allow zoom out to 0.5x
	return newZoom;
};

/**
 * Pan of a DRAW pinch: the world point that was under the centre of the fingers when the pinch
 * began stays under their centre now.
 */
export const pinchPan = (
	gesture: Pick<GestureState, 'startZoom' | 'startPan' | 'startCenter'>,
	newZoom: number,
	cx: number,
	cy: number,
	rect: { left: number; top: number; width: number; height: number },
	MAX_PAN: number,
): { x: number; y: number } => {
	const centerX = rect.width / 2;
	const centerY = rect.height / 2;
	const startScreenX = gesture.startCenter.x - rect.left - centerX;
	const startScreenY = gesture.startCenter.y - rect.top - centerY;
	const currScreenX = cx - rect.left - centerX;
	const currScreenY = cy - rect.top - centerY;

	const worldX = (startScreenX - gesture.startPan.x) / gesture.startZoom;
	const worldY = (startScreenY - gesture.startPan.y) / gesture.startZoom;

	let newPanX = currScreenX - (worldX * newZoom);
	let newPanY = currScreenY - (worldY * newZoom);

	// World-space clamp (v3.25.5), same as the wheel.
	newPanX = Math.max(-MAX_PAN * newZoom, Math.min(MAX_PAN * newZoom, newPanX));
	newPanY = Math.max(-MAX_PAN * newZoom, Math.min(MAX_PAN * newZoom, newPanY));

	return { x: newPanX, y: newPanY };
};

/** CINEMA orbit, one finger: camera pan offsets from the finger's travel since it landed. */
export const orbitTouchPan = (
	gesture: Pick<GestureState, 'orbitTouchLastPos' | 'orbitTouchStartPanX' | 'orbitTouchStartPanY'>,
	t: TouchPoint,
): { panOffsetX: number; panOffsetY: number } => {
	const dx = t.clientX - gesture.orbitTouchLastPos.x;
	const dy = t.clientY - gesture.orbitTouchLastPos.y;

	const panSensitivity = 2.0;
	return {
		panOffsetX: gesture.orbitTouchStartPanX - dx * panSensitivity,
		panOffsetY: gesture.orbitTouchStartPanY - dy * panSensitivity,
	};
};

/** CINEMA orbit, two fingers: azimuth and elevation (±1.5 rad) from the travel of their centre. */
export const orbitTouchRotation = (
	gesture: Pick<GestureState, 'orbitTouchLastPos' | 'orbitTouchStartAzimuth' | 'orbitTouchStartElevation'>,
	cx: number,
	cy: number,
): { targetAzimuth: number; targetElevation: number } => {
	// Orbit rotation (using center movement)
	const dx = cx - gesture.orbitTouchLastPos.x;
	const dy = cy - gesture.orbitTouchLastPos.y;

	const orbitSensitivity = 0.005;
	return {
		targetAzimuth: gesture.orbitTouchStartAzimuth - dx * orbitSensitivity,
		targetElevation: Math.max(-1.5, Math.min(1.5,
			gesture.orbitTouchStartElevation + dy * orbitSensitivity
		)),
	};
};

/** CINEMA orbit, two fingers: view zoom offset of the pinch, within −5000 … 2000. */
export const orbitPinchZoomOffset = (
	gesture: Pick<GestureState, 'startDist' | 'orbitTouchStartZoom'>,
	dist: number,
): number => {
	const scaleChange = dist / gesture.startDist;
	// Invert zoom direction: pinch out = zoom in (negative offset)
	const zoomRange = 7000; // Total zoom range
	const zoomDelta = (1 - scaleChange) * zoomRange;
	const newOffset = Math.min(Math.max(
		gesture.orbitTouchStartZoom + zoomDelta,
		-5000
	), 2000);
	return newOffset;
};
