/**
 * Draws the composition guide: a world-space dot grid (every 50 units) plus a larger
 * marker at the world origin, DRAW mode only.
 *
 * Painted INTO the live canvas as the last overlay, with canvas 'exclusion' — the
 * same recipe it had as a separate DOM <canvas> with CSS mix-blend-mode: exclusion
 * (white at 40 % alpha: soft grey over light paper, grey-white over dark, readable on
 * any colour you paint). The CSS version depended on the browser compositor blending
 * two layers, which iPadOS WebKit does not do reliably on large canvases; a 2D
 * composite op blends pixels inside this canvas, no compositor involved. That relies on
 * the live canvas being opaque everywhere (alpha:false context + drawBackground fills
 * the whole surface).
 *
 * All the dots go into ONE path and ONE fill: per-dot fills cost 13 ms per frame at
 * zoom 0.5 (1 700 dots); a single path costs ~1 ms. The dots never overlap (spacing
 * 50·zoom, radius ≤ 2.5), so one fill paints exactly what N fills did.
 *
 * Resets ctx transform / alpha / composite op and restores them on exit.
 *
 * World → screen (same as the overlay it replaces):
 *   screen.x = w/2 + worldX * zoom + panX
 *   screen.y = h/2 + worldY * zoom + panY
 *
 * @param ctx   Canvas 2D context of the live canvas
 * @param w     Canvas width in pixels
 * @param h     Canvas height in pixels
 * @param zoom  drawingZoom
 * @param panX  drawingPan.x
 * @param panY  drawingPan.y
 */
const GRID_SPACING_WORLD = 50;
const DOT_RADIUS_BASE = 1;
const DOT_RADIUS_MAX = 2.5;
const CENTER_RADIUS = 2;
const DOT_COLOR = 'rgba(255, 255, 255, 0.4)';
const CENTER_COLOR = 'rgba(255, 255, 255, 0.6)';

export const drawCompositionGuide = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	zoom: number,
	panX: number,
	panY: number,
): void => {
	if (w === 0 || h === 0) return;

	const dotRadius = Math.min(DOT_RADIUS_BASE + Math.max(0, zoom - 1) * 0.5, DOT_RADIUS_MAX);

	// Visible world range derived from the screen viewport
	const worldLeft = (0 - w / 2 - panX) / zoom;
	const worldRight = (w - w / 2 - panX) / zoom;
	const worldTop = (0 - h / 2 - panY) / zoom;
	const worldBottom = (h - h / 2 - panY) / zoom;

	const startX = Math.floor(worldLeft / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
	const endX = Math.ceil(worldRight / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
	const startY = Math.floor(worldTop / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
	const endY = Math.ceil(worldBottom / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'exclusion';

	ctx.fillStyle = DOT_COLOR;
	ctx.beginPath();
	for (let wx = startX; wx <= endX; wx += GRID_SPACING_WORLD) {
		for (let wy = startY; wy <= endY; wy += GRID_SPACING_WORLD) {
			if (wx === 0 && wy === 0) continue; // origin is drawn separately
			const sx = w / 2 + wx * zoom + panX;
			const sy = h / 2 + wy * zoom + panY;
			ctx.moveTo(sx + dotRadius, sy);
			ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
		}
	}
	ctx.fill();

	// Origin marker — slightly larger dot at world (0, 0)
	const cx = w / 2 + panX;
	const cy = h / 2 + panY;
	if (cx >= -4 && cx <= w + 4 && cy >= -4 && cy <= h + 4) {
		ctx.fillStyle = CENTER_COLOR;
		ctx.beginPath();
		ctx.arc(cx, cy, CENTER_RADIUS, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.restore();
};
