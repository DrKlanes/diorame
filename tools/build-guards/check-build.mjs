// Build guards (v3.26.91), run by `npm run build` after both Vite builds (and so by the CI before every deploy).
// Fails the build when:
//  1. build/dior-render.js stops being self-contained: it imports a chunk (static or dynamic), it does not export exactly
//     frameOf, parseDior and renderDior, or a file it points at (new URL(..., import.meta.url)) is missing. The Super
//     Riso Lab imports it from another domain and a cached copy must survive the next deploy (REFERENCE.md §8).
//  2. the service-worker precache grows: total over PRECACHE_MAX_BYTES, one file over FILE_MAX_BYTES, an image over
//     IMAGE_MAX_BYTES or any video. Heavy media go to runtime caching or the network, never to the precache (every
//     install of a new version competes with the first load for them).
// Usage: node tools/build-guards/check-build.mjs [buildDir]   (exit code 1 on failure)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRECACHE_MAX_BYTES = 3.5 * 1024 * 1024;
export const FILE_MAX_BYTES = 1024 * 1024;
export const IMAGE_MAX_BYTES = 300 * 1024;
const MEDIA = /\.(mp4|webm|mov|m4v|mp3|wav|ogg)$/i;
const IMAGE = /\.(png|jpe?g|webp|avif|gif)$/i;
export const CONTRACT = ['frameOf', 'parseDior', 'renderDior'];

/** Problems of dior-render.js's text. `exists(rel)` tells whether a file next to it exists. */
export function checkDiorRender(code, exists = () => true) {
	const problems = [];
	const statics = [...code.matchAll(/\bimport\s*(?:[\w$*{}\s,]+?\s*from\s*)?["'`]([^"'`]+)["'`]/g)].map(m => m[1]);
	if (statics.length) problems.push(`imports other modules (${statics.join(', ')}): a cached copy breaks when a deploy deletes them`);
	if (/\bimport\s*\(/.test(code)) problems.push('has a dynamic import(): it must be one self-contained file');
	if (/textures\/superRiso/.test(code)) problems.push('contains the Super Riso engine, which loads /textures/superRiso/*.png from the importing page\'s origin');
	const blocks = [...code.matchAll(/\bexport\s*\{([^}]*)\}/g)];
	const names = blocks.flatMap(b => b[1].split(',').map(s => s.trim()).filter(Boolean).map(s => s.split(/\s+as\s+/).pop().trim())).sort();
	if (names.join() !== [...CONTRACT].sort().join()) problems.push(`exports [${names.join(', ')}], the contract is exactly [${CONTRACT.join(', ')}]`);
	for (const m of code.matchAll(/new URL\(\s*["'`]([^"'`]+)["'`]\s*,\s*import\.meta\.url\s*\)/g)) if (!exists(m[1])) problems.push(`points at ${m[1]}, which is not in the build`);
	// minified code passes the URL through a variable: every "./assets/x" or "assets/x" string literal must exist
	for (const m of code.matchAll(/["'`](\.?\/?assets\/[^"'`]+)["'`]/g)) if (!exists(m[1])) problems.push(`refers to ${m[1]}, which is not in the build`);
	return problems;
}

/** Problems of the precache list: entries [{url, bytes}]. */
export function checkPrecache(entries) {
	const problems = [];
	const total = entries.reduce((a, e) => a + e.bytes, 0);
	if (total > PRECACHE_MAX_BYTES) problems.push(`precache is ${(total / 1048576).toFixed(2)} MB (limit ${(PRECACHE_MAX_BYTES / 1048576).toFixed(1)} MB)`);
	for (const e of entries) {
		if (MEDIA.test(e.url)) problems.push(`precaches a video/audio file: ${e.url}`);
		else if (IMAGE.test(e.url) && e.bytes > IMAGE_MAX_BYTES) problems.push(`precaches a ${(e.bytes / 1024).toFixed(0)} KB image (limit ${IMAGE_MAX_BYTES / 1024} KB): ${e.url}`);
		else if (e.bytes > FILE_MAX_BYTES) problems.push(`precaches a ${(e.bytes / 1048576).toFixed(2)} MB file (limit ${FILE_MAX_BYTES / 1048576} MB): ${e.url}`);
	}
	return problems;
}

/** The precache URLs written by Workbox in sw.js; null when sw.js is not a Workbox precache (the kill-switch). */
export function precacheUrls(swText) {
	if (!/precacheAndRoute\(/.test(swText)) return null;
	return [...swText.matchAll(/\burl:"([^"]+)"/g)].map(m => m[1]);
}

function main(dir) {
	const problems = [];
	const dr = path.join(dir, 'dior-render.js');
	if (!fs.existsSync(dr)) problems.push('build/dior-render.js is missing (the Super Riso Lab imports it)');
	else problems.push(...checkDiorRender(fs.readFileSync(dr, 'utf8'), rel => fs.existsSync(path.join(dir, rel.replace(/^\.?\//, '')))).map(p => 'dior-render.js ' + p));
	const sw = path.join(dir, 'sw.js');
	let summary = 'no sw.js';
	if (fs.existsSync(sw)) {
		const urls = precacheUrls(fs.readFileSync(sw, 'utf8'));
		if (urls === null) summary = 'sw.js has no Workbox precache (kill-switch?): precache not checked';
		else {
			const entries = urls.map(url => { const f = path.join(dir, url.split('?')[0]); return { url, bytes: fs.existsSync(f) ? fs.statSync(f).size : 0 }; });
			problems.push(...checkPrecache(entries));
			summary = `precache ${entries.length} files, ${(entries.reduce((a, e) => a + e.bytes, 0) / 1048576).toFixed(2)} MB`;
		}
	}
	if (problems.length) { console.error('✗ build guards:\n  - ' + problems.join('\n  - ')); process.exit(1); }
	console.log(`✓ build guards: dior-render.js self-contained (${(fs.statSync(dr).size / 1024).toFixed(0)} KB, exports ${CONTRACT.join(', ')}); ${summary}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(path.resolve(process.argv[2] || 'build'));
