import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import type { TranslationParams } from '../../../i18n';

type TFunction = (key: string, params?: TranslationParams) => string;

export type GIFExportOptions = {
	framerate: number;   // 4 | 6 | 8 fps — determines per-frame delay
	scale: number;       // 1 | 0.5 | 0.25 — output resolution multiplier
	projectName: string;
};

/**
 * Scales an ImageData by a given factor using a temporary canvas.
 * Returns a new ImageData at the scaled dimensions.
 */
function scaleImageData(imageData: ImageData, scale: number): ImageData {
	if (scale === 1) return imageData;

	const srcW = imageData.width;
	const srcH = imageData.height;
	const dstW = Math.max(1, Math.round(srcW * scale));
	const dstH = Math.max(1, Math.round(srcH * scale));

	// Draw source onto a full-size canvas, then scale to destination.
	const srcCanvas = document.createElement('canvas');
	srcCanvas.width = srcW; srcCanvas.height = srcH;
	srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0);

	const dstCanvas = document.createElement('canvas');
	dstCanvas.width = dstW; dstCanvas.height = dstH;
	const dstCtx = dstCanvas.getContext('2d')!;
	dstCtx.imageSmoothingEnabled = true;
	dstCtx.imageSmoothingQuality = 'high';
	dstCtx.drawImage(srcCanvas, 0, 0, dstW, dstH);

	return dstCtx.getImageData(0, 0, dstW, dstH);
}

/**
 * Encodes an array of ImageData frames as an animated GIF and triggers a download.
 *
 * Design decisions:
 *   - 1 cycle of the animation frames + GIF native infinite loop (repeat: 0).
 *     The video-export loop count (animationExportLoops) is intentionally NOT
 *     used here: a GIF with infinite native loop is the standard expected format,
 *     and embedding N cycles of frames would balloon file size for no quality gain.
 *   - Per-frame palette (quantize + applyPalette per frame). With the Riso palette
 *     (≤24 colours), quantization is trivial and per-frame palettes guarantee
 *     accurate colour per frame even if frames differ in colour content.
 *   - GIF delay is in centiseconds (1/100 s). delay = Math.round(100 / framerate).
 *   - Scale applied before palette quantization to keep GIF small.
 *   - No transparency — the canvas uses alpha:false (opaque background).
 *
 * @param frames    ImageData array — one entry per animation frame in order.
 * @param options   framerate, scale, projectName.
 * @param onFinish  Called when download is triggered (or on error).
 * @param t         Translation function for toast messages.
 */
export async function exportAsGIF(
	frames: ImageData[],
	options: GIFExportOptions,
	onFinish: () => void,
	t: TFunction,
): Promise<void> {
	try {
		if (frames.length === 0) {
			onFinish();
			return;
		}

		const { framerate, scale, projectName } = options;

		// GIF delay is in centiseconds (1/100 s).
		const delayCentiseconds = Math.round(100 / framerate);

		const displayName = projectName === UNTITLED_PROJECT_SENTINEL
			? t('topbar.file.untitledProject')
			: projectName;
		const sanitizedName = getFilenameBase(displayName);

		const gif = GIFEncoder();

		for (let i = 0; i < frames.length; i++) {
			const scaled = scaleImageData(frames[i], scale);
			const { data, width, height } = scaled;

			// quantize expects a Uint8ClampedArray of RGBA pixels.
			// ImageData.data is already Uint8ClampedArray — pass directly.
			const palette = quantize(data, 256);
			const index = applyPalette(data, palette);

			gif.writeFrame(index, width, height, {
				palette,
				delay: delayCentiseconds,
				// repeat: 0 = infinite loop (GIF native). Only set on first frame
				// (gifenc reads it to write the Netscape loop extension).
				repeat: 0,
			});

			// Yield between frame encodings to keep UI responsive.
			await new Promise<void>(r => setTimeout(r, 0));
		}

		gif.finish();
		const bytes = gif.bytes();
		const blob = new Blob([bytes], { type: 'image/gif' });

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${sanitizedName}.gif`;
		a.click();
		URL.revokeObjectURL(url);

		toast.success(t('toast.export.gif.successTitle'), {
			description: t('toast.export.gif.successDesc'),
			duration: 2000,
		});
		playSound('success');
	} catch (e) {
		console.error('Export GIF failed', e);
		toast.error(t('toast.export.gif.errorTitle'), {
			description: t('common.pleaseRetry'),
			duration: 3000,
		});
	}
	onFinish();
}
