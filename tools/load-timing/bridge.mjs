// Diorame → Super Riso Lab, N openings through the real UI (export button › Super Riso ↗).
// node bridge.mjs <diorameUrl> <profileDir> [--runs=20] [--fresh-lab] [--restart] [--deploy=<dir>@<n>]
//   --fresh-lab     close the Lab tab before each opening (every opening loads the Lab page)
//   --restart       a new Chrome per opening, without GPU shader disk cache: every Lab load compiles its shaders
//                   (what happens after a Lab deploy that changes shaders, in a private window or on a new device)
//   --deploy=dir@n  before opening n, switch the Diorame server (same host:port) to dir (a deploy while the tab is open)
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// puppeteer-core is not a dependency of the app: install it in a temporary folder and run from there (README.md).
const puppeteer = (await import(pathToFileURL(createRequire(path.join(process.cwd(), 'x.js')).resolve('puppeteer-core')).href)).default;
const [url, profile] = process.argv.slice(2);
const opt = Object.fromEntries(process.argv.slice(4).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const runs = +(opt.runs || 20);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [deployDir, deployAt] = opt.deploy ? String(opt.deploy).split('@') : [null, -1];
const results = [];

async function session(first, count) {
	const args = ['--no-first-run', '--window-size=1366,1024'].concat(opt.restart ? ['--disable-gpu-shader-disk-cache'] : []);
	const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile, args, defaultViewport: { width: 1366, height: 1024 } });
	const page = await browser.newPage();
	// never send analytics from a measurement (the production host loads GoatCounter)
	const cdp = await page.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setBlockedURLs', { urls: ['*gc.zgo.at*', '*goatcounter.com*'] });
	page.on('console', m => { if (/superriso|Failed to fetch|dynamically imported/i.test(m.text())) console.error('[diorame]', m.text().slice(0, 200)); });
	await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
	const clickText = async re => page.evaluate(src => {
		const r = new RegExp(src);
		const el = [...document.querySelectorAll('button, [role=option], [role=menuitem], [role=button], div')].reverse().find(e => r.test(e.textContent || '') && e.offsetParent && (e.children.length < 6));
		if (el) { el.click(); return true; } return false;
	}, re.source);
	if (!(await clickText(/^(Cargar escena de ejemplo|Load example scene)$/))) throw new Error('example button not found');
	await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 60000 }).catch(() => {});
	await new Promise(r => setTimeout(r, 2500));
	const labPage = async () => { for (const t of browser.targets()) if (t.type() === 'page' && /:4175|super-riso/.test(t.url())) return t.page(); return null; };
	for (let i = first; i < first + count; i++) {
		if (opt['fresh-lab']) { const lp = await labPage(); if (lp) await lp.close(); }
		if (deployDir && i === +deployAt) { await fetch(new URL('/__deploy?dir=' + encodeURIComponent(deployDir), url)); console.error('deployed', deployDir); }
		await page.bringToFront();
		const t0 = Date.now();
		let found = false;
		for (let k = 0; k < 4 && !found; k++) { await page.mouse.click(1247, 32); await new Promise(r => setTimeout(r, 600)); found = await clickText(/^Super Riso ↗/); if (!found) { await page.keyboard.press('Escape'); await new Promise(r => setTimeout(r, 800)); } }
		if (!found) { results.push({ i, err: 'menu option not found' }); continue; }
		const toast = await page.waitForFunction(() => {
			const s = [...document.querySelectorAll('[data-sonner-toast]')].map(n => n.textContent || '').join(' | ');
			return /Abierto en Super Riso|Opened in Super Riso/.test(s) ? 'ok' : /No se pudo abrir Super Riso|Could not open Super Riso/.test(s) ? 'FAIL' : null;
		}, { timeout: 120000, polling: 100 }).then(h => h.jsonValue()).catch(() => 'timeout');
		const tToast = Date.now() - t0;
		let lab = null;
		const lp = await labPage();
		if (lp) {
			await new Promise(r => setTimeout(r, 800));
			lab = await lp.waitForFunction(() => {
				const st = document.getElementById('status')?.textContent || '';
				const fr = document.getElementById('frameSec');
				if (/No se pudo|no se puede|no parece/.test(st)) return 'LAB ERROR: ' + st.slice(0, 120);
				if (fr && !fr.hidden && !/Abriendo|Dibujando|Preparando/.test(st)) return 'dior: ' + st.slice(0, 60);
				return null;
			}, { timeout: 60000, polling: 200 }).then(h => h.jsonValue()).catch(async () => 'lab no dior: ' + (await lp.evaluate(() => document.getElementById('status')?.textContent || '').catch(() => '?')).slice(0, 80));
		}
		results.push({ i, toast, tToast, lab });
		console.error(JSON.stringify(results.at(-1)));
		await page.evaluate(() => document.querySelectorAll('[data-sonner-toast] button').forEach(b => { if (/close|cerrar/i.test(b.getAttribute('aria-label') || '')) b.click(); }));
		await new Promise(r => setTimeout(r, 600));
	}
	await browser.close();
}

if (opt.restart) for (let i = 1; i <= runs; i++) await session(i, 1);
else await session(1, runs);
const ok = results.filter(r => r.toast === 'ok' && r.lab && r.lab.startsWith('dior')).length;
console.log(JSON.stringify({ url, runs, ok, fail: runs - ok, results }));
