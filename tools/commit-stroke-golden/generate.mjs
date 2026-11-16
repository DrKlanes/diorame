// Freezes the reference of the «pointer samples → shape» test (refactor phase 6, v3.26.47).
//
// Runs the shape-building block of handlePointerUp EXACTLY as it is written in StrataCanvas.tsx:
// it cuts the source text of `if (currentPointsRef.current.length > 0) { … }` out of the file,
// wraps it in a function with stand-ins for what it closes over (state, currentPointsRef,
// dispatch, getActiveZ, analytics, a counting crypto.randomUUID), compiles it with esbuild and
// records the action each case dispatches. No copy of the logic is involved, so the reference
// is the output of the code BEFORE canvas/commitStroke.ts existed.
//
//   node tools/commit-stroke-golden/generate.mjs [--rev <git rev>] [--check]
//
// --rev    reads StrataCanvas.tsx from that commit (git show) instead of the working tree.
// --check  compares with tests/fixtures/commitStroke.golden.json instead of writing it; exit 1 on
//          any difference. Only meaningful while StrataCanvas.tsx still holds the inline block.
//
// Writing the fixture CHANGES THE REFERENCE of tests/commitStroke.test.ts: never to turn it green.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const REL = 'src/components/strata/StrataCanvas.tsx';
const GOLDEN = join(ROOT, 'tests', 'fixtures', 'commitStroke.golden.json');
const args = process.argv.slice(2);
const rev = args.includes('--rev') ? args[args.indexOf('--rev') + 1] : null;
const check = args.includes('--check');

const source = rev
	? execFileSync('git', ['show', `${rev}:${REL}`], { cwd: ROOT, encoding: 'utf8' })
	: readFileSync(join(ROOT, REL), 'utf8');
const blobSha = execFileSync('git', ['hash-object', '--stdin'], { cwd: ROOT, input: source, encoding: 'utf8' }).trim();

// ── Cut the block out of handlePointerUp ──────────────────────────────────────────────────────
const handler = source.indexOf('const handlePointerUp');
const OPEN = 'if (currentPointsRef.current.length > 0) {';
const start = source.indexOf(OPEN, handler);
if (handler < 0 || start < 0) throw new Error('Inline block not found: StrataCanvas.tsx no longer holds it (already extracted?)');
let depth = 0, end = -1;
for (let i = start + OPEN.length - 1; i < source.length; i++) {
	if (source[i] === '{') depth++;
	else if (source[i] === '}' && --depth === 0) { end = i + 1; break; }
}
const block = source.slice(start, end);
if (!block.includes('analytics.strokeEnded(state.tool);')) throw new Error('Block boundaries look wrong');
if (block.includes('buildStrokeShapes(')) throw new Error('This StrataCanvas.tsx calls canvas/commitStroke.ts (v3.26.48+): the inline block is gone. Use --rev v3.26.47 to re-run the code from before the cut');

const entry = `
import { generateStrokeForMode } from ${JSON.stringify(join(ROOT, 'src/utils/strokeGenerators.ts'))};
import { MIN_TOUCH_STROKE_POINTS } from ${JSON.stringify(join(ROOT, 'src/constants/renderConstants.ts'))};
import { BASE_DEPTH_STEP } from ${JSON.stringify(join(ROOT, 'src/constants/layers.ts'))};
import { STROKE_CASES } from ${JSON.stringify(join(ROOT, 'tests/helpers/commitStrokeCases.ts'))};
type Point = { x: number; y: number; pressure?: number };
type Shape = any;
function runCase(state: any, points: Point[]) {
	let n = 0;
	const crypto = { randomUUID: () => 'id-' + (++n) };
	const currentPointsRef = { current: points };
	const drawingPointerTypeRef = { current: 'pen' as string | null };
	const out: any[] = [];
	const dispatch = (a: any) => { out.push(a); };
	const setIsDrawing = (_v: boolean) => {};
	const analytics = { strokeEnded: (_t: string) => {} };
	const getActiveZ = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;
	${block}
	return out;
}
export const results = Object.fromEntries(STROKE_CASES.map(k => [k.name, runCase(k.state, k.points)]));
`;

const dir = mkdtempSync(join(tmpdir(), 'commit-stroke-golden-'));
try {
	const entryFile = join(dir, 'entry.ts');
	writeFileSync(entryFile, entry);
	const outFile = join(dir, 'out.mjs');
	await build({ entryPoints: [entryFile], bundle: true, platform: 'node', format: 'esm', outfile: outFile, logLevel: 'error' });
	const { results } = await import(pathToFileURL(outFile).href);
	for (const [name, actions] of Object.entries(results)) {
		if (actions.length !== 1) throw new Error(`${name}: expected one dispatch, got ${actions.length}`);
	}
	const cases = Object.fromEntries(Object.entries(results).map(([k, a]) => [k, a[0]]));
	if (check) {
		if (!existsSync(GOLDEN)) throw new Error('No reference to check against');
		const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
		const now = JSON.parse(JSON.stringify(cases));
		const bad = Object.keys({ ...golden.cases, ...now }).filter(k => JSON.stringify(golden.cases[k]) !== JSON.stringify(now[k]));
		console.log(bad.length ? `DIFFERENT: ${bad.join(', ')}` : `identical: ${Object.keys(now).length} cases (StrataCanvas.tsx blob ${blobSha})`);
		process.exitCode = bad.length ? 1 : 0;
	} else {
		const provenance = `Output of the inline block of handlePointerUp in ${REL} (git blob ${blobSha}${rev ? `, rev ${rev}` : ''}), run by tools/commit-stroke-golden/generate.mjs. Frozen before canvas/commitStroke.ts existed: never regenerate from the extracted module.`;
		writeFileSync(GOLDEN, JSON.stringify({ _provenance: provenance, cases }) + '\n');
		console.log(`wrote ${Object.keys(cases).length} cases → ${GOLDEN}`);
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}
