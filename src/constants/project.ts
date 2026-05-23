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
 * Filesystems are language-agnostic — the sentinel maps to a literal 'untitled'
 * regardless of the active UI language. User-typed names are sanitized by
 * stripping non-alphanumeric characters.
 */
export function getFilenameBase(name: string): string {
	if (name === UNTITLED_PROJECT_SENTINEL) return 'untitled';
	return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}
