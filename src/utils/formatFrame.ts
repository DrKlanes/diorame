import { DRAW_FOCAL_LENGTH } from '../constants/renderConstants';
import type { DrawFormat, FormatOrientation, FormatType } from '../types/strataTypes';

// DRAW format guide (v3.25.5). Since v3.25.28 `format.rect` is in LAYER 0's plane: the frame is drawn like layer-0
// ink, so it shrinks slightly (parallax) while an upper layer is active, and ink merged down to layer 0 stays where
// it was against it (merge down keeps relative alignment, mergeLayers.ts). The active layer's plane has DRAW scale 1
// (camera.z follows the active layer), so there world ⇄ screen is only zoom and pan:
//   screen = size/2 + world·zoom + pan        world = (screen − size/2 − pan) / zoom
// The view, «Dibujo completo» and the export rectangles are in that active plane: frameInView() takes the frame
// there (scaled around the world origin, like transformPoint.ts), toFramePlane() brings a view rectangle back.
// DRAW animation keeps the frame on the active plane (scale 1): each frame of the flipbook is its own layer.

export type Rect = { x: number; y: number; w: number; h: number };

/** Scale at which a camera at `cameraZ` shows layer 0's plane in DRAW (transformPoint.ts, raw z = 0). */
export const layer0Scale = (cameraZ: number): number => DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH - cameraZ);

/** Scale of the frame's plane seen from the camera: layer 0's, or 1 in animation. */
export const framePlaneScale = (cameraZ: number, isAnimationMode: boolean): number => (isAnimationMode ? 1 : layer0Scale(cameraZ));

export const scaleRect = (r: Rect, k: number): Rect => ({ x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k });

/** The frame in the active layer's plane (what the live DRAW projection shows, at zoom 1 / pan 0). */
export const frameInView = (format: DrawFormat, cameraZ: number, isAnimationMode: boolean): Rect =>
	scaleRect(format.rect, framePlaneScale(cameraZ, isAnimationMode));

/** A rectangle of the active layer's plane (e.g. the visible view) in the frame's plane. */
export const toFramePlane = (r: Rect, cameraZ: number, isAnimationMode: boolean): Rect =>
	scaleRect(r, 1 / framePlaneScale(cameraZ, isAnimationMode));

export const FORMAT_TYPES: readonly FormatType[] = ['A', '16:9', '4:3', '4:5', '1:1'] as const;

// Same limits as the DRAW zoom and the world-space pan clamp (StrataCanvas: |pan| ≤ MAX_PAN · zoom).
export const MIN_DRAW_ZOOM = 0.5;
export const MAX_DRAW_ZOOM = 3;
export const MAX_PAN_WORLD = 1500;

const NEW_FRAME_FILL = 0.88;   // a new frame takes ~88 % of the view
const FIT_MARGIN = 0.06;        // "Centrar vista" leaves ~6 % around the frame
const MIN_SIDE = 16;
const MAX_SIDE = 20000;
const MAX_COORD = 20000;

/** The orientation a type can actually have: 4:5 is portrait only, 1:1 has none (stored as portrait). */
export function orientationFor(type: FormatType, orientation: FormatOrientation): FormatOrientation {
	return type === '4:5' || type === '1:1' ? 'portrait' : orientation;
}

/** width / height of the frame. */
export function formatAspect(type: FormatType, orientation: FormatOrientation): number {
	const o = orientationFor(type, orientation);
	const long = type === 'A' ? Math.SQRT2 : type === '16:9' ? 16 / 9 : type === '4:3' ? 4 / 3 : type === '4:5' ? 5 / 4 : 1;
	return o === 'landscape' ? long : 1 / long;
}

/** The world rectangle the DRAW canvas shows (same as superRisoBridge's visibleDrawView). */
export function visibleWorldRect(zoom: number, pan: { x: number; y: number }, w: number, h: number): Rect {
	const z = zoom || 1;
	return { x: (-w / 2 - pan.x) / z, y: (-h / 2 - pan.y) / z, w: w / z, h: h / z };
}

/** A frame of `aspect` centred in `view`, filling `fill` of it. */
function rectIn(view: Rect, aspect: number, fill = NEW_FRAME_FILL): Rect {
	const w = Math.min(view.w * fill, view.h * fill * aspect);
	const h = w / aspect;
	return { x: view.x + (view.w - w) / 2, y: view.y + (view.h - h) / 2, w, h };
}

/** A new frame fitted to the current view. */
export function newFormat(type: FormatType, orientation: FormatOrientation, view: Rect): DrawFormat {
	const o = orientationFor(type, orientation);
	return { type, orientation: o, rect: rectIn(view, formatAspect(type, o)) };
}

/** Another type or orientation for an existing frame: same centre, sized like a new frame for the current view
 *  (keeping the long side turned a landscape A into a portrait taller than the screen). */
export function reshapeFormat(format: DrawFormat, type: FormatType, orientation: FormatOrientation, view: Rect): DrawFormat {
	const o = orientationFor(type, orientation);
	const { w, h } = rectIn(view, formatAspect(type, o));
	const cx = format.rect.x + format.rect.w / 2, cy = format.rect.y + format.rect.h / 2;
	return { type, orientation: o, rect: { x: cx - w / 2, y: cy - h / 2, w, h } };
}

/** Zoom and pan that show `rect` whole in a w×h canvas with a margin; zoom clamped to the DRAW range. */
export function fitViewToRect(rect: Rect, w: number, h: number): { zoom: number; pan: { x: number; y: number } } {
	const raw = Math.min(w * (1 - 2 * FIT_MARGIN) / rect.w, h * (1 - 2 * FIT_MARGIN) / rect.h);
	const zoom = Math.min(MAX_DRAW_ZOOM, Math.max(MIN_DRAW_ZOOM, raw));
	const clamp = (v: number) => Math.max(-MAX_PAN_WORLD, Math.min(MAX_PAN_WORLD, v));
	const cx = clamp(rect.x + rect.w / 2), cy = clamp(rect.y + rect.h / 2);
	return { zoom, pan: { x: -cx * zoom, y: -cy * zoom } };
}

/** A `format` read from a file or the autosave: known values only, finite and bounded, aspect re-derived
 *  from the type (the width wins). Anything else → null (no frame). */
export function sanitizeFormat(raw: unknown): DrawFormat | null {
	if (!raw || typeof raw !== 'object') return null;
	const f = raw as Record<string, unknown>;
	const type = f.type as FormatType;
	if (!FORMAT_TYPES.includes(type)) return null;
	const orientation = orientationFor(type, f.orientation === 'landscape' ? 'landscape' : 'portrait');
	const r = f.rect as Record<string, unknown> | null;
	if (!r || typeof r !== 'object') return null;
	const { x, y, w } = r;
	if (typeof x !== 'number' || typeof y !== 'number' || typeof w !== 'number') return null;
	if (![x, y, w].every(Number.isFinite) || w < MIN_SIDE || w > MAX_SIDE) return null;
	const h = w / formatAspect(type, orientation);
	if (h < MIN_SIDE || h > MAX_SIDE || Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD) return null;
	return { type, orientation, rect: { x, y, w, h } };
}
