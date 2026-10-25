// Super Riso · Fotocopia — the pass chain, ported 1:1 from the lab (engine.studio.js prepareXerox + renderXerox):
//   prep → XLUM → (blur + XGEN) × generations → XDIRT → solids ¼ → [colour: XID → mask blur → XCOLOR] → XCOMP → SCAN
// Same targets at ¼ resolution as the lab. Diorame renders the whole frame at once: uOff = 0, uImg = target size.
// Its own programs and targets are created on the first Fotocopia render (a Riso-only session never pays for them).

import { FS_XLUM, FS_XGEN, FS_XID, FS_XCOLOR, FS_XCOMP, FS_XDIRT } from './shadersXerox';
import { hex2rgb, lin, rng } from './inks';
import { XDEFAULTS, type XeroxEngineParams } from './xeroxParams';
import type { Program, Target, RunApi, TexOpts } from './engine';

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
	let PR: Record<'xlum' | 'xgen' | 'xid' | 'xcolor' | 'xcomp' | 'xdirt', Program> | null = null;
	let XT: Record<'xa' | 'xb' | 'xc' | 'xq1' | 'xq2' | 'xs', Target> | null = null, xw = 0, xh = 0;
	const oriTex = gl.createTexture()!; let oriSrc: unknown = undefined;
	const idTex = gl.createTexture()!; let idSrc: unknown = undefined;
	let blank: HTMLCanvasElement | null = null;
	const blankOri = () => {
		if (!blank) { blank = document.createElement('canvas'); blank.width = blank.height = 1; const x = blank.getContext('2d')!; x.fillStyle = 'rgb(255,128,0)'; x.fillRect(0, 0, 1, 1); }
		return blank;
	};
	function ensure(w: number, h: number) {
		if (!PR) PR = { xlum: H.compile(FS_XLUM), xgen: H.compile(FS_XGEN), xid: H.compile(FS_XID), xcolor: H.compile(FS_XCOLOR), xcomp: H.compile(FS_XCOMP), xdirt: H.compile(FS_XDIRT) };
		if (XT && w === xw && h === xh) return;
		if (XT) Object.values(XT).forEach(H.freeTarget);
		xw = w; xh = h; const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
		XT = { xa: H.target(w, h), xb: H.target(w, h), xc: H.target(w, h), xq1: H.target(qw, qh, 2), xq2: H.target(qw, qh, 2), xs: H.target(qw, qh) };
	}

	/** Renders into the canvas (or shared.out with toTexture). srcW/srcH: the uploaded flattened frame. */
	function render(params: Partial<XeroxEngineParams>, S: XeroxShared, srcTex: WebGLTexture, srcW: number, srcH: number, w: number, h: number, toTexture: boolean) {
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
		run('XLUM', R.xlum, X.xa, a => { a.f('uPxMm', pxmm); a.t('uPrep', S.prep.t[0]); a.f('uDark', P.dark); a.f('uSoft', P.soft); a.f('uMotion', P.motion); a.f('uPhoto', P.photo); a.f('uLpi', P.lpi); a.f('uLid', P.lid); });
		const bl = (label: string, src: Target, dst: Target, dx: number, dy: number, sig: number) => run(`BLUR ${label}`, H.PR.blur, dst, a => { a.t('uTexA', src.t[0]); a.t('uTexB', src.t[src.t.length > 1 ? 1 : 0]); a.f('uDir', dx, dy); a.f('uSig', sig); });
		const G = Math.max(1, Math.round(P.gens));
		for (let g = 1; g <= G; g++) {
			const sig = Math.max(.05, P.genSpread * pxmm * (g === 1 ? .6 : 1));
			bl(`gen${g} H`, X.xa, X.xb, 1, 0, sig); bl(`gen${g} V`, X.xb, X.xc, 0, 1, sig);
			run(`XGEN ${g}`, R.xgen, X.xa, a => { a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uD', X.xc.t[0]); a.t('uGreen', H.greenTex); a.f('uThr', P.thr); a.f('uGrain', P.grain); a.f('uDust', P.dust); a.f('uFog', P.fog); a.f('uStreak', P.streak); a.f('uGen', g); });
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
			// The marker decides its edges stroke by stroke from this mask, read bilinearly at full resolution. The lab never runs
			// below ~7 px/mm, where .8 mm is ≥ 1.5 texels of the ¼ grid; Diorame does (a ~1000 px canvas at Resolution .85 is
			// ~3.9 px/mm: .8 mm = .78 texels) and the barely blurred binary vote then shows the ¼ texel as a staircase.
			// Floor: 1.5 texels for the marker (identical to the lab from 7.5 px/mm up); the watercolour keeps the lab's .3.
			const sg = P.hand === 1 ? Math.max(1.5, .8 * pxmm / 4) : Math.max(.3, P.sloppy * pxmm / 4);
			bl('mask H', X.xq2, S.qtmp, 1, 0, sg); bl('mask V', S.qtmp, X.xq1, 0, 1, sg);
			run('XCOLOR', R.xcolor, X.xc, a => {
				a.f('uPxMm', pxmm); a.f('uSeed', P.seed); a.t('uMA', X.xq1.t[0]); a.t('uMB', X.xq1.t[1]); a.fv('uMk', mkLin, 3); a.i('uNk', nk); a.i('uMed', P.hand);
				a.fv('uCOff', off, 2); a.f('uWobble', P.wobble); a.f('uCover', P.cover); a.f('uStroke', P.stroke); a.f('uAng', P.strokeAng * Math.PI / 180); a.f('uOverlap', P.overlap); a.f('uStrength', P.strength);
				a.f('uSlop', P.slop); a.f('uDry', P.dry); a.f('uFast', P.fast);
				if (oriSrc === undefined) { H.texFrom(blankOri(), { filter: gl.NEAREST }, oriTex); oriSrc = null; }
				a.t('uOri', oriTex); a.f('uSheetMm', w / pxmm, h / pxmm); a.f('uWobMm', P.wobMm); a.f('uGran', P.gran); a.f('uDryB', P.dryB); a.f('uBloom', P.bloom);
			});
		}
		run('XCOMP', R.xcomp, S.comp, a => {
			a.f('uPxMm', pxmm); a.t('uD', DT.t[0]); a.t('uSolX', X.xs.t[0]); a.f('uTonerK', P.tonerK); a.t('uC', X.xc.t[0]); a.t('uFib', H.fibTex); a.f('uPaper', ...paperLin);
			a.f('uHollow', P.hollow); a.f('uBand', P.band); a.f('uPaperTex', P.paperTex); a.f('uFibers', P.fibers); a.f('uHasColor', hasColor ? 1 : 0);
		});
		run('SCAN', H.PR.scan, toTexture ? S.out : null, a => { a.f('uSeed', P.seed); a.t('uComp', S.comp.t[0]); a.f('uBlurPx', P.scanBlur); a.f('uNoise', P.scanNoise); a.i('uNorm', 0); a.f('uPaper', ...paperLin); });
	}
	return { render };
}
