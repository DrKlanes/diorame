// A Diorame project (.dior) drawn outside the app (v3.22.0): what the Super Riso Lab imports from
// https://diorame.dumaker.com/dior-render.js (entry: src/dior-render.ts). The drawing as the DRAW PNG export draws it
// (drawSnapshot.ts: the same pipeline, paper background, no FX, no editing aids), re-rendered at the size asked for.
//
// The frame (frameOf) is the ink of the visible layers in the DRAW projection at zoom 1, plus a margin: a .dior keeps no
// DRAW view of its own (the canvas is infinite and the window is each device's), so the frame comes from the drawing and
// one file gives the same frame on any device. Text is measured with the app's own fonts, which parseDior loads first.
//
// Nothing here mounts the app or registers a service worker. What it adds to the page: the drawing fonts
// (document.fonts), which canvas text needs.
import paperUrl from 'figma:asset/texture-paper.png';
import interUrl from '@fontsource/inter/files/inter-latin-700-normal.woff2?url';
import courierUrl from '@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2?url';
import cinzelUrl from '@fontsource/cinzel/files/cinzel-latin-700-normal.woff2?url';
import bangersUrl from '@fontsource/bangers/files/bangers-latin-400-normal.woff2?url';
import inknutUrl from '@fontsource/inknut-antiqua/files/inknut-antiqua-latin-700-normal.woff2?url';
import { appReducer, initialState, BASE_DEPTH_STEP } from '../StrataContext';
import { DRAW_FOCAL_LENGTH } from '../../../constants/renderConstants';
import { createProjectMeta, readProjectMeta } from '../../../utils/projectMeta';
import { TEXT_FONTS, type TextFontKey } from '../../../utils/textLayout';
import { getLayerBoundingBox } from './transformUtils';
import { renderDrawSnapshot } from './drawSnapshot';
import type { AppState, Shape } from '../../../types/strataTypes';

export type DiorProject = Record<string, unknown> & { shapes: unknown[] };
export type DiorView = { x: number; y: number; w: number; h: number };

// The faces TEXT_FONTS draws with (same files as fonts.ts / svgText.ts). URLs resolve against this module, not the page.
const FONT_FILES: Readonly<Record<TextFontKey, [family: string, weight: string, url: string]>> = {
	pharma: ['Inter', '700', interUrl],
	noir: ['Courier Prime', '700', courierUrl],
	mansion: ['Cinzel', '700', cinzelUrl],
	comic: ['Bangers', '400', bangersUrl],
	dungeons: ['Inknut Antiqua', '700', inknutUrl],
};
const MARGIN = 0.04;        // of the long side, each side
const MARGIN_MIN = 32;      // px
const SAFE_AREA = 4096 * 4096; // every browser draws a canvas this big (iOS Safari's limit); above it, probe
const DRAW_CAMERA = { x: 0, y: 0, z: 0, rotation: 0 };

const asset = (url: string) => new URL(url, import.meta.url).href;

const fontLoads = new Map<TextFontKey, Promise<unknown>>();
function loadFonts(shapes: readonly Shape[]): Promise<unknown> {
	const keys = new Set<TextFontKey>();
	for (const s of shapes) if (s.type === 'text' && s.text) keys.add(s.font && TEXT_FONTS[s.font] ? s.font : 'pharma');
	return Promise.all([...keys].map(key => {
		let p = fontLoads.get(key);
		if (!p) {
			const [family, weight, url] = FONT_FILES[key];
			const face = new FontFace(family, `url(${asset(url)})`, { weight });
			p = face.load().then(f => { document.fonts.add(f); });
			fontLoads.set(key, p);
		}
		return p;
	}));
}

let paperLoad: Promise<HTMLImageElement> | null = null;
function loadPaper(): Promise<HTMLImageElement> {
	paperLoad ??= new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous'; // drawn into the result: an untainted canvas the caller can read
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('paper texture failed to load'));
		img.src = asset(paperUrl);
	});
	return paperLoad;
}

// The project as the app holds it after opening it: the real LOAD_PROJECT (saved values rule, defaults fill gaps), seen in
// DRAW at zoom 1 with every FX off (DRAW draws none, and Super Riso would load its engine for nothing).
const states = new WeakMap<object, AppState>();
function stateOf(project: DiorProject): AppState {
	let s = states.get(project);
	if (!s) {
		const meta = readProjectMeta(project.meta) ?? createProjectMeta();
		const loaded = appReducer(initialState, { type: 'LOAD_PROJECT', payload: { ...project, meta } } as Parameters<typeof appReducer>[1]);
		const fxOff = Object.fromEntries(Object.keys(loaded.postProcessingEnabled).map(k => [k, false])) as AppState['postProcessingEnabled'];
		s = { ...loaded, mode: 'drawing', drawingZoom: 1, drawingPan: { x: 0, y: 0 }, postProcessingEnabled: fxOff };
		states.set(project, s);
	}
	return s;
}

const byZ = (shapes: readonly Shape[]) => {
	const map = new Map<number, Shape[]>();
	for (const s of shapes) { if (!map.has(s.zIndex)) map.set(s.zIndex, []); map.get(s.zIndex)!.push(s); }
	return map;
};

// x0, y0: where the frame's corner falls in DRAW coordinates (offset from the world origin, zoom 1).
type Frame = { x0: number; y0: number; width: number; height: number };
const frames = new WeakMap<object, Frame>();
function frame(project: DiorProject): Frame {
	let f = frames.get(project);
	if (f) return f;
	const state = stateOf(project);
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const [z, shapes] of byZ(state.shapes)) {
		if (state.hiddenLayers.includes(Math.round(Math.abs(z / BASE_DEPTH_STEP)))) continue;
		const bb = getLayerBoundingBox(shapes);
		if (!bb) continue;
		// DRAW parallax (transformPoint.ts) with the camera at 0; the box is in whole pixels, its max inclusive
		const k = DRAW_FOCAL_LENGTH / (DRAW_FOCAL_LENGTH + z);
		minX = Math.min(minX, bb.minX * k); minY = Math.min(minY, bb.minY * k);
		maxX = Math.max(maxX, (bb.maxX + 1) * k); maxY = Math.max(maxY, (bb.maxY + 1) * k);
	}
	if (minX === Infinity) throw new Error('vacío');
	const m = Math.max(MARGIN_MIN, MARGIN * Math.max(maxX - minX, maxY - minY));
	const x0 = Math.floor(minX - m), y0 = Math.floor(minY - m);
	f = { x0, y0, width: Math.ceil(maxX + m) - x0, height: Math.ceil(maxY + m) - y0 };
	frames.set(project, f);
	return f;
}

// The largest size with this aspect the device can draw (a canvas too big comes back blank, not as an error).
function fitCanvas(w: number, h: number): [number, number] {
	const fits = (cw: number, ch: number) => {
		const c = document.createElement('canvas');
		c.width = cw; c.height = ch;
		const x = c.getContext('2d');
		if (!x) return false;
		x.fillRect(cw - 1, ch - 1, 1, 1);
		const ok = x.getImageData(cw - 1, ch - 1, 1, 1).data[3] !== 0;
		c.width = c.height = 0;
		return ok;
	};
	while (w * h > SAFE_AREA && !fits(w, h)) { w = Math.max(1, Math.floor(w * 0.85)); h = Math.max(1, Math.floor(h * 0.85)); }
	return [w, h];
}

/** .dior v1, v2 and .dior.json (all JSON): the project, with the fonts its text needs already loaded. */
export async function parseDior(buffer: ArrayBuffer): Promise<DiorProject> {
	const json: unknown = JSON.parse(new TextDecoder('utf-8').decode(buffer));
	if (!json || typeof json !== 'object' || !Array.isArray((json as DiorProject).shapes)) throw new Error('no es un proyecto de Diorame');
	const project = json as DiorProject;
	await loadFonts(stateOf(project).shapes);
	return project;
}

/** Size in px of the DRAW PNG at 1× of the frame: the ink of the visible layers plus the margin. Throws Error('vacío').
 *  x0, y0 (v3.23.0): where its corner falls in DRAW coordinates (zoom 1), to place a `drawView` from the app. */
export function frameOf(project: DiorProject): { width: number; height: number; x0: number; y0: number } {
	const { width, height, x0, y0 } = frame(project);
	return { width, height, x0, y0 };
}

/** The drawing (no Super Riso, no UI) with the project's background: `view` (frameOf coordinates, null = all) at width px. */
export async function renderDior(project: DiorProject, { width, view }: { width: number; view?: DiorView | null }): Promise<HTMLCanvasElement> {
	const state = stateOf(project);
	const f = frame(project);
	const [paperImg] = await Promise.all([loadPaper(), loadFonts(state.shapes)]);
	const v = view ?? { x: 0, y: 0, w: f.width, h: f.height };
	if (!(v.w > 0 && v.h > 0 && width >= 1)) throw new Error('encuadre no válido');
	const [W, H] = fitCanvas(Math.round(width), Math.max(1, Math.round(width * v.h / v.w)));
	// renderScale S re-draws the vector at W px (HQ export path). The logical size carries half a pixel more so
	// the physical raster, truncated by the canvas, is exactly W × H.
	const S = W / v.w;
	const w = (W + 0.5) / S, h = (H + 0.5) / S;
	const shapesByZ = byZ(state.shapes);
	return renderDrawSnapshot({
		state: { ...state, drawingPan: { x: -w / 2 - (v.x + f.x0), y: -h / 2 - (v.y + f.y0) } },
		shapesByZ,
		sortedZs: [...shapesByZ.keys()].sort((a, b) => b - a),
		camera: DRAW_CAMERA,
		w, h,
		paperImg, risoGrain: null, grungeImg: null, particles: [], noiseCanvas: null, shapePattern: null,
		getActiveZ: (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP,
	}, S, 'paper');
}
