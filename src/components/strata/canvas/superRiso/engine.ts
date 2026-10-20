// Super Riso — WebGL2 engine (no UI). Ported from the lab's superRiso.engine.js (laboratorio v0.3).
// Usage:
//   const eng = createEngine(canvas, assets)      // assets: { green, exBlack, exRed, exLut }
//   eng.setSource(imageOrCanvas)                 // input frame (sRGB, opaque)
//   eng.render(params)                           // params: see DEFAULTS; seed changes the print run
// The result stays in `canvas` (WebGL2); Diorame draws it back onto offCtx.
//
// Spike additions over the lab (C1), all off by default so the engine behaves as in the lab:
//   - opts.preserveDrawingBuffer (lab: true)
//   - setSource(src, mip): mip=false skips the per-frame generateMipmap of the source
//   - GPU timer query (EXT_disjoint_timer_query_webgl2) when available: eng.gpuMs, async

import { EX_PXMM, VS } from './shadersCommon';
import { FS_LUT, FS_PREP, FS_SEP0, FS_SEP, FS_BLUR } from './shadersSeparation';
import { FS_SCREEN, FS_SPREAD, FS_COMPOSE, FS_SCAN } from './shadersPrint';
import { MAXI, hex2rgb, lin, oklab, dist, printedHex, rng } from './inks';
import { DEFAULTS, type EngineParams } from './panel';

export type EngineAssets = { green: TexImageSource; exBlack: TexImageSource & { width: number; height: number }; exRed: TexImageSource & { width: number; height: number }; exLut: TexImageSource };
export type EngineOptions = { preserveDrawingBuffer?: boolean };
export type Engine = {
	canvas: HTMLCanvasElement;
	gl: WebGL2RenderingContext;
	lastMs: number; width: number; height: number;
	gpuMs: number | null;
	setSource(src: TexImageSource & { width: number; height: number }, mip?: boolean): void;
	render(params: Partial<EngineParams>): Engine;
};

type TexOpts = { filter?: number; wrap?: number; mip?: boolean };
type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type Target = { f: WebGLFramebuffer; t: WebGLTexture[]; w: number; h: number };
type RunApi = {
	t(name: string, texture: WebGLTexture): void;
	f(name: string, ...v: number[]): void;
	i(name: string, v: number): void;
	fv(name: string, arr: number[], n: number): void;
	m2(name: string, arr: number[]): void;
};

function fiberCanvas(seed: number): HTMLCanvasElement {
	const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
	x.fillStyle = '#000'; x.fillRect(0, 0, N, N); const r = rng(seed); x.lineCap = 'round';
	for (let k = 0; k < 2600; k++) {
		const len = (.25 + r() * r() * 1.6) * 85, a = r() * Math.PI * 2, x0 = r() * N, y0 = r() * N, bend = (r() - .5) * .9, wdt = (.012 + r() * .03) * 85;
		x.strokeStyle = `rgba(255,255,255,${.15 + r() * .55})`; x.lineWidth = wdt;
		for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
			const ax = x0 + ox, ay = y0 + oy; if (ax < -len - 10 || ax > N + len + 10 || ay < -len - 10 || ay > N + len + 10) continue;
			x.beginPath(); x.moveTo(ax, ay); x.quadraticCurveTo(ax + Math.cos(a + bend) * len * .5, ay + Math.sin(a + bend) * len * .5, ax + Math.cos(a) * len, ay + Math.sin(a) * len); x.stroke();
		}
	}
	return c;
}
function inclCanvas(seed: number): HTMLCanvasElement {
	const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
	x.fillStyle = '#000'; x.fillRect(0, 0, N, N); const r = rng(seed); x.lineCap = 'round'; x.globalCompositeOperation = 'lighter'; const ppm = N / 61;
	for (let k = 0; k < 70; k++) {
		const ch = r() < .7 ? '255,0,0' : '0,255,0';
		const len = (.4 + r() * r() * 3.5) * ppm, a = r() * Math.PI * 2, x0 = r() * N, y0 = r() * N, bend = (r() - .5) * 1.6, wdt = (.015 + r() * .03) * ppm;
		x.strokeStyle = `rgba(${ch},${.35 + r() * .5})`; x.lineWidth = Math.max(.6, wdt);
		for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) {
			const ax = x0 + ox, ay = y0 + oy; if (ax < -len || ax > N + len || ay < -len || ay > N + len) continue;
			x.beginPath(); x.moveTo(ax, ay); x.bezierCurveTo(ax + Math.cos(a + bend) * len * .35, ay + Math.sin(a + bend) * len * .35, ax + Math.cos(a - bend) * len * .7, ay + Math.sin(a - bend) * len * .7, ax + Math.cos(a) * len, ay + Math.sin(a) * len); x.stroke();
		}
	}
	for (let k = 0; k < 160; k++) { x.fillStyle = `rgba(255,0,0,${.2 + r() * .6})`; const rr = (.02 + r() * r() * .12) * ppm; x.beginPath(); x.arc(r() * N, r() * N, Math.max(.5, rr), 0, 7); x.fill(); }
	return c;
}

export function createEngine(canvas: HTMLCanvasElement, assets: EngineAssets, opts: EngineOptions = {}): Engine {
	const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: opts.preserveDrawingBuffer ?? true, antialias: false, premultipliedAlpha: false });
	if (!gl) throw new Error('WebGL2 no disponible');
	const MAXTEX: number = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	function compile(fs: string): Program {
		const p = gl!.createProgram()!;
		for (const [t, src] of [[gl!.VERTEX_SHADER, VS], [gl!.FRAGMENT_SHADER, fs]] as const) {
			const s = gl!.createShader(t)!; gl!.shaderSource(s, src); gl!.compileShader(s);
			if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) { const e = gl!.getShaderInfoLog(s); throw new Error(e ?? 'shader compile error'); }
			gl!.attachShader(p, s);
		}
		gl!.bindAttribLocation(p, 0, 'p'); gl!.linkProgram(p);
		if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(p) ?? 'program link error');
		const u: Program['u'] = {}; const n: number = gl!.getProgramParameter(p, gl!.ACTIVE_UNIFORMS);
		for (let i = 0; i < n; i++) { const info = gl!.getActiveUniform(p, i)!; u[info.name.replace(/\[0\]$/, '')] = gl!.getUniformLocation(p, info.name); }
		return { p, u };
	}
	const PR = { sep0: compile(FS_SEP0), lut: compile(FS_LUT), prep: compile(FS_PREP), sep: compile(FS_SEP), blur: compile(FS_BLUR), screen: compile(FS_SCREEN), spread: compile(FS_SPREAD), compose: compile(FS_COMPOSE), scan: compile(FS_SCAN) };
	const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	function tex(w: number, h: number, { filter = gl!.LINEAR, wrap = gl!.CLAMP_TO_EDGE }: TexOpts = {}): WebGLTexture {
		const t = gl!.createTexture()!; gl!.bindTexture(gl!.TEXTURE_2D, t);
		gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, w, h, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
		gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
		gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, wrap); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, wrap); return t;
	}
	function texFrom(src: TexImageSource, { filter = gl!.LINEAR, wrap = gl!.CLAMP_TO_EDGE, mip = false }: TexOpts = {}, t: WebGLTexture = gl!.createTexture()!): WebGLTexture {
		gl!.bindTexture(gl!.TEXTURE_2D, t);
		gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false); gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, gl!.RGBA, gl!.UNSIGNED_BYTE, src);
		if (mip) gl!.generateMipmap(gl!.TEXTURE_2D);
		gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, mip ? gl!.LINEAR_MIPMAP_LINEAR : filter); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
		gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, wrap); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, wrap); return t;
	}
	function target(w: number, h: number, n = 1): Target {
		const f = gl!.createFramebuffer()!; gl!.bindFramebuffer(gl!.FRAMEBUFFER, f); const ts: WebGLTexture[] = [];
		for (let i = 0; i < n; i++) { const t = tex(w, h); gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0 + i, gl!.TEXTURE_2D, t, 0); ts.push(t); }
		gl!.drawBuffers(ts.map((_, i) => gl!.COLOR_ATTACHMENT0 + i)); return { f, t: ts, w, h };
	}
	function freeTarget(T: Target) { T.t.forEach(t => gl!.deleteTexture(t)); gl!.deleteFramebuffer(T.f); }
	function run(prog: Program, tg: Target | null, setup?: (a: RunApi) => void) {
		const w = tg ? tg.w : canvas.width, h = tg ? tg.h : canvas.height;
		gl!.useProgram(prog.p); gl!.bindFramebuffer(gl!.FRAMEBUFFER, tg ? tg.f : null); gl!.viewport(0, 0, w, h);
		let unit = 0; const U = prog.u;
		const api: RunApi = {
			t(name, texture) { if (U[name] == null) return; gl!.activeTexture(gl!.TEXTURE0 + unit); gl!.bindTexture(gl!.TEXTURE_2D, texture); gl!.uniform1i(U[name], unit); unit++; },
			f(name, ...v) { const l = U[name]; if (l == null) return; if (v.length === 1) gl!.uniform1f(l, v[0]); else if (v.length === 2) gl!.uniform2f(l, v[0], v[1]); else if (v.length === 3) gl!.uniform3f(l, v[0], v[1], v[2]); else gl!.uniform4f(l, v[0], v[1], v[2], v[3]); },
			i(name, v) { if (U[name] != null) gl!.uniform1i(U[name], v); },
			fv(name, arr, n) { const l = U[name]; if (l == null) return; const a = new Float32Array(arr); if (n === 1) gl!.uniform1fv(l, a); else if (n === 2) gl!.uniform2fv(l, a); else gl!.uniform3fv(l, a); },
			m2(name, arr) { if (U[name] != null) gl!.uniformMatrix2fv(U[name], false, new Float32Array(arr)); },
		};
		api.f('uRes', w, h); setup && setup(api); gl!.drawArrays(gl!.TRIANGLES, 0, 3);
	}

	// texturas fijas
	const greenTex = texFrom(assets.green, { wrap: gl.REPEAT });
	const EX = {
		b: texFrom(assets.exBlack, { wrap: gl.REPEAT, mip: true }), bs: [assets.exBlack.width, assets.exBlack.height],
		r: texFrom(assets.exRed, { wrap: gl.REPEAT, mip: true }), rs: [assets.exRed.width, assets.exRed.height],
		lut: texFrom(assets.exLut),
	};
	const fibTex = texFrom(fiberCanvas(11), { wrap: gl.REPEAT, mip: true }), incTex = texFrom(inclCanvas(23), { wrap: gl.REPEAT, mip: true });
	const exU = (a: RunApi) => { a.t('uExB', EX.b); a.t('uExR', EX.r); a.t('uExLut', EX.lut); a.f('uExBSize', EX.bs[0], EX.bs[1]); a.f('uExRSize', EX.rs[0], EX.rs[1]); a.f('uExPxMm', EX_PXMM); };

	const LUT = target(33 * 33, 33, 2); let lutKey = '';
	const srcTex = gl.createTexture()!; let srcW = 0, srcH = 0;
	let TG: Record<'prep' | 'sep' | 'tmp' | 'loc' | 'qtmp' | 'sol' | 'scr' | 'cov' | 'comp', Target> | null = null, simW = 0, simH = 0;
	function ensureTargets(w: number, h: number) {
		if (w === simW && h === simH) return; simW = w; simH = h;
		if (TG) Object.values(TG).forEach(freeTarget);
		const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
		TG = { prep: target(w, h), sep: target(w, h, 2), tmp: target(w, h, 2), loc: target(w, h, 2), qtmp: target(qw, qh, 2), sol: target(qw, qh, 2), scr: target(w, h, 2), cov: target(w, h, 2), comp: target(w, h) };
		canvas.width = w; canvas.height = h;
	}

	// GPU timer (spike instrumentation): one query in flight, result read on a later frame.
	const timerExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
	let pendingQuery: WebGLQuery | null = null;
	function pollTimer() {
		if (!timerExt || !pendingQuery) return;
		if (!gl!.getQueryParameter(pendingQuery, gl!.QUERY_RESULT_AVAILABLE)) return;
		const disjoint = gl!.getParameter(timerExt.GPU_DISJOINT_EXT);
		if (!disjoint) eng.gpuMs = gl!.getQueryParameter(pendingQuery, gl!.QUERY_RESULT) / 1e6;
		gl!.deleteQuery(pendingQuery); pendingQuery = null;
	}

	const eng: Engine = {
		canvas, gl, lastMs: 0, width: 0, height: 0, gpuMs: null,
		// fotograma de entrada; en Diorame: el frame aplanado de cada render
		setSource(src, mip = true) { srcW = src.width; srcH = src.height; texFrom(src, { mip }, srcTex); },
		render(params) {
			const P: EngineParams = Object.assign({}, DEFAULTS, params);
			const t0 = performance.now();
			pollTimer();
			const query = (timerExt && !pendingQuery) ? gl!.createQuery() : null;
			if (query) gl!.beginQuery(timerExt!.TIME_ELAPSED_EXT, query);
			let w = Math.round(P.printW * P.pxmm), h = Math.round(w * srcH / srcW);
			const lim = Math.min(MAXTEX, 6144); if (Math.max(w, h) > lim) { const s = lim / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
			ensureTargets(w, h); eng.width = w; eng.height = h;
			const T = TG!;
			const pxmm = w / P.printW, paperLin = lin(hex2rgb(P.paper)), N = Math.min(MAXI, P.inks.length);
			const inks = P.inks.concat(Array(MAXI).fill('#000000')).slice(0, MAXI), opac = P.opac.concat(Array(MAXI).fill(.15)).slice(0, MAXI);
			const inkLin: number[] = []; for (let i = 0; i < MAXI; i++) inkLin.push(...lin(hex2rgb(printedHex(inks[i]))));
			const exSel = inks.map(h => oklab(hex2rgb(printedHex(h)))[0] < .42 ? 0 : 1);
			const P0 = oklab(hex2rgb(P.paper)); const con = inks.map(h => Math.min(1.5, dist(oklab(hex2rgb(printedHex(h))), P0) / .5));
			// la tabla de separación solo se recalcula si cambian tintas, papel o costes
			const key = JSON.stringify([inks, opac, N, P.paper, P.inkCost, P.pair]);
			if (key !== lutKey) { run(PR.lut, LUT, a => { a.fv('uCon', con, 1); a.fv('uInk', inkLin, 3); a.fv('uOp', opac, 1); a.i('uN', N); a.f('uPaper', ...paperLin); a.f('uCost', P.inkCost); a.f('uPair', P.pair); }); lutKey = key; }
			run(PR.prep, T.prep, a => { a.t('uSrc', srcTex); a.f('uSrcRes', srcW, srcH); a.f('uSmoothPx', P.smooth * srcW / P.printW); a.f('uSrcPaper', ...P.srcPaper); a.f('uPaper', ...paperLin); });
			const R = rng(P.seed * 7919 + 13); const M: number[] = [], Tt: number[] = [];
			for (let i = 0; i < MAXI; i++) {
				const ang = (R() * 2 - 1) * P.rot * Math.PI / 180, sc = 1 + (R() * 2 - 1) * P.scl / 1000, ca = Math.cos(ang) * sc, sa = Math.sin(ang) * sc;
				M.push(ca, sa, -sa, ca); const a = R() * Math.PI * 2, m = P.misreg * Math.sqrt(R()); Tt.push(Math.cos(a) * m, Math.sin(a) * m);
			}
			run(PR.blur, T.loc, a => { a.t('uTexA', T.prep.t[0]); a.t('uTexB', T.prep.t[0]); a.f('uDir', 1, 0); a.f('uSig', .3 * pxmm); });
			run(PR.blur, T.scr, a => { a.t('uTexA', T.loc.t[0]); a.t('uTexB', T.loc.t[0]); a.f('uDir', 0, 1); a.f('uSig', .3 * pxmm); });
			run(PR.sep0, T.tmp, a => { a.t('uPrepS', T.scr.t[0]); a.t('uPrep', T.prep.t[0]); a.t('uSet', LUT.t[0]); a.fv('uCon', con, 1); a.fv('uInk', inkLin, 3); a.fv('uOp', opac, 1); a.i('uN', N); a.f('uPaper', ...paperLin); a.f('uCost', P.inkCost); a.f('uPair', P.pair); a.f('uMinDot', P.minDot); });
			// uM is a mat2[8]: the lab's m2() sends all 8 matrices in one uniformMatrix2fv call.
			run(PR.sep, T.sep, a => { a.f('uPxMm', pxmm); a.t('uSA', T.tmp.t[0]); a.t('uSB', T.tmp.t[1]); a.i('uN', N); a.f('uCtr', P.printW / 2, h / pxmm / 2); a.m2('uM', M); a.fv('uT', Tt, 2); });
			const blur2 = (src: Target, tmp: Target, dst: Target, sigPx: number) => {
				run(PR.blur, tmp, a => { a.t('uTexA', src.t[0]); a.t('uTexB', src.t[1]); a.f('uDir', 1, 0); a.f('uSig', sigPx); });
				run(PR.blur, dst, a => { a.t('uTexA', tmp.t[0]); a.t('uTexB', tmp.t[1]); a.f('uDir', 0, 1); a.f('uSig', sigPx); });
			};
			blur2(T.sep, T.tmp, T.loc, .22 * pxmm);
			blur2(T.sep, T.qtmp, T.sol, 1.5 * pxmm / 4);
			run(PR.screen, T.scr, a => {
				exU(a); a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uSepA', T.sep.t[0]); a.t('uSepB', T.sep.t[1]); a.t('uSolA', T.sol.t[0]); a.t('uSolB', T.sol.t[1]); a.t('uLocA', T.loc.t[0]); a.t('uLocB', T.loc.t[1]); a.t('uGreen', greenTex);
				a.i('uN', N); a.i('uMode', +P.screen); a.f('uGrain', P.grain); a.f('uLoad', P.inkLoad); a.f('uLpi', P.lpi); a.f('uMottle', P.mottle); a.f('uStarve', P.starve); a.f('uTexAmp', P.texAmp); a.f('uStreak', P.streak); a.f('uSolidLv', P.solidLv); a.fv('uExSel', exSel, 1); a.f('uTrap', P.trap);
			});
			run(PR.spread, T.cov, a => {
				exU(a); a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uScrA', T.scr.t[0]); a.t('uScrB', T.scr.t[1]); a.t('uSepA', T.sep.t[0]); a.t('uSepB', T.sep.t[1]); a.t('uLocA', T.loc.t[0]); a.t('uLocB', T.loc.t[1]);
				a.i('uN', N); a.f('uBleedPx', P.bleed * pxmm); a.f('uGain', P.gain); a.f('uEdge', P.edge); a.f('uSolidLv', P.solidLv); a.fv('uExSel', exSel, 1);
			});
			run(PR.compose, T.comp, a => {
				exU(a); a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uCovA', T.cov.t[0]); a.t('uCovB', T.cov.t[1]); a.t('uSolA', T.sol.t[0]); a.t('uSolB', T.sol.t[1]); a.f('uStarve', P.starve); a.t('uFib', fibTex); a.t('uInc', incTex); a.i('uN', N); a.fv('uInk', inkLin, 3); a.fv('uOp', opac, 1); a.f('uPaper', ...paperLin);
				a.f('uPaperTex', P.paperTex); a.f('uFibers', P.fibers); a.f('uIncl', P.incl); a.f('uVoids', P.voids); a.f('uMottle', P.mottle); a.f('uTexAmp', P.texAmp); a.fv('uExSel', exSel, 1);
			});
			run(PR.scan, null, a => { a.f('uSeed', P.seed); a.t('uComp', T.comp.t[0]); a.f('uBlurPx', P.scanBlur); a.f('uNoise', P.scanNoise); a.i('uNorm', +P.normWhite); a.f('uPaper', ...paperLin); });
			if (query) { gl!.endQuery(timerExt!.TIME_ELAPSED_EXT); pendingQuery = query; }
			gl!.flush();
			eng.lastMs = performance.now() - t0; return eng;
		},
	};
	return eng;
}
