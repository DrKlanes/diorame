import type { Rect } from '../../../utils/formatFrame';

/**
 * DRAW format guide (v3.25.5): dims what falls outside the frame and outlines it. Live overlay only —
 * renderFrame calls it inside the !skipCinematicOverlays block, so no export or re-render ever carries it.
 *
 * `rect` is the frame already in the active layer's plane (frameInView, utils/formatFrame.ts), where the DRAW
 * projection has scale 1:
 *   screen = w/2 + world·zoom + pan
 *
 * Dim = ONE evenodd fill (canvas minus frame) washed with the paper colour at ~50 %, so the outside reads as
 * faded paper rather than a dark mask; the line is a 1 px stroke snapped to the pixel grid.
 */
const DIM_LIGHT = 'rgba(248, 249, 250, 0.5)';   // backgroundBaseColor, light
const DIM_DARK = 'rgba(5, 5, 5, 0.5)';           // backgroundBaseColor, dark
const LINE_LIGHT = 'rgba(0, 0, 0, 0.55)';
const LINE_DARK = 'rgba(255, 255, 255, 0.6)';

export const drawFormatFrame = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	zoom: number,
	pan: { x: number; y: number },
	rect: Rect,
	isDarkMode: boolean,
): void => {
	const z = zoom || 1;
	const x0 = w / 2 + rect.x * z + pan.x;
	const y0 = h / 2 + rect.y * z + pan.y;
	const x1 = x0 + rect.w * z;
	const y1 = y0 + rect.h * z;

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';

	ctx.fillStyle = isDarkMode ? DIM_DARK : DIM_LIGHT;
	ctx.beginPath();
	ctx.rect(0, 0, w, h);
	ctx.rect(x0, y0, x1 - x0, y1 - y0);
	ctx.fill('evenodd');

	const sx0 = Math.round(x0) + 0.5, sy0 = Math.round(y0) + 0.5;
	ctx.strokeStyle = isDarkMode ? LINE_DARK : LINE_LIGHT;
	ctx.lineWidth = 1;
	ctx.strokeRect(sx0, sy0, Math.round(x1) - Math.round(x0), Math.round(y1) - Math.round(y0));

	ctx.restore();
};
