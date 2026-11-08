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

/** Pacing by drawing time (v3.25.25): a gap between two consecutive timed shapes counts as at most this much real time (ms). */
export const TIMELAPSE_IDLE_GAP_MS = 1000;

const isTimed = (s: Shape) => s.t !== undefined && s.t > 0;

/**
 * Shapes shown by every frame of the video (`total` = drawing frames + hold), the pacing of the timelapse.
 * Untimed shapes (no `t`, or the synthetic t ≤ 0 that Acoplar abajo stamps) are always the head of the appearance order:
 * they keep the uniform pacing of v3.25.17 at full rate (a file with no timed shapes gets exactly `shapesAtFrame`), up to
 * the first frame B whose uniform count reaches them. From B on, the timed tail fills the remaining drawing frames by
 * compressed drawing time: a shape appears at the sum of its gaps with the previous one, each gap capped at
 * TIMELAPSE_IDLE_GAP_MS, so bursts take few frames, slow strokes more, and a pause of hours counts as one gap.
 * Frame 0 stays blank, the last drawing frame has everything, the hold repeats it. A tail with no compressed span (one
 * timed shape, or all with the same `t`) falls back to uniform.
 */
export function frameShapeCounts(shapes: readonly Shape[], rank: Int32Array, count: number, drawFrames: number, total: number): Int32Array {
	const ks = new Int32Array(total);
	const last = drawFrames - 1;
	const byRank = new Int32Array(count);
	for (let i = 0; i < shapes.length; i++) if (rank[i] >= 0) byRank[rank[i]] = i;
	let u = 0;
	while (u < count && !isTimed(shapes[byRank[u]])) u++;
	const n = count - u;
	const cum = new Float64Array(n);
	for (let r = 1; r < n; r++) cum[r] = cum[r - 1] + Math.min(shapes[byRank[u + r]].t! - shapes[byRank[u + r - 1]].t!, TIMELAPSE_IDLE_GAP_MS);
	const span = n > 0 ? cum[n - 1] : 0;
	if (span <= 0 || last <= 0) {
		for (let i = 0; i < total; i++) ks[i] = shapesAtFrame(i, count, drawFrames);
		return ks;
	}
	let b = 0;
	while (b < last && Math.round(count * b / last) < u) b++;
	const den = last - b;
	let p = 0;
	for (let i = 0; i < total; i++) {
		if (i >= last) ks[i] = count;
		else if (i <= b) ks[i] = Math.min(u, shapesAtFrame(i, count, drawFrames));
		else {
			while (p < n && cum[p] * den < span * (i - b)) p++; // integer ms on both sides: exact
			ks[i] = u + p;
		}
	}
	return ks;
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
