import type { TranslationParams } from './types';

/**
 * Replaces {key} placeholders in a string with values from params.
 * If a placeholder has no matching param, leaves it as-is for debugging.
 *
 * @example
 *   interpolate('Layer {n}', { n: 3 }) // → 'Layer 3'
 *   interpolate('Hi {name}', {}) // → 'Hi {name}'
 */
export function interpolate(str: string, params: TranslationParams): string {
	return str.replace(/\{(\w+)\}/g, (_, key) =>
		params[key] !== undefined ? String(params[key]) : `{${key}}`
	);
}
