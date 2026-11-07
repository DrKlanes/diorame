import type { FormatOrientation, FormatType } from '../types/strataTypes';
import { orientationFor } from './formatFrame';

// DRAW PNG of the format frame (v3.25.7): output sizes per format and the largest raster this device may make.

export type FormatPreset = {
	id: string;
	name: string;          // "A4", "Full HD"… (not translated: paper and video names)
	ppi?: number;          // print presets: shown as "300 ppp"
	width: number;
	height: number;
};

const mmToPx = (mm: number, ppi: number) => Math.round(mm / 25.4 * ppi);

// [name, short side, long side] in portrait; print sizes in mm with a ppi, screen sizes in px.
const PRINT: readonly [string, number, number, number][] = [
	['A4', 210, 297, 150],
	['A4', 210, 297, 300],
	['A3', 297, 420, 200],
	['A3', 297, 420, 300],
];
const SCREEN: Readonly<Record<Exclude<FormatType, 'A'>, readonly [string, number, number][]>> = {
	'16:9': [['Full HD', 1080, 1920], ['4K', 2160, 3840]],
	'4:3': [['1600 px', 1200, 1600], ['iPad · 2732 px', 2048, 2732], ['4096 px', 3072, 4096]],
	'4:5': [['1080 × 1350', 1080, 1350], ['2160 × 2700', 2160, 2700]],
	'1:1': [['1080', 1080, 1080], ['2048', 2048, 2048], ['4096', 4096, 4096]],
};

/** The sizes offered for a format, in its orientation (landscape swaps the sides). */
export function formatPresets(type: FormatType, orientation: FormatOrientation): FormatPreset[] {
	const landscape = orientationFor(type, orientation) === 'landscape';
	const make = (id: string, name: string, short: number, long: number, ppi?: number): FormatPreset =>
		({ id, name, ppi, width: landscape ? long : short, height: landscape ? short : long });
	if (type === 'A') return PRINT.map(([name, s, l, ppi]) => make(`${name}-${ppi}`, name, mmToPx(s, ppi), mmToPx(l, ppi), ppi));
	return SCREEN[type].map(([name, s, l]) => make(name, name, s, l));
}

// «Dibujo completo» (v3.25.9): output sizes by long side; the short side follows the box's own aspect.
export const DRAWING_LONG_SIDES: readonly number[] = [2048, 3000, 4096];

export function sizeForLongSide(rect: { w: number; h: number }, long: number): { width: number; height: number } {
	return rect.w >= rect.h
		? { width: long, height: Math.max(1, Math.round(long * rect.h / rect.w)) }
		: { width: Math.max(1, Math.round(long * rect.w / rect.h)), height: long };
}

// The export re-renders through renderFrame, which keeps ~4 canvases of the output size alive at once
// (offscreen, helper, composition, temp) plus the result: at A3 300 ppp (17,4 MP) that is ~350 MB. iPadOS
// WebKit caps canvas memory well below a desktop browser, so a touch device gets A4 300 / A3 200 at most.
const AREA_DESKTOP = 18_000_000;  // A3 300 ppp = 3508 × 4961 = 17,4 MP; 4096² = 16,8 MP
const AREA_TOUCH = 9_000_000;     // A4 300 ppp = 8,7 MP; A3 200 ppp = 7,7 MP

export const isTouchDevice = (): boolean => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

export function maxExportArea(): number {
	return isTouchDevice() ? AREA_TOUCH : AREA_DESKTOP;
}

export function presetFits(p: { width: number; height: number }): boolean {
	return p.width * p.height <= maxExportArea();
}

/** Whether this browser actually draws a canvas this big: one too big comes back blank, not as an error. */
export function canvasFits(w: number, h: number): boolean {
	const c = document.createElement('canvas');
	c.width = w; c.height = h;
	const x = c.getContext('2d');
	let ok = false;
	if (x) {
		x.fillRect(w - 1, h - 1, 1, 1);
		ok = x.getImageData(w - 1, h - 1, 1, 1).data[3] !== 0;
	}
	c.width = c.height = 0;
	return ok;
}
