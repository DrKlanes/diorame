/**
 * Diorame · analytics/session.ts
 * ---------------------------------------------------------------------------
 * Estado mutable de la sesión (módulo, no React).
 * ---------------------------------------------------------------------------
 */

/* ===========================================================================
 * 4 · ESTADO DE SESIÓN
 * ---------------------------------------------------------------------------
 * IMPORTANTE: esto es estado mutable a nivel de módulo, NO estado de React.
 * Motivo: se toca en cada final de trazo. Si fuera useState provocaría un
 * re-render del canvas por trazo y hundiría el rendimiento del dibujo.
 * ======================================================================== */

export type SessionState = {
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
	/** La pantalla de bloqueo puede remontarse al cruzar los 768px: solo cuenta la primera vez. */
	mobileGateShownSent: boolean;
};

export const STROKE_MILESTONES = [10, 50, 200] as const;

export const state: SessionState = {
	startedAt: Date.now(),
	strokes: 0,
	layers: 0,
	exported: false,
	firstStrokeSent: false,
	milestonesSent: new Set(),
	depthSent: false,
	entrySent: false,
	welcomeModalSent: false,
	mobileGateShownSent: false,
};

export const elapsedSeconds = () => Math.round((Date.now() - state.startedAt) / 1000);
