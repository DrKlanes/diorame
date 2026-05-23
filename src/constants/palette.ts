// src/constants/palette.ts
// Fuente única de verdad para las paletas fijas de Diorame.
// Las paletas son inmutables por diseño (filosofía Riso).

export interface PaletteColor {
	hex: string;
	name: string;
	isDark: boolean; // true si luminancia perceptual (0.299R+0.587G+0.114B)/255 < 0.40
}

export const PALETTE_PRIMARY: PaletteColor[] = [
	{ hex: '#000000', name: 'Black',    isDark: true  },
	{ hex: '#2f2f30', name: 'Charcoal', isDark: true  },
	{ hex: '#d0ddd9', name: 'Silver',   isDark: false },
	{ hex: '#FFFFFF', name: 'White',    isDark: false },
	{ hex: '#2B5735', name: 'Forest',   isDark: true  },
	{ hex: '#3E7A66', name: 'Pine',     isDark: true  },
	{ hex: '#42AA6C', name: 'Sage',     isDark: false },
	{ hex: '#6FD452', name: 'Lime',     isDark: false },
	{ hex: '#8BF989', name: 'Mint',     isDark: false },
	{ hex: '#223d57', name: 'Navy',     isDark: true  },
	{ hex: '#4261a1', name: 'Cobalt',   isDark: true  },
	{ hex: '#387fba', name: 'Blue',     isDark: false },
	{ hex: '#5ba3d3', name: 'Sky',      isDark: false },
	{ hex: '#8bcfd0', name: 'Teal',     isDark: false },
	{ hex: '#80355b', name: 'Plum',     isDark: true  },
	{ hex: '#8569cd', name: 'Lavender', isDark: false },
	{ hex: '#bd301e', name: 'Brick',    isDark: true  },
	{ hex: '#e73d3d', name: 'Red',      isDark: false },
	{ hex: '#E66FB1', name: 'Rose',     isDark: false },
	{ hex: '#F2BDC1', name: 'Blush',    isDark: false },
	{ hex: '#BD9357', name: 'Sand',     isDark: false },
	{ hex: '#ed8d51', name: 'Peach',    isDark: false },
	{ hex: '#F5DB6A', name: 'Butter',   isDark: false },
	{ hex: '#FDEAC9', name: 'Cream',    isDark: false },
];

export const PALETTE_ALTERNATIVE: PaletteColor[] = [
	{ hex: '#120F16', name: 'Black',        isDark: true  },
	{ hex: '#2A2F38', name: 'Dark Grey',    isDark: true  },
	{ hex: '#D0D0C8', name: 'Light Grey',   isDark: false },
	{ hex: '#F2F0EA', name: 'Off White',    isDark: false },
	{ hex: '#2F3D1E', name: 'Dark Green',   isDark: true  },
	{ hex: '#355A1E', name: 'Green',        isDark: true  },
	{ hex: '#6E7B3F', name: 'Olive',        isDark: false },
	{ hex: '#9DBA7A', name: 'Light Green',  isDark: false },
	{ hex: '#c0af8a', name: 'Beige',        isDark: false },
	{ hex: '#27454A', name: 'Dark Teal',    isDark: true  },
	{ hex: '#4E5F78', name: 'Blue Grey',    isDark: true  },
	{ hex: '#5F7FA6', name: 'Blue',         isDark: false },
	{ hex: '#5C8F8C', name: 'Teal',         isDark: false },
	{ hex: '#8FA9C4', name: 'Light Blue',   isDark: false },
	{ hex: '#422c50', name: 'Dark Purple',  isDark: true  },
	{ hex: '#7476db', name: 'Grey Blue',    isDark: false },
	{ hex: '#661e40', name: 'Dark Maroon',  isDark: true  },
	{ hex: '#a53729', name: 'Rust',         isDark: true  },
	{ hex: '#C94A4A', name: 'Red',          isDark: false },
	{ hex: '#dabec4', name: 'Pink',         isDark: false },
	{ hex: '#8A5231', name: 'Brown',        isDark: true  },
	{ hex: '#D07A2D', name: 'Orange',       isDark: false },
	{ hex: '#C2B84D', name: 'Yellow Green', isDark: false },
	{ hex: '#e9dd71', name: 'Yellow',       isDark: false },
];

export const GRADIENT_DEFAULTS = {
	angle: 90,
	intensity: 0.2,
	gradType: 'solid' as const,
} satisfies { angle: number; intensity: number; gradType: 'solid' | 'fade' };

// Derivado de ambas paletas. Usado por ColorPalette y SwatchGrid para estilos de contraste.
// Se recalcula automáticamente si se modifican los isDark de las paletas.
export const DARK_COLORS = new Set<string>([
	...PALETTE_PRIMARY.filter(c => c.isDark).map(c => c.hex),
	...PALETTE_ALTERNATIVE.filter(c => c.isDark).map(c => c.hex),
]);
