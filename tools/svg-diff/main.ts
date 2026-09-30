import '../../src/fonts';
import { CASES } from './cases';
import { TEXT_FONTS } from '../../src/utils/textLayout';
import { runScene, diffImage, auditStrokes, auditGlyphs, type LayerRun } from './harness';
import type { Shape } from '../../src/types/strataTypes';

const CASE_SIZE = 1400;
const SCENE_SIZE = 1700;

type Row = { id: string; label: string; z: number; structPx: number; rawPct: number; structOfInk: number; sc: number; masks: number; texts: number };

const out = document.getElementById('out')!;
const status = document.getElementById('status')!;
const images = document.getElementById('images')!;

const toRow = (id: string, label: string, r: LayerRun): Row => ({
	id, label, z: r.z, structPx: r.structPx, rawPct: r.rawPct, structOfInk: r.structOfInk, sc: r.sc, masks: r.masks, texts: r.texts,
});

const renderTable = (rows: Row[]) => {
	const head = '<tr><th>caso</th><th>escena</th><th>capa</th><th>px distintos (estructural)</th><th>% de la tinta</th><th>% crudo (con AA)</th><th>escala</th><th>máscaras</th><th>&lt;text&gt;</th></tr>';
	const body = rows.map(r => `<tr class="${r.masks > 0 || (r.structPx > 10 && r.texts === 0) ? 'bad' : r.texts > 0 ? 'live' : r.structPx > 10 ? 'bad' : 'ok'}"><td>${r.id}</td><td>${r.label}</td><td>${r.z}</td><td>${r.structPx}</td><td>${r.structOfInk}</td><td>${r.rawPct}</td><td>${r.sc}</td><td>${r.masks}</td><td>${r.texts}</td></tr>`).join('');
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

// Canvas must paint the app's real faces (the reference), not a system fallback.
const fontsReady = Promise.all(Object.values(TEXT_FONTS).map(f => document.fonts.load(`${f.weight} 64px ${f.family}`)));

const runCases = async () => {
	await fontsReady;
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

// Glyph audit (text → outlines): per face, how many characters export as a matching outline,
// how many fall back to live text, and how many export a WRONG outline (must be 0).
const runGlyphAudit = async () => {
	status.textContent = 'auditoría de glifos…';
	const audit = await auditGlyphs();
	(window as unknown as { __svgGlyphs: typeof audit }).__svgGlyphs = audit;
	const rowsHtml = Object.entries(audit).map(([k, r]) =>
		`<tr class="${r.bad.length ? 'bad' : 'ok'}"><td>${k}</td><td>${r.total}</td><td>${r.contour}</td><td>${r.fallback.length} ${r.fallback.join(' ')}</td><td>${r.bad.length} ${r.bad.join(' ')}</td></tr>`).join('');
	const table = document.createElement('div');
	table.innerHTML = `<h2>Glifos</h2><table><tr><th>fuente</th><th>glifos</th><th>contorno OK</th><th>&lt;text&gt; (reserva)</th><th>contorno MALO</th></tr>${rowsHtml}</table>`;
	out.after(table);
};

// ?manual: run nothing on load (automation drives harness.ts itself; captureSVG patches
// URL.createObjectURL globally, so two runs at once would collide).
if (!new URLSearchParams(location.search).has('manual')) {
	runCases().then(runGlyphAudit).then(() => { status.textContent = 'listo'; publish(); });
}
