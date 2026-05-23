/**
 * Project name sentinel.
 *
 * The default project name is stored as a fixed sentinel in state so it survives
 * language switches and round-trips through .dior files without binding to any
 * specific UI locale. At render time, the sentinel is resolved to the translated
 * label via t('topbar.file.untitledProject').
 *
 * Rules:
 * - State NEVER contains a translated string for the default name.
 * - .dior files persist the sentinel literally.
 * - User-typed names are stored verbatim and never collide with the sentinel
 *   (the chosen value '__UNTITLED__' is unlikely to be typed by users).
 */
export const UNTITLED_PROJECT_SENTINEL = '__UNTITLED__';

/**
 * Filename-safe base for exports (PNG, SVG, SVGZ, MP4, .dior).
 *
 * Pure sanitizer: callers pass the DISPLAY name they want reflected in the file
 * (either the user's custom name or the translated default for the active UI
 * language). NFD normalization strips diacritics so accented characters become
 * their ASCII counterparts ("Proyecto sin título" → "proyecto-sin-titulo",
 * "Mi muñeco" → "mi-muneco"), then non-alphanumerics collapse to dashes.
 */
export function getFilenameBase(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]/gi, '-')
		.toLowerCase();
}
