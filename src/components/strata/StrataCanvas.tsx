import { useEffect, useRef, useState, useCallback } from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { useCanvasRecovery } from '../../hooks/useCanvasRecovery';
import { useCanvasWheelZoom } from '../../hooks/useCanvasWheelZoom';
import { useSpacePan } from '../../hooks/useSpacePan';
import type { CanvasHandlerEnv } from './canvas/handlerEnv';
import { createPointerMoveUpHandlers } from './canvas/pointerMoveUpHandlers';
import { createPointerDownHandler } from './canvas/pointerDownHandler';
import { createTouchHandlers } from './canvas/touchHandlers';
import { Shape, Point, Waypoint, GestureState } from '../../types/strataTypes';
import paperTexture from "figma:asset/texture-paper.png";
import grungeTexture from "figma:asset/texture-grunge.png";
import { cn } from '../ui/utils';
import { toast } from 'sonner@2.0.3';
import { OnboardingOverlayConnected as OnboardingOverlay } from './OnboardingOverlayConnected';
import { generateRisoGrain } from './canvas/postProcessing';
import { PARTICLE_COUNT } from '../../constants/renderConstants';
import { exportAsPNG, exportAsMP4 } from './canvas/exportHandlers';
import { exportAsTimelapse } from './canvas/timelapseExport';
import { registerThumbnailSource } from './canvas/projectThumbnail';
import { exportAsSVG } from './canvas/svgExport';
import { renderAnimationFrames } from './canvas/animationExportRender';
import { exportAsPNGSequence } from './canvas/pngSequenceHandler';
import { exportAsGIF } from './canvas/gifHandler';
import { useTranslation } from '../../i18n';
import { getLayerBoundingBox } from './canvas/transformUtils';
import type { TransformMode } from './canvas/moveGizmoInteraction';
import { getAnimationFrames } from '../../utils/animationFrames';
import { renderFrame, type RenderContext, type TransformRefState, type DrawnFrameOptics } from './canvas/renderPipeline';
import { createIdleGuard, renderStats } from './canvas/idleGuard';
import { CINEMATIC_DEPTH_MULTIPLIER } from './canvas/cinematicCamera';

export const StrataCanvas = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRectRef = useRef<DOMRect | null>(null);
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	// --- Constants ---
	const MAX_PAN = 1500;

	// --- Refs ---
	const stateRef = useRef(state);
	const currentPointsRef = useRef<Point[]>([]);
	const isDrawingRef = useRef(false);
	// Sync isDrawingRef with React state for pass-through behavior on panels.
	// Guard avoids redundant dispatches when value is unchanged.
	const setIsDrawing = (v: boolean) => {
		if (isDrawingRef.current !== v) {
			isDrawingRef.current = v;
			dispatch({ type: 'SET_DRAWING_ACTIVE', payload: v });
		}
	};
	const drawingPointerTypeRef = useRef<string | null>(null);
	const pinchEndTimestampRef = useRef(0); // Cooldown after pinch to prevent ghost strokes
	const drawingPressureRef = useRef(0.5);

	// Type extracted to types/strataTypes.ts (GestureState)
	const gestureRef = useRef<GestureState>({
		isPinching: false,
		startDist: 0,
		startZoom: 1,
		startPan: { x: 0, y: 0 },
		startCenter: { x: 0, y: 0 },
		isOrbitTouch: false,
		orbitTouchStartAzimuth: 0,
		orbitTouchStartElevation: 0,
		orbitTouchStartPanX: 0,
		orbitTouchStartPanY: 0,
		orbitTouchStartZoom: 0,
		orbitTouchLastPos: { x: 0, y: 0 },
		// Tap-detection fields. These were missing here while GestureState had them
		// optional, so on a fresh mount `Date.now() - tapStartTime` evaluated to NaN
		// until the first two/three-finger touch. Harmless in practice — the
		// `tapTouchCount === 2` guard runs first and was also undefined — but the
		// correctness depended on a DIFFERENT field's guard, which is the kind of
		// coupling that breaks silently when someone reorders the conditions.
		tapStartTime: 0,
		tapMoved: false,
		tapTouchCount: 0
	});

	// Optimization: Cached Shapes by Z
	const shapesByZRef = useRef(new Map<number, Shape[]>());
	const sortedZsRef = useRef<number[]>([]);
	const waypointsRef = useRef<Waypoint[]>([]);

	// Optimization: Camera Ref for Animation Loop
	const cameraRef = useRef({ x: 0, y: 0, z: 0, rotation: 0 });
	// Storytelling rack-focus: tour's current (fractional) layer for DoF lock to follow. null otherwise.
	const storyFocusRef = useRef<number | null>(null);

	const paperImgRef = useRef<HTMLImageElement | null>(null);
	const risoGrainRef = useRef<HTMLCanvasElement | null>(null);
	const grungeImgRef = useRef<HTMLImageElement | null>(null); // New Grunge Overlay

	// Shared Canvas Buffers (Reused to avoid GC thrashing)
	const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const helperCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const compositionCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const tempCanvasRef = useRef<HTMLCanvasElement | null>(null); // For Ghost Preview
	const noiseCanvasRef = useRef<HTMLCanvasElement | null>(null);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);

	// Bayer Matrix + palettes moved to canvas/PixelArtProcessor.ts

	// Orbit Camera State
	const orbitRef = useRef({
		azimuth: 0,
		elevation: 0.2,
		targetAzimuth: 0,
		targetElevation: 0.2,
		panOffsetX: 0,
		panOffsetY: 0
	});

	// Move Layer State
	const moveRef = useRef<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

	// Particles State
	const particlesRef = useRef<{
		x: number, y: number, z: number, r: number, a: number,
		vx: number, vy: number, shade: number,
		rotation: number, rotationSpeed: number,
		strokeShape: {x: number, y: number}[]
	}[]>([]);

	// Double Click State for Point of Interest
	const lastClickTimeRef = useRef(0);
	// Position of the click that armed lastClickTimeRef, in canvas px. Pairs with it
	// so a double-click has to be close in space as well as in time.
	const lastClickPosRef = useRef({ x: 0, y: 0 });
	// performance.now() de cuando se fijó el POI, para el desvanecido del marcador.
	// 0 = nunca fijado. Ref y no estado: cambia una vez por doble click y solo lo lee
	// el bucle de render, así que un re-render de React no aportaría nada.
	const poiMarkerSetAtRef = useRef(0);
	// Ópticas del último frame dibujado (cámara ya cuantizada, viewZoomOffset y focal
	// length efectivos). Lo estampa renderFrame a mitad de frame; lo lee el doble click
	// de CINEMA para invertir exactamente el frame que el usuario está viendo.
	const drawnFrameRef = useRef<DrawnFrameOptics | null>(null);
	// DOUBLE_CLICK_DELAY moved to src/constants/renderConstants.ts

	// Organic Brush State
	const organicPhaseRef = useRef(0);

	// Throttle state for drawing performance
	const lastRenderTimeRef = useRef(0);

	// Frame-persistent state (was let vars inside render useEffect, migrated for renderPipeline extraction)
	const accumulatedTimeRef = useRef(0);
	const accumulatedHandheldTimeRef = useRef(0);
	const lastTimeRef = useRef(Date.now());
	const wiggleFrameRef = useRef(0);
	const shapePatternRef = useRef<CanvasPattern | null>(null);

	// Transform Tool State
	// Type extracted to canvas/renderPipeline.ts (TransformRefState)
	const transformRef = useRef<TransformRefState>({
		isActive: false, mode: 'none', startP: {x:0,y:0},
		startTransform: {x:0,y:0,scale:1,rotation:0},
		centerX: 0, centerY: 0,
		layerBB: null,
		currentTransform: {x:0,y:0,scale:1,rotation:0},
		engaged: false,
	});

	// Handheld Shake State (to sync with orbit logic)
	const lastShakeRef = useRef({ x: 0, y: 0, z: 0 });

	const transformHandlesRef = useRef<{
		tl: {x:number, y:number}, tr: {x:number, y:number},
		br: {x:number, y:number}, bl: {x:number, y:number},
		rotate: {x:number, y:number}, center: {x:number, y:number}
	} | null>(null);

	// Flip buttons overlay ref (positioned via DOM manipulation in render loop)
	const flipButtonsRef = useRef<HTMLDivElement>(null);

	// Pan & Zoom Desktop State
	const isPanningRef = useRef(false);
	const [cursorOverride, setCursorOverride] = useState<string | null>(null);

	// Space = hold to pan, tap to reset the view. Exists because a graphics tablet has
	// no middle button: without it, panning meant putting the pen down and reaching for
	// a mouse, which breaks the drawing flow. Refs, not state — only the cursor needs a
	// render, and that rides on the cursorOverride that already exists.
	const isSpaceDownRef = useRef(false);
	// Whether this Space press ever became a real pan (crossed the 3px dead zone).
	// Decides hold vs tap on release: a press that never moved is a tap → reset view.
	const spacePanEngagedRef = useRef(false);

	// Move-gizmo hover cursor. Kept separate from cursorOverride (pan/zoom) so it is
	// only ever read while tool === 'move': a value left over from a hover cannot leak
	// onto another tool. The ref mirrors the state so a pointermove that stays over the
	// same node costs one hit-test and no setState.
	const hoverGizmoModeRef = useRef<TransformMode | null>(null);
	const [gizmoCursor, setGizmoCursor] = useState<string | null>(null);

	// Last captured pointer id — lets resetGestureState release an orphaned capture
	// when the app returns from background mid-gesture (no pointerup/cancel delivered).
	const activePointerIdRef = useRef<number | null>(null);

	// A deselection the Move tool has decided but not yet committed — see the selection
	// decision table in handlePointerDown, and the release that confirms it in
	// handlePointerUp.
	const pendingDeselectRef = useRef(false);

	// --- Event Listeners & Initialization ---

	// Ensure canvas is focusable and regains focus after external interactions
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// Auto-focus canvas on mount and mode changes
		canvas.focus();
	}, [state.mode]);

	// Native touchstart, cancelled (protected: see CLAUDE.md «Comportamientos protegidos»).
	// Its preventDefault blocks Safari's compatibility mouse events and native gestures.
	// It does NOT block pointer events on iPad: the Pencil stroke starts in React's
	// onPointerDown. useAutoSave relies on the canvas cancelling touchstart (REFERENCE.md §10).
	// v3.26.69: removed the native pointerdown re-dispatch, a no-op since the baseline (H12).
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const nativeTouchStart = (e: TouchEvent) => {
			e.preventDefault();
		};

		canvas.addEventListener('touchstart', nativeTouchStart, { capture: true, passive: false });

		return () => {
			canvas.removeEventListener('touchstart', nativeTouchStart, { capture: true });
		};
	}, []);

	// Extracted to hooks/useCanvasWheelZoom.ts
	useCanvasWheelZoom({ canvasRef, state, dispatch, MAX_PAN });

	// Reset orbit pan offsets when changing cinematic type
	useEffect(() => {
		if (state.cinematicType === 'orbit') {
			orbitRef.current.panOffsetX = 0;
			orbitRef.current.panOffsetY = 0;
		}
	}, [state.cinematicType]);

	// Auto-update Gizmo Bounding Box when shapes change (only in move tool)
	useEffect(() => {
		// Skip if not in move mode
		if (state.mode !== 'drawing' || state.tool !== 'move') return;

		const activeZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
		const layerShapes = state.shapes.filter(s => s.zIndex === activeZ);
		const bb = getLayerBoundingBox(layerShapes);

		if (bb) {
			transformRef.current.layerBB = bb;
			transformRef.current.centerX = bb.cx;
			transformRef.current.centerY = bb.cy;
		} else {
			transformRef.current.layerBB = null;
		}
	}, [state.shapes, state.currentLayerIndex, state.tool, state.mode]);

	// Initialize Particles
	useEffect(() => {
		const count = PARTICLE_COUNT;
		particlesRef.current = Array.from({ length: count }).map(() => {
			const shade = Math.random();
			const points = 4 + Math.floor(shade * 3);
			const strokeShape: {x: number, y: number}[] = [];
			const seed = Math.random();
			for (let i = 0; i < points; i++) {
				const angle = (i / points) * Math.PI * 2;
				const radius = 0.5 + (Math.sin(seed * 100 + i) * 0.5 + 0.5) * 1.5;
				const x = Math.cos(angle) * radius;
				const y = Math.sin(angle) * radius * 0.4;
				strokeShape.push({x, y});
			}

			return {
				x: (Math.random() - 0.5) * 3000,
				y: (Math.random() - 0.5) * 2000,
				z: (Math.random()) * -2500,
				r: Math.random() * 7 + 2.5,
				a: Math.random() * 0.5 + 0.1,
				vx: (Math.random() - 0.5) * 0.45, // Slightly faster (was 0.35)
				vy: (Math.random() - 0.5) * 0.45, // Slightly faster (was 0.35)
				shade,
				rotation: Math.random() * Math.PI * 2,
				rotationSpeed: (Math.random() - 0.5) * 0.02, // Slightly faster rotation (was 0.015)
				strokeShape
			};
		});
	}, []);

	useEffect(() => {
		stateRef.current = state;
		if (state.mode === 'drawing') {
			cameraRef.current = { ...state.camera };
		}
	}, [state]);

	// Fit to View on Load
	useEffect(() => {
		if (state.shouldFitToView) {
			// User requested "Reset View" behavior on load (Center 0,0, Zoom 1)
			// instead of calculating bounds to fit content.
			dispatch({ type: 'RESET_DRAWING_VIEW' });
			dispatch({ type: 'COMPLETE_FIT_TO_VIEW' });
		}
	}, [state.shouldFitToView, dispatch]);

	// Cache Shapes by Z
	useEffect(() => {
		const map = new Map<number, Shape[]>();
		state.shapes.forEach(s => {
			if (!map.has(s.zIndex)) map.set(s.zIndex, []);
			map.get(s.zIndex)?.push(s);
		});
		shapesByZRef.current = map;
		sortedZsRef.current = Array.from(map.keys()).sort((a, b) => b - a);
	}, [state.shapes]);

	// Cache content centroids as camera waypoints for the 'storytelling' preset.
	// Cheap centroid = average of every non-eraser shape point per layer (no getImageData).
	// In the same pass we track the points bbox to derive radius (half the larger
	// side) — a cheap size measure the motor uses for adaptive zoom per layer.
	// Pinned (locked3D) layers are excluded as waypoints but still render fixed.
	// Order back→front by layerIndex; z lives in cinematic (×depth-multiplier) space.
	useEffect(() => {
		const acc = new Map<number, { sx: number; sy: number; n: number; minX: number; maxX: number; minY: number; maxY: number }>();
		state.shapes.forEach(s => {
			const layerIndex = Math.round(-s.zIndex / BASE_DEPTH_STEP);
			if (state.locked3DLayers.includes(layerIndex)) return;
			if (s.isEraser) return; // erasers subtract only — no visible content, must not anchor a waypoint
			let entry = acc.get(layerIndex);
			if (!entry) { entry = { sx: 0, sy: 0, n: 0, minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }; acc.set(layerIndex, entry); }
			s.points.forEach(p => {
				entry!.sx += p.x; entry!.sy += p.y; entry!.n++;
				if (p.x < entry!.minX) entry!.minX = p.x;
				if (p.x > entry!.maxX) entry!.maxX = p.x;
				if (p.y < entry!.minY) entry!.minY = p.y;
				if (p.y > entry!.maxY) entry!.maxY = p.y;
			});
		});
		const wps: Waypoint[] = [];
		acc.forEach((v, layerIndex) => {
			if (v.n === 0) return;
			wps.push({
				x: v.sx / v.n,
				y: v.sy / v.n,
				z: layerIndex * -BASE_DEPTH_STEP * CINEMATIC_DEPTH_MULTIPLIER,
				layerIndex,
				radius: Math.max(v.maxX - v.minX, v.maxY - v.minY) / 2,
			});
		});
		wps.sort((a, b) => a.layerIndex - b.layerIndex);
		waypointsRef.current = wps;
	}, [state.shapes, state.locked3DLayers]);

	// Fonts now self-hosted via @fontsource (imported in src/fonts.ts); no CDN <link> needed.

	// Load Textures
	useEffect(() => {
		const img = new Image();
		img.src = paperTexture;
		img.onload = () => { paperImgRef.current = img; };
	}, []);

	useEffect(() => {
		const generate = () => {
			const w = containerRef.current?.clientWidth || window.innerWidth;
			const h = containerRef.current?.clientHeight || window.innerHeight;
			if (w > 0 && h > 0) risoGrainRef.current = generateRisoGrain(w, h);
		};
		generate();
		const observer = new ResizeObserver(generate);
		if (containerRef.current) observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	// Load Grunge Texture
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "Anonymous";
		img.src = grungeTexture;
		img.onload = () => { grungeImgRef.current = img; };
	}, []);

	// --- Helpers ---
	const getActiveZ = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;

	// --- Export Handling ---
	useEffect(() => {
		if (!state.exportRequest) return;
		const canvas = canvasRef.current;
		if (!canvas) { dispatch({ type: 'FINISH_EXPORT' }); return; }
		const onFinish = () => dispatch({ type: 'FINISH_EXPORT' });

		if (state.exportRequest === 'png') {
			// Snapshot all inputs so HQ can re-render the scene at 2× off the live RAF.
			// (device quality ignores these and upscales the live canvas bitmap.)
			const pngOptions = {
				state: stateRef.current,
				shapesByZ: shapesByZRef.current, waypoints: waypointsRef.current,
				sortedZs: sortedZsRef.current,
				camera: { ...cameraRef.current },
				w: containerRef.current?.clientWidth ?? canvas.width,
				h: containerRef.current?.clientHeight ?? canvas.height,
				paperImg: paperImgRef.current,
				risoGrain: risoGrainRef.current,
				grungeImg: grungeImgRef.current,
				particles: particlesRef.current,
				noiseCanvas: noiseCanvasRef.current,
				shapePattern: shapePatternRef.current,
				getActiveZ,
			};
			exportAsPNG(canvas, pngOptions, state.projectName, onFinish, t);
		}
		if (state.exportRequest === 'timelapse') {
			// Same snapshot as the PNG; the video is rendered off the live loop (canvas/timelapseExport.ts, v3.25.19).
			exportAsTimelapse({
				state: stateRef.current,
				shapesByZ: shapesByZRef.current,
				sortedZs: sortedZsRef.current,
				camera: { ...cameraRef.current },
				w: containerRef.current?.clientWidth ?? canvas.width,
				h: containerRef.current?.clientHeight ?? canvas.height,
				paperImg: paperImgRef.current,
				risoGrain: risoGrainRef.current,
				grungeImg: grungeImgRef.current,
				particles: particlesRef.current,
				noiseCanvas: noiseCanvasRef.current,
				shapePattern: shapePatternRef.current,
				getActiveZ,
			}, state.projectName, onFinish, t);
		}
		if (state.exportRequest === 'svg' || state.exportRequest === 'svgz') {
			exportAsSVG(state.exportRequest, state.shapes, state.projectName, onFinish, t, state.mode);
		}
		if (state.exportRequest === 'mp4') {
			// In animation mode, record the live flipbook for the chosen loops.
			// Otherwise keep the legacy fixed-length static-scene recording.
			const animFrames = getAnimationFrames(state);
			const animationOptions = (state.isAnimationMode && animFrames.length > 0)
				? {
					dispatch,
					framerate: state.animationFramerate,
					frameCount: animFrames.length,
					firstFrameIndex: animFrames[0],
					loops: state.animationExportLoops,
				}
				: undefined;
			exportAsMP4(canvas, state.projectName, recordedChunksRef, onFinish, t, state.mode, animationOptions);
		}
		if (state.exportRequest === 'png-sequence') {
			// Snapshot all inputs so the frame-by-frame renderer is decoupled from the RAF.
			const exportOptions = {
				state: stateRef.current,
				shapesByZ: shapesByZRef.current, waypoints: waypointsRef.current,
				sortedZs: sortedZsRef.current,
				camera: { ...cameraRef.current },
				w: containerRef.current?.clientWidth ?? canvas.width,
				h: containerRef.current?.clientHeight ?? canvas.height,
				paperImg: paperImgRef.current,
				risoGrain: risoGrainRef.current,
				grungeImg: grungeImgRef.current,
				particles: particlesRef.current,
				noiseCanvas: noiseCanvasRef.current,
				shapePattern: shapePatternRef.current,
				getActiveZ,
			};
			renderAnimationFrames(exportOptions).then(frames =>
				exportAsPNGSequence(frames, state.projectName, onFinish, t, state.mode)
			);
		}
		if (state.exportRequest === 'gif') {
			// Same snapshot pattern as png-sequence; exportAsGIF uses the same infrastructure.
			const exportOptions = {
				state: stateRef.current,
				shapesByZ: shapesByZRef.current, waypoints: waypointsRef.current,
				sortedZs: sortedZsRef.current,
				camera: { ...cameraRef.current },
				w: containerRef.current?.clientWidth ?? canvas.width,
				h: containerRef.current?.clientHeight ?? canvas.height,
				paperImg: paperImgRef.current,
				risoGrain: risoGrainRef.current,
				grungeImg: grungeImgRef.current,
				particles: particlesRef.current,
				noiseCanvas: noiseCanvasRef.current,
				shapePattern: shapePatternRef.current,
				getActiveZ,
			};
			renderAnimationFrames(exportOptions).then(frames =>
				exportAsGIF(frames, {
					framerate: state.animationFramerate,
					scale: state.gifExportScale,
					projectName: state.projectName,
					playbackMode: state.animationPlaybackMode,
					mode: state.mode,
				}, onFinish, t)
			);
		}
	}, [state.exportRequest, dispatch, state.shapes, state.projectName, t]);

	// Thumbnail of the .dior (v3.21.0): the save reads the same snapshot inputs as the PNG export, on demand.
	useEffect(() => registerThumbnailSource(() => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		return {
			state: stateRef.current,
			shapesByZ: shapesByZRef.current, waypoints: waypointsRef.current,
			sortedZs: sortedZsRef.current,
			camera: { ...cameraRef.current },
			w: containerRef.current?.clientWidth ?? canvas.width,
			h: containerRef.current?.clientHeight ?? canvas.height,
			paperImg: paperImgRef.current,
			risoGrain: risoGrainRef.current,
			grungeImg: grungeImgRef.current,
			particles: particlesRef.current,
			noiseCanvas: noiseCanvasRef.current,
			shapePattern: shapePatternRef.current,
			getActiveZ,
		};
	}), []);

	// --- Event Handlers ---
	// What the handlers below close over (canvas/handlerEnv.ts): built once per render, right where the
	// handlers used to be written. Their bodies moved out as they were; the refs stay declared above.
	const handlerEnv: CanvasHandlerEnv = {
		state, dispatch, canvasRef, canvasRectRef,
		currentPointsRef, isDrawingRef, drawingPointerTypeRef, drawingPressureRef, organicPhaseRef, activePointerIdRef,
		gestureRef, pinchEndTimestampRef, isPanningRef, isSpaceDownRef, spacePanEngagedRef,
		orbitRef, lastClickTimeRef, lastClickPosRef, drawnFrameRef,
		moveRef, transformRef, transformHandlesRef, hoverGizmoModeRef, pendingDeselectRef,
		setIsDrawing, setCursorOverride, setGizmoCursor, getActiveZ, MAX_PAN,
	};

	// Extracted to canvas/touchHandlers.ts
	const { handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel } = createTouchHandlers(handlerEnv);

	// Extracted to canvas/pointerDownHandler.ts
	const handlePointerDown = createPointerDownHandler(handlerEnv);

	// Extracted to canvas/pointerMoveUpHandlers.ts
	const { handlePointerMove, handlePointerUp } = createPointerMoveUpHandlers(handlerEnv);

	// Clears every gesture flag that can be left orphaned when the app is backgrounded
	// mid-gesture (iOS may not deliver pointerup/cancel/touchend). Called by
	// useCanvasRecovery on foreground return and by the canvas onPointerCancel.
	const resetGestureState = useCallback(() => {
		// Release any orphaned pointer capture (same try/catch shape as handlePointerUp).
		const canvas = canvasRef.current;
		const pid = activePointerIdRef.current;
		if (canvas && pid !== null) {
			try { if (canvas.hasPointerCapture(pid)) canvas.releasePointerCapture(pid); } catch (err) {}
		}
		activePointerIdRef.current = null;

		// Gesture flags. isPinching is the one that blocks both drawing (handlePointerDown)
		// and stroke processing (handlePointerMove) while it stays true.
		gestureRef.current.isPinching = false;
		gestureRef.current.isOrbitTouch = false;
		pinchEndTimestampRef.current = Date.now();

		// Pan + in-progress stroke. The stroke is discarded (no dispatch) — an interrupted
		// gesture is not a committed shape.
		isPanningRef.current = false;
		setCursorOverride(null);
		currentPointsRef.current = [];
		drawingPointerTypeRef.current = null;

		// In-progress gizmo drag. Same reasoning as the stroke above: no dispatch, so the
		// shapes are never touched — but unlike the stroke, an abandoned drag also leaves
		// isActive=true with a live currentTransform, which the render loop keeps painting
		// as a deformed preview with nothing pending underneath it. A cancel/background
		// gesture on iPad (palm rejection, app backgrounding mid-drag) hits exactly this
		// path with no pointerup to clear it otherwise — it previously sat wrong until the
		// next pointerdown on the canvas overwrote the whole ref.
		transformRef.current.isActive = false;
		transformRef.current.mode = 'none';
		// The dead zone's hysteresis is per-gesture state, so it has to die with the
		// gesture. Left at true it survives into the NEXT drag, which then skips its
		// 3px threshold from the very first pixel — the cancelled gesture silently
		// disarms the guard for the one after it.
		transformRef.current.engaged = false;
		// An interrupted gesture must not deselect once it is over.
		pendingDeselectRef.current = false;

		if (isDrawingRef.current) {
			isDrawingRef.current = false;
			dispatch({ type: 'SET_DRAWING_ACTIVE', payload: false });
		}
	}, [dispatch]);

	// Recover orphaned gesture state when the app returns to the foreground.
	useCanvasRecovery(resetGestureState);

	// Stamps when the framing point was set, so the marker knows when to fade
	// (canvas/drawPoiMarker.ts). Keyed on the POI object identity: the reducer builds a
	// new one on every SET_POINT_OF_INTEREST, so re-framing the same spot twice still
	// re-arms the marker. Clearing the POI stamps 0 — nothing to point at, nothing drawn.
	useEffect(() => {
		poiMarkerSetAtRef.current = state.pointOfInterest ? performance.now() : 0;
	}, [state.pointOfInterest]);

	// Escape cancels an in-flight gizmo drag: isActive=false, no dispatch — the shapes
	// were never touched (TRANSFORM_LAYER only fires on pointerup), so this discards the
	// live preview exactly like the pointercancel path above, just from the keyboard.
	// Scoped tightly to "a drag is active" so it can never intercept Escape meant for a
	// modal or the text session (those own their own handlers and are not reachable
	// while a gizmo drag holds pointer capture on the canvas).
	//
	// KEYBOARD-ONLY: this does nothing for the touch/pen gesture that provoked writing
	// isDragEngaged in the first place — a tablet user with no physical keyboard has no
	// way to reach Escape. The tablet-side equivalent isn't a cancel gesture; it's that
	// v3.17.4's dead-zone already keeps an accidental touch from ever engaging the drag,
	// so there is usually nothing here left to cancel. A deliberate touch-drag the user
	// wants to abort mid-gesture is not covered by either fix — not addressed here.
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;
			if (state.tool !== 'move' || !transformRef.current.isActive) return;
			transformRef.current.isActive = false;
			transformRef.current.mode = 'none';
		};
		window.addEventListener('keydown', handleEscape);
		return () => window.removeEventListener('keydown', handleEscape);
	}, [state.tool]);

	// Extracted to hooks/useSpacePan.ts
	useSpacePan({ state, dispatch, isDrawingRef, isPanningRef, isSpaceDownRef, spacePanEngagedRef, setCursorOverride });

	// --- Render Loop ---
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) return;

		// Context Loss Detection Instrumentation
		let contextLossCount = 0;
		let lastContextLossTime = 0;

		const handleContextLost = (e: Event) => {
			e.preventDefault(); // Attempt to restore context
			contextLossCount++;
			lastContextLossTime = Date.now();
			console.warn(`[Diorame] Canvas 2D context lost (count: ${contextLossCount}) at ${new Date(lastContextLossTime).toISOString()}`);
			toast.error('Canvas context lost', {
				description: 'Attempting to restore rendering...',
				duration: 2000,
			});
		};

		// Idle-skip (v3.25.10, canvas/idleGuard.ts): DRAW repaints only when something changed in the last ~500 ms.
		const idle = createIdleGuard();

		const handleContextRestored = () => {
			idle.markDirty();
			console.warn(`[Diorame] Canvas 2D context restored at ${new Date().toISOString()}`);
			toast.success('Canvas context restored', {
				duration: 2000,
			});
		};

		canvas.addEventListener('contextlost', handleContextLost);
		canvas.addEventListener('contextrestored', handleContextRestored);

		let animationFrameId: number;

		// Render loop — body extracted to canvas/renderPipeline.ts (v3.0.0)
		const buildRenderContext = (): RenderContext => ({
			state: stateRef.current,
			isDrawing: isDrawingRef.current,
			currentPoints: currentPointsRef.current,
			shapesByZ: shapesByZRef.current, waypoints: waypointsRef.current,
			sortedZs: sortedZsRef.current,
			transformState: transformRef.current,
			cameraRef,
			storyFocusRef,
			lastShakeRef,
			transformHandlesRef,
			poiMarkerSetAtRef,
			drawnFrameRef,
			lastRenderTimeRef,
			orbitRef,
			accumulatedTimeRef,
			accumulatedHandheldTimeRef,
			lastTimeRef,
			wiggleFrameRef,
			shapePatternRef,
			offscreenCanvasRef,
			helperCanvasRef,
			compositionCanvasRef,
			pixelCanvasRef,
			tempCanvasRef,
			noiseCanvasRef,
			paperImg: paperImgRef.current,
			risoGrain: risoGrainRef.current,
			grungeImg: grungeImgRef.current,
			particles: particlesRef.current,
			flipButtonsEl: flipButtonsRef.current,
			w: containerRef.current?.clientWidth ?? 0,
			h: containerRef.current?.clientHeight ?? 0,
			getActiveZ,
		});

		const render = () => {
			try {
				const rc = buildRenderContext();
				if (idle.shouldRender(rc)) {
					renderStats.count++;
					renderFrame(ctx, rc);
				}
			} catch (e) {
				console.error('Render loop error', e);
			}
			animationFrameId = requestAnimationFrame(render);
		};

		animationFrameId = requestAnimationFrame(render);
		return () => {
			cancelAnimationFrame(animationFrameId);
			idle.dispose();
			canvas.removeEventListener('contextlost', handleContextLost);
			canvas.removeEventListener('contextrestored', handleContextRestored);
		};
	}, [dispatch]);

	const handleFlip = (direction: 'horizontal' | 'vertical') => {
		if (state.hiddenLayers.includes(state.currentLayerIndex)) return;
		const bb = transformRef.current.layerBB;
		if (!bb) return;
		const cx = (bb.minX + bb.maxX) / 2;
		const cy = (bb.minY + bb.maxY) / 2;
		dispatch({
			type: 'FLIP_LAYER',
			payload: {
				layerIndex: state.currentLayerIndex,
				direction,
				centerX: cx,
				centerY: cy
			}
		});
	};

	const handleCenterLayer = () => {
		if (state.hiddenLayers.includes(state.currentLayerIndex)) return;
		const bb = transformRef.current.layerBB;
		if (!bb) return;
		// Center = canvas home origin (0,0), where Reset View centers. Pure translation
		// of the layer's bounding-box center to world origin.
		const cx = (bb.minX + bb.maxX) / 2;
		const cy = (bb.minY + bb.maxY) / 2;
		dispatch({
			type: 'MOVE_LAYER',
			payload: { layerIndex: state.currentLayerIndex, deltaX: -cx, deltaY: -cy }
		});
	};

	return (
		<div ref={containerRef} className={cn("absolute inset-0 z-0 overflow-hidden touch-none", state.mode === 'drawing' ? (cursorOverride ? cursorOverride : (state.tool === 'move' ? (gizmoCursor || "cursor-move") : "cursor-crosshair")) : "cursor-default")} style={{ touchAction: 'none' }}>
			<canvas ref={canvasRef} data-drawing-canvas tabIndex={0} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onPointerCancel={resetGestureState} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel} className="block w-full h-full" style={{ touchAction: 'none', outline: 'none' }} />
			{/* Flip buttons overlay - positioned via render loop */}
			<div
				ref={flipButtonsRef}
				className="absolute top-0 left-0 flex gap-1 z-10"
				style={{ opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s ease' }}
			>
				<button
					onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
					onClick={(e) => { e.stopPropagation(); handleFlip('horizontal'); }}
					className="flex items-center justify-center w-7 h-7 rounded-md bg-white/90 border border-slate-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-colors backdrop-blur-sm"
					title={t('viewport.flipHorizontal')}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(26, 26, 26)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
						<path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
						<path d="M12 20v2" />
						<path d="M12 14v2" />
						<path d="M12 8v2" />
						<path d="M12 2v2" />
					</svg>
				</button>
				<button
					onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
					onClick={(e) => { e.stopPropagation(); handleFlip('vertical'); }}
					className="flex items-center justify-center w-7 h-7 rounded-md bg-white/90 border border-slate-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-colors backdrop-blur-sm"
					title={t('viewport.flipVertical')}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(26, 26, 26)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
						<path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
						<path d="M20 12h2" />
						<path d="M14 12h2" />
						<path d="M8 12h2" />
						<path d="M2 12h2" />
					</svg>
				</button>
				<button
					onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
					onClick={(e) => { e.stopPropagation(); handleCenterLayer(); }}
					className="flex items-center justify-center w-7 h-7 rounded-md bg-white/90 border border-slate-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100 transition-colors backdrop-blur-sm"
					title={t('viewport.centerLayer')}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(26, 26, 26)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="12" cy="12" r="3" />
						<path d="M12 2v4" />
						<path d="M12 18v4" />
						<path d="M2 12h4" />
						<path d="M18 12h4" />
					</svg>
				</button>
			</div>
			<OnboardingOverlay />
		</div>
	);
};

// --- Helpers --- (color utilities moved to src/utils/colorUtils.ts)

// _createFadeGrain_REMOVED — dead code eliminated (was ~20 lines)

// canvas utilities moved to src/utils/canvasUtils.ts

