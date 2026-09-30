// Text boxes measured with Canvas, from the SAME layout the renderer paints with
// (utils/textLayout.ts). textLayout.ts stays pure; everything that needs a measured width or ink
// extent — the Move gizmo, CINEMA picking, the SVG frame — asks here instead of keeping its own
// estimate. Coordinates are anchor-local and unrotated (x right, y down), as layoutText returns them.
import type { Shape, Point } from '../types/strataTypes';
import { layoutText, type TextLayout } from './textLayout';

export type Box = { x0: number; y0: number; x1: number; y1: number };

export type TextBlockMetrics = {
	layout: TextLayout;
	block: Box; // widest line's advance × the layout's total height, placed by `align`
	ink: Box;   // union of every line's painted extent: what the eye sees, no leading or side bearings
};

let sharedCtx: CanvasRenderingContext2D | null = null;
const measuringCtx = (): CanvasRenderingContext2D => (sharedCtx ??= document.createElement('canvas').getContext('2d')!);

/**
 * Measures a text shape the way renderTextShape paints it: same font, letter spacing, alignment
 * and 'middle' baseline. Fonts must be loaded, as for painting (an unloaded face measures as its
 * fallback, and paints as it too). `ink` falls back to `block` for a shape with nothing visible.
 */
export const measureTextBlock = (shape: Shape, fontSize: number = shape.fontSize || 40, ctx: CanvasRenderingContext2D = measuringCtx()): TextBlockMetrics => {
	const layout = layoutText(shape, fontSize);
	ctx.font = layout.font;
	// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
	ctx.letterSpacing = layout.letterSpacing;
	ctx.textAlign = layout.align;
	ctx.textBaseline = 'middle';

	let width = 0;
	let ink: Box | null = null;
	for (const line of layout.lines) {
		const m = ctx.measureText(line.text);
		width = Math.max(width, m.width);
		if (!line.text.trim()) continue;
		// actualBoundingBox* are relative to the alignment point and the baseline, like fillText's.
		const b: Box = { x0: -m.actualBoundingBoxLeft, x1: m.actualBoundingBoxRight, y0: line.y - m.actualBoundingBoxAscent, y1: line.y + m.actualBoundingBoxDescent };
		ink = ink ? { x0: Math.min(ink.x0, b.x0), x1: Math.max(ink.x1, b.x1), y0: Math.min(ink.y0, b.y0), y1: Math.max(ink.y1, b.y1) } : b;
	}

	const x0 = layout.align === 'center' ? -width / 2 : layout.align === 'right' ? -width : 0;
	const block: Box = { x0, x1: x0 + width, y0: -layout.totalHeight / 2, y1: layout.totalHeight / 2 };
	return { layout, block, ink: ink ?? block };
};

/** The four corners of an anchor-local box once rotated around the anchor, in world units. */
export const rotatedCorners = (box: Box, anchor: Point, rotation: number): Point[] => {
	const cos = Math.cos(rotation), sin = Math.sin(rotation);
	return ([[box.x0, box.y0], [box.x1, box.y0], [box.x1, box.y1], [box.x0, box.y1]] as const).map(([lx, ly]) => ({
		x: anchor.x + lx * cos - ly * sin,
		y: anchor.y + lx * sin + ly * cos,
	}));
};
