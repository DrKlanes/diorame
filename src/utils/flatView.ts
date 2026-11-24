import { BASE_DEPTH_STEP } from '../constants/layers';
import type { AppState } from '../types/strataTypes';

// The flat front view (CINEMA preset 'flat', v3.26.71): the scene head-on through DRAW's projection, with CINEMA's FX.
// Single source for the render, RESET_DRAWING_VIEW and the exports. Design and decisions: docs/flat-view-proposal.md.

export const isFlatView = (state: Pick<AppState, 'mode' | 'cinematicType'>): boolean =>
	state.mode === 'cinematic' && state.cinematicType === 'flat';

// DRAW's camera (ControlsV2 sets the same one on entering DRAW): the active layer's plane at scale 1. The render reads it
// from the state every frame, never from cameraRef, which the CINEMA tick writes one frame ahead.
export const flatViewCamera = (state: Pick<AppState, 'currentLayerIndex'>): { x: number; y: number; z: number; rotation: number } =>
	({ x: 0, y: 0, z: state.currentLayerIndex * -BASE_DEPTH_STEP, rotation: 0 });
