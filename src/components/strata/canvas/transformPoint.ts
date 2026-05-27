import { DRAW_FOCAL_LENGTH } from '../../../constants/renderConstants';

/**
 * Per-layer projection params. Computed once per iteration of the layer
 * loop (renderZs.forEach) and held constant across all calls to the
 * returned projector for that layer.
 */
export type LayerProjectionParams = {
	z: number;
	isLocked3D: boolean;
	camX: number;
	camY: number;
	layerScale: number;
	layerOpacity: number;
};

/**
 * Per-frame projection params. Computed once per render() invocation
 * and shared across all layers' projectors in that frame.
 *
 * `shake` MUST be destructured from lastShakeRef.current at the
 * frame entry point by the caller — the module never touches refs.
 */
export type FrameProjectionParams = {
	isCinematic: boolean;
	camera: { x: number; y: number; z: number };
	viewZoom: number;
	viewPan: { x: number; y: number };
	centerXScreen: number;
	centerYScreen: number;
	camRot: number;
	cosR: number;
	sinR: number;
	poiX: number;
	poiY: number;
	isArcOrOrbit: boolean;
	arcPivotScale: number;
	distortionK: number;
	cinematicType: string;
	shake: { x: number; y: number };
};

/**
 * Result of projecting a 2D world point to screen space for a given
 * layer/frame. All callers consume some subset of these fields.
 */
export type Projection = {
	x: number;
	y: number;
	scale: number;
	opacity: number;
};

/**
 * Creates a transformPoint projector for a specific layer in a specific
 * frame. Returns a closure (x, y) => Projection that maps 2D world
 * coordinates to 2D screen coordinates, applying:
 *
 *   - Drawing-mode parallax (when !frame.isCinematic): focal-length
 *     based depth scale relative to layer z.
 *   - Cinematic 3D (when frame.isCinematic): layer scale + camera
 *     rotation + arc/orbit pivot + lens distortion.
 *
 * Both the layer params and the frame params are captured by the
 * returned closure. The closure is meant to be called many times
 * (once per point of every shape on the layer) without re-deriving
 * constants. Pure within a frame: no refs, no side effects, no
 * mutation of inputs.
 *
 * @param layer Per-layer projection params
 * @param frame Per-frame projection params
 * @returns A function (x, y) => Projection for this layer/frame
 */
export const createTransformPoint = (
	layer: LayerProjectionParams,
	frame: FrameProjectionParams,
) => (x: number, y: number): Projection => {
	// Drawing Mode Parallax
	if (!frame.isCinematic) {
		const dDraw = layer.z - frame.camera.z;
		const sDraw = DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH + dDraw);
		const sx = x * sDraw;
		const sy = y * sDraw;
		return {
			x: frame.centerXScreen + (sx * frame.viewZoom) + frame.viewPan.x,
			y: frame.centerYScreen + (sy * frame.viewZoom) + frame.viewPan.y,
			scale: sDraw * frame.viewZoom,
			opacity: 1,
		};
	}

	// Cinematic 3D
	let sx = (x - layer.camX) * layer.layerScale;
	let sy = (y - layer.camY) * layer.layerScale;

	if (!layer.isLocked3D && frame.camRot !== 0) {
		const rx = sx * frame.cosR - sy * frame.sinR;
		const ry = sx * frame.sinR + sy * frame.cosR;
		sx = rx; sy = ry;
	}
	if (frame.isArcOrOrbit && !layer.isLocked3D) {
		const idealCamX = frame.camera.x - frame.shake.x;
		const idealCamY = frame.camera.y - frame.shake.y;

		sx += (idealCamX - frame.poiX) * frame.arcPivotScale;
		if (frame.cinematicType === 'orbit') sy += (idealCamY - frame.poiY) * frame.arcPivotScale;
	}

	let distFactor = 1;
	if (frame.distortionK !== 0 && !layer.isLocked3D) {
		const nx = sx / frame.centerXScreen;
		const ny = sy / frame.centerYScreen;
		const r2 = nx*nx + ny*ny;
		distFactor = 1 + frame.distortionK * r2;
		sx *= distFactor; sy *= distFactor;
	}

	return {
		x: frame.centerXScreen + (sx * frame.viewZoom) + frame.viewPan.x,
		y: frame.centerYScreen + (sy * frame.viewZoom) + frame.viewPan.y,
		scale: layer.layerScale * frame.viewZoom,
		opacity: layer.layerOpacity,
	};
};
