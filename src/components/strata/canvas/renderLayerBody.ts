import { BASE_DEPTH_STEP } from '../StrataContext';
import { CINEMATIC_DEPTH_MULTIPLIER } from './cinematicCamera';
import { DRAW_FOCAL_LENGTH, NEAR_CLIP } from '../../../constants/renderConstants';
import { createTransformPoint } from './transformPoint';
import { renderParticles } from './renderParticles';
import { renderTextShape } from './renderTextShape';
import { renderUniformLineShape } from './renderUniformLineShape';
import { renderEraserShape } from './renderEraserShape';
import { renderRegularFillShape } from './renderRegularFillShape';
import { renderLiveStroke } from './renderLiveStroke';
import { composeLayer } from './composeLayer';
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
	const isDrawing = rc.isDrawing;
	const currentPoints = rc.currentPoints;
	const isCinematic = pfc.isCinematic;
	const fxEnabled = pfc.fxEnabled;
	const isPixelArt = pfc.isPixelArt;
	const pSize = pfc.pSize;
	const FL = pfc.FL;
	const fxFocusDist = pfc.fxFocusDist;
	const effectiveCameraZ = pfc.effectiveCameraZ;
	const viewZoom = pfc.viewZoom;
	const viewPan = pfc.viewPan;
	const centerXScreen = pfc.centerXScreen;
	const centerYScreen = pfc.centerYScreen;
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
	const baseZ = z * currentState.layerSpacingFactor;
	const shapeZ = (!isCinematic || isLocked3D) ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
	const camX = isLocked3D ? 0 : currentCamera.x;
	const camY = isLocked3D ? 0 : currentCamera.y;
	const camZ = isLocked3D ? 0 : effectiveCameraZ;
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
	const transformPoint = createTransformPoint(
		{
			z,
			isLocked3D,
			camX,
			camY,
			layerScale,
			layerOpacity,
		},
		{
			isCinematic,
			camera: currentCamera,
			viewZoom,
			viewPan,
			centerXScreen,
			centerYScreen,
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
		},
	);

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

	// Draw Shapes
	shapes.forEach(shape => {
		if (shape.points.length === 0) return;
		let wiggleX = 0, wiggleY = 0;
		if (fxEnabled && currentState.postProcessingEnabled.wiggle) {
			const seed = shape.id.charCodeAt(0) + (shape.id.charCodeAt(1) || 0);
			const noiseValX = Math.sin(seed + wiggleFrame * 12.9898) * 43758.5453;
			const noiseValY = Math.cos(seed + wiggleFrame * 78.233) * 43758.5453;
			const amp = currentState.postProcessing.wiggle <= 0.2 ? 2 : (currentState.postProcessing.wiggle >= 0.8 ? 8 : 4);
			wiggleX = (noiseValX - Math.floor(noiseValX)) * amp - amp/2;
			wiggleY = (noiseValY - Math.floor(noiseValY)) * amp - amp/2;

			if (isPixelArt) {
				wiggleX = Math.round(wiggleX / pSize) * pSize;
				wiggleY = Math.round(wiggleY / pSize) * pSize;
			}
		}

		// Transform Preview
		let currentPoints = shape.points;
		if (currentState.mode === 'drawing' && currentState.tool === 'move' && rc.transformState.isActive && shape.zIndex === currentState.currentLayerIndex * -BASE_DEPTH_STEP) {
			 const t = rc.transformState.currentTransform;
			 const cx = rc.transformState.centerX;
			 const cy = rc.transformState.centerY;
			 const sin = Math.sin(t.rotation);
			 const cos = Math.cos(t.rotation);

			 currentPoints = currentPoints.map(p => {
				 const ox = p.x - cx;
				 const oy = p.y - cy;
				 const rx = (ox * cos - oy * sin) * t.scale;
				 const ry = (ox * sin + oy * cos) * t.scale;
				 return {
					 ...p,
					 x: rx + cx + t.x,
					 y: ry + cy + t.y
				 };
			 });
		}

		// Text Handling — extracted to canvas/renderTextShape.ts
		if (shape.type === 'text' && shape.text) {
			const isThisShapeActive = (
				currentState.mode === 'drawing' &&
				currentState.tool === 'move' &&
				rc.transformState.isActive &&
				shape.zIndex === currentState.currentLayerIndex * -BASE_DEPTH_STEP
			);
			const t = rc.transformState.currentTransform;

			const textHadContent = renderTextShape(
				layerCtx,
				shape,
				currentPoints[0],
				transformPoint,
				wiggleX,
				wiggleY,
				{
					activeFontSizeScale: isThisShapeActive ? t.scale : 1.0,
					activeRotationDelta: isThisShapeActive ? t.rotation : 0.0,
					layerRenderModes: currentState.layerRenderModes,
					layerGradParams: currentState.layerGradParams,
				},
			);
			if (textHadContent) hasContent = true;
			return; // Sale del forEach callback al siguiente shape (NO cambia comportamiento)
		}

		// Path Handling
		const projectedPoints: {x:number, y:number}[] = [];
		let minOp = 1;
		currentPoints.forEach(pt => {
			const proj = transformPoint(pt.x, pt.y);
			projectedPoints.push({ x: proj.x + wiggleX, y: proj.y + wiggleY });
			if (proj.opacity < minOp) minOp = proj.opacity;
		});

		if (projectedPoints.length > 1 && minOp > 0.01) {
			hasContent = true;
			layerCtx.globalAlpha = minOp;

			// Pixel Art Refinement: Snap Points & Use Straight Lines
			let renderPoints = projectedPoints;
			let useStraightLines = false;

			// Early detection of brush type to identify "taps"
			const isUniformLine = shape.originalPoints && shape.originalPoints.length > 0 && shape.brushMode === 'uniform';
			const isBrushTap = isPixelArt && !isUniformLine && !shape.isEraser && shape.points.length <= 3 && projectedPoints.length > 0;

			if (isPixelArt) {
				useStraightLines = true;
				const pSize = Math.max(2, currentState.postProcessing.pixelArtSize || 4);

				if (isBrushTap) {
					 return; // Option A: Skip tap strokes entirely in Pixel Art View Mode to avoid artifacts
				}

				renderPoints = projectedPoints.map(p => ({
					x: Math.round(p.x / pSize) * pSize,
					y: Math.round(p.y / pSize) * pSize
				}));
				// Remove duplicate adjacent points
				renderPoints = renderPoints.filter((p, i) =>
					i === 0 || (p.x !== renderPoints[i-1].x || p.y !== renderPoints[i-1].y)
				);

				// Ensure at least 2 points
				if (renderPoints.length < 2 && projectedPoints.length >= 2) {
					 renderPoints = [
						 { x: Math.round(projectedPoints[0].x/pSize)*pSize, y: Math.round(projectedPoints[0].y/pSize)*pSize },
						 { x: Math.round(projectedPoints[projectedPoints.length-1].x/pSize)*pSize, y: Math.round(projectedPoints[projectedPoints.length-1].y/pSize)*pSize }
					 ];
				}
			}

			if (isUniformLine) {
				// Extracted to canvas/renderUniformLineShape.ts
				renderUniformLineShape(
					layerCtx,
					shape,
					transformPoint,
					useStraightLines,
					wiggleX,
					wiggleY,
					pSize,
					isPixelArt,
					viewZoom,
					{
						layerRenderModes: currentState.layerRenderModes,
						layerGradParams: currentState.layerGradParams,
						pixelArtSize: currentState.postProcessing.pixelArtSize,
					},
				);
			} else if (shape.isEraser) {
				// Extracted to canvas/renderEraserShape.ts
				renderEraserShape(layerCtx, renderPoints, useStraightLines);
			} else {
				// Extracted to canvas/renderRegularFillShape.ts
				renderRegularFillShape(
					layerCtx,
					shape,
					projectedPoints,
					renderPoints,
					useStraightLines,
					{
						layerRenderModes: currentState.layerRenderModes,
						layerGradParams: currentState.layerGradParams,
					},
				);
			}

			layerCtx.globalCompositeOperation = 'source-over';
			layerCtx.globalAlpha = 1.0;
		}


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
		const pSizeForCompose = Math.max(2, currentState.postProcessing.pixelArtSize || 4);
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
