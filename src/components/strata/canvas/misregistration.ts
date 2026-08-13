// Ink misregistration — the off-register ghost of a risograph print, where each
// ink plate lands a hair away from the last. Extracted from pass 3 of applyRisoV2
// (which keeps its own subtle version) and amplified into an effect of its own.

// Two plates shifted along opposing diagonals. Fixed directions, never random:
// real misregistration is baked into a copy, and jittering it per frame reads as
// digital noise instead of print.
const PLATES: readonly (readonly [number, number])[] = [[2, 1], [-1, -2]];

// At full intensity the plates travel 4x their base offset.
const SPREAD = 3;

const GHOST_ALPHA = 0.35;

export const applyMisregistration = (
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	intensity: number,
	scale: number,
	helperCtx: CanvasRenderingContext2D
): void => {
	if (intensity <= 0.01) return;

	helperCtx.clearRect(0, 0, w, h);
	helperCtx.drawImage(offCtx.canvas, 0, 0);

	const travel = (1 + intensity * SPREAD) * scale;

	offCtx.save();
	offCtx.globalCompositeOperation = 'screen';
	offCtx.globalAlpha = intensity * GHOST_ALPHA;
	for (const [dx, dy] of PLATES) {
		// Whole pixels only — a subpixel offset resamples the ghost and makes it
		// shimmer as the camera moves.
		offCtx.drawImage(helperCtx.canvas, Math.round(dx * travel), Math.round(dy * travel));
	}
	offCtx.restore();
};
