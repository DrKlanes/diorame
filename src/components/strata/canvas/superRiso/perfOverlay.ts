// Super Riso — instrumentation: rolling timings + a small DOM overlay to read the numbers on the
// iPad, with the automatic "Medir" sequence controls. DOM, not canvas, so it never ends up in an
// export or a recording. Only mounted behind ?srdebug=1.

const SIZE = 2400;       // enough for 8 s at 300 fps
const LIVE_WINDOW = 240; // what the live overlay shows

export type Series = 'interval' | 'total' | 'flat' | 'upload' | 'mip' | 'render' | 'back' | 'gpu' | 'bitmapWait';

const ring: Record<Series, number[]> = { interval: [], total: [], flat: [], upload: [], mip: [], render: [], back: [], gpu: [], bitmapWait: [] };

export function record(series: Series, v: number): void {
	const r = ring[series];
	r.push(v);
	if (r.length > SIZE) r.shift();
}

function pct(series: Series, p: number, n: number): number | null {
	const r = ring[series].slice(-n);
	if (r.length === 0) return null;
	const s = [...r].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

/** n = how many of the latest samples to use (default: the live window; Infinity = all). */
export function snapshot(n: number = LIVE_WINDOW) {
	const iv = ring.interval.slice(-n);
	const mean = iv.length ? iv.reduce((a, b) => a + b, 0) / iv.length : null;
	return {
		samples: iv.length,
		fps: mean ? 1000 / mean : null,
		frameP50: pct('interval', .5, n), frameP95: pct('interval', .95, n),
		totalP50: pct('total', .5, n), totalP95: pct('total', .95, n),
		flatP50: pct('flat', .5, n), uploadP50: pct('upload', .5, n), uploadP95: pct('upload', .95, n), mipP50: pct('mip', .5, n),
		renderP50: pct('render', .5, n), backP50: pct('back', .5, n), bitmapWaitP50: pct('bitmapWait', .5, n),
		gpuP50: pct('gpu', .5, n), gpuP95: pct('gpu', .95, n),
	};
}

export function reset(): void {
	for (const k of Object.keys(ring) as Series[]) ring[k].length = 0;
}

let box: HTMLDivElement | null = null;
let statsEl: HTMLDivElement | null = null;
let statusEl: HTMLDivElement | null = null;
let resultEl: HTMLDivElement | null = null;
let measureBtn: HTMLButtonElement | null = null;
let header = '';
let status = '';

export function setHeader(text: string): void { header = text; }
export function setStatus(text: string): void { status = text; if (statusEl) { statusEl.textContent = text; statusEl.style.display = text ? 'block' : 'none'; } }
export function setMeasuring(on: boolean): void { if (measureBtn) { measureBtn.disabled = on; measureBtn.style.opacity = on ? '.5' : '1'; } }

const f = (v: number | null, d = 1) => v === null ? '–' : v.toFixed(d);

const btnStyle = (b: HTMLButtonElement) => {
	Object.assign(b.style, {
		minHeight: '44px', minWidth: '88px', padding: '0 14px', border: '1px solid rgba(255,255,255,.5)', borderRadius: '8px',
		background: 'rgba(80,80,80,.9)', color: '#fff', font: '600 13px system-ui, sans-serif', cursor: 'pointer', touchAction: 'manipulation',
	} as Partial<CSSStyleDeclaration>);
};

/** Shows a result block: selectable textarea + "Copiar" (falls back to selecting the text). */
export function showResult(text: string): void {
	if (!resultEl) return;
	resultEl.textContent = '';
	const ta = document.createElement('textarea');
	ta.value = text; ta.readOnly = true; ta.rows = 22; ta.wrap = 'off';
	Object.assign(ta.style, { width: 'min(560px, 90vw)', font: '10px/1.3 ui-monospace, Menlo, Consolas, monospace', background: 'rgba(0,0,0,.8)', color: '#fff', border: '1px solid #888', borderRadius: '6px', padding: '6px' } as Partial<CSSStyleDeclaration>);
	const row = document.createElement('div'); row.style.display = 'flex'; row.style.gap = '8px'; row.style.marginTop = '6px';
	const note = document.createElement('div'); note.style.cssText = 'font:11px system-ui;color:#ccc;align-self:center';
	const copy = document.createElement('button'); copy.textContent = 'Copiar'; btnStyle(copy);
	copy.onclick = async () => {
		try {
			// writeText can stay pending forever (unfocused page, iOS gesture rules): never wait on it.
			await Promise.race([navigator.clipboard.writeText(text), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 1500))]);
			note.textContent = 'Copiado ✓';
		}
		catch { ta.focus(); ta.select(); note.textContent = 'No se pudo copiar: texto seleccionado, copia a mano'; }
	};
	const close = document.createElement('button'); close.textContent = 'Cerrar'; btnStyle(close);
	close.onclick = () => { if (resultEl) resultEl.textContent = ''; };
	row.append(copy, close, note);
	resultEl.append(ta, row);
}

export function mountOverlay(onMeasure: () => void): void {
	if (box || typeof document === 'undefined') return;
	box = document.createElement('div');
	box.setAttribute('data-superriso-overlay', '');
	Object.assign(box.style, { position: 'fixed', left: '8px', bottom: '8px', zIndex: '9999', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' } as Partial<CSSStyleDeclaration>);
	resultEl = document.createElement('div'); resultEl.style.pointerEvents = 'auto';
	statusEl = document.createElement('div');
	Object.assign(statusEl.style, { display: 'none', font: '600 12px system-ui, sans-serif', color: '#fff', background: 'rgba(160,0,200,.85)', padding: '4px 8px', borderRadius: '4px' } as Partial<CSSStyleDeclaration>);
	measureBtn = document.createElement('button'); measureBtn.textContent = 'Medir'; btnStyle(measureBtn);
	measureBtn.style.pointerEvents = 'auto'; measureBtn.onclick = onMeasure;
	statsEl = document.createElement('div');
	Object.assign(statsEl.style, { font: '10px/1.35 ui-monospace, Menlo, Consolas, monospace', color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '4px 6px', borderRadius: '4px', whiteSpace: 'pre' } as Partial<CSSStyleDeclaration>);
	box.append(resultEl, statusEl, measureBtn, statsEl);
	document.body.appendChild(box);
	setInterval(() => {
		if (!statsEl) return;
		const s = snapshot();
		statsEl.textContent = `${header}\n`
			+ `fps ${f(s.fps)} · frame p50 ${f(s.frameP50)} p95 ${f(s.frameP95)} ms\n`
			+ `SR p50 ${f(s.totalP50)} p95 ${f(s.totalP95)} ms (aplanado ${f(s.flatP50)} · subida ${f(s.uploadP50)} · mip ${f(s.mipP50)} · motor ${f(s.renderP50)} · vuelta ${f(s.backP50)})\n`
			+ `GPU motor p50 ${f(s.gpuP50)} p95 ${f(s.gpuP95)} ms`;
		if (status && statusEl) statusEl.textContent = status;
	}, 500);
}
