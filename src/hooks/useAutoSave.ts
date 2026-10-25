import { useEffect, useRef } from 'react';
import { set } from 'idb-keyval';
import { useStrata } from '../components/strata/StrataContext';

export const AUTOSAVE_KEY = 'diorame-autosave-v1';
const AUTOSAVE_INTERVAL_MS = 30 * 1000;
// Quiet time after the last change before it is written (v3.20.5): the 30 s interval alone lost up to
// 30 s of adjustments when the browser killed the tab, and the PWA on iPad is killed in the background.
const AUTOSAVE_DEBOUNCE_MS = 1500;
// The write clones the whole scene synchronously (35-50 ms on desktop for 2 400 shapes, more on iPad), so a
// scheduled write never runs during a gesture: it waits and asks again.
const GESTURE_RETRY_MS = 400;
const WHEEL_GESTURE_MS = 300;
// A pointer that never reported its end (released outside the window, lost capture) must not block the
// autosave for ever: past this age it no longer counts as a gesture.
const POINTER_MAX_AGE_MS = 30 * 1000;

export function useAutoSave() {
	const { state } = useStrata();

	// Ref al state siempre actualizado, sin causar re-creación del interval
	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	// Bandera para suspender el autosave temporalmente (e.g., durante restore)
	const suspendedRef = useRef(false);

	// Gesture in progress (stroke, pan, pinch, Move transform, wheel zoom), read from the raw input — the canvas
	// core is not involved. Capture listeners on window run before any handler that stops propagation.
	// Touch is tracked apart from pointers: the canvas cancels touchstart for the Pencil, which suppresses its
	// pointer events.
	const pointersRef = useRef(new Map<number, number>());
	const touchesRef = useRef(0);
	const lastWheelRef = useRef(0);
	useEffect(() => {
		const pointers = pointersRef.current;
		const down = (e: PointerEvent) => { pointers.set(e.pointerId, performance.now()); };
		const up = (e: PointerEvent) => { pointers.delete(e.pointerId); };
		const touch = (e: TouchEvent) => { touchesRef.current = e.touches.length; };
		const wheel = () => { lastWheelRef.current = performance.now(); };
		const reset = () => { pointers.clear(); touchesRef.current = 0; };
		window.addEventListener('pointerdown', down, true);
		window.addEventListener('pointerup', up, true);
		window.addEventListener('pointercancel', up, true);
		window.addEventListener('touchstart', touch, { capture: true, passive: true });
		window.addEventListener('touchend', touch, { capture: true, passive: true });
		window.addEventListener('touchcancel', touch, { capture: true, passive: true });
		window.addEventListener('wheel', wheel, { capture: true, passive: true });
		window.addEventListener('blur', reset);
		return () => {
			window.removeEventListener('pointerdown', down, true);
			window.removeEventListener('pointerup', up, true);
			window.removeEventListener('pointercancel', up, true);
			window.removeEventListener('touchstart', touch, true);
			window.removeEventListener('touchend', touch, true);
			window.removeEventListener('touchcancel', touch, true);
			window.removeEventListener('wheel', wheel, true);
			window.removeEventListener('blur', reset);
		};
	}, []);
	const gestureActive = () => {
		const now = performance.now();
		for (const [id, t] of pointersRef.current) if (now - t > POINTER_MAX_AGE_MS) pointersRef.current.delete(id);
		return stateRef.current.isDrawing || pointersRef.current.size > 0 || touchesRef.current > 0
			|| now - lastWheelRef.current < WHEEL_GESTURE_MS;
	};

	// Último estado escrito: el debounce, el interval y el volcado al ocultar no repiten una escritura idéntica.
	const lastWrittenRef = useRef<typeof state | null>(null);

	// Escribe el estado actual si hay cambios sin guardar. Estable: solo lee refs.
	const saveNowRef = useRef(async () => {});
	saveNowRef.current = async () => {
		if (suspendedRef.current) return;

		const currentState = stateRef.current;
		if (!currentState.isDirty || currentState === lastWrittenRef.current) return;

		const data = {
			shapes: currentState.shapes,
			palette: currentState.palette,
			totalLayers: currentState.totalLayers,
			isDarkMode: currentState.isDarkMode,
			postProcessing: currentState.postProcessing,
			postProcessingEnabled: currentState.postProcessingEnabled,
			// Master FX OFF: the flags are all false and the look that was on is the snapshot.
			fxMasterEnabled: currentState.fxMasterEnabled,
			postProcessingSnapshot: currentState.postProcessingSnapshot,
			cinematicType: currentState.cinematicType,
			hiddenLayers: currentState.hiddenLayers,
			locked3DLayers: currentState.locked3DLayers,
			projectName: currentState.projectName,
			layerRenderModes: currentState.layerRenderModes,
			layerGradParams: currentState.layerGradParams,
			currentBrushThickness: currentState.currentBrushThickness,
			brushMode: currentState.brushMode,
			tool: currentState.tool,
			activePaletteId: currentState.activePaletteId,
			focalLength: currentState.focalLength,
			viewZoomOffset: currentState.viewZoomOffset,
			layerSpacingFactor: currentState.layerSpacingFactor,
			cinematicSpeed: currentState.cinematicSpeed,
			isHandheldEnabled: currentState.isHandheldEnabled,
			handheldIntensity: currentState.handheldIntensity,
			paletteApplyToAllActive: currentState.paletteApplyToAllActive,
			paletteApplyToAllSnapshot: currentState.paletteApplyToAllSnapshot,
			pointOfInterest: currentState.pointOfInterest,
		};

		try {
			// Re-check suspended después del await por si cambió mientras esperaba
			if (suspendedRef.current) return;
			await set(AUTOSAVE_KEY, data);
			lastWrittenRef.current = currentState;
		} catch (err) {
			console.warn('[autosave] set failed:', err);
		}
	};

	// Scheduled write (interval and debounce): never during a gesture — it asks again until the gesture ends —
	// and in an idle slot where the browser has one (Safari has no requestIdleCallback: next frame, then task).
	const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const scheduleSaveRef = useRef(() => {});
	scheduleSaveRef.current = () => {
		if (scheduledRef.current !== null) clearTimeout(scheduledRef.current);
		scheduledRef.current = null;
		if (gestureActive()) {
			scheduledRef.current = setTimeout(() => scheduleSaveRef.current(), GESTURE_RETRY_MS);
			return;
		}
		const run = () => {
			if (gestureActive()) { scheduleSaveRef.current(); return; }
			void saveNowRef.current();
		};
		if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1000 });
		else requestAnimationFrame(() => setTimeout(run, 0));
	};
	useEffect(() => () => { if (scheduledRef.current !== null) clearTimeout(scheduledRef.current); }, []);

	// Interval estable — se crea una sola vez
	useEffect(() => {
		const interval = setInterval(() => scheduleSaveRef.current(), AUTOSAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []); // Sin dependencias — interval estable que vive todo el ciclo del componente

	// Debounce corto tras cada cambio de estado: se escribe cuando el usuario deja de tocar.
	useEffect(() => {
		if (!state.isDirty) return;
		const timer = setTimeout(() => scheduleSaveRef.current(), AUTOSAVE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [state]);

	// Volcado inmediato al ocultar la página: el iPad manda la PWA a segundo plano y puede matarla
	// sin más aviso. `pagehide` cubre el cierre de pestaña y la navegación; `visibilitychange` a hidden,
	// el cambio de app. Nunca al volver (visible): lo que se escribe es lo que ya hay en pantalla.
	useEffect(() => {
		const onVisibility = () => { if (document.visibilityState === 'hidden') void saveNowRef.current(); };
		const onPageHide = () => { void saveNowRef.current(); };
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('pagehide', onPageHide);
		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pagehide', onPageHide);
		};
	}, []);

	return {
		suspendAutosave: () => { suspendedRef.current = true; },
		resumeAutosave:  () => { suspendedRef.current = false; },
	};
}
