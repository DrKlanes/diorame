import { applyFog, applyGlow, applyDoFBlur } from './postProcessing';
import { processPixelArt } from './PixelArtProcessor';

export type ComposeLayerOpts = {
	w: number;
	h: number;
	shapePattern: CanvasPattern | null;
	isPixelArt: boolean;
	fxEnabled: boolean;
	FL: number;
	layerAvgZ: number;
	fxFocusDist: number;
	isDarkMode: boolean;
	palette: string[];
	postProcessing: {
		fog: number;
		pixelArtSize: number;
		pixelArtDepth: number;
		pixelArtDither: number;
		glow: number;
		dof: number;
	};
	postProcessingEnabled: {
		fog: boolean;
		glow: boolean;
		dof: boolean;
	};
};

/**
 * Composes a single layer into the offscreen canvas, applying per-layer
 * effects in the canonical order. Invariants observed exactly:
 *
 *   1. Pattern overlay (source-atop, gate: shapePattern && !isPixelArt)
 *   2. Fog (gate: fxEnabled && postProcessingEnabled.fog)
 *   3. Pixel art composition (gate: isPixelArt)
 *   4. Cálculo de glowInt + dofBlur (always)
 *   5. Glow (gate: fxEnabled && postProcessingEnabled.glow && glowInt > 0.01)
 *   6. DoF blur (always; no-op if dofBlur === 0)
 *
 * dofBlur formula is byte-perfect copy of the inline original:
 *   Math.min((Math.abs(layerAvgZ - fxFocusDist)/1000)*(FL/400)*4, 30*dof)
 * Reordering any factor produces visually-incorrect blur on multi-layer
 * scenes; the order MUST be preserved.
 *
 * Caller responsibility: prepare pixelCanvas via ensureCanvas BEFORE
 * invocation (already sized to ceil(w/pSize) × ceil(h/pSize) when
 * isPixelArt). This keeps the module pure of React refs and closure
 * helpers — the contract is "caller orquesta, módulos puros".
 *
 * @param layerCtx     Context of the per-layer offscreen helper canvas
 * @param offCtx       Context of the main offscreen output canvas
 * @param helperCanvas The helper canvas (read by applyGlow/applyDoFBlur)
 * @param pixelCanvas  Pre-sized pixel art canvas, or null if !isPixelArt
 * @param opts         All other render state needed for compositing
 */
export const composeLayer = (
	layerCtx: CanvasRenderingContext2D,
	offCtx: CanvasRenderingContext2D,
	helperCanvas: HTMLCanvasElement,
	pixelCanvas: HTMLCanvasElement | null,
	opts: ComposeLayerOpts,
): void => {
	// Pattern Overlay (Optimized)
	if (opts.shapePattern && !opts.isPixelArt) {
		layerCtx.globalCompositeOperation = 'source-atop';
		layerCtx.fillStyle = opts.shapePattern;
		layerCtx.fillRect(0, 0, opts.w, opts.h);
		layerCtx.globalCompositeOperation = 'source-over';
	}

	// Fog
	if (opts.fxEnabled && opts.postProcessingEnabled.fog) {
		applyFog(layerCtx, opts.w, opts.h, opts.postProcessing.fog, opts.isDarkMode, opts.FL + opts.layerAvgZ);
	}

	// Composition to Offscreen
	// Apply Pixel Art per-layer to support smooth DoF on top
	if (opts.isPixelArt && pixelCanvas) {
		processPixelArt(
			layerCtx, opts.w, opts.h, pixelCanvas,
			opts.postProcessing.pixelArtDepth ?? 4,
			opts.postProcessing.pixelArtDither ?? 0,
			opts.palette
		);
	}

	const glowInt = opts.postProcessing.glow;
	const dofBlur = (opts.fxEnabled && opts.postProcessingEnabled.dof)
		? Math.min((Math.abs(opts.layerAvgZ - opts.fxFocusDist)/1000)*(opts.FL/400)*4, 30*opts.postProcessing.dof)
		: 0;

	if (opts.fxEnabled && opts.postProcessingEnabled.glow && glowInt > 0.01) {
		applyGlow(offCtx, helperCanvas, glowInt, dofBlur, opts.isDarkMode);
	}

	applyDoFBlur(offCtx, helperCanvas, dofBlur);
};
