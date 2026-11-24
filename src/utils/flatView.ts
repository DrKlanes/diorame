import { BASE_DEPTH_STEP } from '../constants/layers';
import { frameInView } from './formatFrame';
import type { AppState, DrawFormat } from '../types/strataTypes';

// The flat front view (CINEMA preset 'flat', v3.26.71): the scene head-on through DRAW's projection, with CINEMA's FX.
// Single source for the render, RESET_DRAWING_VIEW and the exports. Design and decisions: docs/flat-view-proposal.md.

export const isFlatView = (state: Pick<AppState, 'mode' | 'cinematicType'>): boolean =>
	state.mode === 'cinematic' && state.cinematicType === 'flat';

// DRAW's camera (ControlsV2 sets the same one on entering DRAW): the active layer's plane at scale 1. The render reads it
// from the state every frame, never from cameraRef, which the CINEMA tick writes one frame ahead.
export const flatViewCamera = (state: Pick<AppState, 'currentLayerIndex'>): { x: number; y: number; z: number; rotation: number } =>
	({ x: 0, y: 0, z: state.currentLayerIndex * -BASE_DEPTH_STEP, rotation: 0 });

// Lens distortion in the flat view (v3.26.80, docs/flat-view-proposal.md §13): CINEMA's formula, f = 1 + k·(nx² + ny²), on
// the point DRAW's projection already placed on screen, with a monotonic limit for barrel (transformPoint.ts). It applies only in the flat view, with the FX on (k ≠ 0, the
// pipeline's distortionK), and never to pinned layers — as in CINEMA.
export const flatDistortionApplies = (isFlat: boolean, distortionK: number, isPinned: boolean): boolean =>
	isFlat && distortionK !== 0 && !isPinned;

export type FlatDistortFrame = { cx: number; cy: number; hx: number; hy: number };

// What the distortion is centred on and normalised by (nx = dx / hx, ny = dy / hy), in device px: the Formato frame on screen
// when there is one — so the PNG Formato, whose canvas IS the frame, comes out as seen and pan / zoom do not make it swim
// inside the frame — else the viewport, exactly CINEMA's half-viewport normalisation. `cameraZ` is the flat view's (DRAW's).
export const flatDistortFrame = (
	format: DrawFormat | null,
	cameraZ: number,
	isAnimationMode: boolean,
	viewZoom: number,
	viewPan: { x: number; y: number },
	centerXScreen: number,
	centerYScreen: number,
): FlatDistortFrame => {
	if (!format) return { cx: centerXScreen, cy: centerYScreen, hx: centerXScreen, hy: centerYScreen };
	const r = frameInView(format, cameraZ, isAnimationMode);
	return {
		cx: centerXScreen + (r.x + r.w / 2) * viewZoom + viewPan.x,
		cy: centerYScreen + (r.y + r.h / 2) * viewZoom + viewPan.y,
		hx: (r.w / 2) * viewZoom,
		hy: (r.h / 2) * viewZoom,
	};
};
