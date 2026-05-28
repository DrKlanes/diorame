import { drawSmoothLine, drawStraightLine } from '../../../utils/canvasUtils';
import type { Point } from '../../../types/strataTypes';

/**
 * Renders an eraser shape: paints the path with destination-out compositing
 * to mask out the existing layer content. Always uses #000000 as the
 * mask color (irrelevant for destination-out, but explicit for clarity).
 *
 * The caller is responsible for:
 * - Pre-projecting the points (renderPoints already in screen space,
 *   pixel-art-snapped when isPixelArt)
 * - Setting globalAlpha = minOp before calling
 * - Resetting globalCompositeOperation to 'source-over' after the call
 *
 * @param layerCtx          Canvas 2D context for this layer
 * @param renderPoints      Pre-projected and pixel-art-snapped points
 * @param useStraightLines  If true, use lineTo straight segments; otherwise quadratic smoothing
 */
export const renderEraserShape = (
	layerCtx: CanvasRenderingContext2D,
	renderPoints: Point[],
	useStraightLines: boolean,
): void => {
	layerCtx.globalCompositeOperation = 'destination-out';
	layerCtx.fillStyle = '#000000';
	layerCtx.strokeStyle = '#000000';
	if (useStraightLines) drawStraightLine(layerCtx, renderPoints);
	else drawSmoothLine(layerCtx, renderPoints);
	layerCtx.fill();
};
