/**
 * Stop-motion wiggle offset of one shape for this frame (v3.25.13, out of renderLayerBody.ts verbatim). CINEMA-only
 * in practice (the caller gates it on the FX). Written into `out`: no object per shape.
 *
 * @param shapeId   seeds the offset (first two characters, as before)
 * @param amount    postProcessing.wiggle (0–1): ≤ 0.2 → 2 px, ≥ 0.8 → 8 px, else 4 px of amplitude
 * @param S         renderScale: the amplitude is in device px, so ·S keeps the wobble's relative size in HQ
 * @param pSize     pixel-art snap (device px), used only when isPixelArt
 */
export function shapeWiggle(
	shapeId: string,
	wiggleFrame: number,
	amount: number,
	S: number,
	isPixelArt: boolean,
	pSize: number,
	out: { x: number; y: number },
): void {
	const seed = shapeId.charCodeAt(0) + (shapeId.charCodeAt(1) || 0);
	const noiseValX = Math.sin(seed + wiggleFrame * 12.9898) * 43758.5453;
	const noiseValY = Math.cos(seed + wiggleFrame * 78.233) * 43758.5453;
	// Amplitude in device px: ·S (renderScale) keeps the wobble the same relative size in an HQ export.
	const amp = (amount <= 0.2 ? 2 : (amount >= 0.8 ? 8 : 4)) * S;
	let wiggleX = (noiseValX - Math.floor(noiseValX)) * amp - amp/2;
	let wiggleY = (noiseValY - Math.floor(noiseValY)) * amp - amp/2;

	if (isPixelArt) {
		wiggleX = Math.round(wiggleX / pSize) * pSize;
		wiggleY = Math.round(wiggleY / pSize) * pSize;
	}
	out.x = wiggleX;
	out.y = wiggleY;
}
