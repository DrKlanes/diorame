import { useEffect, useRef } from 'react';
import { set } from 'idb-keyval';
import { useStrata } from '../components/strata/StrataContext';

export const AUTOSAVE_KEY = 'diorame-autosave-v1';
const AUTOSAVE_INTERVAL_MS = 30 * 1000;

export function useAutoSave() {
	const { state } = useStrata();

	// Ref al state siempre actualizado, sin causar re-creación del interval
	const stateRef = useRef(state);
	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	// Bandera para suspender el autosave temporalmente (e.g., durante restore)
	const suspendedRef = useRef(false);

	// Interval estable — se crea una sola vez
	useEffect(() => {
		const interval = setInterval(async () => {
			if (suspendedRef.current) return;

			const currentState = stateRef.current;
			if (!currentState.isDirty) return;

			const data = {
				shapes: currentState.shapes,
				palette: currentState.palette,
				totalLayers: currentState.totalLayers,
				isDarkMode: currentState.isDarkMode,
				postProcessing: currentState.postProcessing,
				postProcessingEnabled: currentState.postProcessingEnabled,
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
			};

			try {
				// Re-check suspended después del await por si cambió mientras esperaba
				if (suspendedRef.current) return;
				await set(AUTOSAVE_KEY, data);
			} catch (err) {
				console.warn('[autosave] set failed:', err);
			}
		}, AUTOSAVE_INTERVAL_MS);

		return () => clearInterval(interval);
	}, []); // Sin dependencias — interval estable que vive todo el ciclo del componente

	return {
		suspendAutosave: () => { suspendedRef.current = true; },
		resumeAutosave:  () => { suspendedRef.current = false; },
	};
}
