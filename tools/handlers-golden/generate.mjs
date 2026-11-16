// Freezes the reference of tests/handlers.characterization.test.ts (handlers sprint, v3.26.53).
//
// Runs the pointer / touch handlers of StrataCanvas.tsx as they are written in the file (see
// harness.mjs: literal source text, real pure modules, real reducer) through the scripted gestures
// of tests/helpers/handlerScenarios.ts and records, per event, what was dispatched and which refs
// changed. The reference was written with the handlers of v3.26.52, before any of their logic
// moved to a module.
//
//   node tools/handlers-golden/generate.mjs [--rev <git rev>] [--check]
//
// --rev    reads StrataCanvas.tsx from that commit (git show) instead of the working tree. The
//          modules it imports are still the working tree's: a rev whose imports no longer exist
//          cannot be run this way.
// --check  compares with tests/fixtures/handlers.golden.json instead of writing it; exit 1 on any
//          difference.
//
// Writing the fixture CHANGES THE REFERENCE of the test: never to turn it green. It is only
// legitimate in a commit that does not touch the handlers (new scenarios), and then the scenarios
// that already existed must come out identical: check with `git diff --stat` that only lines were
// added, or run --check on the previous commit's scenarios first.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, REL, runHandlers } from './harness.mjs';

const GOLDEN = join(ROOT, 'tests', 'fixtures', 'handlers.golden.json');
const args = process.argv.slice(2);
const rev = args.includes('--rev') ? args[args.indexOf('--rev') + 1] : null;
const check = args.includes('--check');

const source = rev
	? execFileSync('git', ['show', `${rev}:${REL}`], { cwd: ROOT, encoding: 'utf8' })
	: readFileSync(join(ROOT, REL), 'utf8');
const blobSha = execFileSync('git', ['hash-object', '--stdin'], { cwd: ROOT, input: source, encoding: 'utf8' }).trim();

const cases = await runHandlers(source);
const names = Object.keys(cases);

if (check) {
	if (!existsSync(GOLDEN)) throw new Error('No reference to check against');
	const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
	const bad = Object.keys({ ...golden.cases, ...cases }).filter(k => JSON.stringify(golden.cases[k]) !== JSON.stringify(cases[k]));
	console.log(bad.length ? `DIFFERENT (${bad.length}): ${bad.join(', ')}` : `identical: ${names.length} scenarios (StrataCanvas.tsx blob ${blobSha}${rev ? `, rev ${rev}` : ''})`);
	process.exitCode = bad.length ? 1 : 0;
} else {
	const provenance = `Trace of the pointer/touch handlers of ${REL} (git blob ${blobSha}${rev ? `, rev ${rev}` : ''}), run by tools/handlers-golden/generate.mjs. Frozen with the handlers of v3.26.52, before any of their logic moved to a module: never regenerate to turn the test green.`;
	writeFileSync(GOLDEN, JSON.stringify({ _provenance: provenance, cases }, null, '\t') + '\n');
	console.log(`wrote ${names.length} scenarios → ${GOLDEN}`);
}
