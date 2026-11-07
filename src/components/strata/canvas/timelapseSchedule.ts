import type { AppState, Shape } from '../../../types/strataTypes';
import type { SnapshotScene } from './drawSnapshot';

const BASE_DEPTH_STEP = 150; // StrataContext's (not imported: this module must not pull the reducer)

/**
 * Timelapse schedule (v3.25.17). Two orders, never mixed:
 *   WHEN a shape appears — its creation time `t` (v3.25.16). Shapes without `t` (older files) come first, in array
 *   order; then the stamped ones by `t`, ties by array index.
 *   HOW it is painted — always the array order inside its layer (erasers, drawInside/Behind and isolated groups act
 *   on what is already painted there). Shapes are never sorted by `t` to paint: a frame paints, in array order, the
 *   shapes whose appearance rank is below k.
 */

/** The layers the DRAW render paints: visible ones; in animation mode only the current frame and the pinned. */
export function paintsLayer(state: AppState): (z: number) => boolean {
	const hidden = new Set(state.hiddenLayers);
	const frameZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
	const pinned = new Set(state.locked3DLayers.map(i => i * -BASE_DEPTH_STEP));
	return z => !hidden.has(Math.round(Math.abs(z / BASE_DEPTH_STEP)))
		&& (!state.isAnimationMode || z === frameZ || pinned.has(z));
}

/**
 * Appearance rank of each shape (index into the sequence of shapes the timelapse reveals), −1 for the ones on layers
 * that are not painted (they would add frames where nothing changes). `count` = shapes that appear.
 */
export function appearanceRanks(shapes: readonly Shape[], paints: (z: number) => boolean): { rank: Int32Array; count: number } {
	const order: number[] = [];
	for (let i = 0; i < shapes.length; i++) if (paints(shapes[i].zIndex)) order.push(i);
	const t = (i: number) => shapes[i].t;
	order.sort((a, b) => {
		const ta = t(a), tb = t(b);
		if (ta === undefined || tb === undefined) {
			if (ta !== tb) return ta === undefined ? -1 : 1;
			return a - b;
		}
		return ta - tb || a - b;
	});
	const rank = new Int32Array(shapes.length).fill(-1);
	order.forEach((i, r) => { rank[i] = r; });
	return { rank, count: order.length };
}

/**
 * How many shapes frame i shows. The drawing phase has `drawFrames` frames: the first is the blank paper, the last
 * the whole drawing, the shapes spread uniformly in between. Then `holdFrames` more of the finished drawing.
 */
export function shapesAtFrame(i: number, count: number, drawFrames: number): number {
	if (i >= drawFrames - 1 || drawFrames <= 1) return count;
	return Math.round(count * i / (drawFrames - 1));
}

/** The scene at k: each layer's shapes with rank < k, in their array order. */
export function sceneAt(shapes: readonly Shape[], rank: Int32Array, k: number): SnapshotScene {
	const shapesByZ = new Map<number, Shape[]>();
	for (let i = 0; i < shapes.length; i++) {
		const r = rank[i];
		if (r < 0 || r >= k) continue;
		const s = shapes[i];
		let layer = shapesByZ.get(s.zIndex);
		if (!layer) { layer = []; shapesByZ.set(s.zIndex, layer); }
		layer.push(s);
	}
	return { shapesByZ, sortedZs: [...shapesByZ.keys()].sort((a, b) => b - a) };
}
