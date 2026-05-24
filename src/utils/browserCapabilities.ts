// Browser capability detection. Results cached in module scope.

let _supportsCanvasFilter: boolean | null = null;

/**
 * Feature detection for CanvasRenderingContext2D.filter via functional pixel test.
 *
 * WebKit (Safari macOS/iOS/iPadOS, any browser on iOS/iPadOS) silently ignores
 * filter assignments without resetting the property to 'none', making the naive
 * `ctx.filter !== 'none'` check unreliable.
 *
 * Approach: paint a solid pixel, apply a strong blur, paint again with transparent,
 * then read the resulting pixel. If blur is functional, the original color will
 * have been diffused/altered. If blur is ignored (WebKit), the pixel stays pure red.
 *
 * Result is cached after first call.
 */
export function supportsCanvasFilter(): boolean {
	if (_supportsCanvasFilter !== null) return _supportsCanvasFilter;
	if (typeof window === 'undefined') return true;

	try {
		const canvas = document.createElement('canvas');
		canvas.width = 10;
		canvas.height = 10;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			_supportsCanvasFilter = true;
			return true;
		}

		// Paint a solid red square in the center
		ctx.fillStyle = 'rgba(255, 0, 0, 1)';
		ctx.fillRect(4, 4, 2, 2);

		// Clear and apply blur, then redraw — if blur works, edges will be diffused
		ctx.clearRect(0, 0, 10, 10);
		ctx.filter = 'blur(2px)';
		ctx.fillStyle = 'rgba(255, 0, 0, 1)';
		ctx.fillRect(4, 4, 2, 2);
		ctx.filter = 'none';

		// Read a pixel OUTSIDE the original square's area
		// If blur is functional, this pixel will have spread red color (alpha > 0)
		// If blur is ignored, this pixel will be fully transparent (alpha = 0)
		const pixel = ctx.getImageData(2, 2, 1, 1).data;
		const alphaOutsideSquare = pixel[3];

		_supportsCanvasFilter = alphaOutsideSquare > 0;
		return _supportsCanvasFilter;
	} catch (e) {
		// If anything fails, assume support to avoid false warnings on edge cases
		_supportsCanvasFilter = true;
		return true;
	}
}
