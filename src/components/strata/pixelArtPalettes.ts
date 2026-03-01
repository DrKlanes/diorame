// --- Pixel Art Palettes & Dithering Constants ---
// Extracted from StrataCanvas to avoid duplication and keep as module-level constants.

// Bayer Matrix for Ordered Dithering (4x4)
export const BAYER_MATRIX_4X4: readonly number[][] = [
	[ 0, 32,  8, 40],
	[48, 16, 56, 24],
	[12, 44,  4, 36],
	[60, 28, 52, 20]
];

// CGA-inspired (Cyan/Magenta/White/Black) - High Contrast - 4 Colors
export const PALETTE_CGA: readonly number[][] = [
	[0,0,0], [85,255,255], [255,85,255], [255,255,255]
];

// 3-bit RGB (8 Colors) - Classic Computer
export const PALETTE_RGB8: readonly number[][] = [
	[0,0,0], [255,0,0], [0,255,0], [0,0,255],
	[255,255,0], [0,255,255], [255,0,255], [255,255,255]
];

// Retro Palette (Pico-8 inspired) - 16 Colors
export const PALETTE_RETRO: readonly number[][] = [
	[0,0,0], [29,43,83], [126,37,83], [0,135,81],
	[171,82,54], [95,87,79], [194,195,199], [255,241,232],
	[255,0,77], [255,163,0], [255,236,39], [0,228,54],
	[41,173,255], [131,118,156], [255,119,168], [255,204,170]
];

// Classic Handheld (Game Boy Style) - Expanded to 8 Colors
export const PALETTE_HANDHELD: readonly number[][] = [
	[8,24,8],      // Deepest Shadow
	[15,56,15],    // Original Darkest
	[30,80,30],    // Mid Shadow
	[48,98,48],    // Original Dark
	[85,130,35],   // Mid Light (Bridge)
	[139,172,15],  // Original Light
	[155,188,15],  // Original Lightest
	[205,230,80]   // New Highlight
];

// Stylized Limited - Modern/Artistic (13 Colors)
export const PALETTE_STYLIZED: readonly number[][] = [
	[20,12,28], [68,36,52], [48,52,109], [78,74,78],
	[133,76,48], [52,101,36], [208,70,72], [117,113,97],
	[89,125,206], [210,125,44], [133,149,161], [218,212,94],
	[83,95,95]     // Shadow Complement (#535f5f)
];
