// Super Riso start-up in the app, through the real UI: node srstart.mjs <url> <profileDir> [--cold] [--xerox] [--xwait=ms]
//   --cold   no GPU shader disk cache (pass a NEW profile per call): every program is compiled again
//   --xerox  then switch the technique to Fotocopia (its 7 programs are compiled at its first render); --xwait: ms before
// Flow: example scene → «Cine» → click the Super Riso FX button (FX panel expanded) → first engine render.
// Reports ms from each click: firstRender (first gl.flush = end of the first engine.render), onScreen (next rAF), glMs (time
// inside WebGL compile/link/status/uniform calls), programs linked, longTasks (main-thread blocks: the number to compare).
// Same profile without --cold = warm. Created for v3.26.95 (Lab v23.11 start-up port); numbers in README.md.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// puppeteer-core is not a dependency of the app: install it in a temporary folder and run from there (README.md).
const puppeteer = (await import(pathToFileURL(createRequire(path.join(process.cwd(), 'x.js')).resolve('puppeteer-core')).href)).default;
const [url, profile] = process.argv.slice(2);
const cold = process.argv.includes('--cold'), xerox = process.argv.includes('--xerox'), xwait = +((process.argv.find(a => a.startsWith('--xwait=')) || '=0').split('=')[1]);
const browser = await puppeteer.launch({ executablePath: (process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'), headless: true, userDataDir: profile,
	args: ['--no-first-run', '--window-size=1366,1024'].concat(cold ? ['--disable-gpu-shader-disk-cache'] : []), defaultViewport: { width: 1366, height: 1024 } });
const page = await browser.newPage();
// never send analytics from a measurement (the production host loads GoatCounter)
const cdp = await page.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setBlockedURLs', { urls: ['*gc.zgo.at*', '*goatcounter.com*'] });
const errs = []; page.on('console', m => { if (/SuperRiso|error/i.test(m.text())) errs.push(m.text().slice(0, 200)); }); page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.evaluateOnNewDocument(() => {
	try { localStorage.setItem('diorame-fx-expanded', 'true'); } catch (_) {}            // FX panel expanded: the technique selector
	const M = (window.__m = { arm: 0, glMs: 0, programs: 0, longTasks: [] });
	const P = WebGL2RenderingContext.prototype, now = () => performance.now();
	const wrap = (name, onCall) => { const f = P[name]; P[name] = function (...a) { const t0 = now(); try { return f.apply(this, a); } finally { if (M.arm) M.glMs += now() - t0; onCall && onCall(); } }; };
	['compileShader', 'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'getShaderInfoLog', 'getUniformLocation', 'getActiveUniform'].forEach(n => wrap(n));
	wrap('linkProgram', () => { if (M.arm) M.programs++; });
	// the first flush after the click (for Fotocopia: after one of its programs was linked) ends the first engine.render
	wrap('flush', () => { if (M.arm && M.flush0 == null && (!M.needLink || M.programs > 0)) { M.flush0 = now() - M.arm; requestAnimationFrame(() => { M.raf = now() - M.arm; }); } });
	try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (M.arm && e.startTime >= M.arm - 50) M.longTasks.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: false }); } catch (_) {}
	window.__renderer = () => { const c = document.createElement('canvas').getContext('webgl2'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; };
});
await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
const clickText = async re => page.evaluate(src => {
	const r = new RegExp(src);
	const el = [...document.querySelectorAll('button, [role=option], [role=menuitem], [role=button], div')].reverse().find(e => r.test((e.textContent || '').trim()) && e.offsetParent && (e.children.length < 6));
	if (el) { el.click(); return true; } return false;
}, re.source);
for (let k = 0; k < 20 && !(await clickText(/^(Cargar escena de ejemplo|Load example scene)$/)); k++) await new Promise(r => setTimeout(r, 300));
await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 60000 }).catch(() => {});
await new Promise(r => setTimeout(r, 1500));
if (!(await clickText(/^(Cine|Cinema)$/))) throw new Error('«Cine» not found');
await new Promise(r => setTimeout(r, 2500));
// the Super Riso button is found by its icon (design-system/icons.ts, 'fx-super-riso')
const clicked = await page.evaluate(() => {
	const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && /cx="16" cy="16" r="1.4"/.test(b.innerHTML));
	if (!b) return false; window.__m.arm = performance.now(); b.click(); return true;
});
if (!clicked) throw new Error('Super Riso button not found');
await page.waitForFunction(() => window.__m.raf != null, { timeout: 60000, polling: 20 }).catch(() => {});
await new Promise(r => setTimeout(r, 1500));
const r = x => x == null ? null : Math.round(x);
const stage = x => ({ firstRender: r(x.flush0), onScreen: r(x.raf), glMs: r(x.glMs), programs: x.programs, longTasks: x.longTasks });
const out = { url, cold, renderer: await page.evaluate(() => window.__renderer()), riso: stage(await page.evaluate(() => window.__m)) };
if (xerox) {
	await new Promise(res => setTimeout(res, xwait));
	const ok = await page.evaluate(() => {
		const el = [...document.querySelectorAll('button, [role=option], [role=button], div')].reverse().find(e => /^(Fotocopia|Photocopy)$/.test((e.textContent || '').trim()) && e.offsetParent && e.children.length < 6);
		if (!el) return false;
		Object.assign(window.__m, { arm: performance.now(), needLink: true, flush0: null, raf: null, glMs: 0, programs: 0, longTasks: [] });
		el.click(); return true;
	});
	if (!ok) throw new Error('«Fotocopia» not found');
	await page.waitForFunction(() => window.__m.raf != null, { timeout: 20000, polling: 20 }).catch(() => {});
	await new Promise(res => setTimeout(res, 1500));
	out.xerox = { xwait, ...stage(await page.evaluate(() => window.__m)) };
}
out.errors = errs;
console.log(JSON.stringify(out));
await browser.close();
