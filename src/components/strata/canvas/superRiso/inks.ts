// Super Riso — ink lists and ink picking (CPU). Ported from the lab's superRiso.engine.js.
// Ink names and colours: riso-colors (MIT, Matt DesLauriers) — credited in Attributions.md.
// pickInks is EXPENSIVE (k-means over a 160 px sample): never per frame.

export type RGB = [number, number, number];
export type InkEntry = readonly [name: string, hex: string];
export type InkMode = 'own' | 'cmyk' | 'dpal' | 'riso';
export type PickedInks = { inks: string[]; names: string[]; opac: number[]; srcPaper: RGB };

export const MAXI = 8;

export const RISO: readonly InkEntry[] = [["Black","#000000"],["Burgundy","#914e72"],["Blue","#0078bf"],["Green","#00a95c"],["Medium Blue","#3255a4"],["Bright Red","#f15060"],["RisoFederal Blue","#3d5588"],["Purple","#765ba7"],["Teal","#00838a"],["Flat Gold","#bb8b41"],["Hunter Green","#407060"],["Red","#ff665e"],["Brown","#925f52"],["Yellow","#ffe800"],["Marine Red","#d2515e"],["Orange","#ff6c2f"],["Fluorescent Pink","#ff48b0"],["Light Gray","#88898a"],["Metallic Gold","#ac936e"],["Crimson","#e45d50"],["Fluorescent Orange","#ff7477"],["Cornflower","#62a8e5"],["Sky Blue","#4982cf"],["Sea Blue","#0074a2"],["Lake","#235ba8"],["Indigo","#484d7a"],["Midnight","#435060"],["Mist","#d5e4c0"],["Granite","#a5aaa8"],["Charcoal","#70747c"],["Smoky Teal","#5f8289"],["Steel","#375e77"],["Slate","#5e695e"],["Turquoise","#00aa93"],["Emerald","#19975d"],["Grass","#397e58"],["Forest","#516e5a"],["Spruce","#4a635d"],["Moss","#68724d"],["Sea Foam","#62c2b1"],["Kelly Green","#67b346"],["Light Teal","#009da5"],["Ivy","#169b62"],["Pine","#237e74"],["Lagoon","#2f6165"],["Violet","#9d7ad2"],["Orchid","#aa60bf"],["Plum","#845991"],["Raisin","#775d7a"],["Grape","#6c5d80"],["Scarlet","#f65058"],["Cranberry","#d1517a"],["Maroon","#9e4c6e"],["Brick","#a75154"],["Light Lime","#e3ed55"],["Sunflower","#ffb511"],["Melon","#ffae3b"],["Apricot","#f6a04d"],["Paprika","#ee7f4b"],["Pumpkin","#ff6f4c"],["Bright Olive Green","#b49f29"],["Bright Gold","#ba8032"],["Copper","#bd6439"],["Mahogany","#8e595a"],["Bisque","#f2cdcf"],["Bubble Gum","#f984ca"],["Light Mauve","#e6b5c9"],["Dark Mauve","#bd8ca6"],["Gray","#928d88"],["Aqua","#5ec8e5"],["Mint","#82d8d5"],["Fluorescent Yellow","#ffe900"],["Fluorescent Red","#ff4c65"],["Fluorescent Green","#44d62c"]];
const OPAQUE: Readonly<Record<string, number>> = {"Black":.32,"Cornflower":.35,"Light Gray":.4,"Gray":.35,"Granite":.35,"Metallic Gold":.4,"Charcoal":.25,"Midnight":.2};
const PRINTED: Readonly<Record<string, string>> = {"#000000":"#25222a"};              // el negro riso nunca es negro puro
export const DIORAME_RISO: readonly InkEntry[] = [
	["Black","#000000"],["Midnight","#435060"],["Mist","#d5e4c0"],["White","#ffffff"],
	["Hunter Green","#407060"],["Teal","#00838a"],["Green","#00a95c"],["Kelly Green","#67b346"],["Light Lime","#e3ed55"],
	["RisoFederal Blue","#3d5588"],["Medium Blue","#3255a4"],["Blue","#0078bf"],["Cornflower","#62a8e5"],["Aqua","#5ec8e5"],
	["Burgundy","#914e72"],["Violet","#9d7ad2"],["Brick","#a75154"],["Bright Red","#f15060"],["Fluorescent Pink","#ff48b0"],["Light Mauve","#e6b5c9"],
	["Flat Gold","#bb8b41"],["Orange","#ff6c2f"],["Yellow","#ffe800"],["Sunflower","#ffb511"]
];
export const CMYK_RISO: readonly InkEntry[] = [["Fluorescent Pink","#ff48b0"],["Yellow","#ffe800"],["Medium Blue","#3255a4"],["Black","#000000"]];

// ── color
export const hex2rgb = (h: string): RGB => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16) / 255) as RGB; };
const rgb2hex = (c: RGB): string => '#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
const s2l = (v: number) => v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4);
const l2s = (x: number) => x <= .0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - .055;
export const lin = (c: RGB): RGB => c.map(s2l) as RGB;
export function oklab(c: RGB): RGB {
	const [r, g, b] = lin(c);
	const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
	return [.2104542553 * l + .7936177850 * m - .0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .8086757660 * s];
}
export const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const dP = (x: RGB, y: RGB) => Math.hypot(x[0] - y[0], 2 * (x[1] - y[1]), 2 * (x[2] - y[2]));
export const printedHex = (h: string) => PRINTED[h.toLowerCase()] || h;
export const opacityFor = (name: string, hex: string) => OPAQUE[name] ?? (oklab(hex2rgb(hex))[0] < .3 ? .3 : .15);

export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// ── elección de tintas (CPU). En Diorame puede salir directamente de los colores usados en la escena.
type Cluster = { c: RGB; n: number; L: RGB };
function sampleSource(src: CanvasImageSource & { width: number; height: number }, maxSide = 160): RGB[] {
	const W = src.width, H = src.height, s = Math.min(1, maxSide / Math.max(W, H)); const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
	const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h);
	const d = x.getImageData(0, 0, w, h).data; const px: RGB[] = []; for (let i = 0; i < d.length; i += 4) px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]); return px;
}
function kmeans(px: RGB[], K: number): Cluster[] {
	const L = px.map(oklab); let C: RGB[] = []; const r = rng(5); C.push(L[Math.floor(r() * L.length)]);
	while (C.length < K) { let best: RGB | null = null, bd = -1; for (let t = 0; t < 200; t++) { const p = L[Math.floor(r() * L.length)]; const d = Math.min(...C.map(c => dist(c, p))); if (d > bd) { bd = d; best = p; } } C.push(best!); }
	const lab = new Array(L.length).fill(0); let RGBs: RGB[] = [], CNT: number[] = [];
	for (let it = 0; it < 18; it++) {
		for (let i = 0; i < L.length; i++) { let b = 0, bd = 1e9; for (let k = 0; k < K; k++) { const d = dist(L[i], C[k]); if (d < bd) { bd = d; b = k; } } lab[i] = b; }
		const S = C.map(() => [0, 0, 0, 0]); for (let i = 0; i < L.length; i++) { const s = S[lab[i]]; s[0] += px[i][0]; s[1] += px[i][1]; s[2] += px[i][2]; s[3]++; }
		RGBs = S.map(s => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] as RGB : [1, 1, 1] as RGB); CNT = S.map(s => s[3]); C = RGBs.map((c, k) => CNT[k] ? oklab(c) : C[k]);
	}
	return RGBs.map((c, k) => ({ c, n: CNT[k], L: oklab(c) })).sort((a, b) => b.n - a.n);
}
function analyze(src: CanvasImageSource & { width: number; height: number }, maxN: number, paperMode: number): { chosen: Cluster[]; srcPaper: RGB } {
	const px = sampleSource(src); const cl = kmeans(px, 16); const total = px.length;
	let paper = cl.find(k => k.L[0] > .82 && Math.hypot(k.L[1], k.L[2]) < .05 && k.n / total > .05);
	if (!paper && paperMode === 1) { const light = cl.filter(k => k.L[0] > .65 && Math.hypot(k.L[1], k.L[2]) < .06 && k.n / total > .02).sort((a, b) => b.L[0] - a.L[0]); if (light.length) paper = light[0]; }
	const srcPaper: RGB = paper ? paper.c : [1, 1, 1];
	const seg = (a: RGB, b: RGB) => { const A = lin(a), B = lin(b), out: RGB[] = []; for (let t = 0; t <= 1.0001; t += .1) { out.push(oklab(A.map((v, i) => l2s(v + (B[i] - v) * t)) as RGB)); } return out; };
	const cands = cl.filter(k => k !== paper && k.n / total > .002);
	const chosen: Cluster[] = []; let reach: RGB[] = [oklab(srcPaper)];
	const err = (L: RGB) => Math.min(...reach.map(r => dP(r, L)));
	const TINT = .02;
	for (let it = 0; it < maxN; it++) {
		let best: Cluster | null = null, bg = 0;
		for (const c of cands) {
			if (chosen.includes(c) || chosen.some(k => dP(k.L, c.L) < .09)) continue;
			const extra = seg(srcPaper, c.c).concat(...chosen.map(k => seg(k.c, c.c)));
			let g = 0; for (const j of cl) { const e = err(j.L); const e0 = Math.max(0, e - TINT), e1 = Math.max(0, Math.min(e, ...extra.map(r => dP(r, j.L))) - TINT); g += j.n * (e0 - e1); }
			if (g > bg) { bg = g; best = c; }
		}
		if (!best || bg / total < .0006) break;
		const picked = best;
		chosen.push(picked); reach = reach.concat(seg(srcPaper, picked.c), ...chosen.slice(0, -1).map(k => seg(k.c, picked.c)));
	}
	return { chosen, srcPaper };
}
export function nearestFrom(list: readonly InkEntry[], c: RGB, used: Set<string>): InkEntry | null {
	let best: InkEntry | null = null, bd = 1e9; const L = oklab(c);
	for (const [name, hex] of list) { if (used.has(name)) continue; const d = dP(oklab(hex2rgb(hex)), L); if (d < bd) { bd = d; best = [name, hex]; } }
	return best;
}
// mode: 'own' | 'cmyk' | 'dpal' | 'riso'  →  { inks:[hex], names:[name], opac:[n], srcPaper }
export function pickInks(src: CanvasImageSource & { width: number; height: number }, mode: InkMode, maxN: number, paperMode = 1): PickedInks {
	const { chosen, srcPaper } = analyze(src, mode === 'cmyk' ? 4 : maxN, paperMode);
	let inks: InkEntry[] = [];
	if (mode === 'cmyk') inks = CMYK_RISO.slice();
	else if (mode === 'own') inks = chosen.map(k => ["", rgb2hex(k.c)] as const);
	else {
		const list = (mode === 'dpal' ? DIORAME_RISO : RISO).filter(x => x[0] !== 'White'); const used = new Set<string>();
		for (const k of chosen) { const b = nearestFrom(list, k.c, used); if (b) { used.add(b[0]); inks.push(b); } }
	}
	if (!inks.length) inks = [["Black", "#000000"]];
	inks = inks.slice(0, MAXI).sort((a, b) => oklab(hex2rgb(printedHex(b[1])))[0] - oklab(hex2rgb(printedHex(a[1])))[0]);   // claras primero
	return { inks: inks.map(x => x[1]), names: inks.map(x => x[0]), opac: inks.map(x => opacityFor(x[0], x[1])), srcPaper };
}
