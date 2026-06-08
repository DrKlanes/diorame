import React, { useState, useEffect, useRef } from 'react';

// ⚠️ DIAGNÓSTICO TEMPORAL — quitar tras medir la franja inferior del iPad standalone.
//
// ACTIVAR: esta constante en `true` muestra el overlay SIEMPRE (en standalone la URL es
// el start_url "/" y no se puede añadir ?debug=, por eso una constante es lo fiable).
// También se activa con ?debug=safearea (útil en navegador para pruebas).
//
// QUITAR (cleanup): borrar este archivo + su import y su montaje en src/App.tsx
// + el atributo data-app-root del div root en App.tsx. (O poner la constante en false.)
const DEBUG_SAFE_AREA = false;

export function isSafeAreaDebugEnabled(): boolean {
	if (DEBUG_SAFE_AREA) return true;
	try {
		return new URLSearchParams(window.location.search).get('debug') === 'safearea';
	} catch {
		return false;
	}
}

// Mide insets/viewport con elementos sonda CSS reales (getBoundingClientRect → px resueltos),
// en vez de leer getComputedStyle de custom props (que no resuelve env() de forma fiable).
export function SafeAreaDebugOverlay() {
	const sabRef = useRef<HTMLDivElement>(null);   // env(safe-area-inset-bottom)
	const satRef = useRef<HTMLDivElement>(null);   // env(safe-area-inset-top)
	const dvhRef = useRef<HTMLDivElement>(null);   // 100dvh resuelto
	const [m, setM] = useState<Array<[string, string | number]>>([]);

	useEffect(() => {
		const r = (n: number | undefined) => (n === undefined ? 'n/a' : Math.round(n * 10) / 10);
		const measure = () => {
			const sab = sabRef.current?.getBoundingClientRect().height;
			const sat = satRef.current?.getBoundingClientRect().height;
			const dvh = dvhRef.current?.getBoundingClientRect().height;
			const root = (document.querySelector('[data-app-root]') as HTMLElement | null)?.getBoundingClientRect().height;
			setM([
				['sab inset-bottom', r(sab)],
				['sat inset-top', r(sat)],
				['100dvh probe', r(dvh)],
				['root h-100dvh', r(root)],
				['innerHeight', window.innerHeight],
				['docEl clientH', document.documentElement.clientHeight],
				['visualVP h', r(window.visualViewport?.height)],
				['standalone mq', window.matchMedia('(display-mode: standalone)').matches ? 'YES' : 'no'],
				['nav.standalone', String((navigator as unknown as { standalone?: boolean }).standalone ?? 'n/a')],
			]);
		};
		measure();
		const evs = ['resize', 'visibilitychange', 'focus', 'pageshow', 'orientationchange'];
		evs.forEach((e) => window.addEventListener(e, measure));
		window.visualViewport?.addEventListener('resize', measure);
		window.visualViewport?.addEventListener('scroll', measure);
		// iOS recalcula el viewport de forma asíncrona tras volver de foco → re-mide periódico.
		const id = window.setInterval(measure, 500);
		return () => {
			evs.forEach((e) => window.removeEventListener(e, measure));
			window.visualViewport?.removeEventListener('resize', measure);
			window.visualViewport?.removeEventListener('scroll', measure);
			window.clearInterval(id);
		};
	}, []);

	// Sondas: width 0 + visibility hidden → invisibles, sin scroll, pero con rect medible.
	const probe: React.CSSProperties = { position: 'fixed', left: 0, top: 0, width: 0, visibility: 'hidden', pointerEvents: 'none' };
	return (
		<>
			<div ref={sabRef} style={{ ...probe, height: 'env(safe-area-inset-bottom, 0px)' }} />
			<div ref={satRef} style={{ ...probe, height: 'env(safe-area-inset-top, 0px)' }} />
			<div ref={dvhRef} style={{ ...probe, height: '100dvh' }} />
			<div style={{
				position: 'fixed',
				top: 6,
				left: 6,
				zIndex: 2147483647,
				background: 'rgba(0,0,0,0.88)',
				color: '#3effa0',
				font: '11px/1.55 ui-monospace, Menlo, monospace',
				padding: '8px 10px',
				borderRadius: 8,
				pointerEvents: 'none',
				whiteSpace: 'pre',
			}}>
				{'SAFE-AREA DEBUG\n' + m.map(([k, v]) => `${k.padEnd(16)}: ${v}`).join('\n')}
			</div>
		</>
	);
}
