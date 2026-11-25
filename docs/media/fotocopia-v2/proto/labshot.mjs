// node labshot.mjs <labUrl> <tag> <outDir> <diorPath> [--dpr=1] [--zooms=0,6,12] [--style=zine]
// Opens the Lab in a disposable Chrome, opens a .dior through the file input, picks Fotocopia + a style by clicking,
// zooms with the mouse wheel over a fixed point and screenshots the visible stage (what the user sees).
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const [url, tag, outDir, diorPath] = process.argv.slice(2);
const arg = (k, d) => ((process.argv.find(a => a.startsWith('--' + k + '=')) || '=' + d).split('=')[1]);
const dpr = +arg('dpr', 1), zooms = arg('zooms', '0,6,12').split(',').map(Number), style = arg('style', 'Fanzine a rotulador');
const px = +arg('px', .5), py = +arg('py', .5);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'labshot-'));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: profile,
	args: ['--no-first-run', '--window-size=1600,1000'], defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: dpr } });
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.lab && window.lab.ready(), { timeout: 90000, polling: 100 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const settled = async () => { await sleep(700); await page.waitForFunction(() => /\d+ ms$/.test(document.getElementById('status').textContent) || /sin efecto/.test(document.getElementById('status').textContent), { timeout: 90000, polling: 100 }); await sleep(300); };
const input = await page.$('#file'); await input.uploadFile(diorPath);
await page.waitForFunction(() => !document.getElementById('frameSec').hidden, { timeout: 90000, polling: 100 });
await settled();
const clickText = (sel, txt) => page.evaluate((sel, txt) => { const el = [...document.querySelectorAll(sel + ' *')].find(e => e.children.length === 0 && (e.textContent || '').trim() === txt) || [...document.querySelectorAll(sel + ' button')].find(e => (e.textContent || '').trim().startsWith(txt)); if (!el) return false; (el.closest('button') || el).click(); return true; }, sel, txt);
if (!(await clickText('#tech', 'Fotocopia'))) throw new Error('Fotocopia no encontrado');
await sleep(300);
if (style && !(await clickText('#styles', style))) throw new Error('estilo no encontrado: ' + style);
await settled();
const info = () => page.evaluate(() => { const c = document.getElementById('c'), s = document.getElementById('stage').getBoundingClientRect(); return { ver: (document.querySelector('.ver') || {}).textContent, status: document.getElementById('status').textContent, canvas: [c.width, c.height], stageCss: [Math.round(s.width), Math.round(s.height)], zoom: document.getElementById('frameInfo').textContent, dpr: devicePixelRatio, st: { tech: window.lab.st.tech, ppp: window.lab.st.ppp, sheet: window.lab.st.sheet, x: { style: window.lab.st.x.style, hand: window.lab.st.x.hand } } }; });
const out = { url, tag, shots: [], errs };
let done = 0;
for (const z of zooms) {
	const box = await (await page.$('#stage')).boundingBox();
	const mx = box.x + box.width * px, my = box.y + box.height * py;
	await page.mouse.move(mx, my);
	for (; done < z; done++) { await page.mouse.wheel({ deltaY: -60 }); await sleep(60); }
	if (z > 0) { await sleep(500); await settled(); }
	const b2 = await (await page.$('#stage')).boundingBox();
	const file = path.join(outDir, `${tag}-z${z}.png`);
	await page.screenshot({ path: file, clip: { x: b2.x, y: b2.y, width: b2.width, height: b2.height } });
	// the raw preview canvas too (what gets magnified)
	const raw = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
	fs.writeFileSync(path.join(outDir, `${tag}-z${z}-canvas.png`), Buffer.from(raw.split(',')[1], 'base64'));
	out.shots.push({ z, file, ...(await info()) });
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
