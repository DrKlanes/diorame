/**
 * Quantizes the camera position and zoom offset for pixel art mode,
 * snapping them to discrete grid steps so that pixel art rendering
 * stays crisp regardless of fractional camera movements.
 *
 * Anchor-Based Snapping: snaps everything relative to a stable "Anchor
 * Point" (POI or Center) so that when the grid resizes (zoom changes),
 * the center of attention remains fixed and doesn't beat or jitter
 * against a global 0,0 grid.
 *
 * MUTATES `currentCamera` in place — its .x, .y and .z fields may be
 * updated (only when isPixelArt). Returns the new viewZoomOffset
 * (primitive number cannot be mutated in place).
 *
 * No-op when isPixelArt is false (returns viewZoomOffset unchanged,
 * camera untouched).
 *
 * @param currentCamera     Camera object — MUTATED in place if isPixelArt
 * @param viewZoomOffset    Current view zoom offset (primitive)
 * @param isPixelArt        Whether pixel art mode is active
 * @param isCinematic       Whether cinematic mode is active
 * @param pointOfInterest   POI from app state, or null/undefined
 * @param currentLayerIndex Current layer index (for fallback anchorZ)
 * @param focalLength       Camera focal length
 * @param pSize             Pixel size for quantization
 * @param screenW           Container width (or canvas width fallback)
 * @param getActiveZ        Helper to compute layer Z from index
 * @returns                 { viewZoomOffset } new value
 */
export const quantizePixelArtCamera = (
	currentCamera: { x: number; y: number; z: number; rotation?: number },
	viewZoomOffset: number,
	isPixelArt: boolean,
	isCinematic: boolean,
	pointOfInterest: { x: number; y: number; z: number } | null | undefined,
	currentLayerIndex: number,
	focalLength: number,
	pSize: number,
	screenW: number,
	getActiveZ: (layerIndex: number) => number,
): { viewZoomOffset: number } => {
	if (!isPixelArt) return { viewZoomOffset };

	// Determine Anchor (World Space)
	const anchorX = pointOfInterest ? pointOfInterest.x : 0;
	const anchorY = pointOfInterest ? pointOfInterest.y : 0;
	const anchorZ = pointOfInterest ? pointOfInterest.z : getActiveZ(currentLayerIndex);

	const fl = focalLength;

	// 1. Quantize Z (Zoom) Relative to Anchor
	// We calculate the snapped Z depth such that the anchor remains stable.
	const rawTotalZ = currentCamera.z + (isCinematic ? viewZoomOffset : 0);

	// Dynamic Z-Step: Scaling resolution should match pixel resolution
	const rawDist = Math.max(10, fl + (anchorZ - rawTotalZ));

	// zStep: amount of depth change required to alter scale by ~0.5 screen pixels at the edge
	// This ensures zoom steps are perceptible but small pixel-perfect increments
	const zStep = Math.max(5, Math.floor(rawDist * (pSize / (screenW * 0.55))));

	// Snap Total Z relative to AnchorZ
	// snappedZ = anchorZ + k * zStep
	const snappedTotalZ = anchorZ + Math.round((rawTotalZ - anchorZ) / zStep) * zStep;

	// Apply Snapped Z to camera components
	const zDiff = snappedTotalZ - rawTotalZ;
	if (isCinematic) {
		viewZoomOffset += zDiff;
	} else {
		currentCamera.z += zDiff;
	}

	// 2. Quantize X / Y Relative to Anchor
	// Recompute camera position so the Anchor remains fixed at a snapped screen coordinate.
	// This eliminates jitter by ensuring the reference point is always pixel-aligned.
	const snappedDist = fl + (anchorZ - snappedTotalZ);

	if (snappedDist > 10) {
		const rawScale = fl / Math.max(10, fl + (anchorZ - rawTotalZ));
		const snappedScale = fl / snappedDist;

		if (Number.isFinite(rawScale) && Number.isFinite(snappedScale) && Math.abs(snappedScale) > 0.00001) {
			// Project Anchor to Screen Space (relative to center) using RAW parameters
			const rawProjX = (anchorX - currentCamera.x) * rawScale;
			const rawProjY = (anchorY - currentCamera.y) * rawScale;

			// Snap the projected position to nearest integer pixel
			const snappedProjX = Math.round(rawProjX / pSize) * pSize;
			const snappedProjY = Math.round(rawProjY / pSize) * pSize;

			// Back-solve for Camera X/Y to enforce this snapped screen position with the new scale
			currentCamera.x = anchorX - (snappedProjX / snappedScale);
			currentCamera.y = anchorY - (snappedProjY / snappedScale);
		}
	}

	return { viewZoomOffset };
};
