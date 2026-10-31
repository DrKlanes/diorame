// DRAW / HQ snapshot renders, extracted from exportHandlers.ts (v3.22.0) so a module can render a project
// without the export UI: dior-render.ts imports this file, and exportHandlers.ts pulls in sonner, whose CSS is
// injected into the page on import.
import { renderFrame, type RenderContext } from './renderPipeline';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { GizmoHandles } from './drawGizmo';
import type { ExportBackground } from '../../../types/strataTypes';

/**
 * Renders the current scene ONCE into a dedicated canvas at `scale`× resolution
 * using the full render pipeline (a true re-render — NOT a bitmap upscale).
 *
 * Critically, every canvas here is created fresh for the export. It NEVER touches
 * the live RAF's offscreen refs, so sizing them to S× cannot disturb the live
 * render. This mirrors animationExportRender.ts's dedicated-canvas pattern.
 *
 * The export canvas is intentionally left at its default size so renderFrame's
 * resize branch fires and re-inits the noise canvas at PHYSICAL size (otherwise
 * grain would sample the logical-size snapshot). renderScale=S makes the pipeline
 * dimension the raster to S·w × S·h while keeping the framing identical.
 */
export const renderSnapshot = (
	options: AnimationExportRenderOptions,
	scale: number,
): { canvas: HTMLCanvasElement; layers: HTMLCanvasElement } => {
	const exportCanvas = document.createElement('canvas');
	const exportCtx = exportCanvas.getContext('2d', { alpha: false })!;

	// Dedicated working canvases — renderFrame's ensureCanvas sizes them to physical.
	const offscreen = document.createElement('canvas');
	const helper = document.createElement('canvas');
	const composition = document.createElement('canvas');
	const pixel = document.createElement('canvas');
	pixel.width = 1; pixel.height = 1;

	const transformHandlesRef: { current: GizmoHandles | null } = { current: null };

	const rc: RenderContext = {
		state: options.state,
		isDrawing: false,
		currentPoints: [],
		shapesByZ: options.shapesByZ,
		waypoints: [],
		sortedZs: options.sortedZs,
		transformState: {
			isActive: false,
			mode: 'none',
			startP: { x: 0, y: 0 },
			startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
			centerX: 0,
			centerY: 0,
			layerBB: null,
			currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
			engaged: false,
		},

		// Read-write refs (fake — mutations stay local to this single render)
		cameraRef: { current: { ...options.camera } },
		storyFocusRef: { current: null },
		lastShakeRef: { current: { x: 0, y: 0, z: 0 } },
		transformHandlesRef,
		// Overlays are skipped in exports, so the marker never draws. 0 = never set.
		poiMarkerSetAtRef: { current: 0 },
		// Escrito por renderFrame; en export no lo lee nadie.
		drawnFrameRef: { current: null },
		lastRenderTimeRef: { current: 0 },
		orbitRef: { current: { azimuth: 0, elevation: 0.2, targetAzimuth: 0, targetElevation: 0.2, panOffsetX: 0, panOffsetY: 0 } },

		accumulatedTimeRef: { current: 0 },
		accumulatedHandheldTimeRef: { current: 0 },
		lastTimeRef: { current: Date.now() },
		wiggleFrameRef: { current: 0 },
		shapePatternRef: { current: options.shapePattern },

		// Dedicated canvas refs (never touch the live RAF)
		offscreenCanvasRef: { current: offscreen },
		helperCanvasRef: { current: helper },
		compositionCanvasRef: { current: composition },
		pixelCanvasRef: { current: pixel },
		tempCanvasRef: { current: null },
		noiseCanvasRef: { current: options.noiseCanvas },

		paperImg: options.paperImg,
		risoGrain: options.risoGrain,
		grungeImg: options.grungeImg,
		particles: options.particles,

		flipButtonsEl: null,
		w: options.w,
		h: options.h,
		getActiveZ: options.getActiveZ,

		skipLiveStroke: true,
		skipCinematicOverlays: true,
		renderScale: scale,
	};

	renderFrame(exportCtx, rc);
	// `offscreen` is where renderFrame composes the layers (transparent, no background) before
	// transferring them onto the paper canvas; DRAW PNG backgrounds are built from it.
	return { canvas: exportCanvas, layers: offscreen };
};

/**
 * DRAW PNG: the drawing exactly as the DRAW canvas shows it now (same zoom, pan, theme and
 * hidden layers — they travel in options.state), re-rendered at `scale`× through the pipeline.
 * Always a re-render, never the live bitmap: the live canvas carries the gizmo, the grid, the
 * guides. Overlays are off (skipCinematicOverlays) and so is the onion skin, an editing aid.
 *
 * In DRAW nothing is painted under the layers except drawBackground (the FX that would —
 * vignette, grain, riso, grunge — need CINEMA), and the layers are composed on a transparent
 * buffer that renderFrame then transfers onto the background with 'multiply' (light) or
 * 'source-over' (dark). So the three backgrounds come from that same buffer:
 *   paper:       the pipeline's own canvas, as on screen.
 *   solid:       pure white (light) / black (dark), layers transferred with the same op.
 *   transparent: the buffer itself — real alpha, nothing under the ink.
 */
export const renderDrawSnapshot = (
	options: AnimationExportRenderOptions,
	scale: number,
	background: ExportBackground,
): HTMLCanvasElement => {
	const { canvas, layers } = renderSnapshot({ ...options, state: { ...options.state, isOnionSkinEnabled: false } }, scale);
	if (background === 'paper') return canvas;
	if (background === 'transparent') return layers;
	const dark = options.state.isDarkMode;
	const out = document.createElement('canvas');
	out.width = layers.width;
	out.height = layers.height;
	const ctx = out.getContext('2d')!;
	ctx.fillStyle = dark ? '#000000' : '#ffffff';
	ctx.fillRect(0, 0, out.width, out.height);
	// Same transfer renderFrame does onto its background (phase 3).
	ctx.globalCompositeOperation = dark ? 'source-over' : 'multiply';
	ctx.drawImage(layers, 0, 0);
	return out;
};
