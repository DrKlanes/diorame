// One page load of Diorame in a real Chrome, measured: node measure.mjs <url> <profileDir> [--throttle=mbps] [--wait-update]
// Prints JSON: marks (ms from navigation start), bytes from network for the page and for the service worker, top files.
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// puppeteer-core is not a dependency of the app: install it in a temporary folder and run from there (README.md).
const puppeteer = (await import(pathToFileURL(createRequire(path.join(process.cwd(), 'x.js')).resolve('puppeteer-core')).href)).default;

const [url, profile] = process.argv.slice(2);
const opt = Object.fromEntries(process.argv.slice(4).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const mbps = opt.throttle ? +opt.throttle : 0;
const timeoutMs = +(opt.timeout || 90000);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile, args: ['--no-first-run', '--autoplay-policy=no-user-gesture-required', '--window-size=1366,1024'], defaultViewport: { width: 1366, height: 1024 } });
const net = { page: new Map(), sw: new Map() };
const cond = mbps ? { offline: false, latency: 40, downloadThroughput: mbps * 125000, uploadThroughput: 5 * 125000 } : null;

async function wire(session, bucket) {
	await session.send('Network.enable');
	await session.send('Network.setBlockedURLs', { urls: ['*gc.zgo.at*', '*goatcounter.com*'] }).catch(() => {});
	if (cond) await session.send('Network.emulateNetworkConditions', cond);
	session.on('Network.requestWillBeSent', e => bucket.set(e.requestId, { url: e.request.url, t0: e.timestamp }));
	session.on('Network.responseReceived', e => { const r = bucket.get(e.requestId); if (r) Object.assign(r, { status: e.response.status, fromSW: e.response.fromServiceWorker, fromDisk: e.response.fromDiskCache, fromCacheStorage: e.response.fromEarlyHints }); });
	session.on('Network.loadingFinished', e => { const r = bucket.get(e.requestId); if (r) Object.assign(r, { bytes: e.encodedDataLength, t1: e.timestamp }); });
	session.on('Network.loadingFailed', e => { const r = bucket.get(e.requestId); if (r) Object.assign(r, { failed: e.errorText }); });
}
browser.on('targetcreated', async t => {
	if (t.type() !== 'service_worker') return;
	try { const s = await t.createCDPSession(); await wire(s, net.sw); await s.send('Runtime.runIfWaitingForDebugger').catch(() => {}); } catch (_) { /* gone */ }
});
for (const t of browser.targets()) if (t.type() === 'service_worker') { const s = await t.createCDPSession(); await wire(s, net.sw); }

const page = await browser.newPage();
const cdp = await page.createCDPSession();
await wire(cdp, net.page);
await page.evaluateOnNewDocument(() => {
	const M = (window.__marks = {});
	{ let s = 12345; Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); } // same welcome video every run
	const mark = k => { if (M[k] == null) M[k] = Math.round(performance.now()); };
	window.__mark = mark;
	const scan = () => {
		if (document.querySelector('[data-drawing-canvas]')) mark('canvas');
		for (const v of document.querySelectorAll('video')) if (!v.__w) {
			v.__w = 1; mark('video_el'); M.video_src = v.currentSrc || v.src;
			v.addEventListener('loadeddata', () => mark('video_loadeddata'));
			v.addEventListener('playing', () => mark('video_playing'));
			if (v.poster) mark('video_has_poster');
		}
		for (const i of document.querySelectorAll('[role=dialog] img, .welcome img, img')) if (!i.__w && /logo/.test(i.src)) {
			i.__w = 1; mark('logo_el'); if (i.complete && i.naturalWidth) mark('logo_loaded'); else i.addEventListener('load', () => mark('logo_loaded'));
		}
		const toasts = [...document.querySelectorAll('[data-sonner-toast]')].map(n => n.textContent || '');
		if (toasts.some(s => /versi|version|Recargar|Reload/i.test(s))) mark('update_toast');
	};
	new MutationObserver(scan).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
	window.dataLayer = window.dataLayer || [];
	const push = window.dataLayer.push.bind(window.dataLayer);
	window.dataLayer.push = (...a) => { try { if (a[0] && a[0][0] === 'event') mark('ga_' + a[0][1]); } catch (_) {} return push(...a); };
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
const want = ['canvas', 'video_playing', 'logo_loaded'].concat(opt['wait-update'] ? ['update_toast'] : []);
let marks = {};
while (Date.now() - t0 < timeoutMs) {
	marks = await page.evaluate(() => window.__marks).catch(() => ({}));
	if (want.every(k => marks[k] != null)) break;
	await new Promise(r => setTimeout(r, 200));
}
// let the service worker finish what it is doing (install / precache) so its bytes are counted
const swState = async () => page.evaluate(async () => {
	const r = await navigator.serviceWorker?.getRegistration();
	return r ? { active: r.active?.state || null, waiting: r.waiting?.state || null, installing: r.installing?.state || null, controlled: !!navigator.serviceWorker.controller } : null;
}).catch(() => null);
const settleUntil = Date.now() + +(opt.settle || 20000);
let sw = await swState();
while (Date.now() < settleUntil && sw && sw.installing) { await new Promise(r => setTimeout(r, 300)); sw = await swState(); }
await new Promise(r => setTimeout(r, 1500));
marks = await page.evaluate(() => window.__marks).catch(() => marks);
const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n && { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
const res = await page.evaluate(() => Object.fromEntries(performance.getEntriesByType('resource').filter(e => /welcome-posters|logo-symbol/.test(e.name)).map(e => [e.name.includes('poster') ? 'poster_loaded' : 'logo_res', Math.round(e.responseEnd)])));
Object.assign(marks, res);
const version = await page.evaluate(() => (document.body.innerText.match(/v3\.\d+\.\d+/) || [])[0] || null).catch(() => null);

const sum = m => { let net = 0, n = 0, sw = 0, cache = 0, fails = []; const files = [];
	for (const r of m.values()) {
		if (r.failed || (r.status && r.status >= 400)) fails.push({ url: r.url.replace(/^https?:\/\/[^/]+/, ''), status: r.status, failed: r.failed });
		if (r.fromSW) { sw++; continue; }
		if (r.fromDisk) { cache++; continue; }
		if (r.bytes) { net += r.bytes; n++; files.push([r.url.replace(/^https?:\/\/[^/]+/, ''), r.bytes, r.status]); }
	}
	files.sort((a, b) => b[1] - a[1]);
	return { netMB: +(net / 1048576).toFixed(2), netRequests: n, fromSW: sw, fromDiskCache: cache, fails, top: files.slice(0, 8).map(([u, b, s]) => `${u} ${(b / 1048576).toFixed(2)}MB ${s}`) };
};
if (opt.verbose) for (const [k, m] of Object.entries(net)) for (const r of m.values()) console.error(k, r.status, r.fromSW ? "SW" : r.fromDisk ? "disk" : "net", ((r.bytes || 0) / 1048576).toFixed(2), r.failed || "", r.url.replace(/^https?:\/\/[^/]+/, ""));
console.log(JSON.stringify({ url, throttleMbps: mbps || null, version, marks, nav, sw, page: sum(net.page), serviceWorker: sum(net.sw) }, null, 1));
await browser.close();
