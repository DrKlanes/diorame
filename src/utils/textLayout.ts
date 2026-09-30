// Text layout shared by the Canvas renderer (renderTextShape.ts) and the SVG export
// (svgText.ts): font, weight, letter spacing, line breaks and line positions are computed
// ONCE, so screen and export cannot drift apart.
import type { Shape } from '../types/strataTypes';

export type TextFontKey = NonNullable<Shape['font']>;

type TextFontSpec = {
	family: string;         // CSS font stack for ctx.font
	weight: 'bold' | 'normal';
	letterSpacingEm: number;
};

// Bangers has a single 400 face: drawn at 400, no synthetic bold (v3.17.49).
export const TEXT_FONTS: Readonly<Record<TextFontKey, TextFontSpec>> = {
	pharma:   { family: '"Inter", sans-serif',         weight: 'bold',   letterSpacingEm: 0 },
	noir:     { family: '"Courier Prime", monospace',  weight: 'bold',   letterSpacingEm: 0 },
	mansion:  { family: '"Cinzel", serif',             weight: 'bold',   letterSpacingEm: 0 },
	comic:    { family: '"Bangers", system-ui',        weight: 'normal', letterSpacingEm: 0.05 },
	dungeons: { family: '"Inknut Antiqua", serif',     weight: 'bold',   letterSpacingEm: -0.04 },
};

const LINE_HEIGHT_RATIO = 1.2;

export type TextLayout = {
	fontKey: TextFontKey;
	spec: TextFontSpec;
	font: string;            // value for ctx.font
	letterSpacing: string;   // value for ctx.letterSpacing
	align: 'left' | 'center' | 'right';
	lines: { text: string; y: number }[]; // y = 'middle' baseline, relative to the anchor, unrotated
	totalHeight: number;
};

/**
 * The text block is centred vertically on the anchor (textBaseline 'middle' per line) and
 * aligned horizontally by `align`; rotation is applied around the anchor by the caller.
 * Unknown/missing font keys fall back to Inter, as renderTextShape always did.
 */
export const layoutText = (shape: Shape, fontSize: number): TextLayout => {
	const fontKey: TextFontKey = shape.font && TEXT_FONTS[shape.font] ? shape.font : 'pharma';
	const spec = TEXT_FONTS[fontKey];
	const lines = (shape.text || '').split('\n');
	const lineHeight = fontSize * LINE_HEIGHT_RATIO;
	const totalHeight = lines.length * lineHeight;
	const startY = -(totalHeight / 2) + (lineHeight / 2);
	return {
		fontKey,
		spec,
		font: `${spec.weight} ${fontSize}px ${spec.family}`,
		letterSpacing: spec.letterSpacingEm ? `${spec.letterSpacingEm}em` : '0px',
		align: shape.align || 'left',
		lines: lines.map((text, i) => ({ text, y: startY + i * lineHeight })),
		totalHeight,
	};
};
