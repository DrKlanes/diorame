import { NEAR_CLIP } from '../../../constants/renderConstants';
import { CINEMATIC_DEPTH_MULTIPLIER } from './cinematicCamera';

/**
 * Screen → world for CINEMA mode: the inverse of the cinematic branch of
 * createTransformPoint (canvas/transformPoint.ts).
 *
 * It exists because there was no inverse at all. The CINEMA double-click reused
 * the DRAW-mode world-coordinate maths that happened to sit a few lines above it
 * in handlePointerDown — a different camera and a different matrix. That inverse
 * dropped camera.x/y, CINEMATIC_DEPTH_MULTIPLIER, viewZoomOffset,
 * layerSpacingFactor and the camera rotation, and referenced the ACTIVE LAYER's
 * depth. The three depth errors cancel out at exactly one layer index (2, when
 * layerSpacingFactor is 1) and nowhere else, which is why aiming the camera felt
 * like a lottery: it was correct only when a leftover DRAW-mode selection happened
 * to sit on that one layer.
 *
 * MIRROR THIS FILE AGAINST transformPoint.ts. Every term here is the algebraic
 * undo of a term there, in reverse order. If the forward projection changes, this
 * breaks silently — the round-trip test is what catches it.
 *
 * NOT INVERTED (deliberate):
 *   - The arc/orbit pivot offset. It is a function of the POI, which is the very
 *     thing being computed — a circular dependency that deserves its own pass.
 *     Those two presets keep a residual offset.
 *
 * Lens distortion IS inverted since v3.17.20 (Newton). It was left out in v3.17.17
 * on the assumption that the residual would be a few pixels; measuring said 158px
 * at a corner with distortion 0.25 and 633px at 1.0. Framing an off-centre subject
 * is the normal case, and that is exactly where the error lives.
 */

export type CinematicUnprojectParams = {
	/** Pointer position in px from the canvas element's top-left corner. */
	screenX: number;
	screenY: number;
	/** Screen-space centre used by the forward projection (canvas w/2, h/2). */
	centerXScreen: number;
	centerYScreen: number;
	camera: { x: number; y: number; z: number; rotation: number };
	/** state.focalLength — the CINEMA focal length (default 800). */
	focalLength: number;
	viewZoomOffset: number;
	layerSpacingFactor: number;
	/**
	 * RAW layer-space z of the plane the click should land on, i.e.
	 * layerIndex * -BASE_DEPTH_STEP. May be fractional (the mid-plane usually is).
	 * The spacing factor and the depth multiplier are applied HERE, exactly as
	 * renderLayerBody does — pass the raw value, not a pre-multiplied one.
	 */
	referenceZ: number;
	/** 1 in CINEMA, but taken as a parameter so the inverse never assumes it. */
	viewZoom: number;
	viewPan: { x: number; y: number };
	/**
	 * Lens distortion coefficient, same value the forward pass uses. 0 (the default)
	 * skips the Newton solve entirely. Source of truth for the formula that derives
	 * it from the FX slider: renderPipeline's `distortionK`.
	 */
	distortionK?: number;
	/**
	 * Normalisation centre for the distortion, i.e. the forward pass's
	 * distortCenterX/Y. Note it is the LOGICAL centre, which differs from
	 * centerXScreen only under HQ export scaling. Defaults to the screen centre.
	 */
	distortCenterX?: number;
	distortCenterY?: number;
};

/**
 * Undoes the forward distortion `(dx, dy) = (sx, sy)·(1 + K·r²)`.
 *
 * The forward map scales the vector by a scalar that depends only on the radius, so
 * the DIRECTION survives untouched — only the length has to be recovered. Writing
 * r for the undistorted normalised radius² and D for the distorted one:
 *
 *     D = r · (1 + K·r)²
 *
 * a cubic in r with no usable closed form, solved here by Newton with
 * g'(r) = (1 + K·r)(1 + 3·K·r). Starting at r = D, exact when K is 0 and a good
 * seed otherwise.
 *
 * THE FOLD (why this returns null instead of iterating harder). For K < 0 (barrel)
 * g rises only until r = −1/(3K) and falls after it, and past r = −1/K the factor
 * turns negative and flings the point back out through the origin. The forward map
 * is therefore NOT injective: a pixel beyond the peak has up to three world
 * pre-images — one on the falling branch and one flipped — and none on the
 * well-behaved rising branch.
 *
 * Such a pixel is still DRAWABLE (very distant geometry lands there, wrapped around
 * by the fold — measured, not assumed), so this is not an unreachable region. It is
 * a region where "the point under the cursor" has no single honest answer, and the
 * only candidates are far-away geometry the user was not pointing at. Framing there
 * would send the camera somewhere absurd, so the click is declined instead.
 *
 * How much of the screen this costs, measured at FL 800 (radius as a fraction of the
 * half-diagonal): distortion 0.1 → 122% (whole screen fine), 0.25 → 77%, 0.5 → 54%,
 * 1.0 → 38%. So only strong barrel settings put the corners out of reach, and the
 * centre — where framing usually happens — is always available.
 *
 * Newton is clamped to the rising branch so it cannot wander over the peak, and the
 * residual check below is what turns "parked at the peak" into an honest null.
 *
 * Note the normalisation is ELLIPTICAL, not circular: x is divided by cx and y by
 * cy, exactly as the forward pass does. Using a single radius here would be a
 * different transform on any non-square canvas.
 */
const undistort = (
	dx: number, dy: number, K: number, cx: number, cy: number,
): { x: number; y: number } | null => {
	if (K === 0 || (dx === 0 && dy === 0)) return { x: dx, y: dy };
	if (cx === 0 || cy === 0) return null;

	const nx = dx / cx;
	const ny = dy / cy;
	const D = nx * nx + ny * ny;

	// Upper bound of the branch where g is increasing. Only finite for K < 0.
	const peak = K < 0 ? -1 / (3 * K) : Infinity;

	// Does a rising-branch solution exist at all? Answered ANALYTICALLY, not by
	// inspecting Newton's residual. At the peak f is exactly 2/3, so the largest D the
	// good branch can reach is peak·(2/3)² = −4/(27K). Past that there is no solution
	// and no number of iterations would find one.
	//
	// This replaces a residual threshold that looked reasonable and was not: Newton
	// converges slowly right next to the peak (g' vanishes there), so a strict residual
	// read "not converged" as "no solution" and refused 3904 perfectly valid clicks in
	// the sweep. The residual measures how well the solver is doing; it was never
	// evidence about whether an answer exists.
	if (K < 0 && D > -4 / (27 * K)) return null;

	// Seed: the tightest UPPER bound available, so Newton walks down a convex
	// increasing curve and converges monotonically instead of hunting.
	//   D = r(1+Kr)² ≥ r          ⇒ r ≤ D          (tight near the centre)
	//   D = r(1+Kr)² ≥ K²r³       ⇒ r ≤ ∛(D/K²)    (tight far from it, K > 0)
	// Seeding with D alone looked fine and was not: for K > 0 and large D the cubic
	// term dominates and Newton only shrinks r by a factor of ⅔ per step, so three
	// iterations left points far off-centre badly short. The cube-root bound starts
	// the search in the right order of magnitude.
	let r = Math.min(D, peak);
	if (K > 0 && D > 0) r = Math.min(r, Math.cbrt(D / (K * K)));
	// Six, not the two or three Newton usually needs. Convergence stalls right next to
	// the fold peak because g' vanishes there, and that is precisely where a strong
	// barrel setting puts the edges of the frame. Measured worst-case error inside the
	// canvas: 3 steps → 1.05px, 4 → 0.19px, 5 → 0.03px, 6 → 0.0016px. Six is free —
	// this runs once per double-click, not once per point per frame.
	for (let i = 0; i < 6; i++) {
		const f = 1 + K * r;
		const g = r * f * f - D;
		const gp = f * (1 + 3 * K * r);
		if (gp === 0 || !Number.isFinite(gp)) return null;
		r = r - g / gp;
		if (!Number.isFinite(r)) return null;
		// Stay on the rising branch: past the peak the map folds and Newton diverges.
		if (r < 0) r = 0;
		else if (r > peak) r = peak;
	}

	const f = 1 + K * r;
	if (f <= 0 || !Number.isFinite(f)) return null;

	return { x: dx / f, y: dy / f };
};

/**
 * Returns the world point under the pointer on the reference plane, or null when
 * that plane is at or behind the near clip — the same condition that makes
 * renderLayerBody skip a layer, so a null here means "the forward projection
 * would not have drawn anything there either".
 */
export const unprojectCinematicPoint = (p: CinematicUnprojectParams): { x: number; y: number } | null => {
	// Depth of the reference plane, mirroring renderLayerBody's baseZ/shapeZ.
	const shapeZ = p.referenceZ * p.layerSpacingFactor * CINEMATIC_DEPTH_MULTIPLIER;
	const effectiveCameraZ = p.camera.z + p.viewZoomOffset;
	const dz = shapeZ - effectiveCameraZ;

	const denom = p.focalLength + dz;
	if (denom <= NEAR_CLIP) return null;
	const layerScale = p.focalLength / denom;
	if (layerScale === 0 || !Number.isFinite(layerScale)) return null;
	if (p.viewZoom === 0 || !Number.isFinite(p.viewZoom)) return null;

	// 1. Undo the viewport: centre offset, zoom and pan.
	let sx = (p.screenX - p.centerXScreen - p.viewPan.x) / p.viewZoom;
	let sy = (p.screenY - p.centerYScreen - p.viewPan.y) / p.viewZoom;

	// 2. Undo the lens distortion. BEFORE the rotation, because the forward pass
	//    applies it AFTER — this whole function is the forward one read backwards,
	//    and the two steps do not commute.
	const K = p.distortionK ?? 0;
	if (K !== 0) {
		const undistorted = undistort(
			sx, sy, K,
			p.distortCenterX ?? p.centerXScreen,
			p.distortCenterY ?? p.centerYScreen,
		);
		if (!undistorted) return null;
		sx = undistorted.x; sy = undistorted.y;
	}

	// 3. Undo the camera rotation. Forward rotates by +R
	//    (rx = sx·cos − sy·sin, ry = sx·sin + sy·cos), so this rotates by −R.
	const camRot = p.camera.rotation || 0;
	if (camRot !== 0) {
		const cosR = Math.cos(camRot);
		const sinR = Math.sin(camRot);
		const ux = sx * cosR + sy * sinR;
		const uy = -sx * sinR + sy * cosR;
		sx = ux; sy = uy;
	}

	// 4. Undo the perspective scale and the camera translation.
	return {
		x: sx / layerScale + p.camera.x,
		y: sy / layerScale + p.camera.y,
	};
};

/**
 * The reference plane for un-projecting a CINEMA click: the middle of the layers
 * that actually hold content.
 *
 * NOT the active layer, which is what the old code used. In CINEMA the active
 * layer is a leftover from DRAW mode — invisible, not chosen with CINEMA in mind,
 * and with no reason to govern framing. Depending on invisible state was the bug.
 * The mid-plane is predictable instead: the same pixel gives the same answer every
 * time, whatever happened in DRAW mode before.
 *
 * Content-aware rather than a plain range midpoint, because a diorama with 8
 * layers and drawing only in the first 3 should not reference empty space.
 *
 * Falls back to the midpoint of ALL layers when nothing is drawn yet — the same
 * convention renderPipeline already uses for its default centerZ, so an unset POI
 * and a click on an empty canvas agree on where the middle is.
 *
 * @param totalLayers  state.totalLayers
 * @param hasContent   Predicate: does this layer index hold non-eraser shapes?
 * @param baseDepthStep BASE_DEPTH_STEP
 * @returns RAW layer-space z (may be fractional), ready for `referenceZ`.
 */
export const referencePlaneZ = (
	totalLayers: number,
	hasContent: (layerIndex: number) => boolean,
	baseDepthStep: number,
): number => {
	let first = -1;
	let last = -1;
	for (let i = 0; i < totalLayers; i++) {
		if (!hasContent(i)) continue;
		if (first === -1) first = i;
		last = i;
	}
	const midIndex = first === -1
		? (totalLayers - 1) / 2
		: (first + last) / 2;
	return midIndex * -baseDepthStep;
};
