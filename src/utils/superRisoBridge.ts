// "Export › Super Riso ↗" (v3.23.0): hands the open drawing to the Super Riso Lab in another tab. Protocol (REFERENCE.md §8):
// Lab → opener {type:'superriso:ready'} (every load, and the answer to Diorame's {type:'superriso:ping'}, which does NOT reload
// the tab); Diorame → Lab {type:'superriso:image', data, mime, name, drawView}; Lab → Diorame {type:'superriso:received'}.
// Since Lab v23.11 the Lab also sends {type:'superriso:loading'} while it starts (at once and every 2 s): the wait for 'ready'
// follows that heartbeat instead of a fixed time (v3.26.88).
// Every postMessage names the Lab's exact origin, never '*'.
import type { AppState } from '../types/strataTypes';

// In development, VITE_SUPER_RISO_LAB_URL (.env.local) points at a Lab served locally; its query (?diorame=…) is kept.
const LAB_URL = new URL(import.meta.env.VITE_SUPER_RISO_LAB_URL || 'https://super-riso.dumaker.com');
LAB_URL.searchParams.set('from', 'diorame');
const WINDOW_NAME = 'superriso';
// Up to Lab v23.10 a cold Lab (shaders not in the browser's cache: after a Lab deploy that changes them, a private window, a
// new device) took 6–10 s to say 'ready' (measured 2026-11-25; 0.6 s warm), and a fixed 8 s here from the click failed it
// whenever a Lab deploy had changed its shaders. Now: a Lab that says 'loading' is waited for as long as it keeps saying
// it (STALL_MS of silence ends the wait); one that says nothing (older Lab, page still downloading) gets READY_MS.
const READY_MS = 60000;  // for the first word from the Lab ('loading' or 'ready') after opening, while its window stays open
const STALL_MS = 20000;  // between two 'loading' heartbeats (the Lab sends one every 2 s)
const ANSWER_MS = 8000;  // for 'received' after sending (the Lab answers as soon as the file arrives)
const CLOSED_POLL_MS = 500;
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
		let closedTimer = 0;

		const send = () => {
			if (!payload) return;
			win.postMessage({ type: 'superriso:image', data: payload.blob, mime: 'application/octet-stream', name: payload.name, drawView: payload.drawView }, origin);
		};
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			clearTimeout(answerTimer); clearTimeout(pingTimer); clearInterval(closedTimer);
			window.removeEventListener('message', onMessage);
			resolve({ ok, payload });
		};
		const wait = (ms: number) => { clearTimeout(answerTimer); answerTimer = window.setTimeout(() => finish(false), ms); };
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== origin || e.source !== win || !e.data) return;
			if (e.data.type === 'superriso:loading') { if (!ready) { clearTimeout(pingTimer); wait(STALL_MS); } }
			else if (e.data.type === 'superriso:ready') { ready = true; clearTimeout(pingTimer); wait(ANSWER_MS); send(); }
			else if (e.data.type === 'superriso:received') finish(true);
		};

		window.addEventListener('message', onMessage);
		wait(READY_MS);
		// The user closed the Lab while it was loading: no point waiting out READY_MS.
		closedTimer = window.setInterval(() => { if (win.closed) finish(false); }, CLOSED_POLL_MS);
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
