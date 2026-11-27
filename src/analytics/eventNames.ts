/**
 * Diorame · analytics/eventNames.ts
 * ---------------------------------------------------------------------------
 * Evento de la app → nombre del evento en GoatCounter (que no admite
 * parámetros): `app_<evento>` y, cuando aporta, `/<parámetro clave>`.
 * `null` = no se envía. Módulo puro (tests/analyticsNames.test.ts).
 *
 * Al nombre solo llegan enumerados de la propia app: nunca texto libre, nombres
 * de archivo ni contenido del dibujo.
 * ---------------------------------------------------------------------------
 */

import type { DioramEventMap, DioramEventName } from './events';

/** Clases de error que pueden viajar en el nombre. Todo lo demás es `other`. */
const ERROR_TYPES: ReadonlySet<string> = new Set([
	'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError',
	'AbortError', 'DataCloneError', 'EncodingError', 'InvalidStateError', 'NotAllowedError', 'NotReadableError',
	'NotSupportedError', 'QuotaExceededError', 'SecurityError',
]);

/** La clase del error si el mensaje la declara («Uncaught TypeError: …»); nunca el mensaje. */
export function errorType(description: string): string {
	const m = description.match(/^(?:Uncaught (?:\(in promise\) )?)?([A-Za-z]+):/);
	return m && ERROR_TYPES.has(m[1]) ? m[1] : 'other';
}

const slug = (value: unknown) => String(value).replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 30) || 'unknown';

type Suffix<K extends DioramEventName> = (params: DioramEventMap[K]) => string | null;

/** '' = sin parámetro. Un evento nuevo obliga a decidirlo aquí (lo exige el tipo). */
const SUFFIX: { [K in DioramEventName]: Suffix<K> } = {
	canvas_ready: () => '',
	mobile_blocked: () => '',
	// Sin su único parámetro (lang) duplica a mobile_blocked: no se envía.
	mobile_gate_shown: () => null,
	mobile_link_shared: () => '',
	mobile_link_copied: () => '',
	mobile_video_opened: () => '',
	mobile_landing_opened: () => '',
	first_stroke: p => slug(p.tool),
	stroke_milestone: p => slug(p.strokes),
	layer_added: () => '',
	camera_preset_used: p => slug(p.preset),
	filter_applied: p => slug(p.filter),
	artwork_exported: p => slug(p.format),
	project_saved: () => '',
	project_loaded: () => '',
	welcome_modal: p => slug(p.action),
	tour_video: p => slug(p.action),
	layers_tooltip_shown: () => '',
	layers_tooltip_dismissed: p => slug(p.method),
	exception: p => `${p.fatal ? 'fatal' : 'error'}/${errorType(p.description)}`,
	session_depth: p => slug(p.reached),
};

export function goatEventName<K extends DioramEventName>(name: K, params: DioramEventMap[K]): string | null {
	const suffix = (SUFFIX[name] as Suffix<K>)(params);
	if (suffix === null) return null;
	return suffix ? `app_${name}/${suffix}` : `app_${name}`;
}
