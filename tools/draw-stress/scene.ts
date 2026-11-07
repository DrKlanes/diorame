// Synthetic DRAW scenes for the stress test (tools/draw-stress/README.md). Bundled and run by generate.mjs:
// the strokes go through the app's own generators, so their outlines have the size and point count of real ones.
import { generateTaperedStroke, generateUniformStroke } from '../../src/utils/strokeGenerators';
import { PALETTE_PRIMARY } from '../../src/constants/palette';

const BASE_DEPTH_STEP = 150;
const INKS = PALETTE_PRIMARY.map(c => c.hex).filter(h => h.toUpperCase() !== '#FFFFFF');

// mulberry32: the same seed always gives the same scene, so two rounds measure the same thing.
const rng = (seed: number) => () => {
	seed |= 0; seed = seed + 0x6D2B79F5 | 0;
	let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
	t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
	return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// Outlines rounded to 0.01 px: the app saves full floats, which made the 5 000-stroke file pass the 50 MB open limit.
const round = (pts: { x: number; y: number }[]) => pts.map(p => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }));

// A pen-like spine: 60–150 points, ~4 px apart, curvature that drifts smoothly.
const spine = (r: () => number, halfW: number, halfH: number) => {
	const n = 60 + Math.floor(r() * 91);
	let x = (r() * 2 - 1) * halfW, y = (r() * 2 - 1) * halfH;
	let a = r() * Math.PI * 2, turn = (r() - 0.5) * 0.08;
	const step = 3 + r() * 2.5;
	const pts: { x: number; y: number }[] = [];
	for (let i = 0; i < n; i++) {
		pts.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
		turn += (r() - 0.5) * 0.03;
		turn = Math.max(-0.12, Math.min(0.12, turn));
		a += turn;
		x += Math.cos(a) * step; y += Math.sin(a) * step;
	}
	return pts;
};

export function buildScene(strokes: number, layers: number, seed = 1) {
	const r = rng(seed * 7919 + strokes * 31 + layers);
	const shapes = [];
	for (let i = 0; i < strokes; i++) {
		const layer = Math.floor(i * layers / strokes);
		const original = spine(r, 620, 420);
		const tapered = r() < 0.7;
		const thickness = Math.round(6 + r() * 34);
		shapes.push({
			id: `stress-${i}`,
			points: round(tapered ? generateTaperedStroke(original, thickness) : generateUniformStroke(original, thickness)),
			color: INKS[Math.floor(r() * INKS.length)],
			zIndex: layer * -BASE_DEPTH_STEP,
			isEraser: false,
			isDrawInside: false,
			isDrawBehind: false,
			originalPoints: original,
			brushThickness: thickness,
			brushMode: tapered ? 'tapered' : 'uniform',
		});
	}
	const name = `stress-${strokes}-${layers}L`;
	const now = new Date().toISOString();
	return {
		name,
		data: {
			meta: { formatVersion: 2, projectId: `stress-${strokes}-${layers}`, version: 0, createdAt: now, updatedAt: null, derivedFrom: null, shapeCount: strokes, thumbnail: null },
			shapes,
			palette: PALETTE_PRIMARY.map(c => c.hex),
			totalLayers: layers,
			isDarkMode: false,
			hiddenLayers: [],
			locked3DLayers: [],
			projectName: name,
			tool: 'brush',
			brushMode: 'tapered',
			activePaletteId: 'primary',
		},
	};
}
