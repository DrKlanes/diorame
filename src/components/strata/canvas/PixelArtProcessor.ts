import { BAYER_MATRIX_4X4, PALETTE_CGA, PALETTE_RGB8, PALETTE_RETRO, PALETTE_HANDHELD, PALETTE_STYLIZED } from '../pixelArtPalettes';

/**
 * Applies pixel art quantization and dithering to a canvas layer.
 * @param targetCtx  The layer canvas context to read from and write back to.
 * @param w          Full canvas width in CSS pixels.
 * @param h          Full canvas height in CSS pixels.
 * @param pixelCanvas Buffer canvas pre-sized to (ceil(w/pSize) × ceil(h/pSize)) by the caller.
 * @param pixelArtDepth  Depth setting (controls palette selection).
 * @param pixelArtDither Dither intensity (0 = none).
 * @param palette    Current user palette (hex strings) used for 'original' mode dithering.
 */
export const processPixelArt = (
	targetCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	pixelCanvas: HTMLCanvasElement,
	pixelArtDepth: number,
	pixelArtDither: number,
	palette: string[]
): void => {
	const bayerMatrix4x4 = BAYER_MATRIX_4X4;
	const sw = pixelCanvas.width;
	const sh = pixelCanvas.height;

	const pCtx = pixelCanvas.getContext('2d', { willReadFrequently: true })!;

	pCtx.imageSmoothingEnabled = false;
	// Draw target canvas to pixel buffer (Downscale)
	pCtx.clearRect(0, 0, sw, sh);
	pCtx.drawImage(targetCtx.canvas, 0, 0, w, h, 0, 0, sw, sh);

	const iData = pCtx.getImageData(0, 0, sw, sh);
	const d = iData.data;

	// Palette Selection based on Depth (palettes imported from pixelArtPalettes.ts)
	const depthVal = pixelArtDepth || 4;
	let mode = 'quantize';
	let activePalette: readonly number[][] | null = null;
	let quantLevels = 4;

	if (depthVal <= 2) {
		mode = '1bit';
	} else if (depthVal <= 4) {
		mode = 'palette';
		activePalette = PALETTE_CGA;
	} else if (depthVal <= 6) {
		mode = 'palette';
		activePalette = PALETTE_RGB8;
	} else if (depthVal <= 8) {
		mode = 'palette';
		activePalette = PALETTE_RETRO;
	} else if (depthVal === 10) {
		// Standard Hi-Color (Quantize 5 levels)
		mode = 'quantize';
		quantLevels = 5;
	} else if (depthVal === 12) {
		// Classic Handheld (Depth 12)
		mode = 'palette';
		activePalette = PALETTE_HANDHELD;
	} else if (depthVal === 14) {
		// Stylized Limited (Depth 14)
		mode = 'palette';
		activePalette = PALETTE_STYLIZED;
	} else if (depthVal >= 16) {
		mode = 'original';
	}

	// Helper: Find closest palette color
	const getClosest = (r: number, g: number, b: number, pal: readonly number[][]) => {
		let minD = Infinity, best = pal[0];
		for (let i = 0; i < pal.length; i++) {
			const c = pal[i];
			const dist = (r - c[0]) * (r - c[0]) + (g - c[1]) * (g - c[1]) + (b - c[2]) * (b - c[2]);
			if (dist < minD) { minD = dist; best = c; }
		}
		return best;
	};

	const qStep = 255 / (quantLevels - 1);
	const ditherAmount = pixelArtDither ?? 0;

	// Pre-calculate user palette for Original mode dithering
	const userPaletteRGB = (mode === 'original' && ditherAmount > 0 && palette)
		? palette.map((hex: string) => {
			const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
		})
		: null;

	for (let y = 0; y < sh; y++) {
		const row = ditherAmount > 0 ? bayerMatrix4x4[y % 4] : null;
		for (let x = 0; x < sw; x++) {
			const i = (y * sw + x) * 4;

			// 1. Get Original Color
			let r = d[i], g = d[i + 1], b = d[i + 2];

			// 2. Apply Dithering (Noise before mapping)
			if (row) {
				const baseScale = mode === '1bit' ? 64 : ((mode === 'palette' || mode === 'original') ? 32 : qStep);
				const dScale = (baseScale * 0.4) * ditherAmount;

				const noise = (row[x % 4] - 31.5) / 32 * dScale;
				r = Math.max(0, Math.min(255, r + noise));
				g = Math.max(0, Math.min(255, g + noise));
				b = Math.max(0, Math.min(255, b + noise));
			}

			// 3. Map Color
			if (mode === 'original') {
				if (ditherAmount > 0 && userPaletteRGB && userPaletteRGB.length > 0) {
					const r0 = d[i], g0 = d[i + 1], b0 = d[i + 2];

					const best = getClosest(r0, g0, b0, userPaletteRGB);
					const distSq = (r0 - best[0]) * (r0 - best[0]) + (g0 - best[1]) * (g0 - best[1]) + (b0 - best[2]) * (b0 - best[2]);

					const t = Math.max(0, Math.min(1, (distSq - 20) / 780));
					let factor = t * t * (3 - 2 * t);
					factor = Math.pow(factor, 0.65);

					if (factor > 0.01 && row) {
						const baseScale = 32;
						const dScale = (baseScale * 0.4) * ditherAmount * factor;
						const noise = (row[x % 4] - 31.5) / 32 * dScale;

						const rN = Math.max(0, Math.min(255, r0 + noise));
						const gN = Math.max(0, Math.min(255, g0 + noise));
						const bN = Math.max(0, Math.min(255, b0 + noise));

						const bestN = getClosest(rN, gN, bN, userPaletteRGB);
						d[i] = bestN[0]; d[i + 1] = bestN[1]; d[i + 2] = bestN[2];
					} else {
						d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2];
					}
				} else if (ditherAmount > 0) {
					d[i] = r; d[i + 1] = g; d[i + 2] = b;
				}
			} else if (mode === '1bit') {
				const lum = 0.299 * r + 0.587 * g + 0.114 * b;
				const val = lum > 128 ? 255 : 0;
				d[i] = val; d[i + 1] = val; d[i + 2] = val;
			} else if (mode === 'palette' && activePalette) {
				const c = getClosest(r, g, b, activePalette);
				d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
			} else if (mode === 'quantize') {
				d[i] = Math.floor(r / qStep + 0.5) * qStep;
				d[i + 1] = Math.floor(g / qStep + 0.5) * qStep;
				d[i + 2] = Math.floor(b / qStep + 0.5) * qStep;
			}
		}
	}
	pCtx.putImageData(iData, 0, 0);

	// 4. Quantize alpha for fade gradient compatibility
	// Converts smooth alpha into ordered-dithered binary alpha
	for (let j = 3; j < d.length; j += 4) {
		if (d[j] > 0 && d[j] < 255) {
			const pi = (j - 3) / 4;
			const px = pi % sw, py = Math.floor(pi / sw);
			const bayerVal = bayerMatrix4x4[py % 4][px % 4] / 64;
			d[j] = (d[j] / 255) > bayerVal ? 255 : 0;
		}
	}
	pCtx.putImageData(iData, 0, 0);

	// Draw back (Upscale)
	targetCtx.save();
	targetCtx.globalCompositeOperation = 'copy';
	targetCtx.imageSmoothingEnabled = false;
	targetCtx.drawImage(pixelCanvas, 0, 0, sw, sh, 0, 0, w, h);
	targetCtx.restore();
};
