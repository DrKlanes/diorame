// Super Riso — spike C1 instrumentation: rolling timings + a small DOM text overlay to read
// the numbers on the iPad. DOM, not canvas, so it never ends up in an export or a recording.

const SIZE = 240;

export type Series = 'interval' | 'total' | 'flat' | 'render' | 'back' | 'gpu';

const ring: Record<Series, number[]> = { interval: [], total: [], flat: [], render: [], back: [], gpu: [] };

export function record(series: Series, v: number): void {
	const r = ring[series];
	r.push(v);
	if (r.length > SIZE) r.shift();
}

function pct(series: Series, p: number): number | null {
	const r = ring[series];
	if (r.length === 0) return null;
	const s = [...r].sort((a, b) => a - b);
	return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

export function snapshot() {
	const p50i = pct('interval', .5);
	const mean = ring.interval.length ? ring.interval.reduce((a, b) => a + b, 0) / ring.interval.length : null;
	return {
		samples: ring.interval.length,
		fps: mean ? 1000 / mean : null,
		frameP50: p50i, frameP95: pct('interval', .95),
		totalP50: pct('total', .5), totalP95: pct('total', .95),
		flatP50: pct('flat', .5), renderP50: pct('render', .5), backP50: pct('back', .5),
		gpuP50: pct('gpu', .5), gpuP95: pct('gpu', .95),
	};
}

export function reset(): void {
	for (const k of Object.keys(ring) as Series[]) ring[k].length = 0;
}

let el: HTMLDivElement | null = null;
let header = '';

export function setHeader(text: string): void {
	header = text;
}

const f = (v: number | null, d = 1) => v === null ? '–' : v.toFixed(d);

export function mountOverlay(): void {
	if (el || typeof document === 'undefined') return;
	el = document.createElement('div');
	el.setAttribute('data-superriso-overlay', '');
	Object.assign(el.style, {
		position: 'fixed', left: '8px', bottom: '8px', zIndex: '9999', pointerEvents: 'none',
		font: '10px/1.35 ui-monospace, Menlo, Consolas, monospace', color: '#fff',
		background: 'rgba(0,0,0,0.55)', padding: '4px 6px', borderRadius: '4px', whiteSpace: 'pre',
	} as Partial<CSSStyleDeclaration>);
	document.body.appendChild(el);
	setInterval(() => {
		if (!el) return;
		const s = snapshot();
		el.textContent = `${header}\n`
			+ `fps ${f(s.fps)} · frame p50 ${f(s.frameP50)} p95 ${f(s.frameP95)} ms\n`
			+ `SR p50 ${f(s.totalP50)} p95 ${f(s.totalP95)} ms (aplanado+subida ${f(s.flatP50)} · motor ${f(s.renderP50)} · vuelta ${f(s.backP50)})\n`
			+ `GPU motor p50 ${f(s.gpuP50)} p95 ${f(s.gpuP95)} ms`;
	}, 500);
}
