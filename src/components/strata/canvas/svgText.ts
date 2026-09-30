// Text → outlines for the SVG export (v3.17.52). Layout comes from utils/textLayout.ts, the
// same function the Canvas renderer uses; glyph outlines come from the SAME woff2 files the app
// renders with, read by fontkit (lazy chunk, precached by the SW → works offline).
//
// Every word is checked against what THIS browser's Canvas paints for it. A word that does not
// match — a glyph the font lacks (Canvas falls back to a system font), or an outline fontkit
// gets wrong — is exported as live <text> and counted, never as a wrong contour.
import type { FontkitFont, FontkitGlyph, FontkitPath } from 'fontkit';
import type { Shape } from '../../../types/strataTypes';
import { layoutText, TEXT_FONTS, type TextFontKey } from '../../../utils/textLayout';
import interUrl from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import courierUrl from '@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2?url';
import cinzelUrl from '@fontsource/cinzel/files/cinzel-latin-700-normal.woff2?url';
import bangersUrl from '@fontsource/bangers/files/bangers-latin-400-normal.woff2?url';
import inknutUrl from '@fontsource/inknut-antiqua/files/inknut-antiqua-latin-700-normal.woff2?url';

// Same files @font-face serves (fonts.ts), at the weight TEXT_FONTS draws with.
const FONT_URLS: Readonly<Record<TextFontKey, string>> = {
	pharma: interUrl,
	noir: courierUrl,
	mansion: cinzelUrl,
	comic: bangersUrl,
	dungeons: inknutUrl,
};

// Word check: raster size and the structural mismatch (px, 2 px tolerance) that fails a word.
const CHECK_SIZE = 64;
const CHECK_MAX_PX = 4;

export type TextEngine = {
	fonts: Partial<Record<TextFontKey, FontkitFont>>;
	ctx: CanvasRenderingContext2D;       // measuring only: its state must survive the word checks
	checkCtx: CanvasRenderingContext2D;  // word checks: resized per word, which resets its state
	wordOK: Map<string, boolean>;
};

// Text kept live, in SVG coordinates. Words that fail the check: anchored at their start on the
// alphabetic baseline. Whole lines (engine unavailable): anchored like the line, on its middle.
export type TextRun = {
	text: string; x: number; y: number; fontKey: TextFontKey; fontSize: number; rotationDeg: number;
	anchor: 'start' | 'middle' | 'end'; baseline: 'alphabetic' | 'middle';
};

// d = every outline glyph; glyphs = the same, one entry per glyph (resolved one by one before a
// boolean op — resolving a whole text block at once misjudged which contours are counters).
export type TextOutline = { d: string; glyphs: string[]; runs: TextRun[]; fallbackChars: number };

let fontkitModule: typeof import('fontkit') | null = null;
// Parsed faces survive between exports (the woff2 is immutable per build).
const fontCache = new Map<TextFontKey, FontkitFont>();

/** Loads fontkit and the faces the scene uses. null when the scene has no text. */
export const prepareText = async (shapes: Shape[]): Promise<TextEngine | null> => {
	const texts = shapes.filter(s => s.type === 'text' && s.text);
	if (texts.length === 0) return null;
	fontkitModule ??= await import('fontkit');
	const fonts: TextEngine['fonts'] = {};
	for (const key of new Set(texts.map(s => layoutText(s, 1).fontKey))) {
		const spec = TEXT_FONTS[key];
		// Canvas must paint the real face too: it is the reference every word is checked against.
		await document.fonts.load(`${spec.weight} ${CHECK_SIZE}px ${spec.family}`);
		if (!fontCache.has(key)) {
			const buffer = await (await fetch(FONT_URLS[key])).arrayBuffer();
			fontCache.set(key, fontkitModule.create(new Uint8Array(buffer)));
		}
		fonts[key] = fontCache.get(key);
	}
	const ctx = document.createElement('canvas').getContext('2d')!;
	const checkCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
	return { fonts, ctx, checkCtx, wordOK: new Map() };
};

// Composite glyphs re-composed per the TrueType spec: x' = a·x + c·y + e, y' = b·x + d·y + f with
// (a, b, c, d) = (scaleX, scale01, scale10, scaleY). fontkit transposes b and c, which turns a
// rotated component around the wrong way (Inknut's '%').
const glyphPath = (font: FontkitFont, glyph: FontkitGlyph): FontkitPath => {
	const raw = glyph._decode();
	if (!raw || raw.numberOfContours >= 0 || !raw.components?.length) return glyph.path;
	const parts = raw.components.map(c =>
		glyphPath(font, font.getGlyph(c.glyphID)).transform(c.scaleX, c.scale01, c.scale10, c.scaleY, c.dx, c.dy));
	const out = parts[0];
	for (let i = 1; i < parts.length; i++) out.commands.push(...parts[i].commands);
	return out;
};

type Placed = { d: string; glyphs: string[]; width: number };

// One word shaped by fontkit, outlines mapped by (a, b, c, d, e, f) from local text units where
// x runs along the line and y is the alphabetic baseline at 0. Chrome shapes word by word (no
// kerning across spaces) and drops ligatures when letter-spacing ≠ 0: mirrored here.
const shapeWord = (font: FontkitFont, word: string, fontSize: number, ls: number, m: number[]): Placed => {
	const run = font.layout(word, ls ? { liga: false, clig: false, dlig: false } : undefined);
	const sc = fontSize / font.unitsPerEm;
	let pen = 0, d = '';
	const glyphs: string[] = [];
	run.glyphs.forEach((g, i) => {
		const pos = run.positions[i];
		const gx = pen + pos.xOffset * sc, gy = -pos.yOffset * sc;
		// local = [sc, 0, 0, -sc, gx, gy] (font units are y-up), then the caller's matrix m
		const gd = glyphPath(font, g).transform(
			m[0] * sc, m[1] * sc, -m[2] * sc, -m[3] * sc,
			m[0] * gx + m[2] * gy + m[4], m[1] * gx + m[3] * gy + m[5],
		).toSVG();
		if (gd) { glyphs.push(gd); d += gd + ' '; }
		pen += pos.xAdvance * sc + ls * fontSize;
	});
	return { d, glyphs, width: pen };
};

const mask = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
	const data = ctx.getImageData(0, 0, w, h).data;
	const out = new Uint8Array(w * h);
	for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 127 ? 1 : 0;
	return out;
};

// Pixels that differ with no agreeing pixel within 2 px (antialias does not count).
const structuralDiff = (a: Uint8Array, b: Uint8Array, w: number, h: number) => {
	let n = 0;
	for (let y = 2; y < h - 2; y++) {
		for (let x = 2; x < w - 2; x++) {
			const i = y * w + x;
			if (a[i] === b[i]) continue;
			let agree = false;
			for (let dy = -2; dy <= 2 && !agree; dy++) {
				for (let dx = -2; dx <= 2; dx++) {
					const j = i + dy * w + dx;
					if (a[j] === a[i] && b[j] === a[i]) { agree = true; break; }
				}
			}
			if (!agree) n++;
		}
	}
	return n;
};

// Does the fontkit outline of this word match what Canvas paints? Cached per face + word.
const wordMatches = (engine: TextEngine, key: TextFontKey, word: string): boolean => {
	const cacheKey = `${key}\u0000${word}`;
	const cached = engine.wordOK.get(cacheKey);
	if (cached !== undefined) return cached;
	const font = engine.fonts[key]!;
	const spec = TEXT_FONTS[key];
	const ok = (() => {
		for (const ch of word) if (!font.hasGlyphForCodePoint(ch.codePointAt(0)!)) return false;
		const ctx = engine.checkCtx;
		const pad = CHECK_SIZE;
		const outline = shapeWord(font, word, CHECK_SIZE, spec.letterSpacingEm, [1, 0, 0, 1, pad, CHECK_SIZE * 1.5]);
		const w = Math.ceil(outline.width + pad * 2), h = CHECK_SIZE * 2;
		ctx.canvas.width = w; ctx.canvas.height = h;
		ctx.font = `${spec.weight} ${CHECK_SIZE}px ${spec.family}`;
		// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
		ctx.letterSpacing = spec.letterSpacingEm ? `${spec.letterSpacingEm}em` : '0px';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(word, pad, CHECK_SIZE * 1.5);
		const reference = mask(ctx, w, h);
		ctx.clearRect(0, 0, w, h);
		ctx.fill(new Path2D(outline.d));
		return structuralDiff(reference, mask(ctx, w, h), w, h) <= CHECK_MAX_PX;
	})();
	engine.wordOK.set(cacheKey, ok);
	return ok;
};

/**
 * The text shape as outlines in SVG coordinates (world + offset), placed exactly as
 * renderTextShape places it: layoutText lines, textAlign, 'middle' baselines, rotation around
 * the anchor. Words that fail the check come back as runs of live text.
 */
export const textOutline = (engine: TextEngine, shape: Shape, ox: number, oy: number): TextOutline => {
	const fontSize = shape.fontSize || 40;
	const layout = layoutText(shape, fontSize);
	const font = engine.fonts[layout.fontKey]!;
	const ls = layout.spec.letterSpacingEm;
	const ctx = engine.ctx;
	ctx.font = layout.font;
	// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
	ctx.letterSpacing = layout.letterSpacing;
	ctx.textBaseline = 'middle';
	// Offset of the alphabetic baseline from the 'middle' one Canvas draws lines on.
	const alphabeticShift = -ctx.measureText('H').alphabeticBaseline;

	const rot = shape.rotation || 0;
	const cos = Math.cos(rot), sin = Math.sin(rot);
	const ax = shape.points[0].x + ox, ay = shape.points[0].y + oy;
	// local (x along the line, y down) → SVG: rotate around the anchor, like renderTextShape
	const toSvg = (lx: number, ly: number) => ({ x: ax + lx * cos - ly * sin, y: ay + lx * sin + ly * cos });

	let d = '';
	const glyphs: string[] = [];
	const runs: TextRun[] = [];
	let fallbackChars = 0;
	for (const line of layout.lines) {
		// Canvas paints no soft hyphen; tokens = words and runs of spaces (shaped apart, like Chrome)
		const tokens = line.text.replace(/­/g, '').split(/( +)/).filter(Boolean);
		const widths = tokens.map(t => ctx.measureText(t).width);
		const lineWidth = widths.reduce((a, b) => a + b, 0);
		let x = layout.align === 'center' ? -lineWidth / 2 : layout.align === 'right' ? -lineWidth : 0;
		const baseline = line.y + alphabeticShift;
		tokens.forEach((token, i) => {
			if (token.trim()) {
				if (wordMatches(engine, layout.fontKey, token)) {
					const o = toSvg(x, baseline);
					const placed = shapeWord(font, token, fontSize, ls, [cos, sin, -sin, cos, o.x, o.y]);
					d += placed.d;
					glyphs.push(...placed.glyphs);
				} else {
					const o = toSvg(x, baseline);
					runs.push({ text: token, x: o.x, y: o.y, fontKey: layout.fontKey, fontSize, rotationDeg: (rot * 180) / Math.PI, anchor: 'start', baseline: 'alphabetic' });
					fallbackChars += [...token].length;
				}
			}
			x += widths[i];
		});
	}
	return { d, glyphs, runs, fallbackChars };
};

/** Fallback for a whole shape when the text engine could not load (every glyph as live text). */
export const textAsRuns = (shape: Shape, ox: number, oy: number): TextOutline => {
	const fontSize = shape.fontSize || 40;
	const layout = layoutText(shape, fontSize);
	const rot = shape.rotation || 0;
	const ax = shape.points[0].x + ox, ay = shape.points[0].y + oy;
	const anchor = layout.align === 'center' ? 'middle' as const : layout.align === 'right' ? 'end' as const : 'start' as const;
	const runs: TextRun[] = layout.lines.filter(l => l.text).map(l => ({
		text: l.text, x: ax - l.y * Math.sin(rot), y: ay + l.y * Math.cos(rot), fontKey: layout.fontKey, fontSize,
		rotationDeg: (rot * 180) / Math.PI, anchor, baseline: 'middle' as const,
	}));
	return { d: '', glyphs: [], runs, fallbackChars: runs.reduce((n, r) => n + [...r.text].length, 0) };
};

/**
 * The four corners (world units) of a text block's box, rotated like the text: what the SVG
 * canvas must contain. Measured with Canvas when the engine is up; estimated otherwise. Slack on
 * every side covers ascenders, descenders and slanted overhangs (Bangers).
 */
export const textCorners = (engine: TextEngine | null, shape: Shape): { x: number; y: number }[] => {
	const fontSize = shape.fontSize || 40;
	const layout = layoutText(shape, fontSize);
	let width: number;
	if (engine) {
		engine.ctx.font = layout.font;
		// @ts-ignore - letterSpacing is standard in modern browsers but TS might not know
		engine.ctx.letterSpacing = layout.letterSpacing;
		width = Math.max(...layout.lines.map(l => engine.ctx.measureText(l.text).width));
	} else {
		width = Math.max(...layout.lines.map(l => [...l.text].length)) * fontSize * 0.6;
	}
	const slack = fontSize * 0.3;
	const x0 = (layout.align === 'center' ? -width / 2 : layout.align === 'right' ? -width : 0) - slack;
	const x1 = x0 + width + 2 * slack;
	const y0 = -layout.totalHeight / 2 - slack, y1 = layout.totalHeight / 2 + slack;
	const rot = shape.rotation || 0;
	const cos = Math.cos(rot), sin = Math.sin(rot);
	const a = shape.points[0];
	return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([lx, ly]) => ({ x: a.x + lx * cos - ly * sin, y: a.y + lx * sin + ly * cos }));
};

/** Box (SVG units) a live-text run can cover: ≤ 1 em per character wide, ascender to descender
 * tall, rotated like the text. Used only to decide whether an eraser reaches the run. */
export const runBounds = (r: TextRun): { x: number; y: number; w: number; h: number } => {
	const len = [...r.text].length * r.fontSize;
	const x0 = r.anchor === 'middle' ? -len / 2 : r.anchor === 'end' ? -len : 0;
	const y0 = r.baseline === 'middle' ? -0.8 * r.fontSize : -1.1 * r.fontSize;
	const y1 = r.baseline === 'middle' ? 0.8 * r.fontSize : 0.4 * r.fontSize;
	const a = (r.rotationDeg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
	const pts = [[x0, y0], [x0 + len, y0], [x0 + len, y1], [x0, y1]].map(([lx, ly]) => [r.x + lx * cos - ly * sin, r.y + lx * sin + ly * cos]);
	const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
	return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
