// Tab left open, a deploy happens, the user comes back to the tab (no reload): does the update toast appear?
// node staleopen.mjs <url> <profile> <deployDirNext> [--wait=70000]
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// puppeteer-core is not a dependency of the app: install it in a temporary folder and run from there (README.md).
const puppeteer = (await import(pathToFileURL(createRequire(path.join(process.cwd(), 'x.js')).resolve('puppeteer-core')).href)).default;
const [url, profile, next] = process.argv.slice(2);
const waitMs = +((process.argv.find(a => a.startsWith('--wait=')) || '--wait=70000').split('=')[1]);
const browser = await puppeteer.launch({ executablePath: (process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'), headless: true, userDataDir: profile, defaultViewport: { width: 1366, height: 1024 } });
let page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle2' }); await new Promise(r => setTimeout(r, 4000));
await page.reload({ waitUntil: 'networkidle2' }); await new Promise(r => setTimeout(r, 3000));
const ctl = await page.evaluate(() => !!navigator.serviceWorker.controller);
await fetch(new URL('/__deploy?dir=' + encodeURIComponent(next), url));
const toastNow = () => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].some(n => /versi|Recargar|Reload/i.test(n.textContent || '')));
await new Promise(r => setTimeout(r, waitMs));
const before = await toastNow();
const other = await browser.newPage(); await other.goto('about:blank'); await other.bringToFront(); await new Promise(r => setTimeout(r, 1000));
await page.bringToFront();
const t0 = Date.now(); let seen = null;
while (Date.now() - t0 < 30000) { if (await toastNow()) { seen = Date.now() - t0; break; } await new Promise(r => setTimeout(r, 250)); }
console.log(JSON.stringify({ url, controlled: ctl, toastBeforeReturning: before, toastAfterReturningMs: seen }));
await browser.close();
