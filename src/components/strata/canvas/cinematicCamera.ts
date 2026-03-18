import { BASE_DEPTH_STEP } from '../StrataContext';
import { HANDHELD_SWAY_FREQ, HANDHELD_TREMOR_FREQ } from '../../../constants/renderConstants';

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
	orbitState: OrbitState
): CinematicTickResult => {
	const newAccTime = accumulatedTime + dt * cinematicSpeed;
	const newHandheldTime = accumulatedHandheldTime + dt;
	const newWiggleFrame = Math.floor(now / 250);

	const t = newAccTime;
	const spd = 2 * cinematicSpeed;
	const maxD = totalLayers * -BASE_DEPTH_STEP * CINEMATIC_DEPTH_MULTIPLIER;

	let nc = { ...camera };

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
	};
};
