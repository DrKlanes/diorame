import React, { useEffect, useRef, useState } from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { generateStrokeForMode } from '../../utils/strokeGenerators';
import { Shape, Point } from '../../types/strataTypes';
import paperTexture from "figma:asset/texture-paper.png";
import grungeTexture from "figma:asset/texture-grunge.png";
import { cn } from '../ui/utils';
import { toast } from 'sonner@2.0.3';
import { OnboardingOverlayConnected as OnboardingOverlay } from './OnboardingOverlayConnected';
import { generateRisoGrain } from './canvas/postProcessing';
import { PARTICLE_COUNT, MIN_TOUCH_STROKE_POINTS, DOUBLE_CLICK_DELAY } from '../../constants/renderConstants';
import { exportAsPNG, exportAsSVG, exportAsMP4 } from './canvas/exportHandlers';
import { renderAnimationFrames } from './canvas/animationExportRender';
import { exportAsPNGSequence } from './canvas/pngSequenceHandler';
import { exportAsGIF } from './canvas/gifHandler';
import { useTranslation } from '../../i18n';
import { getLayerBoundingBox } from './canvas/transformUtils';
import { getAnimationFrames } from '../../utils/animationFrames';
import { renderFrame, type RenderContext } from './canvas/renderPipeline';

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
  
  const gestureRef = useRef<{
      isPinching: boolean;
      startDist: number;
      startZoom: number;
      startPan: { x: number, y: number };
      startCenter: { x: number, y: number };
      // Orbit touch gesture state
      isOrbitTouch: boolean;
      orbitTouchStartAzimuth: number;
      orbitTouchStartElevation: number;
      orbitTouchStartPanX: number;
      orbitTouchStartPanY: number;
      orbitTouchStartZoom: number;
      orbitTouchLastPos: { x: number, y: number };
  }>({
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
      orbitTouchLastPos: { x: 0, y: 0 }
  });
  
  // Optimization: Cached Shapes by Z
  const shapesByZRef = useRef(new Map<number, Shape[]>());
  const sortedZsRef = useRef<number[]>([]);

  // Optimization: Camera Ref for Animation Loop
  const cameraRef = useRef({ x: 0, y: 0, z: 0, rotation: 0 });

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
  const transformRef = useRef<{
      isActive: boolean;
      mode: 'none' | 'move' | 'scale_tl' | 'scale_tr' | 'scale_br' | 'scale_bl' | 'rotate';
      startP: { x: number, y: number };
      startTransform: { x: number, y: number, scale: number, rotation: number };
      centerX: number; centerY: number;
      layerBB: { minX: number, maxX: number, minY: number, maxY: number };
      currentTransform: { x: number, y: number, scale: number, rotation: number };
  }>({
      isActive: false, mode: 'none', startP: {x:0,y:0},
      startTransform: {x:0,y:0,scale:1,rotation:0},
      centerX: 0, centerY: 0,
      layerBB: {minX:0, maxX:0, minY:0, maxY:0},
      currentTransform: {x:0,y:0,scale:1,rotation:0}
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
              } as React.PointerEvent<HTMLCanvasElement>;
              
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
          // @ts-ignore
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

  // Load Fonts
  useEffect(() => {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Courier+Prime:wght@400;700&family=Inter:wght@400;700&family=Bangers&family=Inknut+Antiqua:wght@400;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => { document.head.removeChild(link); }
  }, []);

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
          exportAsPNG(canvas, state.projectName, onFinish, t);
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
          };
          renderAnimationFrames(exportOptions).then(frames =>
              exportAsPNGSequence(frames, state.projectName, onFinish, t)
          );
      }
      if (state.exportRequest === 'gif') {
          // Same snapshot pattern as png-sequence; exportAsGIF uses the same infrastructure.
          const exportOptions = {
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

  const handlePointerDown = (e: React.PointerEvent) => {
    // Pen Priority: If using a pen, ignore/cancel pinch and allow secondary pointer (palm rejection)
    if (e.pointerType === 'pen') {
        gestureRef.current.isPinching = false;
    } else {
        if (gestureRef.current.isPinching) return;
        if (!e.isPrimary) return;
         // Post-pinch cooldown: ignore touch shortly after pinch to prevent ghost strokes
         if (e.pointerType === 'touch' && (Date.now() - pinchEndTimestampRef.current) < 150) return;
    } 

    if (e.button === 1) { // Middle Mouse Button: Pan/Zoom
        e.preventDefault();
        
        // In Orbit mode, middle button does zoom (via ref to avoid re-render)
        if (state.mode === 'cinematic' && state.cinematicType === 'orbit') {
            // We'll handle zoom in pointer move, just set flag
            isPanningRef.current = true;
            setCursorOverride('cursor-ns-resize'); // vertical resize cursor for zoom
            gestureRef.current = {
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
        gestureRef.current = {
            isPinching: false,
            startDist: 0,
            startZoom: state.drawingZoom || 1,
            startPan: { ...state.drawingPan },
            startCenter: { x: e.clientX, y: e.clientY }
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
        if (now - lastClickTimeRef.current < DOUBLE_CLICK_DELAY) {
            let closestZ = 0; let minDist = Infinity;
            state.shapes.forEach(shape => {
                shape.points.forEach(pt => {
                    const dist = Math.hypot(pt.x - worldX, pt.y - worldY);
                    if (dist < minDist) { minDist = dist; closestZ = shape.zIndex; }
                });
            });
            dispatch({ type: 'SET_POINT_OF_INTEREST', payload: { x: worldX, y: worldY, z: closestZ } });
            lastClickTimeRef.current = 0;
            return;
        } else {
            lastClickTimeRef.current = now;
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
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDrawing(true);
            drawingPointerTypeRef.current = e.pointerType;
            
            // Gizmo Interaction
            const handles = transformHandlesRef.current;
            let mode: any = 'move';
            if (handles) {
                const HIT = 40; // Larger hit area for touch
                const dist = (p: {x:number,y:number}) => Math.hypot(p.x - pointerX, p.y - pointerY);
                if (dist(handles.rotate) < HIT) mode = 'rotate';
                else if (dist(handles.tl) < HIT) mode = 'scale_tl';
                else if (dist(handles.tr) < HIT) mode = 'scale_tr';
                else if (dist(handles.br) < HIT) mode = 'scale_br';
                else if (dist(handles.bl) < HIT) mode = 'scale_bl';
            }

            const activeLayerZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
            const bb = getLayerBoundingBox(state.shapes.filter(s => s.zIndex === activeLayerZ));
            
            if (bb) {
                transformRef.current = {
                    isActive: true, mode,
                    startP: { x: pointerX, y: pointerY },
                    startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
                    centerX: bb.cx, centerY: bb.cy,
                    layerBB: bb,
                    currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 }
                };
            } else {
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

    // --- Transform Logic ---
    if (state.tool === 'move' && transformRef.current.isActive) {
        const t = transformRef.current;
        const rect = canvasRectRef.current || canvasRef.current!.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;

        const dx = pointerX - t.startP.x;
        const dy = pointerY - t.startP.y;
        
        const newT = { ...t.startTransform };
        
        if (t.mode === 'move') {
             const activeZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
             const FL = state.focalLength;
             const camZ = state.camera.z;
             const dz = activeZ - camZ;
             const layerScale = FL / (FL + dz);
             const s = (state.drawingZoom || 1) * layerScale;
             
             newT.x += dx / s;
             newT.y += dy / s;
        } else if (t.mode === 'rotate') {
             const handles = transformHandlesRef.current;
             if (handles) {
                 const hcx = handles.center.x;
                 const hcy = handles.center.y;
                 const startAngle = Math.atan2(t.startP.y - hcy, t.startP.x - hcx);
                 const currAngle = Math.atan2(pointerY - hcy, pointerX - hcx);
                 newT.rotation += (currAngle - startAngle);
             }
        } else if (t.mode.startsWith('scale')) {
             const handles = transformHandlesRef.current;
             if (handles) {
                 const hcx = handles.center.x;
                 const hcy = handles.center.y;
                 const startDist = Math.hypot(t.startP.x - hcx, t.startP.y - hcy);
                 const currDist = Math.hypot(pointerX - hcx, pointerY - hcy);
                 // Prevent division by zero
                 const scaleFactor = currDist / Math.max(1, startDist);
                 newT.scale *= scaleFactor;
             }
        }
        
        transformRef.current.currentTransform = newT;
        return;
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

    if (isPanningRef.current) {
        isPanningRef.current = false;
        setCursorOverride(null);
        return;
    }
    if (!isDrawingRef.current) return;
    
    if (state.mode === 'drawing') {
        if (state.tool === 'move') {
            setIsDrawing(false);
            drawingPointerTypeRef.current = null;
            if (transformRef.current.isActive) {
                 const { x, y, scale, rotation } = transformRef.current.currentTransform;
                 // Only dispatch if significant change
                 if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1 || Math.abs(scale - 1) > 0.001 || Math.abs(rotation) > 0.001) {
                     dispatch({
                         type: 'TRANSFORM_LAYER',
                         payload: {
                             layerIndex: state.currentLayerIndex,
                             transform: {
                                 rotation, scale, dx: x, dy: y,
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
      shapesByZ: shapesByZRef.current,
      sortedZs: sortedZsRef.current,
      transformState: transformRef.current,
      cameraRef,
      lastShakeRef,
      transformHandlesRef,
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

  return (
    <div ref={containerRef} className={cn("absolute inset-0 z-0 overflow-hidden touch-none", state.mode === 'drawing' ? (cursorOverride ? cursorOverride : (state.tool === 'move' ? "cursor-move" : "cursor-crosshair")) : "cursor-default")} style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} tabIndex={0} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel} className="block w-full h-full" style={{ touchAction: 'none', outline: 'none' }} />
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
      </div>
      <OnboardingOverlay />
    </div>
  );
};

// --- Helpers --- (color utilities moved to src/utils/colorUtils.ts)

// _createFadeGrain_REMOVED — dead code eliminated (was ~20 lines)

// canvas utilities moved to src/utils/canvasUtils.ts

