import type { ProjectMeta } from '../types/strataTypes';

// .dior format v2 (v3.21.0): the file is still plain JSON, with a `meta` block that tells which drawing it is,
// which version and how it looks. Files without it (v1) open as before and get a fresh meta in memory.
export const DIOR_FORMAT_VERSION = 2;

// Not application/json: Safari and iPadOS append ".json" to a download of that type.
export const DIOR_MIME = 'application/octet-stream';

// What the open dialogs accept: files saved before v3.21.0 on Safari/iPad are named "x.dior.json".
export const DIOR_ACCEPT = '.dior,.json,application/json';

export type DiorFileMeta = ProjectMeta & {
	formatVersion: number;
	shapeCount: number;
	thumbnail: string | null; // data: URL, WebP (JPEG where the browser cannot encode WebP), 256 px long side
};

export function createProjectMeta(derivedFrom: string | null = null): ProjectMeta {
	return { projectId: crypto.randomUUID(), version: 0, createdAt: new Date().toISOString(), updatedAt: null, derivedFrom };
}

// The meta a loaded payload (file or autosave) carries, or null if it has none usable. Field by field: a
// valid projectId is enough, the rest falls back.
export function readProjectMeta(raw: unknown): ProjectMeta | null {
	if (!raw || typeof raw !== 'object') return null;
	const m = raw as Record<string, unknown>;
	if (typeof m.projectId !== 'string' || m.projectId.length === 0 || m.projectId.length > 64) return null;
	const isoOrNull = (v: unknown) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
	return {
		projectId: m.projectId,
		version: typeof m.version === 'number' && Number.isInteger(m.version) && m.version >= 0 ? m.version : 0,
		createdAt: isoOrNull(m.createdAt) ?? new Date().toISOString(),
		updatedAt: isoOrNull(m.updatedAt),
		derivedFrom: typeof m.derivedFrom === 'string' && m.derivedFrom.length <= 64 ? m.derivedFrom : null,
	};
}

// "<name> (YYYY-MM-DD HH-mm)": the time keeps several saves of one day from turning into "(1)", "(2)".
export function projectFileStem(name: string, date?: Date): string {
	const clean = name
		.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/[. ]+$/, '')
		.slice(0, 80)
		.trim() || 'Diorame';
	if (!date) return clean;
	const p = (n: number) => String(n).padStart(2, '0');
	return `${clean} (${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}-${p(date.getMinutes())})`;
}
