// Moving, transforming and flipping a layer: the transform is baked into its shapes (outline and spine;
// text anchor and matrix), one undo step each. The eraser polygon follows only in transformLayer (H8 of
// docs/audit-2026-11.md). Out of StrataContext.tsx (v3.26.18, refactor phase 3A), moved as it was.
import { BASE_DEPTH_STEP } from '../constants/layers';
import { bakeTextTransform, flipTextProps } from '../utils/textTransform';
import { resolveLayerBrush, withInkSeed } from '../utils/layerBrush';
import { pushHistory, createSnapshot } from './history';
import type { AppState, Point, Shape } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function moveLayer(state: AppState, action: Extract<Action, { type: 'MOVE_LAYER' }>): AppState {
	const { layerIndex, deltaX, deltaY } = action.payload;
	// Nothing to move on an empty layer: no history step (an undo that changes nothing
	// feels broken, and it spends one of the MAX_HISTORY_STEPS). A layer holding only
	// eraser shapes is NOT empty and still moves.
	if (!state.shapes.some(s => s.zIndex === layerIndex * -BASE_DEPTH_STEP)) return state;
	const newShapes = state.shapes.map(unseeded => {
		if (unseeded.zIndex === layerIndex * -BASE_DEPTH_STEP) {
			const shape = withInkSeed(unseeded);
			const updatedShape = {
				...shape,
				points: shape.points.map(point => ({
					x: point.x + deltaX,
					y: point.y + deltaY,
					pressure: point.pressure
				}))
			};

			if (shape.originalPoints) {
				updatedShape.originalPoints = shape.originalPoints.map(point => ({
					x: point.x + deltaX,
					y: point.y + deltaY,
					pressure: point.pressure
				}));
			}
			// The eraser's polygon moves with it, as it already did on a resize (v3.26.22).
			if (shape.eraserPolygon) {
				updatedShape.eraserPolygon = shape.eraserPolygon.map(point => ({
					x: point.x + deltaX,
					y: point.y + deltaY,
					pressure: point.pressure
				}));
			}
			return updatedShape;
		}
		return unseeded;
	});
	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
	return {
		...state,
		shapes: newShapes,
		history,
		historyIndex: index,
		isDirty: true,
	};
}

export function transformLayer(state: AppState, action: Extract<Action, { type: 'TRANSFORM_LAYER' }>): AppState {
	const { layerIndex, transform } = action.payload;
	// Same guard as MOVE_LAYER: an empty layer gets no history step.
	if (!state.shapes.some(s => s.zIndex === layerIndex * -BASE_DEPTH_STEP)) return state;
	const { rotation, scale, dx, dy, centerX, centerY } = transform;
	const sin = Math.sin(rotation);
	const cos = Math.cos(rotation);

	const newShapes = state.shapes.map(unseeded => {
		if (unseeded.zIndex === layerIndex * -BASE_DEPTH_STEP) {
			const shape = withInkSeed(unseeded);
			// Non-uniform deformation (squash & stretch), text included (v3.17.56): its
			// anchor moves like any point and its matrix absorbs the stretch. When
			// scaleX/scaleY are absent (every legacy uniform transform), sx===sy===scale
			// and the formula below reduces to the original uniform bake byte-identically.
			const hasNonUniform = transform.scaleX !== undefined || transform.scaleY !== undefined;
			// Clamp ONLY the non-uniform axes to prevent flip/collapse (scale <= 0).
			// The uniform path is left untouched to preserve exact legacy behavior.
			const sx = hasNonUniform ? Math.max(0.01, transform.scaleX ?? scale) : scale;
			const sy = hasNonUniform ? Math.max(0.01, transform.scaleY ?? scale) : scale;

			// Handle Text specific transforms (utils/textTransform.ts)
			const newProps = shape.type === 'text'
				? bakeTextTransform(shape, { rotation, scale, sx, sy, nonUniform: hasNonUniform })
				: {};

			const transformPoint = (point: Point) => {
				// 1. Translate to origin
				const ox = point.x - centerX;
				const oy = point.y - centerY;

				// 2. Rotate & Scale (per-axis). sx===sy===scale reduces this to the
				//    original uniform formula exactly.
				const rx = (ox * cos - oy * sin) * sx;
				const ry = (ox * sin + oy * cos) * sy;

				// 3. Translate back & Apply delta
				return {
					x: rx + centerX + dx,
					y: ry + centerY + dy,
					pressure: point.pressure
				};
			};

			const updatedShape = {
				...shape,
				...newProps,
				points: shape.points.map(transformPoint)
			};

			if (shape.originalPoints) {
				updatedShape.originalPoints = shape.originalPoints.map(transformPoint);
			}

			// #7: bake eraserPolygon with the SAME transformPoint so the eraser's SVG-export
			// mask/bounds stay coherent with the deformed points. Erasers are never text, so
			// under uniform scale this matches the canvas result (canvas always used `points`);
			// it only improves SVG export coherence (was stale before).
			if (shape.eraserPolygon) {
				updatedShape.eraserPolygon = shape.eraserPolygon.map(transformPoint);
			}

			// D3 (v3.26.22): the stored thickness follows the geometry in the three brush modes, as it
			// already did on a merge, so the slider keeps saying what is on the canvas and the next
			// re-style no longer snaps the stroke back to its old width. A per-axis stretch has no single
			// width: the geometric mean of the two factors. Stored exact, rounded only for display (D4).
			if (shape.brushThickness !== undefined) {
				updatedShape.brushThickness = shape.brushThickness * (hasNonUniform ? Math.sqrt(Math.abs(sx * sy)) : Math.abs(scale));
			}

			return updatedShape;
		}
		return unseeded;
	});
	// The layer's pair follows its strokes, and the slider with it when the layer is the active one.
	const layerBrush = resolveLayerBrush(newShapes, layerIndex, state.layerBrushSettings[layerIndex]);
	const layerBrushSettings = layerBrush ? { ...state.layerBrushSettings, [layerIndex]: layerBrush } : state.layerBrushSettings;
	const slider = layerBrush && layerIndex === state.currentLayerIndex
		? { currentBrushThickness: layerBrush.thickness, brushMode: layerBrush.mode } : {};
	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes, layerBrushSettings }));
	return {
		...state,
		shapes: newShapes,
		layerBrushSettings,
		...slider,
		history,
		historyIndex: index,
		isDirty: true,
	};
}

export function flipLayer(state: AppState, action: Extract<Action, { type: 'FLIP_LAYER' }>): AppState {
	const { layerIndex, direction, centerX, centerY } = action.payload;
	const layerZ = layerIndex * -BASE_DEPTH_STEP;

	const newShapes = state.shapes.map(unseeded => {
		if (unseeded.zIndex !== layerZ) return unseeded;
		const shape = withInkSeed(unseeded);

		const flipPoint = (point: Point): Point => {
			if (direction === 'horizontal') {
				return { ...point, x: 2 * centerX - point.x };
			} else {
				return { ...point, y: 2 * centerY - point.y };
			}
		};

		// Text mirrors for real, like every drawing on the layer (utils/textTransform.ts)
		const newProps: Partial<Shape> = shape.type === 'text' ? flipTextProps(shape, direction) : {};

		const updatedShape: Shape = {
			...shape,
			...newProps,
			points: shape.points.map(flipPoint)
		};
		// A seeded stroke remembers it was mirrored (v3.26.22): its noise is laid along the normal, which a
		// flip turns over, so a later re-style draws it mirrored and the pattern stays. Two flips cancel.
		if (shape.inkSeed !== undefined) {
			if (shape.inkMirrored) delete updatedShape.inkMirrored;
			else updatedShape.inkMirrored = true;
		}

		if (shape.originalPoints) {
			updatedShape.originalPoints = shape.originalPoints.map(flipPoint);
		}
		// The eraser's polygon mirrors with it, as it already did on a resize (v3.26.22).
		if (shape.eraserPolygon) {
			updatedShape.eraserPolygon = shape.eraserPolygon.map(flipPoint);
		}

		return updatedShape;
	});

	const { history, index } = pushHistory(state.history, state.historyIndex, createSnapshot({ ...state, shapes: newShapes }));
	return {
		...state,
		shapes: newShapes,
		history,
		historyIndex: index,
		isDirty: true,
	};
}
