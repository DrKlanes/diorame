import { renderDrawSnapshot } from './drawSnapshot';
import type { AnimationExportRenderOptions } from './animationExportRender';

// Thumbnail embedded in the .dior (meta.thumbnail, v3.21.0): for Diorame's own future gallery and the Super
// Riso Lab — the OS never sees it. The DRAW view rendered from the shapes, like the DRAW PNG, at the framing a
// project opens with (zoom 1, no pan), so it does not depend on where the user was looking when saving.

const THUMB_SIZE = 256;
const THUMB_QUALITY = 0.8;

// StrataCanvas registers the reader of its render inputs (the same snapshot the PNG export takes).
let source: (() => AnimationExportRenderOptions | null) | null = null;

export function registerThumbnailSource(fn: () => AnimationExportRenderOptions | null): () => void {
	source = fn;
	return () => { if (source === fn) source = null; };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
	new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, THUMB_QUALITY));

const toDataURL = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

// data: URL of the thumbnail, or null if it cannot be made: a missing thumbnail never blocks a save.
export async function renderProjectThumbnail(): Promise<string | null> {
	try {
		const options = source?.();
		if (!options) return null;
		const camera = { x: 0, y: 0, z: 0, rotation: 0 };
		const state = { ...options.state, mode: 'drawing' as const, drawingZoom: 1, drawingPan: { x: 0, y: 0 }, camera };
		let src: HTMLCanvasElement = renderDrawSnapshot({ ...options, state, camera }, 1, 'paper');

		// Halve while more than twice the target: one big drawImage step aliases the strokes.
		const ratio = THUMB_SIZE / Math.max(src.width, src.height);
		const tw = Math.max(1, Math.round(src.width * Math.min(1, ratio)));
		const th = Math.max(1, Math.round(src.height * Math.min(1, ratio)));
		while (src.width / 2 >= tw * 2 || src.height / 2 >= th * 2) {
			const half = document.createElement('canvas');
			half.width = Math.ceil(src.width / 2);
			half.height = Math.ceil(src.height / 2);
			half.getContext('2d')!.drawImage(src, 0, 0, half.width, half.height);
			src = half;
		}
		const out = document.createElement('canvas');
		out.width = tw;
		out.height = th;
		const ctx = out.getContext('2d')!;
		ctx.imageSmoothingQuality = 'high';
		ctx.drawImage(src, 0, 0, tw, th);

		// Safari cannot encode WebP: toBlob then returns a PNG, and the thumbnail goes as JPEG instead.
		let blob = await toBlob(out, 'image/webp');
		if (!blob || blob.type !== 'image/webp') blob = await toBlob(out, 'image/jpeg');
		return blob ? await toDataURL(blob) : null;
	} catch (err) {
		console.warn('[save] thumbnail failed:', err);
		return null;
	}
}
