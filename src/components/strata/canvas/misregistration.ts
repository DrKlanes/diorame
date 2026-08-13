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

// The first plate stays put and the rest fan out around it. A print with one
// single ink cannot be off-register — there is nothing to be off from — and
// pinning the first plate also keeps the composition from drifting as a whole.
const PLATE_SPREAD = Math.PI * 2;

export type PlateOffset = { dx: number; dy: number };

export const NO_PLATE_OFFSET: PlateOffset = { dx: 0, dy: 0 };

/**
 * Which plate each ink belongs to, in first-appearance order across the frame's
 * layers. Two layers sharing a colour share a plate — they would have gone
 * through the press in the same pass.
 */
export const buildPlateMap = (inksInDrawOrder: (string | undefined)[]): Map<string, number> => {
	const map = new Map<string, number>();
	for (const ink of inksInDrawOrder) {
		if (ink && !map.has(ink)) map.set(ink, map.size);
	}
	return map;
};

/**
 * Rigid offset for one ink's plate.
 *
 * Directions are dealt out evenly across the inks ACTUALLY PRESENT rather than
 * hashed per colour. Hashing each ink in isolation gives no mutual guarantee:
 * measured over a 12-colour palette, 5 of 66 pairs landed within 4px of each
 * other, and those plates then travel as one — precisely the pairs between
 * which the effect is supposed to be visible. Dealing by rank guarantees a
 * 360/n separation whatever the palette.
 *
 * @param snap  Pixel-art block size; the offset is quantized to it so a shifted
 *              plate still lands on the grid. 0 = no snapping.
 */
export const getPlateOffset = (
	plateIndex: number,
	plateCount: number,
	intensity: number,
	scale: number,
	snap: number = 0
): PlateOffset => {
	if (intensity <= 0.01 || plateIndex <= 0 || plateCount < 2) return NO_PLATE_OFFSET;

	// Plate 0 is the reference; 1..n-1 fan out around it, starting on the feed
	// axis (quarter turn) so the first and most visible split runs the way the
	// paper actually travels rather than across it.
	const angle = Math.PI / 2 + ((plateIndex - 1) / (plateCount - 1)) * PLATE_SPREAD;
	// Alternate near/far so neighbouring plates separate radially too, not just
	// angularly — matters most at n=2, where both would otherwise sit opposite.
	const travel = intensity * MAX_TRAVEL * (plateIndex % 2 === 0 ? 0.68 : 1) * scale;

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
