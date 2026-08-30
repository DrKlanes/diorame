import type { Shape } from '../../../types/strataTypes';

/**
 * Which layer holds content under a screen point, and where in the world that is.
 *
 * This is what makes "I touch a nose and the nose gets centred" possible. A fixed
 * reference plane cannot do it: un-projecting a screen pixel onto the mid-plane when
 * the nose lives on layer 10 gives a point on the same line of sight but at a
 * different depth — and under perspective that is a different place in the world.
 * Deterministic and still useless.
 *
 * NOT the hit-test removed in v3.17.18. That one searched for the nearest shape in XY
 * using world coordinates that were themselves wrong. This un-projects CORRECTLY per
 * layer first, and asks afterwards.
 *
 * The caller owns the un-projection: it passes a `worldAt(layerIndex)` closure so this
 * module stays free of camera and projection concerns.
 */

export type PickResult = {
	layerIndex: number;
	/** RAW layer-space z, i.e. layerIndex * -BASE_DEPTH_STEP. */
	z: number;
	x: number;
	y: number;
};

/**
 * Ray casting on the shape's own fill outline.
 *
 * `shape.points` IS the filled contour, not the spine — renderRegularFillShape builds
 * its path straight from these points and calls fill(); the spine lives separately in
 * `originalPoints`. So testing the polygon answers exactly "is this point inside the
 * shape", with no approximation and nothing to precompute.
 *
 * Measured on the example scene (2369 shapes, 96k points): a full pass over every
 * shape costs 0.575ms, and it is BOTH more accurate and cheaper than per-shape
 * bounding boxes (0.745ms, and twice the false positives at the same point — a bbox
 * counts "near the figure" as "on the figure").
 *
 * The renderer smooths between points with quadratic curves, so the filled area
 * differs from the raw polygon by less than the curve's sag. Far below the precision
 * of a finger or a stylus.
 */
const isPointInPolygon = (px: number, py: number, pts: { x: number; y: number }[]): boolean => {
	if (pts.length < 3) return false;
	let inside = false;
	for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
		const xi = pts[i].x, yi = pts[i].y;
		const xj = pts[j].x, yj = pts[j].y;
		if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
			inside = !inside;
		}
	}
	return inside;
};

/**
 * Text shapes carry `points = [anchor]`, so the polygon test can never hit one — a
 * single point has no area. Without this they would be unframeable, which would be an
 * odd hole in a tool the product ships.
 *
 * The box is derived from the same values renderTextShape draws with (fontSize, the
 * line count, and align), using a fixed advance-width estimate per character because
 * measuring text properly would need a canvas context this pure module has no business
 * holding. That estimate is the imprecision: it is generous on narrow characters and
 * tight on wide ones, so the box can miss the very edge of a long line by a few
 * characters' worth. For aiming a camera at a block of text, that is well inside
 * tolerance.
 */
const CHAR_WIDTH_RATIO = 0.55;
const LINE_HEIGHT_RATIO = 1.2;

const isPointInTextBox = (px: number, py: number, shape: Shape): boolean => {
	const anchor = shape.points[0];
	if (!anchor || !shape.text) return false;
	const fontSize = shape.fontSize || 40;
	const lines = shape.text.split('\n');
	const lineHeight = fontSize * LINE_HEIGHT_RATIO;
	const width = Math.max(...lines.map(l => l.length)) * fontSize * CHAR_WIDTH_RATIO;
	const height = lines.length * lineHeight;

	// renderTextShape centres the block vertically on the anchor and honours align
	// horizontally, so the box is placed the same way.
	const top = anchor.y - height / 2;
	const left = shape.align === 'center' ? anchor.x - width / 2
		: shape.align === 'right' ? anchor.x - width
		: anchor.x;

	// Rotated text is tested against its UN-rotated box: rotating the query point back
	// is cheap and keeps the box honest for tilted text.
	let qx = px, qy = py;
	const rot = shape.rotation || 0;
	if (rot !== 0) {
		const dx = px - anchor.x, dy = py - anchor.y;
		const c = Math.cos(-rot), s = Math.sin(-rot);
		qx = anchor.x + (dx * c - dy * s);
		qy = anchor.y + (dx * s + dy * c);
	}
	return qx >= left && qx <= left + width && qy >= top && qy <= top + height;
};

/** True when this shape puts visible content under the point. */
const shapeCoversPoint = (px: number, py: number, shape: Shape): boolean =>
	shape.type === 'text' ? isPointInTextBox(px, py, shape) : isPointInPolygon(px, py, shape.points);

/**
 * Finds the frontmost layer with content under the pointer.
 *
 * @param candidates  Layer indices to consider, ALREADY ordered front-to-back by real
 *                    distance to the camera (ascending dz). Not by layer index: with
 *                    the camera moving in z and layerSpacingFactor variable, index
 *                    order and depth order are not the same thing. The caller is also
 *                    responsible for having dropped empty and hidden layers — you
 *                    cannot point at what you cannot see, and framing something
 *                    invisible would be exactly the inexplicable result this whole
 *                    change exists to remove.
 * @param shapesFor   Shapes of a layer, in paint order.
 * @param worldAt     Un-projects the touched pixel onto that layer's plane. null when
 *                    the plane sits behind the near clip.
 * @returns The hit, or null when nothing is under the pointer — the caller then falls
 *          back to the mid-plane, which is the honest answer when there is nothing to
 *          point at.
 */
export const pickLayerAtPoint = (
	candidates: number[],
	shapesFor: (layerIndex: number) => Shape[],
	worldAt: (layerIndex: number) => { x: number; y: number } | null,
	baseDepthStep: number,
): PickResult | null => {
	for (const layerIndex of candidates) {
		const world = worldAt(layerIndex);
		if (!world) continue;

		const shapes = shapesFor(layerIndex);
		// Walk back-to-front so the LAST covering shape wins within the layer — the one
		// painted on top is the one the user sees. Erasers subtract: landing on one means
		// the content there was rubbed out, so this layer shows nothing at that point and
		// the search moves on. Deciding this in paint order is what makes an eraser hole
		// behave like a hole instead of like content.
		let covered = false;
		for (let i = shapes.length - 1; i >= 0; i--) {
			const shape = shapes[i];
			if (!shapeCoversPoint(world.x, world.y, shape)) continue;
			covered = !shape.isEraser;
			break;
		}
		if (covered) {
			return { layerIndex, z: layerIndex * -baseDepthStep, x: world.x, y: world.y };
		}
	}
	return null;
};
