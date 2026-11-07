// DRAW / HQ snapshot renders, extracted from exportHandlers.ts (v3.22.0) so a module can render a project
// without the export UI: dior-render.ts imports this file, and exportHandlers.ts pulls in sonner, whose CSS is
// injected into the page on import.
import { renderFrame, type RenderContext } from './renderPipeline';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { GizmoHandles } from './drawGizmo';
import type { ExportBackground, Shape } from '../../../types/strataTypes';

/** What a render paints: the layers' shapes by z (each in paint order) and the z order. */
export type SnapshotScene = { shapesByZ: Map<number, Shape[]>; sortedZs: number[] };

/** Renders the same framing many times into the same canvases (v3.25.17, timelapse). */
export type SnapshotSession = {
	render: (scene?: SnapshotScene) => { canvas: HTMLCanvasElement; layers: HTMLCanvasElement };
	/** Frees the canvases' bitmaps (iPad memory). The session is unusable afterwards. */
	release: () => void;
};

/**
 * Renders the current scene into a dedicated canvas at `scale`× resolution using the full render pipeline
 * (a true re-render — NOT a bitmap upscale).
 *
 * Critically, every canvas here is created fresh for the export. It NEVER touches the live RAF's offscreen refs,
 * so sizing them to S× cannot disturb the live render. This mirrors animationExportRender.ts's dedicated-canvas
 * pattern.
 *
 * The export canvas is intentionally left at its default size so the first renderFrame's resize branch fires and
 * re-inits the noise canvas at PHYSICAL size (otherwise grain would sample the logical-size snapshot) and the ink
 * texture (`shapePattern`, Math.random). renderScale=S makes the pipeline dimension the raster to S·w × S·h while
 * keeping the framing identical.
 *
 * A session keeps its canvases and refs between renders (v3.25.17, timelapse). When w·S is an integer the resize
 * branch fires only on the first render, and later ones reuse that texture. When it is fractional (renderRectSnapshot's
 * half pixel) the branch fires on EVERY render and re-creates the texture with Math.random: a caller that renders a
 * sequence must seed Math.random identically for each render (timelapse.ts), or the texture changes every frame.
 * One render of a fresh session is exactly what renderSnapshot always did.
 */
export const createSnapshotSession = (
	options: AnimationExportRenderOptions,
	scale: number,
): SnapshotSession => {
	const exportCanvas = document.createElement('canvas');
	const exportCtx = exportCanvas.getContext('2d', { alpha: false })!;

	// Dedicated working canvases — renderFrame's ensureCanvas sizes them to physical.
	const offscreen = document.createElement('canvas');
	const helper = document.createElement('canvas');
	const composition = document.createElement('canvas');
	const pixel = document.createElement('canvas');
	pixel.width = 1; pixel.height = 1;

	// Persistent across renders: the texture and noise made by the first one, and the temp buffer it allocates.
	const shapePatternRef = { current: options.shapePattern };
	const noiseCanvasRef = { current: options.noiseCanvas };
	const tempCanvasRef: { current: HTMLCanvasElement | null } = { current: null };

	const render = (scene: SnapshotScene = options) => {
		const transformHandlesRef: { current: GizmoHandles | null } = { current: null };

		const rc: RenderContext = {
			state: options.state,
			isDrawing: false,
			currentPoints: [],
			shapesByZ: scene.shapesByZ,
			waypoints: [],
			sortedZs: scene.sortedZs,
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
			shapePatternRef,

			// Dedicated canvas refs (never touch the live RAF)
			offscreenCanvasRef: { current: offscreen },
			helperCanvasRef: { current: helper },
			compositionCanvasRef: { current: composition },
			pixelCanvasRef: { current: pixel },
			tempCanvasRef,
			noiseCanvasRef,

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

	const release = () => {
		for (const c of [exportCanvas, offscreen, helper, composition, pixel, tempCanvasRef.current]) {
			if (c) c.width = c.height = 0;
		}
	};

	return { render, release };
};

/** One render of a fresh session: the canvas and the transparent layers buffer. */
export const renderSnapshot = (
	options: AnimationExportRenderOptions,
	scale: number,
): { canvas: HTMLCanvasElement; layers: HTMLCanvasElement } => createSnapshotSession(options, scale).render();

/** A DRAW PNG framing rendered many times (timelapse): `render` returns the frame with its background. */
export type DrawSnapshotSession = {
	render: (scene?: SnapshotScene) => HTMLCanvasElement;
	release: () => void;
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
export const createDrawSnapshotSession = (
	options: AnimationExportRenderOptions,
	scale: number,
	background: ExportBackground,
): DrawSnapshotSession => {
	const session = createSnapshotSession({ ...options, state: { ...options.state, isOnionSkinEnabled: false } }, scale);
	const dark = options.state.isDarkMode;
	let out: HTMLCanvasElement | null = null;
	const render = (scene?: SnapshotScene): HTMLCanvasElement => {
		const { canvas, layers } = session.render(scene);
		if (background === 'paper') return canvas;
		if (background === 'transparent') return layers;
		if (!out) {
			out = document.createElement('canvas');
			out.width = layers.width;
			out.height = layers.height;
		}
		const ctx = out.getContext('2d')!;
		ctx.globalCompositeOperation = 'source-over';
		ctx.fillStyle = dark ? '#000000' : '#ffffff';
		ctx.fillRect(0, 0, out.width, out.height);
		// Same transfer renderFrame does onto its background (phase 3).
		ctx.globalCompositeOperation = dark ? 'source-over' : 'multiply';
		ctx.drawImage(layers, 0, 0);
		return out;
	};
	const release = () => {
		session.release();
		if (out) out.width = out.height = 0;
	};
	return { render, release };
};

export const renderDrawSnapshot = (
	options: AnimationExportRenderOptions,
	scale: number,
	background: ExportBackground,
): HTMLCanvasElement => createDrawSnapshotSession(options, scale, background).render();
