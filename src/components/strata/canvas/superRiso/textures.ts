// Super Riso — the engine's textures (public/textures/superRiso), loaded once with the lazy chunk.
// Extracted from applySuperRiso.ts (v3.20.14).

import type { EngineAssets } from './engine';

const TEXTURES = ['greennoise1024', 'ink_black', 'ink_red', 'ink_lut'] as const;

const loadImage = (name: string) => new Promise<HTMLImageElement>((resolve, reject) => {
	const img = new Image();
	img.onload = () => resolve(img);
	img.onerror = () => reject(new Error(`texture ${name} failed to load`));
	img.src = `/textures/superRiso/${name}.png`;
});

export const loadAssets = (): Promise<EngineAssets> => Promise.all(TEXTURES.map(loadImage))
	.then(([green, exBlack, exRed, exLut]) => ({ green, exBlack, exRed, exLut }));
