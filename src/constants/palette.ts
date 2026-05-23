// src/constants/palette.ts
// Fuente única de verdad para las paletas fijas de Diorame.
// Las paletas son inmutables por diseño (filosofía Riso).
//
// nameKey: i18n key resolved at render time via t(). The actual translated name
// is derived from the dictionary (palette.color.* / palette.colorAlt.*).

export interface PaletteColor {
	hex: string;
	nameKey: string;
	isDark: boolean; // true si luminancia perceptual (0.299R+0.587G+0.114B)/255 < 0.40
}

export const PALETTE_PRIMARY: PaletteColor[] = [
	{ hex: '#000000', nameKey: 'palette.color.black',    isDark: true  },
	{ hex: '#2f2f30', nameKey: 'palette.color.charcoal', isDark: true  },
	{ hex: '#d0ddd9', nameKey: 'palette.color.silver',   isDark: false },
	{ hex: '#FFFFFF', nameKey: 'palette.color.white',    isDark: false },
	{ hex: '#2B5735', nameKey: 'palette.color.forest',   isDark: true  },
	{ hex: '#3E7A66', nameKey: 'palette.color.pine',     isDark: true  },
	{ hex: '#42AA6C', nameKey: 'palette.color.sage',     isDark: false },
	{ hex: '#6FD452', nameKey: 'palette.color.lime',     isDark: false },
	{ hex: '#8BF989', nameKey: 'palette.color.mint',     isDark: false },
	{ hex: '#223d57', nameKey: 'palette.color.navy',     isDark: true  },
	{ hex: '#4261a1', nameKey: 'palette.color.cobalt',   isDark: true  },
	{ hex: '#387fba', nameKey: 'palette.color.blue',     isDark: false },
	{ hex: '#5ba3d3', nameKey: 'palette.color.sky',      isDark: false },
	{ hex: '#8bcfd0', nameKey: 'palette.color.teal',     isDark: false },
	{ hex: '#80355b', nameKey: 'palette.color.plum',     isDark: true  },
	{ hex: '#8569cd', nameKey: 'palette.color.lavender', isDark: false },
	{ hex: '#bd301e', nameKey: 'palette.color.brick',    isDark: true  },
	{ hex: '#e73d3d', nameKey: 'palette.color.red',      isDark: false },
	{ hex: '#E66FB1', nameKey: 'palette.color.rose',     isDark: false },
	{ hex: '#F2BDC1', nameKey: 'palette.color.blush',    isDark: false },
	{ hex: '#BD9357', nameKey: 'palette.color.sand',     isDark: false },
	{ hex: '#ed8d51', nameKey: 'palette.color.peach',    isDark: false },
	{ hex: '#F5DB6A', nameKey: 'palette.color.butter',   isDark: false },
	{ hex: '#FDEAC9', nameKey: 'palette.color.cream',    isDark: false },
];

export const PALETTE_ALTERNATIVE: PaletteColor[] = [
	{ hex: '#120F16', nameKey: 'palette.colorAlt.black',        isDark: true  },
	{ hex: '#2A2F38', nameKey: 'palette.colorAlt.darkGrey',     isDark: true  },
	{ hex: '#D0D0C8', nameKey: 'palette.colorAlt.lightGrey',    isDark: false },
	{ hex: '#F2F0EA', nameKey: 'palette.colorAlt.offWhite',     isDark: false },
	{ hex: '#2F3D1E', nameKey: 'palette.colorAlt.darkGreen',    isDark: true  },
	{ hex: '#355A1E', nameKey: 'palette.colorAlt.green',        isDark: true  },
	{ hex: '#6E7B3F', nameKey: 'palette.colorAlt.olive',        isDark: false },
	{ hex: '#9DBA7A', nameKey: 'palette.colorAlt.lightGreen',   isDark: false },
	{ hex: '#c0af8a', nameKey: 'palette.colorAlt.beige',        isDark: false },
	{ hex: '#27454A', nameKey: 'palette.colorAlt.darkTeal',     isDark: true  },
	{ hex: '#4E5F78', nameKey: 'palette.colorAlt.blueGrey',     isDark: true  },
	{ hex: '#5F7FA6', nameKey: 'palette.colorAlt.blue',         isDark: false },
	{ hex: '#5C8F8C', nameKey: 'palette.colorAlt.teal',         isDark: false },
	{ hex: '#8FA9C4', nameKey: 'palette.colorAlt.lightBlue',    isDark: false },
	{ hex: '#422c50', nameKey: 'palette.colorAlt.darkPurple',   isDark: true  },
	{ hex: '#7476db', nameKey: 'palette.colorAlt.greyBlue',     isDark: false },
	{ hex: '#661e40', nameKey: 'palette.colorAlt.darkMaroon',   isDark: true  },
	{ hex: '#a53729', nameKey: 'palette.colorAlt.rust',         isDark: true  },
	{ hex: '#C94A4A', nameKey: 'palette.colorAlt.red',          isDark: false },
	{ hex: '#dabec4', nameKey: 'palette.colorAlt.pink',         isDark: false },
	{ hex: '#8A5231', nameKey: 'palette.colorAlt.brown',        isDark: true  },
	{ hex: '#D07A2D', nameKey: 'palette.colorAlt.orange',       isDark: false },
	{ hex: '#C2B84D', nameKey: 'palette.colorAlt.yellowGreen',  isDark: false },
	{ hex: '#e9dd71', nameKey: 'palette.colorAlt.yellow',       isDark: false },
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

// Lookup hex → i18n nameKey. Combina ambas paletas; hex codes son únicos cross-palette.
// Consumido por SwatchGrid para mostrar el nombre traducido como title en hover.
export const COLOR_NAME_KEYS = new Map<string, string>([
	...PALETTE_PRIMARY.map(c => [c.hex, c.nameKey] as const),
	...PALETTE_ALTERNATIVE.map(c => [c.hex, c.nameKey] as const),
]);
