// Super Riso — C2a shader variants, derived from the lab shaders by EXACT text patches (each patch
// must match exactly once, or the module throws and Super Riso disables itself for the session).
// The lab shaders in shadersCommon/Separation/Print stay byte-identical and are the reference.
//
// LOSSLESS (the full level since L1, exports included; srlossless=0 under srdebug compares against
// the lab shaders; verified identical on a frozen frame):
//   SPREAD_LL  an ink with no density, no blurred coverage and no local density is skipped: the lab
//              computes mix(edge, v, tone) with tone = 1 and v = 0 there, i.e. exactly 0.
//
// PREVIEW (srpreview=1 = all bits, srprevmask=N for one at a time; live only, NEVER in exports):
//   1 SEP0     no variant since v3.20.13 (lab v21: SEP0 is one trilinear LUT read; the bit does nothing)
//   2 SPREAD   3×3 bleed kernel instead of 5×5
//   4 SCAN     3×3 scanner kernel instead of 5×5 (the outer taps weigh ≲2 % at r ≈ .7–1 px)
//   8 SCREEN   2×2 grain subsamples instead of 3×3

import { FS_SPREAD, FS_SCAN, FS_SCREEN } from './shadersPrint';

function patch(src: string, from: string, to: string): string {
	const first = src.indexOf(from);
	if (first < 0 || src.indexOf(from, first + 1) >= 0) throw new Error(`[SuperRiso] shader patch does not match exactly once: ${from.slice(0, 60)}`);
	return src.slice(0, first) + to + src.slice(first + from.length);
}

// ── Lossless ───────────────────────────────────────────────────────────────────────────────────
// v3.20.13 (lab v21): BLUR1 and SEP0_LL retired with the old SEP0 — the new SEP0 is one LUT read and no
// longer needs the blurred PREP.
const SPREAD_INK = '    float v=pick(a,b,i); float d=pick(sA,sB,i);\n';
export const FS_SPREAD_LL = patch(FS_SPREAD, SPREAD_INK,
	SPREAD_INK + '    if(v<=0. && d<=0. && pick(lA,lB,i)<=0.) continue;\n');

// ── Preview ────────────────────────────────────────────────────────────────────────────────────
export const PV_SEP0 = 1, PV_SPREAD = 2, PV_SCAN = 4, PV_SCREEN = 8, PV_ALL = 15;

export const FS_SPREAD_PV = patch(FS_SPREAD_LL,
	'for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA',
	'for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/2.); vec2 o2=vec2(i,j)*r*.5/uRes; a+=texture(uScrA');

export const FS_SCAN_PV = patch(FS_SCAN,
	'for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l',
	'for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ float k=exp(-float(i*i+j*j)/(2.*r*r)); a+=s2l');

export const FS_SCREEN_PV = patch(patch(patch(FS_SCREEN,
	'for(int j=0;j<3;j++) for(int i=0;i<3;i++){\n    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-1.)/3.*px;',
	'for(int j=0;j<2;j++) for(int i=0;i<2;i++){\n    vec2 p=mm/tx+mod(vec2(s*131.,s*57.),1024.)+(vec2(i,j)-.5)/2.*px;'),
	'return cov/9.; }', 'return cov/4.; }'),
	'// El campo está ecualizado: umbral x → cobertura x. Se integra con 9 submuestras por píxel, como el sensor del escáner.',
	'// [preview C2a] 4 submuestras por píxel en lugar de 9.');

// ── Present (srpipe=2): exact copy of a result texture to the canvas ────────────────────────────
export const FS_COPY = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uT; out vec4 o;
void main(){ o=texelFetch(uT, ivec2(gl_FragCoord.xy), 0); }`;
