import { useEffect, useRef, useState } from 'react';
import { useStrata } from '../components/strata/StrataContext';
import { analytics } from '../analytics/analytics';
import {
	TOOLTIP_TRIGGER_SHAPES,
	TOOLTIP_TRIGGER_SECONDS,
	TOOLTIP_VISIBLE_SECONDS,
	LAYERS_TOOLTIP_VISITED_KEY,
	LAYERS_TOOLTIP_SEEN_KEY,
} from '../constants/layersDiscoveryTooltip';

export type LayersTooltipDismissMethod = 'close_button' | 'click_outside' | 'timeout' | 'layer_added';

// Nivel de módulo, no de componente: evaluado UNA vez por carga real de
// página. LayersPanel (y este hook con él) se desmonta y remonta dentro de
// una misma sesión al ocultar/mostrar la interfaz (ver ControlsV2.tsx,
// isUIHidden) — leer "primera sesión" o "hora de entrada" en un useState
// perdía esa distinción: un remount a mitad de sesión releía localStorage,
// encontraba el flag que la propia sesión ya había escrito en su primer
// trazo, y bloqueaba el tooltip para siempre dentro de esa misma sesión.
let wasReturningUserAtLoad = true; // fail-safe: si localStorage falla, no mostrar
try { wasReturningUserAtLoad = localStorage.getItem(LAYERS_TOOLTIP_VISITED_KEY) !== null; }
catch { /* localStorage bloqueado: tratar como usuario recurrente, no mostrar */ }

const pageLoadTime = Date.now();

// Tooltip contextual: solo en la primera sesión REAL de un usuario que dibuja
// sin descubrir las capas. "Primera sesión real" se define por el primer
// trazo, no por el primer mount de la app — abrir y refrescar sin dibujar no
// cuenta como sesión y no debe consumir la única oportunidad de verlo.
export function useLayersDiscoveryTooltip() {
	const { state } = useStrata();
	const isOpenRef = useRef(false);
	const [isOpen, setIsOpen] = useState(false);
	const [, forceTick] = useState(0);
	const wasReturningUser = wasReturningUserAtLoad;

	const [alreadySeen, setAlreadySeen] = useState(() => {
		try { return localStorage.getItem(LAYERS_TOOLTIP_SEEN_KEY) === 'true'; }
		catch { return true; }
	});

	// Marca "sesión real" en el primer trazo (state.shapes deja de estar vacío).
	// Deliberadamente leído de state.shapes, no de analytics.ts: ese módulo es
	// tracking, no estado de producto, y no expone su timestamp de arranque.
	useEffect(() => {
		if (state.shapes.length === 0) return;
		try {
			if (!localStorage.getItem(LAYERS_TOOLTIP_VISITED_KEY)) {
				localStorage.setItem(LAYERS_TOOLTIP_VISITED_KEY, 'true');
			}
		} catch { /* localStorage bloqueado: no persiste, pero no rompe nada */ }
	}, [state.shapes.length]);

	const meetsShapeThreshold = state.shapes.length >= TOOLTIP_TRIGGER_SHAPES;

	// Una vez cruzado el umbral de formas, programa un despertar exacto en el
	// segundo en que también se cumplirá el umbral de tiempo — sin esto React
	// nunca re-evalúa el efecto de abajo por el mero paso del tiempo.
	useEffect(() => {
		if (!meetsShapeThreshold) return;
		const remainingMs = TOOLTIP_TRIGGER_SECONDS * 1000 - (Date.now() - pageLoadTime);
		if (remainingMs <= 0) return;
		const id = setTimeout(() => forceTick(t => t + 1), remainingMs);
		return () => clearTimeout(id);
	}, [meetsShapeThreshold]);

	useEffect(() => {
		if (isOpenRef.current) return;
		if (alreadySeen || wasReturningUser) return;
		if (state.mode !== 'drawing') return;
		if (state.isDrawing) return;
		if (state.isWelcomeModalOpen || state.isOnboardingVisible || state.isExporting) return;
		if (state.totalLayers !== 1) return;
		if (state.projectWasLoaded) return;
		if (!meetsShapeThreshold) return;

		const elapsedSeconds = (Date.now() - pageLoadTime) / 1000;
		if (elapsedSeconds < TOOLTIP_TRIGGER_SECONDS) return;

		isOpenRef.current = true;
		setIsOpen(true);
		setAlreadySeen(true);
		try { localStorage.setItem(LAYERS_TOOLTIP_SEEN_KEY, 'true'); } catch { /* no persiste, no rompe */ }
		analytics.layersTooltipShown(state.shapes.length, Math.round(elapsedSeconds));
	}, [
		alreadySeen, wasReturningUser, state.mode, state.isDrawing,
		state.isWelcomeModalOpen, state.isOnboardingVisible, state.isExporting,
		state.totalLayers, state.projectWasLoaded, meetsShapeThreshold,
	]);

	// Se desvanece solo a los TOOLTIP_VISIBLE_SECONDS de abrirse. Dibujar
	// mientras está visible ya NO lo cierra (v3.17.33) — el auto-cierre al
	// primer trazo garantizaba que nadie lo leyera: el tooltip aparece
	// mientras el usuario dibuja, así que el siguiente trazo lo mataba antes
	// de que levantara la vista.
	useEffect(() => {
		if (!isOpen) return;
		const id = setTimeout(() => dismiss('timeout'), TOOLTIP_VISIBLE_SECONDS * 1000);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	// Si añade una capa mientras está visible, se va solo: ya cumplió su
	// función y dejarlo ahí sería ruido.
	useEffect(() => {
		if (isOpenRef.current && state.totalLayers > 1) {
			dismiss('layer_added');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.totalLayers]);

	function dismiss(method: LayersTooltipDismissMethod) {
		if (!isOpenRef.current) return;
		isOpenRef.current = false;
		setIsOpen(false);
		analytics.layersTooltipDismissed(method);
	}

	return { isOpen, dismiss };
}
