import { downloadBlob } from '../../../utils/downloadBlob';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { ExportBackground } from '../../../types/strataTypes';

const BASE_DEPTH_STEP = 150; // StrataContext's (not imported: keeps this module free of the reducer)

export type LayerRender = (options: AnimationExportRenderOptions, background: ExportBackground) => HTMLCanvasElement;

/**
 * «Capas (ZIP)» (v3.25.11): the DRAW transparent PNG, rendered once per layer — same framing, size and live
 * projection as the single PNG (`render` is exactly the function that PNG uses) — zipped as `<stem>_01.png`…
 * numbered bottom to top (renderFrame paints layer 0 first: it is the back), so After Effects imports them in order.
 *
 * Exported layers: visible ones with shapes; in DRAW + animation, only those the canvas shows (current frame +
 * pinned). Each render hides every other layer; layers are rendered one at a time and each canvas is released before
 * the next (iPad memory).
 *
 * One random seed for the whole export: renderFrame regenerates the ink texture pattern (`shapePattern`, applied
 * per layer in composeLayer) with Math.random on every snapshot, so without a shared seed every layer would carry a
 * different texture and the stack would not equal any single PNG. With it, compositing the PNGs in order with
 * source-over is pixel-identical to a transparent PNG rendered with that seed. Math.random is restored at once: the
 * render is synchronous.
 */
export function exportedLayers(options: AnimationExportRenderOptions): number[] {
	const s = options.state;
	const frameZ = s.currentLayerIndex * -BASE_DEPTH_STEP;
	const pinned = new Set(s.locked3DLayers.map(i => i * -BASE_DEPTH_STEP));
	return [...options.shapesByZ.entries()]
		.filter(([z, shapes]) => shapes.length > 0
			&& !s.hiddenLayers.includes(Math.round(Math.abs(z / BASE_DEPTH_STEP)))
			&& (!s.isAnimationMode || z === frameZ || pinned.has(z)))
		.map(([z]) => Math.round(Math.abs(z / BASE_DEPTH_STEP)))
		.sort((a, b) => a - b);
}

const seeded = (seed: number) => {
	let s = seed | 0;
	return () => {
		s = s + 0x6D2B79F5 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
};

/** Renders one layer with every other layer hidden, under the export's seed. */
export function renderLayerAlone(options: AnimationExportRenderOptions, render: LayerRender, layer: number, all: number[], seed: number): HTMLCanvasElement {
	const others = new Set(options.state.hiddenLayers);
	for (const i of all) if (i !== layer) others.add(i);
	const real = Math.random;
	Math.random = seeded(seed);
	try {
		return render({ ...options, state: { ...options.state, hiddenLayers: [...others], isOnionSkinEnabled: false } }, 'transparent');
	} finally {
		Math.random = real;
	}
}

const toPng = (canvas: HTMLCanvasElement) => new Promise<Blob>((resolve, reject) =>
	canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png'));

/** Renders, encodes and zips the layers; resolves with the number of PNGs. Throws when there is nothing to export. */
export async function exportLayersZip(
	options: AnimationExportRenderOptions,
	render: LayerRender,
	stem: string,
	zipName: string,
): Promise<number> {
	const layers = exportedLayers(options);
	if (layers.length === 0) throw new Error('no visible layer with content');
	const seed = Math.floor(Math.random() * 2 ** 31);
	const files: Record<string, Uint8Array> = {};
	const pad = Math.max(2, String(layers.length).length);
	for (let k = 0; k < layers.length; k++) {
		const canvas = renderLayerAlone(options, render, layers[k], layers, seed);
		const png = await toPng(canvas);
		canvas.width = canvas.height = 0; // release the bitmap before the next layer
		files[`${stem}_${String(k + 1).padStart(pad, '0')}.png`] = new Uint8Array(await png.arrayBuffer());
	}
	const { zipSync } = await import('fflate');
	// PNG is already deflated: store, do not recompress.
	const zip = zipSync(files, { level: 0 });
	downloadBlob(new Blob([zip], { type: 'application/zip' }), zipName);
	return layers.length;
}
