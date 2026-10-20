// Super Riso — the 8 panel controls, their styles, defaults and sanitising. Pure data, shared by
// the reducer (state, .dior) and the engine mapping (canvas/superRiso/panel.ts → fromPanel).

import type { SuperRisoSettings, SuperRisoStyle, SuperRisoPaper } from '../types/strataTypes';

export type SuperRisoPanel = Omit<SuperRisoSettings, 'style' | 'fullQuality'>;

export const SUPER_RISO_PAPERS: readonly SuperRisoPaper[] = ['white', 'natural', 'recycled', 'cream'];
export const SUPER_RISO_REPRINT_FPS: readonly SuperRisoSettings['reprintFps'][] = [0, 4, 6, 8, 12];

/** The lab's defaults for the 8 controls (before a style is applied). */
export const SUPER_RISO_PANEL_DEFAULTS: Readonly<SuperRisoPanel> = {
	inkSet: 'own', maxInks: 6, paper: 'natural', screen: 'grain', screenSize: .5, imperfection: .4, resolution: .7, reprintFps: 0,
};

/** Styles fix the print controls as a starting point; reprintFps is left as it is. */
export const SUPER_RISO_STYLES: Readonly<Record<SuperRisoStyle, { label: string; panel: Partial<SuperRisoPanel> }>> = {
	clean: { label: 'Taller limpio', panel: { inkSet: 'own',  maxInks: 6, paper: 'white',    screen: 'grain', screenSize: .35, imperfection: .2,  resolution: .85 } },
	zine:  { label: 'Fanzine',       panel: { inkSet: 'dpal', maxInks: 4, paper: 'recycled', screen: 'grain', screenSize: .65, imperfection: .75, resolution: .6  } },
	lofi:  { label: 'Lo-fi',         panel: { inkSet: 'own',  maxInks: 4, paper: 'natural',  screen: 'grain', screenSize: .8,  imperfection: .55, resolution: .1 } },
	cmyk:  { label: 'Cuatricromía',  panel: { inkSet: 'cmyk', maxInks: 4, paper: 'white',    screen: 'dots',  screenSize: .45, imperfection: .45, resolution: .7  } },
};

/** State default: the lab defaults + "Taller limpio". */
export const SUPER_RISO_DEFAULTS: Readonly<SuperRisoSettings> = {
	...SUPER_RISO_PANEL_DEFAULTS, ...SUPER_RISO_STYLES.clean.panel, style: 'clean', fullQuality: false,
} as SuperRisoSettings;

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v)) ? Math.min(1, Math.max(0, v)) : d;
const oneOf = <T>(v: unknown, list: readonly T[], d: T): T => (list as readonly unknown[]).includes(v) ? v as T : d;

/**
 * .dior has no allow-list for postProcessing: anything that arrives is merged over the defaults
 * and every field is clamped / checked against its enum, so an old, partial or hand-edited file
 * can never put the engine in an impossible state.
 */
export function sanitizeSuperRiso(incoming: unknown): SuperRisoSettings {
	const s = (incoming && typeof incoming === 'object' ? incoming : {}) as Partial<Record<keyof SuperRisoSettings, unknown>>;
	const d = SUPER_RISO_DEFAULTS;
	const maxInks = typeof s.maxInks === 'number' && Number.isFinite(s.maxInks) ? Math.round(Math.min(8, Math.max(1, s.maxInks))) : d.maxInks;
	return {
		style: oneOf(s.style, Object.keys(SUPER_RISO_STYLES) as SuperRisoStyle[], d.style),
		inkSet: oneOf(s.inkSet, ['own', 'cmyk', 'dpal'] as const, d.inkSet),
		maxInks,
		paper: oneOf(s.paper, SUPER_RISO_PAPERS, d.paper),
		screen: oneOf(s.screen, ['grain', 'dots'] as const, d.screen),
		screenSize: clamp01(s.screenSize, d.screenSize),
		imperfection: clamp01(s.imperfection, d.imperfection),
		resolution: clamp01(s.resolution, d.resolution),
		reprintFps: oneOf(s.reprintFps, SUPER_RISO_REPRINT_FPS, d.reprintFps),
		fullQuality: typeof s.fullQuality === 'boolean' ? s.fullQuality : d.fullQuality,
	};
}

/** Applies a style: its print controls over the current settings (reprint and fullQuality kept). */
export function applySuperRisoStyle(current: SuperRisoSettings, style: SuperRisoStyle): SuperRisoSettings {
	return sanitizeSuperRiso({ ...current, ...SUPER_RISO_STYLES[style].panel, style });
}
