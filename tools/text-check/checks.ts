// The text-check sections. Each returns rows plus a SELF-TEST row: the same measure applied to a
// deliberately wrong input must FAIL — an instrument that cannot catch a known error proves nothing.
import { getLayerBoundingBox } from '../../src/components/strata/canvas/transformUtils';
import { pickLayerAtPoint } from '../../src/components/strata/canvas/pickLayerAtPoint';
import type { Shape } from '../../src/types/strataTypes';
import { paintInk, inkPoints, reduce, stretch, rotate, flip, text, polygon, FONTS, type Ink } from './ink';

export type Row = { label: string; detail: string; ok: boolean };

const SHORT = 'DIORAME';
const MULTI = 'LA CASA DEL BOSQUE\nHIJA DE LA NOCHE\nfin';

// Plain texts + texts deformed by the real reducer, every font. The scene the box and pick checks share.
export const textScenes = (): { label: string; shapes: Shape[] }[] => {
	const out: { label: string; shapes: Shape[] }[] = [];
	for (const font of FONTS) {
		for (const [tn, t] of [['corto', SHORT], ['varias líneas', MULTI]] as const)
			for (const rot of [0, 0.6]) for (const align of ['left', 'center'] as const)
				out.push({ label: `${font} · ${tn} · rot ${rot} · ${align}`, shapes: [text(font, t, rot, align)] });
		const deformed: [string, number, Shape['align'], Parameters<typeof reduce>[1]][] = [
			['estirado ×2', 0, 'left', [stretch(2, 1)]],
			['aplastado ×0,4', 0, 'center', [stretch(1, 0.4)]],
			['rotado + estirado (cizalla)', 0.5, 'left', [stretch(1.8, 1)]],
			['estirado + rotado', 0, 'center', [stretch(1.8, 1), rotate(0.6)]],
			['espejado H', 0, 'left', [flip('horizontal')]],
			['espejado V + rotado', 0.3, 'center', [flip('vertical')]],
			['rotado + espejado + estirado', -0.4, 'left', [flip('horizontal'), stretch(1, 1.6)]],
		];
		for (const [name, rot, align, actions] of deformed)
			out.push({ label: `${font} · ${name}`, shapes: reduce([text(font, 'DOBLE BODEGA\nora fin', rot, align)], actions) });
	}
	return out;
};

// ── 1 · Gizmo box vs painted ink ─────────────────────────────────────────────────────────────
type Box = { minX: number; maxX: number; minY: number; maxY: number };
const boxVsInk = (bb: Box | null, ink: Ink) => {
	if (!bb || ink.empty) return { out: Infinity, over: Infinity };
	const L = ink.minX - bb.minX, R = bb.maxX - ink.maxX, T = ink.minY - bb.minY, B = bb.maxY - ink.maxY;
	return { out: Math.max(0, -L, -R, -T, -B), over: Math.max(L, R, T, B) };
};
const BOX_OUT = 1, BOX_OVER = 2;

export const checkGizmo = (): Row[] => {
	const scenes = textScenes();
	for (const font of ['pharma', 'comic', 'dungeons'] as const) {
		scenes.push({ label: `${font} · trazo + texto rotado`, shapes: [polygon('s', [{ x: -250, y: -70 }, { x: -170, y: -70 }, { x: -170, y: 90 }, { x: -250, y: 90 }]), text(font, MULTI, 0.6, 'left')] });
		scenes.push({ label: `${font} · goma que corta el texto`, shapes: [text(font, MULTI, 0, 'left'), polygon('e', [{ x: 260, y: -300 }, { x: 800, y: -300 }, { x: 800, y: 200 }, { x: 260, y: 200 }], { isEraser: true })] });
	}
	const rows: Row[] = scenes.map(({ label, shapes }) => {
		const { out, over } = boxVsInk(getLayerBoundingBox(shapes), paintInk(shapes, 120, -60));
		return { label, detail: `tinta fuera ${out.toFixed(0)} px · sobrante ${over.toFixed(0)} px`, ok: out <= BOX_OUT && over <= BOX_OVER };
	});
	// Self-test: the true box shrunk by 3 px on one side must fail.
	const s = [text('dungeons', MULTI, 0.3, 'left')];
	const bb = getLayerBoundingBox(s)!;
	const bad = boxVsInk({ ...bb, maxX: bb.maxX - 3 }, paintInk(s, 120, -60));
	rows.push({ label: 'AUTOCOMPROBACIÓN · caja recortada 3 px', detail: `tinta fuera ${bad.out.toFixed(0)} px → debe FALLAR`, ok: bad.out > BOX_OUT });
	return rows;
};

// ── 2 · CINEMA picking vs painted ink ────────────────────────────────────────────────────────
// Black box: pickLayerAtPoint is asked about painted pixels, never recomputed. Tolerance 2 px: a
// rotated edge's antialias fringe (alpha 1–11/255) sits up to ~1.6 px past the ink box even for
// the rotation-only text of v3.17.54 (1.1 px) — measured in v3.17.56.
const PICK_TOL = 2;
const hits = (s: Shape, x: number, y: number) => !!pickLayerAtPoint([0], () => [s], () => ({ x, y }), 150);
const pickWorst = (picked: Shape, painted: Shape) => {
	const ink = paintInk([painted], 120, -60);
	let worst = 0;
	for (const [x, y] of inkPoints(ink, 2)) {
		if (hits(picked, x, y)) continue;
		let d = Infinity; // nearest hit within 4 px
		for (let r = 0.5; r <= 4 && d === Infinity; r += 0.5)
			for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; if (hits(picked, x + Math.cos(a) * r, y + Math.sin(a) * r)) { d = r; break; } }
		worst = Math.max(worst, d);
	}
	let far = 0;
	const span = Math.max(ink.maxX - ink.minX, ink.maxY - ink.minY) * 1.5 + 40;
	for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; if (hits(picked, (ink.minX + ink.maxX) / 2 + Math.cos(a) * span, (ink.minY + ink.maxY) / 2 + Math.sin(a) * span)) far++; }
	return { worst, far };
};

export const checkPick = (): Row[] => {
	const rows: Row[] = textScenes().map(({ label, shapes }) => {
		const { worst, far } = pickWorst(shapes[0], shapes[0]);
		return { label, detail: `tinta sin cubrir hasta ${worst === Infinity ? '>4' : worst.toFixed(1)} px · aciertos lejos ${far}`, ok: worst <= PICK_TOL && far === 0 };
	});
	// Self-test: picking a 38 px text while 40 px is painted must fail.
	const painted = text('dungeons', MULTI, 0.3, 'left');
	const bad = pickWorst({ ...painted, fontSize: 36 }, painted);
	rows.push({ label: 'AUTOCOMPROBACIÓN · picking de un texto 10 % menor', detail: `tinta sin cubrir hasta ${bad.worst === Infinity ? '>4' : bad.worst.toFixed(1)} px → debe FALLAR`, ok: bad.worst > PICK_TOL });
	return rows;
};
