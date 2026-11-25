// node zoomlat.mjs <labUrl> <tag> <outDir> <dior> [--vw=1600 --vh=1000 --dpr=1 --cpu=1]  — what the user sees WHILE zooming a .dior and how long until it is sharp
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const [url, tag, outDir, diorPath] = process.argv.slice(2);
const arg = (k, d) => +((process.argv.find(a => a.startsWith('--' + k + '=')) || '=' + d).split('=')[1]);
const vw = arg('vw', 1600), vh = arg('vh', 1000), dpr = arg('dpr', 1), cpu = arg('cpu', 1);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zoomlat-'));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: profile, args: ['--no-first-run', `--window-size=${vw},${vh}`], defaultViewport: { width: vw, height: vh, deviceScaleFactor: dpr } });
const page = await browser.newPage(); const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.lab && window.lab.ready(), { timeout: 90000, polling: 100 });
const settled = async () => { await sleep(700); await page.waitForFunction(() => /\d+ ms$/.test(document.getElementById('status').textContent), { timeout: 120000, polling: 50 }); await sleep(300); };
await (await page.$('#file')).uploadFile(diorPath);
await page.waitForFunction(() => !document.getElementById('frameSec').hidden, { timeout: 90000, polling: 100 }); await settled();
await page.evaluate(() => { const b = [...document.querySelectorAll('#tech button')].find(e => e.textContent.trim().startsWith('Fotocopia')); b.click(); }); await sleep(300);
await page.evaluate(() => { const b = [...document.querySelectorAll('#styles button')].find(e => e.textContent.trim().startsWith('Fanzine a rotulador')); b.click(); }); await settled();
if (cpu > 1) { const c = await page.createCDPSession(); await c.send('Emulation.setCPUThrottlingRate', { rate: cpu }); }
// time inside dior-render and inside the technique, from the page's own functions
await page.evaluate(() => { window.__t = { dior: [], fx: [] }; const M = dior.M, f = M.renderDior; dior.M = { ...M, renderDior: async (...a) => { const t0 = performance.now(); const r = await f(...a); window.__t.dior.push(Math.round(performance.now() - t0)); return r; } }; });
const box = await (await page.$('#stage')).boundingBox(); await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
const clip = () => page.$('#stage').then(e => e.boundingBox()).then(b => ({ x: b.x, y: b.y, width: b.width, height: b.height }));
for (let i = 0; i < 8; i++) { await page.mouse.wheel({ deltaY: -60 }); await sleep(50); }
const tEnd = Date.now();
await sleep(100); await page.screenshot({ path: path.join(outDir, `${tag}-during.png`), clip: await clip() });
await page.waitForFunction(() => !nav && /\d+ ms$/.test(document.getElementById('status').textContent) && /fotocopia/.test(document.getElementById('status').textContent), { timeout: 120000, polling: 30 });
const tSharp = Date.now() - tEnd; await sleep(300);
await page.screenshot({ path: path.join(outDir, `${tag}-after.png`), clip: await clip() });
const info = await page.evaluate(() => { const c = document.getElementById('c'), s = document.getElementById('stage').getBoundingClientRect(); return { status: document.getElementById('status').textContent, canvasW: c.width, stageCssW: Math.round(s.width), dpr: devicePixelRatio, upscale: +(s.width * devicePixelRatio / c.width).toFixed(2), zoom: document.getElementById('frameInfo').textContent, renderDiorMs: window.__t.dior }; });
console.log(JSON.stringify({ tag, vw, vh, cpu, msUntilSharp: tSharp, ...info }));
await browser.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
