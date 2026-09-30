// A text shape's geometry: `points[0]` is the anchor, and a 2×2 matrix maps the text's local
// frame (x along the line, y down, laid out at `fontSize`) to world units around it. Everything
// that places text — Canvas render, gizmo box, CINEMA picking, SVG export — reads the matrix here,
// never `rotation`, so a stretched or mirrored text is the same shape to all of them.
import type { Shape, TextMatrix } from '../types/strataTypes';

/**
 * The shape's matrix, canvas order (a, b, c, d): world = anchor + (a·x + c·y, b·x + d·y).
 * A text with no `textMatrix` — every one saved before v3.17.56 — is its `rotation` alone.
 */
export const textMatrix = (shape: Shape): TextMatrix => {
	if (shape.textMatrix) return shape.textMatrix;
	const r = shape.rotation || 0;
	return [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r)];
};

// `rotation` next to a matrix is ONLY a hint for older app versions (a cached PWA opening a newer
// file): they ignore textMatrix and would otherwise straighten the text. Nothing here reads it.
const withMatrix = (m: TextMatrix): Pick<Shape, 'textMatrix' | 'rotation'> => ({
	textMatrix: m,
	rotation: Math.atan2(m[1], m[0]),
});

/**
 * The text props after TRANSFORM_LAYER: rotate by `rotation`, then scale each world axis — the
 * same map the reducer applies to every point, so text and strokes deform as one.
 *
 * A uniform transform of a text that has no matrix keeps the legacy bake (fontSize × scale,
 * rotation + delta): files and gestures that never stretched stay byte-identical. Anything else
 * composes into the matrix — a stretch of rotated text is a shear in its own frame, which no
 * rotation + per-axis scale can hold. The uniform part of a transform stays in fontSize.
 */
export const bakeTextTransform = (
	shape: Shape,
	t: { rotation: number; scale: number; sx: number; sy: number; nonUniform: boolean },
): Pick<Shape, 'fontSize' | 'rotation' | 'textMatrix'> => {
	const fontSize = shape.fontSize || 40;
	if (!t.nonUniform && !shape.textMatrix) {
		return { fontSize: fontSize * t.scale, rotation: (shape.rotation || 0) + t.rotation };
	}
	const [a, b, c, d] = textMatrix(shape);
	const cos = Math.cos(t.rotation), sin = Math.sin(t.rotation);
	// Uniform: the scale goes to fontSize and the matrix only rotates. Non-uniform: sx/sy as given.
	const kx = t.nonUniform ? t.sx : 1, ky = t.nonUniform ? t.sy : 1;
	const p00 = kx * cos, p01 = -kx * sin, p10 = ky * sin, p11 = ky * cos;
	return {
		fontSize: t.nonUniform ? fontSize : fontSize * t.scale,
		...withMatrix([p00 * a + p01 * b, p10 * a + p11 * b, p00 * c + p01 * d, p10 * c + p11 * d]),
	};
};

/**
 * The text props after FLIP_LAYER: a true reflection (v3.17.56), glyphs mirrored like any drawing
 * on the layer, so a drawInside shape inside the text still fits. Alignment stays: the matrix
 * mirrors the whole block. Texts flipped the old way (rotation negated, align swapped) are data
 * like any other and open unchanged.
 */
export const flipTextProps = (shape: Shape, direction: 'horizontal' | 'vertical'): Pick<Shape, 'textMatrix' | 'rotation'> => {
	const [a, b, c, d] = textMatrix(shape);
	return withMatrix(direction === 'horizontal' ? [-a, b, -c, d] : [a, -b, c, -d]);
};
