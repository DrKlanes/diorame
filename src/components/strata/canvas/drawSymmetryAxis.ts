/**
 * Draws the symmetry axis guide as a dashed vertical line at the
 * center of the canvas, offset by the drawing pan X.
 *
 * Resets ctx transform before painting and clears the line dash on exit.
 *
 * @param ctx   Canvas 2D context to draw onto
 * @param w     Canvas width in pixels
 * @param h     Canvas height in pixels
 * @param panX  Horizontal pan offset of the drawing view
 */
export const drawSymmetryAxis = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	panX: number,
): void => {
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)'; // Subtle blue
	ctx.lineWidth = 1;
	ctx.setLineDash([5, 5]); // Dashed line

	// Center line accounting for pan
	const centerX = (w / 2) + panX;

	ctx.beginPath();
	ctx.moveTo(centerX, 0);
	ctx.lineTo(centerX, h);
	ctx.stroke();
	ctx.setLineDash([]); // Reset line dash
};
