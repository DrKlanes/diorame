// ============================================================================
// EMERGENCY KILL-SWITCH SERVICE WORKER  —  Diorame
// ============================================================================
// NOT deployed by default. This is the "fire extinguisher on the wall".
//
// Purpose: recover devices stuck on a broken/poisoned production service
// worker that keeps serving a stale or broken version of the app.
//
// How it works: when a browser fetches this file as the new /sw.js, it
// installs, immediately takes over (skipWaiting), then on activate it:
//   1. Deletes EVERY cache (Workbox precaches, runtime caches — all of them).
//   2. Unregisters itself (self.registration.unregister()).
//   3. Force-reloads every open client so they drop the SW on the spot.
//
// After it runs there is NO service worker left and NO caches. The next
// clean deploy re-registers a fresh, correct SW from scratch.
//
// Deployment: see assets-source/PWA-ROLLBACK-README.md for the exact steps.
// The deployed file MUST live at the SAME url/scope as the broken SW
// (https://diorame.dumaker.com/sw.js, scope "/") or browsers won't pick it up.
// ============================================================================

self.addEventListener('install', () => {
	// Take over without waiting for old SW to release control.
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// 1. Nuke every cache bucket.
			const keys = await caches.keys();
			await Promise.all(keys.map((key) => caches.delete(key)));

			// 2. Unregister this service worker entirely.
			await self.registration.unregister();

			// 3. Force every open client to reload so it drops the SW immediately.
			const clients = await self.clients.matchAll({ type: 'window' });
			for (const client of clients) {
				client.navigate(client.url);
			}
		})()
	);
});
