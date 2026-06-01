import { renderFrame, type RenderContext, type TransformRefState } from './renderPipeline';
import { getAnimationFrames } from '../../../utils/animationFrames';
import type { AppState, Shape, Point } from '../../../types/strataTypes';
import type { Particle } from './renderParticles';
import type { OrbitState } from './cinematicCamera';
import type { GizmoHandles } from './drawGizmo';

/**
 * All inputs needed to render animation frames independently of the live RAF.
 * All fields are SNAPSHOTS taken at export time — no live refs.
 * The caller (StrataCanvas export useEffect) builds this from its refs.
 */
export type AnimationExportRenderOptions = {
	state: AppState;                                       // snapshot of stateRef.current
	shapesByZ: Map<number, Shape[]>;                       // snapshot of shapesByZRef.current
	sortedZs: number[];                                    // snapshot of sortedZsRef.current
	camera: { x: number; y: number; z: number; rotation: number }; // snapshot of cameraRef.current
	w: number;                                             // containerRef width
	h: number;                                             // containerRef height
	paperImg: HTMLImageElement | null;
	risoGrain: HTMLCanvasElement | null;
	grungeImg: HTMLImageElement | null;
	particles: Particle[];
	noiseCanvas: HTMLCanvasElement | null;                 // snapshot of noiseCanvasRef.current
	shapePattern: CanvasPattern | null;                   // snapshot of shapePatternRef.current
	getActiveZ: (layerIndex: number) => number;
};

/**
 * Dummy TransformRefState — no move tool in export renders.
 */
const IDLE_TRANSFORM: TransformRefState = {
	isActive: false,
	mode: 'none',
	startP: { x: 0, y: 0 },
	startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
	centerX: 0,
	centerY: 0,
	layerBB: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
	currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
};

/**
 * Dummy OrbitState — cinematic camera doesn't need to track orbit for export.
 * (The cinematic tick still runs and mutates the per-frame fake cameraRef, which is
 * fine — the mutation stays local to that frame's RC and doesn't affect anything else.)
 */
const IDLE_ORBIT: OrbitState = {
	azimuth: 0,
	elevation: 0.2,
	targetAzimuth: 0,
	targetElevation: 0.2,
	panOffsetX: 0,
	panOffsetY: 0,
};

/**
 * Renders every frame of the current animation to separate ImageData objects.
 *
 * Uses DEDICATED canvas elements that never touch the live RAF's canvas refs.
 * JS is single-threaded, but this function is async (yields between frames) to
 * keep the UI responsive. The yield is safe because:
 *   - Export canvas refs are completely separate from the RAF's refs.
 *   - The camera snapshot is taken once and frozen per-frame via a fresh fake ref,
 *     so the RAF's cinematic tick mutating cameraRef doesn't affect the export.
 *   - shapesByZ/sortedZs are snapshotted at the start (passed in via options).
 *
 * Each frame is rendered with the same mode/FX/isAnimationFlatZ as the current
 * state, so the export captures exactly what the user sees in the preview.
 *
 * @param options  Snapshot of all inputs needed for rendering.
 * @param onProgress  Optional callback called after each frame (1-based, total).
 * @returns  One ImageData per animation frame, in sequence order.
 */
export async function renderAnimationFrames(
	options: AnimationExportRenderOptions,
	onProgress?: (current: number, total: number) => void,
): Promise<ImageData[]> {
	const frames = getAnimationFrames(options.state);
	if (frames.length === 0) return [];

	const { w, h } = options;

	// Dedicated export canvas — the "main" ctx that renderFrame paints to.
	const exportCanvas = document.createElement('canvas');
	exportCanvas.width = w;
	exportCanvas.height = h;
	const exportCtx = exportCanvas.getContext('2d', { alpha: false })!;

	// Dedicated working canvases (analogous to the RAF's offscreen/helper/composition/pixel).
	// All writable during render — must NOT be shared with the RAF.
	const offscreen = document.createElement('canvas');
	offscreen.width = w; offscreen.height = h;

	const helper = document.createElement('canvas');
	helper.width = w; helper.height = h;

	const composition = document.createElement('canvas');
	composition.width = w; composition.height = h;

	// pixelCanvas starts small; ensureCanvas inside renderFrame resizes it as needed.
	const pixel = document.createElement('canvas');
	pixel.width = 1; pixel.height = 1;

	// noiseCanvas is read-only during rendering — safe to share the snapshot.
	const noiseRef = { current: options.noiseCanvas };
	const patternRef = { current: options.shapePattern };

	const results: ImageData[] = [];
	const total = frames.length;

	for (let i = 0; i < total; i++) {
		const frameIndex = frames[i];

		// Per-frame state: only currentLayerIndex changes; everything else stays as-is.
		const frameState: AppState = {
			...options.state,
			currentLayerIndex: frameIndex,
			isAnimationMode: true,    // activates single-frame filter in renderPipeline
			isAnimationPlaying: false,
			isOnionSkinEnabled: false, // no ghost frames in export
		};

		// Fresh cameraRef per frame: the cinematic tick (Fase 5 of renderFrame) mutates
		// rc.cameraRef.current, so each frame must start from the original snapshot.
		const cameraRef = { current: { ...options.camera } };
		const lastShakeRef = { current: { x: 0, y: 0, z: 0 } };
		const transformHandlesRef: { current: GizmoHandles | null } = { current: null };
		const lastRenderTimeRef = { current: 0 }; // 0 ensures no throttle early-return
		const orbitRef = { current: { ...IDLE_ORBIT } };
		const accumulatedTimeRef = { current: 0 };
		const accumulatedHandheldTimeRef = { current: 0 };
		const lastTimeRef = { current: Date.now() };
		const wiggleFrameRef = { current: 0 };

		const rc: RenderContext = {
			state: frameState,
			isDrawing: false,
			currentPoints: [],
			shapesByZ: options.shapesByZ,
			sortedZs: options.sortedZs,
			transformState: IDLE_TRANSFORM,

			// Read-write refs (fake — mutations stay local to this frame)
			cameraRef,
			lastShakeRef,
			transformHandlesRef,
			lastRenderTimeRef,
			orbitRef,

			// Frame-persistent state refs (reset each frame)
			accumulatedTimeRef,
			accumulatedHandheldTimeRef,
			lastTimeRef,
			wiggleFrameRef,
			shapePatternRef: patternRef,

			// Dedicated canvas refs (never touch the live RAF)
			offscreenCanvasRef: { current: offscreen },
			helperCanvasRef: { current: helper },
			compositionCanvasRef: { current: composition },
			pixelCanvasRef: { current: pixel },
			tempCanvasRef: { current: null },
			noiseCanvasRef: noiseRef,

			// Assets (read-only)
			paperImg: options.paperImg,
			risoGrain: options.risoGrain,
			grungeImg: options.grungeImg,
			particles: options.particles,

			flipButtonsEl: null,
			w,
			h,
			getActiveZ: options.getActiveZ,

			// Skip non-content overlays (gizmo, symmetry)
			skipLiveStroke: true,
			skipCinematicOverlays: true,
		};

		renderFrame(exportCtx, rc);
		results.push(exportCtx.getImageData(0, 0, w, h));
		onProgress?.(i + 1, total);

		// Yield to the event loop so the RAF can tick and the UI stays responsive.
		// With ≤10 frames this adds negligible total delay (~10 × 0ms setTimeout ≈ 10ms).
		await new Promise<void>(r => setTimeout(r, 0));
	}

	return results;
}
