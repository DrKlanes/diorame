import { bakeTextTransform } from '../../../utils/textTransform';
import type { Point, Shape } from '../../../types/strataTypes';
import type { TransformRefState } from './renderPipeline';

/**
 * Live Move preview of one shape of the active layer (v3.25.13, out of renderLayerBody.ts verbatim). Mirrors the
 * TRANSFORM_LAYER reducer's per-axis bake so the live preview matches the committed result exactly (no jump on
 * release). Text deforms too (v3.17.56), through the same bakeTextTransform the reducer commits.
 *
 * @returns the moved points, and the shape to paint (text: with its baked transform; otherwise the shape itself)
 */
export function moveTransformPreview(shape: Shape, transform: TransformRefState): { points: Point[]; previewShape: Shape } {
	const t = transform.currentTransform;
	const cx = transform.centerX;
	const cy = transform.centerY;
	const sin = Math.sin(t.rotation);
	const cos = Math.cos(t.rotation);
	const hasNonUniform = t.scaleX !== undefined || t.scaleY !== undefined;
	const sx = hasNonUniform ? Math.max(0.01, t.scaleX ?? t.scale) : t.scale;
	const sy = hasNonUniform ? Math.max(0.01, t.scaleY ?? t.scale) : t.scale;
	let previewShape = shape;
	if (shape.type === 'text') {
		previewShape = { ...shape, ...bakeTextTransform(shape, { rotation: t.rotation, scale: t.scale, sx, sy, nonUniform: hasNonUniform }) };
	}

	const points = shape.points.map(p => {
		const ox = p.x - cx;
		const oy = p.y - cy;
		const rx = (ox * cos - oy * sin) * sx;
		const ry = (ox * sin + oy * cos) * sy;
		return {
			...p,
			x: rx + cx + t.x,
			y: ry + cy + t.y
		};
	});
	return { points, previewShape };
}
