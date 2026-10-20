// Super Riso — automatic measurement ("Medir" button). Runs 5 configurations in sequence without
// reloading (2 s warm-up discarded + 8 s measured each), then builds a compact plain-text report
// with the device facts and a table. Only loaded behind ?superriso=1.

import { APP_VERSION } from '../../../../constants/version';
import { cfg, DEFAULT_CFG, live, hooks, setCfg, type RuntimeCfg } from './runtimeConfig';
import { reset, snapshot, setStatus, setMeasuring, showResult } from './perfOverlay';

const WARMUP_MS = 2000;
const MEASURE_MS = 8000;

type Step = { id: string; label: string; patch: Partial<RuntimeCfg> };
const STEPS: readonly Step[] = [
	{ id: 'A', label: 'bypass', patch: { ...DEFAULT_CFG, bypass: true } },
	{ id: 'B', label: 'defecto', patch: { ...DEFAULT_CFG } },
	{ id: 'C', label: 'pdb:false', patch: { ...DEFAULT_CFG, preserveDrawingBuffer: false } },
	{ id: 'D', label: 'C+res .75', patch: { ...DEFAULT_CFG, preserveDrawingBuffer: false, resScale: .75 } },
	{ id: 'E', label: 'C+res .5', patch: { ...DEFAULT_CFG, preserveDrawingBuffer: false, resScale: .5 } },
];

type Row = { id: string; label: string; res: string; s: ReturnType<typeof snapshot> };

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

function buildReport(rows: Row[], timer: boolean, notes: string[]): string {
	const g = gpuInfo();
	const sim = hooks.engineInfo();
	const L: string[] = [];
	L.push(`SUPER RISO · medición automática · Diorame ${APP_VERSION} · ${new Date().toISOString()}`);
	L.push(`UA: ${navigator.userAgent}`);
	L.push(`DPR ${window.devicePixelRatio} · canvas vivo ${live.canvasW}×${live.canvasH} · simulación ${sim ? `${sim.width}×${sim.height}` : '–'}`);
	L.push(`GPU: ${g.renderer} · MAX_TEXTURE_SIZE ${g.maxTex} · temporizador GPU: ${timer ? 'sí' : 'no'}`);
	L.push(`Modo ${live.isDark ? 'oscuro' : 'claro'} · preset de cámara: ${live.preset || '–'} (velocidad ${live.speed || '–'})`);
	for (const n of notes) L.push(`AVISO: ${n}`);
	L.push('A bypass = módulo cargado, efecto sin aplicar · C pdb:false = preserveDrawingBuffer:false');
	L.push(`Cada fila: ${WARMUP_MS / 1000} s de calentamiento descartados + ${MEASURE_MS / 1000} s medidos`);
	L.push('');
	L.push('cfg                 fps    frame p50/p95 ms   SR cpu p50 ms   GPU p50 ms   sim');
	for (const r of rows) {
		const s = r.s;
		L.push(`${(r.id + ' ' + r.label).padEnd(18)}  ${f(s.fps).padStart(5)}  ${(f(s.frameP50) + ' / ' + f(s.frameP95)).padEnd(17)}  ${f(s.totalP50, 2).padStart(12)}  ${f(s.gpuP50, 2).padStart(10)}   ${r.res}  (n=${s.samples})`);
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
	let timer = false;
	try {
		for (let i = 0; i < STEPS.length; i++) {
			const st = STEPS[i];
			setStatus(`Midiendo ${st.id} (${i + 1}/${STEPS.length})…`);
			setCfg(st.patch);
			await sleep(WARMUP_MS);
			reset();
			await sleep(MEASURE_MS);
			const s = snapshot(Infinity);
			if (s.gpuP50 !== null) timer = true;
			const sim = hooks.engineInfo();
			rows.push({ id: st.id, label: st.label, res: st.patch.bypass || !sim ? '–' : `${sim.width}×${sim.height}`, s });
		}
	} finally {
		setCfg(previous);
		setStatus('');
		setMeasuring(false);
		running = false;
	}
	showResult(buildReport(rows, timer, notes));
}
