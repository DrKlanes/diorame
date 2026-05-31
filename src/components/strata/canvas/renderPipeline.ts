import React from 'react';
import { BASE_DEPTH_STEP } from '../StrataContext';
import { RENDER_THROTTLE_MS, NEAR_CLIP } from '../../../constants/renderConstants';
import { createNoise } from '../../../utils/canvasUtils';
import type { AppState, Shape, Point } from '../../../types/strataTypes';
import type { Particle } from './renderParticles';
import type { GizmoHandles } from './drawGizmo';
import type { OrbitState } from './cinematicCamera';
import { CINEMATIC_DEPTH_MULTIPLIER, computeCinematicTick } from './cinematicCamera';
import { drawBackground } from './drawBackground';
import { drawGizmo } from './drawGizmo';
import { drawSymmetryAxis } from './drawSymmetryAxis';
import { quantizePixelArtCamera } from './quantizePixelArtCamera';
import {
	applyRisoV2,
	applyChromaticAberration,
	applyVignette,
	applyGrain,
	applyGrunge,
} from './postProcessing';
import { renderLayer } from './renderLayerBody';

/**
 * Move tool's transform state (shape of transformRef.current in StrataCanvas L144).
 * Inline-defined here because StrataCanvas owns the ref and renderPipeline reads it.
 */
export type TransformRefState = {
	isActive: boolean;
	mode: 'none' | 'move' | 'scale_tl' | 'scale_tr' | 'scale_br' | 'scale_bl' | 'rotate';
	startP: { x: number; y: number };
	startTransform: { x: number; y: number; scale: number; rotation: number };
	centerX: number;
	centerY: number;
	layerBB: { minX: number; maxX: number; minY: number; maxY: number };
	currentTransform: { x: number; y: number; scale: number; rotation: number };
};

/**
 * RenderContext bundles every input that renderFrame and renderLayer need:
 * AppState snapshot, refs (some read-only, some written by the pipeline),
 * frame-persistent state refs (the 5 migrated from useEffect-local `let`),
 * canvas refs (passed as refs, not snapshots, so lazy-resize works), asset
 * refs, dimensions, and optional animation overrides.
 *
 * Canvas refs are MutableRefObject (not snapshots) for two reasons:
 *   1. Lazy creation (e.g. pixelCanvasRef can start null and be filled in
 *      by ensureCanvas mid-frame).
 *   2. Resize: ensureCanvas resizes .width/.height in place but the
 *      canvas element identity is preserved across frames.
 *
 * Refs marked WRITE are mutated by renderFrame (cinematic tick, throttle,
 * drawGizmo return, noiseCanvas re-init on resize, frame-persistent state).
 * The caller (StrataCanvas) must accept that these refs change across
 * frames.
 */
export type RenderContext = {
	// AppState snapshot + transient ref snapshots (read-only inputs)
	state: AppState;
	isDrawing: boolean;
	currentPoints: Point[];
	shapesByZ: Map<number, Shape[]>;
	sortedZs: number[];
	transformState: TransformRefState;

	// Read-write refs (WRITE in fase 5 / throttle / drawGizmo)
	cameraRef: React.MutableRefObject<{ x: number; y: number; z: number; rotation: number }>;
	lastShakeRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
	transformHandlesRef: React.MutableRefObject<GizmoHandles | null>;
	lastRenderTimeRef: React.MutableRefObject<number>;
	orbitRef: React.MutableRefObject<OrbitState>;

	// Frame-persistent state refs (migrated from useEffect-local `let`)
	accumulatedTimeRef: React.MutableRefObject<number>;
	accumulatedHandheldTimeRef: React.MutableRefObject<number>;
	lastTimeRef: React.MutableRefObject<number>;
	wiggleFrameRef: React.MutableRefObject<number>;
	shapePatternRef: React.MutableRefObject<CanvasPattern | null>;

	// Canvas refs (passed as refs for lazy-create / resize semantics)
	offscreenCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	helperCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	compositionCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	pixelCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	tempCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
	noiseCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;

	// Asset refs (snapshots — loaded async between frames, never mid-frame)
	paperImg: HTMLImageElement | null;
	risoGrain: HTMLCanvasElement | null;
	grungeImg: HTMLImageElement | null;
	particles: Particle[];

	// DOM ref for flip buttons overlay (positioned by drawGizmo as a side effect)
	flipButtonsEl: HTMLDivElement | null;

	// Container dimensions (resolved by caller from containerRef.current?.clientWidth/Height)
	w: number;
	h: number;

	// getActiveZ — small helper closure passed because it's used by both renderPipeline (POI)
	// and inside quantizePixelArtCamera. Stays in StrataCanvas for now (10b decides).
	getActiveZ: (layerIndex: number) => number;

	// --- Animation overrides (all optional, default = current behavior) ---
	// If present, use this array instead of deriving from sortedZs + activeZ injection.
	renderZsOverride?: number[];
	// If true, skip the live-stroke phase inside renderLayer.
	skipLiveStroke?: boolean;
	// If true, skip Fase 4 (drawGizmo + drawSymmetryAxis).
	skipCinematicOverlays?: boolean;
};

/**
 * Per-frame computed values: derived once per renderFrame call and passed
 * to every renderLayer invocation in that frame to avoid recomputation.
 */
export type PerFrameComputed = {
	// Mode flags
	isCinematic: boolean;
	fxEnabled: boolean;
	isPixelArt: boolean;
	pSize: number;

	// Camera / optics
	currentCamera: { x: number; y: number; z: number; rotation: number };
	effectiveCameraZ: number;
	FL: number;
	fxFocusDist: number;

	// Viewport (screen space)
	viewZoom: number;
	viewPan: { x: number; y: number };
	centerXScreen: number;
	centerYScreen: number;
	w: number;
	h: number;

	// Camera rotation precomputed
	camRot: number;
	cosR: number;
	sinR: number;

	// POI / arc-orbit
	poiX: number;
	poiY: number;
	centerZ: number;
	isArcOrOrbit: boolean;
	arcPivotScale: number;

	// Distortion
	distortionK: number;

	// Active layer for live stroke
	activeZ: number;

	// Wiggle source (snapshot of wiggleFrameRef.current for this frame)
	wiggleFrame: number;

	// Shape pattern (snapshot of shapePatternRef.current for this frame)
	shapePattern: CanvasPattern | null;
};

/**
 * ensureCanvas — lazy create + resize. Mirrored from StrataCanvas's local
 * helper. Identical implementation. Internal to this module.
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
 * Renders one full frame into ctx.
 *
 * Phases:
 *   - Setup: throttle check + pSize derivation
 *   - Cam A: quantizePixelArtCamera
 *   - Cam B: FL zoom math + dynamic focus distance
 *   - Buffers: resize + ensureCanvas batch
 *   - Pre-compute PerFrameComputed
 *   - Fase 1: drawBackground
 *   - Viewport: viewZoom, viewPan, camRot, POI, arc/orbit, distortion
 *   - Fase 2: renderZs.forEach → renderLayer per layer
 *   - Fase 3: post-processing (Riso, CA, Vignette, Grain, Grunge)
 *   - Fase 4: overlays (Gizmo + Symmetry Axis) — SKIPPED when rc.skipCinematicOverlays
 *   - Fase 5: cinematic tick + write-back to refs
 *
 * SIDE EFFECTS:
 *   - Paints into ctx
 *   - Mutates rc.lastRenderTimeRef (throttle update)
 *   - Mutates rc.cameraRef (cinematic tick)
 *   - Mutates rc.lastShakeRef (cinematic tick)
 *   - Mutates rc.transformHandlesRef (drawGizmo return)
 *   - Mutates rc.noiseCanvasRef (resize re-init)
 *   - Mutates the 5 frame-persistent state refs (accumulatedTime etc.)
 *   - Mutates canvas .width/.height on resize
 *
 * NOTE: throttle early-return is signalled by EARLY RETURN with no side
 * effects. The caller is expected to call requestAnimationFrame either way.
 *
 * @param ctx Main canvas 2D context
 * @param rc  RenderContext bundling refs, state, overrides
 */
export function renderFrame(
	ctx: CanvasRenderingContext2D,
	rc: RenderContext,
): void {
	const currentState = rc.state;
	const isDrawing = rc.isDrawing;
	const currentPoints = rc.currentPoints;
	const isCinematic = currentState.mode === 'cinematic';
	const fxEnabled = isCinematic && currentState.fxMasterEnabled;
	const isPixelArt = fxEnabled && currentState.postProcessingEnabled.pixelArt;

	// Throttle rendering during drawing for better performance
	const renderTime = performance.now();
	const timeSinceLastRender = renderTime - rc.lastRenderTimeRef.current;
	if (isDrawing && currentState.mode === 'drawing' && timeSinceLastRender < RENDER_THROTTLE_MS) {
		return;
	}
	rc.lastRenderTimeRef.current = renderTime;

	// Quantization Logic for Pixel Art
	// Derived from Pixel Art Size to ensure 1:1 pixel stability
	const pSize = (isPixelArt) ? Math.max(2, currentState.postProcessing.pixelArtSize || 4) : 1;

	let currentCamera = { ...rc.cameraRef.current };
	let viewZoomOffset = currentState.viewZoomOffset;

	const canvas = ctx.canvas;

	viewZoomOffset = quantizePixelArtCamera(
		currentCamera,
		viewZoomOffset,
		isPixelArt,
		isCinematic,
		currentState.pointOfInterest,
		currentState.currentLayerIndex,
		currentState.focalLength,
		pSize,
		rc.w || canvas.width,
		rc.getActiveZ,
	).viewZoomOffset;

	const effectiveCameraZ = currentCamera.z + (isCinematic ? viewZoomOffset : 0);
	let FL = currentState.focalLength;

	if (isCinematic && currentState.cinematicType === 'zoom') {
		// Exponential Zoom for smooth visual flow
		// Range: ~78mm (1250) to ~2500mm (40000)
		const minFL = 1250;
		const maxFL = 40000;
		const ratio = maxFL / minFL;
		const sineNorm = (Math.sin(rc.accumulatedTimeRef.current * 0.4) + 1) / 2;
		FL = minFL * Math.pow(ratio, sineNorm);
	}

	// Dynamic Focus Logic
	let fxFocusDist = isCinematic ? currentState.postProcessing.focusDist : 800;

	if (isCinematic && currentState.postProcessing.focusTargetLayer !== undefined && currentState.postProcessing.focusTargetLayer !== -1) {
		const targetIdx = currentState.postProcessing.focusTargetLayer;
		if (targetIdx >= 0 && targetIdx < currentState.totalLayers) {
		   const z = targetIdx * -BASE_DEPTH_STEP;
		   const baseZ = z * currentState.layerSpacingFactor;
		   const isLocked3D = currentState.locked3DLayers.includes(targetIdx);
		   const shapeZ = (!isCinematic || isLocked3D) ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
		   const camZ = isLocked3D ? 0 : effectiveCameraZ;
		   // Calculate distance from camera to target layer
		   fxFocusDist = shapeZ - camZ;
		}
	}

	// --- Resize Handling ---
	const w = rc.w || canvas.width;
	const h = rc.h || canvas.height;
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w; canvas.height = h;
		// Re-init noise
		const nc = createNoise(w, h);
		if (nc) rc.noiseCanvasRef.current = nc;

		const patC = createNoise(256, 256, 15, 1, 0.3);
		if (patC) rc.shapePatternRef.current = ctx.createPattern(patC, 'repeat');
	}

	// Ensure Buffers
	ensureCanvas(rc.offscreenCanvasRef, w, h);
	ensureCanvas(rc.helperCanvasRef, w, h);
	ensureCanvas(rc.compositionCanvasRef, w, h);

	ensureCanvas(rc.tempCanvasRef, w, h);
	ensureCanvas(rc.pixelCanvasRef, Math.ceil(w / 4), Math.ceil(h / 4)); // Init small, resize later if needed

	if (!rc.noiseCanvasRef.current) rc.noiseCanvasRef.current = createNoise(w, h);
	if (!rc.shapePatternRef.current) {
		const patC = createNoise(256, 256, 15, 1, 0.3);
		if (patC) rc.shapePatternRef.current = ctx.createPattern(patC, 'repeat');
	}

	const offCtx = rc.offscreenCanvasRef.current!.getContext('2d')!;

	// --- 1. Background ---
	drawBackground(ctx, w, h, currentState.isDarkMode, isPixelArt, rc.paperImg);

	// viewport calc — feeds layer loop and gizmo
	const viewZoom = currentState.mode === 'drawing' ? currentState.drawingZoom : 1;
	let viewPan = currentState.mode === 'drawing' ? currentState.drawingPan : { x: 0, y: 0 };

	// Ensure viewPan exists
	if (!viewPan) viewPan = { x: 0, y: 0 };

	if (currentState.mode === 'cinematic' && currentState.cinematicType === 'arc') {
		// Extremely subtle sway for Arc shot
		// Reduced amplitude (50 -> 15) and speed (0.3 -> 0.2) to avoid distracting from the focused layer
		viewPan = { x: Math.sin(rc.accumulatedTimeRef.current * 0.2) * 15, y: 0 };
	}

	// Quantize View Pan (Screen Space)
	if (isPixelArt) {
		viewPan = {
			x: Math.round(viewPan.x / pSize) * pSize,
			y: Math.round(viewPan.y / pSize) * pSize
		};
	}

	const centerXScreen = w / 2;
	const centerYScreen = h / 2;

	// --- 2. Render Layers ---
	offCtx.setTransform(1, 0, 0, 1, 0, 0);
	offCtx.clearRect(0, 0, w, h);

	// Use cached shapes map for better performance
	const currentShapesByZ = rc.shapesByZ;
	const currentSortedZs = rc.sortedZs;

	const activeZ = rc.getActiveZ(currentState.currentLayerIndex);
	let renderZs = currentSortedZs;
	// Inject current active Z if drawing and not yet in list
	if (isDrawing && currentPoints.length > 0 && !currentShapesByZ.has(activeZ)) {
		renderZs = [...renderZs, activeZ].sort((a, b) => b - a);
	}

	// Animation override: use the explicit z list when provided
	if (rc.renderZsOverride) {
		renderZs = rc.renderZsOverride;
	}

	// In animation mode: show only the current frame layer (DRAW and CINEMA).
	// Does not affect hiddenLayers (user-managed visibility state).
	// In CINEMA + anim + zero-Z OFF: single frame at real depth (parallax lives).
	// In CINEMA + anim + zero-Z ON: single frame, flattened (renderLayerBody handles Z=0).
	if (currentState.isAnimationMode) {
		renderZs = [currentState.currentLayerIndex * -BASE_DEPTH_STEP];
	}

	const camRot = currentCamera.rotation || 0;
	const cosR = camRot !== 0 ? Math.cos(camRot) : 1;
	const sinR = camRot !== 0 ? Math.sin(camRot) : 0;

	const poi = currentState.pointOfInterest;
	const poiX = poi ? poi.x : 0;
	const poiY = poi ? poi.y : 0;
	const centerZ = poi ? poi.z * CINEMATIC_DEPTH_MULTIPLIER : ((currentState.totalLayers - 1) / 2) * -BASE_DEPTH_STEP * CINEMATIC_DEPTH_MULTIPLIER;

	const isArcOrOrbit = (currentState.cinematicType === 'arc' || currentState.cinematicType === 'orbit') && isCinematic;
	const dzCenter = isArcOrOrbit ? centerZ - effectiveCameraZ : 0;
	const arcPivotScale = isArcOrOrbit ? FL / (FL + dzCenter) : 0;

	const fxDistortion = (fxEnabled && currentState.postProcessingEnabled.distortion) ? currentState.postProcessing.distortion : 0;
	const distortionK = Math.abs(fxDistortion) > 0.01 ? (fxDistortion * -0.8) * (500 / FL) : 0;

	// Build PerFrameComputed
	const pfc: PerFrameComputed = {
		isCinematic, fxEnabled, isPixelArt, pSize,
		currentCamera, effectiveCameraZ, FL, fxFocusDist,
		viewZoom, viewPan, centerXScreen, centerYScreen, w, h,
		camRot, cosR, sinR,
		poiX, poiY, centerZ, isArcOrOrbit, arcPivotScale,
		distortionK,
		activeZ,
		wiggleFrame: rc.wiggleFrameRef.current,
		shapePattern: rc.shapePatternRef.current,
	};

	renderZs.forEach(z => {
		renderLayer(z, rc, offCtx, pfc);
	});

	// --- 3. Final Composition ---

	// RISO Texture
	if (fxEnabled && currentState.postProcessingEnabled.riso && currentState.postProcessing.riso > 0.01 && rc.risoGrain) {
		applyRisoV2(offCtx, w, h, currentState.postProcessing.riso, rc.risoGrain, rc.helperCanvasRef.current!.getContext('2d')!);
	}

	// Chromatic Aberration & Transfer to Main
	const caInt = currentState.postProcessing.chromaticAberration;
	const useCA = fxEnabled && currentState.postProcessingEnabled.chromaticAberration && caInt > 0.01;

	ctx.globalCompositeOperation = currentState.isDarkMode ? 'source-over' : 'multiply';

	if (useCA) {
		applyChromaticAberration(
			ctx, rc.offscreenCanvasRef.current!, rc.helperCanvasRef.current!,
			rc.compositionCanvasRef.current!, w, h, caInt, currentState.isDarkMode
		);
	} else {
		ctx.drawImage(rc.offscreenCanvasRef.current!, 0, 0);
	}

	// Global FX
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'source-over';

	if (fxEnabled && currentState.postProcessingEnabled.vignette) {
		applyVignette(ctx, w, h, currentState.postProcessing.vignette);
	}

	const grain = (fxEnabled && currentState.postProcessingEnabled.grain) ? currentState.postProcessing.grain : 0;
	if (grain > 0.01 && rc.noiseCanvasRef.current) {
		applyGrain(ctx, rc.noiseCanvasRef.current, w, h, grain);
	}


	// --- Grunge Overlay (Animated) ---
	if (fxEnabled && currentState.postProcessingEnabled.grunge && rc.grungeImg) {
		applyGrunge(ctx, rc.grungeImg, w, h, currentState.postProcessing.grungeIntensity ?? 0.5);
	}

	// --- 4. Overlays (skipped during animation playback) ---
	if (!rc.skipCinematicOverlays) {
		// --- Gizmo Drawing ---
		rc.transformHandlesRef.current = drawGizmo(
			ctx, w, h,
			currentState.mode,
			currentState.tool,
			rc.transformState,
			currentState.currentLayerIndex,
			currentState.drawingZoom,
			currentState.drawingPan,
			currentCamera.z,
			rc.flipButtonsEl,
			BASE_DEPTH_STEP,
		);

		// --- Symmetry Axis Guide ---
		if (currentState.mode === 'drawing' && currentState.isSymmetryEnabled) {
			drawSymmetryAxis(ctx, w, h, currentState.drawingPan?.x || 0);
		}
	}

	// --- 5. Animation Tick ---
	const now = Date.now();
	const dt = Math.min((now - rc.lastTimeRef.current) / 1000, 0.1);
	rc.lastTimeRef.current = now;
	if (isCinematic) {
		const cinematicResult = computeCinematicTick(
			dt, now,
			rc.accumulatedTimeRef.current, rc.accumulatedHandheldTimeRef.current,
			currentState.cinematicSpeed ?? 1.0,
			currentState.cinematicType,
			currentState.camera,
			currentState.totalLayers,
			currentState.isHandheldEnabled,
			currentState.handheldIntensity,
			poiX, poiY, centerZ,
			rc.orbitRef.current
		);
		rc.accumulatedTimeRef.current = cinematicResult.accumulatedTime;
		rc.accumulatedHandheldTimeRef.current = cinematicResult.accumulatedHandheldTime;
		rc.wiggleFrameRef.current = cinematicResult.wiggleFrame;
		rc.cameraRef.current = cinematicResult.newCamera;
		rc.lastShakeRef.current = cinematicResult.newShake;
	}
}
