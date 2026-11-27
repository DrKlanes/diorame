/**
 * Diorame · analytics/transport.ts
 * ---------------------------------------------------------------------------
 * Carga de GoatCounter, tráfico interno y envío. Sin cookies: count.js solo
 * LEE `localStorage.skipgc` y envía con sendBeacon.
 * ---------------------------------------------------------------------------
 */

import type { DioramEventMap, DioramEventName } from './events';
import { goatEventName } from './eventNames';

/* ===========================================================================
 * 2 · CONFIGURACIÓN
 * ======================================================================== */

/** Host de producción (public/CNAME). En cualquier otro host (localhost, vite preview, previews
 *  de deploy) la analítica va en modo consola: no se carga count.js ni sale nada a la red. */
const PRODUCTION_HOST = 'diorame.dumaker.com';
const ENDPOINT = 'https://diorame.goatcounter.com/count';
const SCRIPT_SRC = 'https://gc.zgo.at/count.v5.js';
const SCRIPT_SRI = 'sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ';

const IS_PROD = !import.meta.env.DEV
	&& typeof window !== 'undefined' && window.location.hostname === PRODUCTION_HOST;

/** Eventos en espera mientras llega count.js. */
const MAX_QUEUE = 50;

/* ---------------------------------------------------------------------------
 * TRÁFICO INTERNO
 * ---------------------------------------------------------------------------
 * Se marca en CLIENTE con un flag en localStorage (misma clave que la landing).
 * Un navegador interno no carga count.js; además se escribe `skipgc`, la clave
 * que consulta el filtro de GoatCounter.
 *
 * Alcance: es por CONTEXTO DE NAVEGADOR, no por persona ni por dispositivo.
 * Ver docs/analytics.md.
 * ======================================================================== */

const INTERNAL_FLAG_KEY = 'diorame_internal';
const SKIP_KEY = 'skipgc';

let isInternalTraffic = false;

/**
 * Lee `?internal=1` (activa) o `?internal=0` (desactiva) y persiste el flag.
 * Nunca lanza: sin localStorage, `?internal=1` excluye al menos esta carga.
 */
function initInternalTraffic(): void {
	try {
		const param = new URLSearchParams(window.location.search).get('internal');
		if (param === '1') localStorage.setItem(INTERNAL_FLAG_KEY, '1');
		else if (param === '0') {
			localStorage.removeItem(INTERNAL_FLAG_KEY);
			localStorage.removeItem(SKIP_KEY);
		}
		isInternalTraffic = localStorage.getItem(INTERNAL_FLAG_KEY) === '1';
		if (isInternalTraffic) localStorage.setItem(SKIP_KEY, 't');
	} catch {
		isInternalTraffic = /[?&]internal=1(&|$)/.test(window.location.search);
	}

	if (!isInternalTraffic) return;

	// El flag es invisible y se pierde al borrar datos del navegador. Sin esta
	// confirmación no hay forma de saber si sigue puesto.
	console.warn(
		'[analytics] INTERNAL TRAFFIC — este navegador no se cuenta.',
	);
}

/* ===========================================================================
 * 3 · CARGA Y EMISOR
 * ======================================================================== */

type CountVars = { path: string; title: string; referrer: string; event: true };

let status: 'off' | 'loading' | 'ready' = 'off';
const queue: CountVars[] = [];

function count(vars: CountVars): void {
	try { window.goatcounter?.count?.(vars); } catch { /* la analítica nunca tumba la app */ }
}

function loadCounter(): void {
	try {
		// La página se cuenta sola al cargar el script. `path` sin query: la ruta de la vista es siempre la misma
		// (count.js envía los parámetros de campaña aparte).
		window.goatcounter = { no_events: true, path: window.location.pathname };
		const s = document.createElement('script');
		s.async = true;
		s.src = SCRIPT_SRC;
		s.integrity = SCRIPT_SRI;
		s.crossOrigin = 'anonymous';
		s.setAttribute('data-goatcounter', ENDPOINT);
		s.onload = () => { status = 'ready'; queue.splice(0).forEach(count); };
		// Offline o bloqueado: se pierde lo de esta sesión, sin reintentos.
		s.onerror = () => { status = 'off'; queue.length = 0; };
		status = 'loading';
		document.head.appendChild(s);
	} catch {
		status = 'off';
	}
}

/** Una vez, al arrancar: resuelve el tráfico interno ANTES de cargar nada. */
export function initTransport(): void {
	initInternalTraffic();
	if (!IS_PROD) {
		console.info('[analytics] modo consola · pageview', window.location.pathname);
		return;
	}
	if (!isInternalTraffic) loadCounter();
}

/**
 * Envía un evento a GoatCounter. Nunca lanza: la analítica jamás debe tumbar la app.
 * Los parámetros no viajan: solo el nombre que devuelve goatEventName (eventNames.ts).
 */
export function track<K extends DioramEventName>(
	name: K,
	params: DioramEventMap[K],
): void {
	try {
		const path = goatEventName(name, params);
		if (!IS_PROD) {
			console.info('[analytics] modo consola · event', path ?? `${name} (no se envía)`);
			return;
		}
		if (!path || status === 'off') return;
		const vars: CountVars = { path, title: path, referrer: '', event: true };
		if (status === 'ready') count(vars);
		else if (queue.length < MAX_QUEUE) queue.push(vars);
	} catch {
		/* la analítica nunca tumba la app */
	}
}
