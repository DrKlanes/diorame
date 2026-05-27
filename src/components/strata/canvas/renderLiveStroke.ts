import { drawSmoothLine } from '../../../utils/canvasUtils';
import { Point } from '../../../types/strataTypes';
import type { Projection } from './transformPoint';

export type RenderLiveStrokeOpts = {
	tool: string;
	palette: string[];
	currentColorIndex: number;
	currentBrushThickness: number;
	isDrawBehind: boolean;
	isDrawInside: boolean;
	isSymmetryEnabled: boolean;
	viewZoom: number;
};

/**
 * Renders the live stroke preview for the current drawing in progress,
 * including the symmetry mirror when isSymmetryEnabled.
 *
 * Three branches per side (main + mirror = 6 paths total, kept duplicated):
 *   - eraser: destination-out fill + dashed white outline
 *   - brush:  stroke with lineWidth = currentBrushThickness * averageScale
 *   - other:  flat fill in the current palette color
 *
 * GUARANTEE: layerCtx.globalCompositeOperation is always reset to
 * 'source-over' before returning, regardless of which branch executed
 * or whether anything was painted at all. The original inline block only
 * reset GCO inside the `length > 1` guards; we add an unconditional
 * trailing reset for robustness. In the normal flow the previous shape
 * loop already leaves GCO in 'source-over', so this is a no-op; in
 * pathological flows it cleans up. Visible behaviour is unchanged.
 *
 * @param layerCtx       Canvas 2D context for this layer
 * @param currentPoints  Points of the in-progress stroke (world coords)
 * @param transformPoint The closure (x, y) => Projection for this layer
 * @param opts           Tool, palette, draw-modifiers and viewZoom
 * @returns              true if any stroke was painted (main or mirror)
 */
export const renderLiveStroke = (
	layerCtx: CanvasRenderingContext2D,
	currentPoints: Point[],
	transformPoint: (x: number, y: number) => Projection,
	opts: RenderLiveStrokeOpts,
): boolean => {
	const {
		tool,
		palette,
		currentColorIndex,
		currentBrushThickness,
		isDrawBehind,
		isDrawInside,
		isSymmetryEnabled,
		viewZoom,
	} = opts;

	let hasContent = false;

	let totalScale = 0;
	const projPoints = currentPoints.map(p => {
		const t = transformPoint(p.x, p.y);
		totalScale += t.scale;
		return { x: t.x, y: t.y };
	});

	// Calculate average scale for perspective-correct preview thickness
	const averageScale = projPoints.length > 0 ? totalScale / projPoints.length : viewZoom;

	if (projPoints.length > 1) {
		hasContent = true;
		if (tool === 'eraser') {
			layerCtx.globalCompositeOperation = 'destination-out';
			layerCtx.fillStyle = '#000000';
			drawSmoothLine(layerCtx, projPoints);
			layerCtx.fill();
			layerCtx.globalCompositeOperation = 'source-over';
			layerCtx.strokeStyle = 'rgba(255,255,255,0.8)';
			layerCtx.lineWidth = 1 * viewZoom;
			layerCtx.setLineDash([5*viewZoom, 5*viewZoom]);
			layerCtx.stroke();
			layerCtx.setLineDash([]);
		} else if (tool === 'brush') {
			if (isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
			else layerCtx.globalCompositeOperation = isDrawInside ? 'source-atop' : 'source-over';

			layerCtx.strokeStyle = palette[currentColorIndex];
			layerCtx.lineWidth = currentBrushThickness * averageScale;
			layerCtx.lineCap = 'round';
			layerCtx.lineJoin = 'round';

			drawSmoothLine(layerCtx, projPoints);
			layerCtx.stroke();
		} else {
			if (isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
			else layerCtx.globalCompositeOperation = isDrawInside ? 'source-atop' : 'source-over';

			layerCtx.fillStyle = palette[currentColorIndex]; /* Redundant ternary removed — both branches identical
			  ? palette[currentColorIndex] // Color for live drawing (gradient not applied during stroke for perf) both branches were identical
			  : palette[currentColorIndex]; */

			drawSmoothLine(layerCtx, projPoints);
			layerCtx.fill();
		}
		layerCtx.globalCompositeOperation = 'source-over';
	}
	// Mirror Stroke
	if (isSymmetryEnabled) {
		let mirrorTotalScale = 0;
		const mirPoints = currentPoints.map(p => {
			const t = transformPoint(-p.x, p.y);
			mirrorTotalScale += t.scale;
			return { x: t.x, y: t.y };
		});
		const mirrorAverageScale = mirPoints.length > 0 ? mirrorTotalScale / mirPoints.length : viewZoom;

		if (mirPoints.length > 1) {
			if (tool === 'eraser') {
				layerCtx.globalCompositeOperation = 'destination-out';
				layerCtx.fillStyle = '#000000';
				drawSmoothLine(layerCtx, mirPoints);
				layerCtx.fill();
				layerCtx.globalCompositeOperation = 'source-over';
				layerCtx.strokeStyle = 'rgba(255,255,255,0.8)';
				layerCtx.lineWidth = 1 * viewZoom;
				layerCtx.setLineDash([5*viewZoom, 5*viewZoom]);
				layerCtx.stroke();
				layerCtx.setLineDash([]);
			} else if (tool === 'brush') {
				if (isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
				else layerCtx.globalCompositeOperation = isDrawInside ? 'source-atop' : 'source-over';
				layerCtx.strokeStyle = palette[currentColorIndex];
				layerCtx.lineWidth = currentBrushThickness * mirrorAverageScale;
				layerCtx.lineCap = 'round';
				layerCtx.lineJoin = 'round';
				drawSmoothLine(layerCtx, mirPoints);
				layerCtx.stroke();
			} else {
				if (isDrawBehind) layerCtx.globalCompositeOperation = 'destination-over';
				else layerCtx.globalCompositeOperation = isDrawInside ? 'source-atop' : 'source-over';
				layerCtx.fillStyle = palette[currentColorIndex];
				drawSmoothLine(layerCtx, mirPoints);
				layerCtx.fill();
			}
			layerCtx.globalCompositeOperation = 'source-over';
		}
	}

	// GUARANTEED reset before return — robust against pathological paths
	layerCtx.globalCompositeOperation = 'source-over';

	return hasContent;
};
