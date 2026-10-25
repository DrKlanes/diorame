import { useEffect, useRef } from 'react';
import { set } from 'idb-keyval';
import { useStrata } from '../components/strata/StrataContext';

export const AUTOSAVE_KEY = 'diorame-autosave-v1';
const AUTOSAVE_INTERVAL_MS = 30 * 1000;
// Quiet time after the last change before it is written (v3.20.5): the 30 s interval alone lost up to
// 30 s of adjustments when the browser killed the tab, and the PWA on iPad is killed in the background.
const AUTOSAVE_DEBOUNCE_MS = 1500;

export function useAutoSave() {
	const { state } = useStrata();

	// Ref al state siempre actualizado, sin causar re-creación del interval
	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	// Bandera para suspender el autosave temporalmente (e.g., durante restore)
	const suspendedRef = useRef(false);

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

	// Interval estable — se crea una sola vez
	useEffect(() => {
		const interval = setInterval(() => { void saveNowRef.current(); }, AUTOSAVE_INTERVAL_MS);
		return () => clearInterval(interval);
	}, []); // Sin dependencias — interval estable que vive todo el ciclo del componente

	// Debounce corto tras cada cambio de estado: se escribe cuando el usuario deja de tocar.
	useEffect(() => {
		if (!state.isDirty) return;
		const timer = setTimeout(() => { void saveNowRef.current(); }, AUTOSAVE_DEBOUNCE_MS);
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
