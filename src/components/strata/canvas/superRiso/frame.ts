// Super Riso — what a frame is rendered with: its Mode (live level or export) and its Frame (the
// engine parameters, inks and the key that says whether a pending / held result is still valid).

import type { AnyParams, RenderOpts } from './engine';
import type { Shape, SuperRisoSettings, XeroxSettings } from '../../../../types/strataTypes';
import type { ExportFrame } from '../renderPipeline';
import { backgroundBaseColor } from '../drawBackground';
import { hex2rgb, type PickedInks, type RGB } from './inks';
import { fromPanel } from './panel';
import { sceneInks } from './sceneInks';
import { levelFor } from './quality';
import { cfg as KNOBS } from './runtimeConfig';
import { xeroxParams } from './xeroxParams';
import { xeroxMarkers, type XeroxMarkers } from './xeroxMarkers';
import { xeroxMaps, xeroxMapsVersion } from './xeroxMaps';
import { setXeroxPalette } from './xeroxPalette';
import { liveFlat, exportFlat } from './bridge';

// ── Modes ──────────────────────────────────────────────────────────────────────────────────────
/** How a live frame (or an export) is rendered. */
export type Mode = { res: number; sim: boolean; preview: number; lossless: boolean; pipe: 0 | 1 | 2; hold: boolean; holdFps: number };
/** The lab's full level: resolution 1, full-size upload, lossless variants only. */
export const fullMode = (): Mode => ({ res: 1, sim: false, preview: 0, lossless: KNOBS.lossless, pipe: 0, hold: false, holdFps: 12 });

export function liveMode(w: number, h: number, s: SuperRisoSettings): { m: Mode; level: string } {
	if (!KNOBS.auto) return { m: { res: KNOBS.resScale, sim: KNOBS.simUpload, preview: KNOBS.preview, lossless: KNOBS.lossless, pipe: KNOBS.pipe, hold: KNOBS.hold, holdFps: 12 }, level: 'manual' };
	const level = levelFor(w, h);
	if (level !== 'preview') return { m: fullMode(), level };
	// "Calidad completa siempre": the full level, held between reprint ticks (12 fps without reprint).
	if (s.fullQuality) return { m: { ...fullMode(), hold: true, holdFps: s.reprintFps || 12 }, level: 'preview·full' };
	return { m: { res: .75, sim: KNOBS.simUpload, preview: 15, lossless: true, pipe: 1, hold: false, holdFps: 12 }, level };
}

export const modeLabel = (m: Mode) => [
	`res ${m.res}`, m.sim ? 'sim-upload' : '', m.pipe ? `PIPE${m.pipe}` : '', m.hold ? `HOLD ${m.holdFps}` : '',
	m.lossless ? 'LOSSLESS' : '', m.preview ? `PREVIEW ${m.preview}` : '',
].filter(Boolean).join(' · ');

// ── Per-frame preparation ──────────────────────────────────────────────────────────────────────
/** What renderFrame hands over each frame (built once, before phase 1). */
export type SuperRisoInput = {
	settings: SuperRisoSettings;
	isDarkMode: boolean;
	isPixelArt: boolean;
	/** The project's shapes and hidden layers: the source of the inks (cached by identity). */
	shapes: readonly Shape[];
	hiddenLayers: readonly number[];
	/** false for export renders (skipCinematicOverlays). */
	isLive: boolean;
	/** GIF / PNG-sequence: frame index, frame count and fps of the export (RenderContext.exportFrame). */
	exportFrame?: ExportFrame;
	/** Live, filled in phase 3: what moves the image (camera, optics, wiggle…) and the state object.
	 *  While neither changes the image is still (refinement on preview devices). */
	motion?: readonly number[];
	scene?: unknown;
	info: { preset: string; speed: number };
};
/** Fotocopia: the settings, its markers, and what engineParams needs to keep the CPU maps (xeroxMaps.ts) fresh. */
type XeroxFrame = { x: XeroxSettings; mk: XeroxMarkers; isLive: boolean; motion?: readonly number[]; scene?: unknown };
export type Frame = { style: AnyParams; fw: number; fh: number; base: string; srcPaper: RGB; inks: PickedInks; key: string; xerox?: XeroxFrame };
/** srdebug: the inks and parameters of the last live frame. */
export const lastFrame: { inks: PickedInks | null; params: AnyParams | null } = { inks: null, params: null };

export function prepare(w: number, h: number, inp: SuperRisoInput, m: Mode): Frame {
	const { settings: s, isDarkMode, isPixelArt } = inp;
	const xr = s.technique === 'xerox';
	const style = xr ? xeroxParams(s.xerox, w * m.res) : fromPanel(s, w * m.res);
	const simW = Math.round(240 * style.pxmm!);
	const simH = Math.round(simW * h / w);
	// sim: flatten straight at the simulation size (the 2D draw IS the reduction pass).
	const fw = m.sim ? Math.min(w, simW) : w;
	const fh = m.sim ? Math.min(h, simH) : h;
	const base = backgroundBaseColor(isDarkMode, isPixelArt);
	// srcPaper: the base colour in light mode. In dark mode the dark base must NOT be the paper
	// (prep divides by srcPaper: everything would turn into paper); white makes it ink.
	// srdarkpaper=bg restores the literal brief (dark base as srcPaper) to compare.
	const darkInk = isDarkMode && !KNOBS.darkPaperFromBase;
	const srcPaper: RGB = darkInk ? [1, 1, 1] : hex2rgb(base);
	const mk = xr ? xeroxMarkers(s, inp.shapes, inp.hiddenLayers, srcPaper, darkInk ? base : null) : null;
	if (mk && inp.isLive) setXeroxPalette({ rows: mk.rows, what: mk.what, zones: mk.zones });
	const inks = mk ? { inks: mk.paint, names: mk.rows.map(e => e.id ?? ''), opac: [], srcPaper } : sceneInks(inp.shapes, inp.hiddenLayers, s, srcPaper, darkInk ? base : null);
	if (inp.isLive) lastFrame.inks = inks;
	// Anything that changes what a pending/held result means: size, theme, mode, parameters, inks, context.
	const key = [w, h, +isDarkMode, +isPixelArt, m.res, +m.sim, m.preview, +m.lossless, m.pipe, +KNOBS.mip, +KNOBS.offscreenBack, +KNOBS.preserveDrawingBuffer, +KNOBS.darkPaperFromBase,
		s.technique, ...(mk ? [JSON.stringify(s.xerox), (mk.keys ?? []).join(','), xeroxMapsVersion()] : [s.paper, s.screen, s.screenSize, s.imperfection, s.resolution]), inks.inks.join(',')].join('|');
	const xerox = mk ? { x: s.xerox, mk, isLive: inp.isLive, motion: inp.motion, scene: inp.scene } : undefined;
	return { style, fw, fh, base, srcPaper, inks, key, xerox };
}

/** Called right after the frame was flattened (liveFlat / exportFlat hold it): Fotocopia reads its CPU maps from there. */
export function engineParams(fr: Frame): AnyParams {
	const X = fr.xerox;
	if (!X) return (lastFrame.params = { ...fr.style, inks: fr.inks.inks, names: fr.inks.names, opac: fr.inks.opac, srcPaper: fr.srcPaper });
	const maps = X.x.hand === 'none' ? null : xeroxMaps((X.isLive ? liveFlat : exportFlat).canvas, X.mk, X.x, fr.srcPaper, X.isLive, X.motion, X.scene);
	return (lastFrame.params = { ...fr.style, markers: X.mk.paint, keys: X.mk.keys, regionMap: maps?.ids ?? null, orientMap: maps?.ori ?? null, srcPaper: fr.srcPaper });
}
export const seedOf = (tick: number) => (tick % 9999) + 1;
export const tickAt = (fps: number) => Math.floor(performance.now() * fps / 1000);
/**
 * The reprint tick (the seed). reprintFps 0: a fixed seed. Live: the pure tick of reprintFps.
 * GIF / PNG-sequence: floor(i · reprintFps / fpsExport), so two exports are identical. A single
 * frame export (PNG HQ) prints the live tick: what you see.
 */
export function seedTickFor(inp: SuperRisoInput): number {
	const fps = inp.settings.reprintFps;
	if (!fps) return 0;
	const ef = inp.exportFrame;
	return ef ? Math.floor(ef.index * fps / ef.fps) : tickAt(fps);
}
export const opts = (m: Mode, toTexture = false): RenderOpts => ({ lossless: m.lossless, preview: m.preview, toTexture });
