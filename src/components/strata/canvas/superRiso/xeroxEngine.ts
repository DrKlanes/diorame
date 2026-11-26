// Super Riso · Fotocopia — the pass chain, ported 1:1 from the lab (engine.studio.js prepareXerox + renderXerox):
//   prep → XLUM → (blur + XGEN) × generations → XDIRT → solids ¼ → [colour: XID → (marker: XEDGE → blur 1:1) → mask blur → XCOLOR] → XCOMP → SCAN
// Same targets at ¼ resolution as the lab. Diorame renders the whole frame at once: uOff = 0, uImg = target size.
// Its own programs and targets are created on the first Fotocopia render (a Riso-only session never pays for them).

import { FS_XLUM, FS_XGEN, FS_XID, FS_XEDGE, FS_XCOLOR, FS_XCOMP, FS_XDIRT } from './shadersXerox';
import { hex2rgb, lin, rng } from './inks';
import { XDEFAULTS, type XeroxEngineParams } from './xeroxParams';
import type { Program, Target, RunApi, TexOpts } from './engine';
import type { OriMap } from './xeroxMaps';

export type XeroxHost = {
	gl: WebGL2RenderingContext;
	compile(fs: string): Program;
	run(name: string, prog: Program, tg: Target | null, setup?: (a: RunApi) => void): void;
	target(w: number, h: number, n?: number): Target;
	freeTarget(T: Target): void;
	texFrom(src: TexImageSource, o?: TexOpts, t?: WebGLTexture): WebGLTexture;
	greenTex: WebGLTexture; fibTex: WebGLTexture;
	PR: { prep: Program; blur: Program; scan: Program };
};
/** Shared targets of the Riso chain that Fotocopia reuses (same size: the frame). */
export type XeroxShared = { prep: Target; qtmp: Target; comp: Target; out: Target };

export function createXerox(H: XeroxHost) {
	const { gl } = H;
	let PR: Record<'xlum' | 'xgen' | 'xid' | 'xedge' | 'xcolor' | 'xcomp' | 'xdirt', Program> | null = null;
	let XT: Record<'xa' | 'xb' | 'xc' | 'xq1' | 'xq2' | 'xs', Target> | null = null, xw = 0, xh = 0;
	// The marker's edge field at full resolution (lab v23.6: the lab's sep / tmp / loc). Created on the first marker render.
	let XE: Record<'e1' | 'e2' | 'e3', Target> | null = null;
	const oriTex = gl.createTexture()!; let oriSrc: unknown = undefined;
	const idTex = gl.createTexture()!; let idSrc: unknown = undefined;
	let blank: HTMLCanvasElement | null = null;
	const blankOri = () => {
		if (!blank) { blank = document.createElement('canvas'); blank.width = blank.height = 1; const x = blank.getContext('2d')!; x.fillStyle = 'rgb(255,128,0)'; x.fillRect(0, 0, 1, 1); }
		return blank;
	};
	function ensure(w: number, h: number) {
		if (!PR) PR = { xlum: H.compile(FS_XLUM), xgen: H.compile(FS_XGEN), xid: H.compile(FS_XID), xedge: H.compile(FS_XEDGE), xcolor: H.compile(FS_XCOLOR), xcomp: H.compile(FS_XCOMP), xdirt: H.compile(FS_XDIRT) };
		if (XT && w === xw && h === xh) return;
		if (XT) Object.values(XT).forEach(H.freeTarget);
		if (XE) { Object.values(XE).forEach(H.freeTarget); XE = null; }
		xw = w; xh = h; const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
		XT = { xa: H.target(w, h), xb: H.target(w, h), xc: H.target(w, h), xq1: H.target(qw, qh, 2), xq2: H.target(qw, qh, 2), xs: H.target(qw, qh) };
	}

	/** Renders into the canvas (or shared.out with toTexture). srcW/srcH: the uploaded flattened frame. light: the slow tier in motion (1 generation). */
	function render(params: Partial<XeroxEngineParams>, S: XeroxShared, srcTex: WebGLTexture, srcW: number, srcH: number, w: number, h: number, toTexture: boolean, light = false) {
		ensure(w, h);
		const P: XeroxEngineParams = Object.assign({}, XDEFAULTS, params), X = XT!, R = PR!;
		const pxmm = w / P.printW;
		// prepareXerox
		const mk = (P.markers || []).slice(0, 6); const nk = P.hand > 0 ? mk.length : 0;
		const mkLin: number[] = []; for (let i = 0; i < 6; i++) mkLin.push(...lin(hex2rgb(mk[i] || '#ffffff')));
		// keys: the colour of the ORIGINAL that identifies each marker's zone (by default, the marker itself).
		const ky = (P.keys && P.keys.length ? P.keys : mk).slice(0, 6); const keyLin: number[] = []; for (let i = 0; i < 6; i++) keyLin.push(...lin(hex2rgb(ky[i] || mk[i] || '#ffffff')));
		if (P.regionMap && P.regionMap !== idSrc) { H.texFrom(P.regionMap, { filter: gl.NEAREST }, idTex); idSrc = P.regionMap; }
		if (!P.regionMap && idSrc !== null) { H.texFrom(blankOri(), { filter: gl.NEAREST }, idTex); idSrc = null; }
		const rnd = rng(P.seed * 4241 + 7); const off: number[] = [];
		for (let i = 0; i < 6; i++) { const a = rnd() * Math.PI * 2, m = P.offset * (.35 + .65 * rnd()); off.push(Math.cos(a) * m, Math.sin(a) * m); }
		if (P.orientMap && P.orientMap !== oriSrc) { H.texFrom(P.orientMap, { filter: gl.NEAREST }, oriTex); oriSrc = P.orientMap; }
		if (!P.orientMap && oriSrc !== null) { H.texFrom(blankOri(), { filter: gl.NEAREST }, oriTex); oriSrc = null; }
		const useMap = P.regionMap ? 1 : 0, paperLin = lin(hex2rgb(P.paper)), srcPaperLin = lin(P.srcPaper || [1, 1, 1]);

		// renderXerox
		const run = (name: string, prog: Program, tg: Target | null, setup: (a: RunApi) => void) =>
			H.run(name, prog, tg, a => { a.f('uOff', 0, 0); a.f('uImg', w, h); setup(a); });
		run('PREP', H.PR.prep, S.prep, a => { a.t('uSrc', srcTex); a.f('uSrcRes', srcW, srcH); a.f('uSmoothPx', P.smooth * srcW / P.printW); a.f('uSrcPaper', ...(P.srcPaper || [1, 1, 1])); a.f('uPaper', 1, 1, 1); });
		run('XLUM', R.xlum, X.xa, a => { a.f('uPxMm', pxmm); a.t('uPrep', S.prep.t[0]); a.f('uDark', P.dark); a.f('uSoft', P.soft); a.f('uMotion', P.motion); a.f('uPhoto', P.photo); a.f('uLpi', P.lpi); a.f('uLid', P.lid); a.f('uTexPx', P.tex); });
		const bl = (label: string, src: Target, dst: Target, dx: number, dy: number, sig: number) => run(`BLUR ${label}`, H.PR.blur, dst, a => { a.t('uTexA', src.t[0]); a.t('uTexB', src.t[src.t.length > 1 ? 1 : 0]); a.f('uDir', dx, dy); a.f('uSig', sig); });
		const G = light ? 1 : Math.max(1, Math.round(P.gens));
		for (let g = 1; g <= G; g++) {
			const sig = Math.max(.05, P.genSpread * pxmm * (g === 1 ? .6 : 1));
			bl(`gen${g} H`, X.xa, X.xb, 1, 0, sig); bl(`gen${g} V`, X.xb, X.xc, 0, 1, sig);
			run(`XGEN ${g}`, R.xgen, X.xa, a => { a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uD', X.xc.t[0]); a.t('uGreen', H.greenTex); a.f('uThr', P.thr); a.f('uGrain', P.grain); a.f('uDust', P.dust); a.f('uFog', P.fog); a.f('uStreak', P.streak); a.f('uGen', g); a.f('uTDry', P.tonerDry ? 1 : 0); });
		}
		// physical dirt of the sheet (hairs, lint, scratches, prints, fuser smear) over the last copy
		run('XDIRT', R.xdirt, X.xb, a => { a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uD', X.xa.t[0]); a.f('uHair', P.hairs); a.f('uScratch', P.scratch); a.f('uPrint', P.prints); a.f('uSmear', P.smear); });
		const DT = X.xb;
		// large solids (edge effect): density heavily blurred at ¼
		bl('sol ¼ H', DT, S.qtmp, 1, 0, 1.1 * pxmm / 4); bl('sol ¼ V', S.qtmp, X.xs, 0, 1, 1.1 * pxmm / 4);
		const hasColor = nk > 0;
		if (hasColor) {
			bl('ps ¼ H', S.prep, S.qtmp, 1, 0, Math.max(.3, .12 * pxmm / 4)); bl('ps ¼ V', S.qtmp, X.xq1, 0, 1, Math.max(.3, .12 * pxmm / 4));
			run('XID', R.xid, X.xq2, a => { a.t('uPS', X.xq1.t[0]); a.fv('uKey', keyLin, 3); a.t('uIdMap', idTex); a.i('uUseMap', useMap); a.i('uNk', nk); a.f('uSrcPaperL', ...srcPaperLin); a.f('uMinL', .32); a.f('uPxMm', pxmm); a.f('uVoteMm', P.colorSmooth); });
			// MARKER (lab v23.6): the ¼ mask only gives the IDENTITY (XID's vote, xq2). The edge comes from the original at full
			// resolution (XEDGE: each pixel takes the label of the neighbouring ¼ texels of its own colour; xq1 still holds the
			// original at ¼) and is smoothed by the same .8 mm, but at full resolution: no visible edge copies the ¼ grid.
			// The blur goes in stages: BLUR takes 13 samples at σ/3, and σ > 3 px over an unsmoothed input would skip pixels.
			let FE: Target | null = null;
			if (P.hand === 1) {
				if (!XE) XE = { e1: H.target(w, h, 2), e2: H.target(w, h, 2), e3: H.target(w, h, 2) };
				const E = XE;
				run('XEDGE', R.xedge, E.e1, a => { a.t('uPrep', S.prep.t[0]); a.t('uPS', X.xq1.t[0]); a.t('uLA', X.xq2.t[0]); a.t('uLB', X.xq2.t[1]); a.t('uIdMap', idTex); a.i('uUseMap', useMap); a.i('uNk', nk); a.f('uSrcPaperL', ...srcPaperLin); a.f('uMinL', .32); a.f('uPxMm', pxmm); });
				const sf = Math.max(1, .8 * pxmm); let src = E.e1, acc = 0, rem = sf * sf, n = 0;   // the same .8 mm of sheet at any resolution (no floor in texels: there is no grid left to hide)
				while (rem > 1e-3) {
					const sg = Math.min(Math.sqrt(rem), acc > 0 ? 3 * acc : 3); const dst = src === E.e3 ? E.e1 : E.e3; n++;
					bl(`edge${n} H`, src, E.e2, 1, 0, sg); bl(`edge${n} V`, E.e2, dst, 0, 1, sg); src = dst; rem -= sg * sg; acc = Math.sqrt(acc * acc + sg * sg);
				}
				FE = src;
			}
			// The ¼ mask blur: the watercolour reads it (the lab's .3 floor); for the marker it is identity only, with the 1.5-texel
			// floor of v3.20.1 kept as the lab keeps it (nothing visible reads it since v23.6).
			const sg = P.hand === 1 ? Math.max(1.5, .8 * pxmm / 4) : Math.max(.3, P.sloppy * pxmm / 4);
			bl('mask H', X.xq2, S.qtmp, 1, 0, sg); bl('mask V', S.qtmp, X.xq1, 0, 1, sg);
			const FT = FE || X.xq1;
			run('XCOLOR', R.xcolor, X.xc, a => {
				a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uMA', X.xq1.t[0]); a.t('uMB', X.xq1.t[1]); a.t('uFA', FT.t[0]); a.t('uFB', FT.t[1]); a.fv('uMk', mkLin, 3); a.i('uNk', nk); a.i('uMed', P.hand);
				a.fv('uCOff', off, 2); a.f('uWobble', P.wobble); a.f('uCover', P.cover); a.f('uStroke', P.stroke); a.f('uAng', P.strokeAng * Math.PI / 180); a.f('uOverlap', P.overlap); a.f('uStrength', P.strength);
				a.f('uSlop', P.slop); a.f('uDry', P.dry); a.f('uFast', P.fast);
				if (oriSrc === undefined) { H.texFrom(blankOri(), { filter: gl.NEAREST }, oriTex); oriSrc = null; }
				a.t('uOri', oriTex); a.i('uOriRows', ((oriSrc as OriMap | null)?.__srOriRows ?? 0) | 0); a.f('uSheetMm', w / pxmm, h / pxmm); a.f('uWobMm', P.wobMm); a.f('uGran', P.gran); a.f('uDryB', P.dryB); a.f('uBloom', P.bloom);
			});
		}
		run('XCOMP', R.xcomp, S.comp, a => {
			a.f('uPxMm', pxmm); a.t('uD', DT.t[0]); a.t('uSolX', X.xs.t[0]); a.f('uTonerK', P.tonerK); a.t('uC', X.xc.t[0]); a.t('uFib', H.fibTex); a.f('uPaper', ...paperLin);
			a.f('uHollow', P.hollow); a.f('uBand', P.band); a.f('uPaperTex', P.paperTex); a.f('uFibers', P.fibers); a.f('uHasColor', hasColor ? 1 : 0); a.f('uTDry', P.tonerDry ? 1 : 0);
		});
		run('SCAN', H.PR.scan, toTexture ? S.out : null, a => { a.f('uSeed', P.seed); a.t('uComp', S.comp.t[0]); a.f('uBlurPx', P.scanBlur); a.f('uNoise', P.scanNoise); a.i('uNorm', 0); a.f('uPaper', ...paperLin); });
	}
	return { render };
}
