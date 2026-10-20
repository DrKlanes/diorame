// Super Riso — automatic measurement ("Medir" button). Runs the C1c sequence without reloading
// (2 s warm-up discarded + 8 s measured each), then builds a compact plain-text report with the
// device facts and, per row, the CPU p50 of every stage plus where the wait lands. Only loaded
// behind ?superriso=1.
//
//   A bypass · B res .5 synchronous (reference = C of C1b) · C res .5 + srpipe · D res .75 +
//   srpipe · E res 1 + srpipe · F res 1 + srpipe + srhold. Upload at simulation size in all but A.

import { APP_VERSION } from '../../../../constants/version';
import { cfg, DEFAULT_CFG, live, hooks, setCfg, type RuntimeCfg } from './runtimeConfig';
import { reset, snapshot, setStatus, setMeasuring, showResult } from './perfOverlay';
import { offscreenWebGL2Available } from './bridge';

const WARMUP_MS = 2000;
const MEASURE_MS = 8000;

type Step = { id: string; label: string; patch: Partial<RuntimeCfg> };
const sim = { ...DEFAULT_CFG, simUpload: true };
const STEPS: readonly Step[] = [
	{ id: 'A', label: 'bypass', patch: { ...DEFAULT_CFG, bypass: true } },
	{ id: 'B', label: 'res .5 sync', patch: { ...sim, resScale: .5 } },
	{ id: 'C', label: 'res .5 pipe', patch: { ...sim, resScale: .5, pipe: true } },
	{ id: 'D', label: 'res .75 pipe', patch: { ...sim, resScale: .75, pipe: true } },
	{ id: 'E', label: 'res 1 pipe', patch: { ...sim, resScale: 1, pipe: true } },
	{ id: 'F', label: 'res 1 pipe+hold', patch: { ...sim, resScale: 1, pipe: true, hold: true } },
];

type Counts = { pipe: number; sync: number; held: number };
type Row = { id: string; label: string; res: string; s: ReturnType<typeof snapshot>; patch: Partial<RuntimeCfg>; n: Counts };

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
	if (r.patch.bypass) return '–';
	const s = r.s;
	const unexplained = (s.frameP50 !== null && base !== null && s.totalP50 !== null) ? s.frameP50 - base - s.totalP50 : null;
	const stages: [string, number | null][] = [
		[r.patch.pipe ? 'subida al inicio' : 'subida', s.uploadP50], ['aplanado', s.flatP50], ['mip', s.mipP50],
		['motor (CPU)', s.renderP50], ['vuelta', s.backP50],
	];
	const top = stages.filter(([, v]) => v !== null).sort((a, b) => b[1]! - a[1]!)[0];
	const parts: string[] = [];
	if (top && top[1]! >= 3) parts.push(`${top[0]} ${f(top[1])} ms`);
	if (unexplained !== null && unexplained >= 3) parts.push(`fuera de nuestras etapas ${f(unexplained)} ms`);
	return parts.length ? parts.join(' + ') : 'sin espera apreciable';
}

function buildReport(rows: Row[], timer: boolean, notes: string[]): string {
	const g = gpuInfo();
	const base = rows.find(r => r.id === 'A')?.s.frameP50 ?? null;
	const L: string[] = [];
	L.push(`SUPER RISO · medición automática C1c · Diorame ${APP_VERSION} · ${new Date().toISOString()}`);
	L.push(`UA: ${navigator.userAgent}`);
	L.push(`DPR ${window.devicePixelRatio} · canvas vivo ${live.canvasW}×${live.canvasH}`);
	L.push(`GPU: ${g.renderer} · MAX_TEXTURE_SIZE ${g.maxTex} · temporizador GPU: ${timer ? 'sí' : 'no'} · OffscreenCanvas+WebGL2: ${offscreenWebGL2Available ? 'sí' : 'no'}`);
	L.push(`Modo ${live.isDark ? 'oscuro' : 'claro'} · preset de cámara: ${live.preset || '–'} (velocidad ${live.speed || '–'})`);
	for (const n of notes) L.push(`AVISO: ${n}`);
	L.push(`Cada fila: ${WARMUP_MS / 1000} s de calentamiento descartados + ${MEASURE_MS / 1000} s medidos. Etapas = CPU p50 en ms por frame.`);
	L.push('pipe: la subida y el motor corren al INICIO del frame siguiente (resultado con 1 frame de retraso).');
	L.push('hold: el motor solo corre en los ticks de 12 fps; entre ticks se redibuja el último resultado (mira subida p95).');
	L.push('"sin expl." = frame p50 − frame p50 de A − SR p50: espera que cae fuera de nuestras etapas.');
	L.push('');
	L.push('cfg                fps   frame p50/p95 | SR    aplan  subida sub95  mip   motor  vuelta | sin expl. | GPU   sim         frames pipe/sync/held');
	for (const r of rows) {
		const s = r.s;
		const c = (v: number | null) => f(v, 2).padStart(6);
		const unexplained = (!r.patch.bypass && s.frameP50 !== null && base !== null && s.totalP50 !== null) ? s.frameP50 - base - s.totalP50 : null;
		L.push(`${(r.id + ' ' + r.label).padEnd(18)}${f(s.fps).padStart(5)}  ${(f(s.frameP50) + '/' + f(s.frameP95)).padEnd(11)} |${c(s.totalP50)}${c(s.flatP50)} ${c(s.uploadP50)}${c(s.uploadP95)}${c(s.mipP50)}${c(s.renderP50)}${c(s.backP50)} |${c(unexplained)}    |${c(s.gpuP50)}  ${r.res.padEnd(10)}  ${r.n.pipe}/${r.n.sync}/${r.n.held}  (n=${s.samples})`);
	}
	L.push('');
	L.push('Dónde cae la espera:');
	for (const r of rows) if (!r.patch.bypass) L.push(`  ${r.id} ${r.label}: ${waitVerdict(r, base)}`);
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
	let timer = false;
	try {
		for (let i = 0; i < STEPS.length; i++) {
			const st = STEPS[i];
			setStatus(`Midiendo ${st.id} (${i + 1}/${STEPS.length})…`);
			setCfg(st.patch);
			await sleep(WARMUP_MS);
			reset();
			const c0: Counts = { pipe: live.pipeFrames, sync: live.pipeSyncFrames, held: live.heldFrames };
			await sleep(MEASURE_MS);
			const s = snapshot(Infinity);
			if (s.gpuP50 !== null) timer = true;
			const n: Counts = { pipe: live.pipeFrames - c0.pipe, sync: live.pipeSyncFrames - c0.sync, held: live.heldFrames - c0.held };
			const info = hooks.engineInfo();
			rows.push({ id: st.id, label: st.label, res: st.patch.bypass || !info ? '–' : `${info.width}×${info.height}`, s, patch: st.patch, n });
		}
	} finally {
		setCfg(previous);
		setStatus('');
		setMeasuring(false);
		running = false;
	}
	showResult(buildReport(rows, timer, notes));
}
