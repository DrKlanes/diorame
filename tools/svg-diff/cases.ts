// Synthetic scenes for the SVG fidelity table. World units, single layer at z=0, ink
// forced to black by the harness. Each case isolates one compositing mechanism.
import { generateStrokeForMode } from '../../src/utils/strokeGenerators';
import type { Point, Shape } from '../../src/types/strataTypes';

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

const base = () => blob(circle(0, 0, 300));
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
];
