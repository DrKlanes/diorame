// Super Riso — automatic measurement ("Medir" button). Runs the C2a sequence without reloading
// (2 s warm-up discarded + 8 s measured each), then builds a compact plain-text report with the
// device facts, per row the CPU p50 of every stage plus where the wait lands, and a per-pass GPU
// profile. Only loaded behind ?superriso=1.
//
//   A bypass · B .75 pipe=1 (reference = D of C1c) · C .75 pipe=2 · D .75 best pipe + lossless ·
//   E .75 best pipe + preview · F 1.0 best pipe + preview · G .75 best pipe + hold 12 fps at full
//   level · P per-pass profile at .75 pipe=1, full level (informative). Upload at simulation size
//   in all but A. "Best pipe" = lowest frame p50 of B and C, chosen at run time.

import { APP_VERSION } from '../../../../constants/version';
import { cfg, DEFAULT_CFG, live, hooks, setCfg, type RuntimeCfg } from './runtimeConfig';
import { reset, snapshot, setStatus, setMeasuring, showResult } from './perfOverlay';
import { offscreenWebGL2Available } from './bridge';
import type { ProfileMode } from './passProfiler';

const WARMUP_MS = 2000;
const MEASURE_MS = 8000;
const PROFILE_FRAMES = 60;
const TOTAL = 8;

type Step = { id: string; label: string; patch: Partial<RuntimeCfg> };
const sim = { ...DEFAULT_CFG, simUpload: true };
type Counts = { pipe: number; sync: number; held: number };
type Row = { id: string; label: string; res: string; s: ReturnType<typeof snapshot>; patch: Partial<RuntimeCfg>; n: Counts };
type ProfileTable = { mode: ProfileMode; lines: string[] } | null;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const f = (v: number | null, d = 1) => v === null ? '–' : v.toFixed(d);
let running = false;

function gpuInfo(): { renderer: string; maxTex: string } {
	const info = hooks.engineInfo();
	let gl: WebGL2RenderingContext | null = info?.gl ?? null;
	let tmp: HTMLCanvasElement | null = null;
	if (!gl) { tmp = document.createElement('canvas'); gl = tmp.getContext('webgl2'); }
	if (!gl) return { renderer: 'sin WebGL2', maxTex: '–' };
	const dbg = gl.getExtension('WEBGL_debug_renderer_info');
	const renderer = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
	const maxTex = String(gl.getParameter(gl.MAX_TEXTURE_SIZE));
	if (tmp) gl.getExtension('WEBGL_lose_context')?.loseContext();
	return { renderer, maxTex };
}

/** Where the wait lands: the stage that holds it, or outside our stages (frame above baseline). */
function waitVerdict(r: Row, base: number | null): string {
	const s = r.s;
	const unexplained = (s.frameP50 !== null && base !== null && s.totalP50 !== null) ? s.frameP50 - base - s.totalP50 : null;
	const stages: [string, number | null][] = [
		[r.patch.pipe ? 'subida al inicio' : 'subida', s.uploadP50], ['aplanado', s.flatP50], ['mip', s.mipP50],
		['motor (CPU)', s.renderP50], [r.patch.pipe === 2 ? 'vuelta (al inicio, del frame anterior)' : 'vuelta', s.backP50],
	];
	const top = stages.filter(([, v]) => v !== null).sort((a, b) => b[1]! - a[1]!)[0];
	const parts: string[] = [];
	if (top && top[1]! >= 3) parts.push(`${top[0]} ${f(top[1])} ms`);
	if (unexplained !== null && unexplained >= 3) parts.push(`fuera de nuestras etapas ${f(unexplained)} ms`);
	return parts.length ? parts.join(' + ') : 'sin espera apreciable';
}

async function profile(mode: ProfileMode): Promise<ProfileTable> {
	const prof = hooks.profiler();
	if (!prof || (mode === 'timer' && !prof.timerAvailable)) return null;
	prof.setMode(mode);
	const t0 = performance.now();
	while (performance.now() - t0 < 8000) {
		const scan = prof.report().find(p => p.name === 'SCAN');
		if (scan && scan.n >= PROFILE_FRAMES) break;
		await sleep(100);
	}
	if (mode === 'timer') { await sleep(300); prof.poll(); }
	const rows = prof.report();
	prof.setMode('off');
	const ranked = [...rows].filter(r => r.p50 !== null).sort((a, b) => b.p50! - a.p50!).map(r => r.name);
	return {
		mode,
		lines: rows.map(r => `  ${r.name.padEnd(13)} ${`${r.info.w}×${r.info.h}`.padEnd(10)} att ${r.info.att}  p50 ${f(r.p50, 3).padStart(7)} ms  #${ranked.indexOf(r.name) + 1}  (n=${r.n})`),
	};
}

function buildReport(rows: Row[], timer: boolean, notes: string[], best: string, prof: ProfileTable[]): string {
	const g = gpuInfo();
	const base = rows.find(r => r.id === 'A')?.s.frameP50 ?? null;
	const info = hooks.engineInfo();
	const L: string[] = [];
	L.push(`SUPER RISO · medición automática C2a · Diorame ${APP_VERSION} · ${new Date().toISOString()}`);
	L.push(`UA: ${navigator.userAgent}`);
	L.push(`DPR ${window.devicePixelRatio} · canvas vivo ${live.canvasW}×${live.canvasH} · simulación (última) ${info ? `${info.width}×${info.height}` : '–'}`);
	L.push(`GPU: ${g.renderer} · MAX_TEXTURE_SIZE ${g.maxTex} · temporizador GPU: ${timer ? 'sí' : 'no'} · OffscreenCanvas+WebGL2: ${offscreenWebGL2Available ? 'sí' : 'no'}`);
	L.push(`Modo ${live.isDark ? 'oscuro' : 'claro'} · preset de cámara: ${live.preset || '–'} (velocidad ${live.speed || '–'})`);
	L.push(`Mejor canalización (menor frame p50 entre B y C), usada en D–G: ${best}`);
	for (const n of notes) L.push(`AVISO: ${n}`);
	L.push(`Cada fila: ${WARMUP_MS / 1000} s de calentamiento descartados + ${MEASURE_MS / 1000} s medidos. Etapas = CPU p50 en ms por frame.`);
	L.push('pipe1: resultado 1 frame tarde · pipe2: el motor tiene un frame entero de GPU, resultado 2 frames tarde.');
	L.push('lossless: variantes verificadas idénticas al laboratorio · preview: variantes con pérdida, solo en vivo.');
	L.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.');
	L.push('');
	L.push('cfg                  fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         pipe/sync/held');
	for (const r of rows) {
		const s = r.s;
		const c = (v: number | null) => f(v, 2).padStart(6);
		const unexplained = (!r.patch.bypass && s.frameP50 !== null && base !== null && s.totalP50 !== null) ? s.frameP50 - base - s.totalP50 : null;
		L.push(`${(r.id + ' ' + r.label).padEnd(20)}${f(s.fps).padStart(5)}  ${(f(s.frameP50) + '/' + f(s.frameP95)).padEnd(11)} |${c(s.totalP50)}${c(s.flatP50)} ${c(s.uploadP50)}${c(s.uploadP95)}${c(s.mipP50)}${c(s.renderP50)}${c(s.backP50)} |${c(unexplained)}    |${c(s.gpuP50)}  ${r.res.padEnd(10)}  ${r.n.pipe}/${r.n.sync}/${r.n.held}  (n=${s.samples})`);
	}
	L.push('');
	L.push('Dónde cae la espera:');
	for (const r of rows) if (!r.patch.bypass) L.push(`  ${r.id} ${r.label}: ${waitVerdict(r, base)}`);
	for (const p of prof) {
		if (!p) continue;
		L.push('');
		L.push(p.mode === 'sync'
			? `P · perfilado por pasada a .75, pipe1, nivel completo, ${PROFILE_FRAMES} frames, SINCRONIZACIÓN FORZADA (readPixels 1×1 tras cada pasada):`
			: `P · perfilado por pasada a .75, pipe1, nivel completo, ${PROFILE_FRAMES} frames, temporizador de GPU por pasada:`);
		if (p.mode === 'sync') L.push('  AVISO: la sincronización forzada infla el total; sirve para ORDENAR las pasadas, no para sumarlas.');
		L.push(...p.lines);
		L.push('  (LUT solo aparece si se recalcula: está cacheada mientras no cambien tintas ni papel.)');
	}
	return L.join('\n');
}

export async function runMeasurement(): Promise<void> {
	if (running) return;
	const notes: string[] = [];
	const idle = performance.now() - live.lastCallAt;
	if (live.lastCallAt === 0 || idle > 1000) {
		notes.push('no se está en CINEMA con FX activos (Super Riso no se llama): los números no son representativos');
	} else if (!(live.speed > 0)) {
		notes.push('la cámara no se mueve (velocidad 0): el frame cambia poco');
	}
	if (notes.length && !window.confirm(`${notes[0]}.\n\n¿Medir igualmente?`)) return;

	running = true;
	setMeasuring(true);
	const previous: RuntimeCfg = { ...cfg };
	const rows: Row[] = [];
	const prof: ProfileTable[] = [];
	let timer = false;
	let best = '–';
	let i = 0;
	const run = async (st: Step) => {
		setStatus(`Midiendo ${st.id} (${++i}/${TOTAL})…`);
		setCfg(st.patch);
		await sleep(WARMUP_MS);
		reset();
		const c0: Counts = { pipe: live.pipeFrames, sync: live.pipeSyncFrames, held: live.heldFrames };
		await sleep(MEASURE_MS);
		const s = snapshot(Infinity);
		if (s.gpuP50 !== null) timer = true;
		const n: Counts = { pipe: live.pipeFrames - c0.pipe, sync: live.pipeSyncFrames - c0.sync, held: live.heldFrames - c0.held };
		const info = hooks.engineInfo();
		const row = { id: st.id, label: st.label, res: st.patch.bypass || !info ? '–' : `${info.width}×${info.height}`, s, patch: st.patch, n };
		rows.push(row);
		return row;
	};
	try {
		await run({ id: 'A', label: 'bypass', patch: { ...DEFAULT_CFG, bypass: true } });
		const B = await run({ id: 'B', label: '.75 pipe1', patch: { ...sim, resScale: .75, pipe: 1 } });
		const C = await run({ id: 'C', label: '.75 pipe2', patch: { ...sim, resScale: .75, pipe: 2 } });
		const p: 1 | 2 = (C.s.frameP50 ?? 1e9) < (B.s.frameP50 ?? 1e9) ? 2 : 1;
		best = `pipe${p} (${p === 2 ? 'C' : 'B'}: frame p50 ${f(p === 2 ? C.s.frameP50 : B.s.frameP50)} ms frente a ${f(p === 2 ? B.s.frameP50 : C.s.frameP50)})`;
		await run({ id: 'D', label: `.75 pipe${p} lossless`, patch: { ...sim, resScale: .75, pipe: p, lossless: true } });
		await run({ id: 'E', label: `.75 pipe${p} preview`, patch: { ...sim, resScale: .75, pipe: p, lossless: true, preview: 15 } });
		await run({ id: 'F', label: `1.0 pipe${p} preview`, patch: { ...sim, resScale: 1, pipe: p, lossless: true, preview: 15 } });
		await run({ id: 'G', label: `.75 pipe${p} hold`, patch: { ...sim, resScale: .75, pipe: p, hold: true } });
		setStatus(`Midiendo P (${++i}/${TOTAL})… perfilado por pasada`);
		setCfg({ ...sim, resScale: .75, pipe: 1 });
		await sleep(WARMUP_MS);
		prof.push(await profile('sync'));
		prof.push(await profile('timer'));
	} finally {
		setCfg(previous);
		setStatus('');
		setMeasuring(false);
		running = false;
	}
	showResult(buildReport(rows, timer, notes, best, prof));
}
