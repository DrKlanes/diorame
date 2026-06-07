import { BASE_DEPTH_STEP } from '../StrataContext';
import { HANDHELD_SWAY_FREQ, HANDHELD_TREMOR_FREQ } from '../../../constants/renderConstants';
import { Waypoint } from '../../../types/strataTypes';

export const CINEMATIC_DEPTH_MULTIPLIER = 3;

export interface OrbitState {
	azimuth: number;
	elevation: number;
	targetAzimuth: number;
	targetElevation: number;
	panOffsetX: number;
	panOffsetY: number;
}

export interface CinematicTickResult {
	accumulatedTime: number;
	accumulatedHandheldTime: number;
	wiggleFrame: number;
	newCamera: { x: number; y: number; z: number; rotation: number };
	newShake: { x: number; y: number; z: number };
	// Storytelling rack-focus: the (possibly fractional) REAL layer index the tour is
	// currently framing, for DoF lock to follow. null for every non-storytelling preset
	// and for the n===0 degenerate case → consumer gate falls back to the manual focus.
	focusLayerIndex: number | null;
}

/**
 * Advances the cinematic camera by one animation tick.
 * Mutates orbitState in place (azimuth/elevation smoothing for orbit mode).
 * @param dt  Delta time in seconds (clamped to 0.1 by caller).
 * @param now Current timestamp from Date.now().
 */
export const computeCinematicTick = (
	dt: number,
	now: number,
	accumulatedTime: number,
	accumulatedHandheldTime: number,
	cinematicSpeed: number,
	cinematicType: string,
	camera: { x: number; y: number; z: number; rotation: number },
	totalLayers: number,
	isHandheldEnabled: boolean,
	handheldIntensity: 'low' | 'medium' | 'high',
	poiX: number,
	poiY: number,
	centerZ: number,
	orbitState: OrbitState,
	waypoints: Waypoint[] = [],
	focalLength: number = 800,
	viewZoomOffset: number = 0,
	layerSpacingFactor: number = 1,
	canvasDim: number = 1000
): CinematicTickResult => {
	const newAccTime = accumulatedTime + dt * cinematicSpeed;
	const newHandheldTime = accumulatedHandheldTime + dt;
	const newWiggleFrame = Math.floor(now / 250);

	const t = newAccTime;
	const spd = 2 * cinematicSpeed;
	const maxD = totalLayers * -BASE_DEPTH_STEP * CINEMATIC_DEPTH_MULTIPLIER;

	let nc = { ...camera };
	// Storytelling rack-focus target (real layer index, fractional for smooth racking).
	// Stays null for every other preset → the DoF override gate fails → manual focus intact.
	let focusLayerIndex: number | null = null;

	if (cinematicType === 'forward') {
		nc.z -= spd; nc.x = poiX + Math.sin(t)*50; nc.y = poiY + Math.cos(t*0.7)*50;
		if (nc.z < maxD - 1000) nc.z = 500;
	} else if (cinematicType === 'spiral') {
		nc.z -= spd*1.5; nc.x = poiX + Math.cos(t)*200; nc.y = poiY + Math.sin(t)*200;
		if (nc.z < maxD - 1000) nc.z = 500;
	} else if (cinematicType === 'yoyo') {
		nc.z = (500 + maxD)/2 + Math.sin(t*0.5)*(Math.abs(maxD)+500)/2;
		nc.x = poiX + Math.sin(t*2)*20; nc.y = poiY;
	} else if (cinematicType === 'pulse') {
		nc.z -= spd*(2+Math.sin(t*3)); nc.x = poiX + Math.sin(t*5)*10; nc.y = poiY + Math.cos(t*5)*10;
		if (nc.z < maxD - 1000) nc.z = 500;
	} else if (cinematicType === 'twist') {
		nc.z -= spd*1.2; nc.x = poiX; nc.y = poiY; nc.rotation = Math.sin(t*0.5)*0.5;
		// Add subtle zoom in/out
		nc.z += Math.sin(t*0.25) * 400;
		if (nc.z < maxD - 1000) nc.z = 500;
	} else if (cinematicType === 'arc') {
		nc.z = centerZ + 1200; nc.y = poiY; nc.x = poiX + Math.sin(t*0.4)*800;
	} else if (cinematicType === 'orbit') {
		// Free View Mode: smooth interpolation for orbit angles
		orbitState.azimuth += (orbitState.targetAzimuth - orbitState.azimuth)*0.1;
		orbitState.elevation += (orbitState.targetElevation - orbitState.elevation)*0.1;

		// Calculate orbit position around center
		const cd = 1200;
		const orbitX = cd * Math.sin(orbitState.azimuth) * Math.cos(orbitState.elevation);
		const orbitY = cd * Math.sin(orbitState.elevation);
		const orbitZ = cd * Math.cos(orbitState.azimuth) * Math.cos(orbitState.elevation);

		// Apply pan offset to orbit position for free movement
		nc.x = poiX + orbitX + orbitState.panOffsetX;
		nc.y = poiY + orbitY + orbitState.panOffsetY;
		nc.z = centerZ + orbitZ;
	} else if (cinematicType === 'crane') {
		nc.y = poiY + Math.sin(t*0.3)*400;
		nc.z = centerZ + 1200 - Math.cos(t*0.3)*150;
		nc.x = poiX + Math.sin(t*0.15)*30;
	} else if (cinematicType === 'truck') {
		nc.x = poiX + Math.sin(t*0.2)*400;
		nc.y = poiY;
		nc.z = centerZ + 1200 + Math.abs(Math.cos(t*0.2)) * 150;
	} else if (cinematicType === 'zoom') {
		nc.x = poiX;
		nc.y = poiY;
		nc.z = centerZ + 1200;
	} else if (cinematicType === 'storytelling') {
		// Data-driven contemplative tour: ONE continuous organic flow through every
		// layer's content centroid (waypoints, back→front) and looping front→back.
		// No dwell/travel phases, no easeInOut to zero — the camera never fully stops.
		// A single progress parameter s∈[0,N) glides the pose along a smooth cyclic
		// spline; its SPEED undulates (slow near each layer, fast between) but stays
		// strictly > 0. Closed form: s is a PURE function of t → fully reconstructable
		// for any t (scrub-safe) with NO persistent progress state.
		//
		// --- Tuning constants ---
		// Undulating speed (segments / second): SPEED_MIN at each layer, SPEED_MAX mid-way.
		const SPEED_MIN = 0.05;             // never 0 → no stop, no reverse (keep > 0)
		const SPEED_MAX = 0.25;             // peak glide speed between layers
		const INTRO_DURATION = 4.5;         // opening beat: hold posed on wp[0] (full breathing) before the journey begins. Function of absolute t from 0 (scrub-safe), never re-entered in later loops.
		// Real framing (dolly): each layer lands at a camera distance that makes it fill
		// ~TARGET_FILL_RATIO of the canvas, inverting layerScale = FL/(FL+dz).
		const TARGET_FILL_RATIO = 0.70;     // fraction of canvasDim the layer should fill
		const MAX_APPARENT_SCALE = 2.6;     // magnification cap (artistic). At FL=800 → FL/k≈308 > 250 fade threshold
		const MIN_APPARENT_SCALE = 0.3;     // min apparent scale → caps how far the camera backs off on huge layers
		const FADE_SAFE_DISTANCE = 280;     // keep FL+dz ≥ this (> 250 fade threshold, NEAR_CLIP=50) → derives a FL-robust k cap
		const RADIUS_EPSILON = 1;           // radius=0 guard (clamp also saves it) → no divide-by-zero
		// Breathing: a RELATIVE z swing (fraction of the framing distance) so the apparent
		// size oscillation looks the same on near (magnified) and far layers. Surfaces in
		// the SLOW moments (near layers) via the proximity weight.
		const BREATH_AMPLITUDE_FRAC = 0.05; // ≈5% apparent-scale swing at each layer
		const BREATH_FREQ = 0.5;            // breathing carrier speed (slow)
		const FRAMING_Z_OFFSET = 1200;      // fallback offset for the n===0 (no waypoints) degenerate case only
		// -------------------------

		// Real framing scale for a waypoint: the clamped apparent scale k = layerScale that
		// makes the layer (logical width 2·radius) fill TARGET_FILL_RATIO of canvasDim.
		// kMax is the lesser of the artistic cap and the FL-derived fade-safe cap, so framed
		// layers never enter the <250 opacity fade regardless of the user's focal length.
		const framedScale = (wp: Waypoint) => {
			const raw = (TARGET_FILL_RATIO * canvasDim) / (2 * Math.max(wp.radius, RADIUS_EPSILON));
			const kMax = Math.min(MAX_APPARENT_SCALE, focalLength / FADE_SAFE_DISTANCE);
			return Math.max(MIN_APPARENT_SCALE, Math.min(kMax, raw));
		};

		// Inverted projection → camera Z that frames the layer. From layerScale = FL/(FL+dz):
		//   dz* = FL·(1−k)/k ,  and camZ = currentCamera.z + viewZoomOffset , dz = shapeZ − camZ
		//   ⇒ nc.z = shapeZ − viewZoomOffset − dz*  , with shapeZ = wp.z·layerSpacingFactor
		// (wp.z already carries ×CINEMATIC_DEPTH_MULTIPLIER; the spacing factor is applied here.)
		const poseZAt = (wp: Waypoint) => {
			const k = framedScale(wp);
			const dzStar = focalLength * (1 - k) / k;
			return wp.z * layerSpacingFactor - viewZoomOffset - dzStar;
		};

		// Framing pose for a waypoint: centered on the centroid (x,y), z from real framing.
		const poseAt = (wp: Waypoint) => ({ x: wp.x, y: wp.y, z: poseZAt(wp) });

		// Relative breathing amplitude in Z for a waypoint: a fixed fraction of its framing
		// distance FL/k. Δz/(FL+dz) ≈ BREATH_AMPLITUDE_FRAC ⇒ constant apparent-scale swing.
		const breathAmpZAt = (wp: Waypoint) => BREATH_AMPLITUDE_FRAC * (focalLength / framedScale(wp));

		const n = waypoints.length;

		if (n === 0) {
			// Empty/all-pinned: degrade to a static framing on the POI (no crash, no radius).
			nc.x = poiX; nc.y = poiY; nc.z = centerZ + FRAMING_Z_OFFSET; nc.rotation = 0;
		} else if (n === 1) {
			// Single layer: hold the framing pose with gentle continuous (relative) breathing.
			const p = poseAt(waypoints[0]);
			nc.x = p.x; nc.y = p.y;
			nc.z = p.z + Math.sin(t * BREATH_FREQ) * breathAmpZAt(waypoints[0]);
			nc.rotation = 0;
			focusLayerIndex = waypoints[0].layerIndex;
		} else {
			// Closed-form undulating progress. u advances LINEARLY in tTravel (t already folds
			// in cinematicSpeed via the caller). Warping u→s with a sine makes ds/du =
			// 1 − A·cos(2πu): minimum (= 1−A) exactly at integer u, where s is ALSO an
			// integer → the slow point lands precisely on each waypoint. A < 1 (because
			// SPEED_MIN > 0) keeps ds/du strictly positive: no stop, no reversal, no seam.
			const R = (SPEED_MAX + SPEED_MIN) / 2;                 // mean segments / second
			const A = (SPEED_MAX - SPEED_MIN) / (SPEED_MAX + SPEED_MIN); // undulation depth, 0<A<1
			// Opening beat: t < INTRO_DURATION → tTravel = 0 → u = 0 → s = 0 (held on wp[0]).
			// At t = INTRO_DURATION⁺ travel resumes from s = 0 (still wp[0]) → C0-continuous handoff.
			// Stateless & non-recurrent: later loops use ever-growing tTravel, never re-enter the beat.
			const tTravel = Math.max(0, t - INTRO_DURATION);
			const u = R * tTravel;
			const sWarp = u - (A / (2 * Math.PI)) * Math.sin(2 * Math.PI * u);
			let s = sWarp % n;
			if (s < 0) s += n;
			const seg = Math.floor(s);
			const frac = s - seg;

			// Catmull-Rom through the poses gives a corner-free path (C1 across segments)
			// that PASSES THROUGH each waypoint with a non-zero tangent — so the camera
			// glides through layers without the velocity ever hitting zero. (With n===2
			// the spline tangents vanish, so fall back to a straight back-and-forth.)
			const poses = waypoints.map(poseAt);
			const P = (i: number) => poses[((i % n) + n) % n];
			const p0 = P(seg - 1), p1 = P(seg), p2 = P(seg + 1), p3 = P(seg + 2);
			const cr = (a: number, b: number, c: number, d: number, f: number) =>
				0.5 * ((2 * b) + (-a + c) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (-a + 3 * b - 3 * c + d) * f * f * f);

			if (n === 2) {
				nc.x = p1.x + (p2.x - p1.x) * frac;
				nc.y = p1.y + (p2.y - p1.y) * frac;
				nc.z = p1.z + (p2.z - p1.z) * frac;
			} else {
				nc.x = cr(p0.x, p1.x, p2.x, p3.x, frac);
				nc.y = cr(p0.y, p1.y, p2.y, p3.y, frac);
				nc.z = cr(p0.z, p1.z, p2.z, p3.z, frac);
			}

			// Breathing is the TEXTURE of the slow moments: its weight is driven by the
			// SAME thing as the speed — proximity to a waypoint. (1+cos(2πs))/2 is 1 at
			// each layer (where speed is min) and fades to 0 mid-transit. Smooth function
			// of s (hence of t), so it adds zero discontinuity by construction. The amplitude
			// is the relative one of the NEAREST waypoint (waypoints[seg], where proximity
			// peaks), keeping the apparent-size swing constant across near/far layers.
			const proximity = (1 + Math.cos(2 * Math.PI * s)) / 2;
			const ampLerp = (1 - frac) * breathAmpZAt(waypoints[seg]) + frac * breathAmpZAt(waypoints[(seg + 1) % n]);
			nc.z += Math.sin(t * BREATH_FREQ) * ampLerp * proximity;
			nc.rotation = 0;

			// Rack focus: interpolate the REAL layer index between the current waypoint and the
			// next cyclic one with the SAME frac that drives the pose → the focus plane racks
			// smoothly from layer to layer as the camera flies. Uses each waypoint's layerIndex
			// (NOT seg — waypoints skip pinned/empty layers). During the opening beat (s=0 →
			// seg=0, frac=0) this collapses to waypoints[0].layerIndex, and stays continuous
			// across the beat→travel handoff (frac=0 on both sides).
			focusLayerIndex = (1 - frac) * waypoints[seg].layerIndex + frac * waypoints[(seg + 1) % n].layerIndex;
		}
	}

	// Apply Handheld Camera Shake (if enabled)
	let newShake = { x: 0, y: 0, z: 0 };
	if (isHandheldEnabled) {
		const intensityMap: Record<string, number> = { low: 0.8, medium: 2.0, high: 3.5 };
		// Increase frequency for High intensity to simulate more frantic movement
		const freqMap: Record<string, number> = { low: 1.0, medium: 1.0, high: 2.5 };

		const baseIntensity = intensityMap[handheldIntensity];
		const freqMult = freqMap[handheldIntensity];

		// More complex frequency mixing for organic feel using independent time
		const ht = newHandheldTime;

		// Base sway (breathing/body movement)
		const t1 = ht * HANDHELD_SWAY_FREQ * freqMult;
		const swayX = Math.sin(t1) * 3 + Math.cos(t1 * 1.3) * 2;
		const swayY = Math.cos(t1 * 0.9) * 3 + Math.sin(t1 * 1.4) * 2;

		// Micro-tremors (muscle tension/weight) - Faster frequencies
		const t2 = ht * HANDHELD_TREMOR_FREQ * freqMult;
		const tremorX = Math.sin(t2) * 0.5 + Math.cos(t2 * 1.7) * 0.4;
		const tremorY = Math.cos(t2 * 1.2) * 0.5 + Math.sin(t2 * 2.3) * 0.4;
		const tremorZ = Math.sin(t2 * 1.5) * 0.5;

		// Combined noise
		const shakeX = (swayX + tremorX) * baseIntensity;
		const shakeY = (swayY + tremorY) * baseIntensity;
		const shakeZ = (swayX * 1.5 + tremorZ) * baseIntensity;

		nc.x += shakeX;
		nc.y += shakeY;
		nc.z += shakeZ;

		newShake = { x: shakeX, y: shakeY, z: shakeZ };

		// Rotation shake (roll/pitch)
		const tr = ht * freqMult;
		nc.rotation += ((Math.sin(tr * 1.1) * 0.005) + (Math.cos(tr * 3.7) * 0.003)) * baseIntensity;
	}

	return {
		accumulatedTime: newAccTime,
		accumulatedHandheldTime: newHandheldTime,
		wiggleFrame: newWiggleFrame,
		newCamera: nc,
		newShake,
		focusLayerIndex,
	};
};
