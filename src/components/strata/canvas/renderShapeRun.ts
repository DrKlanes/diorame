import type { Shape } from '../../../types/strataTypes';

// One context per nesting depth, reused every frame and resized on demand (the pipeline's
// physical size, an HQ export's, the gizmo box's temp canvas). No objects per frame.
const pool: CanvasRenderingContext2D[] = [];

const groupContext = (depth: number, parent: HTMLCanvasElement): CanvasRenderingContext2D => {
	const ctx = pool[depth] ??= document.createElement('canvas').getContext('2d')!;
	const c = ctx.canvas;
	if (c.width !== parent.width || c.height !== parent.height) {
		c.width = parent.width; c.height = parent.height;
	} else {
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, c.width, c.height);
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
	}
	return ctx;
};

/**
 * Walks a layer's shapes in paint order, resolving isolated groups (Shape.group, merged layers).
 * Consecutive shapes sharing group[depth] are painted on a clean canvas, so their erasers and
 * drawInside/drawBehind reach only each other, and the result lands on the parent as one source-over
 * image. Shapes with no group at this depth go straight to `paint`: a layer without groups costs one
 * property read per shape over the plain loop. Each group costs one full-canvas drawImage per frame.
 *
 * @param ctx    Where this level paints (the layer's canvas at depth 0)
 * @param shapes The layer's shapes, in paint order
 * @param paint  The caller's per-shape painter, given the context of the current level
 */
export const paintShapeRun = (
	ctx: CanvasRenderingContext2D,
	shapes: Shape[],
	paint: (ctx: CanvasRenderingContext2D, shape: Shape) => void,
	depth = 0,
	from = 0,
	to = shapes.length,
): void => {
	let i = from;
	while (i < to) {
		const id = shapes[i].group?.[depth];
		if (id === undefined) {
			paint(ctx, shapes[i]);
			i++;
			continue;
		}
		let end = i + 1;
		while (end < to && shapes[end].group?.[depth] === id) end++;
		const groupCtx = groupContext(depth, ctx.canvas);
		paintShapeRun(groupCtx, shapes, paint, depth + 1, i, end);
		// A painter may leave its blend or alpha behind (the pixel-art tap return, the gizmo box).
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.drawImage(groupCtx.canvas, 0, 0);
		i = end;
	}
};
