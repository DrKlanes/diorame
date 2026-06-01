import { zipSync } from 'fflate';
import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import type { TranslationParams } from '../../../i18n';

type TFunction = (key: string, params?: TranslationParams) => string;

/**
 * Converts a single ImageData to a PNG Uint8Array via a temporary canvas.
 * Uses canvas.toDataURL to produce a data URL, then decodes the base64 payload.
 */
function imageDataToPng(imageData: ImageData): Uint8Array {
	const canvas = document.createElement('canvas');
	canvas.width = imageData.width;
	canvas.height = imageData.height;
	const ctx = canvas.getContext('2d')!;
	ctx.putImageData(imageData, 0, 0);

	// Extract base64 bytes from the data URL (strip the header up to the comma).
	const dataUrl = canvas.toDataURL('image/png', 1.0);
	const base64 = dataUrl.split(',')[1];

	// Decode base64 → binary string → Uint8Array.
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Packages an array of ImageData (one per animation frame) as a ZIP of PNGs
 * and triggers a browser download.
 *
 * File naming: `{sanitizedProjectName}_frame_01.png`, `_frame_02.png`, …
 * Padding width is 2 digits (sufficient for MAX_LAYERS = 10).
 *
 * @param frames       ImageData array — one entry per animation frame in order.
 * @param projectName  Project name from AppState (may be UNTITLED_PROJECT_SENTINEL).
 * @param onFinish     Called when download is triggered (or on error).
 * @param t            Translation function for toast messages.
 */
export async function exportAsPNGSequence(
	frames: ImageData[],
	projectName: string,
	onFinish: () => void,
	t: TFunction,
): Promise<void> {
	try {
		if (frames.length === 0) {
			onFinish();
			return;
		}

		const displayName = projectName === UNTITLED_PROJECT_SENTINEL
			? t('topbar.file.untitledProject')
			: projectName;
		const sanitizedName = getFilenameBase(displayName);

		// Padding width: 2 digits is enough for MAX_LAYERS = 10.
		const padWidth = frames.length >= 10 ? 2 : 1;

		// Build the ZIP file object: { filename: Uint8Array }
		const zipFiles: Record<string, Uint8Array> = {};
		for (let i = 0; i < frames.length; i++) {
			const frameNum = String(i + 1).padStart(padWidth, '0');
			const filename = `${sanitizedName}_frame_${frameNum}.png`;
			zipFiles[filename] = imageDataToPng(frames[i]);

			// Yield between frame encodings to keep UI responsive.
			await new Promise<void>(r => setTimeout(r, 0));
		}

		// Synchronous zip (fflate — fast, no worker needed for ≤10 small PNGs).
		const zipBytes = zipSync(zipFiles);
		const blob = new Blob([zipBytes], { type: 'application/zip' });

		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${sanitizedName}_frames.zip`;
		a.click();
		URL.revokeObjectURL(url);

		toast.success(t('toast.export.pngSequence.successTitle'), {
			description: t('toast.export.pngSequence.successDesc'),
			duration: 2000,
		});
		playSound('success');
	} catch (e) {
		console.error('Export PNG sequence failed', e);
		toast.error(t('toast.export.pngSequence.errorTitle'), {
			description: t('common.pleaseRetry'),
			duration: 3000,
		});
	}
	onFinish();
}
