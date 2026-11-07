// Progress of the running timelapse (v3.25.19): a tiny external store the progress modal reads with
// useSyncExternalStore — the export runs outside React (timelapseExport.ts), frame by frame.

export type TimelapseProgressState = { done: number; total: number; startedAt: number; canceling: boolean };

let current: TimelapseProgressState | null = null;
let controller: AbortController | null = null;
let lastEmit = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export const timelapseProgress = {
	subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => { listeners.delete(listener); };
	},
	get: (): TimelapseProgressState | null => current,
	start(c: AbortController): void {
		controller = c;
		current = { done: 0, total: 0, startedAt: performance.now(), canceling: false };
		emit();
	},
	/** At most ~10 updates a second (React re-renders the modal on each), and always the last one. */
	update(done: number, total: number): void {
		if (!current) return;
		const now = performance.now();
		if (done < total && now - lastEmit < 100) return;
		lastEmit = now;
		current = { ...current, done, total };
		emit();
	},
	cancel(): void {
		if (!current || current.canceling) return;
		current = { ...current, canceling: true };
		controller?.abort();
		emit();
	},
	end(): void {
		current = null;
		controller = null;
		emit();
	},
};
