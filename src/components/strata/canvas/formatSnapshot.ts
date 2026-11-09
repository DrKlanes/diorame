import { createDrawSnapshotSession, type DrawSnapshotSession } from './drawSnapshot';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { DrawFormat, ExportBackground } from '../../../types/strataTypes';
import { frameInView, type Rect } from '../../../utils/formatFrame';

/**
 * DRAW PNG of the format frame (v3.25.7): exactly the frame at width × height px, with the LIVE projection —
 * the camera of the active layer travels in options.camera/state, so the other layers keep the parallax seen on
 * screen (WYSIWYG at export time).
 *
 * `format.rect` is in layer 0's plane (v3.25.28): it is taken to the active layer's plane through the same camera
 * (frameInView), so the frame always crops the same region of layer 0. That plane has DRAW scale 1, so it is the
 * canvas at zoom 1 with the pan that puts its corner at (0, 0), re-drawn at renderScale S = width / rect.w — the
 * same recipe as renderDior (diorRender.ts). The logical size carries half a pixel more so the physical raster,
 * truncated by the canvas, is exactly W × H.
 */
export const renderFormatSnapshot = (
	options: AnimationExportRenderOptions,
	format: DrawFormat,
	width: number,
	height: number,
	background: ExportBackground,
): HTMLCanvasElement => renderRectSnapshot(options, frameInView(format, options.camera.z, options.state.isAnimationMode), width, height, background);

/** Any rectangle of the active layer's plane (the frame through frameInView, or «Dibujo completo»'s box, v3.25.9). */
export const renderRectSnapshot = (
	options: AnimationExportRenderOptions,
	r: Rect,
	width: number,
	height: number,
	background: ExportBackground,
): HTMLCanvasElement => createRectSession(options, r, width, height, background).render();

/** The same rectangle rendered many times into the same canvases (v3.25.17, timelapse). */
export const createRectSession = (
	options: AnimationExportRenderOptions,
	r: Rect,
	width: number,
	height: number,
	background: ExportBackground,
): DrawSnapshotSession => {
	const S = width / r.w;
	const w = (width + 0.5) / S;
	const h = (height + 0.5) / S;
	return createDrawSnapshotSession({
		...options,
		w, h,
		state: { ...options.state, drawingZoom: 1, drawingPan: { x: -w / 2 - r.x, y: -h / 2 - r.y } },
	}, S, background);
};
