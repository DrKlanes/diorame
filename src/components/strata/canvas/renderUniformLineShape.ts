import { drawSmoothLine, drawStraightLine } from '../../../utils/canvasUtils';
import { hexToRgba, getVibrantVariant } from '../../../utils/colorUtils';
import { BASE_DEPTH_STEP } from '../StrataContext';
import type { Shape, LayerGradParams } from '../../../types/strataTypes';
import type { Projection } from './transformPoint';

export type RenderUniformLineShapeOpts = {
	layerRenderModes: Record<number, 'flat' | 'grad'>;
	layerGradParams: Record<number, LayerGradParams>;
	pixelArtSize: number; // currentState.postProcessing.pixelArtSize — preserves L1617 byte-perfect
};

/**
 * Renders a uniform-line shape (a stroked path with constant or
 * perspective-scaled thickness). Two sub-modes:
 *
 * 1. isDot mode (pixel art + start ≈ end, distance < 0.15 world units):
 *    paints a zero-length stroke with lineCap='round' (circle) at the
 *    projected start point. After processPixelArt this becomes a round
 *    pixelated dot, consistent with spine-mode round caps.
 *    Threshold is 0.15 (not 0.1) to capture synthetic tap offsets of
 *    {+0.1,+0.1} whose diagonal distance is 0.1×√2 ≈ 0.1414.
 * 2. spine mode (default): projects originalPoints through transformPoint,
 *    accumulates total scale for perspective-correct lineWidth, paints
 *    with lineCap/lineJoin='round' and optional linear gradient.
 *    lineCap and lineJoin are always 'round' — processPixelArt (a pixel-level
 *    post-process) handles the grid quantization, so round caps are correct
 *    in pixel art mode too. The original butt/miter in pixel art was a bug
 *    preserved byte-perfect during the refactor; now corrected.
 *
 * The caller is responsible for:
 * - Setting globalAlpha = minOp before calling
 * - Resetting globalCompositeOperation to 'source-over' after the call
 *
 * The local redeclaration of pSize that existed in the original spine forEach
 * (`const pSize = Math.max(2, pixelArtSize || 4)`) has been REMOVED:
 * the outer pSize passed as parameter already carries that exact value when
 * isPixelArt is true (and the sub-branch is only entered when isPixelArt).
 *
 * @param layerCtx          Canvas 2D context for this layer
 * @param shape             The Shape (must have originalPoints + brushThickness)
 * @param transformPoint    The (x, y) => Projection closure for this layer
 * @param useStraightLines  If true, lineTo straight; otherwise quadratic smoothing
 * @param wiggleX           Pre-calculated wiggle offset X (pixel-art-snapped if needed)
 * @param wiggleY           Pre-calculated wiggle offset Y
 * @param pSize             Pixel art unit size (already resolved by caller, used for dot + snapping)
 * @param isPixelArt        Whether pixel art mode is active
 * @param viewZoom          For averageScale fallback when spine is empty
 * @param opts              Layer render modes, gradient params, and raw pixelArtSize
 */
export const renderUniformLineShape = (
	layerCtx: CanvasRenderingContext2D,
	shape: Shape,
	transformPoint: (x: number, y: number) => Projection,
	useStraightLines: boolean,
	wiggleX: number,
	wiggleY: number,
	pSize: number,
	isPixelArt: boolean,
	viewZoom: number,
	opts: RenderUniformLineShapeOpts,
): void => {
	// Check for degenerate line (single-tap Dot) in Pixel Art mode.
	// Renders a zero-length stroke (lineCap='round') — a circle that
	// processPixelArt quantizes into a round pixelated dot.
	// Threshold is 0.15, not 0.1: a synthetic tap offset of {+0.1, +0.1} has
	// diagonal distance 0.1×√2 ≈ 0.1414, which exceeded the old 0.1 threshold
	// and caused taps to fall into spine mode where snapping collapsed both
	// points to the same grid cell (invisible).
	const pStart = shape.originalPoints![0];
	const pEnd = shape.originalPoints![shape.originalPoints!.length - 1];
	const isDot = isPixelArt && Math.hypot(pStart.x - pEnd.x, pStart.y - pEnd.y) < 0.15;

	if (isDot) {
		const proj = transformPoint(pStart.x, pStart.y);
		const px = Math.round((proj.x + wiggleX) / pSize) * pSize;
		const py = Math.round((proj.y + wiggleY) / pSize) * pSize;

		if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
		else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';

		const size = Math.max(pSize, Math.round(((shape.brushThickness || 20) * proj.scale) / pSize) * pSize);
		layerCtx.strokeStyle = shape.color;
		layerCtx.lineWidth = size;
		layerCtx.lineCap = 'round';
		layerCtx.beginPath();
		layerCtx.moveTo(px, py);
		layerCtx.lineTo(px, py);
		layerCtx.stroke();
	} else {
		// For uniform lines, render the original spine with stroke
		const projectedSpine: { x: number; y: number }[] = [];
		let totalScale = 0;
		shape.originalPoints!.forEach(pt => {
			const proj = transformPoint(pt.x, pt.y);
			let px = proj.x + wiggleX;
			let py = proj.y + wiggleY;
			if (isPixelArt) {
				// Note: the inline `const pSize = Math.max(2, pixelArtSize || 4)` of the
				// original has been removed — the pSize parameter already carries that value.
				px = Math.round(px / pSize) * pSize;
				py = Math.round(py / pSize) * pSize;
			}
			projectedSpine.push({ x: px, y: py });
			totalScale += proj.scale;
		});

		let finalSpine = projectedSpine;
		if (isPixelArt) {
			finalSpine = finalSpine.filter((p, i) =>
				i === 0 || (p.x !== finalSpine[i - 1].x || p.y !== finalSpine[i - 1].y)
			);
		}

		// Calculate average scale for perspective-correct line thickness
		const averageScale = projectedSpine.length > 0 ? totalScale / projectedSpine.length : viewZoom;

		if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
		else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';

		const shapeLayerIndex = Math.round(Math.abs(shape.zIndex / BASE_DEPTH_STEP));
		const renderMode = opts.layerRenderModes?.[shapeLayerIndex] || 'flat';
		if (renderMode === 'grad') {
			let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
			for (let k = 0; k < finalSpine.length; k++) {
				const px = finalSpine[k].x, py = finalSpine[k].y;
				if (px < minX) minX = px; if (px > maxX) maxX = px;
				if (py < minY) minY = py; if (py > maxY) maxY = py;
			}
			const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
			const gradParams = opts.layerGradParams?.[shapeLayerIndex] || { angle: 90, intensity: 0.2 };
			const ang = (gradParams.angle * Math.PI) / 180;
			const r = Math.hypot(maxX - minX, maxY - minY) / 2;
			const grad = layerCtx.createLinearGradient(
				cx - Math.cos(ang) * r, cy - Math.sin(ang) * r,
				cx + Math.cos(ang) * r, cy + Math.sin(ang) * r
			);
			const c = shape.color, ints = gradParams.intensity;
			if (gradParams.gradType === 'fade') {
				const endAlpha = Math.max(0, 1 - (0.2 + ints * 0.8));
				grad.addColorStop(0, hexToRgba(c, 1));
				grad.addColorStop(1, hexToRgba(c, endAlpha));
			} else {
				grad.addColorStop(0, getVibrantVariant(c, ints, 'light'));
				grad.addColorStop(0.5, c);
				grad.addColorStop(1, getVibrantVariant(c, ints, 'dark'));
			}
			layerCtx.strokeStyle = grad;
		} else {
			layerCtx.strokeStyle = shape.color;
		}
		const baseThickness = (shape.brushThickness || 20) * averageScale;
		layerCtx.lineWidth = isPixelArt ? Math.max(baseThickness, opts.pixelArtSize || 4) : baseThickness;
		layerCtx.lineCap = 'round';
		layerCtx.lineJoin = 'round';

		if (useStraightLines) drawStraightLine(layerCtx, finalSpine);
		else drawSmoothLine(layerCtx, finalSpine);

		layerCtx.stroke();
	}
};
