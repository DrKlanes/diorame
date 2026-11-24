// Build guards (v3.26.91, tools/build-guards/check-build.mjs): `npm run build` runs them on the real build; these tests show
// they catch the failures they exist for, with what production actually served up to v3.26.87.
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs tool without type declarations
import { checkDiorRender, checkPrecache, precacheUrls } from '../tools/build-guards/check-build.mjs';

// https://diorame.dumaker.com/dior-render.js as served by v3.26.87: it only re-exported hashed chunks, which the next
// deploy deleted, so a copy cached by the browser or the CDN imported files that no longer existed.
const DIOR_RENDER_3_26_87 = 'import{frameOf as f,parseDior as i,renderDior as m}from"./assets/diorRender-DjgoZQIQ.js";import"./assets/inknut-antiqua-latin-700-normal-VPLnRFzO.js";export{f as frameOf,i as parseDior,m as renderDior};';
const SELF_CONTAINED = 'const Ya="/assets/texture-paper-UDnKwmuf.png";const E=e=>new URL(e,import.meta.url).href;function of(){}async function nf(){}async function rf(){}export{of as frameOf,nf as parseDior,rf as renderDior};';

describe('build guard · dior-render.js', () => {
	it('fails on the v3.26.87 file (imports hashed chunks)', () => {
		const problems: string[] = checkDiorRender(DIOR_RENDER_3_26_87);
		expect(problems.some(p => p.includes('imports other modules'))).toBe(true);
	});
	it('passes a self-contained file with exactly the three exports', () => {
		expect(checkDiorRender(SELF_CONTAINED, () => true)).toEqual([]);
	});
	it('fails on a dynamic import()', () => {
		expect(checkDiorRender(SELF_CONTAINED.replace('function of(){}', 'function of(){return import("./assets/x-1.js")}')).length).toBeGreaterThan(0);
	});
	it('fails when an export of the contract is missing or one is added', () => {
		expect(checkDiorRender(SELF_CONTAINED.replace(',rf as renderDior', '')).some((p: string) => p.includes('contract'))).toBe(true);
		expect(checkDiorRender(SELF_CONTAINED.replace('rf as renderDior', 'rf as renderDior,of as version')).some((p: string) => p.includes('contract'))).toBe(true);
	});
	it('fails when a file it points at is not in the build', () => {
		expect(checkDiorRender(SELF_CONTAINED, () => false).some((p: string) => p.includes('texture-paper'))).toBe(true);
	});
	it('fails when it carries the Super Riso engine (textures loaded from the importing page)', () => {
		expect(checkDiorRender(SELF_CONTAINED + 'img.src=`/textures/superRiso/${n}.png`;').some((p: string) => p.includes('Super Riso'))).toBe(true);
	});
});

describe('build guard · service-worker precache', () => {
	// The precache of v3.26.87: 41 files, 4.29 MB, the 1.6 MB logo among them.
	const V3_26_87 = [
		{ url: 'assets/logo-symbol-B9CyHbmo.png', bytes: 1646620 },
		{ url: 'assets/index-DZI0PAck.js', bytes: 793820 },
		{ url: 'assets/browser-module-B5mTv6rN.js', bytes: 363090 },
		{ url: 'assets/paper-core-7XcTFClp.js', bytes: 212180 },
		{ url: 'welcome-illustrations/v1-15.png', bytes: 240000 },
		{ url: 'assets/rest.js', bytes: 1240000 },
	];
	it('fails on the v3.26.87 precache (1.6 MB image, 4.3 MB in all)', () => {
		const problems: string[] = checkPrecache(V3_26_87);
		expect(problems.some(p => p.includes('logo-symbol'))).toBe(true);
		expect(problems.some(p => p.includes('precache is'))).toBe(true);
	});
	it('fails on any video', () => {
		expect(checkPrecache([{ url: 'welcome-videos/9.mp4', bytes: 7330939 }]).some((p: string) => p.includes('video'))).toBe(true);
	});
	it('passes the v3.26.89 shape: small logo, app shell only', () => {
		expect(checkPrecache([{ url: 'assets/logo-symbol-ui-x.png', bytes: 99118 }, ...V3_26_87.slice(1, 5)])).toEqual([]);
	});
	it('reads the Workbox manifest, and skips a sw.js without one (the kill-switch)', () => {
		expect(precacheUrls('e.precacheAndRoute([{url:"index.html",revision:"a"},{url:"assets/x.js",revision:null}],{})')).toEqual(['index.html', 'assets/x.js']);
		expect(precacheUrls('self.addEventListener("activate",()=>self.registration.unregister())')).toBeNull();
	});
});
