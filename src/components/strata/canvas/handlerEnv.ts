import type React from 'react';
import type { AppState, Point, GestureState } from '../../../types/strataTypes';
import type { Action } from '../../../types/strataActions';
import type { TransformRefState, DrawnFrameOptics } from './renderPipeline';
import type { OrbitState } from './cinematicCamera';
import type { GizmoHandles } from './drawGizmo';
import type { TransformMode } from './moveGizmoInteraction';

/**
 * What the pointer and touch handlers of the canvas close over (handlers sprint, v3.26.61).
 *
 * The handlers used to be closures written inside StrataCanvas; their bodies now live in
 * canvas/touchHandlers.ts and the canvas/pointer*Handler.ts modules, and this is the list of
 * everything those bodies read from the component: the state of THIS render, dispatch, the refs
 * (the objects — every handler still reads `.current` when its event arrives) and the two cursor
 * setters. StrataCanvas builds one per render, exactly where the handlers were defined, and
 * creates the handlers from it; the refs themselves stay declared in the component, because the
 * render loop, the Space hook and resetGestureState read the same ones.
 *
 * A type only: nothing here runs.
 */
export type CanvasHandlerEnv = {
	state: AppState;
	dispatch: React.Dispatch<Action>;

	canvasRef: React.RefObject<HTMLCanvasElement>;
	canvasRectRef: React.MutableRefObject<DOMRect | null>;

	// Stroke in progress
	currentPointsRef: React.MutableRefObject<Point[]>;
	isDrawingRef: React.MutableRefObject<boolean>;
	drawingPointerTypeRef: React.MutableRefObject<string | null>;
	drawingPressureRef: React.MutableRefObject<number>;
	organicPhaseRef: React.MutableRefObject<number>;
	activePointerIdRef: React.MutableRefObject<number | null>;

	// Touch gestures, pan and zoom
	gestureRef: React.MutableRefObject<GestureState>;
	pinchEndTimestampRef: React.MutableRefObject<number>;
	isPanningRef: React.MutableRefObject<boolean>;
	isSpaceDownRef: React.MutableRefObject<boolean>;
	spacePanEngagedRef: React.MutableRefObject<boolean>;

	// CINEMA
	orbitRef: React.MutableRefObject<OrbitState>;
	lastClickTimeRef: React.MutableRefObject<number>;
	lastClickPosRef: React.MutableRefObject<{ x: number; y: number }>;
	drawnFrameRef: React.MutableRefObject<DrawnFrameOptics | null>;

	// Move tool
	moveRef: React.MutableRefObject<{ startX: number; startY: number; offsetX: number; offsetY: number } | null>;
	transformRef: React.MutableRefObject<TransformRefState>;
	transformHandlesRef: React.MutableRefObject<GizmoHandles | null>;
	hoverGizmoModeRef: React.MutableRefObject<TransformMode | null>;
	pendingDeselectRef: React.MutableRefObject<boolean>;

	setIsDrawing: (v: boolean) => void;
	setCursorOverride: (v: string | null) => void;
	setGizmoCursor: (v: string | null) => void;
	getActiveZ: (layerIndex: number) => number;
	MAX_PAN: number;
};
