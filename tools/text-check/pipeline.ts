// Sections that go through the real render pipeline (renderFrame, via svg-diff's renderReference).
import { renderReference, calibrate, type Calibration } from '../svg-diff/harness';
import { appReducer, initialState } from '../../src/components/strata/StrataContext';
import type { Shape } from '../../src/types/strataTypes';
import { reduce, stretch, flip, text, polygon } from './ink';
import type { Row } from './checks';

const SIZE = 900;

// ── 3 · drawInside keeps fitting inside a stretched / mirrored text ──────────────────────────
// After a layer transform A, the layer must be the image of the old one under A: after(p) has the
// ink class (text / inside shape) that before(A⁻¹ p) had, within 2 px. Independent of any text
// math — it compares two renders. The CONTROL rebuilds the pre-v3.17.56 result (text left as the
// old reducer left it, drawInside transformed) and must show a misfit: that is the self-test.
type Cls = Uint8Array; // 0 background, 1 text (black), 2 drawInside (red)
const classify = (c: HTMLCanvasElement): Cls => {
	const d = c.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data, out = new Uint8Array(SIZE * SIZE);
	for (let i = 0; i < out.length; i++) {
		const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
		out[i] = r > 150 && g < 110 && b < 110 ? 2 : r < 110 && g < 110 && b < 110 ? 1 : 0;
	}
	return out;
};
const misfit = (before: Cls, after: Cls, inv: (x: number, y: number) => [number, number], cal: Calibration) => {
	let bad = 0, total = 0;
	for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
		const k = after[y * SIZE + x];
		if (k !== 2) continue;
		total++;
		const [qx, qy] = inv((x + 0.5 - cal.tx) / cal.sc, (y + 0.5 - cal.ty) / cal.sc);
		const bx = Math.floor(cal.tx + cal.sc * qx), by = Math.floor(cal.ty + cal.sc * qy);
		let ok = false;
		for (let dy = -2; dy <= 2 && !ok; dy++) for (let dx = -2; dx <= 2 && !ok; dx++) {
			const X = bx + dx, Y = by + dy;
			if (X >= 0 && Y >= 0 && X < SIZE && Y < SIZE && before[Y * SIZE + X] === k) ok = true;
		}
		if (!ok) bad++;
	}
	return total ? (100 * bad) / total : 100;
};

export const checkDrawInside = (): Row[] => {
	const cal = calibrate(0, SIZE);
	const rows: Row[] = [];
	for (const font of ['pharma', 'dungeons', 'comic'] as const) {
		const scene: Shape[] = [
			{ ...text(font, 'OBD\nBOA', 0.2, 'left', -150, -20, 110), id: 'di-text' },
			polygon('di-in', [{ x: -260, y: -40 }, { x: 260, y: -70 }, { x: 260, y: 10 }, { x: -260, y: 40 }], { color: '#ff0000', isDrawInside: true }),
		];
		const before = classify(renderReference(scene, 0, SIZE));
		const cases: [string, Parameters<typeof reduce>[1][number], (x: number, y: number) => [number, number]][] = [
			['estirado ×1,7', stretch(1.7, 1, 10, 5), (x, y) => [10 + (x - 10) / 1.7, y]],
			['aplastado ×0,5', stretch(1, 0.5, 10, 5), (x, y) => [x, 5 + (y - 5) / 0.5]],
			['espejado H', flip('horizontal', 10, 5), (x, y) => [20 - x, y]],
			['espejado V', flip('vertical', 10, 5), (x, y) => [x, 10 - y]],
		];
		for (const [name, action, inv] of cases) {
			const post = reduce(scene, [action]);
			const now = misfit(before, classify(renderReference(post, 0, SIZE)), inv, cal);
			const t0 = scene[0];
			const oldText = action.type === 'FLIP_LAYER'
				? { ...t0, points: post[0].points, rotation: -(t0.rotation || 0), align: action.payload.direction === 'horizontal' ? 'right' as const : 'left' as const }
				: t0;
			const ctrl = misfit(before, classify(renderReference([oldText, post[1]], 0, SIZE)), inv, cal);
			rows.push({ label: `${font} · ${name}`, detail: `forma interior desencajada ${now.toFixed(2)} % · control (comportamiento antiguo) ${ctrl.toFixed(1)} % → el control debe desencajar`, ok: now <= 0.5 && ctrl > 2 });
		}
	}
	return rows;
};

// ── 4 · Live Move preview = what the reducer commits ─────────────────────────────────────────
const pixelsDiffer = (a: HTMLCanvasElement, b: HTMLCanvasElement) => {
	const da = a.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data, db = b.getContext('2d')!.getImageData(0, 0, SIZE, SIZE).data;
	let n = 0;
	for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++;
	return n;
};
const seeded = <T>(f: () => T): T => {
	let seed = 7;
	const r = Math.random, now = Date.now;
	Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
	Date.now = () => 1000;
	try { return f(); } finally { Math.random = r; Date.now = now; }
};

export const checkPreview = (): Row[] => {
	const scene: Shape[] = [
		{ ...text('dungeons', 'VIVO\nPREVIA', 0.35, 'left', -120, -10, 60), id: 'lp-text' },
		polygon('lp-stroke', [{ x: -250, y: 80 }, { x: -180, y: 80 }, { x: -180, y: 150 }, { x: -250, y: 150 }], { color: '#223d57' }),
		polygon('lp-in', [{ x: -200, y: -30 }, { x: 200, y: -50 }, { x: 200, y: 0 }, { x: -200, y: 20 }], { color: '#ff0000', isDrawInside: true }),
	];
	const cx = 10, cy = 20;
	const transforms: [string, { x: number; y: number; scale: number; rotation: number; scaleX?: number; scaleY?: number }][] = [
		['lateral ×1,6', { x: 12, y: -8, scale: 1, rotation: 0, scaleX: 1.6, scaleY: 1 }],
		['lateral ×0,6', { x: 0, y: 0, scale: 1, rotation: 0, scaleX: 1, scaleY: 0.6 }],
		['uniforme + giro (camino antiguo)', { x: 5, y: 5, scale: 1.3, rotation: 0.4 }],
	];
	return transforms.map(([name, t]) => {
		const preview = seeded(() => renderReference(scene, 0, SIZE, 1, {
			state: { tool: 'move' },
			transformState: { isActive: true, mode: 'scale_r', startP: { x: 0, y: 0 }, startTransform: { x: 0, y: 0, scale: 1, rotation: 0 }, centerX: cx, centerY: cy, layerBB: null, currentTransform: t, engaged: true },
		}));
		const committed = reduce(scene, [{ type: 'TRANSFORM_LAYER', payload: { layerIndex: 0, transform: { rotation: t.rotation, scale: t.scale, dx: t.x, dy: t.y, centerX: cx, centerY: cy, ...(t.scaleX !== undefined ? { scaleX: t.scaleX, scaleY: t.scaleY } : {}) } } }]);
		const after = seeded(() => renderReference(committed, 0, SIZE, 1, { state: { tool: 'move' } }));
		const untouched = seeded(() => renderReference(scene, 0, SIZE, 1, { state: { tool: 'move' } }));
		const diff = pixelsDiffer(preview, after), moved = pixelsDiffer(untouched, after);
		return { label: name, detail: `vista previa vs soltado ${diff} px · sin transformar vs soltado ${moved} px (debe ser > 0)`, ok: diff === 0 && moved > 0 };
	});
};

// ── 5 · Legacy .dior fingerprints (0 px change on texts saved before a render change) ─────────
// Loaded through the real LOAD_PROJECT, rendered per shape and per layer with Math.random seeded,
// SHA-256 of the pixels. Compared with the reference FIXED IN THIS BROWSER (localStorage): fix it
// before touching the text render, compare after. Self-tests: two passes agree; 0.001 rad on one
// text changes its fingerprint.
export const FIXTURE = '/tools/svg-diff/fixtures/text-legacy-v3.17.55.dior';
const REF_KEY = 'text-check:fingerprints';
const sha = async (d: Uint8ClampedArray) =>
	Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', d as Uint8ClampedArray<ArrayBuffer>))).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

export const fingerprints = async (perturbId?: string): Promise<Record<string, string>> => {
	const payload = await (await fetch(FIXTURE)).json();
	const st = appReducer(initialState, { type: 'LOAD_PROJECT', payload });
	const extra = { state: { layerRenderModes: st.layerRenderModes, layerGradParams: st.layerGradParams, totalLayers: st.totalLayers } };
	const pixels = (own: Shape[], z: number) =>
		seeded(() => renderReference(own, z, 1100, 1, extra)).getContext('2d')!.getImageData(0, 0, 1100, 1100).data;
	const out: Record<string, string> = {};
	for (const z of [...new Set(st.shapes.map(s => s.zIndex))]) out[`capa ${z}`] = await sha(pixels(st.shapes.filter(s => s.zIndex === z), z));
	for (const s of st.shapes) {
		const shape = s.id === perturbId ? { ...s, rotation: (s.rotation || 0) + 0.001 } : s;
		out[s.id] = await sha(pixels([shape], s.zIndex));
	}
	return out;
};
export const readReference = (): Record<string, string> | null => {
	try { return JSON.parse(localStorage.getItem(REF_KEY) || 'null'); } catch { return null; }
};
export const saveReference = (fp: Record<string, string>) => {
	try { localStorage.setItem(REF_KEY, JSON.stringify(fp)); } catch { /* private mode: reference not kept */ }
};

export const checkFingerprints = async (): Promise<Row[]> => {
	const a = await fingerprints(), b = await fingerprints();
	const keys = Object.keys(a);
	const pert = await fingerprints('L2-pharma');
	const rows: Row[] = [
		{ label: 'AUTOCOMPROBACIÓN · dos pasadas iguales', detail: `${keys.filter(k => a[k] === b[k]).length}/${keys.length}`, ok: keys.every(k => a[k] === b[k]) },
		{ label: 'AUTOCOMPROBACIÓN · +0,001 rad en L2-pharma cambia su huella', detail: `${a['L2-pharma']} → ${pert['L2-pharma']}`, ok: a['L2-pharma'] !== pert['L2-pharma'] },
	];
	const ref = readReference();
	if (!ref) rows.push({ label: 'referencia', detail: 'sin referencia fijada en este navegador: pulsa «Fijar referencia» ANTES de tocar el render', ok: false });
	else {
		const diff = keys.filter(k => ref[k] !== a[k]);
		rows.push({ label: 'contra la referencia fijada', detail: diff.length ? `${keys.length - diff.length}/${keys.length} iguales · distintas: ${diff.join(', ')}` : `${keys.length}/${keys.length} idénticas`, ok: diff.length === 0 });
	}
	(window as unknown as { __textCheckFingerprints: Record<string, string> }).__textCheckFingerprints = a;
	return rows;
};
