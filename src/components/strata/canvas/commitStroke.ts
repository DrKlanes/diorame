// Extracted from StrataCanvas.tsx handlePointerUp (refactor phase 6, v3.26.48): from the pointer
// samples of a finished brush / blob / eraser gesture to the shape(s) it commits. Pure — the
// handler still decides WHEN (pointerup, after the touch micro-stroke filter) and dispatches.
// Characterized by tests/commitStroke.test.ts against the output of the inline code before the cut.
import { generateStrokeForMode } from '../../../utils/strokeGenerators';
import type { AppState, Point, Shape } from '../../../types/strataTypes';

export type CommitStrokeState = Pick<AppState, 'tool' | 'blobSmoothing' | 'currentBrushThickness' | 'brushMode' | 'drawingZoom' | 'palette' | 'currentColorIndex' | 'isDrawInside' | 'isDrawBehind' | 'isSymmetryEnabled'>;

/** `shapeMirrored` only with symmetry on: the caller dispatches ADD_SHAPES for the pair, ADD_SHAPE otherwise. */
export const buildStrokeShapes = (points: Point[], state: CommitStrokeState, newZ: number): { shapeOriginal: Shape; shapeMirrored?: Shape } => {
		// Ensure visibility for small shapes (dots/lines) since fill() requires area
	let finalPoints = [...points];
	const isBrushTool = state.tool === 'brush';

	if ((state.tool === 'blob' || state.tool === 'eraser') && state.blobSmoothing && finalPoints.length >= 4) {
		const decimate = (pts: Point[], n: number): Point[] => {
			if (pts.length <= 4) return pts;
			const result: Point[] = [pts[0]];
			for (let i = n; i < pts.length - 1; i += n) {
				result.push(pts[i]);
			}
			result.push(pts[pts.length - 1]);
			return result;
		};
		const chaikinSmooth = (pts: Point[], iterations = 2): Point[] => {
			for (let iter = 0; iter < iterations; iter++) {
				const smoothed: Point[] = [pts[0]];
				for (let i = 0; i < pts.length - 1; i++) {
					smoothed.push({
						x: 0.75 * pts[i].x + 0.25 * pts[i + 1].x,
						y: 0.75 * pts[i].y + 0.25 * pts[i + 1].y
					});
					smoothed.push({
						x: 0.25 * pts[i].x + 0.75 * pts[i + 1].x,
						y: 0.25 * pts[i].y + 0.75 * pts[i + 1].y
					});
				}
				smoothed.push(pts[pts.length - 1]);
				pts = smoothed;
			}
			return pts;
		};
		finalPoints = chaikinSmooth(decimate(finalPoints, 3), 3);
	}

	let originalPoints: Point[] = [];

	if (isBrushTool) {
		if (finalPoints.length === 1) {
			const p = finalPoints[0];
			finalPoints.push({ ...p, x: p.x + 0.1, y: p.y + 0.1 });
		}
		originalPoints = [...finalPoints];
		const thicknessVal = state.currentBrushThickness;
		finalPoints = generateStrokeForMode(state.brushMode, finalPoints, thicknessVal);
	} else if (finalPoints.length < 3) {
		const offset = 1.5 / (state.drawingZoom || 1);
		const last = finalPoints[finalPoints.length - 1];
		if (finalPoints.length === 1) {
			finalPoints.push({ ...last, x: last.x + offset, y: last.y + offset });
			finalPoints.push({ ...last, x: last.x - offset, y: last.y + offset });
		} else if (finalPoints.length === 2) {
			// Turn line into thin triangle
			finalPoints.push({ ...last, x: last.x + offset, y: last.y + offset });
		}
	}

	const isEraserTool = state.tool === 'eraser';
	const eraserPolygon = isEraserTool
		? generateStrokeForMode('tapered', finalPoints, state.currentBrushThickness)
		: undefined;
	const shapeProps = {
		color: state.palette[state.currentColorIndex],
		zIndex: newZ,
		isEraser: isEraserTool,
		isDrawInside: state.isDrawInside,
		isDrawBehind: state.isDrawBehind,
		originalPoints: isBrushTool ? originalPoints : undefined,
		brushThickness: (isBrushTool || isEraserTool) ? state.currentBrushThickness : undefined,
		brushMode: isBrushTool ? state.brushMode : undefined,
		eraserPolygon: isEraserTool ? eraserPolygon : undefined,
	};
	const shapeOriginal: Shape = {
		id: crypto.randomUUID(),
		points: finalPoints,
		...shapeProps
	};

	if (state.isSymmetryEnabled) {
		// For lines, we mirror the original points and then regenerate the taper
		let shapeMirrored: Shape;

		if (isBrushTool) {
			const mirroredOriginals = originalPoints.map(p => ({ ...p, x: -p.x }));
			const thicknessVal = state.currentBrushThickness;
			const mirroredFinals = generateStrokeForMode(state.brushMode, mirroredOriginals, thicknessVal);
			shapeMirrored = {
				id: crypto.randomUUID(),
				points: mirroredFinals,
				...shapeProps,
				originalPoints: mirroredOriginals
		};
		} else {
			shapeMirrored = {
				id: crypto.randomUUID(),
				points: finalPoints.map(p => ({ ...p, x: -p.x })),
				...shapeProps
			};
		}
		return { shapeOriginal, shapeMirrored };
	}
	return { shapeOriginal };
};
