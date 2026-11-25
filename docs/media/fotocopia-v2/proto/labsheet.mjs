// node labsheet.mjs <labUrl> <tag> <outDir> <imagePath> <style> [--dpr=1] [--ref=4]
// A flat image through the Lab's file input → Fotocopia → style (clicks) → preview canvas + screenshot of the stage.
// --ref=N: also the same sheet rendered N× finer by the page's own engine (same mm), to be box-reduced: calibration only.
import puppeteer from 'puppeteer-core'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const [url, tag, outDir, imgPath, style] = process.argv.slice(2);
const arg = (k, d) => ((process.argv.find(a => a.startsWith('--' + k + '=')) || '=' + d).split('=')[1]);
const dpr = +arg('dpr', 1), ref = +arg('ref', 0), extra = arg('click', '');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'labsheet-'));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, userDataDir: profile, args: ['--no-first-run', '--window-size=1600,1000'], defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: dpr } });
const page = await browser.newPage(); const sleep = ms => new Promise(r => setTimeout(r, ms));
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.lab && window.lab.ready(), { timeout: 90000, polling: 100 });
const settled = async () => { await sleep(900); await page.waitForFunction(() => /\d+ ms$/.test(document.getElementById('status').textContent), { timeout: 120000, polling: 100 }); await sleep(400); };
await (await page.$('#file')).uploadFile(imgPath); await settled();
const clickText = (sel, txt) => page.evaluate((sel, txt) => { const el = [...document.querySelectorAll(sel + ' button, ' + sel + ' [role=button], ' + sel + ' label')].find(e => (e.textContent || '').trim().startsWith(txt)); if (!el) return false; el.click(); return true; }, sel, txt);
if (!(await clickText('#tech', 'Fotocopia'))) throw new Error('Fotocopia'); await sleep(300);
if (!(await clickText('#styles', style))) throw new Error('estilo ' + style); await settled();
if (extra) { if (!(await clickText('body', extra))) throw new Error('click ' + extra); await settled(); }
const save = (name, dataUrl) => fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(',')[1], 'base64'));
save(`${tag}-canvas.png`, await page.evaluate(() => document.getElementById('c').toDataURL('image/png')));
const b = await (await page.$('#stage')).boundingBox();
await page.screenshot({ path: path.join(outDir, `${tag}-screen.png`), clip: { x: b.x, y: b.y, width: b.width, height: b.height } });
const info = await page.evaluate(() => ({ ver: document.querySelector('.ver').textContent, status: document.getElementById('status').textContent, pxmm: previewW / printW(), printW: printW(), stage: document.getElementById('stage').getBoundingClientRect().width, hand: st.x.hand, markers: (typeof markers !== 'undefined' && markers.paint) || null }));
if (ref) save(`${tag}-ref${ref}.png`, await page.evaluate(async n => { const W = previewW * n, H = previewH * n; const out = await R.renderImage(eng, img, W, H, params(W / printW())); return out.toDataURL('image/png'); }, ref));
console.log(JSON.stringify(info));
await browser.close(); try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}
