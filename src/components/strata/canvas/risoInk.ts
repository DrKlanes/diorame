// Riso ink body — the passes that make the drawing read as a printed sheet.
//
// The old model only ERODED: two strong destination-out passes against one weak
// multiply, so the result was a worn, under-inked print. A riso is the opposite:
// thick soy ink sitting ON the paper, saturated, pooling. These passes put the
// ink body back and add the one cue the effect never had — the drying edge.

import { applyBlurCompat } from './blurCompat';
import { getRisoPlusTexture } from './postProcessing';

// Ink pools where the wet edge dries last. Radius in device px, ·renderScale.
const EDGE_RADIUS = 6;
const EDGE_STRENGTH = 0.7;
// White washes colour out far faster than black deepens it, so the emissive
// (dark-mode) rim needs a lighter hand for the same perceived ink load.
const EDGE_STRENGTH_DARK = 0.42;

// Uneven ink lay-down. Lives at 20-80px — the band the halftone can't reach.
const MOTTLE_DOWNSCALE = 10;
const MOTTLE_DEPTH = 118;
const MOTTLE_DEPTH_DARK = 72;

// Each frame is a different copy off the run, posterized like the grunge overlay
// so it reads as press variation and not as digital noise.
const PRINT_STEP_MS = 350;

const hash = (n: number): number => {
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) | 0;
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) | 0;
	return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff;
};

// Two scratch canvases, module singletons with grow-only sizing — same pattern as
// blurCompat, and it keeps RenderContext (and therefore frozen StrataCanvas) alone.
const _scratch: (HTMLCanvasElement | null)[] = [null, null];

function getScratch(i: number, minW: number, minH: number): CanvasRenderingContext2D | null {
	let c = _scratch[i];
	if (!c) {
		c = document.createElement('canvas');
		_scratch[i] = c;
	}
	if (c.width < minW) c.width = minW;
	if (c.height < minH) c.height = minH;
	return c.getContext('2d');
}

// Ink-load texture: flat pixels whose ALPHA carries how much ink pooled there.
// Painted source-atop so it only ever touches existing ink, never the paper.
//
// The colour encodes "more ink" for the current theme, and the two are opposites:
// on paper, more pigment means DARKER, but Diorame's dark mode is emissive — the
// ink is light over a near-black ground — so there more ink means BRIGHTER. Using
// black in both would sink the loaded edges into the background.
const _mottleCache = new Map<string, HTMLCanvasElement>();

export const getInkMottle = (w: number, h: number, isDarkMode: boolean): HTMLCanvasElement | null => {
	const mw = Math.max(2, Math.ceil(w / MOTTLE_DOWNSCALE));
	const mh = Math.max(2, Math.ceil(h / MOTTLE_DOWNSCALE));
	const depth = isDarkMode ? MOTTLE_DEPTH_DARK : MOTTLE_DEPTH;
	const tone = isDarkMode ? 255 : 0;
	const key = `${mw}x${mh}x${tone}`;
	const cached = _mottleCache.get(key);
	if (cached) return cached;

	const canvas = document.createElement('canvas');
	canvas.width = mw;
	canvas.height = mh;
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	// Generated at 1/10 scale and drawn back up: the browser's bilinear filter is
	// what turns the per-cell hash into smooth blotches, for 1/100 of the pixels.
	const img = ctx.createImageData(mw, mh);
	const d = img.data;
	for (let y = 0; y < mh; y++) {
		for (let x = 0; x < mw; x++) {
			// Three octaves: broad pools of ink, blotches within them, and a
			// per-cell break-up so the upscale doesn't read as a soft gradient.
			const pools = hash(Math.floor(x / 6) * 7919 + Math.floor(y / 6) * 6271);
			const blotch = hash(Math.floor(x / 2) * 3571 + Math.floor(y / 2) * 9137 + 3);
			const fine = hash(x * 1619 + y * 31337 + 7);
			const v = pools * 0.5 + blotch * 0.32 + fine * 0.18;
			const i = (y * mw + x) * 4;
			d[i] = tone; d[i + 1] = tone; d[i + 2] = tone;
			d[i + 3] = Math.round(v * depth);
		}
	}
	ctx.putImageData(img, 0, 0);
	_mottleCache.set(key, canvas);
	return canvas;
};

/**
 * Darkens a rim just inside the ink's own boundary — where the pigment pools as
 * the sheet dries. This is the one pass that reads the artwork instead of
 * overlaying it, and the single most recognisable print cue.
 *
 * Rim = alpha − blur(alpha), which `destination-out` computes directly:
 * dst·(1 − blurred) is ~0 deep inside the shape and ~0 outside it, peaking just
 * within the contour. Costs ONE global blur per frame, never one per layer.
 */
const applyEdgeBuildup = (
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	strength: number,
	scale: number,
	isDarkMode: boolean
): void => {
	const rimCtx = getScratch(0, w, h);
	const blurCtx = getScratch(1, w, h);
	if (!rimCtx || !blurCtx) return;

	rimCtx.setTransform(1, 0, 0, 1, 0, 0);
	rimCtx.globalCompositeOperation = 'source-over';
	rimCtx.globalAlpha = 1;
	rimCtx.clearRect(0, 0, w, h);
	rimCtx.drawImage(offCtx.canvas, 0, 0);

	blurCtx.setTransform(1, 0, 0, 1, 0, 0);
	blurCtx.globalCompositeOperation = 'source-over';
	blurCtx.globalAlpha = 1;
	blurCtx.clearRect(0, 0, w, h);
	applyBlurCompat(blurCtx, rimCtx.canvas, EDGE_RADIUS * scale, w, h);

	rimCtx.globalCompositeOperation = 'destination-out';
	rimCtx.drawImage(blurCtx.canvas, 0, 0);
	// Recolour the rim to "more ink" for this theme, keeping its alpha profile.
	rimCtx.globalCompositeOperation = 'source-in';
	rimCtx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
	rimCtx.fillRect(0, 0, w, h);
	rimCtx.globalCompositeOperation = 'source-over';

	offCtx.globalCompositeOperation = 'source-atop';
	offCtx.globalAlpha = strength;
	offCtx.drawImage(rimCtx.canvas, 0, 0);
};

/**
 * Full riso print pass. Order is physical: the ink pools and varies in density
 * first, and only then does the screen and the paper break it up.
 */
export const applyRisoPrint = (
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	intensity: number,
	grainCanvas: HTMLCanvasElement,
	helperCtx: CanvasRenderingContext2D,
	scale: number,
	isDarkMode: boolean
): void => {
	offCtx.save();

	// 1 — Loaded edges (content-aware).
	const edge = intensity * (isDarkMode ? EDGE_STRENGTH_DARK : EDGE_STRENGTH);
	applyEdgeBuildup(offCtx, w, h, edge, scale, isDarkMode);

	// 2 — Uneven ink lay-down. source-atop keeps it strictly on the ink.
	const mottle = getInkMottle(w, h, isDarkMode);
	if (mottle) {
		const step = Math.floor(Date.now() / PRINT_STEP_MS);
		const mx = Math.round((hash(step * 3571) - 0.5) * 40 * scale);
		const my = Math.round((hash(step * 9137 + 5) - 0.5) * 40 * scale);
		offCtx.globalCompositeOperation = 'source-atop';
		offCtx.globalAlpha = intensity;
		offCtx.drawImage(mottle, mx, my, w, h);
	}

	// 3 — Halftone screen. Now a texture on top of a solid ink body, not the
	// thing that eats it: a third of the old weight, and it drifts per print step.
	const step = Math.floor(Date.now() / PRINT_STEP_MS);
	const gx = Math.round((hash(step * 1249 + 3) - 0.5) * 6 * scale);
	const gy = Math.round((hash(step * 5417 + 9) - 0.5) * 6 * scale);
	offCtx.globalCompositeOperation = 'destination-out';
	offCtx.globalAlpha = intensity * 0.22;
	offCtx.drawImage(grainCanvas, gx, gy, w, h);

	// 4 — Paper wear: occasional breaks where the sheet refused the ink, not a
	// full-strength erase of the whole image (the old pass ran at alpha 1.0).
	const paperWear = getRisoPlusTexture();
	if (paperWear) {
		offCtx.globalCompositeOperation = 'destination-out';
		offCtx.globalAlpha = intensity * 0.3;
		offCtx.drawImage(paperWear, 0, 0, w, h);
	}

	// 5 — Ink spread: the body doubling into itself.
	helperCtx.clearRect(0, 0, w, h);
	helperCtx.drawImage(offCtx.canvas, 0, 0);
	offCtx.globalCompositeOperation = 'multiply';
	offCtx.globalAlpha = intensity * 0.3;
	offCtx.drawImage(helperCtx.canvas, 0, 0);

	offCtx.restore();
};
