import { BASE_DEPTH_STEP } from '../StrataContext';
import type { Projection } from './transformPoint';

/**
 * Particle shape used by the cinematic-mode particle field. Mirrors the
 * inline type held by particlesRef in StrataCanvas (L120). Declared here
 * rather than imported because no shared definition exists; if a shared
 * type is introduced later, swap to that import.
 */
export type Particle = {
	x: number;
	y: number;
	z: number;
	r: number;
	a: number;
	vx: number;
	vy: number;
	shade: number;
	rotation: number;
	rotationSpeed: number;
	strokeShape: { x: number; y: number }[];
};

export type RenderParticlesOpts = {
	z: number;
	intensity: number;
	type: 'circle' | 'square' | 'stroke';
};

/**
 * Renders particles for one layer of the layer loop. Mutates the
 * particles array IN PLACE: each particle's x, y, rotation are
 * advanced by their velocity once per call. Since this is called
 * once per layer in the renderZs.forEach, particles with N visible
 * layers advance N steps per frame — this is the existing intentional
 * behavior and MUST be preserved.
 *
 * Particles wraparound at |x| > 1500 and |y| > 1000.
 *
 * Only paints a particle when its z falls within the current layer's
 * z range AND its projected opacity is > 0.01.
 *
 * @param layerCtx       Canvas 2D context for this layer
 * @param particles      MUTABLE array of particles (particlesRef.current)
 * @param transformPoint The closure (x, y) => Projection for this layer
 * @param opts           { z (current layer Z), intensity (0-1), type }
 * @returns              true if any particle was painted (caller uses to set hasContent)
 */
export const renderParticles = (
	layerCtx: CanvasRenderingContext2D,
	particles: Particle[],
	transformPoint: (x: number, y: number) => Projection,
	opts: RenderParticlesOpts,
): boolean => {
	let hasContent = false;
	const pIntensity = opts.intensity;
	const pType = opts.type;
	particles.forEach(p => {
		p.x += p.vx; p.y += p.vy; p.rotation += p.rotationSpeed;
		if (p.x > 1500) p.x = -1500; else if (p.x < -1500) p.x = 1500;
		if (p.y > 1000) p.y = -1000; else if (p.y < -1000) p.y = 1000;

		if (p.z <= opts.z + 50 && p.z > opts.z - BASE_DEPTH_STEP + 50) {
			// Reuse projection logic
			const proj = transformPoint(p.x, p.y); // Particles share layer Z roughly
			if (proj.opacity > 0.01) {
				const alpha = Math.min(1, (pIntensity * 1.5) * proj.opacity);
				const colorVal = p.shade < 0.5 ? Math.floor(p.shade * 120) : 195 + Math.floor((p.shade - 0.5) * 120);
				layerCtx.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, ${alpha})`;

				if (pType === 'circle') {
					layerCtx.beginPath();
					layerCtx.arc(proj.x, proj.y, p.r * proj.scale, 0, Math.PI * 2);
					layerCtx.fill();
				} else {
					layerCtx.save();
					layerCtx.translate(proj.x, proj.y);
					layerCtx.rotate(p.rotation);
					if (pType === 'square') {
						const s = p.r * proj.scale * 2;
						layerCtx.fillRect(-s/2, -s/2, s, s);
					} else {
						const s = p.r * proj.scale;
						layerCtx.beginPath();
						if (p.strokeShape.length) {
							layerCtx.moveTo(p.strokeShape[0].x * s, p.strokeShape[0].y * s);
							for(let i=1; i<p.strokeShape.length; i++) layerCtx.lineTo(p.strokeShape[i].x * s, p.strokeShape[i].y * s);
						}
						layerCtx.fill();
					}
					layerCtx.restore();
				}
				hasContent = true;
			}
		}
	});
	return hasContent;
};
