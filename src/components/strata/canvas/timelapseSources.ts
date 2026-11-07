import { createRectSession } from './formatSnapshot';
import { sceneAt } from './timelapseSchedule';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { Rect } from '../../../utils/formatFrame';
import type { Shape } from '../../../types/strataTypes';

/**
 * Where the timelapse's frames come from (v3.25.20). Both paint frame k (the shapes with appearance rank < k) and say
 * in advance how much shape work each frame costs, so the progress and the time left follow the work, not the frames.
 *
 * full:    the whole scene re-rendered through one rect session (the v3.25.17 path; work = k shapes per repaint).
 * layered: a cache per layer. A layer is re-rendered — alone, through one transparent session, as «Capas (ZIP)» renders
 *          each layer — only when its own set of visible shapes changed; the frame stacks the cached layers back to front
 *          with source-over (what renderFrame does on its buffer: Capas ZIP stacked = the transparent PNG, 0 px since
 *          v3.25.11) and transfers the stack onto a background drawn once, with renderFrame's own operation (multiply
 *          in light, source-over in dark). Work = the shapes of the layers that changed.
 * Every render runs under the export's seed: the ink texture is made by the first one, as in the PNG.
 */

/** A frame's work: shapes rendered and renders run (each one costs a fixed amount on top of its shapes). 0 / 0 = not repainted. */
export type FrameWork = { shapes: number; renders: number };

export type FrameSource = {
	/** Paints frame k and returns the canvas holding it (the same canvas every time). */
	paint: (k: number) => HTMLCanvasElement;
	/** What each frame of the sequence `ks` will render: shapes and separate renders (layers, or 1 for the full scene). */
	planWork: (ks: readonly number[]) => FrameWork[];
	release: () => void;
};

type Background = 'paper' | 'solid';

const seeded = (seed: number) => {
	let s = seed | 0;
	return () => {
		s = s + 0x6D2B79F5 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
};

const withSeed = <T,>(seed: number, fn: () => T): T => {
	const real = Math.random;
	Math.random = seeded(seed);
	try {
		return fn();
	} finally {
		Math.random = real;
	}
};

export function createFullSource(
	options: AnimationExportRenderOptions, rect: Rect, width: number, height: number, background: Background,
	shapes: readonly Shape[], rank: Int32Array, seed: number,
): FrameSource {
	const session = createRectSession(options, rect, width, height, background);
	return {
		paint: k => withSeed(seed, () => session.render(sceneAt(shapes, rank, k))),
		planWork: ks => ks.map((k, i) => (i > 0 && k === ks[i - 1] ? { shapes: 0, renders: 0 } : { shapes: k, renders: 1 })),
		release: () => session.release(),
	};
}

// Number of values < k in an ascending array.
const countBelow = (sorted: Int32Array, k: number) => {
	let lo = 0, hi = sorted.length;
	while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < k) lo = mid + 1; else hi = mid; }
	return lo;
};

export function createLayeredSource(
	options: AnimationExportRenderOptions, rect: Rect, width: number, height: number, background: Background,
	shapes: readonly Shape[], rank: Int32Array, seed: number,
): FrameSource {
	// The layers that appear, back to front (renderFrame's order: z descending), with their shapes in array order.
	const byZ = new Map<number, number[]>();
	shapes.forEach((s, i) => { if (rank[i] >= 0) (byZ.get(s.zIndex) ?? byZ.set(s.zIndex, []).get(s.zIndex)!).push(i); });
	const zs = [...byZ.keys()].sort((a, b) => b - a);
	const ranks = new Map(zs.map(z => [z, Int32Array.from(byZ.get(z)!.map(i => rank[i])).sort()]));

	const canvas = (alpha = true) => {
		const c = document.createElement('canvas');
		c.width = width; c.height = height;
		return { c, x: c.getContext('2d', { alpha })! };
	};
	// One transparent session renders every layer (only its layer buffer is read: no paper there).
	const layerSession = createRectSession({ ...options, paperImg: null }, rect, width, height, 'transparent');
	const caches = new Map(zs.map(z => [z, canvas()]));
	const counts = new Map(zs.map(z => [z, 0]));
	// The background once: the same recipe with no shapes — the pipeline's paper canvas, or the solid fill.
	const bgSession = createRectSession(options, rect, width, height, background);
	const bg = canvas(background !== 'paper');
	bg.x.drawImage(withSeed(seed, () => bgSession.render({ shapesByZ: new Map(), sortedZs: [] })), 0, 0);
	bgSession.release();
	const stack = canvas();
	// The frame has the alpha of the canvas the PNG ends on: the pipeline's main canvas (opaque) for paper, renderDrawSnapshot's for solid.
	const frame = canvas(background !== 'paper');
	const transfer = options.state.isDarkMode ? 'source-over' : 'multiply';

	return {
		paint: k => {
			for (const z of zs) {
				const n = countBelow(ranks.get(z)!, k);
				if (n === counts.get(z)) continue;
				counts.set(z, n);
				const cache = caches.get(z)!;
				cache.x.clearRect(0, 0, width, height);
				if (n === 0) continue;
				const layer = byZ.get(z)!.filter(i => rank[i] < k).map(i => shapes[i]);
				cache.x.drawImage(withSeed(seed, () => layerSession.render({ shapesByZ: new Map([[z, layer]]), sortedZs: [z] })), 0, 0);
			}
			stack.x.clearRect(0, 0, width, height);
			for (const z of zs) if (counts.get(z)! > 0) stack.x.drawImage(caches.get(z)!.c, 0, 0);
			frame.x.globalCompositeOperation = 'source-over';
			frame.x.drawImage(bg.c, 0, 0);
			frame.x.globalCompositeOperation = transfer;
			frame.x.drawImage(stack.c, 0, 0);
			frame.x.globalCompositeOperation = 'source-over';
			return frame.c;
		},
		planWork: ks => {
			const last = new Map(zs.map(z => [z, 0]));
			return ks.map(k => {
				let shapes = 0, renders = 0;
				for (const z of zs) {
					const n = countBelow(ranks.get(z)!, k);
					if (n !== last.get(z)) { last.set(z, n); shapes += n; if (n > 0) renders++; }
				}
				return { shapes, renders };
			});
		},
		release: () => {
			layerSession.release();
			for (const c of [...[...caches.values()].map(v => v.c), bg.c, stack.c, frame.c]) c.width = c.height = 0;
		},
	};
}
