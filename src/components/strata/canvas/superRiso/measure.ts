// Super Riso — automatic measurement ("Medir" button). Runs the C1b sequence without reloading
// (2 s warm-up discarded + 8 s measured each), then builds a compact plain-text report with the
// device facts and, per row, the CPU p50 of every bridge stage. Only loaded behind ?superriso=1.
//
//   A bypass · B res .5, current path (reference) · C B + upload at simulation size · D C + no
//   mipmap · E D + back via transferToImageBitmap · F E + upload via createImageBitmap (1 frame
//   late) · G the best of C–F (lowest frame p50) at res 1 · H the same at res .75

import { APP_VERSION } from '../../../../constants/version';
import { cfg, DEFAULT_CFG, live, hooks, setCfg, type RuntimeCfg } from './runtimeConfig';
import { reset, snapshot, setStatus, setMeasuring, showResult } from './perfOverlay';
import { offscreenWebGL2Available } from './bridge';

const WARMUP_MS = 2000;
const MEASURE_MS = 8000;

type Step = { id: string; label: string; patch: Partial<RuntimeCfg> };
const half = { ...DEFAULT_CFG, resScale: .5 };
const C_PATCH = { ...half, simUpload: true };
const D_PATCH = { ...C_PATCH, mip: false };
const E_PATCH = { ...D_PATCH, offscreenBack: true };
const F_PATCH = { ...E_PATCH, bitmapUpload: true };
const FIXED_STEPS: readonly Step[] = [
	{ id: 'A', label: 'bypass', patch: { ...DEFAULT_CFG, bypass: true } },
	{ id: 'B', label: 'res .5 actual', patch: half },
	{ id: 'C', label: 'B+sim-upload', patch: C_PATCH },
	{ id: 'D', label: 'C+sin mip', patch: D_PATCH },
	{ id: 'E', label: 'D+offscreen', patch: E_PATCH },
	{ id: 'F', label: 'E+bitmap', patch: F_PATCH },
];
const TOTAL_STEPS = FIXED_STEPS.length + 2;

type Row = { id: string; label: string; res: string; s: ReturnType<typeof snapshot>; patch: Partial<RuntimeCfg> };

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

function buildReport(rows: Row[], timer: boolean, notes: string[], chosen: string, lag: number): string {
	const g = gpuInfo();
	const L: string[] = [];
	L.push(`SUPER RISO · medición automática C1b · Diorame ${APP_VERSION} · ${new Date().toISOString()}`);
	L.push(`UA: ${navigator.userAgent}`);
	L.push(`DPR ${window.devicePixelRatio} · canvas vivo ${live.canvasW}×${live.canvasH}`);
	L.push(`GPU: ${g.renderer} · MAX_TEXTURE_SIZE ${g.maxTex} · temporizador GPU: ${timer ? 'sí' : 'no'}`);
	L.push(`Modo ${live.isDark ? 'oscuro' : 'claro'} · preset de cámara: ${live.preset || '–'} (velocidad ${live.speed || '–'})`);
	L.push(`OffscreenCanvas+WebGL2: ${offscreenWebGL2Available ? 'sí' : 'NO — E, F (y G/H si las eligen) usan el canvas DOM'}`);
	L.push(`Bitmap (F): última latencia ${lag} frame(s) entre aplanado y subida`);
	L.push(`G y H usan la mejor de C–F por frame p50: ${chosen}`);
	for (const n of notes) L.push(`AVISO: ${n}`);
	L.push(`Cada fila: ${WARMUP_MS / 1000} s de calentamiento descartados + ${MEASURE_MS / 1000} s medidos. Etapas = CPU p50 en ms.`);
	L.push('');
	L.push('cfg              fps   frame p50/p95 | SR    aplan  subida mip    motor  vuelta bmpWait | GPU   sim');
	for (const r of rows) {
		const s = r.s;
		const c = (v: number | null) => f(v, 2).padStart(6);
		L.push(`${(r.id + ' ' + r.label).padEnd(15)} ${f(s.fps).padStart(5)}  ${(f(s.frameP50) + '/' + f(s.frameP95)).padEnd(11)} |${c(s.totalP50)}${c(s.flatP50)} ${c(s.uploadP50)}${c(s.mipP50)} ${c(s.renderP50)}${c(s.backP50)}  ${c(s.bitmapWaitP50)} |${c(s.gpuP50)}  ${r.res}  (n=${s.samples})`);
	}
	return L.join('\n');
}

const describe = (p: Partial<RuntimeCfg>) => [p.simUpload ? 'sim-upload' : '', p.mip === false ? 'sin mip' : '', p.offscreenBack ? 'offscreen' : '', p.bitmapUpload ? 'bitmap' : ''].filter(Boolean).join(' + ') || 'camino actual';

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
	let chosen = '–';
	let lag = 0;
	const run = async (st: Step, i: number) => {
		setStatus(`Midiendo ${st.id} (${i + 1}/${TOTAL_STEPS})…`);
		setCfg(st.patch);
		await sleep(WARMUP_MS);
		reset();
		await sleep(MEASURE_MS);
		const s = snapshot(Infinity);
		if (s.gpuP50 !== null) timer = true;
		if (st.patch.bitmapUpload) lag = live.bitmapLagFrames;
		const sim = hooks.engineInfo();
		rows.push({ id: st.id, label: st.label, res: st.patch.bypass || !sim ? '–' : `${sim.width}×${sim.height}`, s, patch: st.patch });
	};
	try {
		for (let i = 0; i < FIXED_STEPS.length; i++) await run(FIXED_STEPS[i], i);
		// G/H: the C–F row with the lowest frame p50 (ties: lowest Super Riso CPU).
		const cands = rows.filter(r => ['C', 'D', 'E', 'F'].includes(r.id) && r.s.frameP50 !== null);
		cands.sort((a, b) => (a.s.frameP50! - b.s.frameP50!) || ((a.s.totalP50 ?? 1e9) - (b.s.totalP50 ?? 1e9)));
		const best = cands[0] ?? rows.find(r => r.id === 'C')!;
		chosen = `${best.id} (${describe(best.patch)})`;
		await run({ id: 'G', label: `${best.id} a res 1`, patch: { ...best.patch, resScale: 1 } }, FIXED_STEPS.length);
		await run({ id: 'H', label: `${best.id} a res .75`, patch: { ...best.patch, resScale: .75 } }, FIXED_STEPS.length + 1);
	} finally {
		setCfg(previous);
		setStatus('');
		setMeasuring(false);
		running = false;
	}
	showResult(buildReport(rows, timer, notes, chosen, lag));
}
