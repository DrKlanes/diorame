// "Export › Super Riso ↗" (v3.23.0): hands the open drawing to the Super Riso Lab in another tab. Protocol (REFERENCE.md §8):
// Lab → opener {type:'superriso:ready'} (every load, and the answer to Diorame's {type:'superriso:ping'}, which does NOT reload
// the tab); Diorame → Lab {type:'superriso:image', data, mime, name, drawView}; Lab → Diorame {type:'superriso:received'}.
// Every postMessage names the Lab's exact origin, never '*'.
import type { AppState } from '../types/strataTypes';

// In development, VITE_SUPER_RISO_LAB_URL (.env.local) points at a Lab served locally; its query (?diorame=…) is kept.
const LAB_URL = new URL(import.meta.env.VITE_SUPER_RISO_LAB_URL || 'https://super-riso.dumaker.com');
LAB_URL.searchParams.set('from', 'diorame');
const WINDOW_NAME = 'superriso';
const ANSWER_MS = 8000;  // for 'ready' after opening, then for 'received' after sending
const PING_MS = 1000;    // a Lab tab that is already open answers the ping with 'ready' well within this; if not, navigate it

export type DrawView = { x: number; y: number; w: number; h: number };
export type SuperRisoPayload = { blob: Blob; name: string; drawView: DrawView };

/** The world rectangle the DRAW canvas shows, in the active layer's plane at zoom 1 (useSuperRisoExport divides it by
 *  layer 0's scale to reach frameOf coordinates, camera at 0 — the same thing with layer 0 active). Inverse of the
 *  screen projection of transformPoint.ts (x = w/2 + p·zoom + pan.x), which diorRender.ts inverts the other way. */
export function visibleDrawView(state: Pick<AppState, 'drawingZoom' | 'drawingPan'>, w: number, h: number): DrawView {
	const zoom = state.drawingZoom || 1;
	const pan = state.drawingPan ?? { x: 0, y: 0 };
	return { x: (-w / 2 - pan.x) / zoom, y: (-h / 2 - pan.y) / zoom, w: w / zoom, h: h / zoom };
}

let labWindow: Window | null = null;

/**
 * Opens the Lab (inside the user's gesture: call it first, before any await) and delivers `prepare()` to it.
 * Resolves { ok: true } when the Lab confirms it received the file; { ok: false } if the window is blocked, nothing
 * answers in time or `prepare` fails. `payload` is whatever `prepare` produced, for the download fallback.
 */
export function launchSuperRiso(prepare: () => Promise<SuperRisoPayload>): Promise<{ ok: boolean; payload: SuperRisoPayload | null }> {
	const origin = LAB_URL.origin;
	// Never window.open(url, name) on a live Lab: it reloads the tab and the user loses the style and framing prepared there.
	// A known live window, or the named one (window.open with no URL returns it without touching it), is pinged instead.
	const win = labWindow && !labWindow.closed ? labWindow : window.open('', WINDOW_NAME);
	if (!win) return Promise.resolve({ ok: false, payload: null });
	labWindow = win;

	return new Promise(resolve => {
		let payload: SuperRisoPayload | null = null;
		let ready = false;
		let done = false;
		let answerTimer = 0;
		let pingTimer = 0;

		const send = () => {
			if (!payload) return;
			win.postMessage({ type: 'superriso:image', data: payload.blob, mime: 'application/octet-stream', name: payload.name, drawView: payload.drawView }, origin);
		};
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			clearTimeout(answerTimer); clearTimeout(pingTimer);
			window.removeEventListener('message', onMessage);
			resolve({ ok, payload });
		};
		const wait = () => { clearTimeout(answerTimer); answerTimer = window.setTimeout(() => finish(false), ANSWER_MS); };
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== origin || e.source !== win || !e.data) return;
			if (e.data.type === 'superriso:ready') { ready = true; clearTimeout(pingTimer); wait(); send(); }
			else if (e.data.type === 'superriso:received') finish(true);
		};

		window.addEventListener('message', onMessage);
		wait();
		try { win.postMessage({ type: 'superriso:ping' }, origin); win.focus(); } catch (_) { /* cross-origin focus quirks: the timer decides */ }
		// No answer: a blank window, a closed Lab or one older than v23.5. Load the Lab there; its first 'ready' continues the flow.
		pingTimer = window.setTimeout(() => {
			try { win.location.href = LAB_URL.href; } catch (_) { finish(false); }
		}, PING_MS);
		prepare().then(p => {
			if (done) return;
			payload = p;
			if (ready) send();
		}).catch(err => {
			console.warn('[superriso] could not prepare the file:', err);
			finish(false);
		});
	});
}

/** Closes the tab opened for a launch that turned out to have nothing to send. */
export function closeSuperRisoWindow(): void {
	try { labWindow?.close(); } catch (_) { /* already gone */ }
	labWindow = null;
}
