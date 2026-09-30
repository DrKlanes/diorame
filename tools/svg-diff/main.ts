import { CASES } from './cases';
import { runScene, diffImage, auditStrokes, type LayerRun } from './harness';
import type { Shape } from '../../src/types/strataTypes';

const CASE_SIZE = 1400;
const SCENE_SIZE = 1700;

type Row = { id: string; label: string; z: number; structPx: number; rawPct: number; structOfInk: number; sc: number; masks: number };

const out = document.getElementById('out')!;
const status = document.getElementById('status')!;
const images = document.getElementById('images')!;

const toRow = (id: string, label: string, r: LayerRun): Row => ({
	id, label, z: r.z, structPx: r.structPx, rawPct: r.rawPct, structOfInk: r.structOfInk, sc: r.sc, masks: r.masks,
});

const renderTable = (rows: Row[]) => {
	const head = '<tr><th>caso</th><th>escena</th><th>capa</th><th>px distintos (estructural)</th><th>% de la tinta</th><th>% crudo (con AA)</th><th>escala</th><th>máscaras</th></tr>';
	const body = rows.map(r => `<tr class="${r.structPx > 10 || r.masks > 0 ? 'bad' : 'ok'}"><td>${r.id}</td><td>${r.label}</td><td>${r.z}</td><td>${r.structPx}</td><td>${r.structOfInk}</td><td>${r.rawPct}</td><td>${r.sc}</td><td>${r.masks}</td></tr>`).join('');
	out.innerHTML = `<table>${head}${body}</table>`;
};

const addImage = (title: string, r: LayerRun) => {
	const fig = document.createElement('figure');
	const cap = document.createElement('figcaption');
	cap.textContent = `${title} · capa ${r.z} · ${r.structPx} px`;
	const img = new Image();
	img.src = diffImage(r.reference, r.candidate).toDataURL();
	fig.append(img, cap);
	images.append(fig);
};

const rows: Row[] = [];

const runCases = async () => {
	for (const c of CASES) {
		status.textContent = `${c.id}…`;
		const [r] = await runScene(c.shapes, CASE_SIZE, c.scale ?? 1);
		rows.push(toRow(c.id, c.label, r));
		if (r.structPx > 10 || r.masks > 0) addImage(c.id, r);
		renderTable(rows);
	}
};

// A saved .dior is `{ shapes, ... }` (useSaveLoad) — only the geometry matters here. Same
// per-shape migration LOAD_PROJECT applies (StrataContext): lineMode/lineThickness → brush*.
type LegacyShape = Shape & { lineMode?: Shape['brushMode']; lineThickness?: number };
const runDior = async (file: File) => {
	const shapes = (JSON.parse(await file.text()) as { shapes: LegacyShape[] }).shapes.map(({ lineMode, lineThickness, ...s }) => ({
		...s,
		brushMode: s.brushMode ?? lineMode,
		brushThickness: s.brushThickness ?? lineThickness,
	}));
	status.textContent = `${file.name}…`;
	for (const r of await runScene(shapes, SCENE_SIZE)) {
		rows.push(toRow(file.name, `${shapes.length} shapes`, r));
		addImage(file.name, r);
	}
	renderTable(rows);
	const audit = await auditStrokes(shapes);
	status.textContent = `listo · brush uniform: ${audit.total} trazos, ${audit.bad} con >10 px distintos (peor ${audit.worstPx} px)`;
	(window as unknown as { __svgAudit: typeof audit }).__svgAudit = audit;
	publish();
};

// Machine-readable result for automated runs (preview browser / devtools).
const publish = () => { (window as unknown as { __svgDiff: Row[] }).__svgDiff = rows.slice(); };

document.getElementById('dior')!.addEventListener('change', e => {
	const f = (e.target as HTMLInputElement).files?.[0];
	if (f) runDior(f);
});

runCases().then(() => { status.textContent = 'listo'; publish(); });
