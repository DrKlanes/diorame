/// <reference types="node" />
// Golden tests of the pure stroke generators (utils/strokeGenerators.ts): 6 spines × tapered /
// uniform / ink × thickness 1 / 20 / 70, compared point by point with a stored reference.
//
// What they protect:
//   · Ink's `_inkSmoothPass` ×3, weight 0.3 (PROTECTED, CLAUDE.md): it is not exported, so it is
//     guarded through generateInkStroke's output. Any change of weight or pass count moves every
//     interior point. Checked when this suite was written: 0.3 → 0.31 makes the Ink goldens fail.
//   · Ink's curved densify (v3.26.4): the fast stroke follows the curve, the slow one is untouched.
//   · Tapered and Uniform outlines, which the reducer regenerates on every thickness / mode change.
//
// Tolerance 1e-9 px: Math.hypot / sin / cos are not guaranteed bit-identical across engines or
// versions. The references were generated in Node 24 (V8).
//
// Regenerating strokes.golden.json CHANGES THE REFERENCE: only as a deliberate decision, never to
// make a red test green.   DIORAME_WRITE_GOLDEN=1 npx vitest run tests/strokeGenerators.golden.test.ts
// ink-slow-pre-3.26.4.json is frozen (generated with the generator of commit 8adfc50^): never regenerate.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { generateInkStroke, generateStrokeForMode, generateTaperedStroke, generateUniformStroke } from '../src/utils/strokeGenerators';
import { SPINES, MODES, THICKNESSES, fastArc, slowLine, type P } from './helpers/fixtures';
import type { BrushMode } from '../src/types/strataTypes';

const TOLERANCE = 1e-9;
const GOLDEN = join(__dirname, 'fixtures', 'strokes.golden.json');
const FROZEN = join(__dirname, 'fixtures', 'ink-slow-pre-3.26.4.json');

const flat = (pts: readonly P[]): number[] => pts.flatMap(p => [p.x, p.y]);
const CASES = Object.keys(SPINES).flatMap(spine => MODES.flatMap(mode => THICKNESSES.map(t => [`${mode}/${spine}/${t}`, mode, spine as keyof typeof SPINES, t] as const)));
const generate = (mode: BrushMode, spine: keyof typeof SPINES, t: number) => flat(generateStrokeForMode(mode, SPINES[spine](), t));

if (process.env.DIORAME_WRITE_GOLDEN === '1') {
	writeFileSync(GOLDEN, JSON.stringify(Object.fromEntries(CASES.map(([key, mode, spine, t]) => [key, generate(mode, spine, t)]))));
}
const golden: Record<string, number[]> = existsSync(GOLDEN) ? JSON.parse(readFileSync(GOLDEN, 'utf8')) : {};
const frozen: { _provenance: string; outputs: Record<string, number[]> } = JSON.parse(readFileSync(FROZEN, 'utf8'));

/** Same number of coordinates, each within the tolerance. Reports the worst one. */
const expectClose = (actual: number[], expected: number[] | undefined) => {
	expect(expected, 'no hay referencia guardada para este caso').toBeDefined();
	expect(actual.length).toBe(expected!.length);
	let worst = 0;
	for (let i = 0; i < actual.length; i++) worst = Math.max(worst, Math.abs(actual[i] - expected![i]));
	expect(worst).toBeLessThanOrEqual(TOLERANCE);
};

describe('strokeGenerators · golden', () => {
	it('la referencia guarda exactamente los 54 casos (6 muestras × 3 modos × 3 grosores)', () => {
		expect(Object.keys(golden).sort()).toEqual(CASES.map(c => c[0]).sort());
		expect(CASES).toHaveLength(54);
	});

	describe('tapered', () => {
		it.each(CASES.filter(c => c[1] === 'tapered'))('%s', (key, mode, spine, t) => expectClose(generate(mode, spine, t), golden[key]));
	});
	describe('uniform', () => {
		it.each(CASES.filter(c => c[1] === 'uniform'))('%s', (key, mode, spine, t) => expectClose(generate(mode, spine, t), golden[key]));
	});
	// These are the tests that guard _inkSmoothPass (×3, weight 0.3) and the densify.
	describe('ink — protege _inkSmoothPass ×3 (peso 0,3) y el densificado curvo', () => {
		it.each(CASES.filter(c => c[1] === 'ink'))('%s', (key, mode, spine, t) => expectClose(generate(mode, spine, t), golden[key]));
	});
});

describe('strokeGenerators · Ink, trazo lento intacto desde antes de v3.26.4', () => {
	// A slow stroke has no span longer than segLen, so the curved densify inserts nothing: the
	// output must be what the generator gave BEFORE v3.26.4 (REFERENCE.md §4, «byte-identical»).
	it.each(THICKNESSES.map(t => [t] as const))('grosor %i: igual que el generador del commit anterior a 8adfc50', (t) => {
		expectClose(flat(generateInkStroke(slowLine(), t)), frozen.outputs[`ink/slowLine/${t}`]);
	});
	it('la referencia congelada declara de dónde salió', () => {
		expect(frozen._provenance).toContain('8adfc50');
	});
});

describe('strokeGenerators · Ink, densificado curvo (v3.26.4)', () => {
	// Centre line of the outline = midpoints of the left/right pairs. Layout of the output:
	// 7 cap points · left side · 7 cap points · right side reversed.
	const centreLine = (o: readonly P[]): P[] => {
		const n = (o.length - 14) / 2;
		return Array.from({ length: n }, (_, i) => ({ x: (o[7 + i].x + o[o.length - 1 - i].x) / 2, y: (o[7 + i].y + o[o.length - 1 - i].y) / 2 }));
	};

	it('curva rápida sin facetas: el interior sigue el arco a menos de 1 px (por la cuerda serían 4,89)', () => {
		// 6 samples on a 100 px arc, thickness 1 (wobble of 0.15 px, so the centre line is the spine).
		// With the chord densify of before v3.26.4 the middle of each span sat 4.96 px inside the
		// arc (measured with the old generator); with the centripetal Catmull-Rom, 0.52 px.
		// First and last spans left out: their missing neighbour is a reflection, flatter by design.
		const step = Math.PI / 5;
		const interior = centreLine(generateInkStroke(fastArc(), 1)).filter(p => {
			const a = Math.atan2(p.y, p.x);
			return a > step && a < Math.PI - step;
		});
		expect(interior.length).toBeGreaterThan(100);
		const worst = Math.max(...interior.map(p => Math.abs(Math.hypot(p.x, p.y) - 100)));
		const chordSagitta = 100 * (1 - Math.cos(step / 2));
		expect(chordSagitta).toBeGreaterThan(4.8);
		expect(worst).toBeLessThan(1);
	});

	it.each(THICKNESSES.map(t => [t] as const))('número de puntos, grosor %i: ceil(d / segLen) − 1 por tramo largo, más 14 de remates', (t) => {
		const segLen = Math.max(t / 5, 1.5);
		for (const spine of [slowLine(), fastArc()]) {
			let spinePoints = spine.length;
			for (let i = 0; i < spine.length - 1; i++) {
				const d = Math.hypot(spine[i + 1].x - spine[i].x, spine[i + 1].y - spine[i].y);
				if (d > segLen) spinePoints += Math.ceil(d / segLen) - 1;
			}
			expect(generateInkStroke(spine, t)).toHaveLength(2 * spinePoints + 14);
		}
	});

	it('un trazo lento no recibe ni un punto de más: 200 muestras → 414 puntos', () => {
		for (const t of THICKNESSES) expect(generateInkStroke(slowLine(), t)).toHaveLength(414);
	});
});

describe('strokeGenerators · propiedades', () => {
	it.each(CASES)('%s: determinista y sin tocar la entrada', (_key, mode, spine) => {
		const input = SPINES[spine]().map(p => Object.freeze(p));
		const copy = JSON.stringify(input);
		const a = generateStrokeForMode(mode, input, 20);
		const b = generateStrokeForMode(mode, input, 20);
		expect(a).toEqual(b);
		expect(JSON.stringify(input)).toBe(copy);
	});

	it('generateStrokeForMode reparte a los tres generadores', () => {
		const spine = fastArc();
		expect(generateStrokeForMode('tapered', spine, 20)).toEqual(generateTaperedStroke(spine, 20));
		expect(generateStrokeForMode('uniform', spine, 20)).toEqual(generateUniformStroke(spine, 20));
		expect(generateStrokeForMode('ink', spine, 20)).toEqual(generateInkStroke(spine, 20));
	});

	it('Ink con un solo punto devuelve la entrada tal cual', () => {
		const one = [{ x: 5, y: 5 }];
		expect(generateInkStroke(one, 20)).toBe(one);
	});

	it('el ancho de Ink no depende de la presión ni de la velocidad: mismos puntos con presión → misma salida', () => {
		const plain = fastArc();
		const withPressure = plain.map((p, i) => ({ ...p, pressure: (i % 3) / 3 }));
		expect(generateInkStroke(withPressure, 20)).toEqual(generateInkStroke(plain, 20));
	});
});
