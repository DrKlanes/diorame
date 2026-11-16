/**
 * Diorame · analytics.ts
 * ---------------------------------------------------------------------------
 * Único punto de contacto de la app con Google Analytics 4.
 *
 * POR QUÉ UN MÓDULO Y NO gtag() SUELTO POR EL CÓDIGO:
 *  - Los nombres de evento están tipados: si te equivocas al escribir uno,
 *    TypeScript te avisa antes de compilar. GA4 no valida nada: un typo crea
 *    un evento nuevo y silencioso que ensucia la propiedad para siempre.
 *  - Se puede apagar todo desde un sitio (dev, consentimiento, tests).
 *  - La lógica de "esto solo se manda una vez por sesión" vive aquí, no
 *    repartida por los componentes.
 *
 * REQUISITO PREVIO: el snippet de GA4 (gtag.js) ya debe estar en index.html.
 * Si no existe window.gtag, este módulo no rompe nada: simplemente no envía.
 * ---------------------------------------------------------------------------
 */

import type { DioramEventMap } from './events';
import { track, initInternalTraffic } from './transport';
import { state, elapsedSeconds, STROKE_MILESTONES } from './session';
import { createErrorReporter, classifyDevice, rawFromRejection, reportBoundaryError, type RawError } from './errors';
import { APP_VERSION } from '../constants/version';

/** Reporter de `exception` (lo crea installErrorCapture). Null hasta entonces: reportar es no-op. */
let reportRaw: ((raw: RawError) => boolean) | null = null;

export type { DioramEventMap, DioramEventName } from './events';
export { track, setAnalyticsConsent } from './transport';

/* ===========================================================================
 * 5 · API PÚBLICA — esto es lo único que llamas desde los componentes
 * ======================================================================== */

export const analytics = {
	/**
	 * Llamar cuando el canvas monta de verdad, en dispositivo compatible.
	 * Comparte flag `once` con mobileBlocked(): ver SessionState.entrySent.
	 */
	canvasReady(): void {
		if (state.entrySent) return;
		state.entrySent = true;
		track('canvas_ready', {});
	},

	/**
	 * Llamar al mostrarse la pantalla de bloqueo de móvil.
	 * Comparte flag `once` con canvasReady(): ver SessionState.entrySent.
	 */
	mobileBlocked(viewportWidth: number): void {
		if (state.entrySent) return;
		state.entrySent = true;
		track('mobile_blocked', { viewport_width: viewportWidth });
	},

	/** Pantalla de bloqueo móvil mostrada. Una vez por sesión. */
	mobileGateShown(lang: string): void {
		if (state.mobileGateShownSent) return;
		state.mobileGateShownSent = true;
		track('mobile_gate_shown', { lang });
	},

	mobileLinkShared(lang: string): void {
		track('mobile_link_shared', { lang });
	},

	mobileLinkCopied(lang: string): void {
		track('mobile_link_copied', { lang });
	},

	mobileVideoOpened(lang: string): void {
		track('mobile_video_opened', { lang });
	},

	mobileLandingOpened(lang: string): void {
		track('mobile_landing_opened', { lang });
	},

	/**
	 * Llamar al TERMINAR un trazo (pointerup / final del path).
	 * NUNCA en pointermove: serían cientos de llamadas por segundo.
	 */
	strokeEnded(tool: string): void {
		state.strokes += 1;

		if (!state.firstStrokeSent) {
			state.firstStrokeSent = true;
			track('first_stroke', {
				tool,
				seconds_to_first_stroke: elapsedSeconds(),
			});
			return;
		}

		for (const milestone of STROKE_MILESTONES) {
			if (state.strokes === milestone && !state.milestonesSent.has(milestone)) {
				state.milestonesSent.add(milestone);
				track('stroke_milestone', { strokes: milestone, tool });
			}
		}
	},

	/**
	 * Sincroniza el nº REAL de capas del documento. NO emite evento: solo mantiene
	 * al día el contador que viaja como parámetro en artwork_exported y
	 * session_depth.
	 *
	 * Existe porque `layerAdded` no basta: solo se dispara al pulsar "añadir
	 * capa", así que un documento con la capa inicial —o uno cargado de un
	 * .dior con ocho— reportaba layers: 0. Un cero mentiroso se lee dentro de
	 * seis meses como "nadie usa capas".
	 */
	layerCount(totalLayers: number): void {
		state.layers = totalLayers;
	},

	/** Llamar cuando se añade una capa. `totalLayers` = nº de capas tras añadir. */
	layerAdded(totalLayers: number): void {
		state.layers = totalLayers;
		track('layer_added', { layer_count: totalLayers });
	},

	/** Llamar al aplicar un preset de cámara. */
	cameraPreset(preset: string): void {
		track('camera_preset_used', { preset });
	},

	/** Llamar al aplicar un filtro. */
	filterApplied(filter: string): void {
		track('filter_applied', { filter });
	},

	/** Llamar cuando la exportación termina CON ÉXITO, no al pulsar el botón. */
	exported(
		format: string,
		mode: DioramEventMap['artwork_exported']['mode'],
		background?: DioramEventMap['artwork_exported']['background'],
	): void {
		state.exported = true;
		track('artwork_exported', {
			format,
			strokes: state.strokes,
			layers: state.layers,
			mode,
			background,
		});
	},

	/** Llamar cuando el guardado .dior ha terminado CON ÉXITO. */
	projectSaved(): void {
		track('project_saved', {});
	},

	/** Llamar cuando la carga de un .dior ha terminado CON ÉXITO. */
	projectLoaded(): void {
		track('project_loaded', {});
	},

	/** Error de render atrapado por el ErrorBoundary raíz: `exception` con fatal: true. Nunca lanza. */
	reportBoundaryError(error: unknown): void {
		try { if (reportRaw) reportBoundaryError(reportRaw, error); } catch { /* idem */ }
	},

	/** Sincroniza modo y herramienta para el contexto de `exception`. NO emite evento. */
	errorContext(mode: string, tool: string): void {
		state.mode = mode === 'cinematic' ? 'cinema' : mode === 'drawing' ? 'draw' : mode;
		state.tool = tool;
	},

	/** Llamar al pulsar compartir. target: 'link' | 'twitter' | 'download' ... */
	shareClicked(target: string): void {
		track('share_clicked', { target });
	},

	onboardingStep(step: number, action: 'complete' | 'skip'): void {
		track('onboarding_step', { step, action });
	},

	/**
	 * Llamar al CERRAR el modal de bienvenida. Solo cuenta el primer cierre de
	 * la sesión: ver SessionState.welcomeModalSent.
	 */
	welcomeModal(action: DioramEventMap['welcome_modal']['action']): void {
		if (state.welcomeModalSent) return;
		state.welcomeModalSent = true;
		track('welcome_modal', { action });
	},

	/** Llamar al abrirse el modal del tour ('shown') y al pulsar play ('played'). */
	tourVideo(action: DioramEventMap['tour_video']['action']): void {
		track('tour_video', { action });
	},

	/** Llamar cuando se muestra el tooltip de descubrimiento de capas. */
	layersTooltipShown(shapesAtTrigger: number, secondsAtTrigger: number): void {
		track('layers_tooltip_shown', {
			shapes_at_trigger: shapesAtTrigger,
			seconds_at_trigger: secondsAtTrigger,
		});
	},

	/** Llamar al cerrarse el tooltip de descubrimiento de capas. */
	layersTooltipDismissed(
		method: DioramEventMap['layers_tooltip_dismissed']['method'],
	): void {
		track('layers_tooltip_dismissed', { method });
	},

	/** Errores capturados en UI. `where` identifica el punto del código. */
	uiError(where: string, message: string): void {
		track('ui_error', { where, message });
	},
};

/* ===========================================================================
 * 6 · RESUMEN DE SESIÓN AL SALIR
 * ---------------------------------------------------------------------------
 * Se usa 'visibilitychange' + 'pagehide', NO 'unload': en móvil (Safari/Chrome
 * Android) unload no se dispara de forma fiable y perderías la mitad de los
 * datos justo del segmento que más te interesa vigilar.
 * ======================================================================== */

function flushSessionDepth(): void {
	if (state.depthSent) return;
	state.depthSent = true;

	const reached: DioramEventMap['session_depth']['reached'] = state.exported
		? 'exported'
		: state.strokes > 0
			? 'drew'
			: 'bounced';

	track('session_depth', {
		strokes: state.strokes,
		layers: state.layers,
		exported: state.exported,
		seconds: elapsedSeconds(),
		reached,
	});
}

/* ===========================================================================
 * 6b · CAPTURA SILENCIOSA DE ERRORES (evento `exception`)
 * ---------------------------------------------------------------------------
 * Ver errors.ts. Sin UI, sin toasts. Todo en try/catch: nunca rompe la app.
 * ======================================================================== */

function installErrorCapture(): void {
	try {
		const { report } = createErrorReporter({
			send: params => track('exception', params),
			origin: () => window.location.origin,
			context: () => ({
				app_version: APP_VERSION,
				mode: state.mode,
				tool: state.tool,
				device_class: classifyDevice(navigator.userAgent, navigator.maxTouchPoints || 0),
				standalone: isStandaloneNow() ? 'yes' : 'no',
			}),
		});

		reportRaw = report;

		window.addEventListener('error', (ev: ErrorEvent) => {
			try {
				// Los fallos de carga de recursos (img/script/link) llegan con target ≠ window: ruido de red.
				if (ev.target && ev.target !== window) return;
				report({
					message: ev.message || (ev.error && ev.error.message),
					stack: ev.error && ev.error.stack,
					filename: ev.filename,
					lineno: ev.lineno,
				});
			} catch { /* la analítica nunca tumba la app */ }
		});

		window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
			try { report(rawFromRejection(ev.reason)); } catch { /* idem */ }
		});
	} catch { /* idem */ }
}

function isStandaloneNow(): boolean {
	try {
		return window.matchMedia('(display-mode: standalone)').matches
			|| (navigator as unknown as { standalone?: boolean }).standalone === true;
	} catch {
		return false;
	}
}

let installed = false;

/**
 * Llamar UNA vez al arrancar la app (en main.tsx o en el App raíz).
 */
export function installAnalytics(): void {
	if (installed || typeof document === 'undefined') return;
	installed = true;

	initInternalTraffic();
	installErrorCapture();

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'hidden') flushSessionDepth();
	});
	window.addEventListener('pagehide', flushSessionDepth);
}
