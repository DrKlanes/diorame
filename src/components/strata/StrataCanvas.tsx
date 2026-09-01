import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { useCanvasRecovery } from '../../hooks/useCanvasRecovery';
import { generateStrokeForMode } from '../../utils/strokeGenerators';
import { Shape, Point, Waypoint, GestureState, CanvasPointerInput } from '../../types/strataTypes';
import paperTexture from "figma:asset/texture-paper.png";
import grungeTexture from "figma:asset/texture-grunge.png";
import { cn } from '../ui/utils';
import { toast } from 'sonner@2.0.3';
import { OnboardingOverlayConnected as OnboardingOverlay } from './OnboardingOverlayConnected';
import { generateRisoGrain } from './canvas/postProcessing';
import { PARTICLE_COUNT, MIN_TOUCH_STROKE_POINTS, DOUBLE_CLICK_DELAY, DOUBLE_CLICK_MAX_DISTANCE } from '../../constants/renderConstants';
import { exportAsPNG, exportAsSVG, exportAsMP4 } from './canvas/exportHandlers';
import { analytics } from '../../analytics/analytics';
import { renderAnimationFrames } from './canvas/animationExportRender';
import { exportAsPNGSequence } from './canvas/pngSequenceHandler';
import { exportAsGIF } from './canvas/gifHandler';
import { useTranslation } from '../../i18n';
import { getLayerBoundingBox } from './canvas/transformUtils';
import { hitTestGizmo, isPointInsideGizmoBox, computeMoveTransform, isSignificantTransform, isDragEngaged, type TransformMode } from './canvas/moveGizmoInteraction';
import { cursorClassForGizmoMode } from './canvas/gizmoCursor';
import { shouldIgnoreGlobalKey } from '../../utils/keyboardShortcuts';
import { getAnimationFrames, isLayerEmpty } from '../../utils/animationFrames';
import { unprojectCinematicPoint, referencePlaneZ } from './canvas/unprojectPoint';
import { pickLayerAtPoint } from './canvas/pickLayerAtPoint';
import { renderFrame, type RenderContext, type TransformRefState, type DrawnFrameOptics } from './canvas/renderPipeline';
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

  // --- Event Listeners & Initialization ---

  // Ensure canvas is focusable and regains focus after external interactions
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Auto-focus canvas on mount and mode changes
      canvas.focus();
  }, [state.mode]);

  // iOS Palm Rejection Fix: Native listeners intercept Apple Pencil events
  // to prevent iOS from canceling them due to palm contact detection
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const nativePointerDown = (e: PointerEvent) => {
          // For Apple Pencil on iOS: manually trigger the React handler
          // because preventDefault on touchstart blocks pointer events
          if (e.pointerType === 'pen') {
              // Create a synthetic React event
              const syntheticEvent = {
                  ...e,
                  currentTarget: canvas,
                  preventDefault: () => e.preventDefault(),
                  stopPropagation: () => e.stopPropagation(),
                  nativeEvent: e
              } as CanvasPointerInput;
              
              handlePointerDown(syntheticEvent);
          }
      };
      
      const nativeTouchStart = (e: TouchEvent) => {
          // Prevent iOS palm rejection from cancelling pencil events
          // This will block the pointer event, but we handle it manually above
          e.preventDefault();
      };

      canvas.addEventListener('pointerdown', nativePointerDown, { capture: true });
      canvas.addEventListener('touchstart', nativeTouchStart, { capture: true, passive: false });
      
      return () => {
          canvas.removeEventListener('pointerdown', nativePointerDown);
          canvas.removeEventListener('touchstart', nativeTouchStart);
      };
  }, []);

  // Wheel Listener for Zoom
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onWheel = (e: WheelEvent) => {
          // Support wheel zoom in both Drawing mode and Orbit (Free View) mode
          if (state.mode !== 'drawing' && !(state.mode === 'cinematic' && state.cinematicType === 'orbit')) return;
          e.preventDefault();
          
          // Handle Orbit (Free View) mode zoom differently
          if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
              const zoomStep = e.deltaY > 0 ? 100 : -100; // Move camera closer/farther
              const newOffset = Math.min(Math.max(state.viewZoomOffset + zoomStep, -5000), 2000);
              dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: newOffset });
              return;
          }
          
          // Drawing mode zoom
          const rect = canvas.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          
          const screenX = e.clientX - rect.left - cx;
          const screenY = e.clientY - rect.top - cy;

          const currentZoom = state.drawingZoom || 1;
          const currentPan = state.drawingPan || { x: 0, y: 0 };
          
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          let newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.5), 3.0); // Allow zoom out to 0.5x 

          let newPanX = screenX - ((screenX - currentPan.x) / currentZoom) * newZoom;
          let newPanY = screenY - ((screenY - currentPan.y) / currentZoom) * newZoom;
          
          newPanX = Math.max(-MAX_PAN, Math.min(MAX_PAN, newPanX));
          newPanY = Math.max(-MAX_PAN, Math.min(MAX_PAN, newPanY));

          dispatch({ 
              type: 'SET_DRAWING_ZOOM', 
              payload: { zoom: newZoom, pan: { x: newPanX, y: newPanY } } 
          });
      };

      canvas.addEventListener('wheel', onWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', onWheel);
  }, [state.mode, state.cinematicType, state.drawingZoom, state.drawingPan, state.viewZoomOffset, dispatch]);

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
      if (state.exportRequest === 'svg' || state.exportRequest === 'svgz') {
          exportAsSVG(state.exportRequest, state.shapes, state.projectName, onFinish, t);
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
          exportAsMP4(canvas, state.projectName, recordedChunksRef, onFinish, t, animationOptions);
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
              exportAsPNGSequence(frames, state.projectName, onFinish, t)
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
              }, onFinish, t)
          );
      }
  }, [state.exportRequest, dispatch, state.shapes, state.projectName, t]);

  // --- Event Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
      if (state.textSession.isActive) return;
      // Support both drawing mode and orbit (free view) mode
      if (state.mode === 'drawing') {
          // Protect Pen Drawing: If we are already drawing with a pen, ignore touch gestures (palm rejection)
          if (isDrawingRef.current && drawingPointerTypeRef.current === 'pen') return;

          if (e.touches.length === 2) {
              setIsDrawing(false);
              currentPointsRef.current = [];
              // A second finger turns this into a multi-touch gesture, so the
              // single-pointer gizmo drag is ABANDONED — never committed. Same contract
              // as pointercancel and as Escape: TRANSFORM_LAYER only fires on pointerup,
              // so the shapes were never touched and there is nothing to undo.
              // Without this the drag is orphaned: setIsDrawing(false) above makes
              // handlePointerUp bail at its isDrawingRef guard, which is the very line
              // that would have cleared isActive.
              transformRef.current.isActive = false;
              transformRef.current.mode = 'none';
              transformRef.current.engaged = false;
              const t1 = e.touches[0];
              const t2 = e.touches[1];
              const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
              drawingPointerTypeRef.current = null; // Clear to prevent orphan touch strokes
              const cx = (t1.clientX + t2.clientX) / 2;
              const cy = (t1.clientY + t2.clientY) / 2;
              gestureRef.current = {
                  ...gestureRef.current,
                  startDist: dist,
                  startZoom: state.drawingZoom || 1,
                  startPan: { ...state.drawingPan },
                  startCenter: { x: cx, y: cy },
                  tapStartTime: Date.now(),
                  tapMoved: false,
                  tapTouchCount: 2,
              };
          } else if (e.touches.length === 3) {
              setIsDrawing(false);
              currentPointsRef.current = [];
              drawingPointerTypeRef.current = null;
              // Same abandonment as the 2-touch branch above.
              transformRef.current.isActive = false;
              transformRef.current.mode = 'none';
              transformRef.current.engaged = false;
              const t1 = e.touches[0];
              const t2 = e.touches[1];
              const t3 = e.touches[2];
              const cx = (t1.clientX + t2.clientX + t3.clientX) / 3;
              const cy = (t1.clientY + t2.clientY + t3.clientY) / 3;
              gestureRef.current = {
                  ...gestureRef.current,
                  startCenter: { x: cx, y: cy },
                  tapStartTime: Date.now(),
                  tapMoved: false,
                  tapTouchCount: 3,
              };
          }
      } else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
          // Orbit mode touch gestures
          if (e.touches.length === 1) {
              // Single touch: Pan
              const t = e.touches[0];
              gestureRef.current = {
                  ...gestureRef.current,
                  isOrbitTouch: true,
                  orbitTouchStartPanX: orbitRef.current.panOffsetX,
                  orbitTouchStartPanY: orbitRef.current.panOffsetY,
                  orbitTouchStartAzimuth: orbitRef.current.targetAzimuth,
                  orbitTouchStartElevation: orbitRef.current.targetElevation,
                  orbitTouchStartZoom: state.viewZoomOffset,
                  orbitTouchLastPos: { x: t.clientX, y: t.clientY }
              };
          } else if (e.touches.length === 2) {
              // Two touches: Orbit rotation or pinch zoom
              const t1 = e.touches[0];
              const t2 = e.touches[1];
              const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
              const cx = (t1.clientX + t2.clientX) / 2;
              const cy = (t1.clientY + t2.clientY) / 2;
              
              gestureRef.current = {
                  ...gestureRef.current,
                  isOrbitTouch: true,
                  isPinching: true,
                  startDist: dist,
                  orbitTouchStartAzimuth: orbitRef.current.targetAzimuth,
                  orbitTouchStartElevation: orbitRef.current.targetElevation,
                  orbitTouchStartZoom: state.viewZoomOffset,
                  orbitTouchLastPos: { x: cx, y: cy },
                  startCenter: { x: cx, y: cy }
              };
          }
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (state.mode === 'drawing') {
          if (e.touches.length === 2) {
              if (!gestureRef.current.tapMoved) {
                  const t1 = e.touches[0];
                  const t2 = e.touches[1];
                  const cx = (t1.clientX + t2.clientX) / 2;
                  const cy = (t1.clientY + t2.clientY) / 2;
                  if (Math.hypot(cx - gestureRef.current.startCenter.x, cy - gestureRef.current.startCenter.y) > 10) {
                      gestureRef.current.tapMoved = true;
                      if (gestureRef.current.startDist >= 5) {
                          gestureRef.current.isPinching = true;
                      }
                  }
              }
              if (gestureRef.current.isPinching) {
                  e.preventDefault();
                  const t1 = e.touches[0];
                  const t2 = e.touches[1];
                  const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
                  const cx = (t1.clientX + t2.clientX) / 2;
                  const cy = (t1.clientY + t2.clientY) / 2;
                  
                  const startDist = gestureRef.current.startDist || 1;
                  const scaleChange = dist / startDist;
                  if (!Number.isFinite(scaleChange)) return;

                  let newZoom = Math.min(Math.max(gestureRef.current.startZoom * scaleChange, 0.5), 3.0); // Allow zoom out to 0.5x
                  
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  const centerX = rect.width / 2;
                  const centerY = rect.height / 2;
                  const startScreenX = gestureRef.current.startCenter.x - rect.left - centerX;
                  const startScreenY = gestureRef.current.startCenter.y - rect.top - centerY;
                  const currScreenX = cx - rect.left - centerX;
                  const currScreenY = cy - rect.top - centerY;
                  
                  const worldX = (startScreenX - gestureRef.current.startPan.x) / gestureRef.current.startZoom;
                  const worldY = (startScreenY - gestureRef.current.startPan.y) / gestureRef.current.startZoom;
                  
                  let newPanX = currScreenX - (worldX * newZoom);
                  let newPanY = currScreenY - (worldY * newZoom);
                  
                  newPanX = Math.max(-MAX_PAN, Math.min(MAX_PAN, newPanX));
                  newPanY = Math.max(-MAX_PAN, Math.min(MAX_PAN, newPanY));

                  dispatch({ 
                      type: 'SET_DRAWING_ZOOM', 
                      payload: { zoom: newZoom, pan: { x: newPanX, y: newPanY } } 
                  });
              }
          } else if (e.touches.length === 3 && !gestureRef.current.tapMoved) {
              const t1 = e.touches[0];
              const t2 = e.touches[1];
              const t3 = e.touches[2];
              const cx = (t1.clientX + t2.clientX + t3.clientX) / 3;
              const cy = (t1.clientY + t2.clientY + t3.clientY) / 3;
              if (Math.hypot(cx - gestureRef.current.startCenter.x, cy - gestureRef.current.startCenter.y) > 10) {
                  gestureRef.current.tapMoved = true;
              }
          }
      } else if (state.mode === 'cinematic' && state.cinematicType === 'orbit' && gestureRef.current.isOrbitTouch) {
          e.preventDefault();
          
          if (e.touches.length === 1) {
              // Single touch: Pan camera
              const t = e.touches[0];
              const dx = t.clientX - gestureRef.current.orbitTouchLastPos.x;
              const dy = t.clientY - gestureRef.current.orbitTouchLastPos.y;
              
              const panSensitivity = 2.0;
              orbitRef.current.panOffsetX = gestureRef.current.orbitTouchStartPanX - dx * panSensitivity;
              orbitRef.current.panOffsetY = gestureRef.current.orbitTouchStartPanY - dy * panSensitivity;
              
          } else if (e.touches.length === 2) {
              // Two touches: Calculate both orbit rotation and pinch zoom
              const t1 = e.touches[0];
              const t2 = e.touches[1];
              const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
              const cx = (t1.clientX + t2.clientX) / 2;
              const cy = (t1.clientY + t2.clientY) / 2;
              
              // Orbit rotation (using center movement)
              const dx = cx - gestureRef.current.orbitTouchLastPos.x;
              const dy = cy - gestureRef.current.orbitTouchLastPos.y;
              
              const orbitSensitivity = 0.005;
              orbitRef.current.targetAzimuth = gestureRef.current.orbitTouchStartAzimuth - dx * orbitSensitivity;
              orbitRef.current.targetElevation = Math.max(-1.5, Math.min(1.5, 
                  gestureRef.current.orbitTouchStartElevation + dy * orbitSensitivity
              ));
              
              // Pinch zoom
              if (gestureRef.current.isPinching && gestureRef.current.startDist > 0) {
                  const scaleChange = dist / gestureRef.current.startDist;
                  // Invert zoom direction: pinch out = zoom in (negative offset)
                  const zoomRange = 7000; // Total zoom range
                  const zoomDelta = (1 - scaleChange) * zoomRange;
                  const newOffset = Math.min(Math.max(
                      gestureRef.current.orbitTouchStartZoom + zoomDelta, 
                      -5000
                  ), 2000);
                  dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: newOffset });
              }
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (state.mode === 'drawing') {
          if (e.touches.length === 0) {
              const { tapMoved, tapStartTime, tapTouchCount } = gestureRef.current;
              if (!tapMoved && !state.textSession.isActive) {
                  const elapsed = Date.now() - tapStartTime;
                  if (tapTouchCount === 2 && elapsed < 300) {
                      gestureRef.current.tapStartTime = 0;
                      gestureRef.current.tapMoved = false;
                      gestureRef.current.tapTouchCount = 0;
                      gestureRef.current.isPinching = false;
                      dispatch({ type: 'UNDO' });
                      return;
                  }
                  if (tapTouchCount === 3 && elapsed < 250) {
                      gestureRef.current.tapStartTime = 0;
                      gestureRef.current.tapMoved = false;
                      gestureRef.current.tapTouchCount = 0;
                      gestureRef.current.isPinching = false;
                      dispatch({ type: 'REDO' });
                      return;
                  }
              }
              gestureRef.current.tapStartTime = 0;
              gestureRef.current.tapMoved = false;
              gestureRef.current.tapTouchCount = 0;
          }
          // Pinch end cooldown: only fires if isPinching was activated (real movement, not a tap)
          if (gestureRef.current.isPinching && e.touches.length < 2) {
              pinchEndTimestampRef.current = Date.now(); // cooldown to prevent ghost strokes
              gestureRef.current.isPinching = false;
          }
      } else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
          if (e.touches.length === 0) {
              gestureRef.current.isOrbitTouch = false;
              gestureRef.current.isPinching = false;
          } else if (e.touches.length === 1 && gestureRef.current.isPinching) {
              // Transition from 2-finger to 1-finger: switch from orbit to pan
              gestureRef.current.isPinching = false;
              const t = e.touches[0];
              gestureRef.current.orbitTouchStartPanX = orbitRef.current.panOffsetX;
              gestureRef.current.orbitTouchStartPanY = orbitRef.current.panOffsetY;
              gestureRef.current.orbitTouchLastPos = { x: t.clientX, y: t.clientY };
          }
      }
  };
  
  const handleTouchCancel = (e: React.TouchEvent) => {
       pinchEndTimestampRef.current = Date.now(); 
      gestureRef.current.isPinching = false; 
      gestureRef.current.isOrbitTouch = false;
      gestureRef.current.tapStartTime = 0;
      gestureRef.current.tapMoved = false;
      gestureRef.current.tapTouchCount = 0;
  };

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
    
    // Calculate World Coordinates
    const screenX = e.clientX - rect.left - cx; // Centered (for World Calc)
    const screenY = e.clientY - rect.top - cy;
    const pointerX = e.clientX - rect.left; // Top-Left (for Gizmo Hit Test)
    const pointerY = e.clientY - rect.top;

    const currentZoom = state.mode === 'drawing' ? state.drawingZoom : 1;
    const currentPan = state.mode === 'drawing' ? state.drawingPan : { x: 0, y: 0 };
    const drawX = (screenX - currentPan.x) / currentZoom;
    const drawY = (screenY - currentPan.y) / currentZoom;
    
    const activeZ = getActiveZ(state.currentLayerIndex);
    const FL = state.focalLength;
    const camZ = state.camera.z;
    const dz = activeZ - camZ;
    const scale = FL / (FL + dz); 
    const worldX = drawX / scale;
    const worldY = drawY / scale;

    if (state.mode === 'cinematic') {
        const now = Date.now();
        // Both tests, not just the clock: two taps far apart are two taps, however
        // quickly they follow each other.
        const nearLast = Math.hypot(
            pointerX - lastClickPosRef.current.x,
            pointerY - lastClickPosRef.current.y,
        ) <= DOUBLE_CLICK_MAX_DISTANCE;
        if (now - lastClickTimeRef.current < DOUBLE_CLICK_DELAY && nearLast) {
            // Framing, not focus: where the camera aims in X/Y. Nothing to do with the
            // DoF's Z. Uses the real inverse projection (canvas/unprojectPoint.ts)
            // instead of the DRAW-mode maths computed above — worldX/worldY are wrong
            // here, they assume a different camera. See that module's header.
            //
            // PICKING PER LAYER (v3.17.23): un-project the touched pixel onto EVERY
            // candidate layer and ask which one has content there. A fixed reference
            // plane could not do this — the same pixel on the mid-plane is a different
            // world position than on layer 10, so touching a nose framed a point on the
            // same line of sight but at the wrong depth. Deterministic and still useless.
            // Las ópticas del frame que el usuario ESTÁ VIENDO, no las de AppState.
            // state.camera se congela al entrar en CINEMA —ControlsV2 la fija en
            // {0,0,500} y nadie la vuelve a escribir, mientras el tick mueve cameraRef
            // cada frame—, state.focalLength no conoce el barrido del preset 'zoom', y
            // ninguno de los dos sabe de la cuantización de pixel art. Invertir con
            // esos valores es invertir un frame que no existe.
            // Sin frame dibujado todavía (primer pointerdown antes del primer RAF) se
            // cae a AppState, que es lo mejor disponible en ese instante.
            const optics = drawnFrameRef.current;
            const frameCamera = optics ? optics.camera : state.camera;
            const frameFocalLength = optics ? optics.focalLength : state.focalLength;
            const frameViewZoomOffset = optics ? optics.viewZoomOffset : state.viewZoomOffset;

            const fxOn = state.fxMasterEnabled && state.postProcessingEnabled.distortion;
            const fxDistortion = fxOn ? state.postProcessing.distortion : 0;
            // Mirrors renderPipeline's distortionK. Kept in step by hand rather than
            // shared, to avoid reaching into the render pipeline for a scalar — if that
            // formula ever moves, this is the other place that reads it. A lens that
            // bends the image has to bend the un-projection too.
            const distortionK = Math.abs(fxDistortion) > 0.01
                ? (fxDistortion * -0.8) * (500 / frameFocalLength)
                : 0;
            // Deshacer el pivote de arc/orbit ANTES de invertir. transformPoint desplaza
            // cada punto por (cámara ideal − POI)·arcPivotScale en esos dos presets, así
            // que el píxel tocado viene corrido en esa misma cantidad.
            // El POI que usa el pivote es el ANTERIOR —el que ya estaba en state cuando
            // se dibujó el frame—, no el que se está calculando: no hay dependencia
            // circular y basta una resta, sin iterar. La sacudida (handheld) va incluida
            // en la cámara, y transformPoint se la resta para recuperar la ideal, así que
            // aquí se hace igual.
            let pivotDX = 0, pivotDY = 0;
            if (optics && optics.isArcOrOrbit) {
                const idealCamX = optics.camera.x - optics.shake.x;
                const idealCamY = optics.camera.y - optics.shake.y;
                pivotDX = (idealCamX - optics.pivotPoiX) * optics.arcPivotScale;
                if (optics.cinematicType === 'orbit') {
                    pivotDY = (idealCamY - optics.pivotPoiY) * optics.arcPivotScale;
                }
            }
            const unprojectOn = (referenceZ: number) => unprojectCinematicPoint({
                screenX: pointerX - pivotDX, screenY: pointerY - pivotDY,
                centerXScreen: cx, centerYScreen: cy,
                camera: frameCamera,
                focalLength: frameFocalLength,
                viewZoomOffset: frameViewZoomOffset,
                layerSpacingFactor: state.layerSpacingFactor,
                referenceZ,
                viewZoom: 1,
                viewPan: { x: 0, y: 0 },
                distortionK,
            });

            // Candidates, front to back by REAL distance to the camera. Not by layer
            // index: with the camera moving in z and layerSpacingFactor variable, index
            // order and depth order are not the same. Empty layers (nothing to hit) and
            // hidden ones (cannot point at what you cannot see) are dropped first.
            const effCamZ = frameCamera.z + frameViewZoomOffset;
            const candidates: number[] = [];
            for (let i = 0; i < state.totalLayers; i++) {
                if (state.hiddenLayers.includes(i)) continue;
                if (isLayerEmpty(state, i)) continue;
                candidates.push(i);
            }
            const dzOf = (i: number) =>
                (i * -BASE_DEPTH_STEP) * state.layerSpacingFactor * CINEMATIC_DEPTH_MULTIPLIER - effCamZ;
            candidates.sort((a, b) => dzOf(a) - dzOf(b));

            const activeLayerZ = (i: number) => i * -BASE_DEPTH_STEP;
            const hit = pickLayerAtPoint(
                candidates,
                (i) => state.shapes.filter(sh => sh.zIndex === activeLayerZ(i)),
                (i) => unprojectOn(activeLayerZ(i)),
                BASE_DEPTH_STEP,
            );

            // Nothing under the pointer → the mid-plane of the layers with content.
            // It stops being the main answer and becomes the fallback, which is where it
            // always belonged: the honest reply when there is nothing to point at.
            let framed: { x: number; y: number } | null = null;
            let framedZ = 0;
            if (hit) {
                framed = { x: hit.x, y: hit.y };
                framedZ = hit.z;
            } else {
                framedZ = referencePlaneZ(state.totalLayers, (i) => !isLayerEmpty(state, i), BASE_DEPTH_STEP);
                framed = unprojectOn(framedZ);
            }
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
            if (handles) {
                const insideBox = isPointInsideGizmoBox(pointerX, pointerY, handles);
                // Handles only count when the gizmo is actually VISIBLE. Deselected,
                // drawGizmo still computes them (that is what makes the containment
                // test possible) but draws nothing — and an invisible handle must not
                // be grabbable, least of all the rotate one sitting ~120px above a box
                // the user cannot see.
                const grabbedHandle = wasSelected
                    && hitTestGizmo(pointerX, pointerY, handles) !== 'move';

                if (wasSelected) {
                    if (!grabbedHandle && !insideBox) {
                        dispatch({ type: 'SET_LAYER_SELECTED', payload: false });
                        return;
                    }
                } else {
                    if (!insideBox) return;
                    // Select AND drag in the SAME gesture (Figma model). The dispatch
                    // only flips a view flag that makes the gizmo paint; the drag itself
                    // runs from refs set below in this very event, so nothing waits on
                    // React and the user perceives one continuous action.
                    dispatch({ type: 'SET_LAYER_SELECTED', payload: true });
                }
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
        const dx = e.clientX - gestureRef.current.startCenter.x;
        const dy = e.clientY - gestureRef.current.startCenter.y;

        // Space pan only: has this become a real pan? Reuses the Move tool's 3px
        // screen-space dead zone with its hysteresis, so "moved" means the same
        // thing everywhere in the app. Measured against startCenter (fixed at
        // pointerdown), never frame to frame. Middle-button pan is untouched — it
        // has no tap meaning to decide.
        if (isSpaceDownRef.current) {
            spacePanEngagedRef.current = isDragEngaged(
                gestureRef.current.startCenter, e.clientX, e.clientY, spacePanEngagedRef.current,
            );
        }

        // In Orbit mode with middle button, use vertical movement for zoom
        if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
            const zoomSensitivity = 10; // 10 units per pixel
            const newOffset = Math.min(Math.max(gestureRef.current.startZoom - dy * zoomSensitivity, -5000), 2000);
            dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: newOffset });
            return;
        }
        
        // Drawing mode: pan
        let newPanX = Math.max(-MAX_PAN, Math.min(MAX_PAN, gestureRef.current.startPan.x + dx));
        let newPanY = Math.max(-MAX_PAN, Math.min(MAX_PAN, gestureRef.current.startPan.y + dy));
        dispatch({ type: 'SET_DRAWING_ZOOM', payload: { zoom: state.drawingZoom, pan: { x: newPanX, y: newPanY } } });
        return;
    }

    // --- Transform Logic --- (math extracted to canvas/moveGizmoInteraction.ts)
    // isDrawingRef gates this on a gesture actually being in flight. isActive alone was
    // not enough: an orphaned transform made every pointermove drag the layer with no
    // pointer pressed at all (measured: 260x220px from a bare hover). The two are written
    // consecutively in the same pointerdown (setIsDrawing at the top of the move branch,
    // isActive right below it, both synchronous), so a legitimate drag can never have one
    // without the other — this narrows the entry, it does not change the order of
    // anything. When it now falls through, the hover-cursor block below is skipped by its
    // own !isActive guard and the isDrawingRef guard after it returns: nothing new runs.
    if (state.tool === 'move' && transformRef.current.isActive && isDrawingRef.current) {
        const t = transformRef.current;
        const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        // Dead-zone gate (canvas/moveGizmoInteraction.ts, isDragEngaged). startP is the
        // pointerdown position, fixed for the whole gesture, so this always measures the
        // TOTAL screen-space displacement — never a frame-to-frame delta, which would let
        // a slow deliberate drag never cross the threshold. `t.engaged` carries the
        // hysteresis forward: once true it can only stay true, so a drag that swings back
        // near its start mid-gesture does not un-engage. Below the threshold,
        // currentTransform is simply never written, so it stays at the identity set at
        // pointerdown — no jitter reaches the preview or the pointerup significance check.
        const engaged = isDragEngaged(t.startP, pointerX, pointerY, t.engaged);
        transformRef.current.engaged = engaged;
        if (engaged) {
            transformRef.current.currentTransform = computeMoveTransform({
                mode: t.mode,
                startTransform: t.startTransform,
                startP: t.startP,
                pointerX,
                pointerY,
                handles: transformHandlesRef.current,
                focalLength: state.focalLength,
                cameraZ: state.camera.z,
                activeZ: state.currentLayerIndex * -BASE_DEPTH_STEP,
                drawingZoom: state.drawingZoom,
            });
        }
        return;
    }

    // --- Move gizmo hover cursor --- (mapping extracted to canvas/gizmoCursor.ts)
    // Runs ONLY when no drag is in flight: during a transform the cursor stays pinned
    // to the mode grabbed at pointerdown, so it cannot flicker mid-resize. Falls
    // through without returning — every path below is reached exactly as before.
    if (state.tool === 'move' && !transformRef.current.isActive) {
        // Cache the rect on first hover rather than measuring per event: the RAF loop
        // invalidates layout every frame, so a getBoundingClientRect() here would be a
        // real reflow on a hot path. pointerdown always refreshes it before an actual
        // transform, so a stale rect can only ever misplace the cursor HINT.
        if (!canvasRectRef.current && canvasRef.current) canvasRectRef.current = canvasRef.current.getBoundingClientRect();
        const hoverRect = canvasRectRef.current;
        if (hoverRect) {
            const hoverMode = hitTestGizmo(e.clientX - hoverRect.left, e.clientY - hoverRect.top, transformHandlesRef.current);
            // Touch React only when the hovered node CHANGES — not once per pointermove.
            if (hoverMode !== hoverGizmoModeRef.current) {
                hoverGizmoModeRef.current = hoverMode;
                setGizmoCursor(cursorClassForGizmoMode(hoverMode, transformHandlesRef.current));
            }
        }
    }

    if (!isDrawingRef.current || gestureRef.current.isPinching) return;

    if (state.mode === 'drawing') {
        const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const screenX = e.clientX - rect.left - cx;
        const screenY = e.clientY - rect.top - cy;
        
        const currentZoom = state.drawingZoom;
        const currentPan = state.drawingPan;
        const drawX = (screenX - currentPan.x) / currentZoom;
        const drawY = (screenY - currentPan.y) / currentZoom;
        
        const activeZ = getActiveZ(state.currentLayerIndex);
        const FL = state.focalLength;
        const camZ = state.camera.z;
        const scale = FL / (FL + (activeZ - camZ));
        const worldX = drawX / scale;
        const worldY = drawY / scale;

        if (state.tool === 'move' && moveRef.current) {
            moveRef.current.offsetX = worldX - moveRef.current.startX;
            moveRef.current.offsetY = worldY - moveRef.current.startY;
            return;
        }
        
        const lastPoint = currentPointsRef.current[currentPointsRef.current.length - 1];
        if (!lastPoint) return; 

        // Apply Organic Wiggle
        let finalX = worldX;
        let finalY = worldY;

        if (state.isOrganicMode && (state.tool === 'blob' || state.tool === 'eraser')) {
             const rawDist = Math.hypot(worldX - lastPoint.x, worldY - lastPoint.y);
             organicPhaseRef.current += rawDist * 0.25; // Increased frequency for more "nervous" line
             
             const amp = 8.0; // Doubled amplitude
             // Added a third harmonic for more complexity/randomness
             finalX += (
                 Math.sin(organicPhaseRef.current) + 
                 Math.cos(organicPhaseRef.current * 0.43) * 1.2 + 
                 Math.sin(organicPhaseRef.current * 2.7) * 0.4
             ) * amp;
             
             finalY += (
                 Math.cos(organicPhaseRef.current * 0.87) + 
                 Math.sin(organicPhaseRef.current * 0.37) * 1.2 + 
                 Math.cos(organicPhaseRef.current * 2.3) * 0.4
             ) * amp;
        }

        const dist = Math.hypot(finalX - lastPoint.x, finalY - lastPoint.y);
        // Disable pressure sensitivity as requested
        const fixedPressure = 0.5;

        // Increase threshold to reduce number of points and improve performance
        if (dist > 3) {
          currentPointsRef.current.push({ x: finalX, y: finalY, pressure: fixedPressure });
          drawingPressureRef.current = fixedPressure;
        }
    } else if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
        // New Free View controls:
        // Shift + Drag = Orbit (rotate around center)
        // Normal Drag = Pan camera (move X, Y)
        // Alt + Drag = Elevation control
        
        if (e.shiftKey) {
            // Orbit mode: rotate around center
            const sensitivity = 0.005;
            orbitRef.current.targetAzimuth -= e.movementX * sensitivity;
            orbitRef.current.targetElevation = Math.max(-1.5, Math.min(1.5, orbitRef.current.targetElevation + e.movementY * sensitivity));
        } else if (e.altKey) {
            // Elevation control only
            const elevSensitivity = 0.006;
            orbitRef.current.targetElevation = Math.max(-1.5, Math.min(1.5, orbitRef.current.targetElevation + e.movementY * elevSensitivity));
        } else {
            // Pan mode: move camera in world space
            // Use orbitRef offset to avoid being overwritten by animation loop
            const panSensitivity = 2.0;
            orbitRef.current.panOffsetX -= e.movementX * panSensitivity;
            orbitRef.current.panOffsetY -= e.movementY * panSensitivity;
        }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {

    try { if(e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch(err) {}
    activePointerIdRef.current = null;

    if (isPanningRef.current) {
        isPanningRef.current = false;
        // Space still held → back to 'grab' (ready to pan again), not to no cursor.
        // The pan ends with the pen, the ARMED state ends with the key.
        setCursorOverride(isSpaceDownRef.current ? 'cursor-grab' : null);
        return;
    }
    if (!isDrawingRef.current) return;
    
    if (state.mode === 'drawing') {
        if (state.tool === 'move') {
            setIsDrawing(false);
            drawingPointerTypeRef.current = null;
            if (transformRef.current.isActive) {
                 const ct = transformRef.current.currentTransform;
                 // Only dispatch if significant change (guard extracted to module)
                 if (isSignificantTransform(ct)) {
                     dispatch({
                         type: 'TRANSFORM_LAYER',
                         payload: {
                             layerIndex: state.currentLayerIndex,
                             transform: {
                                 rotation: ct.rotation, scale: ct.scale, dx: ct.x, dy: ct.y,
                                 // scaleX/scaleY present only for side-handle drags → triggers
                                 // the reducer's non-uniform path. undefined for corners → uniform.
                                 scaleX: ct.scaleX, scaleY: ct.scaleY,
                                 centerX: transformRef.current.centerX,
                                 centerY: transformRef.current.centerY
                             }
                         }
                     });
                 }
                 transformRef.current.isActive = false;
                 transformRef.current.mode = 'none';
            } else if (moveRef.current) {
                const { offsetX, offsetY } = moveRef.current;
                if (Math.abs(offsetX) > 0.1 || Math.abs(offsetY) > 0.1) {
                    dispatch({ 
                        type: 'MOVE_LAYER', 
                        payload: { layerIndex: state.currentLayerIndex, deltaX: offsetX, deltaY: offsetY } 
                    });
                }
                moveRef.current = null;
            }
            return;
        }
        
        if (currentPointsRef.current.length > 0) {
            // Discard micro-strokes from finger/palm touches (not pen or mouse)
             if (drawingPointerTypeRef.current === 'touch' && currentPointsRef.current.length <= MIN_TOUCH_STROKE_POINTS) {
                 currentPointsRef.current = [];
                 setIsDrawing(false);
                 drawingPointerTypeRef.current = null;
                 return;
             }
             // Ensure visibility for small shapes (dots/lines) since fill() requires area
            let finalPoints = [...currentPointsRef.current];
            const isBrushTool = state.tool === 'brush';

            if ((state.tool === 'blob' || state.tool === 'eraser') && state.blobSmoothing && finalPoints.length >= 4) {
                const decimate = (pts: Point[], n: number): Point[] => {
                    if (pts.length <= 4) return pts;
                    const result: Point[] = [pts[0]];
                    for (let i = n; i < pts.length - 1; i += n) {
                        result.push(pts[i]);
                    }
                    result.push(pts[pts.length - 1]);
                    return result;
                };
                const chaikinSmooth = (pts: Point[], iterations = 2): Point[] => {
                    for (let iter = 0; iter < iterations; iter++) {
                        const smoothed: Point[] = [pts[0]];
                        for (let i = 0; i < pts.length - 1; i++) {
                            smoothed.push({
                                x: 0.75 * pts[i].x + 0.25 * pts[i + 1].x,
                                y: 0.75 * pts[i].y + 0.25 * pts[i + 1].y
                            });
                            smoothed.push({
                                x: 0.25 * pts[i].x + 0.75 * pts[i + 1].x,
                                y: 0.25 * pts[i].y + 0.75 * pts[i + 1].y
                            });
                        }
                        smoothed.push(pts[pts.length - 1]);
                        pts = smoothed;
                    }
                    return pts;
                };
                finalPoints = chaikinSmooth(decimate(finalPoints, 3), 3);
            }

            let originalPoints: Point[] = [];

            if (isBrushTool) {
                if (finalPoints.length === 1) {
                    const p = finalPoints[0];
                    finalPoints.push({ ...p, x: p.x + 0.1, y: p.y + 0.1 });
                }
                originalPoints = [...finalPoints];
                const thicknessVal = state.currentBrushThickness;
                finalPoints = generateStrokeForMode(state.brushMode, finalPoints, thicknessVal);
            } else if (finalPoints.length < 3) {
                const offset = 1.5 / (state.drawingZoom || 1);
                const last = finalPoints[finalPoints.length - 1];
                if (finalPoints.length === 1) {
                    finalPoints.push({ ...last, x: last.x + offset, y: last.y + offset });
                    finalPoints.push({ ...last, x: last.x - offset, y: last.y + offset });
                } else if (finalPoints.length === 2) {
                    // Turn line into thin triangle
                    finalPoints.push({ ...last, x: last.x + offset, y: last.y + offset });
                }
            }

            const newZ = getActiveZ(state.currentLayerIndex);
            const isEraserTool = state.tool === 'eraser';
            const eraserPolygon = isEraserTool
                ? generateStrokeForMode('tapered', finalPoints, state.currentBrushThickness)
                : undefined;
            const shapeProps = {
                color: state.palette[state.currentColorIndex],
                zIndex: newZ,
                isEraser: isEraserTool,
                isDrawInside: state.isDrawInside,
                isDrawBehind: state.isDrawBehind,
                originalPoints: isBrushTool ? originalPoints : undefined,
                brushThickness: (isBrushTool || isEraserTool) ? state.currentBrushThickness : undefined,
                brushMode: isBrushTool ? state.brushMode : undefined,
                eraserPolygon: isEraserTool ? eraserPolygon : undefined,
            };
            const shapeOriginal: Shape = {
                id: crypto.randomUUID(),
                points: finalPoints,
                ...shapeProps
            };

            if (state.isSymmetryEnabled) {
                // For lines, we mirror the original points and then regenerate the taper
                let shapeMirrored: Shape;
                
                if (isBrushTool) {
                     const mirroredOriginals = originalPoints.map(p => ({ ...p, x: -p.x }));
                     const thicknessVal = state.currentBrushThickness;
                     const mirroredFinals = generateStrokeForMode(state.brushMode, mirroredOriginals, thicknessVal);
                     shapeMirrored = {
                        id: crypto.randomUUID(),
                        points: mirroredFinals,
                        ...shapeProps,
                        originalPoints: mirroredOriginals
                    };
                } else {
                    shapeMirrored = {
                        id: crypto.randomUUID(),
                        points: finalPoints.map(p => ({ ...p, x: -p.x })),
                        ...shapeProps
                    };
                }

                dispatch({ type: 'ADD_SHAPES', payload: [shapeOriginal, shapeMirrored] });
            } else {
                dispatch({ type: 'ADD_SHAPE', payload: shapeOriginal });
            }
            analytics.strokeEnded(state.tool);
        }
        
        // Move flags cleanup to AFTER processing points to allow late pointerMove events
        currentPointsRef.current = [];
        setIsDrawing(false);
        drawingPointerTypeRef.current = null;
    } else {
        setIsDrawing(false);
        drawingPointerTypeRef.current = null;
    }
  };

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

  // Space: hold to pan, tap to reset the view. The industry-standard shortcut
  // (Photoshop, Illustrator, Figma, Blender, Procreate) and the reason it is worth
  // the conflict with the existing tap-to-reset.
  useEffect(() => {
    // Releases the pan. `fireTap` is the hold-vs-tap verdict: a press that never
    // crossed the dead zone was a tap, and taps keep the old meaning (reset view).
    const releaseSpace = (fireTap: boolean) => {
      if (!isSpaceDownRef.current) return;
      const wasTap = !spacePanEngagedRef.current;
      isSpaceDownRef.current = false;
      spacePanEngagedRef.current = false;
      isPanningRef.current = false;
      setCursorOverride(null);
      if (fireTap && wasTap) dispatch({ type: 'RESET_DRAWING_VIEW' });
    };

    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      // Holding a key autorepeats keydown at the OS rate. Harmless while Space only
      // did RESET_DRAWING_VIEW (idempotent), fatal now: every repeat would re-seed
      // the pan origin and pin the canvas in place.
      if (e.repeat) return;
      if (shouldIgnoreGlobalKey(e, {
        textSessionActive: state.textSession.isActive,
        animationBlocking: state.isAnimationMode && state.isAnimationPlaying && state.mode === 'drawing',
      })) return;
      if (state.mode !== 'drawing') return;
      // Mid-stroke: the pen is down and points are being collected. Taking over now
      // would pan the canvas out from under an unfinished stroke and bake the jump
      // into its geometry. Ignore the press entirely — no armed state, so the keyup
      // has nothing to release and the stroke finishes untouched.
      if (isDrawingRef.current) return;
      e.preventDefault();
      isSpaceDownRef.current = true;
      spacePanEngagedRef.current = false;
      setCursorOverride('cursor-grab');
    };

    // NO GUARDS HERE, AND THAT IS DELIBERATE — do not "fix" this by adding them.
    // Every guard on the keydown asks "should this gesture start?". This asks
    // "has the key been let go?", and the answer can never be conditional: the
    // state was already armed, and whatever is true NOW cannot un-arm it. Guard
    // this on textSession and a user who pans, then opens the text tool without
    // releasing Space, is left with a pan stuck on forever. Releasing state is
    // unconditional. Same reason `blur` is wired below: Alt+Tab mid-pan means the
    // keyup is delivered to another window and never arrives here at all.
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      releaseSpace(true);
    };
    // A lost window is not a tap: release without re-centring.
    const handleBlur = () => releaseSpace(false);

    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [dispatch, state.mode, state.textSession.isActive, state.isAnimationMode, state.isAnimationPlaying]);

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

    const handleContextRestored = () => {
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
        renderFrame(ctx, buildRenderContext());
      } catch (e) {
        console.error('Render loop error', e);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
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

