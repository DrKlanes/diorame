import { renderDrawSnapshot } from './drawSnapshot';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { DrawFormat, ExportBackground } from '../../../types/strataTypes';

/**
 * DRAW PNG of the format frame (v3.25.7): exactly `format.rect` at width × height px, with the LIVE projection —
 * the camera of the active layer travels in options.camera/state, so the other layers keep the parallax seen on
 * screen (option A, WYSIWYG for the active layer at export time).
 *
 * The frame is on the active layer's plane (DRAW scale 1), so it is the canvas at zoom 1 with the pan that puts
 * its corner at (0, 0), re-drawn at renderScale S = width / rect.w — the same recipe as renderDior (diorRender.ts).
 * The logical size carries half a pixel more so the physical raster, truncated by the canvas, is exactly W × H.
 */
export const renderFormatSnapshot = (
	options: AnimationExportRenderOptions,
	format: DrawFormat,
	width: number,
	height: number,
	background: ExportBackground,
): HTMLCanvasElement => {
	const r = format.rect;
	const S = width / r.w;
	const w = (width + 0.5) / S;
	const h = (height + 0.5) / S;
	return renderDrawSnapshot({
		...options,
		w, h,
		state: { ...options.state, drawingZoom: 1, drawingPan: { x: -w / 2 - r.x, y: -h / 2 - r.y } },
	}, S, background);
};
