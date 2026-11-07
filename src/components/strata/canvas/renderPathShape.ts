import type { Point, Shape, LayerGradParams } from '../../../types/strataTypes';
import type { Projection } from './transformPoint';
import { renderUniformLineShape } from './renderUniformLineShape';
import { renderEraserShape } from './renderEraserShape';
import { renderRegularFillShape } from './renderRegularFillShape';

// Shape outline projection without an object per point (v3.25.6): one scratch projection, a pool of point
// objects that only grows, and the array handed to the painters, holding references into the pool. Painting
// is synchronous and one shape at a time (paintShapeRun never re-enters a shape), so one set is enough.
const proj: Projection = { x: 0, y: 0, scale: 0, opacity: 0 };
const pointPool: { x: number; y: number }[] = [];
const projectedPoints: { x: number; y: number }[] = [];

export type PathShapeParams = {
	isPixelArt: boolean;
	/** The layer's pixel-art snap in device px (pfc.pSize · S): what the uniform line and the tapered dot snap to. */
	pSize: number;
	/** renderScale (HQ export). */
	S: number;
	viewZoom: number;
	pixelArtSize: number;
	layerRenderModes: Record<number, 'flat' | 'grad'>;
	layerGradParams: Record<number, LayerGradParams>;
};

/**
 * Paints one non-text shape of a layer (v3.25.13, out of renderLayerBody.ts verbatim — the caller orchestrates,
 * this module is pure apart from drawing into layerCtx): projects the outline, applies the pixel-art snap, and
 * dispatches to the uniform-line / eraser / tapered-dot / regular-fill painters.
 *
 * Returns whether the shape counts as layer content (`hasContent`): true as soon as the outline has more than one
 * point and a visible opacity — also for a pixel-art brush tap, which is skipped right there and, as before the
 * extraction, leaves `globalAlpha` at the shape's opacity.
 *
 * @param points  The shape's points (already moved by the Move preview, if any)
 */
export function renderPathShape(
	layerCtx: CanvasRenderingContext2D,
	shape: Shape,
	points: Point[],
	projectInto: (x: number, y: number, out: Projection) => void,
	transformPoint: (x: number, y: number) => Projection,
	wiggleX: number,
	wiggleY: number,
	params: PathShapeParams,
): boolean {
	const { isPixelArt, pSize, S, viewZoom } = params;
	const currentPoints = points;

	// Path Handling (v3.25.6: no object per point). The projected points live in a pool reused across
	// shapes and frames; `projectedPoints` holds references to the first n of them. Uniform lines paint
	// their spine (renderUniformLineShape) and only ever read the outline's length and opacity, so the
	// outline is not projected for them: opacity is the layer's, the same at every point.
	const isUniformLine = shape.originalPoints && shape.originalPoints.length > 0 && shape.brushMode === 'uniform';
	const n = currentPoints.length;
	let minOp = 1;
	if (isUniformLine) {
		if (n > 0) {
			projectInto(currentPoints[0].x, currentPoints[0].y, proj);
			if (proj.opacity < minOp) minOp = proj.opacity;
		}
		projectedPoints.length = 0;
	} else {
		for (let i = 0; i < n; i++) {
			const pt = currentPoints[i];
			projectInto(pt.x, pt.y, proj);
			const p = pointPool[i] ??= { x: 0, y: 0 };
			p.x = proj.x + wiggleX;
			p.y = proj.y + wiggleY;
			projectedPoints[i] = p;
			if (proj.opacity < minOp) minOp = proj.opacity;
		}
		projectedPoints.length = n;
	}

	if (!(n > 1 && minOp > 0.01)) return false;

	layerCtx.globalAlpha = minOp;

	// Pixel Art Refinement: Snap Points & Use Straight Lines
	let renderPoints = projectedPoints;
	let useStraightLines = false;
	const isBrushTap = isPixelArt && !isUniformLine && !shape.isEraser && shape.points.length <= 3 && projectedPoints.length > 0;
	// Tap de brush tapered: originalPoints casi coincidentes → polígono de área cero (invisible).
	// generateTaperedStroke con 2 puntos da halfWidth=0 (sin(0)=sin(π)=0). Lo renderizamos como
	// punto redondeado del grosor máximo, idéntico al isDot de renderUniformLineShape.
	// Solo tapered: ink ya es visible (blob orgánico), uniform tiene su propio isDot.
	const isTaperedDot = shape.brushMode === 'tapered' && !shape.isEraser
		&& shape.originalPoints != null && shape.originalPoints.length >= 2
		&& Math.hypot(
			shape.originalPoints[0].x - shape.originalPoints[shape.originalPoints.length - 1].x,
			shape.originalPoints[0].y - shape.originalPoints[shape.originalPoints.length - 1].y
		) < 0.15;

	if (isPixelArt) {
		useStraightLines = true;
		const pSize = Math.max(2, params.pixelArtSize || 4) * S;

		if (isBrushTap) {
			 return true; // Option A: Skip tap strokes entirely in Pixel Art View Mode to avoid artifacts
		}

		renderPoints = projectedPoints.map(p => ({
			x: Math.round(p.x / pSize) * pSize,
			y: Math.round(p.y / pSize) * pSize
		}));
		// Remove duplicate adjacent points
		renderPoints = renderPoints.filter((p, i) =>
			i === 0 || (p.x !== renderPoints[i-1].x || p.y !== renderPoints[i-1].y)
		);

		// Ensure at least 2 points
		if (renderPoints.length < 2 && projectedPoints.length >= 2) {
			 renderPoints = [
				 { x: Math.round(projectedPoints[0].x/pSize)*pSize, y: Math.round(projectedPoints[0].y/pSize)*pSize },
				 { x: Math.round(projectedPoints[projectedPoints.length-1].x/pSize)*pSize, y: Math.round(projectedPoints[projectedPoints.length-1].y/pSize)*pSize }
			 ];
		}
	}

	if (isUniformLine) {
		// Extracted to canvas/renderUniformLineShape.ts
		renderUniformLineShape(
			layerCtx,
			shape,
			transformPoint,
			useStraightLines,
			wiggleX,
			wiggleY,
			pSize,
			isPixelArt,
			viewZoom,
			{
				layerRenderModes: params.layerRenderModes,
				layerGradParams: params.layerGradParams,
				pixelArtSize: params.pixelArtSize,
			},
		);
	} else if (shape.isEraser) {
		// Extracted to canvas/renderEraserShape.ts
		renderEraserShape(layerCtx, renderPoints, useStraightLines);
	} else if (isTaperedDot) {
		// Tapered tap: render as round dot — zero-length stroke with lineCap='round'.
		// Same mechanism as renderUniformLineShape's isDot branch.
		const proj = transformPoint(shape.originalPoints![0].x, shape.originalPoints![0].y);
		let px = proj.x + wiggleX;
		let py = proj.y + wiggleY;
		if (isPixelArt) {
			px = Math.round(px / pSize) * pSize;
			py = Math.round(py / pSize) * pSize;
		}
		if (shape.isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
		else layerCtx.globalCompositeOperation = shape.isDrawInside ? 'source-atop' : 'source-over';
		const size = isPixelArt
			? Math.max(pSize, Math.round(((shape.brushThickness || 20) * proj.scale) / pSize) * pSize)
			: (shape.brushThickness || 20) * proj.scale;
		layerCtx.strokeStyle = shape.color;
		layerCtx.lineWidth = size;
		layerCtx.lineCap = 'round';
		layerCtx.beginPath();
		layerCtx.moveTo(px, py);
		layerCtx.lineTo(px, py);
		layerCtx.stroke();
	} else {
		// Extracted to canvas/renderRegularFillShape.ts
		renderRegularFillShape(
			layerCtx,
			shape,
			projectedPoints,
			renderPoints,
			useStraightLines,
			{
				layerRenderModes: params.layerRenderModes,
				layerGradParams: params.layerGradParams,
			},
		);
	}

	layerCtx.globalCompositeOperation = 'source-over';
	layerCtx.globalAlpha = 1.0;
	return true;
}
