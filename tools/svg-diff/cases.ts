// Synthetic scenes for the SVG fidelity table. World units, single layer at z=0, ink
// forced to black by the harness. Each case isolates one compositing mechanism.
import { generateStrokeForMode } from '../../src/utils/strokeGenerators';
import type { Point, Shape } from '../../src/types/strataTypes';
import { bakeTextTransform, flipTextProps } from '../../src/utils/textTransform';

let seq = 0;
const nextId = () => `case-${seq++}`;

// Circle / spiral sampled as a blob contour. turns>1 with growth>0 = a lasso that crosses itself.
const circle = (cx: number, cy: number, r: number, turns = 1, growth = 0): Point[] => {
	const steps = 64;
	const total = Math.round(steps * turns);
	const pts: Point[] = [];
	for (let i = 0; i <= total; i++) {
		const a = (2 * Math.PI * i) / steps;
		const rr = r + (growth * i) / total;
		pts.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) });
	}
	return pts;
};

const blob = (points: Point[], extra: Partial<Shape> = {}): Shape => ({ id: nextId(), zIndex: 0, color: '#000000', points, ...extra });
const eraser = (points: Point[]): Shape => ({ id: nextId(), zIndex: 0, color: '#000000', points, isEraser: true, brushThickness: 20 });
// Same transform the symmetry tool applies in handlePointerUp: x → -x (reverses winding).
const mirror = (s: Shape): Shape => ({ ...s, id: nextId(), points: s.points.map(p => ({ ...p, x: -p.x })) });

const zigzag = (): Point[] => {
	const pts: Point[] = [];
	for (let i = 0; i <= 12; i++) pts.push({ x: -200 + i * 33, y: i % 2 ? -120 : 120 });
	for (let i = 12; i >= 0; i--) pts.push({ x: -200 + i * 33 + 15, y: i % 2 ? 110 : -110 });
	return pts;
};

const text = (t: string, extra: Partial<Shape> = {}): Shape => ({ id: nextId(), type: 'text', text: t, font: 'pharma', align: 'left', fontSize: 60, zIndex: 0, color: '#000000', points: [{ x: -250, y: 0 }], ...extra });
const base = () => blob(circle(0, 0, 300));
// Text deformed exactly as the reducer bakes it (v3.17.56): stretch/squash around the anchor, true mirror.
const stretched = (s: Shape, sx: number, sy: number, rotation = 0): Shape => ({ ...s, ...bakeTextTransform(s, { rotation, scale: 1, sx, sy, nonUniform: true }) });
const mirrored = (s: Shape, direction: 'horizontal' | 'vertical'): Shape => ({ ...s, ...flipTextProps(s, direction) });
const crossing = eraser(circle(60, 0, 120));
const tap: Point[] = [{ x: 0, y: 0 }, { x: 0.1, y: 0.1 }];
const far: Point[] = [{ x: 150, y: 0 }, { x: 150.1, y: 0.1 }];
const sharp: Point[] = [{ x: -250, y: 100 }, { x: -120, y: -150 }, { x: 0, y: 120 }, { x: 40, y: -60 }, { x: 60, y: 140 }, { x: 250, y: -100 }, { x: 180, y: 100 }];
const uniform = (pts: Point[], extra: Partial<Shape> = {}) => blob(generateStrokeForMode('uniform', pts, 40), { brushMode: 'uniform', brushThickness: 40, originalPoints: pts, ...extra });
const spine: Point[] = Array.from({ length: 21 }, (_, i) => ({ x: -250 + i * 25, y: 0 }));

// scale: supersampling for the table (renderScale), for cases whose detail is below 1 px at 1:1.
export const CASES: ReadonlyArray<{ id: string; label: string; shapes: Shape[]; scale?: number }> = [
	{ id: 'T0', label: 'sin goma (control)', shapes: [base()] },
	{ id: 'T1', label: 'goma sola', shapes: [base(), eraser(circle(0, 0, 100))] },
	{ id: 'T2', label: 'dos gomas solapadas', shapes: [base(), eraser(circle(-60, 0, 120)), eraser(circle(60, 0, 120))] },
	{ id: 'T3a', label: 'goma que se cruza (2 vueltas)', shapes: [base(), eraser(circle(0, 0, 120, 2, 60))] },
	{ id: 'T3b', label: 'goma frotada (zigzag)', shapes: [base(), eraser(zigzag())] },
	{ id: 'T4', label: 'contenido encima de goma', shapes: [base(), eraser(circle(0, 0, 150)), blob(circle(0, 0, 80))] },
	{ id: 'T5', label: 'goma sobre contenido sobre goma', shapes: [base(), eraser(circle(0, 0, 150)), blob(circle(0, 0, 100)), eraser(circle(80, 0, 60))] },
	// Nesting shortcuts of the geometry export (svgGeometry.ts): a shape inside a hole must not count as inside the ink.
	{ id: 'T5b', label: 'goma dentro del agujero de otra (no-op)', shapes: [base(), eraser(circle(0, 0, 150)), eraser(circle(0, 0, 60))] },
	{ id: 'T5c', label: 'pieza dentro de otra + goma entre ambas + drawInside', shapes: [base(), blob(circle(0, 0, 80)), eraser(circle(0, 0, 200)), blob(circle(0, 0, 290), { isDrawInside: true })] },
	{ id: 'T6', label: 'goma con simetría cruzando el eje', shapes: [base(), crossing, mirror(crossing)] },
	{ id: 'T7', label: 'drawInside tras goma', shapes: [base(), eraser(circle(0, 0, 150)), blob(circle(0, 0, 250), { isDrawInside: true })] },
	// Alpha = (base − goma) ∪ relleno: restar las gomas previas al recorte no basta.
	{ id: 'T7b', label: 'drawInside tras goma + relleno parcial del agujero', shapes: [base(), eraser(circle(0, 0, 150)), blob(circle(-100, 0, 90)), blob(circle(0, 0, 250), { isDrawInside: true })] },
	{ id: 'T7e', label: 'drawInside dentro del agujero de una goma', shapes: [base(), eraser(circle(0, 0, 150)), blob(circle(0, 0, 60), { isDrawInside: true })] },
	{ id: 'T7c', label: 'drawInside en capa vacía', shapes: [blob(circle(0, 0, 250), { isDrawInside: true })] },
	{ id: 'T7d', label: 'drawBehind después de drawInside', shapes: [base(), blob(circle(0, 0, 400), { isDrawInside: true }), blob(circle(250, 0, 150), { isDrawBehind: true })] },
	{ id: 'T4b', label: 'drawBehind tras goma (rellena el agujero)', shapes: [base(), eraser(circle(0, 0, 150)), blob(circle(60, 0, 120), { isDrawBehind: true })] },
	{ id: 'T8', label: 'tap de brush tapered', shapes: [blob(generateStrokeForMode('tapered', tap, 40), { brushMode: 'tapered', brushThickness: 40, originalPoints: tap })] },
	{ id: 'T8b', label: 'taps tapered: en el agujero de una goma y como drawInside', shapes: [base(), eraser(circle(0, 0, 150)), blob(generateStrokeForMode('tapered', tap, 40), { brushMode: 'tapered', brushThickness: 40, originalPoints: tap }), blob(generateStrokeForMode('tapered', far, 60), { brushMode: 'tapered', brushThickness: 60, originalPoints: far, isDrawInside: true })] },
	// Crumb filter must only touch erased pieces: a 1-unit tap is a legit tiny dot (BRUSH_THICKNESS_MIN = 1).
	{ id: 'T8c', label: 'taps finos (grosor 1 y 2) tapered y uniform', shapes: [blob(generateStrokeForMode('tapered', tap, 1), { brushMode: 'tapered', brushThickness: 1, originalPoints: tap }), blob(generateStrokeForMode('tapered', far, 2), { brushMode: 'tapered', brushThickness: 2, originalPoints: far }), uniform([{ x: -150, y: 0 }, { x: -149.9, y: 0.1 }], { brushThickness: 1 }), uniform([{ x: 0, y: 150 }, { x: 0.1, y: 150.1 }], { brushThickness: 2 })], scale: 4 },
	{ id: 'T9', label: 'brush uniform (extremos)', shapes: [blob(generateStrokeForMode('uniform', spine, 40), { brushMode: 'uniform', brushThickness: 40, originalPoints: spine })] },
	{ id: 'T9b', label: 'tap de brush uniform', shapes: [uniform(tap)] },
	{ id: 'T9c', label: 'brush uniform con giros bruscos + drawInside tras goma', shapes: [uniform(sharp), eraser(circle(0, 0, 100)), uniform(spine, { isDrawInside: true })] },
	// Text → outlines (v3.17.52). ª/º in Inknut and non-latin glyphs are expected as live <text>.
	...(['pharma', 'noir', 'mansion', 'comic', 'dungeons'] as const).map((font, i) => ({
		id: `T10${'abcde'[i]}`, label: `texto una línea · ${font}`,
		// ×2: at 1:1 Cinzel's hairline serifs flip antialias pixels (11 px, 0 at ×2 and ×4).
		shapes: [text('Vampira ñ, 1º nº — «Año» 100%', { font, align: 'center', fontSize: 40 })],
		scale: 2,
	})),
	{ id: 'T11', label: 'texto varias líneas', shapes: [text('Primera línea\nsegunda, más larga\n¿tercera?', { font: 'pharma' })] },
	{ id: 'T12', label: 'alineaciones izq / centro / der', shapes: [
		text('Izquierda\nlínea dos', { font: 'noir', align: 'left', points: [{ x: -300, y: -200 }] }),
		text('Centro\nlínea dos', { font: 'mansion', align: 'center', points: [{ x: 0, y: 0 }] }),
		text('Derecha\nlínea dos', { font: 'dungeons', align: 'right', points: [{ x: 300, y: 200 }] }),
	] },
	{ id: 'T13', label: 'texto rotado', shapes: [text('Rotado 45°\ny otra línea', { font: 'comic', align: 'center', rotation: 0.8 })] },
	{ id: 'T14', label: 'texto con goma encima', shapes: [text('BORRADO', { font: 'mansion', fontSize: 110 }), eraser(circle(40, 0, 70)), eraser(circle(-160, 30, 40))] },
	{ id: 'T15', label: 'drawInside sobre texto', shapes: [text('DENTRO', { font: 'pharma', fontSize: 120 }), blob(circle(60, 0, 90), { isDrawInside: true })] },
	{ id: 'T16', label: 'caracteres fuera de la fuente', shapes: [text('ok Привет ok', { font: 'noir' })] },
	// Live-text words only get an eraser mask when the eraser reaches them.
	{ id: 'T17', label: 'texto vivo + goma lejos (0 máscaras)', shapes: [text('Año 1º', { font: 'dungeons' }), eraser(circle(200, 250, 40))] },
	{ id: 'T18', label: 'texto vivo + goma encima (1 máscara, permitida)', shapes: [text('Año 1º', { font: 'dungeons' }), eraser(circle(-60, 0, 30))] },
	// Deformed text (textMatrix, v3.17.56). A mirror flips the winding of every glyph contour:
	// T14b, T22–T25 check that nothing downstream decides hole vs ink by orientation (counters of D O B 8 %).
	// T14b = T14 mirrored as a whole (text and erasers): same geometry, opposite winding.
	{ id: 'T14b', label: 'texto espejado con goma encima (T14 espejado)', shapes: [{ ...mirrored(text('BORRADO', { font: 'mansion', fontSize: 110 }), 'horizontal'), points: [{ x: 250, y: 0 }] }, mirror(eraser(circle(40, 0, 70))), mirror(eraser(circle(-160, 30, 40)))] },
	{ id: 'T19', label: 'texto estirado ×1,8', shapes: [stretched(text('ESTIRADO', { font: 'mansion', fontSize: 70 }), 1.8, 1)] },
	{ id: 'T20', label: 'texto aplastado ×0,45 (varias líneas)', shapes: [stretched(text('APLASTADO\nsegunda línea', { font: 'comic', align: 'center', points: [{ x: 0, y: 0 }] }), 1, 0.45)] },
	{ id: 'T21', label: 'texto rotado + estirado (cizalla)', shapes: [stretched(text('CIZALLA\ncon giro', { font: 'noir', rotation: 0.5 }), 1.7, 1)] },
	{ id: 'T22', label: 'texto espejado H con contraformas', shapes: [mirrored(text('DOBRA 80% BOA', { font: 'dungeons', fontSize: 64, align: 'center', points: [{ x: 0, y: 0 }] }), 'horizontal')] },
	{ id: 'T22b', label: 'texto espejado V + rotado, contraformas', shapes: [mirrored(text('BODEGA 8\nOBD', { font: 'pharma', fontSize: 70, rotation: 0.3 }), 'vertical')] },
	// paper.js returned an EMPTY subtract for the E here (the D without the mirror), uncounted: the
	// letter vanished (1629 px). Caught and retried since v3.17.59 (svgGeometry.ts, eraseFrom).
	{ id: 'T23', label: 'texto espejado + goma encima (resta vacía de paper.js)', shapes: [mirrored(text('BODEGA', { font: 'mansion', fontSize: 110, align: 'center', points: [{ x: 0, y: 0 }] }), 'horizontal'), eraser(circle(40, 0, 70)), eraser(circle(-160, 30, 40))] },
	{ id: 'T24', label: 'drawInside en texto espejado y estirado', shapes: [stretched(mirrored(text('DOBLE', { font: 'pharma', fontSize: 120, align: 'center', points: [{ x: 0, y: 0 }] }), 'horizontal'), 1.4, 1), blob(circle(60, 0, 90), { isDrawInside: true })] },
	{ id: 'T25', label: 'texto vivo espejado + estirado + goma encima', shapes: [stretched(mirrored(text('Año 1º', { font: 'dungeons' }), 'horizontal'), 1.5, 1), eraser(circle(-540, 0, 30))] },
];
