/**
 * Diorame · analytics/errors.ts
 * ---------------------------------------------------------------------------
 * Captura silenciosa de errores no controlados → evento GA4 `exception`.
 *
 * Núcleo PURO: sin window, sin gtag, sin transport. Todo lo de fuera entra por
 * `deps` (emisor, contexto, origen), de modo que los tests de Node ejecutan
 * este mismo código. El cableado a window vive en `installErrorCapture`.
 *
 * Reglas: nunca lanza, nunca pinta nada, nunca manda contenido del usuario.
 * ---------------------------------------------------------------------------
 */

export const MAX_DESCRIPTION = 100;
export const MAX_ERRORS_PER_SESSION = 10;

export type DeviceClass = 'ipad' | 'tablet' | 'desktop' | 'mobile';

export type ErrorContext = {
	app_version: string;
	mode: string;
	tool: string;
	device_class: DeviceClass;
	standalone: 'yes' | 'no';
};

export type ExceptionParams = ErrorContext & { description: string; fatal: boolean };

export type RawError = {
	message?: unknown;
	stack?: unknown;
	filename?: unknown;
	lineno?: unknown;
	fatal?: boolean;
};

export type ReporterDeps = {
	send: (params: ExceptionParams) => void;
	context: () => ErrorContext;
	/** Origen de la app (p. ej. https://diorame.dumaker.com). Scripts de otro origen = terceros. */
	origin: () => string;
};

/* ---------------------------------------------------------------------------
 * Limpieza de texto
 * ------------------------------------------------------------------------ */

const EXTENSION_RE = /(?:chrome|moz|safari(?:-web)?)-extension:\/\//i;
const THIRD_PARTY_RE = /googletagmanager|google-analytics|doubleclick/i;

/** Último segmento de una ruta o URL, sin query ni hash. */
export function baseName(path: string): string {
	const noQuery = path.split(/[?#]/)[0];
	const parts = noQuery.split(/[\\/]/).filter(Boolean);
	return parts.length ? parts[parts.length - 1] : '';
}

/** Rutas absolutas y URLs → solo el nombre de archivo. Cadenas entre comillas largas → «…». */
export function cleanText(text: string): string {
	return text
		.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s)'"]+/gi, m => baseName(m) || 'url')
		.replace(/\b[A-Za-z]:\\[^\s)'"]+/g, m => baseName(m) || 'path')
		.replace(/(?<![\w.])\/(?:[\w.@~-]+\/)+[\w.@~-]*/g, m => baseName(m) || 'path')
		.replace(/"[^"\n]{25,}"/g, '"…"')
		.replace(/'[^'\n]{25,}'/g, "'…'")
		.replace(/\s+/g, ' ')
		.trim();
}

/** Primer frame útil de un stack (V8 «at f (url:l:c)» o WebKit/Gecko «f@url:l:c»), como «archivo:línea». */
export function firstStackFrame(stack: string): string {
	for (const raw of stack.split('\n')) {
		const line = raw.trim();
		if (!line || !/(?:^at |@)/.test(line)) continue;
		const m = line.match(/([^\s()@]+?):(\d+)(?::\d+)?\)?\s*$/);
		if (!m) continue;
		const file = baseName(m[1]);
		if (file) return `${file}:${m[2]}`;
	}
	return '';
}

/** Mensaje + primer frame útil, ≤100 caracteres (límite de GA4), sin rutas ni query strings. */
export function buildDescription(message: string, frame: string): string {
	const msg = cleanText(message) || 'Unknown error';
	if (!frame) return msg.slice(0, MAX_DESCRIPTION);
	const room = Math.max(40, MAX_DESCRIPTION - frame.length - 3);
	const head = msg.length > room ? `${msg.slice(0, room - 1)}…` : msg;
	return `${head} @ ${frame}`.slice(0, MAX_DESCRIPTION);
}

/* ---------------------------------------------------------------------------
 * Filtros de ruido
 * ------------------------------------------------------------------------ */

export function isNoise(
	e: { message: string; stack: string; filename: string; lineno: number },
	appOrigin: string,
): boolean {
	const blob = `${e.stack}\n${e.filename}`;
	if (EXTENSION_RE.test(blob)) return true;
	if (/ResizeObserver loop/i.test(e.message)) return true;
	// Error opaco cross-origin: el navegador oculta todo detalle.
	if (/^script error\.?$/i.test(e.message.trim()) && !e.lineno && !e.stack) return true;
	if (THIRD_PARTY_RE.test(blob)) return true;
	// Script cargado de otro origen: no es código nuestro.
	const m = e.filename.match(/^(https?:\/\/[^/]+)/i);
	if (m && appOrigin && m[1].toLowerCase() !== appOrigin.toLowerCase()) return true;
	return false;
}

/* ---------------------------------------------------------------------------
 * Dispositivo
 * ------------------------------------------------------------------------ */

export function classifyDevice(ua: string, maxTouchPoints: number): DeviceClass {
	if (/iPhone|iPod/.test(ua)) return 'mobile';
	if (/iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)) return 'ipad';
	if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'mobile' : 'tablet';
	return 'desktop';
}

/* ---------------------------------------------------------------------------
 * Reporter
 * ------------------------------------------------------------------------ */

export function createErrorReporter(deps: ReporterDeps) {
	const seen = new Set<string>();
	let sent = 0;
	let busy = false;

	/** Devuelve true si se emitió un evento. Nunca lanza. */
	function report(raw: RawError): boolean {
		if (busy) return false; // un fallo dentro del reporter no puede realimentarse
		busy = true;
		try {
			const message = typeof raw.message === 'string' ? raw.message : '';
			const stack = typeof raw.stack === 'string' ? raw.stack : '';
			const filename = typeof raw.filename === 'string' ? raw.filename : '';
			const lineno = typeof raw.lineno === 'number' ? raw.lineno : 0;

			if (sent >= MAX_ERRORS_PER_SESSION) return false;
			if (isNoise({ message, stack, filename, lineno }, deps.origin())) return false;

			const frame = filename && lineno
				? `${baseName(filename)}:${lineno}`
				: firstStackFrame(stack);
			const description = buildDescription(message, frame);

			const signature = `${cleanText(message)}|${frame}`;
			if (seen.has(signature)) return false;
			seen.add(signature);
			sent += 1;

			deps.send({ ...deps.context(), description, fatal: raw.fatal === true });
			return true;
		} catch {
			return false;
		} finally {
			busy = false;
		}
	}

	return { report };
}

/** Normaliza lo que llega en `unhandledrejection` sin serializar nunca objetos arbitrarios. */
export function rawFromRejection(reason: unknown): RawError {
	if (reason && typeof reason === 'object') {
		const r = reason as { message?: unknown; stack?: unknown };
		if (typeof r.message === 'string') return { message: r.message, stack: r.stack };
		return { message: 'Unhandled rejection (non-error)' };
	}
	if (typeof reason === 'string') return { message: reason };
	return { message: 'Unhandled rejection (non-error)' };
}

/** Error de render capturado por un ErrorBoundary → `exception` con fatal: true. Nunca lanza. */
export function reportBoundaryError(report: (raw: RawError) => boolean, error: unknown): boolean {
	try {
		const e = error as { message?: unknown; stack?: unknown } | null;
		return report({
			message: e && typeof e.message === 'string' ? e.message : 'Render error (non-error)',
			stack: e && typeof e.stack === 'string' ? e.stack : '',
			fatal: true,
		});
	} catch {
		return false;
	}
}
