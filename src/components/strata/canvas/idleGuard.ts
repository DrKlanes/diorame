import type { RenderContext } from './renderPipeline';

/**
 * Idle-skip for DRAW (v3.25.10). The rAF loop keeps ticking; this decides whether a tick repaints.
 * At rest a DRAW canvas is identical frame after frame (nothing in the DRAW render depends on time:
 * wiggle, particles, handheld, the POI marker and the camera tick are CINEMA-only), so repainting it
 * is pure battery and heat during an hours-long live session.
 *
 * A tick repaints when, in the last GRACE_MS:
 *   - the state object changed (zoom, pan, layers, undo, palette, theme, frame, load, UI…), or the mode;
 *   - the canvas size or devicePixelRatio changed;
 *   - an async asset arrived (paper, grunge, riso grain) or a web font finished loading;
 *   - any input happened (pointer, touch, wheel, key): the live stroke and the Move preview live in refs;
 *   - the live stroke grew, or a drawing gesture is on;
 *   - the page came back (visibilitychange, pageshow) or the 2D context was restored;
 * and always while exporting (except the timelapse, v3.25.19), while the flipbook plays, and in CINEMA.
 * The grace keeps painting ~500 ms past the last change, so nothing is cut mid-transition, and a change newer
 * than the last painted tick always paints at least once (frames slower than the grace included).
 *
 * Kill switch without a deploy: ?idle=0 turns it off (persisted in localStorage), ?idle=1 back on.
 */
const GRACE_MS = 500;
const FLAG_KEY = 'diorame_idle_off';

function readEnabled(): boolean {
	try {
		const param = new URLSearchParams(window.location.search).get('idle');
		if (param === '0') localStorage.setItem(FLAG_KEY, '1');
		else if (param === '1') localStorage.removeItem(FLAG_KEY);
		const off = localStorage.getItem(FLAG_KEY) === '1';
		if (off) console.warn('[idle] idle-skip OFF in this browser (?idle=1 turns it back on)');
		return !off;
	} catch {
		return true;
	}
}

export const IDLE_SKIP_ENABLED = typeof window !== 'undefined' && readEnabled();

// renderFrame calls since load, for the ?perf=1 HUD ("renders/s"), and what woke the last one.
export const renderStats = { count: 0, reason: '' };

export function createIdleGuard() {
	let lastChange = performance.now();
	// Last tick that painted. A change newer than it always paints once, whatever the frame time: with the
	// grace alone, a frame slower than GRACE_MS (a huge scene on a slow iPad, a throttled tab) would skip it.
	let lastRender = -Infinity;
	let wake = 'start';
	const touch = (e?: Event) => { lastChange = performance.now(); wake = e?.type ?? 'dirty'; };
	let prev: { state: unknown; w: number; h: number; dpr: number; paper: unknown; riso: unknown; grunge: unknown; points: number; drawing: boolean } | null = null;

	const opts = { capture: true, passive: true } as const;
	const inputs = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'keydown', 'keyup'];
	inputs.forEach(t => window.addEventListener(t, touch, opts));
	document.addEventListener('visibilitychange', touch);
	window.addEventListener('pageshow', touch);
	window.addEventListener('resize', touch);
	const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
	fonts?.addEventListener?.('loadingdone', touch);

	return {
		/** Something outside the render context changed (e.g. the 2D context was restored). */
		markDirty: touch,
		shouldRender(rc: RenderContext): boolean {
			const s = rc.state;
			const now = performance.now();
			const snap = {
				state: s, w: rc.w, h: rc.h, dpr: window.devicePixelRatio || 1,
				paper: rc.paperImg, riso: rc.risoGrain, grunge: rc.grungeImg,
				points: rc.currentPoints.length, drawing: rc.isDrawing,
			};
			const p = prev;
			const changed = !p ? 'start'
				: p.state !== snap.state ? 'state'
				: p.w !== snap.w || p.h !== snap.h || p.dpr !== snap.dpr ? 'size'
				: p.paper !== snap.paper || p.riso !== snap.riso || p.grunge !== snap.grunge ? 'asset'
				: p.points !== snap.points || p.drawing !== snap.drawing || snap.drawing ? 'stroke'
				: '';
			prev = snap;
			if (changed) { lastChange = now; wake = changed; }
			// Exporting repaints every tick (the MP4 of DRAW records this live canvas) — except the timelapse (v3.25.19,
			// GO Moisés): it renders off the loop into its own canvases, so the live canvas stays idle while it encodes
			// (one repaint on REQUEST_EXPORT and one on FINISH_EXPORT, both state changes).
			const exporting = (s.isExporting || s.exportRequest) && s.exportRequest !== 'timelapse';
			if (!IDLE_SKIP_ENABLED || s.mode !== 'drawing' || exporting || (s.isAnimationMode && s.isAnimationPlaying)) {
				renderStats.reason = 'always';
				return true;
			}
			if (lastChange > lastRender || now - lastChange < GRACE_MS) {
				lastRender = now;
				renderStats.reason = wake;
				return true;
			}
			return false;
		},
		dispose() {
			inputs.forEach(t => window.removeEventListener(t, touch, opts));
			document.removeEventListener('visibilitychange', touch);
			window.removeEventListener('pageshow', touch);
			window.removeEventListener('resize', touch);
			fonts?.removeEventListener?.('loadingdone', touch);
		},
	};
}
