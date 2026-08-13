// Ink misregistration — the off-register look of a risograph print.
//
// A Riso prints ONE PLATE PER INK, one pass each. Between passes the paper is
// reloaded and lands a hair off, so every ink shifts as a rigid block relative
// to the others. Nothing is duplicated and nothing turns translucent: each ink
// still prints once, solid. What you actually see is the consequence — where
// two inks were meant to meet, a sliver of bare paper opens up; where they now
// overlap, the ink doubles up and darkens.
//
// In Diorame the layers ARE the plates, so the effect belongs per layer, on the
// composition step — not as a ghost stamped over the finished frame.
//
// The unit that moves is the INK, not the layer: two layers sharing a colour
// would print in the same pass, so they travel together. Hence the offset is
// keyed by colour, not by layer index.

// Plate travel at full intensity, in device px. On a ~1366px-wide canvas
// standing in for A4, this is roughly 2mm — the high end of a sloppy print.
const MAX_TRAVEL = 13;

// Paper feeds through rollers along one axis, so real misregistration drifts
// mostly along the feed direction and only slightly across it.
const CROSS_AXIS_BIAS = 0.6;

const inkHash = (ink: string): number => {
	let h = 2166136261;
	for (let i = 0; i < ink.length; i++) h = Math.imul(h ^ ink.charCodeAt(i), 16777619);
	return h >>> 0;
};

export type PlateOffset = { dx: number; dy: number };

export const NO_PLATE_OFFSET: PlateOffset = { dx: 0, dy: 0 };

/**
 * Rigid offset for one ink's plate. Deterministic per colour — the same ink
 * always lands the same way, so the print never boils between frames.
 *
 * @param snap  Pixel-art block size; the offset is quantized to it so a shifted
 *              plate still lands on the grid. 0 = no snapping.
 */
export const getPlateOffset = (
	ink: string,
	intensity: number,
	scale: number,
	snap: number = 0
): PlateOffset => {
	if (intensity <= 0.01) return NO_PLATE_OFFSET;

	const angle = (inkHash(ink) / 0xffffffff) * Math.PI * 2;
	const travel = intensity * MAX_TRAVEL * scale;

	let dx = Math.cos(angle) * travel * CROSS_AXIS_BIAS;
	let dy = Math.sin(angle) * travel;

	if (snap > 0) {
		dx = Math.round(dx / snap) * snap;
		dy = Math.round(dy / snap) * snap;
	} else {
		// Whole pixels: a subpixel offset resamples the plate and softens the
		// edge, which reads as blur instead of a crisp misprint.
		dx = Math.round(dx);
		dy = Math.round(dy);
	}
	return { dx, dy };
};
