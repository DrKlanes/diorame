// The FX panel: the intensity of each effect, the particle type, each effect's switch (Riso and Super Riso exclude
// each other), the master switch (off keeps the look and restores it), and the Super Riso settings and styles. None
// is an undo step; all of them dirty the project. Out of StrataContext.tsx (v3.26.29, refactor phase 3B), moved as it
// was.
import { applySuperRisoStyle, patchSuperRiso } from '../constants/superRiso';
import { playSound } from '../utils/soundManager';
import type { AppState, PostProcessingEnabled } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function setFxIntensity(state: AppState, action: Extract<Action, { type: 'SET_FX_INTENSITY' }>): AppState {
	return {
		...state,
		isDirty: true,
		postProcessing: {
			...state.postProcessing,
			[action.payload.fx]: action.payload.value
		}
	};
}

export function setParticleType(state: AppState, action: Extract<Action, { type: 'SET_PARTICLE_TYPE' }>): AppState {
	return {
		...state,
		isDirty: true,
		postProcessing: {
			...state.postProcessing,
			particleType: action.payload
		}
	};
}

export function toggleFx(state: AppState, action: Extract<Action, { type: 'TOGGLE_FX' }>): AppState {
	playSound('click');
	const turningOn = !state.postProcessingEnabled[action.payload];
	return {
		...state,
		isDirty: true,
		postProcessingEnabled: {
			...state.postProcessingEnabled,
			[action.payload]: turningOn,
			// Super Riso and Riso exclude each other: switching one on switches the other off.
			...(turningOn && action.payload === 'superRiso' ? { riso: false } : {}),
			...(turningOn && action.payload === 'riso' ? { superRiso: false } : {}),
		},
		postProcessingSnapshot: null,
		fxMasterEnabled: true,
	};
}

export function setSuperRiso(state: AppState, action: Extract<Action, { type: 'SET_SUPER_RISO' }>): AppState {
	return {
		...state,
		isDirty: true,
		postProcessing: { ...state.postProcessing, superRiso: patchSuperRiso(state.postProcessing.superRiso, action.payload) },
	};
}

export function setSuperRisoStyle(state: AppState, action: Extract<Action, { type: 'APPLY_SUPER_RISO_STYLE' }>): AppState {
	return {
		...state,
		isDirty: true,
		postProcessing: { ...state.postProcessing, superRiso: applySuperRisoStyle(state.postProcessing.superRiso, action.payload) },
	};
}

export function toggleFxMaster(state: AppState): AppState {
	playSound('click');
	const px = state.postProcessingEnabled;
	const hasActiveEffects = Object.values(px).some(v => v);
	if (hasActiveEffects && state.postProcessingSnapshot === null) {
		const allOff = Object.fromEntries(
			Object.keys(px).map(k => [k, false])
		) as PostProcessingEnabled;
		return {
			...state,
			isDirty: true,
			postProcessingSnapshot: { ...px } as PostProcessingEnabled,
			postProcessingEnabled: allOff,
			fxMasterEnabled: false,
		};
	} else if (state.postProcessingSnapshot !== null) {
		return {
			...state,
			isDirty: true,
			postProcessingEnabled: state.postProcessingSnapshot,
			postProcessingSnapshot: null,
			fxMasterEnabled: Object.values(state.postProcessingSnapshot).some(v => v),
		};
	} else {
		return state;
	}
}
