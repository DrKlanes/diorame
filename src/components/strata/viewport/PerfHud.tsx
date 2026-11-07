import React, { useEffect, useRef, useState } from 'react';
import { useStrata } from '../StrataContext';
import { AUTOSAVE_KEY } from '../../../hooks/useAutoSave';

/**
 * ?perf=1 only (tools/draw-stress/README.md): frame cadence and autosave cost, readable on the iPad.
 *
 * Its own requestAnimationFrame, never the StrataCanvas loop: the render runs inside the page's rAF
 * callbacks, so a slow renderFrame stretches the interval this loop sees. Window = last 5 s.
 * Gaps > 50 ms are counted since the last reset (an autosave clone or a GC pause shows up there).
 * The autosave clone is timed by wrapping IDBObjectStore.put, whose structured clone is synchronous.
 */
export const PERF_ENABLED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('perf') === '1';

const WINDOW_MS = 5000;
const GAP_MS = 50;
const HIDDEN_MS = 1000; // a longer interval is a hidden tab or a dialog, not a slow frame

const autosave = { last: null as number | null, max: 0, count: 0 };
let putWrapped = false;

function wrapPut(shapeCount: () => number) {
	if (putWrapped || typeof IDBObjectStore === 'undefined') return;
	putWrapped = true;
	const put = IDBObjectStore.prototype.put;
	IDBObjectStore.prototype.put = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
		const t0 = performance.now();
		const req = put.call(this, value, key);
		if (key === AUTOSAVE_KEY) {
			const ms = performance.now() - t0;
			autosave.last = ms; autosave.max = Math.max(autosave.max, ms); autosave.count++;
			console.log(`[perf] autosave clone ${ms.toFixed(1)} ms (${shapeCount()} shapes)`);
		}
		return req;
	};
}

type Stats = { fps: number | null; p95: number | null; gaps: number; worst: number };

export function PerfHud() {
	const { state } = useStrata();
	const shapesRef = useRef(state.shapes.length);
	shapesRef.current = state.shapes.length;
	const [stats, setStats] = useState<Stats>({ fps: null, p95: null, gaps: 0, worst: 0 });
	const samples = useRef<{ t: number; dt: number }[]>([]);
	const gaps = useRef({ count: 0, worst: 0 });

	useEffect(() => {
		wrapPut(() => shapesRef.current);
		let last = 0, id = 0, lastUi = 0;
		const tick = (t: number) => {
			if (last) {
				const dt = t - last;
				if (dt < HIDDEN_MS) {
					samples.current.push({ t, dt });
					if (dt > GAP_MS) { gaps.current.count++; gaps.current.worst = Math.max(gaps.current.worst, dt); }
				}
			}
			last = t;
			const s = samples.current;
			while (s.length && s[0].t < t - WINDOW_MS) s.shift();
			if (t - lastUi > 500 && s.length) {
				lastUi = t;
				const mean = s.reduce((a, x) => a + x.dt, 0) / s.length;
				const sorted = s.map(x => x.dt).sort((a, b) => a - b);
				setStats({ fps: 1000 / mean, p95: sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))], gaps: gaps.current.count, worst: gaps.current.worst });
			}
			id = requestAnimationFrame(tick);
		};
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	}, []);

	const reset = () => {
		samples.current = [];
		gaps.current = { count: 0, worst: 0 };
		autosave.last = null; autosave.max = 0; autosave.count = 0;
		setStats({ fps: null, p95: null, gaps: 0, worst: 0 });
	};

	const f = (v: number | null, d = 1) => v === null ? '–' : v.toFixed(d);

	return (
		<div style={{
			position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 64px)', left: 8, zIndex: 900,
			background: 'rgba(0,0,0,.78)', color: '#fff', font: '12px/1.45 ui-monospace, Menlo, monospace',
			padding: '8px 10px', borderRadius: 8, pointerEvents: 'auto', minWidth: 190,
		}}>
			<div>fps {f(stats.fps)} · p95 {f(stats.p95)} ms</div>
			<div>gaps &gt;{GAP_MS} ms: {stats.gaps} (peor {f(stats.worst || null, 0)} ms)</div>
			<div>formas {state.shapes.length} · {state.mode === 'drawing' ? 'DRAW' : 'CINEMA'}</div>
			<div>autosave {f(autosave.last)} ms (máx {f(autosave.max || null)}, n {autosave.count})</div>
			<button onClick={reset} style={{
				marginTop: 6, minHeight: 44, minWidth: 88, padding: '0 14px', border: '1px solid rgba(255,255,255,.5)',
				borderRadius: 8, background: 'transparent', color: '#fff', font: 'inherit',
			}}>Reset</button>
		</div>
	);
}
