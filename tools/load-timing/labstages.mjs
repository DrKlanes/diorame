// Lab startup, split: node labstages.mjs <labUrl> <profileDir> [--cold]
//   --cold: no GPU shader disk cache (and a new browser per call): every program is compiled again.
// Reports ms from navigation start: dcl, engine (eng created), ready (lab.ready()), and the time spent INSIDE WebGL
// compile/link/status calls (ANGLE compiles lazily: the cost lands on the first status query or the first draw).
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// puppeteer-core is not a dependency of the app: install it in a temporary folder and run from there (README.md).
const puppeteer = (await import(pathToFileURL(createRequire(path.join(process.cwd(), 'x.js')).resolve('puppeteer-core')).href)).default;
const [labUrl, profile] = process.argv.slice(2);
const cold = process.argv.includes('--cold');
const browser = await puppeteer.launch({ executablePath: (process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'), headless: true, userDataDir: profile, args: ['--no-first-run'].concat(cold ? ['--disable-gpu-shader-disk-cache'] : []) });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
	const M = (window.__m = { glMs: 0, glCalls: 0, programs: 0, firstDrawMs: 0 });
	const t = k => { if (M[k] == null) M[k] = Math.round(performance.now()); };
	document.addEventListener('DOMContentLoaded', () => t('dcl'));
	addEventListener('load', () => t('load'));
	const P = WebGL2RenderingContext.prototype;
	const wrap = (name, onCall) => { const f = P[name]; P[name] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { const dt = performance.now() - t0; M.glMs += dt; M.glCalls++; onCall && onCall(dt); } }; };
	['compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'getUniformLocation', 'getAttribLocation'].forEach(n => wrap(n));
	wrap('linkProgram', () => M.programs++);
	// first use of each program: ANGLE may finish the compile at the first draw
	const used = new WeakSet(), useProgram = P.useProgram, draw = P.drawArrays;
	let pending = false;
	P.useProgram = function (p) { if (p && !used.has(p)) { used.add(p); pending = true; } return useProgram.call(this, p); };
	P.drawArrays = function (...a) { const t0 = performance.now(); try { return draw.apply(this, a); } finally { if (pending) { M.firstDrawMs += performance.now() - t0; pending = false; } } };
	const iv = setInterval(() => { try { if (window.lab && window.lab.eng && window.lab.eng()) { t('engine'); M.glAtEngine ??= Math.round(M.glMs); } if (window.lab && window.lab.ready && window.lab.ready()) { t('ready'); M.glAtReady = Math.round(M.glMs); M.firstDrawAtReady = Math.round(M.firstDrawMs); clearInterval(iv); } } catch (_) {} }, 10);
});
await page.goto(labUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
const t0 = Date.now();
let m; while (Date.now() - t0 < 60000) { m = await page.evaluate(() => window.__m); if (m.ready) break; await new Promise(r => setTimeout(r, 50)); }
console.log(JSON.stringify({ labUrl, cold, dcl: m.dcl, engine: m.engine, ready: m.ready, programs: m.programs, glAtEngine: m.glAtEngine, glAtReady: m.glAtReady, firstDrawAtReady: m.firstDrawAtReady }));
await browser.close();
