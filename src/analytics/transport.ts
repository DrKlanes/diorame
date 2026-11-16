/**
 * Diorame · analytics/transport.ts
 * ---------------------------------------------------------------------------
 * Configuración, tráfico interno, saneado y envío a GA4 (gtag).
 * ---------------------------------------------------------------------------
 */

import type { DioramEventMap, DioramEventName } from './events';

/* ===========================================================================
 * 2 · CONFIGURACIÓN
 * ======================================================================== */

/** Host de producción (public/CNAME). En cualquier otro host (localhost, vite preview, previews
 *  de deploy) la analítica se comporta como en dev: log a consola, nada sale a la red. */
const PRODUCTION_HOST = 'diorame.dumaker.com';
const IS_DEV = import.meta.env.DEV
	|| (typeof window !== 'undefined' && window.location.hostname !== PRODUCTION_HOST);
/** Pon VITE_GA_DEBUG=1 en .env.local si quieres enviar de verdad desde dev. */
const FORCE_SEND = import.meta.env.VITE_GA_DEBUG === '1';

const MAX_PARAMS = 25;
const MAX_VALUE_LEN = 100;

/* ---------------------------------------------------------------------------
 * TRÁFICO INTERNO
 * ---------------------------------------------------------------------------
 * Se marca en CLIENTE, no por IP en GA4: la IP doméstica es dinámica, el filtro
 * caduca solo y sin avisar, y en modo Activo descarta datos de forma permanente
 * e irreversible. Un flag en localStorage sobrevive a cambios de IP y no
 * destruye nada: en GA4 se segmenta por comparación cuando haga falta.
 *
 * Alcance: es por CONTEXTO DE NAVEGADOR, no por persona ni por dispositivo.
 * Ver docs/analytics.md.
 * ======================================================================== */

const INTERNAL_FLAG_KEY = 'diorame_internal';

let isInternalTraffic = false;

/**
 * Lee `?internal=1` (activa) o `?internal=0` (desactiva) y persiste el flag.
 * Nunca lanza: si localStorage está bloqueado, el tráfico cuenta como normal.
 */
export function initInternalTraffic(): void {
	try {
		const param = new URLSearchParams(window.location.search).get('internal');
		if (param === '1') localStorage.setItem(INTERNAL_FLAG_KEY, '1');
		else if (param === '0') localStorage.removeItem(INTERNAL_FLAG_KEY);
		isInternalTraffic = localStorage.getItem(INTERNAL_FLAG_KEY) === '1';
	} catch {
		isInternalTraffic = false;
	}

	if (!isInternalTraffic) return;

	// El flag es invisible y se pierde al borrar datos del navegador. Sin esta
	// confirmación no hay forma de saber si sigue puesto.
	console.warn(
		'[analytics] INTERNAL TRAFFIC — este navegador no cuenta como usuario real.',
	);

	// User property de ámbito de usuario. NO es gtag('config'): no reconfigura la
	// etiqueta ni genera page_view.
	try {
		window.gtag?.('set', 'user_properties', { traffic_type: 'internal' });
	} catch {
		/* la analítica nunca tumba la app */
	}
}

function canSend(): boolean {
	if (typeof window === 'undefined') return false;
	if (typeof window.gtag !== 'function') return false;
	if (IS_DEV && !FORCE_SEND) return false;
	return true;
}

/* ===========================================================================
 * 3 · EMISOR
 * ======================================================================== */

function sanitize(params: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	let n = 0;
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null) continue;
		if (n >= MAX_PARAMS) break;
		out[key.slice(0, 40)] =
			typeof value === 'string' ? value.slice(0, MAX_VALUE_LEN) : value;
		n += 1;
	}
	return out;
}

/**
 * Envía un evento a GA4. Nunca lanza: la analítica jamás debe tumbar la app.
 */
export function track<K extends DioramEventName>(
	name: K,
	params: DioramEventMap[K],
): void {
	const payload = sanitize(params as Record<string, unknown>);

	if (IS_DEV) {
		// En dev ves el evento en consola aunque no se envíe.
		console.debug('%c[analytics]', 'color:#8b5cf6', name, payload);
	}

	if (!canSend()) return;

	try {
		window.gtag!('event', name, {
			...payload,
			...(isInternalTraffic ? { traffic_type: 'internal' } : {}),
			// 'beacon' permite que el evento salga aunque la pestaña se esté cerrando.
			transport_type: 'beacon',
		});
	} catch (err) {
		if (IS_DEV) console.warn('[analytics] envío fallido:', name, err);
	}
}

/* ===========================================================================
 * 7 · CONSENTIMIENTO (RGPD)
 * ---------------------------------------------------------------------------
 * Estás en la UE y tienes tráfico europeo. Si algún día pones banner de
 * cookies, esta es la palanca. Hasta entonces no la llames.
 * ======================================================================== */

export function setAnalyticsConsent(granted: boolean): void {
	if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
	window.gtag('consent', 'update', {
		analytics_storage: granted ? 'granted' : 'denied',
	});
}
