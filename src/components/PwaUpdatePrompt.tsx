import { useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from '../i18n';

// PWA Fase 2 — cablea el ciclo de actualización del service worker a un toast de Sonner.
// Vive como componente React (no en src/pwa.ts plano) porque necesita t() (i18n) y el
// contexto de Sonner. Registra el SW (immediate) vía useRegisterSW y, con registerType
// 'prompt', el SW nuevo queda esperando hasta que el usuario pulsa "Recargar".
// El estilo dark-aware lo hereda del <Toaster> de ToastProvider — no crea toast propio.
// Inerte en `npm run dev` (vite-plugin-pwa solo genera el SW en build).
// v3.26.90: the browser only looks for a new sw.js when the page is (re)loaded, so a tab or an installed PWA that stays
// open — or is resumed on the iPad, which does not reload it — never showed the toast. Ask again when the app comes back
// to the foreground (at most once a minute) and every 30 minutes while it is visible.
const UPDATE_EVERY_MS = 30 * 60 * 1000;
const UPDATE_MIN_GAP_MS = 60 * 1000;
function watchForUpdates(registration: ServiceWorkerRegistration) {
	let last = Date.now();
	const check = () => {
		if (document.visibilityState !== 'visible' || !navigator.onLine || Date.now() - last < UPDATE_MIN_GAP_MS) return;
		last = Date.now();
		registration.update().catch(() => { /* offline or server hiccup: the next check retries */ });
	};
	document.addEventListener('visibilitychange', check);
	window.addEventListener('online', check);
	window.setInterval(check, UPDATE_EVERY_MS);
}

export function PwaUpdatePrompt() {
	const { t } = useTranslation();
	const {
		needRefresh: [needRefresh],
		offlineReady: [offlineReady, setOfflineReady],
		updateServiceWorker,
	} = useRegisterSW({ immediate: true, onRegisteredSW: (_url, registration) => { if (registration) watchForUpdates(registration); } });

	// Nueva versión disponible → toast persistente con acción "Recargar".
	useEffect(() => {
		if (!needRefresh) return;
		toast(t('pwa.update.message'), {
			id: 'pwa-update',            // id fijo → nunca apila duplicados
			duration: Infinity,          // no desaparece solo; el usuario decide cuándo
			action: {
				label: t('pwa.update.reload'),
				onClick: () => updateServiceWorker(true), // skipWaiting + reload → versión nueva
			},
		});
	}, [needRefresh, t, updateServiceWorker]);

	// Primera vez cacheado para offline → confirmación breve.
	useEffect(() => {
		if (!offlineReady) return;
		toast.success(t('pwa.offlineReady.message'), { id: 'pwa-offline-ready', duration: 3000 });
		setOfflineReady(false);
	}, [offlineReady, t, setOfflineReady]);

	return null;
}
