import '../../src/fonts';
import { TEXT_FONTS } from '../../src/utils/textLayout';
import { checkGizmo, checkPick, type Row } from './checks';
import { checkDrawInside, checkPreview, checkFingerprints, saveReference } from './pipeline';

const out = document.getElementById('out')!;
const status = document.getElementById('status')!;

type Section = { id: string; title: string; run: () => Row[] | Promise<Row[]> };
const SECTIONS: Section[] = [
	{ id: 'gizmo', title: '1 · Caja del gizmo contra la tinta pintada (tinta fuera ≤ 1 px, sobrante ≤ 2 px)', run: checkGizmo },
	{ id: 'pick', title: '2 · Picking de CINEMA contra la tinta pintada (sin cubrir ≤ 2 px, 0 aciertos lejos)', run: checkPick },
	{ id: 'drawinside', title: '3 · drawInside dentro de texto estirado / espejado (reducer real, dos renders)', run: checkDrawInside },
	{ id: 'preview', title: '4 · Vista previa del Move = resultado al soltar (renderFrame)', run: checkPreview },
	{ id: 'fingerprints', title: '5 · Huellas del .dior antiguo (0 px de cambio en el render de texto)', run: checkFingerprints },
];

const results: { id: string; rows: Row[] }[] = [];
const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const render = () => {
	out.innerHTML = results.map(({ id, rows }) => {
		const s = SECTIONS.find(x => x.id === id)!;
		const failed = rows.filter(r => !r.ok).length;
		const body = rows.map(r => `<tr class="${r.ok ? 'ok' : 'bad'}"><td>${escape(r.label)}</td><td>${escape(r.detail)}</td><td>${r.ok ? 'OK' : 'FALLA'}</td></tr>`).join('');
		return `<h2>${escape(s.title)} — ${failed ? `${failed} FALLAN` : 'todo OK'}</h2><table>${body}</table>`;
	}).join('');
};

// Canvas must paint the app's real faces, not a system fallback.
const fontsReady = Promise.all(Object.values(TEXT_FONTS).map(f => document.fonts.load(`${f.weight} 64px ${f.family}`)));

const run = async (only: string[] | null) => {
	await fontsReady;
	for (const s of SECTIONS) {
		if (only && !only.includes(s.id)) continue;
		status.textContent = `${s.title}…`;
		await new Promise(r => setTimeout(r, 0));
		results.push({ id: s.id, rows: await s.run() });
		render();
	}
	const failed = results.reduce((n, r) => n + r.rows.filter(x => !x.ok).length, 0);
	status.textContent = failed ? `listo · ${failed} FALLAN` : 'listo · todo OK';
	(window as unknown as { __textCheck: typeof results }).__textCheck = results.slice();
};

document.getElementById('fix')!.addEventListener('click', () => {
	const fp = (window as unknown as { __textCheckFingerprints?: Record<string, string> }).__textCheckFingerprints;
	if (!fp) { status.textContent = 'ejecuta primero la sección 5'; return; }
	saveReference(fp);
	status.textContent = `referencia fijada: ${Object.keys(fp).length} huellas`;
});

// ?only=gizmo,pick runs a subset; ?manual runs nothing (automation calls the checks itself).
const params = new URLSearchParams(location.search);
if (!params.has('manual')) run(params.get('only')?.split(',') ?? null);
