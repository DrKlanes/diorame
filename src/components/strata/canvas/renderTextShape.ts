import { hexToRgba, getVibrantVariant } from '../../../utils/colorUtils';
import { BASE_DEPTH_STEP } from '../StrataContext';
import type { Shape, Point, LayerGradParams } from '../../../types/strataTypes';
import type { Projection } from './transformPoint';

export type RenderTextShapeOpts = {
	activeFontSizeScale: number;
	activeRotationDelta: number;
	layerRenderModes: Record<number, 'flat' | 'grad'>;
	layerGradParams: Record<number, LayerGradParams>;
};

/**
 * Renders a single text shape into a layer context.
 *
 * Computes an affine matrix from 3 transformPoint calls (origin + X-axis +
 * Y-axis tangents) to project the text in 3D-projected drawing space, then
 * applies font, rotation, optional gradient fill, and renders each line of
 * text.
 *
 * Uses opts.activeFontSizeScale / activeRotationDelta to apply live transform
 * preview when the move tool is active on the same layer as this shape (the
 * caller resolves transformRef.current and passes these as plain numbers,
 * defaulting to 1.0 and 0.0 when no live transform applies — both no-ops).
 *
 * Symmetry mode does NOT apply to text shapes — only live strokes use it.
 *
 * Pixel art mode does NOT affect text rendering — only the wiggle values
 * (pre-snapped by the caller) carry pixel-art rounding.
 *
 * Defensive: returns false silently if anchorPoint is undefined (can happen
 * after move tool transform preview leaves currentPoints in an edge state).
 *
 * The three @ts-ignore on letterSpacing are preserved verbatim from the
 * original inline block — letterSpacing is a standard CanvasRenderingContext2D
 * property in modern browsers, but TypeScript's lib.dom.d.ts may not include
 * it yet depending on the TS version.
 *
 * @param layerCtx       Canvas 2D context for this layer
 * @param shape          The text Shape (caller guarantees type==='text' and non-empty .text)
 * @param anchorPoint    currentPoints[0] of the shape (world space)
 * @param transformPoint The closure (x, y) => Projection for this layer
 * @param wiggleX        Pre-calculated wiggle X offset (already pixel-art-snapped if needed)
 * @param wiggleY        Pre-calculated wiggle Y offset
 * @param opts           Live transform scales and gradient render config
 * @returns              true if any text was painted (caller propagates to hasContent)
 */
export const renderTextShape = (
	layerCtx: CanvasRenderingContext2D,
	shape: Shape,
	anchorPoint: Point,
	transformPoint: (x: number, y: number) => Projection,
	wiggleX: number,
	wiggleY: number,
	opts: RenderTextShapeOpts,
): boolean => {
	if (!anchorPoint) return false;

	let hasContent = false;

	const effectiveFontSize = (shape.fontSize || 40) * opts.activeFontSizeScale;
	const effectiveRotation = (shape.rotation || 0) + opts.activeRotationDelta;

	// AFFINE PROJECTION APPROACH
	// Solves "weird spacing" and "billboard" issues by projecting the text's local coordinate system
	// onto the screen plane, treating the text block as a cohesive flat surface on the 3D layer.

	const wx = anchorPoint.x;
	const wy = anchorPoint.y;

	// 1. Calculate Basis Vectors in World Space (rotated by text rotation)
	// We use a small step to sample the local tangent plane
	const step = 10;
	const cos = Math.cos(effectiveRotation);
	const sin = Math.sin(effectiveRotation);

	const pOrigin = transformPoint(wx, wy);

	// World point one 'step' along text's X axis
	const pX = transformPoint(wx + step * cos, wy + step * sin);

	// World point one 'step' along text's Y axis (down)
	const pY = transformPoint(wx - step * sin, wy + step * cos);

	if (pOrigin.opacity > 0.01) {
		hasContent = true;

		// Calculate Affine Transform Matrix
		// Scale factor cancels out 'step'
		const m11 = (pX.x - pOrigin.x) / step;
		const m12 = (pX.y - pOrigin.y) / step;
		const m21 = (pY.x - pOrigin.x) / step;
		const m22 = (pY.y - pOrigin.y) / step;

		layerCtx.save();

		// Apply Transform: Maps World Unit -> Screen Pixel
		layerCtx.setTransform(m11, m12, m21, m22, pOrigin.x + wiggleX, pOrigin.y + wiggleY);

		let fontName = '"Inter", sans-serif';
		if (shape.font === 'noir') fontName = '"Courier Prime", monospace';
		else if (shape.font === 'mansion') fontName = '"Cinzel", serif';
		else if (shape.font === 'comic') fontName = '"Bangers", system-ui';
		else if (shape.font === 'dungeons') fontName = '"Inknut Antiqua", serif';

		// Font size is in World Units (which setTransform maps to Screen Pixels)
		layerCtx.font = `bold ${effectiveFontSize}px ${fontName}`;

		// Apply letter spacing
		if (shape.font === 'dungeons') {
			// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
			layerCtx.letterSpacing = '-0.04em';
		} else if (shape.font === 'comic') {
			// @ts-ignore
			layerCtx.letterSpacing = '0.05em'; // Slight spacing for comic
		} else {
			// @ts-ignore
			layerCtx.letterSpacing = '0px';
		}

		layerCtx.globalAlpha = pOrigin.opacity;
		layerCtx.textAlign = shape.align || 'left';
		layerCtx.textBaseline = 'middle';

		const lines = shape.text!.split('\n');
		const lineHeight = effectiveFontSize * 1.2;
		const totalHeight = lines.length * lineHeight;
		const startY = -(totalHeight / 2) + (lineHeight / 2);

		// Apply paletteMode gradient (mirrors shape path; bbox in local text coords)
		const shapeLayerIndex = Math.round(Math.abs(shape.zIndex / BASE_DEPTH_STEP));
		const renderMode = opts.layerRenderModes?.[shapeLayerIndex] || 'flat';
		if (renderMode === 'grad') {
			let maxWidth = 0;
			for (const l of lines) {
				const w = layerCtx.measureText(l).width;
				if (w > maxWidth) maxWidth = w;
			}
			const align = shape.align || 'left';
			let minX = 0, maxX = maxWidth;
			if (align === 'center') { minX = -maxWidth / 2; maxX = maxWidth / 2; }
			else if (align === 'right') { minX = -maxWidth; maxX = 0; }
			const minY = -totalHeight / 2, maxY = totalHeight / 2;
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
			layerCtx.fillStyle = grad;
		} else {
			layerCtx.fillStyle = shape.color;
		}

		lines.forEach((line, i) => {
			layerCtx.fillText(line, 0, startY + i * lineHeight);
		});

		layerCtx.restore();
	}

	return hasContent;
};
