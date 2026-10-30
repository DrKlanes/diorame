// Super Riso — "this device previews in motion" (for the panel notice). Tiny and free of
// WebGL, so the UI can import it statically: it stays false until the engine (lazy chunk)
// has measured the device. React: useSyncExternalStore(subscribeSuperRisoPreviewDevice,
// isSuperRisoPreviewDevice).

let previewDevice = false;
const listeners = new Set<() => void>();

/** true once the automatic level put the live view in preview (res .5 + preview and light shaders in motion). */
export const isSuperRisoPreviewDevice = (): boolean => previewDevice;

export function subscribeSuperRisoPreviewDevice(cb: () => void): () => void {
	listeners.add(cb);
	return () => { listeners.delete(cb); };
}

/** Engine side (quality.ts) only. */
export function setSuperRisoPreviewDevice(v: boolean): void {
	if (v === previewDevice) return;
	previewDevice = v;
	listeners.forEach(cb => cb());
}
