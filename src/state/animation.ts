// Animation mode: entering and leaving it (the active layer is restored on the way out), playback, framerate, export
// loops and GIF scale, onion skin, flat Z, and the frame sequence (advance in loop or ping-pong, step with circular
// wrap, never creating layers). None is an undo step and none dirties the project (CLAUDE.md: never the animation).
// Out of StrataContext.tsx (v3.26.30, refactor phase 3B), moved as it was.
import { BASE_DEPTH_STEP } from '../constants/layers';
import { resolveLayerBrush } from '../utils/layerBrush';
import { getAnimationFrames } from '../utils/animationFrames';
import type { AppState } from '../types/strataTypes';
import type { Action } from '../types/strataActions';


export function toggleAnimationMode(state: AppState): AppState {
	const entering = !state.isAnimationMode;
	if (entering) {
		return {
			...state,
			isAnimationMode: true,
			layerIndexBeforeAnimation: state.currentLayerIndex,
		};
	} else {
		const restored = state.layerIndexBeforeAnimation;
		const safeIndex = (restored != null && restored >= 0 && restored < state.totalLayers)
			? restored
			: state.currentLayerIndex;
		return {
			...state,
			isAnimationMode: false,
			isAnimationPlaying: false,
			currentLayerIndex: safeIndex,
			layerIndexBeforeAnimation: null,
		};
	}
}

export function setAnimationPlaying(state: AppState, action: Extract<Action, { type: 'SET_ANIMATION_PLAYING' }>): AppState {
	return { ...state, isAnimationPlaying: action.payload };
}

export function setAnimationFramerate(state: AppState, action: Extract<Action, { type: 'SET_ANIMATION_FRAMERATE' }>): AppState {
	return { ...state, animationFramerate: action.payload };
}

export function setAnimationExportLoops(state: AppState, action: Extract<Action, { type: 'SET_ANIMATION_EXPORT_LOOPS' }>): AppState {
	return { ...state, animationExportLoops: action.payload };
}

export function setGifExportScale(state: AppState, action: Extract<Action, { type: 'SET_GIF_EXPORT_SCALE' }>): AppState {
	return { ...state, gifExportScale: action.payload };
}

export function toggleOnionSkin(state: AppState): AppState {
	return { ...state, isOnionSkinEnabled: !state.isOnionSkinEnabled };
}

export function toggleAnimationFlatZ(state: AppState): AppState {
	return { ...state, isAnimationFlatZ: !state.isAnimationFlatZ };
}

export function advanceAnimationFrame(state: AppState): AppState {
	const frames = getAnimationFrames(state);
	if (frames.length === 0) return state;
	const currentPos = frames.indexOf(state.currentLayerIndex);
	if (state.animationPlaybackMode !== 'pingpong' || frames.length < 2) {
		// Loop mode (or single frame): always forward, wrap to start
		const nextIndex = currentPos === -1
			? frames[0]
			: frames[(currentPos + 1) % frames.length];
		return { ...state, currentLayerIndex: nextIndex };
	}
	// Ping-pong mode: advance by current direction, reverse at extremities
	const dir = state.animationDirection;
	const pos = currentPos === -1 ? 0 : currentPos;
	let nextPos = pos + dir;
	let nextDir = dir;
	if (nextPos >= frames.length) {
		nextDir = -1;
		nextPos = frames.length - 2; // skip back, don't replay last frame
	} else if (nextPos < 0) {
		nextDir = 1;
		nextPos = 1; // skip forward, don't replay first frame
	}
	return { ...state, currentLayerIndex: frames[nextPos], animationDirection: nextDir as 1 | -1 };
}

export function stepAnimationFrame(state: AppState, action: Extract<Action, { type: 'STEP_ANIMATION_FRAME' }>): AppState {
	// Navigate the real frame sequence with circular wrap, never creating layers.
	// Used by the pill buttons (frame-back / frame-fwd).
	// Keyboard shortcuts [/] keep PREV_LAYER/NEXT_LAYER (construct in DRAW).
	const dir = action.payload;
	const frames = getAnimationFrames(state);
	if (frames.length === 0) return state;
	const pos = frames.indexOf(state.currentLayerIndex);
	// If current layer is empty/hidden (not in sequence): go to first or last frame
	const nextPos = pos === -1
		? (dir > 0 ? 0 : frames.length - 1)
		: (pos + dir + frames.length) % frames.length;
	const nextIndex = frames[nextPos];
	const newZ = nextIndex * -BASE_DEPTH_STEP;
	const hasShapesInNewLayer = state.shapes.some(s => s.zIndex === newZ);
	const nextBrush = resolveLayerBrush(state.shapes, nextIndex, state.layerBrushSettings[nextIndex]) || { thickness: state.currentBrushThickness, mode: state.brushMode };
	return {
		...state,
		currentLayerIndex: nextIndex,
		camera: { ...state.camera, z: newZ, rotation: 0 },
		isDrawInside: hasShapesInNewLayer ? state.isDrawInside : false,
		isDrawBehind: hasShapesInNewLayer ? state.isDrawBehind : false,
		paletteMode: state.layerRenderModes[nextIndex] || 'flat',
		currentBrushThickness: nextBrush.thickness,
		brushMode: nextBrush.mode,
	};
}

export function toggleAnimationPlaybackMode(state: AppState): AppState {
	return {
		...state,
		animationPlaybackMode: state.animationPlaybackMode === 'loop' ? 'pingpong' : 'loop',
		animationDirection: 1, // reset direction when switching modes
	};
}
