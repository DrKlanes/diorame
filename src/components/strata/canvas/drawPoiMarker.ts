/**
 * Draws the framing point (POI) as a small target on the canvas, fading out a few
 * seconds after it is set.
 *
 * It is an INSTRUMENT before it is a nicety. Until now nothing showed where the
 * double-click actually landed: the camera glides toward the POI and, in almost
 * every preset, oscillates around it (`nc.x = poiX + Math.sin(t)*50` and friends in
 * cinematicCamera). With no marker there is no way to tell "the point was computed
 * wrong" from "the point is right and the camera is breathing around it" — which is
 * half of why aiming felt like a lottery even after the maths was made exact.
 *
 * TWO RULES THIS MUST OBEY:
 *
 * 1. It is drawn at the PROJECTED position of the world point, recomputed every
 *    frame from the same forward projection the artwork uses. Pinning it to a fixed
 *    screen position (the centre, say) would make it a decoration that always agrees
 *    with itself — and it would lie precisely when the answer matters.
 *
 * 2. The camera's oscillation around the POI is SIGNAL, not noise. The marker will
 *    visibly drift as the camera breathes. That is correct and deliberate: it shows
 *    the truth of what the camera is doing. Do not smooth it, and do not anchor it
 *    to the centre of the screen.
 *
 * No ctx.filter anywhere — it is a no-op on WebKit/iPadOS. Legibility over any
 * artwork comes from flat geometry: a light halo stroked underneath a dark core,
 * the same trick the rotate cursor uses.
 */

/** Full opacity for this long (ms) after the POI is set. */
const HOLD_MS = 1800;
/** Then fades to nothing over this long (ms). */
const FADE_MS = 1200;

const RADIUS = 9;
/** Gap between the ring and the start of each tick, so the ticks read as separate. */
const TICK_GAP = 4;
const TICK_LEN = 6;

/**
 * @param ctx        Canvas 2D context. Left with an identity transform.
 * @param screenX    POI projected to screen space by the caller (see rule 1).
 * @param screenY
 * @param setAt      Timestamp (performance.now scale) when the POI was last set.
 * @param now        Current frame time, same scale as `setAt`.
 * @returns          true if anything was drawn — lets the caller skip work later.
 */
export const drawPoiMarker = (
	ctx: CanvasRenderingContext2D,
	screenX: number,
	screenY: number,
	setAt: number,
	now: number,
): boolean => {
	const age = now - setAt;
	if (age < 0 || age >= HOLD_MS + FADE_MS) return false;

	const alpha = age <= HOLD_MS ? 1 : 1 - (age - HOLD_MS) / FADE_MS;
	if (alpha <= 0) return false;

	if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return false;

	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = alpha;
	ctx.lineCap = 'round';

	// The ring plus four ticks, built once and stroked twice: a light halo first, the
	// dark core on top. Two passes over one path is what makes it readable on white
	// paper and on a dark scene without any filter.
	const path = new Path2D();
	path.moveTo(screenX + RADIUS, screenY);
	path.arc(screenX, screenY, RADIUS, 0, Math.PI * 2);
	const t0 = RADIUS + TICK_GAP;
	const t1 = t0 + TICK_LEN;
	path.moveTo(screenX + t0, screenY); path.lineTo(screenX + t1, screenY);
	path.moveTo(screenX - t0, screenY); path.lineTo(screenX - t1, screenY);
	path.moveTo(screenX, screenY + t0); path.lineTo(screenX, screenY + t1);
	path.moveTo(screenX, screenY - t0); path.lineTo(screenX, screenY - t1);

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.lineWidth = 3.5;
	ctx.stroke(path);

	ctx.strokeStyle = '#9a0ff9';
	ctx.lineWidth = 1.5;
	ctx.stroke(path);

	// Centre dot: the exact pixel the point resolves to. The ring is the affordance,
	// this is the answer to "did it land where I touched?".
	ctx.fillStyle = '#9a0ff9';
	ctx.beginPath();
	ctx.arc(screenX, screenY, 1.5, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
	return true;
};
