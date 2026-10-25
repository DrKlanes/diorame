// Super Riso · Fotocopia — the markers the engine is painting with, for the panel (and, below, Stencil's templates). Tiny and free of WebGL
// (like deviceLevel.ts), so the UI imports it statically. Published by frame.ts on live frames only.
// React: useSyncExternalStore(subscribeXeroxPalette, getXeroxPalette).

import type { XeroxMarkerId } from '../../../../types/strataTypes';

/** id: one of the 16 markers of the library; without it, a colour of the drawing. */
export type XeroxMarker = { hex: string; id?: XeroxMarkerId };
/** A panel row: a colour zone of the drawing (`zone`, with `over` if its colour was picked by hand), or a marker of the box (`box` index). */
export type XeroxRow = XeroxMarker & { zone?: string; over?: boolean; box?: number };
/** what: the effective "what it colours" (auto resolved). zones: colour zones the drawing has. */
export type XeroxPaletteView = { rows: readonly XeroxRow[]; what: 'color' | 'fill'; zones: number };

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

// ── Stencil (v3.20.0): the same kind of store for the templates the engine is painting ──────────────
/** A template row: its spray colour and kind (0 tone, 1 colour zone, 2 black, 3 accent). */
export type StencilRow = { hex: string; kind: number };
let sView: readonly StencilRow[] | null = null, sSig = '';
const sListeners = new Set<() => void>();
export const getStencilPalette = (): readonly StencilRow[] | null => sView;
export function subscribeStencilPalette(cb: () => void): () => void {
	sListeners.add(cb);
	return () => { sListeners.delete(cb); };
}
/** Engine side (frame.ts) only: notifies only when the rows changed. */
export function setStencilPalette(v: readonly StencilRow[]): void {
	const s = JSON.stringify(v);
	if (s === sSig) return;
	sSig = s; sView = v;
	sListeners.forEach(cb => cb());
}
