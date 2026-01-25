import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStrata, Shape, Point, BASE_DEPTH_STEP, generateTaperedStroke, generateUniformStroke } from './StrataContext';
import paperTexture from "figma:asset/dedf59e02015e1400029a84197a5242f42fdbb01.png";
import risoTexture from "figma:asset/cb8694f26c4e972edf10545cd26da5e5d135c92e.png";
import grungeTexture from "figma:asset/cbf89ce40bab5dc98000a75dbc50509b964706a0.png";
import { cn } from '../ui/utils';
import { toast } from 'sonner@2.0.3';
import { OnboardingOverlay } from './OnboardingOverlay';

export const StrataCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const { state, dispatch } = useStrata();

  // --- Constants ---
  const CINEMATIC_DEPTH_MULTIPLIER = 3; 
  const DRAW_FOCAL_LENGTH = 5000;
  const NEAR_CLIP = 50;
  const MAX_PAN = 1500;

  // --- Refs ---
  const stateRef = useRef(state);
  const currentPointsRef = useRef<Point[]>([]); 
  const isDrawingRef = useRef(false);
  const drawingPointerTypeRef = useRef<string | null>(null);
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
  const risoImgRef = useRef<HTMLImageElement | null>(null);
  const processedRisoRef = useRef<HTMLCanvasElement | null>(null);
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

  // --- Bayer Matrix for Ordered Dithering (4x4) ---
  const bayerMatrix4x4 = useMemo(() => [
      [ 0, 32,  8, 40],
      [48, 16, 56, 24],
      [12, 44,  4, 36],
      [60, 28, 52, 20]
  ], []);

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
  const DOUBLE_CLICK_DELAY = 300; 

  // Organic Brush State
  const organicPhaseRef = useRef(0);

  // Throttle state for drawing performance
  const lastRenderTimeRef = useRef(0);
  const RENDER_THROTTLE_MS = 8; // ~120 fps max for drawing

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
      const count = 700; // Increased from 550
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
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = risoTexture;
    img.onload = () => {
        risoImgRef.current = img;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const brightness = data[i]; 
                data[i] = 0; data[i+1] = 0; data[i+2] = 0;
                data[i+3] = brightness;
            }
            ctx.putImageData(imageData, 0, 0);
            processedRisoRef.current = canvas;
        }
    };
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
      if (state.exportRequest === 'none') return;
      const canvas = canvasRef.current;
      if (!canvas) { dispatch({ type: 'FINISH_EXPORT' }); return; }

      if (state.exportRequest === 'png') {
          try {
              const link = document.createElement('a');
              const sanitizedName = state.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
              link.download = `${sanitizedName}-${Date.now()}.png`;
              link.href = canvas.toDataURL('image/png', 1.0);
              link.click();
              toast.success('Snapshot saved!', {
                  description: 'PNG image downloaded successfully',
                  duration: 2000,
              });
          } catch (e) { 
              console.error("Export PNG failed", e);
              toast.error('Failed to save snapshot', {
                  description: 'Please try again',
                  duration: 3000,
              });
          }
          dispatch({ type: 'FINISH_EXPORT' });
      }

      if (state.exportRequest === 'svg' || state.exportRequest === 'svgz') {
          (async () => {
              try {
              // Filter visible shapes (not erasers)
              const visibleShapes = state.shapes.filter(shape => !shape.isEraser);
              
              if (visibleShapes.length === 0) {
                  console.warn("No visible shapes to export");
                  dispatch({ type: 'FINISH_EXPORT' });
                  return;
              }

              // Calculate bounds
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              
              visibleShapes.forEach(shape => {
                  shape.points.forEach(point => {
                      minX = Math.min(minX, point.x);
                      minY = Math.min(minY, point.y);
                      maxX = Math.max(maxX, point.x);
                      maxY = Math.max(maxY, point.y);
                  });
              });

              const padding = 50;
              const width = Math.ceil(maxX - minX + padding * 2);
              const height = Math.ceil(maxY - minY + padding * 2);
              const offsetX = -minX + padding;
              const offsetY = -minY + padding;

              // Create SVG using array buffer to avoid string length limits
              const parts: string[] = [];
              parts.push(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`);
              parts.push(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" version="1.1">\n`);
              
              // Helper function to create smooth path from points
              // Matches the drawSmoothLine function used in canvas rendering
              const createSmoothPath = (points: Array<{x: number, y: number}>) => {
                  if (points.length < 2) {
                      return '';
                  }
                  
                  if (points.length === 2) {
                      return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y} Z`;
                  }
                  
                  // Use the same algorithm as drawSmoothLine: quadratic curves through midpoints
                  let path = `M${points[0].x},${points[0].y}`;
                  
                  for (let i = 1; i < points.length - 1; i++) {
                      const xc = (points[i].x + points[i + 1].x) / 2;
                      const yc = (points[i].y + points[i + 1].y) / 2;
                      path += ` Q${points[i].x},${points[i].y} ${xc},${yc}`;
                  }
                  
                  // Final segment to last point
                  path += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
                  path += ' Z';
                  
                  return path;
              };
              
              // Group shapes by zIndex
              const shapesByLayer = new Map<number, Shape[]>();
              visibleShapes.forEach(shape => {
                  if (!shapesByLayer.has(shape.zIndex)) {
                      shapesByLayer.set(shape.zIndex, []);
                  }
                  shapesByLayer.get(shape.zIndex)!.push(shape);
              });
              
              // Sort layers from back to front (most negative zIndex first)
              const sortedZIndices = Array.from(shapesByLayer.keys()).sort((a, b) => b - a);
              
              let clipPathCounter = 0;
              let processedShapeCount = 0;
              
              // Process each layer
              for (let layerIdx = 0; layerIdx < sortedZIndices.length; layerIdx++) {
                  const zIndex = sortedZIndices[layerIdx];
                  const layerShapes = shapesByLayer.get(zIndex)!;
                  
                  // Simulate canvas behavior: process shapes in order
                  // destination-over (drawBehind) puts shape at the BACK of the existing stack
                  // source-over (normal) puts shape at the FRONT
                  // source-atop (drawInside) clips to existing content
                  
                  const svgStack: Shape[] = []; // Back to front order for SVG
                  const clippableShapes: Shape[] = []; // Track shapes that can be used for clipping
                  const drawInsideShapes: Array<{shape: Shape, clipShapes: Shape[]}> = [];
                  
                  layerShapes.forEach(shape => {
                      if (shape.isDrawInside) {
                          // This shape needs to be clipped by everything drawn so far
                          drawInsideShapes.push({
                              shape,
                              clipShapes: [...clippableShapes]
                          });
                      } else if (shape.isDrawBehind) {
                          // Insert at the BEGINNING (back of stack)
                          svgStack.unshift(shape);
                          clippableShapes.push(shape);
                      } else {
                          // Normal: add at the END (front of stack)
                          svgStack.push(shape);
                          clippableShapes.push(shape);
                      }
                  });
                  
                  // Helper function to render a shape
                  const renderShape = (shape: Shape, clipPathId?: string) => {
                      const clipAttr = clipPathId ? ` clip-path="url(#${clipPathId})"` : '';
                      
                      if (shape.type === 'text' && shape.text) {
                          const x = shape.points[0].x + offsetX;
                          const y = shape.points[0].y + offsetY;
                          const fontSize = shape.fontSize || 40;
                          const rotation = shape.rotation || 0;
                          const align = shape.align || 'left';
                          
                          let textAnchor = 'start';
                          if (align === 'center') textAnchor = 'middle';
                          if (align === 'right') textAnchor = 'end';
                          
                          let transform = `translate(${x},${y})`;
                          if (rotation !== 0) {
                              transform += ` rotate(${(rotation * 180) / Math.PI})`;
                          }
                          
                          parts.push(`  <text x="0" y="0" fill="${shape.color}" font-size="${fontSize}" text-anchor="${textAnchor}" font-family="sans-serif" transform="${transform}"${clipAttr}>${shape.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>\n`);
                      } else if (shape.points.length > 0) {
                          const adjustedPoints = shape.points.map(p => ({
                              x: p.x + offsetX,
                              y: p.y + offsetY
                          }));
                          
                          const pathData = createSmoothPath(adjustedPoints);
                          parts.push(`  <path d="${pathData}" fill="${shape.color}" stroke="none"${clipAttr} />\n`);
                      }
                  };
                  
                  // Render the stack (back to front)
                  svgStack.forEach(shape => renderShape(shape));
                  
                  // Handle drawInside shapes with their respective clip paths
                  drawInsideShapes.forEach(({shape, clipShapes}) => {
                      if (clipShapes.length > 0) {
                          const clipId = `clip-${zIndex}-${clipPathCounter++}`;
                          parts.push(`  <defs>\n`);
                          parts.push(`    <clipPath id="${clipId}">\n`);
                          
                          clipShapes.forEach(clipShape => {
                              if (clipShape.type === 'text' && clipShape.text) {
                                  const x = clipShape.points[0].x + offsetX;
                                  const y = clipShape.points[0].y + offsetY;
                                  const fontSize = clipShape.fontSize || 40;
                                  const textWidth = clipShape.text.length * fontSize * 0.6;
                                  parts.push(`      <rect x="${x - 10}" y="${y - fontSize}" width="${textWidth + 20}" height="${fontSize + 10}" />\n`);
                              } else if (clipShape.points.length > 0) {
                                  const adjustedPoints = clipShape.points.map(p => ({
                                      x: p.x + offsetX,
                                      y: p.y + offsetY
                                  }));
                                  const pathData = createSmoothPath(adjustedPoints);
                                  parts.push(`      <path d="${pathData}" />\n`);
                              }
                          });
                          
                          parts.push(`    </clipPath>\n`);
                          parts.push(`  </defs>\n`);
                          
                          renderShape(shape, clipId);
                      } else {
                          // No clip shapes, just render normally (though this shouldn't happen in practice)
                          renderShape(shape);
                      }
                  });
                  
                  processedShapeCount += layerShapes.length;
                  
                  // Yield every 100 shapes to prevent UI freeze
                  if (processedShapeCount >= 100) {
                      await new Promise(r => setTimeout(r, 0));
                      processedShapeCount = 0;
                  }
              }

              parts.push(`</svg>`);
              
              // Join parts into final SVG string
              const svgContent = parts.join('');

              // Download SVG or SVGZ
              const sanitizedName = state.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
              let blob: Blob;
              let filename: string;
              
              if (state.exportRequest === 'svgz' && typeof CompressionStream !== 'undefined') {
                  // Compress as SVGZ using gzip
                  const textEncoder = new TextEncoder();
                  const svgBytes = textEncoder.encode(svgContent);
                  const compressedStream = new Blob([svgBytes]).stream().pipeThrough(new CompressionStream('gzip'));
                  const compressedBlob = await new Response(compressedStream).blob();
                  blob = compressedBlob;
                  filename = `${sanitizedName}-${Date.now()}.svgz`;
              } else {
                  // Regular SVG
                  blob = new Blob([svgContent], { type: 'image/svg+xml' });
                  filename = `${sanitizedName}-${Date.now()}.svg`;
              }
              
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              link.click();
              URL.revokeObjectURL(url);
              
              const isCompressed = state.exportRequest === 'svgz' && typeof CompressionStream !== 'undefined';
              toast.success('Vector exported!', {
                  description: isCompressed ? 'SVGZ file downloaded successfully' : 'SVG file downloaded successfully',
                  duration: 2000,
              });
          } catch (e) { 
              console.error("Export SVG failed", e);
              toast.error('Failed to export vector', {
                  description: 'Please try again',
                  duration: 3000,
              });
          }
          dispatch({ type: 'FINISH_EXPORT' });
      })();
      }

      if (state.exportRequest === 'mp4') {
          try {
              const stream = canvas.captureStream(60); 
              let mimeType = 'video/webm;codecs=vp9';
              let ext = 'webm';
              if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
                  mimeType = 'video/mp4;codecs=h264'; ext = 'mp4';
              } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                  mimeType = 'video/mp4'; ext = 'mp4';
              }

              const recorder = new MediaRecorder(stream, { mimeType });
              recordedChunksRef.current = [];
              recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) recordedChunksRef.current.push(e.data);
              };
              recorder.onstop = () => {
                  const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  const sanitizedName = state.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                  a.download = `${sanitizedName}-${Date.now()}.${ext}`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Animation saved!', {
                      description: 'Video loop downloaded successfully',
                      duration: 2000,
                  });
                  dispatch({ type: 'FINISH_EXPORT' });
              };
              recorder.start();
              setTimeout(() => { recorder.stop(); }, 6000);
          } catch (e) { 
              console.error("Export MP4 failed", e);
              toast.error('Failed to save animation', {
                  description: 'Please try again',
                  duration: 3000,
              });
              dispatch({ type: 'FINISH_EXPORT' });
          }
      }
  }, [state.exportRequest, dispatch, state.shapes, state.projectName]);

  // --- Event Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
      // Support both drawing mode and orbit (free view) mode
      if (state.mode === 'drawing') {
          // Protect Pen Drawing: If we are already drawing with a pen, ignore touch gestures (palm rejection)
          if (isDrawingRef.current && drawingPointerTypeRef.current === 'pen') return;

          if (e.touches.length === 2) {
              isDrawingRef.current = false;
              currentPointsRef.current = [];
              const t1 = e.touches[0];
              const t2 = e.touches[1];
              const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
              if (dist < 5) return; 

              const cx = (t1.clientX + t2.clientX) / 2;
              const cy = (t1.clientY + t2.clientY) / 2;
              gestureRef.current = {
                  ...gestureRef.current,
                  isPinching: true,
                  startDist: dist,
                  startZoom: state.drawingZoom || 1,
                  startPan: { ...state.drawingPan },
                  startCenter: { x: cx, y: cy }
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
          if (gestureRef.current.isPinching && e.touches.length === 2) {
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
          if (gestureRef.current.isPinching && e.touches.length < 2) {
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
      gestureRef.current.isPinching = false; 
      gestureRef.current.isOrbitTouch = false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Pen Priority: If using a pen, ignore/cancel pinch and allow secondary pointer (palm rejection)
    if (e.pointerType === 'pen') {
        gestureRef.current.isPinching = false;
    } else {
        if (gestureRef.current.isPinching) return;
        if (!e.isPrimary) return;
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
        if (state.tool === 'text') {
            dispatch({ type: 'START_TEXT_SESSION', payload: { x: worldX, y: worldY } });
            return;
        }
        if (state.tool === 'move') {
            e.currentTarget.setPointerCapture(e.pointerId);
            isDrawingRef.current = true;
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
        isDrawingRef.current = true;
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
        isDrawingRef.current = true; 
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

        if (state.isOrganicMode && (state.tool === 'brush' || state.tool === 'eraser')) {
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
            isDrawingRef.current = false;
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
            // Ensure visibility for small shapes (dots/lines) since fill() requires area
            let finalPoints = [...currentPointsRef.current];
            const isLineTool = state.tool === 'line';

            let originalPoints: Point[] = [];

            if (isLineTool) {
                if (finalPoints.length === 1) {
                    const p = finalPoints[0];
                    finalPoints.push({ ...p, x: p.x + 0.1, y: p.y + 0.1 });
                }
                originalPoints = [...finalPoints];
                const thicknessVal = state.currentLineThickness;
                const generateFunc = state.lineMode === 'tapered' ? generateTaperedStroke : generateUniformStroke;
                finalPoints = generateFunc(finalPoints, thicknessVal);
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
            const shapeProps = {
                color: state.palette[state.currentColorIndex],
                zIndex: newZ,
                isEraser: state.tool === 'eraser',
                isDrawInside: state.isDrawInside,
                isDrawBehind: state.isDrawBehind,
                originalPoints: isLineTool ? originalPoints : undefined,
                lineThickness: isLineTool ? state.currentLineThickness : undefined,
                lineMode: isLineTool ? state.lineMode : undefined
            };
            const shapeOriginal: Shape = {
                id: crypto.randomUUID(),
                points: finalPoints,
                ...shapeProps
            };

            if (state.isSymmetryEnabled) {
                // For lines, we mirror the original points and then regenerate the taper
                let shapeMirrored: Shape;
                
                if (isLineTool) {
                     const mirroredOriginals = originalPoints.map(p => ({ ...p, x: -p.x }));
                     const thicknessVal = state.currentLineThickness;
                     const generateFunc = state.lineMode === 'tapered' ? generateTaperedStroke : generateUniformStroke;
                     const mirroredFinals = generateFunc(mirroredOriginals, thicknessVal);
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
        isDrawingRef.current = false;
        drawingPointerTypeRef.current = null;
    } else {
        isDrawingRef.current = false;
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
    let accumulatedTime = 0;
    let accumulatedHandheldTime = 0;
    let lastTime = Date.now();
    let wiggleFrame = 0; 
    let shapePattern: CanvasPattern | null = null;

    // Helper to init reusable canvases
    const ensureCanvas = (ref: React.MutableRefObject<HTMLCanvasElement | null>, w: number, h: number) => {
        if (!ref.current) ref.current = document.createElement('canvas');
        if (ref.current.width !== w || ref.current.height !== h) {
            ref.current.width = w; ref.current.height = h;
        }
        return ref.current;
    };

    const render = () => {
      try {
      const currentState = stateRef.current;
      const isDrawing = isDrawingRef.current;
      const currentPoints = currentPointsRef.current;
      const isCinematic = currentState.mode === 'cinematic';
      const isPixelArt = isCinematic && currentState.postProcessingEnabled.pixelArt;
      
      // Throttle rendering during drawing for better performance
      const renderTime = performance.now();
      const timeSinceLastRender = renderTime - lastRenderTimeRef.current;
      if (isDrawing && currentState.mode === 'drawing' && timeSinceLastRender < RENDER_THROTTLE_MS) {
          requestAnimationFrame(render);
          return;
      }
      lastRenderTimeRef.current = renderTime;
      
      // Quantization Logic for Pixel Art
      // Derived from Pixel Art Size to ensure 1:1 pixel stability
      const pSize = (isPixelArt) ? Math.max(2, currentState.postProcessing.pixelArtSize || 4) : 1;
      
      let currentCamera = { ...cameraRef.current };
      let viewZoomOffset = currentState.viewZoomOffset;

      if (isPixelArt) {
          // Anchor-Based Snapping
          // To eliminate micro-jolts, we snap everything relative to a stable "Anchor Point" (POI or Center).
          // This ensures that when the grid resizes (zoom changes), the center of attention remains fixed 
          // and doesn't "beat" or jitter against a global 0,0 grid.
          
          const screenW = containerRef.current?.clientWidth || canvas.width;
          
          // Determine Anchor (World Space)
          const anchorX = currentState.pointOfInterest ? currentState.pointOfInterest.x : 0;
          const anchorY = currentState.pointOfInterest ? currentState.pointOfInterest.y : 0;
          const anchorZ = currentState.pointOfInterest ? currentState.pointOfInterest.z : getActiveZ(currentState.currentLayerIndex);

          const fl = currentState.focalLength;
          
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
      }
      
      const effectiveCameraZ = currentCamera.z + (isCinematic ? viewZoomOffset : 0);
      let FL = currentState.focalLength;

      if (isCinematic && currentState.cinematicType === 'zoom') {
          // Exponential Zoom for smooth visual flow
          // Range: ~78mm (1250) to ~2500mm (40000)
          const minFL = 1250;
          const maxFL = 40000;
          const ratio = maxFL / minFL;
          const sineNorm = (Math.sin(accumulatedTime * 0.4) + 1) / 2;
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
      const w = containerRef.current?.clientWidth || canvas.width;
      const h = containerRef.current?.clientHeight || canvas.height;
      if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w; canvas.height = h;
          // Re-init noise
          const nc = createNoise(w, h);
          if (nc) noiseCanvasRef.current = nc;
          
          const patC = createNoise(256, 256, 15, 1, 0.3);
          if (patC) shapePattern = ctx.createPattern(patC, 'repeat');
      }

      // Ensure Buffers
      ensureCanvas(offscreenCanvasRef, w, h);
      ensureCanvas(helperCanvasRef, w, h);
      ensureCanvas(compositionCanvasRef, w, h);

      ensureCanvas(tempCanvasRef, w, h); 
      ensureCanvas(pixelCanvasRef, Math.ceil(w / 4), Math.ceil(h / 4)); // Init small, resize later if needed

      if (!noiseCanvasRef.current) noiseCanvasRef.current = createNoise(w, h);
      if (!shapePattern) {
          const patC = createNoise(256, 256, 15, 1, 0.3);
          if (patC) shapePattern = ctx.createPattern(patC, 'repeat');
      }

      const offCtx = offscreenCanvasRef.current!.getContext('2d')!;

      // --- 1. Background ---
      ctx.globalAlpha = 1.0;
      ctx.setTransform(1, 0, 0, 1, 0, 0); 
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = currentState.isDarkMode 
        ? (isPixelArt ? '#000000' : '#050505') 
        : (isPixelArt ? '#ffffff' : '#f8f9fa'); 
      ctx.fillRect(0, 0, w, h);

      const viewZoom = currentState.mode === 'drawing' ? currentState.drawingZoom : 1;
      let viewPan = currentState.mode === 'drawing' ? currentState.drawingPan : { x: 0, y: 0 };

      // Ensure viewPan exists
      if (!viewPan) viewPan = { x: 0, y: 0 };

      if (currentState.mode === 'cinematic' && currentState.cinematicType === 'arc') {
          // Extremely subtle sway for Arc shot
          // Reduced amplitude (50 -> 15) and speed (0.3 -> 0.2) to avoid distracting from the focused layer
          viewPan = { x: Math.sin(accumulatedTime * 0.2) * 15, y: 0 };
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

      // Paper Texture
      if (paperImgRef.current && !isPixelArt) {
         const img = paperImgRef.current;
         const ratio = Math.max(w / img.width, h / img.height);
         const cx = (w - img.width * ratio) / 2;
         const cy = (h - img.height * ratio) / 2;
         ctx.drawImage(img, 0, 0, img.width, img.height, cx, cy, img.width * ratio, img.height * ratio);
         if (currentState.isDarkMode) {
             ctx.globalCompositeOperation = 'multiply';
             ctx.fillStyle = 'rgba(5, 5, 5, 0.9)';
             ctx.fillRect(0, 0, w, h);
             ctx.globalCompositeOperation = 'source-over';
         }
      }

      // Pixel Art logic helper (defined outside loop for reuse)
      const processPixelArt = (targetCtx: CanvasRenderingContext2D, w: number, h: number) => {
          const pSize = Math.max(2, currentState.postProcessing.pixelArtSize || 4);
          const sw = Math.ceil(w/pSize), sh = Math.ceil(h/pSize);
          
          const pCanvas = ensureCanvas(pixelCanvasRef, sw, sh);
          const pCtx = pCanvas.getContext('2d', { willReadFrequently: true })!;
          
          pCtx.imageSmoothingEnabled = false;
          // Draw target canvas to pixel buffer (Downscale)
          pCtx.clearRect(0, 0, sw, sh);
          pCtx.drawImage(targetCtx.canvas, 0, 0, w, h, 0, 0, sw, sh);
          
          const iData = pCtx.getImageData(0,0,sw,sh);
          const d = iData.data;
          
          // Palette Selection based on Depth
          const depthVal = currentState.postProcessing.pixelArtDepth || 4;
          let mode = 'quantize';
          let activePalette: number[][] | null = null;
          let quantLevels = 4;

          // CGA-inspired (Cyan/Magenta/White/Black) - High Contrast
          const PALETTE_CGA = [
              [0,0,0], [85,255,255], [255,85,255], [255,255,255]
          ];

          // 3-bit RGB (8 Colors) - Classic Computer
          const PALETTE_RGB8 = [
              [0,0,0], [255,0,0], [0,255,0], [0,0,255],
              [255,255,0], [0,255,255], [255,0,255], [255,255,255]
          ];
          
          // Retro Palette (Pico-8 inspired) - 16 Colors
          const PALETTE_RETRO = [
            [0,0,0], [29,43,83], [126,37,83], [0,135,81],
            [171,82,54], [95,87,79], [194,195,199], [255,241,232],
            [255,0,77], [255,163,0], [255,236,39], [0,228,54],
            [41,173,255], [131,118,156], [255,119,168], [255,204,170]
          ];
          
          // Classic Handheld (Game Boy Style) - Expanded to 8 Colors
          const PALETTE_HANDHELD = [
             [8,24,8],      // Deepest Shadow
             [15,56,15],    // Original Darkest
             [30,80,30],    // Mid Shadow
             [48,98,48],    // Original Dark
             [85,130,35],   // Mid Light (Bridge)
             [139,172,15],  // Original Light
             [155,188,15],  // Original Lightest
             [205,230,80]   // New Highlight
          ];

          // Stylized Limited - Modern/Artistic (13 Colors)
          const PALETTE_STYLIZED = [
             [20,12,28], [68,36,52], [48,52,109], [78,74,78],
             [133,76,48], [52,101,36], [208,70,72], [117,113,97],
             [89,125,206], [210,125,44], [133,149,161], [218,212,94],
             [83,95,95]     // Shadow Complement (#535f5f)
          ];

          if (depthVal <= 2) {
              mode = '1bit';
          } else if (depthVal <= 4) {
              mode = 'palette';
              activePalette = PALETTE_CGA;
          } else if (depthVal <= 6) {
              mode = 'palette';
              activePalette = PALETTE_RGB8;
          } else if (depthVal <= 8) {
              mode = 'palette';
              activePalette = PALETTE_RETRO;
          } else if (depthVal === 10) {
              // Standard Hi-Color (Quantize 5 levels)
              mode = 'quantize';
              quantLevels = 5;
          } else if (depthVal === 12) {
              // Classic Handheld (Depth 12)
              mode = 'palette';
              activePalette = PALETTE_HANDHELD;
          } else if (depthVal === 14) {
              // Stylized Limited (Depth 14)
              mode = 'palette';
              activePalette = PALETTE_STYLIZED;
          } else if (depthVal >= 16) {
              mode = 'original';
          }
          
          // Helper: Find closest palette color
          const getClosest = (r: number, g: number, b: number, palette: number[][]) => {
              let minD = Infinity, best = palette[0];
              for (let i = 0; i < palette.length; i++) {
                  const c = palette[i];
                  const dist = (r-c[0])*(r-c[0]) + (g-c[1])*(g-c[1]) + (b-c[2])*(b-c[2]);
                  if (dist < minD) { minD = dist; best = c; }
              }
              return best;
          };

          const qStep = 255 / (quantLevels - 1);
          const ditherAmount = currentState.postProcessing.pixelArtDither ?? 0;
          
          // Pre-calculate user palette for Original mode dithering
          const userPaletteRGB = (mode === 'original' && ditherAmount > 0 && currentState.palette) 
              ? currentState.palette.map((hex: string) => {
                  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
              }) 
              : null;

          for(let y=0; y<sh; y++) {
              const row = ditherAmount > 0 ? bayerMatrix4x4[y%4] : null;
              for(let x=0; x<sw; x++) {
                  const i = (y*sw + x)*4;
                  
                  // 1. Get Original Color
                  let r = d[i], g = d[i+1], b = d[i+2];

                  // 2. Apply Dithering (Noise before mapping)
                  if (row) {
                      const baseScale = mode === '1bit' ? 64 : ((mode === 'palette' || mode === 'original') ? 32 : qStep); 
                      const dScale = (baseScale * 0.4) * ditherAmount; 
                      
                      const noise = (row[x%4]-31.5) / 32 * dScale;
                      r = Math.max(0, Math.min(255, r + noise));
                      g = Math.max(0, Math.min(255, g + noise));
                      b = Math.max(0, Math.min(255, b + noise));
                  }

                  // 3. Map Color
                  if (mode === 'original') {
                      if (ditherAmount > 0 && userPaletteRGB && userPaletteRGB.length > 0) {
                          const r0 = d[i], g0 = d[i+1], b0 = d[i+2]; 
                          
                          const best = getClosest(r0, g0, b0, userPaletteRGB);
                          const distSq = (r0-best[0])*(r0-best[0]) + (g0-best[1])*(g0-best[1]) + (b0-best[2])*(b0-best[2]);
                          
                          const t = Math.max(0, Math.min(1, (distSq - 20) / 780));
                          let factor = t * t * (3 - 2 * t);
                          factor = Math.pow(factor, 0.65);
                          
                          if (factor > 0.01 && row) {
                              const baseScale = 32;
                              const dScale = (baseScale * 0.4) * ditherAmount * factor;
                              const noise = (row[x%4]-31.5) / 32 * dScale;
                              
                              const rN = Math.max(0, Math.min(255, r0 + noise));
                              const gN = Math.max(0, Math.min(255, g0 + noise));
                              const bN = Math.max(0, Math.min(255, b0 + noise));
                              
                              const bestN = getClosest(rN, gN, bN, userPaletteRGB);
                              d[i] = bestN[0]; d[i+1] = bestN[1]; d[i+2] = bestN[2];
                          } else {
                              d[i] = best[0]; d[i+1] = best[1]; d[i+2] = best[2];
                          }
                      } else if (ditherAmount > 0) {
                           d[i] = r; d[i+1] = g; d[i+2] = b;
                      }
                  } else if (mode === '1bit') {
                      const lum = 0.299*r + 0.587*g + 0.114*b;
                      const val = lum > 128 ? 255 : 0;
                      d[i] = val; d[i+1] = val; d[i+2] = val;
                  } else if (mode === 'palette' && activePalette) {
                      const c = getClosest(r, g, b, activePalette);
                      d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2];
                  } else if (mode === 'quantize') {
                       d[i] = Math.floor(r / qStep + 0.5) * qStep;
                       d[i+1] = Math.floor(g / qStep + 0.5) * qStep;
                       d[i+2] = Math.floor(b / qStep + 0.5) * qStep;
                  }
              }
          }
          pCtx.putImageData(iData,0,0);
          
          // Draw back (Upscale)
          targetCtx.save();
          targetCtx.globalCompositeOperation = 'copy';
          targetCtx.imageSmoothingEnabled = false;
          targetCtx.drawImage(pCanvas, 0, 0, sw, sh, 0, 0, w, h);
          targetCtx.restore();
      };

      // --- 2. Render Layers ---
      offCtx.setTransform(1, 0, 0, 1, 0, 0);
      offCtx.clearRect(0, 0, w, h);

      // Use cached shapes map for better performance
      const currentShapesByZ = shapesByZRef.current;
      const currentSortedZs = sortedZsRef.current;

      const activeZ = getActiveZ(currentState.currentLayerIndex);
      let renderZs = currentSortedZs;
      // Inject current active Z if drawing and not yet in list
      if (isDrawing && currentPoints.length > 0 && !currentShapesByZ.has(activeZ)) {
           renderZs = [...renderZs, activeZ].sort((a, b) => b - a);
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

      const fxDistortion = (isCinematic && currentState.postProcessingEnabled.distortion) ? currentState.postProcessing.distortion : 0;
      const distortionK = Math.abs(fxDistortion) > 0.01 ? (fxDistortion * -0.8) * (500 / FL) : 0;

      renderZs.forEach(z => {
          const layerIndex = Math.round(Math.abs(z / BASE_DEPTH_STEP));
          if (currentState.hiddenLayers.includes(layerIndex)) return;
          
          const isLocked3D = isCinematic && currentState.locked3DLayers.includes(layerIndex);
          const shapes = currentShapesByZ.get(z) || [];
          
          // Pre-calculate Layer Projection Constants
          // FIX: Only apply Cinematic Multiplier if in Cinematic Mode!
          // Apply layer spacing factor to control depth separation
          const baseZ = z * currentState.layerSpacingFactor;
          const shapeZ = (!isCinematic || isLocked3D) ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
          const camX = isLocked3D ? 0 : currentCamera.x;
          const camY = isLocked3D ? 0 : currentCamera.y;
          const camZ = isLocked3D ? 0 : effectiveCameraZ;
          const dz = shapeZ - camZ;
          
          if (FL + dz <= NEAR_CLIP) return; // Clip behind camera
          const layerScale = FL / (FL + dz);
          const layerOpacity = (FL + dz < 250) ? Math.max(0, ((FL + dz) - NEAR_CLIP) / 200) : 1;
          
          if (layerOpacity <= 0) return;

          const layerCtx = helperCanvasRef.current!.getContext('2d')!;
          layerCtx.clearRect(0, 0, w, h);
          let hasContent = false;
          let layerAvgZ = dz; 

          // Transform Helper Function
          const transformPoint = (x: number, y: number) => {
             // Drawing Mode Parallax
             if (!isCinematic) {
                 const dDraw = z - currentCamera.z;
                 const sDraw = DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH + dDraw);
                 const sx = x * sDraw;
                 const sy = y * sDraw;
                 return { 
                     x: centerXScreen + (sx * viewZoom) + viewPan.x, 
                     y: centerYScreen + (sy * viewZoom) + viewPan.y, 
                     scale: sDraw * viewZoom, 
                     opacity: 1, 
                     dist: 1 
                 };
             }

             // Cinematic 3D
             let sx = (x - camX) * layerScale;
             let sy = (y - camY) * layerScale;

             if (!isLocked3D && camRot !== 0) {
                 const rx = sx * cosR - sy * sinR;
                 const ry = sx * sinR + sy * cosR;
                 sx = rx; sy = ry;
             }
             if (isArcOrOrbit && !isLocked3D) {
                 const shake = lastShakeRef.current;
                 const idealCamX = currentCamera.x - shake.x;
                 const idealCamY = currentCamera.y - shake.y;
                 
                 sx += (idealCamX - poiX) * arcPivotScale;
                 if (currentState.cinematicType === 'orbit') sy += (idealCamY - poiY) * arcPivotScale;
             }

             let distFactor = 1;
             if (distortionK !== 0 && !isLocked3D) {
                 const nx = sx / centerXScreen;
                 const ny = sy / centerYScreen;
                 const r2 = nx*nx + ny*ny;
                 distFactor = 1 + distortionK * r2;
                 sx *= distFactor; sy *= distFactor;
             }

             return {
                 x: centerXScreen + (sx * viewZoom) + viewPan.x,
                 y: centerYScreen + (sy * viewZoom) + viewPan.y,
                 scale: layerScale * viewZoom,
                 opacity: layerOpacity,
                 dist: distFactor
             };
          };

          // Draw Particles
          if (isCinematic && currentState.postProcessingEnabled.particles && currentState.postProcessing.particles > 0.01) {
             const pIntensity = currentState.postProcessing.particles;
             const pType = currentState.postProcessing.particleType;
             particlesRef.current.forEach(p => {
                 p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
                 if (p.x > 1500) p.x = -1500; else if (p.x < -1500) p.x = 1500;
                 if (p.y > 1000) p.y = -1000; else if (p.y < -1000) p.y = 1000;

                 if (p.z <= z + 50 && p.z > z - BASE_DEPTH_STEP + 50) {
                     // Reuse projection logic
                     const proj = transformPoint(p.x, p.y); // Particles share layer Z roughly
                     if (proj.opacity > 0.01) {
                         const alpha = Math.min(1, (pIntensity * 1.5) * proj.opacity);
                         const colorVal = p.shade < 0.5 ? Math.floor(p.shade * 120) : 195 + Math.floor((p.shade - 0.5) * 120);
                         layerCtx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${alpha})`;
                         
                         if (pType === 'circle') {
                             layerCtx.beginPath();
                             layerCtx.arc(proj.x, proj.y, p.r * proj.scale, 0, Math.PI * 2);
                             layerCtx.fill();
                         } else {
                             layerCtx.save();
                             layerCtx.translate(proj.x, proj.y);
                             layerCtx.rotate(p.rotation);
                             if (pType === 'square') {
                                const s = p.r * proj.scale * 2;
                                layerCtx.fillRect(-s/2, -s/2, s, s);
                             } else {
                                const s = p.r * proj.scale;
                                layerCtx.beginPath();
                                if (p.strokeShape.length) {
                                    layerCtx.moveTo(p.strokeShape[0].x * s, p.strokeShape[0].y * s);
                                    for(let i=1; i<p.strokeShape.length; i++) layerCtx.lineTo(p.strokeShape[i].x * s, p.strokeShape[i].y * s);
                                }
                                layerCtx.fill();
                             }
                             layerCtx.restore();
                         }
                         hasContent = true;
                     }
                 }
             });
          }

          // Draw Shapes
          shapes.forEach(shape => {
              if (shape.points.length === 0) return;
              let wiggleX = 0, wiggleY = 0;
              if (isCinematic && currentState.postProcessingEnabled.wiggle) {
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
              if (currentState.mode === 'drawing' && currentState.tool === 'move' && transformRef.current.isActive && shape.zIndex === currentState.currentLayerIndex * -BASE_DEPTH_STEP) {
                   const t = transformRef.current.currentTransform;
                   const cx = transformRef.current.centerX;
                   const cy = transformRef.current.centerY;
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

              // Text Handling
              if (shape.type === 'text' && shape.text) {
                  const pt = currentPoints[0];
                  
                  let effectiveFontSize = shape.fontSize || 40;
                  let effectiveRotation = shape.rotation || 0;

                  if (currentState.mode === 'drawing' && currentState.tool === 'move' && transformRef.current.isActive && shape.zIndex === currentState.currentLayerIndex * -BASE_DEPTH_STEP) {
                       const t = transformRef.current.currentTransform;
                       effectiveFontSize *= t.scale;
                       effectiveRotation += t.rotation;
                  }

                  // AFFINE PROJECTION APPROACH
                  // Solves "weird spacing" and "billboard" issues by projecting the text's local coordinate system
                  // onto the screen plane, treating the text block as a cohesive flat surface on the 3D layer.
                  
                  const wx = pt.x; 
                  const wy = pt.y;

                  // 1. Calculate Basis Vectors in World Space (rotated by text rotation)
                  // We use a small step to sample the local tangent plane
                  const step = 10; 
                  const cos = Math.cos(effectiveRotation);
                  const sin = Math.sin(effectiveRotation);
                  
                  const pOrigin = transformPoint(wx, wy);
                  
                  // World point one 'step' along text's X axis
                  const pX = transformPoint(wx + step * cos, wy + step * sin);
                  
                  // World point one 'step' along text's Y axis (down)
                  const pY = transformPoint(wx - step * sin, wy + step * cos);

                  if (pOrigin.opacity > 0.01) {
                      hasContent = true;
                      
                      // Calculate Affine Transform Matrix
                      // Scale factor cancels out 'step'
                      const m11 = (pX.x - pOrigin.x) / step;
                      const m12 = (pX.y - pOrigin.y) / step;
                      const m21 = (pY.x - pOrigin.x) / step;
                      const m22 = (pY.y - pOrigin.y) / step;

                      layerCtx.save();
                      
                      // Apply Transform: Maps World Unit -> Screen Pixel
                      layerCtx.setTransform(m11, m12, m21, m22, pOrigin.x + wiggleX, pOrigin.y + wiggleY);

                      let fontName = '"Inter", sans-serif';
                      if (shape.font === 'noir') fontName = '"Courier Prime", monospace';
                      else if (shape.font === 'mansion') fontName = '"Cinzel", serif';
                      else if (shape.font === 'comic') fontName = '"Bangers", system-ui';
                      else if (shape.font === 'dungeons') fontName = '"Inknut Antiqua", serif';

                      // Font size is in World Units (which setTransform maps to Screen Pixels)
                      layerCtx.font = `bold ${effectiveFontSize}px ${fontName}`;
                      
                      // Apply letter spacing
                      if (shape.font === 'dungeons') {
                          // @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
                          layerCtx.letterSpacing = '-0.04em';
                      } else if (shape.font === 'comic') {
                          // @ts-ignore
                          layerCtx.letterSpacing = '0.05em'; // Slight spacing for comic
                      } else {
                          // @ts-ignore
                          layerCtx.letterSpacing = '0px';
                      }

                      layerCtx.fillStyle = shape.color;
                      layerCtx.globalAlpha = pOrigin.opacity;
                      layerCtx.textAlign = shape.align || 'left';
                      layerCtx.textBaseline = 'middle';

                      const lines = shape.text.split('\n');
                      const lineHeight = effectiveFontSize * 1.2;
                      const totalHeight = lines.length * lineHeight;
                      const startY = -(totalHeight / 2) + (lineHeight / 2);

                      lines.forEach((line, i) => {
                          layerCtx.fillText(line, 0, startY + i * lineHeight);
                      });

                      layerCtx.restore();
                  }
                  return;
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
                  const isUniformLine = shape.originalPoints && shape.originalPoints.length > 0 && shape.lineMode === 'uniform';
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
                      // Check for degenerate line (single-tap Dot) in Pixel Art mode
                      // Fixes disappearing dots by rendering a deterministic primitive
                      const pStart = shape.originalPoints![0];
                      const pEnd = shape.originalPoints![shape.originalPoints!.length-1];
                      const isDot = isPixelArt && Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y) < 0.1;

                      if (isDot) {
                           const proj = transformPoint(pStart.x, pStart.y);
                           const px = Math.round((proj.x + wiggleX) / pSize) * pSize;
                           const py = Math.round((proj.y + wiggleY) / pSize) * pSize;
                           
                           if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
                           else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';
                           
                           layerCtx.fillStyle = shape.color;
                           const size = Math.max(pSize, Math.round(((shape.lineThickness || 20) * proj.scale) / pSize) * pSize);
                           layerCtx.fillRect(px - size/2, py - size/2, size, size);
                      } else {
                          // For uniform lines, render the original spine with stroke
                          const projectedSpine: {x:number, y:number}[] = [];
                      let totalScale = 0;
                      shape.originalPoints!.forEach(pt => {
                          const proj = transformPoint(pt.x, pt.y);
                          let px = proj.x + wiggleX;
                          let py = proj.y + wiggleY;
                          if (isPixelArt) {
                                const pSize = Math.max(2, currentState.postProcessing.pixelArtSize || 4);
                                px = Math.round(px/pSize)*pSize;
                                py = Math.round(py/pSize)*pSize;
                          }
                          projectedSpine.push({ x: px, y: py });
                          totalScale += proj.scale;
                      });
                      
                      let finalSpine = projectedSpine;
                      if (isPixelArt) {
                           finalSpine = finalSpine.filter((p, i) => 
                              i === 0 || (p.x !== finalSpine[i-1].x || p.y !== finalSpine[i-1].y)
                           );
                      }

                      // Calculate average scale for perspective-correct line thickness
                      const averageScale = projectedSpine.length > 0 ? totalScale / projectedSpine.length : viewZoom;
                      
                      if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
                      else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';
                      
                      layerCtx.strokeStyle = shape.color;
                      const baseThickness = (shape.lineThickness || 20) * averageScale;
                      layerCtx.lineWidth = isPixelArt ? Math.max(baseThickness, currentState.postProcessing.pixelArtSize || 4) : baseThickness;
                      layerCtx.lineCap = isPixelArt ? 'butt' : 'round';
                      layerCtx.lineJoin = isPixelArt ? 'miter' : 'round';
                      
                      if (useStraightLines) drawStraightLine(layerCtx, finalSpine);
                      else drawSmoothLine(layerCtx, finalSpine);

                      layerCtx.stroke();
                      }
                  } else if (shape.isEraser) {
                      layerCtx.globalCompositeOperation = 'destination-out';
                      layerCtx.fillStyle = '#000000'; layerCtx.strokeStyle = '#000000';
                      if (useStraightLines) drawStraightLine(layerCtx, renderPoints);
                      else drawSmoothLine(layerCtx, renderPoints);
                      layerCtx.fill();
                  } else {
                      if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
                      else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';

                      const shapeLayerIndex = Math.round(Math.abs(shape.zIndex / BASE_DEPTH_STEP));
                      const renderMode = currentState.layerRenderModes?.[shapeLayerIndex] || 'flat';
                      
                      if (renderMode === 'grad' && !shape.isEraser) {
                          // Gradient logic simplified
                          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                          for(let k=0; k<projectedPoints.length; k++) {
                              const px = projectedPoints[k].x, py = projectedPoints[k].y;
                              if(px < minX) minX = px; if(px > maxX) maxX = px;
                              if(py < minY) minY = py; if(py > maxY) maxY = py;
                          }
                          const cx = (minX + maxX)/2, cy = (minY + maxY)/2;
                          
                          // Use per-layer gradient params
                          const gradParams = currentState.layerGradParams?.[shapeLayerIndex] || { angle: 90, intensity: 0.2 };
                          const ang = (gradParams.angle * Math.PI) / 180;
                          
                          const r = Math.hypot(maxX-minX, maxY-minY)/2;
                          const grad = layerCtx.createLinearGradient(
                              cx - Math.cos(ang)*r, cy - Math.sin(ang)*r,
                              cx + Math.cos(ang)*r, cy + Math.sin(ang)*r
                          );
                          const c = shape.color, ints = gradParams.intensity;
                          grad.addColorStop(0, getVibrantVariant(c, ints, 'light'));
                          grad.addColorStop(0.5, c);
                          grad.addColorStop(1, getVibrantVariant(c, ints, 'dark'));
                          layerCtx.fillStyle = grad;
                      } else {
                          layerCtx.fillStyle = shape.color;
                      }
                      
                      if (useStraightLines) drawStraightLine(layerCtx, renderPoints);
                      else drawSmoothLine(layerCtx, renderPoints);
                      layerCtx.fill();
                  }
                  
                  layerCtx.globalCompositeOperation = 'source-over';
                  layerCtx.globalAlpha = 1.0;
              }


          });

          // Draw Current Stroke
          if (isDrawing && currentPoints.length > 0 && z === activeZ) {
              let totalScale = 0;
              const projPoints = currentPoints.map(p => {
                  const t = transformPoint(p.x, p.y);
                  totalScale += t.scale;
                  return { x: t.x, y: t.y };
              });
              
              // Calculate average scale for perspective-correct preview thickness
              const averageScale = projPoints.length > 0 ? totalScale / projPoints.length : viewZoom;
              
              if (projPoints.length > 1) {
                  hasContent = true;
                  if (currentState.tool === 'eraser') {
                      layerCtx.globalCompositeOperation = 'destination-out';
                      layerCtx.fillStyle = '#000000';
                      drawSmoothLine(layerCtx, projPoints);
                      layerCtx.fill();
                      layerCtx.globalCompositeOperation = 'source-over';
                      layerCtx.strokeStyle = 'rgba(255,255,255,0.8)';
                      layerCtx.lineWidth = 1 * viewZoom;
                      layerCtx.setLineDash([5*viewZoom, 5*viewZoom]);
                      layerCtx.stroke();
                      layerCtx.setLineDash([]);
                  } else if (currentState.tool === 'line') {
                      if (currentState.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
                      else layerCtx.globalCompositeOperation = currentState.isDrawInside ? 'source-atop' : 'source-over';
                      
                      layerCtx.strokeStyle = currentState.palette[currentState.currentColorIndex];
                      layerCtx.lineWidth = currentState.currentLineThickness * averageScale;
                      layerCtx.lineCap = 'round';
                      layerCtx.lineJoin = 'round';
                      
                      drawSmoothLine(layerCtx, projPoints);
                      layerCtx.stroke();
                  } else {
                      if (currentState.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
                      else layerCtx.globalCompositeOperation = currentState.isDrawInside ? 'source-atop' : 'source-over';
                      
                      layerCtx.fillStyle = currentState.paletteMode === 'grad' 
                        ? currentState.palette[currentState.currentColorIndex] // Simple color for live drawing to save perf
                        : currentState.palette[currentState.currentColorIndex];
                        
                      drawSmoothLine(layerCtx, projPoints);
                      layerCtx.fill();
                  }
                  layerCtx.globalCompositeOperation = 'source-over';
              }
              // Mirror Stroke
              if (currentState.isSymmetryEnabled) {
                  let mirrorTotalScale = 0;
                  const mirPoints = currentPoints.map(p => {
                      const t = transformPoint(-p.x, p.y);
                      mirrorTotalScale += t.scale;
                      return { x: t.x, y: t.y };
                  });
                  const mirrorAverageScale = mirPoints.length > 0 ? mirrorTotalScale / mirPoints.length : viewZoom;
                  
                  if (mirPoints.length > 1) {
                      if (currentState.tool === 'line') {
                          layerCtx.strokeStyle = currentState.palette[currentState.currentColorIndex];
                          layerCtx.lineWidth = currentState.currentLineThickness * mirrorAverageScale;
                          layerCtx.lineCap = 'round';
                          layerCtx.lineJoin = 'round';
                          drawSmoothLine(layerCtx, mirPoints);
                          layerCtx.stroke();
                      } else {
                          layerCtx.fillStyle = currentState.palette[currentState.currentColorIndex];
                          drawSmoothLine(layerCtx, mirPoints);
                          layerCtx.fill();
                      }
                  }
              }
          }

          if (hasContent) {
             // Pattern Overlay (Optimized)
             if (shapePattern && !isPixelArt) {
                 layerCtx.globalCompositeOperation = 'source-atop';
                 layerCtx.fillStyle = shapePattern;
                 layerCtx.fillRect(0,0,w,h);
                 layerCtx.globalCompositeOperation = 'source-over';
             }

             // Fog
             if (isCinematic && currentState.postProcessingEnabled.fog) {
                 const fogInt = currentState.postProcessing.fog;
                 if (fogInt > 0.01) {
                     // Dynamic Fog based on distance from camera plane
                     // Allows controlling both density and effective range with one slider
                     const depth = FL + layerAvgZ;
                     
                     // Curve start distance: Low fog = starts far away, High fog = starts closer
                     const startDist = 2000 + (1.0 - Math.pow(fogInt, 0.5)) * 4000;
                     // Curve density: Standard exponential fog
                     const density = 0.0004 * fogInt; 

                     const dist = Math.max(0, depth - startDist);
                     const fogFactor = 1.0 - Math.exp(-dist * density);

                     if (fogFactor > 0.01) {
                         layerCtx.globalCompositeOperation = 'source-atop';
                         layerCtx.fillStyle = currentState.isDarkMode ? '#050505' : '#f8f9fa';
                         layerCtx.globalAlpha = Math.min(1, fogFactor);
                         layerCtx.fillRect(0,0,w,h);
                         layerCtx.globalAlpha = 1.0;
                         layerCtx.globalCompositeOperation = 'source-over';
                     }
                 }
             }

             // Composition to Offscreen
             // Apply Pixel Art per-layer to support smooth DoF on top
             if (isPixelArt) {
                 processPixelArt(layerCtx, w, h);
             }

             const glowInt = currentState.postProcessing.glow;
             let dofBlur = 0;
             if (isCinematic && currentState.postProcessingEnabled.dof) {
                 dofBlur = Math.min((Math.abs(layerAvgZ - fxFocusDist)/1000)*(FL/400)*4, 30*currentState.postProcessing.dof);
             }

             if (isCinematic && currentState.postProcessingEnabled.glow && glowInt > 0.01) {
                 offCtx.save();
                 offCtx.filter = `blur(${ (currentState.isDarkMode ? 35:20)*glowInt + dofBlur }px)`;
                 offCtx.globalCompositeOperation = currentState.isDarkMode ? 'lighter' : 'source-over';
                 offCtx.globalAlpha = currentState.isDarkMode ? 1.0 : (0.3 + glowInt*0.4);
                 offCtx.drawImage(helperCanvasRef.current!, 0, 0);
                 offCtx.restore();
             }
             
             offCtx.save();
             if (dofBlur > 0.5) offCtx.filter = `blur(${dofBlur}px)`;
             offCtx.drawImage(helperCanvasRef.current!, 0, 0);
             offCtx.restore();
             offCtx.filter = 'none';
          }
      }); // End Layer Loop

      // --- 3. Final Composition ---
      
      // RISO Texture
      if (isCinematic && currentState.postProcessingEnabled.riso && !isPixelArt && currentState.postProcessing.riso > 0.01 && processedRisoRef.current) {
          const rc = processedRisoRef.current;
          const scale = Math.max((w*1.5)/rc.width, (h*1.5)/rc.height);
          const dw = rc.width*scale, dh = rc.height*scale;
          offCtx.save();
          offCtx.globalCompositeOperation = 'destination-out';
          offCtx.globalAlpha = currentState.postProcessing.riso;
          offCtx.imageSmoothingEnabled = false;
          offCtx.drawImage(rc, (w-dw)/2, (h-dh)/2, dw, dh);
          offCtx.restore();
      }

      // Chromatic Aberration & Transfer to Main
      const caInt = currentState.postProcessing.chromaticAberration;
      const useCA = isCinematic && currentState.postProcessingEnabled.chromaticAberration && caInt > 0.01;
      
      ctx.globalCompositeOperation = currentState.isDarkMode ? 'source-over' : 'multiply';
      
          if (useCA) {
          const hCtx = helperCanvasRef.current!.getContext('2d')!;
          const cCtx = compositionCanvasRef.current!.getContext('2d')!;
          cCtx.clearRect(0,0,w,h); 
          if (!currentState.isDarkMode) { cCtx.fillStyle='#FFFFFF'; cCtx.fillRect(0,0,w,h); }

          const drawChan = (col: string, s: number, mode: GlobalCompositeOperation) => {
              hCtx.clearRect(0,0,w,h);
              
              if (currentState.isDarkMode) {
                  // Dark Mode: Colorize with source-in, then Multiply to restore shading
                  hCtx.globalCompositeOperation = 'source-over';
                  hCtx.drawImage(offscreenCanvasRef.current!, 0, 0);
                  hCtx.globalCompositeOperation = 'source-in'; hCtx.fillStyle = col; hCtx.fillRect(0,0,w,h);
                  hCtx.globalCompositeOperation = 'multiply'; hCtx.drawImage(offscreenCanvasRef.current!, 0, 0);
              } else {
                  // Light Mode: White BG -> Black Ink -> Screen Color (CMY)
                  hCtx.globalCompositeOperation = 'source-over';
                  hCtx.fillStyle = '#FFFFFF'; hCtx.fillRect(0,0,w,h);
                  hCtx.drawImage(offscreenCanvasRef.current!, 0, 0);
                  hCtx.globalCompositeOperation = 'screen';
                  hCtx.fillStyle = col; hCtx.fillRect(0,0,w,h);
              }
              cCtx.globalCompositeOperation = mode;
              const dx = (w - w*s)/2, dy = (h - h*s)/2;
              cCtx.drawImage(helperCanvasRef.current!, dx, dy, w*s, h*s);
          };

          const cols = currentState.isDarkMode ? ['#FF0000','#00FF00','#0000FF'] : ['#00FFFF','#FF00FF','#FFFF00'];
          const blend = currentState.isDarkMode ? 'lighten' : 'multiply';
          drawChan(cols[0], 1 + 0.03*caInt, blend);
          drawChan(cols[1], 1 + 0.015*caInt, blend);
          drawChan(cols[2], 1, blend);
          
          ctx.drawImage(compositionCanvasRef.current!, 0, 0);
      } else {
          ctx.drawImage(offscreenCanvasRef.current!, 0, 0);
      }

      // Global FX
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      
      if (isCinematic && currentState.postProcessingEnabled.vignette) {
          const vig = currentState.postProcessing.vignette;
          if (vig > 0.01) {
              const g = ctx.createRadialGradient(w/2, h/2, h/3, w/2, h/2, h*0.8);
              g.addColorStop(0, 'rgba(0,0,0,0)');
              g.addColorStop(1, `rgba(0,0,0,${0.95 * vig})`);
              ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
          }
      }

      const grain = (!isPixelArt && isCinematic && currentState.postProcessingEnabled.grain) ? currentState.postProcessing.grain : 0;
      if (grain > 0.01 && noiseCanvasRef.current) {
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = grain;
          // Add vibration to grain by random offset
          const offsetX = Math.random() * 100 - 50;
          const offsetY = Math.random() * 100 - 50;
          
          // Use pattern to ensure coverage with offset
          const pattern = ctx.createPattern(noiseCanvasRef.current, 'repeat');
          if (pattern) {
              ctx.fillStyle = pattern;
              ctx.save();
              ctx.translate(offsetX, offsetY);
              ctx.fillRect(-offsetX, -offsetY, w + Math.abs(offsetX), h + Math.abs(offsetY));
              ctx.restore();
          } else {
              // Fallback
              ctx.drawImage(noiseCanvasRef.current, 0, 0);
          }
          
          ctx.globalAlpha = 1.0;
      }

      // Pixel Art (Global Pass - Disabled in favor of per-layer pass to support smooth DoF)
      if (false && isPixelArt) {
          const pSize = Math.max(2, currentState.postProcessing.pixelArtSize || 4);
          const sw = Math.ceil(w/pSize), sh = Math.ceil(h/pSize);
          
          // Ensure pixel buffer size matches logic
          const pCanvas = pixelCanvasRef.current;
          if (pCanvas && (pCanvas.width !== sw || pCanvas.height !== sh)) {
              pCanvas.width = sw; pCanvas.height = sh;
          }
          
          const pCtx = pCanvas!.getContext('2d', { willReadFrequently: true })!;
          pCtx.imageSmoothingEnabled = false;
          pCtx.drawImage(canvas, 0, 0, w, h, 0, 0, sw, sh);
          
          const iData = pCtx.getImageData(0,0,sw,sh);
          const d = iData.data;
          
          // Palette Selection based on Depth
          const depthVal = currentState.postProcessing.pixelArtDepth || 4;
          let mode = 'quantize';
          let activePalette: number[][] | null = null;
          let quantLevels = 4;

          // CGA-inspired (Cyan/Magenta/White/Black) - High Contrast
          const PALETTE_CGA = [
              [0,0,0], [85,255,255], [255,85,255], [255,255,255]
          ];

          // 3-bit RGB (8 Colors) - Classic Computer
          const PALETTE_RGB8 = [
              [0,0,0], [255,0,0], [0,255,0], [0,0,255],
              [255,255,0], [0,255,255], [255,0,255], [255,255,255]
          ];
          
          // Retro Palette (Pico-8 inspired) - 16 Colors
          const PALETTE_RETRO = [
            [0,0,0], [29,43,83], [126,37,83], [0,135,81],
            [171,82,54], [95,87,79], [194,195,199], [255,241,232],
            [255,0,77], [255,163,0], [255,236,39], [0,228,54],
            [41,173,255], [131,118,156], [255,119,168], [255,204,170]
          ];
          
          // Classic Handheld (Game Boy Style) - Expanded to 8 Colors
          const PALETTE_HANDHELD = [
             [8,24,8],      // Deepest Shadow
             [15,56,15],    // Original Darkest
             [30,80,30],    // Mid Shadow
             [48,98,48],    // Original Dark
             [85,130,35],   // Mid Light (Bridge)
             [139,172,15],  // Original Light
             [155,188,15],  // Original Lightest
             [205,230,80]   // New Highlight
          ];

          // Stylized Limited - Modern/Artistic (13 Colors)
          const PALETTE_STYLIZED = [
             [20,12,28], [68,36,52], [48,52,109], [78,74,78],
             [133,76,48], [52,101,36], [208,70,72], [117,113,97],
             [89,125,206], [210,125,44], [133,149,161], [218,212,94],
             [83,95,95]     // Shadow Complement (#535f5f)
          ];

          if (depthVal <= 2) {
              mode = '1bit';
          } else if (depthVal <= 4) {
              mode = 'palette';
              activePalette = PALETTE_CGA;
          } else if (depthVal <= 6) {
              mode = 'palette';
              activePalette = PALETTE_RGB8;
          } else if (depthVal <= 8) {
              mode = 'palette';
              activePalette = PALETTE_RETRO;
          } else if (depthVal === 10) {
              // Standard Hi-Color (Quantize 5 levels)
              mode = 'quantize';
              quantLevels = 5;
          } else if (depthVal === 12) {
              // Classic Handheld (Depth 12)
              mode = 'palette';
              activePalette = PALETTE_HANDHELD;
          } else if (depthVal === 14) {
              // Stylized Limited (Depth 14)
              mode = 'palette';
              activePalette = PALETTE_STYLIZED;
          } else if (depthVal >= 16) {
              mode = 'original';
          }
          
          // Helper: Find closest palette color
          const getClosest = (r: number, g: number, b: number, palette: number[][]) => {
              let minD = Infinity, best = palette[0];
              for (let i = 0; i < palette.length; i++) {
                  const c = palette[i];
                  // Simple Euclidean distance is sufficient for retro aesthetic
                  const dist = (r-c[0])*(r-c[0]) + (g-c[1])*(g-c[1]) + (b-c[2])*(b-c[2]);
                  if (dist < minD) { minD = dist; best = c; }
              }
              return best;
          };

          // Step for Quantization Mode
          const qStep = 255 / (quantLevels - 1);
          
          const ditherAmount = currentState.postProcessing.pixelArtDither ?? 0;
          
          // Pre-calculate user palette for Original mode dithering
          const userPaletteRGB = (mode === 'original' && ditherAmount > 0 && currentState.palette) 
              ? currentState.palette.map((hex: string) => {
                  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0,0,0];
              }) 
              : null;

          for(let y=0; y<sh; y++) {
              const row = ditherAmount > 0 ? bayerMatrix4x4[y%4] : null;
              for(let x=0; x<sw; x++) {
                  const i = (y*sw + x)*4;
                  
                  // 1. Get Original Color
                  let r = d[i], g = d[i+1], b = d[i+2];

                  // 2. Apply Dithering (Noise before mapping)
                  if (row) {
                      // Adjust dither scale based on depth
                      // Lower depth needs more aggressive dither to be visible, higher depth needs subtlety
                      const baseScale = mode === '1bit' ? 64 : ((mode === 'palette' || mode === 'original') ? 32 : qStep); 
                      const dScale = (baseScale * 0.4) * ditherAmount; 
                      
                      const noise = (row[x%4]-31.5) / 32 * dScale;
                      r = Math.max(0, Math.min(255, r + noise));
                      g = Math.max(0, Math.min(255, g + noise));
                      b = Math.max(0, Math.min(255, b + noise));
                  }

                  // 3. Map Color
                  if (mode === 'original') {
                      if (ditherAmount > 0 && userPaletteRGB && userPaletteRGB.length > 0) {
                          // Error-Gated Dithering: Only dither if quantization error is significant
                          // This avoids "dirtying" flat areas that already match the palette
                          const r0 = d[i], g0 = d[i+1], b0 = d[i+2]; // Use clean original color
                          
                          const best = getClosest(r0, g0, b0, userPaletteRGB);
                          const distSq = (r0-best[0])*(r0-best[0]) + (g0-best[1])*(g0-best[1]) + (b0-best[2])*(b0-best[2]);
                          
                          // Gate dither strength: Low error = No dither
                          // Thresholds: ~4.5 unit distance (20 sq) to ~28 unit distance (800 sq)
                          // This expands dithering range significantly to cover more intermediate tones
                          const t = Math.max(0, Math.min(1, (distSq - 20) / 780));
                          let factor = t * t * (3 - 2 * t); // Smoothstep
                          
                          // Boost factor curve to increase mid-range coverage
                          factor = Math.pow(factor, 0.65);
                          
                          if (factor > 0.01 && row) {
                              // Apply Gated Noise
                              const baseScale = 32;
                              const dScale = (baseScale * 0.4) * ditherAmount * factor;
                              const noise = (row[x%4]-31.5) / 32 * dScale;
                              
                              const rN = Math.max(0, Math.min(255, r0 + noise));
                              const gN = Math.max(0, Math.min(255, g0 + noise));
                              const bN = Math.max(0, Math.min(255, b0 + noise));
                              
                              const bestN = getClosest(rN, gN, bN, userPaletteRGB);
                              d[i] = bestN[0]; d[i+1] = bestN[1]; d[i+2] = bestN[2];
                          } else {
                              d[i] = best[0]; d[i+1] = best[1]; d[i+2] = best[2];
                          }
                      } else if (ditherAmount > 0) {
                           // Fallback if no palette: keep noisy original (legacy behavior)
                           d[i] = r; d[i+1] = g; d[i+2] = b;
                      }
                  } else if (mode === '1bit') {
                      // Simple Threshold (Luminance)
                      const lum = 0.299*r + 0.587*g + 0.114*b;
                      const val = lum > 128 ? 255 : 0;
                      d[i] = val; d[i+1] = val; d[i+2] = val;
                  } else if (mode === 'palette' && activePalette) {
                      const c = getClosest(r, g, b, activePalette);
                      d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2];
                  } else if (mode === 'quantize') {
                       d[i] = Math.floor(r / qStep + 0.5) * qStep;
                       d[i+1] = Math.floor(g / qStep + 0.5) * qStep;
                       d[i+2] = Math.floor(b / qStep + 0.5) * qStep;
                  }
              }
          }
          pCtx.putImageData(iData,0,0);
          ctx.imageSmoothingEnabled = false;
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(pixelCanvasRef.current!, 0, 0, sw, sh, 0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
      }

      // --- Grunge Overlay (Animated) ---
      if (isCinematic && currentState.postProcessingEnabled.grungeOverlay && grungeImgRef.current) {
          // Posterize time to ~3fps (350ms)
          const step = Math.floor(Date.now() / 350);
          
          // Seed random based on step
          const seed = step * 123.456;
          const rand = (n: number) => {
              const x = Math.sin(seed + n) * 10000;
              return x - Math.floor(x);
          };
          
          const gImg = grungeImgRef.current;
          
          ctx.save();
          ctx.globalCompositeOperation = 'overlay'; 
          
          const intensityVal = currentState.postProcessing.grungeIntensity ?? 0.5;
          // Reduced intensity: 0.15 (Low), 0.35 (Med), 0.65 (High)
          const opacity = intensityVal <= 0.2 ? 0.15 : intensityVal >= 0.8 ? 0.65 : 0.35;
          ctx.globalAlpha = opacity;
          
          const screenDiag = Math.hypot(w, h);
          
          // 1. Determine Scale
          // Target scale is 0.5 for "fine grain", but we must ensure we cover the screen diagonal
          // so we don't see edges (the "cuts").
          const targetScale = 0.5;
          const minImgDim = Math.min(gImg.width, gImg.height);
          // Minimum scale needed to ensure the image's smallest side covers the screen rotation
          const minSafeScale = (screenDiag * 1.05) / minImgDim; 
          
          // Use the larger of the two to guarantee coverage
          const finalScale = Math.max(targetScale, minSafeScale);
          
          // 2. Calculate Safe Wiggle Range
          // How much surplus image do we have?
          const scaledMinDim = minImgDim * finalScale;
          const surplus = Math.max(0, scaledMinDim - screenDiag);
          const safeRadius = surplus / 2;
          
          // 3. Random Parameters
          const rot = rand(1) * Math.PI * 2;
          // Constrain wiggle to safe zone so edges never enter viewport
          const offX = (rand(2) - 0.5) * 2 * (safeRadius * 0.9); 
          const offY = (rand(3) - 0.5) * 2 * (safeRadius * 0.9);
          
          // Random Flip (Mirroring) for extra variety
          const flipX = rand(4) > 0.5 ? 1 : -1;
          const flipY = rand(5) > 0.5 ? 1 : -1;

          ctx.translate(w/2, h/2);
          ctx.rotate(rot);
          ctx.translate(offX, offY);
          ctx.scale(finalScale * flipX, finalScale * flipY);
          
          ctx.drawImage(gImg, -gImg.width/2, -gImg.height/2);
          
          ctx.restore();
      }

      // --- Gizmo Drawing ---
      if (currentState.mode === 'drawing' && currentState.tool === 'move' && transformRef.current.layerBB) {
           const tr = transformRef.current;
           const bb = tr.layerBB;
           const t = tr.isActive ? tr.currentTransform : { x: 0, y: 0, scale: 1, rotation: 0 };
           const cx = tr.centerX;
           const cy = tr.centerY;
           const sin = Math.sin(t.rotation);
           const cos = Math.cos(t.rotation);
           
           const activeZ = currentState.currentLayerIndex * -BASE_DEPTH_STEP;
           const dDraw = activeZ - currentCamera.z;
           const sDraw = DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH + dDraw); 
           
           const project = (wx: number, wy: number) => {
               // World Transform
               const ox = wx - cx;
               const oy = wy - cy;
               const rx = (ox * cos - oy * sin) * t.scale;
               const ry = (ox * sin + oy * cos) * t.scale;
               const finalX = rx + cx + t.x;
               const finalY = ry + cy + t.y;
               
               // Screen Projection (Drawing Mode)
               const sx = finalX * sDraw;
               const sy = finalY * sDraw;
               const screenX = (w/2) + (sx * (currentState.drawingZoom || 1)) + (currentState.drawingPan?.x || 0);
               const screenY = (h/2) + (sy * (currentState.drawingZoom || 1)) + (currentState.drawingPan?.y || 0);
               return { x: screenX, y: screenY };
           };

           const pTL = project(bb.minX, bb.minY);
           const pTR = project(bb.maxX, bb.minY);
           const pBR = project(bb.maxX, bb.maxY);
           const pBL = project(bb.minX, bb.maxY);
           
           // Rotate handle above top edge
           // Project unrotated top-mid point, but moved up in unrotated Y
           // Actually, simpler: take projected TL and TR, find midpoint, then extend perpendicular.
           // OR project a point that is (cx, minY - offset) in LOCAL space.
           // Let's do Local Space projection logic properly.
           // Point in Local Space: (0, -offset) relative to (0,0) center? No.
           // Relative to center (cx, cy):
           // Top Edge Mid: (0, minY - cy).
           // Handle: (0, minY - cy - offset).
           
           const offset = 120 / sDraw / (currentState.drawingZoom || 1); // constant screen size offset
           const pRot = project(cx, bb.minY - offset);
           const pCenter = project(bb.cx, bb.cy);

           // Update Hit Handles
           transformHandlesRef.current = {
               tl: pTL, tr: pTR, br: pBR, bl: pBL,
               rotate: pRot, center: pCenter
           };

           // Draw
           ctx.setTransform(1, 0, 0, 1, 0, 0); 
           ctx.lineWidth = 2;
           ctx.strokeStyle = '#3b82f6'; 
           ctx.beginPath();
           ctx.moveTo(pTL.x, pTL.y);
           ctx.lineTo(pTR.x, pTR.y);
           ctx.lineTo(pBR.x, pBR.y);
           ctx.lineTo(pBL.x, pBL.y);
           ctx.closePath();
           ctx.stroke();
           
           // Rotate Line
           const topMid = { x: (pTL.x+pTR.x)/2, y: (pTL.y+pTR.y)/2 };
           ctx.beginPath();
           ctx.moveTo(topMid.x, topMid.y);
           ctx.lineTo(pRot.x, pRot.y);
           ctx.stroke();

           // Handles
           ctx.fillStyle = '#ffffff';
           ctx.lineWidth = 1.5;
           const drawHandle = (p: {x:number,y:number}, type: string) => {
               ctx.beginPath();
               ctx.arc(p.x, p.y, type === 'rotate' ? 5 : 6, 0, Math.PI*2);
               ctx.fill();
               ctx.stroke();
           };

           drawHandle(pTL, 'scale');
           drawHandle(pTR, 'scale');
           drawHandle(pBR, 'scale');
           drawHandle(pBL, 'scale');
           ctx.fillStyle = '#3b82f6';
           drawHandle(pRot, 'rotate');
      }

      // --- Symmetry Axis Guide ---
      if (currentState.mode === 'drawing' && currentState.isSymmetryEnabled) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; // Subtle blue
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]); // Dashed line
          
          // Center line accounting for pan
          const centerX = (w / 2) + (currentState.drawingPan?.x || 0);
          
          ctx.beginPath();
          ctx.moveTo(centerX, 0);
          ctx.lineTo(centerX, h);
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash
      }

      // --- Animation Tick ---
      const now = Date.now();
      const dt = Math.min((now - lastTime)/1000, 0.1);
      lastTime = now;
      if (isCinematic) {
          accumulatedTime += dt * (currentState.cinematicSpeed ?? 1.0);
          accumulatedHandheldTime += dt; // Independent time for handheld shake
          wiggleFrame = Math.floor(now / 250); // 4 FPS for stop motion effect
          const t = accumulatedTime;
          const type = currentState.cinematicType;
          let nc = { ...currentState.camera };
          const spd = 2 * (currentState.cinematicSpeed ?? 1.0);
          const maxD = (currentState.totalLayers) * -BASE_DEPTH_STEP * CINEMATIC_DEPTH_MULTIPLIER;
          
          if (type === 'forward') {
              nc.z -= spd; nc.x = poiX + Math.sin(t)*50; nc.y = poiY + Math.cos(t*0.7)*50;
              if (nc.z < maxD - 1000) nc.z = 500;
          } else if (type === 'spiral') {
              nc.z -= spd*1.5; nc.x = poiX + Math.cos(t)*200; nc.y = poiY + Math.sin(t)*200;
              if (nc.z < maxD - 1000) nc.z = 500;
          } else if (type === 'yoyo') {
              nc.z = (500 + maxD)/2 + Math.sin(t*0.5)*(Math.abs(maxD)+500)/2;
              nc.x = poiX + Math.sin(t*2)*20; nc.y = poiY;
          } else if (type === 'pulse') {
              nc.z -= spd*(2+Math.sin(t*3)); nc.x = poiX + Math.sin(t*5)*10; nc.y = poiY + Math.cos(t*5)*10;
              if (nc.z < maxD - 1000) nc.z = 500;
          } else if (type === 'twist') {
              nc.z -= spd*1.2; nc.x = poiX; nc.y = poiY; nc.rotation = Math.sin(t*0.5)*0.5;
              // Add subtle zoom in/out
              nc.z += Math.sin(t*0.25) * 400; 
              if (nc.z < maxD - 1000) nc.z = 500;
          } else if (type === 'arc') {
              nc.z = centerZ + 1200; nc.y = poiY; nc.x = poiX + Math.sin(t*0.4)*800;
          } else if (type === 'orbit') {
              // Free View Mode: smooth interpolation for orbit angles
              orbitRef.current.azimuth += (orbitRef.current.targetAzimuth - orbitRef.current.azimuth)*0.1;
              orbitRef.current.elevation += (orbitRef.current.targetElevation - orbitRef.current.elevation)*0.1;
              
              // Calculate orbit position around center
              const cd = 1200;
              const orbitX = cd * Math.sin(orbitRef.current.azimuth) * Math.cos(orbitRef.current.elevation);
              const orbitY = cd * Math.sin(orbitRef.current.elevation);
              const orbitZ = cd * Math.cos(orbitRef.current.azimuth) * Math.cos(orbitRef.current.elevation);
              
              // Apply pan offset to orbit position for free movement
              nc.x = poiX + orbitX + orbitRef.current.panOffsetX;
              nc.y = poiY + orbitY + orbitRef.current.panOffsetY;
              nc.z = centerZ + orbitZ;
          } else if (type === 'crane') {
              nc.y = poiY + Math.sin(t*0.3)*400;
              nc.z = centerZ + 1200 - Math.cos(t*0.3)*150;
              nc.x = poiX + Math.sin(t*0.15)*30;
          } else if (type === 'truck') {
              nc.x = poiX + Math.sin(t*0.2)*400;
              nc.y = poiY;
              nc.z = centerZ + 1200 + Math.abs(Math.cos(t*0.2)) * 150;
          } else if (type === 'zoom') {
              nc.x = poiX;
              nc.y = poiY;
              nc.z = centerZ + 1200;
          }
          
          // Apply Handheld Camera Shake (if enabled)
          if (currentState.isHandheldEnabled && isCinematic) {
              const intensityMap = { low: 0.8, medium: 2.0, high: 3.5 };
              // Increase frequency for High intensity to simulate more frantic movement
              const freqMap = { low: 1.0, medium: 1.0, high: 2.5 };
              
              const baseIntensity = intensityMap[currentState.handheldIntensity];
              const freqMult = freqMap[currentState.handheldIntensity];
              
              // More complex frequency mixing for organic feel using independent time
              const ht = accumulatedHandheldTime;
              
              // Base sway (breathing/body movement)
              const t1 = ht * 1.5 * freqMult;
              const swayX = Math.sin(t1) * 3 + Math.cos(t1 * 1.3) * 2;
              const swayY = Math.cos(t1 * 0.9) * 3 + Math.sin(t1 * 1.4) * 2;
              
              // Micro-tremors (muscle tension/weight) - Faster frequencies
              const t2 = ht * 8.0 * freqMult;
              const tremorX = Math.sin(t2) * 0.5 + Math.cos(t2 * 1.7) * 0.4;
              const tremorY = Math.cos(t2 * 1.2) * 0.5 + Math.sin(t2 * 2.3) * 0.4;
              const tremorZ = Math.sin(t2 * 1.5) * 0.5;

              // Combined noise
              const shakeX = (swayX + tremorX) * baseIntensity;
              const shakeY = (swayY + tremorY) * baseIntensity;
              const shakeZ = (swayX * 1.5 + tremorZ) * baseIntensity;

              nc.x += shakeX;
              nc.y += shakeY;
              nc.z += shakeZ;
              
              lastShakeRef.current = { x: shakeX, y: shakeY, z: shakeZ };
              
              // Rotation shake (roll/pitch)
              const tr = ht * freqMult;
              nc.rotation += ((Math.sin(tr * 1.1) * 0.005) + (Math.cos(tr * 3.7) * 0.003)) * baseIntensity;
          } else {
              lastShakeRef.current = { x: 0, y: 0, z: 0 };
          }
          
          cameraRef.current = nc;
      }
      
      animationFrameId = requestAnimationFrame(render);
      } catch (e) {
         console.error("Render loop error", e);
         animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('contextlost', handleContextLost);
      canvas.removeEventListener('contextrestored', handleContextRestored);
    };
  }, [dispatch]);

  return (
    <div ref={containerRef} className={cn("absolute inset-0 z-0 overflow-hidden touch-none", state.mode === 'drawing' ? cn("inset-4 sm:inset-6 md:inset-8 lg:inset-10 rounded-[32px] shadow-2xl bg-white border border-slate-100/50", cursorOverride ? cursorOverride : (state.tool === 'move' ? "cursor-move" : "cursor-crosshair")) : "inset-0 bg-slate-50 cursor-default")} style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} tabIndex={0} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchCancel} className={cn("block w-full h-full", state.mode === 'drawing' ? "rounded-[32px]" : "")} style={{ touchAction: 'none', outline: 'none' }} />
      <OnboardingOverlay />
    </div>
  );
};

// --- Helpers ---
const hexToHSL = (hex: string) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number) => {
    l /= 100; const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => { const k = (n + h / 30) % 12; const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * color).toString(16).padStart(2, '0'); };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const getVibrantVariant = (hex: string, intensity: number, direction: 'light' | 'dark') => {
    const hsl = hexToHSL(hex);
    const shift = 10 + (intensity * 30);
    if (direction === 'light') { hsl.l = Math.min(92, hsl.l + shift); if (hsl.s > 0) hsl.s = Math.min(100, hsl.s + (intensity * 10)); }
    else { hsl.l = Math.max(20, hsl.l - shift); if (hsl.s > 0) hsl.s = Math.min(100, hsl.s + (intensity * 30)); }
    return hslToHex(hsl.h, hsl.s, hsl.l);
};

const createNoise = (w: number, h: number, alpha = 100, scale = 2, density = 0.45) => {
    if (w <= 0 || h <= 0) return null;
    const nw = Math.ceil(w / scale), nh = Math.ceil(h / scale);
    const nc = document.createElement('canvas'); nc.width = nw; nc.height = nh;
    const nCtx = nc.getContext('2d'); if (!nCtx) return null;
    const iData = nCtx.createImageData(nw, nh), buffer = new Uint32Array(iData.data.buffer);
    for (let i = 0; i < buffer.length; i++) if (Math.random() < density) buffer[i] = (alpha << 24) | 0;
    nCtx.putImageData(iData, 0, 0); return nc;
};

const drawSmoothLine = (context: CanvasRenderingContext2D, points: { x: number, y: number }[]) => {
    if (points.length < 2) return;
    context.beginPath(); 
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2, yc = (points[i].y + points[i + 1].y) / 2;
        context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
};

// Draw without smoothing - for uniform line strokes to maintain exact width
const drawStraightLine = (context: CanvasRenderingContext2D, points: { x: number, y: number }[]) => {
    if (points.length < 2) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i].x, points[i].y);
    }
};

const getLayerBoundingBox = (shapes: Shape[]) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let ctx: CanvasRenderingContext2D | null = null;

    shapes.forEach(s => {
        if (s.type === 'text' && s.text && s.points.length > 0) {
            // Text Handling
            if (!ctx) ctx = document.createElement('canvas').getContext('2d');
            if (ctx) {
                const fontSize = s.fontSize || 40;
                const fontName = s.font === 'noir' ? '"Courier Prime", monospace' : s.font === 'mansion' ? '"Cinzel", serif' : '"Inter", sans-serif';
                ctx.font = `bold ${fontSize}px ${fontName}`;
                
                const lines = s.text.split('\n');
                const lineHeight = fontSize * 1.2;
                const totalHeight = lines.length * lineHeight;
                
                let maxWidth = 0;
                lines.forEach(line => {
                    const m = ctx!.measureText(line);
                    if (m.width > maxWidth) maxWidth = m.width;
                });

                const align = s.align || 'left';
                let xOffset = 0;
                if (align === 'center') xOffset = -maxWidth / 2;
                else if (align === 'right') xOffset = -maxWidth;

                // Local corners relative to anchor (0,0)
                // Text is vertically centered
                const top = -totalHeight / 2;
                const bottom = totalHeight / 2;
                const left = xOffset;
                const right = xOffset + maxWidth;

                const corners = [
                    { x: left, y: top },
                    { x: right, y: top },
                    { x: right, y: bottom },
                    { x: left, y: bottom }
                ];

                const rotation = s.rotation || 0;
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const anchor = s.points[0];

                corners.forEach(p => {
                    // Rotate
                    const rx = p.x * cos - p.y * sin;
                    const ry = p.x * sin + p.y * cos;
                    
                    // Translate to World Position
                    const wx = rx + anchor.x;
                    const wy = ry + anchor.y;

                    if (wx < minX) minX = wx;
                    if (wx > maxX) maxX = wx;
                    if (wy < minY) minY = wy;
                    if (wy > maxY) maxY = wy;
                });
            }
        } else {
            // Stroke Handling
            s.points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
        }
    });
    if (minX === Infinity) return null;
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX)/2, cy: (minY + maxY)/2 };
};
