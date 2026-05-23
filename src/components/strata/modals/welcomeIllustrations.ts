// Version → welcome illustration asset mapping.
// Key: "major.minor" (patch is ignored so all 1.15.x share the same illustration).
// To add a new illustration: add a new entry and drop the asset in public/welcome-illustrations/.

const WELCOME_ILLUSTRATIONS: Record<string, string> = {
	'1.15': '/welcome-illustrations/v1-15.png',
};

const DEFAULT_ILLUSTRATION = '/welcome-illustrations/v1-15.png';

/**
 * Returns the illustration path for a given app version.
 * Resolves by major.minor, ignores patch. Falls back to DEFAULT_ILLUSTRATION.
 *
 * @example getWelcomeIllustration("1.15.1") → "/welcome-illustrations/v1-15.png"
 */
export function getWelcomeIllustration(version: string): string {
	const parts = version.split('.');
	if (parts.length < 2) return DEFAULT_ILLUSTRATION;
	const majorMinor = `${parts[0]}.${parts[1]}`;
	return WELCOME_ILLUSTRATIONS[majorMinor] ?? DEFAULT_ILLUSTRATION;
}
