import { DRAW_FOCAL_LENGTH } from '../../../constants/renderConstants';

type Point2D = { x: number; y: number };

export type GizmoHandles = {
	tl: Point2D;
	tr: Point2D;
	br: Point2D;
	bl: Point2D;
	rotate: Point2D;
	center: Point2D;
};

type TransformState = {
	layerBB: { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number } | null;
	isActive: boolean;
	currentTransform: { x: number; y: number; scale: number; rotation: number };
	centerX: number;
	centerY: number;
};

/**
 * Draws the transform gizmo (bounding box, corner handles, rotate handle)
 * when the move tool is active and a layer is selected. Also positions or
 * hides the flip buttons DOM overlay.
 *
 * SIDE EFFECTS:
 * - Mutates ctx state (transform, lineWidth, strokeStyle, fillStyle)
 * - Mutates flipButtonsEl.style (transform, opacity, pointerEvents)
 *
 * RETURN VALUE — semantically meaningful:
 * - Returns the new handles object when the gizmo is shown. The caller
 *   should assign this to transformHandlesRef.current so pointer handlers
 *   can hit-test against the screen-space handle positions in subsequent
 *   frames.
 * - Returns null when the gate fails (mode != drawing, tool != move, or
 *   no layerBB). The caller assigns null to the ref, which pointer
 *   handlers treat as "no gizmo present" via `if (handles)` checks.
 *
 * The gate runs INSIDE this function (early return), so the caller does
 * not need to wrap the call in a conditional.
 *
 * @param ctx                 Canvas 2D context
 * @param w                   Canvas width
 * @param h                   Canvas height
 * @param mode                Current app mode ('drawing' | 'cinematic')
 * @param tool                Current tool
 * @param transformState      transformRef.current
 * @param currentLayerIndex   For activeZ calc
 * @param drawingZoom         For screen-space projection
 * @param drawingPan          For screen-space projection
 * @param cameraZ             currentCamera.z (post-quantize)
 * @param flipButtonsEl       flipButtonsRef.current (HTMLDivElement | null)
 * @param baseDepthStep       BASE_DEPTH_STEP (from StrataContext)
 * @returns                   GizmoHandles when shown, null when hidden
 */
export const drawGizmo = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	mode: string,
	tool: string,
	transformState: TransformState,
	currentLayerIndex: number,
	drawingZoom: number,
	drawingPan: { x: number; y: number } | null | undefined,
	cameraZ: number,
	flipButtonsEl: HTMLDivElement | null,
	baseDepthStep: number,
): GizmoHandles | null => {
	if (!(mode === 'drawing' && tool === 'move' && transformState.layerBB)) {
		// Hide flip buttons when gizmo is not visible
		if (flipButtonsEl) {
			flipButtonsEl.style.opacity = '0';
			flipButtonsEl.style.pointerEvents = 'none';
		}
		return null;
	}

	const tr = transformState;
	const bb = tr.layerBB!;
	const t = tr.isActive ? tr.currentTransform : { x: 0, y: 0, scale: 1, rotation: 0 };
	const cx = tr.centerX;
	const cy = tr.centerY;
	const sin = Math.sin(t.rotation);
	const cos = Math.cos(t.rotation);

	const activeZ = currentLayerIndex * -baseDepthStep;
	const dDraw = activeZ - cameraZ;
	const sDraw = DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH + dDraw);

	const project = (wx: number, wy: number) => {
		// World Transform
		const ox = wx - cx;
		const oy = wy - cy;
		const rx = (ox * cos - oy * sin) * t.scale;
		const ry = (ox * sin + oy * cos) * t.scale;
		const finalX = rx + cx + t.x;
		const finalY = ry + cy + t.y;

		// Screen Projection (Drawing Mode)
		const sx = finalX * sDraw;
		const sy = finalY * sDraw;
		const screenX = (w/2) + (sx * (drawingZoom || 1)) + (drawingPan?.x || 0);
		const screenY = (h/2) + (sy * (drawingZoom || 1)) + (drawingPan?.y || 0);
		return { x: screenX, y: screenY };
	};

	const pTL = project(bb.minX, bb.minY);
	const pTR = project(bb.maxX, bb.minY);
	const pBR = project(bb.maxX, bb.maxY);
	const pBL = project(bb.minX, bb.maxY);

	// Rotate handle above top edge
	// Project unrotated top-mid point, but moved up in unrotated Y
	// Actually, simpler: take projected TL and TR, find midpoint, then extend perpendicular.
	// OR project a point that is (cx, minY - offset) in LOCAL space.
	// Let's do Local Space projection logic properly.
	// Point in Local Space: (0, -offset) relative to (0,0) center? No.
	// Relative to center (cx, cy):
	// Top Edge Mid: (0, minY - cy).
	// Handle: (0, minY - cy - offset).

	const offset = 120 / sDraw / (drawingZoom || 1); // constant screen size offset
	const pRot = project(cx, bb.minY - offset);
	const pCenter = project(bb.cx, bb.cy);

	// Compute handles (returned so caller can update its ref)
	const handles: GizmoHandles = {
		tl: pTL, tr: pTR, br: pBR, bl: pBL,
		rotate: pRot, center: pCenter,
	};

	// Draw
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.lineWidth = 2;
	ctx.strokeStyle = '#3b82f6';
	ctx.beginPath();
	ctx.moveTo(pTL.x, pTL.y);
	ctx.lineTo(pTR.x, pTR.y);
	ctx.lineTo(pBR.x, pBR.y);
	ctx.lineTo(pBL.x, pBL.y);
	ctx.closePath();
	ctx.stroke();

	// Rotate Line
	const topMid = { x: (pTL.x+pTR.x)/2, y: (pTL.y+pTR.y)/2 };
	ctx.beginPath();
	ctx.moveTo(topMid.x, topMid.y);
	ctx.lineTo(pRot.x, pRot.y);
	ctx.stroke();

	// Handles
	ctx.fillStyle = '#ffffff';
	ctx.lineWidth = 1.5;
	const drawHandle = (p: {x:number,y:number}, type: string) => {
		ctx.beginPath();
		ctx.arc(p.x, p.y, type === 'rotate' ? 5 : 6, 0, Math.PI*2);
		ctx.fill();
		ctx.stroke();
	};

	drawHandle(pTL, 'scale');
	drawHandle(pTR, 'scale');
	drawHandle(pBR, 'scale');
	drawHandle(pBL, 'scale');
	ctx.fillStyle = '#3b82f6';
	drawHandle(pRot, 'rotate');

	// Position flip buttons overlay below bounding box
	if (flipButtonsEl) {
		const bottomMid = { x: (pBL.x + pBR.x) / 2, y: (pBL.y + pBR.y) / 2 };
		flipButtonsEl.style.transform = `translate(${bottomMid.x}px, ${bottomMid.y + 16}px) translate(-50%, 0)`;
		flipButtonsEl.style.opacity = tr.isActive ? '0' : '1';
		flipButtonsEl.style.pointerEvents = tr.isActive ? 'none' : 'auto';
	}

	return handles;
};
