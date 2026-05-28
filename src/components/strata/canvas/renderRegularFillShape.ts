import { drawSmoothLine, drawStraightLine } from '../../../utils/canvasUtils';
import { hexToRgba, getVibrantVariant } from '../../../utils/colorUtils';
import { BASE_DEPTH_STEP } from '../StrataContext';
import type { Shape } from '../../../types/strataTypes';

export type RenderRegularFillShapeOpts = {
	layerRenderModes: { [key: number]: 'flat' | 'grad' };
	layerGradParams: { [key: number]: { angle: number; intensity: number; gradType: 'fade' | 'solid' } };
};

/**
 * Renders a regular fill shape: paints a closed polygon with either a flat
 * color or a linear gradient, applying compositing based on the shape's
 * draw modifiers (drawBehind, drawInside).
 *
 * This is the default fill branch of the shape rendering pipeline. It's
 * reached when the shape is NOT a uniform line, NOT an eraser, and NOT a
 * single-point tap (isBrushTap, which returns earlier in the caller).
 *
 * Two distinct point arrays are required:
 * - projectedPoints: raw screen-projected points (NO pixel art snap).
 *   Used to compute the gradient bounding box for correct gradient
 *   alignment regardless of pixel art mode.
 * - renderPoints: pixel-art-snapped points. Used to construct the actual
 *   path that will be filled.
 *
 * The module sets globalCompositeOperation according to drawBehind /
 * drawInside flags but does NOT reset it. The caller is responsible for
 * resetting to 'source-over' after this function returns.
 *
 * The `!shape.isEraser` guard inside the gradient branch is redundant in
 * this context (the caller already routes erasers to renderEraserShape),
 * but is preserved BYTE-PERFECT from the original inline code.
 *
 * @param layerCtx          Canvas 2D context for this layer
 * @param shape             The Shape (must have color, isDrawBehind/Inside, zIndex, isEraser=false)
 * @param projectedPoints   Screen-projected points (no pixel art snap) for gradient bbox
 * @param renderPoints      Pixel-art-snapped points for the fill path
 * @param useStraightLines  If true, use lineTo straight segments; otherwise quadratic smoothing
 * @param opts              Layer render modes and gradient params
 */
export const renderRegularFillShape = (
	layerCtx: CanvasRenderingContext2D,
	shape: Shape,
	projectedPoints: { x: number; y: number }[],
	renderPoints: { x: number; y: number }[],
	useStraightLines: boolean,
	opts: RenderRegularFillShapeOpts,
): void => {
	if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
	else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';

	const shapeLayerIndex = Math.round(Math.abs(shape.zIndex / BASE_DEPTH_STEP));
	const renderMode = opts.layerRenderModes?.[shapeLayerIndex] || 'flat';

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
		const gradParams = opts.layerGradParams?.[shapeLayerIndex] || { angle: 90, intensity: 0.2 };
		const ang = (gradParams.angle * Math.PI) / 180;

		const r = Math.hypot(maxX-minX, maxY-minY)/2;
		const grad = layerCtx.createLinearGradient(
			cx - Math.cos(ang)*r, cy - Math.sin(ang)*r,
			cx + Math.cos(ang)*r, cy + Math.sin(ang)*r
		);
		const c = shape.color, ints = gradParams.intensity;
		if (gradParams.gradType === 'fade') {
			// Fade gradient: solid color → transparent
			const endAlpha = Math.max(0, 1 - (0.2 + ints * 0.8));
			grad.addColorStop(0, hexToRgba(c, 1));
			grad.addColorStop(1, hexToRgba(c, endAlpha));
		} else {
			// Solid gradient: light variant → color → dark variant (default)
			grad.addColorStop(0, getVibrantVariant(c, ints, 'light'));
			grad.addColorStop(0.5, c);
			grad.addColorStop(1, getVibrantVariant(c, ints, 'dark'));
		}
		layerCtx.fillStyle = grad;
	} else {
		layerCtx.fillStyle = shape.color;
	}

	if (useStraightLines) drawStraightLine(layerCtx, renderPoints);
	else drawSmoothLine(layerCtx, renderPoints);
	layerCtx.fill();
};
