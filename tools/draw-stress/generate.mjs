// Writes the stress scenes as .dior files: node tools/draw-stress/generate.mjs [outDir]
// scene.ts imports app modules (TypeScript), so it is bundled in memory with esbuild (already installed with Vite).
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.argv[2] ?? join(here, 'out'));
const tmp = join(outDir, '.scene.mjs');

const COUNTS = [500, 1000, 2000, 3500, 5000];
const LAYERS = [1, 6];

mkdirSync(outDir, { recursive: true });
await build({ entryPoints: [join(here, 'scene.ts')], bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'warning' });
const { buildScene } = await import(pathToFileURL(tmp).href);

for (const layers of LAYERS) {
	for (const n of COUNTS) {
		const { name, data } = buildScene(n, layers);
		const file = join(outDir, `${name}.dior`);
		writeFileSync(file, JSON.stringify(data));
		const pts = data.shapes.reduce((a, s) => a + s.points.length, 0);
		console.log(`${name}.dior  ${(statSync(file).size / 1048576).toFixed(1)} MB  ${n} strokes  ${pts} outline points`);
	}
}
console.log(`\n→ ${outDir}`);
