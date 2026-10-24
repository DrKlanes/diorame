// Super Riso · Fotocopia — the markers the engine is painting with, for the panel. Tiny and free of WebGL
// (like deviceLevel.ts), so the UI imports it statically. Published by frame.ts on live frames only.
// React: useSyncExternalStore(subscribeXeroxPalette, getXeroxPalette).

import type { XeroxMarkerId } from '../../../../types/strataTypes';

/** id: one of the 16 markers of the library; without it, a colour of the drawing. */
export type XeroxMarker = { hex: string; id?: XeroxMarkerId };
/** what: the effective "what it colours" (auto resolved). unused: chosen markers left without a zone. */
export type XeroxPaletteView = { list: readonly XeroxMarker[]; what: 'color' | 'fill'; unused: number };

let view: XeroxPaletteView | null = null;
let sig = '';
const listeners = new Set<() => void>();

export const getXeroxPalette = (): XeroxPaletteView | null => view;

export function subscribeXeroxPalette(cb: () => void): () => void {
	listeners.add(cb);
	return () => { listeners.delete(cb); };
}

/** Engine side (frame.ts) only: notifies only when something the panel shows changed. */
export function setXeroxPalette(v: XeroxPaletteView): void {
	const s = JSON.stringify(v);
	if (s === sig) return;
	sig = s; view = v;
	listeners.forEach(cb => cb());
}
