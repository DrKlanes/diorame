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

  /** Primer trazo de la sesión. EVENTO CLAVE: mide activación real. */
  first_stroke: { tool: string; seconds_to_first_stroke: number };

  /** Hitos de profundidad de uso: 10, 50, 200 trazos. */
  stroke_milestone: { strokes: number; tool: string };

  /** El usuario descubrió el sistema de capas (el corazón del producto). */
  layer_added: { layer_count: number };

  /** El usuario descubrió que esto es 3D. */
  camera_preset_used: { preset: string };

  filter_applied: { filter: string };

  /** Se llevó algo a casa. EVENTO CLAVE: mide valor entregado. */
  artwork_exported: { format: string; strokes: number; layers: number };

  /** Guardado de proyecto .dior completado CON ÉXITO. */
  project_saved: Record<string, never>;

  /** Carga de un .dior completada CON ÉXITO. Única señal de retorno real. */
  project_loaded: Record<string, never>;

  share_clicked: { target: string };

  onboarding_step: { step: number; action: 'complete' | 'skip' };

  /** Cierre del modal de bienvenida, por cualquiera de sus tres salidas. */
  welcome_modal: { action: 'load_example' | 'restore_autosave' | 'dismissed' };

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

/* ===========================================================================
 * 2 · CONFIGURACIÓN
 * ======================================================================== */

const IS_DEV = import.meta.env.DEV;
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
function initInternalTraffic(): void {
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
 * 4 · ESTADO DE SESIÓN
 * ---------------------------------------------------------------------------
 * IMPORTANTE: esto es estado mutable a nivel de módulo, NO estado de React.
 * Motivo: se toca en cada final de trazo. Si fuera useState provocaría un
 * re-render del canvas por trazo y hundiría el rendimiento del dibujo.
 * ======================================================================== */

type SessionState = {
  startedAt: number;
  strokes: number;
  layers: number;
  exported: boolean;
  firstStrokeSent: boolean;
  milestonesSent: Set<number>;
  depthSent: boolean;
  /**
   * Flag COMPARTIDO por canvas_ready y mobile_blocked: en una sesión se emite
   * uno de los dos, el primero que ocurra, y el otro ya nunca.
   * Motivo: el gate de móvil es reactivo al ancho de viewport (useIsMobile
   * escucha matchMedia). Con un flag por evento, un desktop que estrecha la
   * ventana emitiría los dos y contaría a la misma persona dos veces en el
   * paso 1 del embudo.
   */
  entrySent: boolean;
  /**
   * El modal de bienvenida también se abre desde el botón de info y desde
   * atajo de teclado. Sin este flag, cada cierre posterior sumaría un
   * 'dismissed' falso.
   */
  welcomeModalSent: boolean;
};

const STROKE_MILESTONES = [10, 50, 200] as const;

const state: SessionState = {
  startedAt: Date.now(),
  strokes: 0,
  layers: 0,
  exported: false,
  firstStrokeSent: false,
  milestonesSent: new Set(),
  depthSent: false,
  entrySent: false,
  welcomeModalSent: false,
};

const elapsedSeconds = () => Math.round((Date.now() - state.startedAt) / 1000);

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
  exported(format: string): void {
    state.exported = true;
    track('artwork_exported', {
      format,
      strokes: state.strokes,
      layers: state.layers,
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

let installed = false;

/**
 * Llamar UNA vez al arrancar la app (en main.tsx o en el App raíz).
 */
export function installAnalytics(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  initInternalTraffic();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSessionDepth();
  });
  window.addEventListener('pagehide', flushSessionDepth);
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
