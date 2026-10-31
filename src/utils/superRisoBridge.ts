// "Export › Super Riso ↗" (v3.23.0): hands the open drawing to the Super Riso Lab in another tab. Protocol (REFERENCE.md §8):
// Lab → opener {type:'superriso:ready'}; Diorame → Lab {type:'superriso:image', data, mime, name, drawView}; Lab → Diorame
// {type:'superriso:received'}. Every postMessage names the Lab's exact origin, never '*'.
import type { AppState } from '../types/strataTypes';

// In development, VITE_SUPER_RISO_LAB_URL (.env.local) points at a Lab served locally; its query (?diorame=…) is kept.
const LAB_URL = new URL(import.meta.env.VITE_SUPER_RISO_LAB_URL || 'https://super-riso.dumaker.com');
LAB_URL.searchParams.set('from', 'diorame');
const WINDOW_NAME = 'superriso';
const ANSWER_MS = 8000;  // for 'ready' after opening, then for 'received' after sending
const PROBE_MS = 2500;   // a reused tab that does not reload never announces 'ready': send to it anyway once

export type DrawView = { x: number; y: number; w: number; h: number };
export type SuperRisoPayload = { blob: Blob; name: string; drawView: DrawView };

/** The world rectangle the DRAW canvas shows, in frameOf coordinates (DRAW projected at zoom 1). Inverse of the
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
	const reused = !!labWindow && !labWindow.closed;
	const win = window.open(LAB_URL.href, WINDOW_NAME);
	if (!win) return Promise.resolve({ ok: false, payload: null });
	labWindow = win;

	return new Promise(resolve => {
		let payload: SuperRisoPayload | null = null;
		let ready = false;
		let done = false;
		let answerTimer = 0;
		let probeTimer = 0;

		const send = () => {
			if (!payload) return;
			win.postMessage({ type: 'superriso:image', data: payload.blob, mime: 'application/octet-stream', name: payload.name, drawView: payload.drawView }, origin);
		};
		const finish = (ok: boolean) => {
			if (done) return;
			done = true;
			clearTimeout(answerTimer); clearTimeout(probeTimer);
			window.removeEventListener('message', onMessage);
			resolve({ ok, payload });
		};
		const wait = () => { clearTimeout(answerTimer); answerTimer = window.setTimeout(() => finish(false), ANSWER_MS); };
		const onMessage = (e: MessageEvent) => {
			if (e.origin !== origin || e.source !== win || !e.data) return;
			if (e.data.type === 'superriso:ready') { ready = true; wait(); send(); }
			else if (e.data.type === 'superriso:received') finish(true);
		};

		window.addEventListener('message', onMessage);
		wait();
		prepare().then(p => {
			if (done) return;
			payload = p;
			if (ready) send();
			else if (reused) probeTimer = window.setTimeout(send, PROBE_MS);
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
