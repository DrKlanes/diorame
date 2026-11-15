/// <reference types="node" />
// Smoke test: every one of the reducer's actions runs on a state with real content without
// throwing, and leaves a state that still looks like one. It asserts no behaviour: that is
// what the characterization files are for.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CATALOGUE } from './helpers/actions';
import { richState, run } from './helpers/fixtures';
import type { AppState } from '../src/types/strataTypes';

/** The action names the reducer handles, read from wherever `appReducer` lives (it will move in the refactor). */
const reducerCases = (): string[] => {
	const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
		e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
	const src = walk(join(__dirname, '..', 'src')).map(f => readFileSync(f, 'utf8')).find(t => /export function appReducer\(/.test(t));
	if (!src) throw new Error('appReducer not found under src/');
	return [...new Set([...src.matchAll(/^\s*case '([A-Z][A-Z0-9_]*)'/gm)].map(m => m[1]))].sort();
};

const looksLikeAState = (s: AppState) => {
	expect(Array.isArray(s.shapes)).toBe(true);
	expect(s.totalLayers).toBeGreaterThanOrEqual(1);
	expect(s.currentLayerIndex).toBeGreaterThanOrEqual(0);
	expect(s.currentLayerIndex).toBeLessThan(s.totalLayers);
	expect(s.history.length).toBeGreaterThanOrEqual(1);
	expect(s.historyIndex).toBeGreaterThanOrEqual(0);
	expect(s.historyIndex).toBeLessThan(s.history.length);
	expect(Number.isFinite(s.currentBrushThickness)).toBe(true);
	for (const shape of s.shapes) for (const p of shape.points) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
};

describe('reducer · humo', () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T12:00:00.000Z')); });
	afterEach(() => { vi.useRealTimers(); });

	it('el catálogo cubre exactamente las acciones del reducer (89)', () => {
		const cases = reducerCases();
		const covered = [...new Set(CATALOGUE.map(e => e.action.type))].sort();
		expect(covered).toEqual(cases);
		expect(cases).toHaveLength(89);
	});

	it.each(CATALOGUE.map(e => [e.label, e] as const))('%s corre sobre un estado con contenido', (_label, entry) => {
		const before = run(richState(1), ...(entry.setup ?? []));
		const after = run(before, entry.action);
		looksLikeAState(after);
	});

	it('las 89 encadenadas, una tras otra, no lanzan', () => {
		let s = richState(1);
		for (const entry of CATALOGUE) s = run(s, ...(entry.setup ?? []), entry.action);
		looksLikeAState(s);
	});

	it('una acción desconocida devuelve el mismo estado', () => {
		const s = richState(1);
		expect(run(s, { type: 'NO_EXISTE' } as never)).toBe(s);
	});
});
