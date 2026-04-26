import { FOG_DENSITY_FACTOR } from '../../../constants/renderConstants';

// ─── Per-layer effects (called inside the layer render loop) ─────────────────

/**
 * Applies exponential depth fog to a layer canvas.
 * @param depth  FL + layerAvgZ — pre-calculated by the caller.
 */
export const applyFog = (
	layerCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	fogInt: number,
	isDarkMode: boolean,
	depth: number
): void => {
	if (fogInt <= 0.01) return;

	// Curve start distance: Low fog = starts far away, High fog = starts closer
	const startDist = 2000 + (1.0 - Math.pow(fogInt, 0.5)) * 4000;
	// Curve density: Standard exponential fog
	const density = FOG_DENSITY_FACTOR * fogInt;

	const dist = Math.max(0, depth - startDist);
	const fogFactor = 1.0 - Math.exp(-dist * density);

	if (fogFactor > 0.01) {
		layerCtx.globalCompositeOperation = 'source-atop';
		layerCtx.fillStyle = isDarkMode ? '#050505' : '#f8f9fa';
		layerCtx.globalAlpha = Math.min(1, fogFactor);
		layerCtx.fillRect(0, 0, w, h);
		layerCtx.globalAlpha = 1.0;
		layerCtx.globalCompositeOperation = 'source-over';
	}
};

/**
 * Applies glow bloom to the offscreen canvas using the helper canvas as source.
 * dofBlur is pre-calculated by the caller and added to the glow radius.
 */
export const applyGlow = (
	offCtx: CanvasRenderingContext2D,
	helperCanvas: HTMLCanvasElement,
	glowInt: number,
	dofBlur: number,
	isDarkMode: boolean
): void => {
	offCtx.save();
	offCtx.filter = `blur(${(isDarkMode ? 35 : 20) * glowInt + dofBlur}px)`;
	offCtx.globalCompositeOperation = isDarkMode ? 'lighter' : 'source-over';
	offCtx.globalAlpha = isDarkMode ? 1.0 : (0.3 + glowInt * 0.4);
	offCtx.drawImage(helperCanvas, 0, 0);
	// Pass 4 — Ink blend (darkens and densifies overlapping ink areas)
	if (inkBlend > 0.01) {
		offCtx.globalCompositeOperation = 'multiply';
		offCtx.globalAlpha = inkBlend * 0.5;
		offCtx.drawImage(helperCtx.canvas, 0, 0);
	}
	offCtx.restore();
};

/**
 * Composites the helper canvas onto the offscreen canvas with optional DoF blur.
 * Always called — dofBlur=0 means a plain draw with no blur.
 */
export const applyDoFBlur = (
	offCtx: CanvasRenderingContext2D,
	helperCanvas: HTMLCanvasElement,
	dofBlur: number
): void => {
	offCtx.save();
	if (dofBlur > 0.5) offCtx.filter = `blur(${dofBlur}px)`;
	offCtx.drawImage(helperCanvas, 0, 0);
	offCtx.restore();
	offCtx.filter = 'none';
};

// ─── Final composition effects (called after the layer loop) ─────────────────

// ─── RISO V2 — procedural (no PNG asset) ──────────────────────────────────────

const _h = (n: number): number => {
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) | 0;
	n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) | 0;
	return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff;
};

export const generateRisoGrain = (w: number, h: number): HTMLCanvasElement => {
	const canvas = document.createElement('canvas');
	canvas.width = w; canvas.height = h;
	const ctx = canvas.getContext('2d')!;
	const imageData = ctx.createImageData(w, h);
	const data = imageData.data;

	// Parámetros de trama
	const cellSize = 3;
	const cols = Math.ceil(w / cellSize);
	const rows = Math.ceil(h / cellSize);

	// Pre-generar mapa de densidad por celda (baja frecuencia — zonas de acumulación)
	const densityMap = new Float32Array(cols * rows);
	for (let cy = 0; cy < rows; cy++) {
		for (let cx = 0; cx < cols; cx++) {
			const bx = cx / 40, by = cy / 40;
			const ibx = Math.floor(bx), iby = Math.floor(by);
			const fbx = bx - ibx, fby = by - iby;
			const ux = fbx * fbx * (3 - 2 * fbx), uy = fby * fby * (3 - 2 * fby);
			const m00 = _h(ibx * 7919 + iby * 6271 + 1);
			const m10 = _h((ibx+1) * 7919 + iby * 6271 + 1);
			const m01 = _h(ibx * 7919 + (iby+1) * 6271 + 1);
			const m11 = _h((ibx+1) * 7919 + (iby+1) * 6271 + 1);
			const macro = (m00 + (m10-m00)*ux + (m01-m00)*uy + (m00-m10-m01+m11)*ux*uy) * 0.12 + 0.52;
			const micro = _h(cx * 1619 + cy * 31337 + 42) * 0.18;
			densityMap[cy * cols + cx] = Math.min(1, macro + micro);
		}
	}

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const cx = Math.floor(x / cellSize);
			const cy = Math.floor(y / cellSize);
			const density = densityMap[cy * cols + cx];

			const lx = (x % cellSize) / cellSize;
			const ly = (y % cellSize) / cellSize;

			const jx = _h(cx * 2971 + cy * 1327 + 10) * 0.5 - 0.25;
			const jy = _h(cx * 1327 + cy * 2971 + 20) * 0.5 - 0.25;
			const cx2 = 0.5 + jx, cy2 = 0.5 + jy;

			const dx = (lx - cx2) * 1.6;
			const dy = ly - cy2;
			const dist = Math.sqrt(dx * dx + dy * dy);

			const radius = density * 0.52;

			const pit = _h(x * 9431 + y * 6367 + 99) * 0.08;
			const alpha = dist < (radius - pit) ? 255 : 0;

			const nx = x / w, ny = y / h;
			const organic =
				0.72 +
				0.18 * Math.sin(nx * 3.1 + 1.2) * Math.cos(ny * 2.7 + 0.8) +
				0.14 * Math.sin(nx * 1.8 + ny * 2.3 + 2.1);

			const idx = (y * w + x) * 4;
			data[idx] = 0; data[idx+1] = 0; data[idx+2] = 0; data[idx+3] = Math.min(255, alpha * organic);
		}
	}

	ctx.putImageData(imageData, 0, 0);
	return canvas;
};

/**
 * Applies procedural RISO printing effect: paper grain, ink spread, misregistration.
 * No ctx.filter (iPad compatible).
 */
export const applyRisoV2 = (
	offCtx: CanvasRenderingContext2D,
	w: number,
	h: number,
	intensity: number,
	cachedGrainCanvas: HTMLCanvasElement,
	helperCtx: CanvasRenderingContext2D,
	inkBlend: number = 0
): void => {
	offCtx.save();
	// Pass 1 — Paper grain
	offCtx.globalCompositeOperation = 'destination-out';
	offCtx.globalAlpha = intensity * 0.6;
	offCtx.drawImage(cachedGrainCanvas, 0, 0, w, h);
	// Snapshot post-grain into helper for passes 2 & 3
	helperCtx.clearRect(0, 0, w, h);
	helperCtx.drawImage(offCtx.canvas, 0, 0);
	// Pass 2 — Ink spread
	offCtx.globalCompositeOperation = 'multiply';
	offCtx.globalAlpha = intensity * 0.15;
	offCtx.drawImage(helperCtx.canvas, 0, 0);
	// Pass 3 — Misregistration ghost (fixed offsets, no flicker)
	offCtx.globalCompositeOperation = 'screen';
	offCtx.globalAlpha = intensity * 0.08;
	offCtx.drawImage(helperCtx.canvas, 2, 1);
	offCtx.drawImage(helperCtx.canvas, -1, -2);
	offCtx.restore();
};

/**
 * Applies chromatic aberration (CMY/RGB channel shift) and transfers
 * the offscreen canvas to the main canvas.
 * When CA is disabled the offscreen canvas is drawn directly to ctx.
 */
export const applyChromaticAberration = (
	ctx: CanvasRenderingContext2D,
	offscreenCanvas: HTMLCanvasElement,
	helperCanvas: HTMLCanvasElement,
	compositionCanvas: HTMLCanvasElement,
	w: number,
	h: number,
	caInt: number,
	isDarkMode: boolean
): void => {
	const hCtx = helperCanvas.getContext('2d')!;
	const cCtx = compositionCanvas.getContext('2d')!;
	cCtx.clearRect(0, 0, w, h);
	if (!isDarkMode) { cCtx.fillStyle = '#FFFFFF'; cCtx.fillRect(0, 0, w, h); }

	const drawChan = (col: string, s: number, mode: GlobalCompositeOperation) => {
		hCtx.clearRect(0, 0, w, h);

		if (isDarkMode) {
			// Dark Mode: Colorize with source-in, then Multiply to restore shading
			hCtx.globalCompositeOperation = 'source-over';
			hCtx.drawImage(offscreenCanvas, 0, 0);
			hCtx.globalCompositeOperation = 'source-in'; hCtx.fillStyle = col; hCtx.fillRect(0, 0, w, h);
			hCtx.globalCompositeOperation = 'multiply'; hCtx.drawImage(offscreenCanvas, 0, 0);
		} else {
			// Light Mode: White BG -> Black Ink -> Screen Color (CMY)
			hCtx.globalCompositeOperation = 'source-over';
			hCtx.fillStyle = '#FFFFFF'; hCtx.fillRect(0, 0, w, h);
			hCtx.drawImage(offscreenCanvas, 0, 0);
			hCtx.globalCompositeOperation = 'screen';
			hCtx.fillStyle = col; hCtx.fillRect(0, 0, w, h);
		}
		cCtx.globalCompositeOperation = mode;
		const dx = (w - w * s) / 2, dy = (h - h * s) / 2;
		cCtx.drawImage(helperCanvas, dx, dy, w * s, h * s);
	};

	const cols = isDarkMode ? ['#FF0000', '#00FF00', '#0000FF'] : ['#00FFFF', '#FF00FF', '#FFFF00'];
	const blend = isDarkMode ? 'lighten' : 'multiply';
	drawChan(cols[0], 1 + 0.03 * caInt, blend as GlobalCompositeOperation);
	drawChan(cols[1], 1 + 0.015 * caInt, blend as GlobalCompositeOperation);
	drawChan(cols[2], 1, blend as GlobalCompositeOperation);

	ctx.drawImage(compositionCanvas, 0, 0);
};

/**
 * Applies a radial vignette gradient to the main canvas.
 */
export const applyVignette = (
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	vig: number
): void => {
	if (vig <= 0.01) return;
	const g = ctx.createRadialGradient(w / 2, h / 2, h / 3, w / 2, h / 2, h * 0.8);
	g.addColorStop(0, 'rgba(0,0,0,0)');
	g.addColorStop(1, `rgba(0,0,0,${0.95 * vig})`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
};

/**
 * Applies animated film grain using a tiling noise canvas.
 */
export const applyGrain = (
	ctx: CanvasRenderingContext2D,
	noiseCanvas: HTMLCanvasElement,
	w: number,
	h: number,
	grain: number
): void => {
	ctx.globalCompositeOperation = 'overlay';
	ctx.globalAlpha = grain;
	// Add vibration to grain by random offset
	const offsetX = Math.random() * 100 - 50;
	const offsetY = Math.random() * 100 - 50;

	// Use pattern to ensure coverage with offset
	const pattern = ctx.createPattern(noiseCanvas, 'repeat');
	if (pattern) {
		ctx.fillStyle = pattern;
		ctx.save();
		ctx.translate(offsetX, offsetY);
		ctx.fillRect(-offsetX, -offsetY, w + Math.abs(offsetX), h + Math.abs(offsetY));
		ctx.restore();
	} else {
		// Fallback
		ctx.drawImage(noiseCanvas, 0, 0);
	}

	ctx.globalAlpha = 1.0;
};

/**
 * Applies an animated grunge texture overlay with random rotation and flip per frame.
 */
export const applyGrunge = (
	ctx: CanvasRenderingContext2D,
	grungeImg: HTMLImageElement,
	w: number,
	h: number,
	grungeIntensity: number
): void => {
	// Posterize time to ~3fps (350ms)
	const step = Math.floor(Date.now() / 350);

	// Seed random based on step
	const seed = step * 123.456;
	const rand = (n: number) => {
		const x = Math.sin(seed + n) * 10000;
		return x - Math.floor(x);
	};

	ctx.save();
	ctx.globalCompositeOperation = 'overlay';

	// Reduced intensity: 0.15 (Low), 0.35 (Med), 0.65 (High)
	const opacity = grungeIntensity <= 0.2 ? 0.15 : grungeIntensity >= 0.8 ? 0.65 : 0.35;
	ctx.globalAlpha = opacity;

	const screenDiag = Math.hypot(w, h);

	// 1. Determine Scale
	// Target scale is 0.5 for "fine grain", but we must ensure we cover the screen diagonal
	// so we don't see edges (the "cuts").
	const targetScale = 0.5;
	const minImgDim = Math.min(grungeImg.width, grungeImg.height);
	// Minimum scale needed to ensure the image's smallest side covers the screen rotation
	const minSafeScale = (screenDiag * 1.05) / minImgDim;

	// Use the larger of the two to guarantee coverage
	const finalScale = Math.max(targetScale, minSafeScale);

	// 2. Calculate Safe Wiggle Range
	// How much surplus image do we have?
	const scaledMinDim = minImgDim * finalScale;
	const surplus = Math.max(0, scaledMinDim - screenDiag);
	const safeRadius = surplus / 2;

	// 3. Random Parameters
	const rot = rand(1) * Math.PI * 2;
	// Constrain wiggle to safe zone so edges never enter viewport
	const offX = (rand(2) - 0.5) * 2 * (safeRadius * 0.9);
	const offY = (rand(3) - 0.5) * 2 * (safeRadius * 0.9);

	// Random Flip (Mirroring) for extra variety
	const flipX = rand(4) > 0.5 ? 1 : -1;
	const flipY = rand(5) > 0.5 ? 1 : -1;

	ctx.translate(w / 2, h / 2);
	ctx.rotate(rot);
	ctx.translate(offX, offY);
	ctx.scale(finalScale * flipX, finalScale * flipY);

	ctx.drawImage(grungeImg, -grungeImg.width / 2, -grungeImg.height / 2);

	ctx.restore();
};
