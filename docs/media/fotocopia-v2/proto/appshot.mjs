// node appshot.mjs <url> <tag> <outDir> [--dpr=1] [--style=…]  — Diorame by the UI: example → Cine → Super Riso → Fotocopia; screenshots of the visible canvas
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const [url, tag, outDir] = process.argv.slice(2);
const arg = (k, d) => ((process.argv.find(a => a.startsWith('--' + k + '=')) || '=' + d).split('=')[1]);
const dpr = +arg('dpr', 1), style = arg('style', '');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'appshot-'));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: profile, args: ['--no-first-run', '--window-size=1366,1024'], defaultViewport: { width: 1366, height: 1024, deviceScaleFactor: dpr } });
const page = await browser.newPage(); const sleep = ms => new Promise(r => setTimeout(r, ms));
const cdp = await page.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setBlockedURLs', { urls: ['*googletagmanager.com*', '*google-analytics.com*'] });
await page.evaluateOnNewDocument(() => { try { localStorage.setItem('diorame-fx-expanded', 'true'); } catch (_) {} });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
const clickText = async re => page.evaluate(src => { const r = new RegExp(src); const el = [...document.querySelectorAll('button, [role=option], [role=menuitem], [role=button], div')].reverse().find(e => r.test((e.textContent || '').trim()) && e.offsetParent && (e.children.length < 6)); if (el) { el.click(); return true; } return false; }, re.source);
for (let k = 0; k < 20 && !(await clickText(/^(Cargar escena de ejemplo|Load example scene)$/)); k++) await sleep(300);
await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 60000 }).catch(() => {});
await sleep(1500);
if (!(await clickText(/^(Cine|Cinema)$/))) throw new Error('Cine not found');
await sleep(3000);
const shot = n => page.screenshot({ path: path.join(outDir, `${tag}-${n}.png`) });
await shot('sin');
const ok = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetParent && /cx="16" cy="16" r="1.4"/.test(b.innerHTML)); if (!b) return false; b.click(); return true; });
if (!ok) throw new Error('Super Riso button not found');
await sleep(2500);
if (!(await clickText(/^(Fotocopia|Photocopy)$/))) throw new Error('Fotocopia not found');
await sleep(9000);
if (style) { if (!(await clickText(new RegExp('^' + style)))) throw new Error('style not found'); await sleep(2500); }
await shot('xerox');
const ver = await page.evaluate(() => (document.body.innerText.match(/v?3\.26\.\d+/) || [''])[0]);
console.log(JSON.stringify({ tag, ver, dpr }));
await browser.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
