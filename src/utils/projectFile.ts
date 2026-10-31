// Overwriting the same .dior (v3.21.0) — Chromium desktop only, through the File System Access API. Everywhere
// else (iPad, Safari, Firefox) a save is a new download, and the UI must not promise otherwise.

type FileHandle = {
	name: string;
	getFile(): Promise<File>;
	createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
	queryPermission?(d: { mode: 'readwrite' }): Promise<PermissionState>;
	requestPermission?(d: { mode: 'readwrite' }): Promise<PermissionState>;
};

type PickerOptions = {
	id?: string;
	suggestedName?: string;
	startIn?: FileHandle;
	multiple?: boolean;
	types?: { description: string; accept: Record<string, string[]> }[];
};

type FSWindow = Window & {
	showSaveFilePicker?: (o: PickerOptions) => Promise<FileHandle>;
	showOpenFilePicker?: (o: PickerOptions) => Promise<FileHandle[]>;
	launchQueue?: { setConsumer(cb: (params: { files?: FileHandle[] }) => void): void };
};

export type ProjectFileHandle = FileHandle;

const fsWindow = () => window as FSWindow;

// Cross-origin iframes have the functions but throw; the app is never framed, and a throw falls back to download.
export const canOverwriteFiles = () =>
	typeof fsWindow().showSaveFilePicker === 'function' && typeof fsWindow().showOpenFilePicker === 'function';

const PICKER_TYPES = [{ description: 'Diorame', accept: { 'application/octet-stream': ['.dior'] } }];
const OPEN_TYPES = [{ description: 'Diorame', accept: { 'application/octet-stream': ['.dior'], 'application/json': ['.json'] } }];
const PICKER_ID = 'diorame-projects';

// The file the current drawing is saved in. Tied to its projectId: a new canvas, a duplicate or another file
// opened never inherit it. `name` is the project name the link was made with: a different name in the document
// means a new file (v3.22.1), whatever the file on disk is called.
export type ProjectFileLink = { handle: FileHandle; name: string };
let current: (ProjectFileLink & { projectId: string }) | null = null;

export function getProjectFileLink(projectId: string): ProjectFileLink | null {
	return current && current.projectId === projectId ? current : null;
}

export function setProjectFileLink(projectId: string, handle: FileHandle | null, name = ''): void {
	current = handle ? { projectId, handle, name } : null;
}

// Only a real .dior is adopted for overwriting: a "x.dior.json" opened from an old save gets a clean .dior
// at its first save instead.
export const isDiorFile = (name: string) => /\.dior$/i.test(name);

export const isAbortError = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

// Must run inside the user's gesture (Chromium requires transient activation).
// `startIn`: the linked file, so the dialog opens in its folder.
export function pickSaveFile(suggestedName: string, startIn?: FileHandle): Promise<FileHandle> {
	return fsWindow().showSaveFilePicker!({ id: PICKER_ID, suggestedName, types: PICKER_TYPES, ...(startIn ? { startIn } : {}) });
}

export async function pickOpenFile(): Promise<FileHandle | null> {
	const handles = await fsWindow().showOpenFilePicker!({ id: PICKER_ID, multiple: false, types: OPEN_TYPES });
	return handles[0] ?? null;
}

// A handle from the open dialog or the OS (launchQueue) is read-only until the user allows writing.
export async function hasWritePermission(handle: FileHandle): Promise<boolean> {
	if (!handle.queryPermission || !handle.requestPermission) return true;
	if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') return true;
	return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
}

export async function writeProjectFile(handle: FileHandle, blob: Blob): Promise<void> {
	const writable = await handle.createWritable();
	await writable.write(blob);
	await writable.close();
}

// Desktop PWA: a .dior opened from the OS (manifest file_handlers) arrives here.
export function onLaunchedFile(cb: (handle: FileHandle) => void): void {
	const queue = fsWindow().launchQueue;
	if (!queue) return;
	queue.setConsumer(params => {
		const handle = params.files?.[0];
		if (handle) cb(handle);
	});
}
