import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, BrushMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
} from '../../types/strataTypes';

export type {
	Point, Shape, AppMode, ToolType, CinematicType, ExportType, BrushMode,
	PostProcessingSettings, PostProcessingEnabled, HandheldIntensity,
	TextSession, HistorySnapshot, AppState, LayerGradParams,
};

// --- Constants ---
import { BASE_DEPTH_STEP, MAX_LAYERS, MAX_HISTORY_STEPS } from '../../constants/layers';
export { BASE_DEPTH_STEP, MAX_LAYERS, MAX_HISTORY_STEPS }; // Moved to constants/layers.ts
export { APP_VERSION } from '../../constants/version'; // Moved to constants/version.ts

import { PALETTE_PRIMARY, PALETTE_ALTERNATIVE, GRADIENT_DEFAULTS, FIXED_PALETTE, ALTERNATIVE_PALETTE } from '../../constants/palette';
export type { PaletteColor } from '../../constants/palette';
export { PALETTE_PRIMARY, PALETTE_ALTERNATIVE, GRADIENT_DEFAULTS };

export { FIXED_PALETTE, ALTERNATIVE_PALETTE }; // Moved to constants/palette.ts

import {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
} from '../../utils/strokeGenerators';

export {
	generateTaperedStroke, generateUniformStroke, generateInkStroke, generateStrokeForMode,
};

// --- Actions ---

import type { Action } from '../../types/strataActions'; // Moved to types/strataActions.ts

// --- Initial State ---

import { initialState } from '../../constants/initialState';
export { initialState }; // Moved to constants/initialState.ts

import { appReducer } from '../../state/appReducer';
export { appReducer }; // Moved to state/appReducer.ts

// --- Context & Provider ---

const StrataContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | undefined>(undefined);

export const StrataProvider: React.FC<{ children: ReactNode; initialStateOverride?: Partial<AppState> }> = ({ children, initialStateOverride }) => {
	const merged = initialStateOverride ? { ...initialState, ...initialStateOverride } : initialState;
	const [state, dispatch] = useReducer(appReducer, merged);

	return (
		<StrataContext.Provider value={{ state, dispatch }}>
			{children}
		</StrataContext.Provider>
	);
};

export const useStrata = () => {
	const context = useContext(StrataContext);
	if (!context) {
		throw new Error('useStrata must be used within a StrataProvider');
	}
	return context;
};