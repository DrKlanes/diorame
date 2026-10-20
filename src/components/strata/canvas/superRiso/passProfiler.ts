// Super Riso — per-pass GPU profiling (C2a), used by engine.run(). Two modes:
//   'sync'  after every pass, a 1×1 readPixels of that pass's target forces the GPU to finish it;
//           the wall time between syncs is the pass. Works everywhere (Safari has no GPU timer),
//           but the forced syncs inflate the total: use it to RANK passes, not to add them up.
//   'timer' one EXT_disjoint_timer_query_webgl2 query per pass, read back frames later. Desktop.
// Only active while the measurement asks for it; otherwise run() pays nothing.

export type ProfileMode = 'off' | 'sync' | 'timer';
export type PassInfo = { w: number; h: number; att: number };
type TimerExt = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };

export function createPassProfiler(gl: WebGL2RenderingContext) {
	const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
	let mode: ProfileMode = 'off';
	const samples = new Map<string, number[]>();
	const info = new Map<string, PassInfo>();
	const order: string[] = [];
	const inFlight: { name: string; q: WebGLQuery }[] = [];
	let tPrev = 0;
	const px = new Uint8Array(4);

	const push = (name: string, ms: number) => {
		let s = samples.get(name);
		if (!s) { s = []; samples.set(name, s); }
		s.push(ms);
	};

	return {
		get mode() { return mode; },
		timerAvailable: !!timerExt,
		setMode(m: ProfileMode) {
			mode = (m === 'timer' && !timerExt) ? 'off' : m;
			samples.clear(); info.clear(); order.length = 0;
		},
		/** Start of a render: drain the queue so the first pass is timed alone. */
		frameStart() {
			if (mode === 'sync') { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); tPrev = performance.now(); }
			if (mode === 'timer') this.poll();
		},
		before(name: string, pass: PassInfo): WebGLQuery | null {
			if (!info.has(name)) { info.set(name, pass); order.push(name); }
			if (mode !== 'timer' || !timerExt) return null;
			const q = gl.createQuery()!;
			gl.beginQuery(timerExt.TIME_ELAPSED_EXT, q);
			return q;
		},
		/** After drawArrays. `fb` is the pass's framebuffer (null = canvas), already bound. */
		after(name: string, q: WebGLQuery | null) {
			if (mode === 'sync') {
				gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
				const t = performance.now(); push(name, t - tPrev); tPrev = t;
			} else if (q && timerExt) {
				gl.endQuery(timerExt.TIME_ELAPSED_EXT);
				inFlight.push({ name, q });
			}
		},
		poll() {
			if (!timerExt) return;
			while (inFlight.length && gl.getQueryParameter(inFlight[0].q, gl.QUERY_RESULT_AVAILABLE)) {
				const { name, q } = inFlight.shift()!;
				if (!gl.getParameter(timerExt.GPU_DISJOINT_EXT)) push(name, gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
				gl.deleteQuery(q);
			}
		},
		/** p50 per pass, in execution order. */
		report(): { name: string; p50: number | null; n: number; info: PassInfo }[] {
			return order.map(name => {
				const s = [...(samples.get(name) ?? [])].sort((a, b) => a - b);
				return { name, p50: s.length ? s[Math.floor(s.length / 2)] : null, n: s.length, info: info.get(name)! };
			});
		},
	};
}
export type PassProfiler = ReturnType<typeof createPassProfiler>;
