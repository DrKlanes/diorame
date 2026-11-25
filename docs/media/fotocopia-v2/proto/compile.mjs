// node compile.mjs <labUrl> — cold compile+link time of FS_XCOLOR variants (new Chrome without shader disk cache per variant)
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const url = process.argv[2]; const only = process.argv[3];
const variants = {
	full: s => s,
	lod: s => lod(s),
	oneInk: s => s.replace('for(int i=0;i<6;i++){ if(i>=uNk) break; float fi=float(i)+uSeed*.371;', 'for(int i=0;i<1;i++){ if(i>=uNk) break; float fi=float(i)+uSeed*.371;'),
	noWater: s => s.replace('else D=water(i,p,mm,fi,cov);', 'else D=0.;'),
	noMarker: s => s.replace(/if\(uMed==1\) D=marker\([^;]*;/, 'if(uMed==1) D=0.;'),
	noBand: s => s.replace(/if\(band<6\.\)\{[^\n]*\n[^\n]*\}/, ''),
	loops1: s => s.replace('for(int dk=-1; dk<=2; dk++){', 'for(int dk=0; dk<=0; dk++){').replace('for(int dj=-1; dj<=0; dj++){', 'for(int dj=0; dj<=0; dj++){'),
	markerOnlyNoBand: s => variants.noBand(variants.noWater(s)),
	waterOnly: s => variants.noMarker(s),
	markerOnly: s => variants.noWater(s),
	noContinue: s => s.replace('if(lim>1.+6.*h12(vec2(k,fi+12.1+zs))) continue;', '').replace('float dv=v-vcc; if(abs(dv)>wk*.6) continue;', 'float dv=v-vcc;').replace('if(cov<=0.) continue;', ''),
};
function lod(s) { let out = '', i = 0; const key = 'texture(';
	while (true) { const j = s.indexOf(key, i); if (j < 0) { out += s.slice(i); break; } if (/[A-Za-z_]/.test(s[j - 1] || ' ')) { out += s.slice(i, j + key.length); i = j + key.length; continue; }
		let d = 1, k = j + key.length; while (d > 0) { if (s[k] === '(') d++; else if (s[k] === ')') d--; k++; }
		out += s.slice(i, j) + 'textureLod(' + lod(s.slice(j + key.length, k - 1)) + ',0.)'; i = k; }
	return out; }
const res = {};
for (const [name, fn] of Object.entries(variants)) {
	if (only && !only.split(',').includes(name)) continue;
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cmp-'));
	const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: profile, args: ['--no-first-run', '--disable-gpu-shader-disk-cache'] });
	const page = await browser.newPage(); await page.goto(url, { waitUntil: 'load' });
	
	const L = 'C:/Users/Usuario/Desktop/Diorame/lab/tools/studio/';
	const src = new Function('const EX_PXMM=17.2, MAXI=8;' + fs.readFileSync(L + 'shaders.studio.js', 'utf8') + ';' + fs.readFileSync(L + 'shaders.xerox.js', 'utf8') + ';return {fs:FS_XCOLOR, vs:VS, all:{FS_XLUM,FS_XGEN,FS_XID,FS_XEDGE,FS_XDIRT,FS_XCOMP}};')();
	const f = fn(src.fs); if (name !== 'full' && f === src.fs) { res[name] = 'NO CHANGE (pattern not found)'; await browser.close(); continue; }
	res[name] = await page.evaluate((vs, f) => { const gl = document.createElement('canvas').getContext('webgl2'); const p = gl.createProgram();
		const t0 = performance.now();
		for (const [t, s] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, f]]) { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); gl.attachShader(p, sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return 'ERR ' + gl.getShaderInfoLog(sh).slice(0, 200); }
		gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); const ok = gl.getProgramParameter(p, gl.LINK_STATUS);
		return ok ? Math.round(performance.now() - t0) : 'LINK ' + gl.getProgramInfoLog(p).slice(0, 200); }, src.vs, f);
	if (name === 'full') res.chars = src.fs.length;
	await browser.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
}
console.log(JSON.stringify(res));
