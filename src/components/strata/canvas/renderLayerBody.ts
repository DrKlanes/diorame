import { BASE_DEPTH_STEP } from '../StrataContext';
import { CINEMATIC_DEPTH_MULTIPLIER } from './cinematicCamera';
import { DRAW_FOCAL_LENGTH, NEAR_CLIP } from '../../../constants/renderConstants';
import { createTransformPoint, createProjectInto, type LayerProjectionParams, type FrameProjectionParams } from './transformPoint';
import { renderParticles } from './renderParticles';
import { renderTextShape } from './renderTextShape';
import { renderPathShape, type PathShapeParams } from './renderPathShape';
import { shapeWiggle } from './shapeWiggle';
import { moveTransformPreview } from './moveTransformPreview';
import { renderLiveStroke } from './renderLiveStroke';
import { composeLayer } from './composeLayer';
import { paintShapeRun } from './renderShapeRun';
import type { RenderContext, PerFrameComputed } from './renderPipeline';

/**
 * ensureCanvas — lazy create + resize. Mirrored from the local helper in
 * StrataCanvas's render useEffect. Identical implementation. Will be
 * unified into a shared util in 10b cleanup if appropriate.
 */
const ensureCanvas = (
	ref: { current: HTMLCanvasElement | null },
	w: number,
	h: number,
): HTMLCanvasElement => {
	if (!ref.current) ref.current = document.createElement('canvas');
	if (ref.current.width !== w || ref.current.height !== h) {
		ref.current.width = w; ref.current.height = h;
	}
	return ref.current;
};

// Wiggle offset of the shape being painted (written by shapeWiggle; one object, reused).
const wiggle = { x: 0, y: 0 };

/**
 * Renders one layer of the layer loop (the callback of renderZs.forEach
 * in the original render() in StrataCanvas, L1349–L1642).
 *
 * Sub-phases:
 *   1. Per-layer projection setup (dz, scale, opacity, near-clip)
 *   2. Layer ctx init (clearRect on helperCanvas)
 *   3. transformPoint factory for this layer/frame
 *   4. Particles (if cinematic + particles enabled)
 *   5. Shapes loop (delegates to renderText/UniformLine/Eraser/RegularFill)
 *   6. Live stroke (if drawing + this is the active z) — SKIPPED when
 *      rc.skipLiveStroke is true (animation playback)
 *   7. composeLayer (if any content was drawn)
 *
 * NO refs are read or written by this function except via rc and pfc.
 *
 * @param z         The layer's z-index value (negative, multiple of BASE_DEPTH_STEP)
 * @param rc        RenderContext bundling all refs, state, and overrides
 * @param offCtx    Offscreen canvas context (shared across layers)
 * @param pfc       Pre-computed per-frame values shared across all layers
 */
export function renderLayer(
	z: number,
	rc: RenderContext,
	offCtx: CanvasRenderingContext2D,
	pfc: PerFrameComputed,
): void {
	const currentState = rc.state;
	// renderScale (HQ export). 1 = live. The pixel-art snap grid (pSize) is in device
	// px, so it must be ·S to keep blocks at the same relative size in HQ. Camera/viewPan
	// quantization stays in LOGICAL space (renderPipeline), so only the physical-coordinate
	// snapping here scales. S=1 → byte-identical.
	const S = rc.renderScale ?? 1;
	const isDrawing = rc.isDrawing;
	const currentPoints = rc.currentPoints;
	const isCinematic = pfc.isCinematic;
	const fxEnabled = pfc.fxEnabled;
	const isPixelArt = pfc.isPixelArt;
	const pSize = pfc.pSize * S;
	const FL = pfc.FL;
	const fxFocusDist = pfc.fxFocusDist;
	const effectiveCameraZ = pfc.effectiveCameraZ;
	const viewZoom = pfc.viewZoom;
	const viewPan = pfc.viewPan;
	const centerXScreen = pfc.centerXScreen;
	const centerYScreen = pfc.centerYScreen;
	const logicalCenterX = pfc.logicalCenterX;
	const logicalCenterY = pfc.logicalCenterY;
	const camRot = pfc.camRot;
	const cosR = pfc.cosR;
	const sinR = pfc.sinR;
	const poiX = pfc.poiX;
	const poiY = pfc.poiY;
	const isArcOrOrbit = pfc.isArcOrOrbit;
	const arcPivotScale = pfc.arcPivotScale;
	const distortionK = pfc.distortionK;
	const currentCamera = pfc.currentCamera;
	const w = pfc.w;
	const h = pfc.h;
	const activeZ = pfc.activeZ;
	const wiggleFrame = pfc.wiggleFrame;
	const shapePattern = pfc.shapePattern;

	const layerIndex = Math.round(Math.abs(z / BASE_DEPTH_STEP));
	if (currentState.hiddenLayers.includes(layerIndex)) return;

	const isLocked3D = isCinematic && currentState.locked3DLayers.includes(layerIndex);
	const shapes = rc.shapesByZ.get(z) || [];

	// Pre-calculate Layer Projection Constants
	// FIX: Only apply Cinematic Multiplier if in Cinematic Mode!
	// Apply layer spacing factor to control depth separation
	// Flatten to z=0 projection (scale 1.0 exact) when:
	//   - DRAW + animation mode (always flatten for flipbook feel), or
	//   - CINEMA + animation mode + isAnimationFlatZ ON (user chose flat playback).
	// CINEMA + animation mode + isAnimationFlatZ OFF → real depth, parallax lives.
	// shapesByZ.get(z) above still uses the real z for shape lookup — only projection changes.
	const isAnimFlat = currentState.isAnimationMode && (!isCinematic || currentState.isAnimationFlatZ);
	const baseZ  = isAnimFlat ? 0 : z * currentState.layerSpacingFactor;
	const shapeZ = isAnimFlat ? 0 : ((!isCinematic || isLocked3D) ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER);
	const camX = isLocked3D ? 0 : currentCamera.x;
	const camY = isLocked3D ? 0 : currentCamera.y;
	// Flat CINEMA (zero-Z): use viewZoomOffset (= effectiveCameraZ - currentCamera.z)
	// as the camera Z, so every layer shares a uniform NON-zero dz — they stay flat
	// relative to each other, yet the zoom slider still scales the whole plane.
	// Flat DRAW keeps camZ = 0 (no zoom there). Non-flat branch is unchanged.
	const camZ   = isAnimFlat
		? (isCinematic ? (effectiveCameraZ - currentCamera.z) : 0)
		: (isLocked3D ? 0 : effectiveCameraZ);
	const dz = shapeZ - camZ;

	const activeFL = (!isCinematic) ? DRAW_FOCAL_LENGTH : FL;

	if (activeFL + dz <= NEAR_CLIP) return; // Clip behind camera
	const layerScale = activeFL / (activeFL + dz);
	const layerOpacity = (activeFL + dz < 250) ? Math.max(0, ((activeFL + dz) - NEAR_CLIP) / 200) : 1;

	if (layerOpacity <= 0) return;

	const layerCtx = rc.helperCanvasRef.current!.getContext('2d')!;
	layerCtx.clearRect(0, 0, w, h);
	let hasContent = false;
	let layerAvgZ = dz;

	// Transform Helper Function — extracted to canvas/transformPoint.ts
	const layerProjection: LayerProjectionParams = {
		z,
		isLocked3D,
		camX,
		camY,
		layerScale,
		layerOpacity,
	};
	const frameProjection: FrameProjectionParams = {
		isCinematic,
		camera: currentCamera,
		viewZoom,
		viewPan,
		centerXScreen,
		centerYScreen,
		distortCenterX: logicalCenterX,
		distortCenterY: logicalCenterY,
		camRot,
		cosR,
		sinR,
		poiX,
		poiY,
		isArcOrOrbit,
		arcPivotScale,
		distortionK,
		cinematicType: currentState.cinematicType,
		shake: rc.lastShakeRef.current,
	};
	const transformPoint = createTransformPoint(layerProjection, frameProjection);
	const projectInto = createProjectInto(layerProjection, frameProjection);

	// Draw Particles — extracted to canvas/renderParticles.ts
	if (fxEnabled && currentState.postProcessingEnabled.particles && currentState.postProcessing.particles > 0.01) {
		const particlesHadContent = renderParticles(
			layerCtx,
			rc.particles,
			transformPoint,
			{
				z,
				intensity: currentState.postProcessing.particles,
				type: currentState.postProcessing.particleType,
			},
		);
		if (particlesHadContent) hasContent = true;
	}

	// Draw Shapes — the per-shape work lives in pure modules (v3.25.13): shapeWiggle, moveTransformPreview,
	// renderTextShape, renderPathShape. This loop only orchestrates them.
	const pathParams: PathShapeParams = {
		isPixelArt,
		pSize,
		S,
		viewZoom,
		pixelArtSize: currentState.postProcessing.pixelArtSize,
		layerRenderModes: currentState.layerRenderModes,
		layerGradParams: currentState.layerGradParams,
	};
	const wiggleOn = fxEnabled && currentState.postProcessingEnabled.wiggle;
	const isMovePreview = currentState.mode === 'drawing' && currentState.tool === 'move' && rc.transformState.isActive;
	const activeLayerZ = currentState.currentLayerIndex * -BASE_DEPTH_STEP;
	paintShapeRun(layerCtx, shapes, (layerCtx, shape) => {
		if (shape.points.length === 0) return;
		let wiggleX = 0, wiggleY = 0;
		if (wiggleOn) {
			shapeWiggle(shape.id, wiggleFrame, currentState.postProcessing.wiggle, S, isPixelArt, pSize, wiggle);
			wiggleX = wiggle.x;
			wiggleY = wiggle.y;
		}

		// Transform Preview — extracted to canvas/moveTransformPreview.ts
		let currentPoints = shape.points;
		let previewShape = shape;
		if (isMovePreview && shape.zIndex === activeLayerZ) {
			const preview = moveTransformPreview(shape, rc.transformState);
			currentPoints = preview.points;
			previewShape = preview.previewShape;
		}

		// Text Handling — extracted to canvas/renderTextShape.ts
		if (shape.type === 'text' && shape.text) {
			const textHadContent = renderTextShape(
				layerCtx,
				previewShape,
				currentPoints[0],
				transformPoint,
				wiggleX,
				wiggleY,
				{
					layerRenderModes: currentState.layerRenderModes,
					layerGradParams: currentState.layerGradParams,
				},
			);
			if (textHadContent) hasContent = true;
			return; // Sale del forEach callback al siguiente shape (NO cambia comportamiento)
		}

		// Path Handling — extracted to canvas/renderPathShape.ts
		if (renderPathShape(layerCtx, shape, currentPoints, projectInto, transformPoint, wiggleX, wiggleY, pathParams)) hasContent = true;
	});

	// Draw Current Stroke — extracted to canvas/renderLiveStroke.ts
	// Override: skipLiveStroke=true (animation playback) skips this entirely
	if (!rc.skipLiveStroke && isDrawing && currentPoints.length > 0 && z === activeZ) {
		const liveStrokeHadContent = renderLiveStroke(
			layerCtx,
			currentPoints,
			transformPoint,
			{
				tool: currentState.tool,
				palette: currentState.palette,
				currentColorIndex: currentState.currentColorIndex,
				currentBrushThickness: currentState.currentBrushThickness,
				isDrawBehind: currentState.isDrawBehind,
				isDrawInside: currentState.isDrawInside,
				isSymmetryEnabled: currentState.isSymmetryEnabled,
				viewZoom,
			},
		);
		if (liveStrokeHadContent) hasContent = true;
	}

	if (hasContent) {
		// Per-layer composition — extracted to canvas/composeLayer.ts
		// Caller-side prep of pixelCanvas (was ensureCanvas inline in v2.7.1)
		const pSizeForCompose = Math.max(2, currentState.postProcessing.pixelArtSize || 4) * S;
		const pixelCanvas = isPixelArt
			? ensureCanvas(rc.pixelCanvasRef, Math.ceil(w / pSizeForCompose), Math.ceil(h / pSizeForCompose))
			: null;

		composeLayer(
			layerCtx,
			offCtx,
			rc.helperCanvasRef.current!,
			pixelCanvas,
			{
				w,
				h,
				scale: S,
				shapePattern,
				isPixelArt,
				fxEnabled,
				FL,
				layerAvgZ,
				fxFocusDist,
				isDarkMode: currentState.isDarkMode,
				palette: currentState.palette,
				postProcessing: {
					fog: currentState.postProcessing.fog,
					pixelArtSize: currentState.postProcessing.pixelArtSize,
					pixelArtDepth: currentState.postProcessing.pixelArtDepth,
					pixelArtDither: currentState.postProcessing.pixelArtDither,
					glow: currentState.postProcessing.glow,
					dof: currentState.postProcessing.dof,
				},
				postProcessingEnabled: {
					fog: currentState.postProcessingEnabled.fog,
					glow: currentState.postProcessingEnabled.glow,
					dof: currentState.postProcessingEnabled.dof,
				},
			},
		);
	}
}
