/**
 * Paints the canvas background: solid color fill + optional paper texture.
 * Resets ctx transform, filter, alpha and composite op before painting so the
 * caller does not need to manage paint state.
 *
 * The paper texture is skipped in pixel-art mode. In dark mode, a multiply
 * pass darkens the texture without crushing its highlights.
 *
 * @param ctx        Canvas 2D context
 * @param w          Canvas width in pixels
 * @param h          Canvas height in pixels
 * @param isDarkMode Whether dark mode is active
 * @param isPixelArt Whether pixel art mode is active (skips paper texture)
 * @param paperImg   Loaded paper texture image, or null if not loaded
 */
export const drawBackground = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	isDarkMode: boolean,
	isPixelArt: boolean,
	paperImg: HTMLImageElement | null,
): void => {
	ctx.globalAlpha = 1.0;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.filter = 'none';
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = isDarkMode
		? (isPixelArt ? '#000000' : '#050505')
		: (isPixelArt ? '#ffffff' : '#f8f9fa');
	ctx.fillRect(0, 0, w, h);

	// Paper Texture
	if (paperImg && !isPixelArt) {
		const img = paperImg;
		const ratio = Math.max(w / img.width, h / img.height);
		const cx = (w - img.width * ratio) / 2;
		const cy = (h - img.height * ratio) / 2;
		ctx.drawImage(img, 0, 0, img.width, img.height, cx, cy, img.width * ratio, img.height * ratio);
		if (isDarkMode) {
			ctx.globalCompositeOperation = 'multiply';
			ctx.fillStyle = 'rgba(5, 5, 5, 0.9)';
			ctx.fillRect(0, 0, w, h);
			ctx.globalCompositeOperation = 'source-over';
		}
	}
};
