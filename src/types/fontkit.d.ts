// fontkit ships no typings (and @types/fontkit tracks v1). Declared from the package
// source (dist/browser-module.mjs, pinned 2.0.4), and ONLY what svgText.ts uses.
declare module 'fontkit' {
	export interface FontkitPath {
		commands: { command: string; args: number[] }[];
		transform(m0: number, m1: number, m2: number, m3: number, m4: number, m5: number): FontkitPath;
		toSVG(): string;
	}
	export interface FontkitComponent {
		glyphID: number;
		dx: number;
		dy: number;
		scaleX: number;
		scaleY: number;
		scale01: number;
		scale10: number;
	}
	export interface FontkitGlyph {
		id: number;
		name: string;
		path: FontkitPath;
		// Internal (hence the pinned version): raw glyf record, used to re-compose composites.
		_decode(): { numberOfContours: number; components?: FontkitComponent[] } | null;
	}
	export interface FontkitGlyphRun {
		glyphs: FontkitGlyph[];
		positions: { xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }[];
	}
	export interface FontkitFont {
		unitsPerEm: number;
		characterSet: number[];
		layout(text: string, features?: Record<string, boolean>): FontkitGlyphRun;
		getGlyph(id: number): FontkitGlyph;
		glyphForCodePoint(codePoint: number): FontkitGlyph;
		hasGlyphForCodePoint(codePoint: number): boolean;
	}
	export function create(buffer: Uint8Array): FontkitFont;
}
