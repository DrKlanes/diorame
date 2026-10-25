// Super Riso · Stencil — the pass chain, ported 1:1 from the lab v14 (engine.studio.js prepareStencil + renderStencil):
//   prep (paper → white) → blur ×2 (σ = cut·½·pxmm) → SCUT (MRT, up to 5 layers) → blur ¼ (σ = liftMm·pxmm/4) → blur ¼ (×2) → SPRAY → SCAN
// Diorame renders the whole frame at once: uOff = 0, uImg = target size. Its programs, targets and the spray texture
// (stencilCpu.sprayField, generated once per session, REPEAT + mipmaps) are created on the first Stencil render.
// Every uniform of every pass is set (see shadersStencil.ts: the lab's GPU traps); uKind / uCh go up as int arrays.

import { FS_SCUT, FS_SPRAY } from './shadersStencil';
import { hex2rgb, lin, rng } from './inks';
import { SDEFAULTS, type StencilEngineParams } from './stencilParams';
import { sprayField, SPRAY_N, type StencilMaps } from './stencilCpu';
import type { XeroxHost, XeroxShared } from './xeroxEngine';
import type { Program, Target, RunApi } from './engine';

export function createStencil(H: XeroxHost) {
	const { gl } = H;
	let PR: { scut: Program; spray: Program } | null = null;
	let ST: Record<'b1' | 'b2' | 'sm' | 'sq' | 'sw', Target> | null = null, sw = 0, sh = 0;
	let spT: WebGLTexture | null = null;
	const drTex = gl.createTexture()!, brTex = gl.createTexture()!, clTex = gl.createTexture()!; let mapsSrc: StencilMaps | null | undefined = undefined;
	let black: HTMLCanvasElement | null = null;
	const blankBlack = () => {
		if (!black) { black = document.createElement('canvas'); black.width = black.height = 1; const x = black.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, 1, 1); }
		return black;
	};
	function ensure(w: number, h: number) {
		if (!PR) PR = { scut: H.compile(FS_SCUT), spray: H.compile(FS_SPRAY) };
		if (!spT) spT = H.texFrom(sprayField(), { wrap: gl.REPEAT, mip: true });
		if (ST && w === sw && h === sh) return;
		if (ST) Object.values(ST).forEach(H.freeTarget);
		sw = w; sh = h; const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
		ST = { b1: H.target(w, h), b2: H.target(w, h), sm: H.target(w, h, 2), sq: H.target(qw, qh, 2), sw: H.target(qw, qh, 2) };
	}

	function render(params: Partial<StencilEngineParams>, S: XeroxShared, srcTex: WebGLTexture, srcW: number, srcH: number, w: number, h: number, toTexture: boolean) {
		ensure(w, h);
		const P: StencilEngineParams = Object.assign({}, SDEFAULTS, params), T = ST!, R = PR!;
		const pxmm = w / P.printW;
		// prepareStencil
		const L = (P.layers || []).slice(0, 5), NL = L.length, rnd = rng(P.seed * 6151 + 3);
		const sp = lin(P.srcPaper || [1, 1, 1]).map(v => Math.max(v, .02));
		const norm = (hx: string) => lin(hex2rgb(hx)).map((v, i) => Math.min(1, v / sp[i]));
		const kind: number[] = [], thr: number[] = [], ch: number[] = [], lc: number[] = [], op: number[] = [], key: number[] = [], offs: number[] = []; let nk = 0;
		for (let i = 0; i < 5; i++) {
			const l = L[i] || { kind: 0, thr: 2, hex: '#000000' };
			kind.push(l.kind | 0); thr.push(l.thr == null ? .5 : l.thr); ch.push(l.ch == null ? -1 : l.ch); op.push(l.op == null ? .97 : l.op);
			lc.push(...lin(hex2rgb(l.hex))); key.push(...(l.key ? norm(l.key) : [1, 1, 1])); if (i < NL && l.kind === 1) nk = i + 1;
			const a = rnd() * Math.PI * 2, m = P.misreg * Math.sqrt(rnd()); offs.push(Math.cos(a) * m, Math.sin(a) * m);
		}
		const M = P.maps || { drip: null, bridge: null, cloud: null };
		if (M !== mapsSrc) {
			H.texFrom(M.drip || blankBlack(), {}, drTex); H.texFrom(M.bridge || blankBlack(), {}, brTex); H.texFrom(M.cloud || blankBlack(), {}, clTex);
			mapsSrc = M;
		}
		const drTp = M.drip ? Math.max(.03, Math.min(.5, .5 * M.drip.width / w)) : .5;
		const acc = P.accKey ? norm(P.accKey) : [1, 1, 1], accOn = L.some(l => l.kind === 3) ? 1 : 0;
		const supLin = lin(hex2rgb(P.support)), cloudLin = lin(hex2rgb(P.cloudHex || '#f4f4f0'));

		// renderStencil
		const run = (name: string, prog: Program, tg: Target | null, setup: (a: RunApi) => void) =>
			H.run(name, prog, tg, a => { a.f('uOff', 0, 0); a.f('uImg', w, h); setup(a); });
		run('PREP', H.PR.prep, S.prep, a => { a.t('uSrc', srcTex); a.f('uSrcRes', srcW, srcH); a.f('uSmoothPx', P.smooth * srcW / P.printW); a.f('uSrcPaper', ...(P.srcPaper || [1, 1, 1])); a.f('uPaper', 1, 1, 1); });
		const bl = (label: string, src: Target, dst: Target, dx: number, dy: number, sig: number) => run(`BLUR ${label}`, H.PR.blur, dst, a => { a.t('uTexA', src.t[0]); a.t('uTexB', src.t[src.t.length > 1 ? 1 : 0]); a.f('uDir', dx, dy); a.f('uSig', sig); });
		const cs = Math.max(.05, P.cut * .5 * pxmm); bl('cut H', S.prep, T.b1, 1, 0, cs); bl('cut V', T.b1, T.b2, 0, 1, cs);
		run('SCUT', R.scut, T.sm, a => {
			a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uSimp', T.b2.t[0]); a.t('uBr', brTex); a.i('uNL', NL); a.i('uNK', nk); a.i('uAccOn', accOn);
			a.iv('uKind', kind); a.iv('uCh', ch);
			a.fv('uThr', thr, 1); a.fv('uKey', key, 3); a.f('uAccK', acc[0], acc[1], acc[2]); a.fv('uOffs', offs, 2); a.f('uFacet', P.facet); a.f('uAA', Math.max(.008, Math.min(.05, .1 / Math.max(.7, cs))));
		});
		const sq = Math.max(.3, P.liftMm * pxmm / 4); bl('lift ¼ H', T.sm, S.qtmp, 1, 0, sq); bl('lift ¼ V', S.qtmp, T.sq, 0, 1, sq);
		bl('wide ¼ H', T.sq, S.qtmp, 1, 0, sq * 2); bl('wide ¼ V', S.qtmp, T.sw, 0, 1, sq * 2);
		run('SPRAY', R.spray, S.comp, a => {
			a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uMA', T.sm.t[0]); a.t('uMB', T.sm.t[1]); a.t('uQA', T.sq.t[0]); a.t('uQB', T.sq.t[1]);
			a.t('uWA', T.sw.t[0]); a.t('uWB', T.sw.t[1]); a.t('uDr', drTex); a.t('uCl', clTex); a.t('uSpT', spT!); a.i('uNL', NL); a.i('uSup', P.supType | 0);
			a.iv('uCh', ch);
			a.fv('uLc', lc, 3); a.fv('uOp', op, 1); a.f('uSupLin', ...supLin); a.f('uCloudLin', ...cloudLin); a.f('uSupTex', P.supTex); a.f('uLift', P.lift); a.f('uOver', P.over);
			a.f('uLoad', P.load); a.f('uMist', P.mist); a.f('uDrop', P.drop); a.f('uCloud', M.cloud ? P.cloud : 0); a.f('uSpN', SPRAY_N); a.f('uTp', SPRAY_N / (143.36 * P.drop * pxmm)); a.f('uDrTp', drTp); a.f('uLiftScale', P.liftScale);
		});
		run('SCAN', H.PR.scan, toTexture ? S.out : null, a => { a.f('uSeed', P.seed); a.t('uComp', S.comp.t[0]); a.f('uBlurPx', P.scanBlur); a.f('uNoise', P.scanNoise); a.i('uNorm', 0); a.f('uPaper', ...supLin); });
	}
	return { render };
}
