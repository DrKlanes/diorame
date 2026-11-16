// Runs the pointer / touch handlers of StrataCanvas.tsx EXACTLY as they are written in the file
// (handlers sprint, v3.26.53). Shared by generate.mjs (which freezes the reference) and by
// tests/handlers.characterization.test.ts (which compares the working tree against it).
//
// It cuts the literal source text of the handler region out of StrataCanvas.tsx — from the
// `// --- Event Handlers ---` comment to the end of `resetGestureState`, plus `MAX_PAN`,
// `setIsDrawing` and `getActiveZ` — and wraps it in a function whose parameters stand in for what the component
// closes over (state, dispatch, the refs, the two cursor setters). The file's own import lines are
// kept, with their paths made absolute: the pure modules the handlers call are the REAL ones, so
// the same harness runs the code from before a cut (everything inline) and after it (handlers
// calling the extracted module). Only React, sonner, analytics, StrataContext and
// getLayerBoundingBox (pixel scan on a canvas) are replaced.
// No copy of the handler logic lives here.
//
// Since v3.26.60 the region starts at the section comment instead of at `const handleTouchStart`
// (same text on every revision so far: nothing sits between the two), and an esbuild plugin gives
// the same stand-ins to any OTHER module of the bundle (stubs.ts). Together they let the harness
// follow a handler whose body moved to a module: the region then holds the call that builds it,
// and the module imports sonner / analytics / transformUtils by itself.
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REL = 'src/components/strata/StrataCanvas.tsx';
const COMPONENT_DIR = join(ROOT, 'src', 'components', 'strata');

/** What the handler region closes over. A name missing here fails the bundle (undeclared identifier → ReferenceError at run time is avoided: esbuild keeps it as a global, so the run throws loudly). */
const ENV_NAMES = [
	'state', 'dispatch', 't',
	'canvasRef', 'containerRef', 'canvasRectRef', 'stateRef', 'cameraRef',
	'currentPointsRef', 'isDrawingRef', 'drawingPointerTypeRef', 'pinchEndTimestampRef', 'drawingPressureRef',
	'gestureRef', 'orbitRef', 'moveRef', 'lastClickTimeRef', 'lastClickPosRef', 'poiMarkerSetAtRef', 'drawnFrameRef',
	'organicPhaseRef', 'transformRef', 'transformHandlesRef', 'isPanningRef', 'isSpaceDownRef', 'spacePanEngagedRef',
	'hoverGizmoModeRef', 'activePointerIdRef', 'pendingDeselectRef',
	'setCursorOverride', 'setGizmoCursor',
];
const HANDLER_NAMES = [
	'handleTouchStart', 'handleTouchMove', 'handleTouchEnd', 'handleTouchCancel',
	'handlePointerDown', 'handlePointerMove', 'handlePointerUp', 'resetGestureState',
];

const braceBlock = (source, from) => {
	let depth = 0;
	for (let i = source.indexOf('{', from); i < source.length; i++) {
		if (source[i] === '{') depth++;
		else if (source[i] === '}' && --depth === 0) return i + 1;
	}
	throw new Error('Unbalanced braces');
};

/** The literal text the harness runs, cut out of a StrataCanvas.tsx. */
export const cutHandlers = (source) => {
	const line = (re, what) => {
		const m = source.match(re);
		if (!m) throw new Error(`${what} not found in StrataCanvas.tsx`);
		return m[0];
	};
	const maxPan = line(/^\tconst MAX_PAN = .*;$/m, 'MAX_PAN');
	const getActiveZ = line(/^\tconst getActiveZ = .*;$/m, 'getActiveZ');
	const sid = source.indexOf('\tconst setIsDrawing = ');
	if (sid < 0) throw new Error('setIsDrawing not found');
	const setIsDrawing = source.slice(sid, braceBlock(source, sid)) + ';';
	const start = source.indexOf('\t// --- Event Handlers ---');
	const end = source.indexOf('\t// Recover orphaned gesture state');
	if (start < 0 || end < 0 || end < start) throw new Error('Handler region not found: StrataCanvas.tsx no longer holds `// --- Event Handlers ---` … `// Recover orphaned gesture state`');
	const region = source.slice(start, end);
	for (const name of HANDLER_NAMES) {
		// Defined on its own (`const name = …`) or taken out of what built it (`const { …, name, … } = …`).
		if (!new RegExp(`\\tconst (${name} = |\\{[^}]*\\b${name}\\b[^}]*\\} = )`).test(region)) throw new Error(`${name} is not defined in the handler region`);
	}
	return { maxPan, getActiveZ, setIsDrawing, region };
};

/** The file's imports, rewritten so the cut text resolves the same modules from a temp folder. */
const rewriteImports = (source) => {
	const out = [];
	for (const m of source.matchAll(/^import\s+(.+?)\s+from\s+['"](.+?)['"];?$/gm)) {
		const [, clause, spec] = m;
		if (spec === 'react') { out.push('const useCallback = (f: any, _deps?: any) => f;'); continue; }
		if (spec === 'sonner@2.0.3') { out.push('const toast = __stubs.toast;'); continue; }
		if (spec.endsWith('/analytics/analytics')) { out.push('const analytics = __stubs.analytics;'); continue; }
		// The real one rasterises the layer on a canvas and scans its pixels: no canvas in Node.
		// Its result is an INPUT of the Move pointerdown (box centre), so a geometric box stands in.
		if (spec === './canvas/transformUtils') { out.push('const getLayerBoundingBox = __stubs.getLayerBoundingBox;'); continue; }
		if (spec === './StrataContext') {
			// The Provider pulls React in. The handlers only read the constant, which lives here.
			if (!/^\{\s*useStrata\s*,\s*BASE_DEPTH_STEP\s*\}$/.test(clause)) throw new Error(`Unexpected import from StrataContext: ${clause}`);
			out.push(`import { BASE_DEPTH_STEP } from ${JSON.stringify(join(ROOT, 'src/constants/layers.ts'))};`);
			continue;
		}
		if (!spec.startsWith('.')) continue; // figma:asset/… — never used by a handler; a use would fail the bundle
		out.push(`import ${clause} from ${JSON.stringify(join(COMPONENT_DIR, spec))};`);
	}
	return out.join('\n');
};

/** sonner, the analytics facade and canvas/transformUtils.ts resolve to stubs.ts wherever they are imported from. */
const standIns = {
	name: 'handlers-golden-stand-ins',
	setup(b) {
		b.onResolve({ filter: /^sonner@2\.0\.3$|[\\/]analytics[\\/]analytics$|[\\/]transformUtils$/ }, () => ({ path: join(ROOT, 'tools', 'handlers-golden', 'stubs.ts') }));
	},
};

const entrySource = (source) => {
	const cut = cutHandlers(source);
	return `
import { runScenarios, __stubs } from ${JSON.stringify(join(ROOT, 'tools/handlers-golden/runtime.ts'))};
import { HANDLER_SCENARIOS } from ${JSON.stringify(join(ROOT, 'tests/helpers/handlerScenarios.ts'))};
${rewriteImports(source)}
const makeHandlers = (env: any) => {
	const { ${ENV_NAMES.join(', ')} } = env;
${cut.maxPan}
${cut.setIsDrawing}
${cut.getActiveZ}
${cut.region}
	return { ${HANDLER_NAMES.join(', ')} };
};
export const results = runScenarios(makeHandlers, HANDLER_SCENARIOS);
`;
};

/**
 * Bundles the cut handlers with the scenarios and runs them. Returns { [scenario name]: trace },
 * already JSON-normalised (what a fixture read back from disk looks like).
 */
export const runHandlers = async (source) => {
	const dir = mkdtempSync(join(tmpdir(), 'handlers-golden-'));
	try {
		const entryFile = join(dir, 'entry.ts');
		writeFileSync(entryFile, entrySource(source));
		const outFile = join(dir, 'out.mjs');
		await build({ entryPoints: [entryFile], bundle: true, platform: 'node', format: 'esm', outfile: outFile, logLevel: 'error', plugins: [standIns] });
		// @vite-ignore: under Vitest on Windows, Vite's analysis of a non-literal import() hung the load of this module (v3.26.67).
		const { results } = await import(/* @vite-ignore */ pathToFileURL(outFile).href);
		return JSON.parse(JSON.stringify(results));
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
};
