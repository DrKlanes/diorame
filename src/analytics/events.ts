/**
 * Diorame · analytics/events.ts
 * ---------------------------------------------------------------------------
 * Contrato tipado de eventos GA4 y tipado global de window.gtag.
 * ---------------------------------------------------------------------------
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
	interface Window {
		gtag?: (...args: any[]) => void;
		dataLayer?: unknown[];
	}
}

/* ===========================================================================
 * 1 · CONTRATO DE EVENTOS
 * ---------------------------------------------------------------------------
 * Esta es LA fuente de verdad. Añadir un evento = añadir una línea aquí.
 * Reglas de GA4 que este contrato ya respeta:
 *   · snake_case, máx. 40 caracteres, sensible a mayúsculas
 *   · máx. 25 parámetros por evento
 *   · valores de texto máx. 100 caracteres
 *   · nombres reservados prohibidos: session_start, first_visit, error,
 *     user_engagement, first_open, app_*  (por eso usamos ui_error, no error)
 * ======================================================================== */

export type DioramEventMap = {
	/**
	 * PASO 1 DEL EMBUDO: la app arrancó de verdad (canvas montado) en un
	 * dispositivo compatible. NO se emite en la pantalla de bloqueo de móvil.
	 */
	canvas_ready: Record<string, never>;

	/**
	 * Se mostró la pantalla de bloqueo de móvil. Mide demanda rechazada.
	 * `viewport_width` es imprescindible para leer el dato: el gate mide ANCHO
	 * de viewport (<768px), no dispositivo. Sin este número no se distingue un
	 * móvil real de un desktop con la ventana estrecha.
	 */
	mobile_blocked: { viewport_width: number };

	/**
	 * Embudo de la pantalla de bloqueo móvil (v3.26.0). `lang` = idioma resuelto de la app.
	 * gate_shown: se mostró (una vez por sesión; `mobile_blocked` sigue siendo el paso 1 del
	 * embudo general). link_shared: el usuario completó el panel nativo de compartir.
	 * link_copied: el enlace acabó en el portapapeles. video_opened / landing_opened: salidas.
	 */
	mobile_gate_shown: { lang: string };
	mobile_link_shared: { lang: string };
	mobile_link_copied: { lang: string };
	mobile_video_opened: { lang: string };
	mobile_landing_opened: { lang: string };

	/** Primer trazo de la sesión. EVENTO CLAVE: mide activación real. */
	first_stroke: { tool: string; seconds_to_first_stroke: number };

	/** Hitos de profundidad de uso: 10, 50, 200 trazos. */
	stroke_milestone: { strokes: number; tool: string };

	/** El usuario descubrió el sistema de capas (el corazón del producto). */
	layer_added: { layer_count: number };

	/** El usuario descubrió que esto es 3D. */
	camera_preset_used: { preset: string };

	filter_applied: { filter: string };

	/**
	 * Se llevó algo a casa. EVENTO CLAVE: mide valor entregado.
	 * `mode`: el modo en que estaba la app al exportar. Sin él, un PNG de DRAW y uno de
	 * CINEMA (ambos `png` / `png_hq`) son indistinguibles en GA4.
	 * `background`: solo en el PNG de DRAW; el resto de exports no lo llevan.
	 */
	artwork_exported: {
		format: string;
		strokes: number;
		layers: number;
		mode: 'drawing' | 'cinematic';
		background?: 'paper' | 'solid' | 'transparent';
	};

	/** Guardado de proyecto .dior completado CON ÉXITO. */
	project_saved: Record<string, never>;

	/** Carga de un .dior completada CON ÉXITO. Única señal de retorno real. */
	project_loaded: Record<string, never>;

	share_clicked: { target: string };

	onboarding_step: { step: number; action: 'complete' | 'skip' };

	/** Cierre del modal de bienvenida, por cualquiera de sus tres salidas. */
	welcome_modal: { action: 'load_example' | 'restore_autosave' | 'dismissed' };

	/** Modal del tour de la interfaz (solo primera vez): se mostró / se pulsó play. */
	tour_video: { action: 'shown' | 'played' };

	/**
	 * Se mostró el tooltip contextual de descubrimiento de capas (primera
	 * sesión real, dibujando sin haber añadido capa). Cruzar con layer_added
	 * de la misma sesión para saber cuántos lo convierten.
	 */
	layers_tooltip_shown: { shapes_at_trigger: number; seconds_at_trigger: number };

	/**
	 * Cierre del tooltip de descubrimiento de capas. 'layer_added' es la
	 * conversión, 'timeout' es indiferencia, 'close_button' es rechazo activo.
	 */
	layers_tooltip_dismissed: { method: 'close_button' | 'click_outside' | 'timeout' | 'layer_added' };

	/** Errores de UI capturados. No uses el nombre "error": está reservado. */
	ui_error: { where: string; message: string };

	/** Resumen de la sesión, enviado una sola vez al salir. */
	session_depth: {
		strokes: number;
		layers: number;
		exported: boolean;
		seconds: number;
		/** Embudo colapsado en una sola dimensión, cómodo para segmentar en GA4. */
		reached: 'bounced' | 'drew' | 'exported';
	};
};

export type DioramEventName = keyof DioramEventMap;
