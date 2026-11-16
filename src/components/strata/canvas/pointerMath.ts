import { MIN_TOUCH_STROKE_POINTS } from '../../../constants/renderConstants';

/**
 * Pure maths of the single-pointer gestures of the canvas: where a pointer is in the world, the
 * organic wiggle of blob / eraser, the pan and zoom of a middle-button or Space drag, the mouse
 * controls of CINEMA orbit and the filter of finger micro-strokes.
 *
 * Extracted from StrataCanvas's handlePointerDown / Move / Up (handlers sprint, v3.26.58): the
 * arithmetic is the lines that were inline, relocated. No refs, no DOM, no React — the handlers
 * read their refs and the state, pass plain values in and write the results back in the same
 * order as before.
 */

/**
 * World position of a pointer on the active layer, from its client position: centred on the
 * canvas, un-panned and un-zoomed, then divided by the layer's projected scale.
 */
export const clientToWorld = (
	clientX: number,
	clientY: number,
	rect: { left: number; top: number; width: number; height: number },
	currentZoom: number,
	currentPan: { x: number; y: number },
	FL: number,
	camZ: number,
	activeZ: number,
): { worldX: number; worldY: number } => {
	const cx = rect.width / 2;
	const cy = rect.height / 2;
	const screenX = clientX - rect.left - cx; // Centered (for World Calc)
	const screenY = clientY - rect.top - cy;

	const drawX = (screenX - currentPan.x) / currentZoom;
	const drawY = (screenY - currentPan.y) / currentZoom;

	const dz = activeZ - camZ;
	const scale = FL / (FL + dz);
	const worldX = drawX / scale;
	const worldY = drawY / scale;
	return { worldX, worldY };
};

/**
 * Organic mode (blob / eraser): displaces a sample by three harmonics of a phase that advances
 * with the distance travelled since the last sample. Returns the new phase with the sample.
 */
export const organicWiggle = (
	phase: number,
	worldX: number,
	worldY: number,
	lastPoint: { x: number; y: number },
): { phase: number; finalX: number; finalY: number } => {
	let finalX = worldX;
	let finalY = worldY;

	const rawDist = Math.hypot(worldX - lastPoint.x, worldY - lastPoint.y);
	phase += rawDist * 0.25; // Increased frequency for more "nervous" line

	const amp = 8.0; // Doubled amplitude
	// Added a third harmonic for more complexity/randomness
	finalX += (
		Math.sin(phase) +
		Math.cos(phase * 0.43) * 1.2 +
		Math.sin(phase * 2.7) * 0.4
	) * amp;

	finalY += (
		Math.cos(phase * 0.87) +
		Math.sin(phase * 0.37) * 1.2 +
		Math.cos(phase * 2.3) * 0.4
	) * amp;

	return { phase, finalX, finalY };
};

/** DRAW pan of a middle-button / Space drag: the start pan plus the pointer travel, clamped in world space. */
export const dragPan = (
	startPan: { x: number; y: number },
	dx: number,
	dy: number,
	drawingZoom: number,
	MAX_PAN: number,
): { x: number; y: number } => {
	// World-space clamp (v3.25.5), same as the wheel and the pinch.
	const panLimit = MAX_PAN * (drawingZoom || 1);
	let newPanX = Math.max(-panLimit, Math.min(panLimit, startPan.x + dx));
	let newPanY = Math.max(-panLimit, Math.min(panLimit, startPan.y + dy));
	return { x: newPanX, y: newPanY };
};

/** CINEMA orbit, middle button: view zoom offset from the vertical travel, within −5000 … 2000. */
export const orbitDragZoomOffset = (startZoom: number, dy: number): number => {
	const zoomSensitivity = 10; // 10 units per pixel
	const newOffset = Math.min(Math.max(startZoom - dy * zoomSensitivity, -5000), 2000);
	return newOffset;
};

type OrbitTargets = { targetAzimuth: number; targetElevation: number; panOffsetX: number; panOffsetY: number };

/**
 * CINEMA orbit, plain drag. Returns only the fields the drag changes:
 * Shift + drag = orbit (rotate around center), Alt + drag = elevation only, plain drag = pan.
 */
export const orbitPointerDrag = (
	orbit: OrbitTargets,
	movementX: number,
	movementY: number,
	shiftKey: boolean,
	altKey: boolean,
): Partial<OrbitTargets> => {
	if (shiftKey) {
		// Orbit mode: rotate around center
		const sensitivity = 0.005;
		return {
			targetAzimuth: orbit.targetAzimuth - movementX * sensitivity,
			targetElevation: Math.max(-1.5, Math.min(1.5, orbit.targetElevation + movementY * sensitivity)),
		};
	} else if (altKey) {
		// Elevation control only
		const elevSensitivity = 0.006;
		return {
			targetElevation: Math.max(-1.5, Math.min(1.5, orbit.targetElevation + movementY * elevSensitivity)),
		};
	} else {
		// Pan mode: move camera in world space
		// Use orbitRef offset to avoid being overwritten by animation loop
		const panSensitivity = 2.0;
		return {
			panOffsetX: orbit.panOffsetX - movementX * panSensitivity,
			panOffsetY: orbit.panOffsetY - movementY * panSensitivity,
		};
	}
};

/** A finger (not a pen, not a mouse) that left MIN_TOUCH_STROKE_POINTS samples or fewer: a palm or a stray touch, not a stroke. */
export const isTouchMicroStroke = (pointerType: string | null, sampleCount: number): boolean =>
	pointerType === 'touch' && sampleCount <= MIN_TOUCH_STROKE_POINTS;
