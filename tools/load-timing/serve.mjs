// Static server that mimics GitHub Pages: Cache-Control max-age=600, ETag/Last-Modified, 304, Range (206).
// The served directory can be switched at runtime (simulated deploy): GET /__deploy?dir=<abs path>.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const port = +process.argv[2] || 4173;
let root = path.resolve(process.argv[3] || '.');
const extra = process.argv[4] ? path.resolve(process.argv[4]) : null; // optional second root (old assets kept)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.dior': 'application/octet-stream', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const log = [];
let stale = null;

http.createServer((req, res) => {
	const u = new URL(req.url, 'http://x');
	if (u.pathname === '/__deploy') { root = path.resolve(u.searchParams.get('dir')); res.end('root=' + root); console.log('DEPLOY', root); return; }
	if (u.pathname === '/__log') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(log.splice(0))); return; }
	if (u.pathname === '/__stale') { stale = u.searchParams.get('file') || null; res.end('stale=' + stale); return; }
	let p = decodeURIComponent(u.pathname);
	// a stale browser/CDN copy of dior-render.js: served only for the bare URL (a ?v= cache-buster reaches the real file)
	if (stale && p === '/dior-render.js' && !u.search) { log.push({ s: 'stale', p }); res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); res.end(fs.readFileSync(stale)); return; }
	if (p.endsWith('/')) p += 'index.html';
	let f = path.join(root, p);
	if (!fs.existsSync(f) && extra) f = path.join(extra, p);
	res.setHeader('Access-Control-Allow-Origin', '*');
	if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { log.push({ s: 404, p }); res.statusCode = 404; res.setHeader('content-type', 'text/html'); res.end('<h1>404</h1>'); return; }
	const st = fs.statSync(f);
	const etag = '"' + crypto.createHash('md5').update(f + st.size + st.mtimeMs).digest('hex').slice(0, 12) + '"';
	res.setHeader('Cache-Control', 'max-age=600');
	res.setHeader('ETag', etag);
	res.setHeader('Last-Modified', st.mtime.toUTCString());
	res.setHeader('Accept-Ranges', 'bytes');
	res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
	if (req.headers['if-none-match'] === etag) { log.push({ s: 304, p }); res.statusCode = 304; res.end(); return; }
	const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
	if (range) {
		const start = range[1] ? +range[1] : 0, end = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
		res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`); res.setHeader('Content-Length', end - start + 1);
		log.push({ s: 206, p, n: end - start + 1 });
		fs.createReadStream(f, { start, end }).pipe(res); return;
	}
	res.setHeader('Content-Length', st.size);
	log.push({ s: 200, p, n: st.size });
	fs.createReadStream(f).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('serving', root, 'on', port));
