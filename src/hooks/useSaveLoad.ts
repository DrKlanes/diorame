import { useRef, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { del } from 'idb-keyval';
import { playSound } from '../utils/soundManager';
import { useStrata } from '../components/strata/StrataContext';
import { UNTITLED_PROJECT_SENTINEL } from '../constants/project';
import { useTranslation } from '../i18n';
import { AUTOSAVE_KEY } from './useAutoSave';
import { cinemaViewForSave } from '../utils/cinemaView';
import { analytics } from '../analytics/analytics';
import { downloadBlob } from '../utils/downloadBlob';
import { DIOR_FORMAT_VERSION, DIOR_MIME, createProjectMeta, projectFileStem, readProjectMeta, type DiorFileMeta } from '../utils/projectMeta';
import {
	canOverwriteFiles, getProjectFileLink, setProjectFileLink, hasWritePermission, pickSaveFile, pickOpenFile,
	writeProjectFile, isDiorFile, isAbortError, type ProjectFileHandle,
} from '../utils/projectFile';
import { renderProjectThumbnail } from '../components/strata/canvas/projectThumbnail';
import { setSavePrompt, type SaveIntent } from './useSavePrompt';
import type { ProjectMeta } from '../types/strataTypes';

export function useSaveLoad() {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Writes the file. Chromium desktop: over the file this drawing is linked to ("Guardar" with the name it was
	// linked with), or a new one chosen in the save dialog ("Guardar como…", first save, or "Guardar" after a
	// rename: new name = new file, the original is never touched). Elsewhere: a download named "<name> (<date time>).dior".
	const performSave = useCallback(async (intent: 'save' | 'saveAs', name: string) => {
		const meta = state.projectMeta;
		let handle: ProjectFileHandle | null = null;
		if (canOverwriteFiles()) {
			try {
				const link = getProjectFileLink(meta.projectId);
				const overwrite = intent === 'save' && link && link.name === name ? link.handle : null;
				// The dialog first, inside the user's gesture: the thumbnail and the payload come after.
				handle = overwrite && await hasWritePermission(overwrite)
					? overwrite
					: await pickSaveFile(`${projectFileStem(name)}.dior`, link?.handle);
			} catch (err) {
				if (isAbortError(err)) return;
				console.warn('[save] file dialog failed, downloading instead:', err);
				handle = null;
			}
		}
		const now = new Date();
		const nextMeta: ProjectMeta = { ...meta, version: meta.version + 1, updatedAt: now.toISOString() };
		const fileMeta: DiorFileMeta = {
			formatVersion: DIOR_FORMAT_VERSION, ...nextMeta,
			shapeCount: state.shapes.length,
			thumbnail: await renderProjectThumbnail(),
		};
		const data = {
			meta: fileMeta,
			shapes: state.shapes, palette: state.palette, totalLayers: state.totalLayers,
			isDarkMode: state.isDarkMode, postProcessing: state.postProcessing,
			postProcessingEnabled: state.postProcessingEnabled,
			// Master FX OFF: the flags are all false and the look that was on is the snapshot (v3.20.5).
			fxMasterEnabled: state.fxMasterEnabled, postProcessingSnapshot: state.postProcessingSnapshot,
			hiddenLayers: state.hiddenLayers, locked3DLayers: state.locked3DLayers,
			projectName: name, layerRenderModes: state.layerRenderModes,
			layerGradParams: state.layerGradParams, currentBrushThickness: state.currentBrushThickness,
			brushMode: state.brushMode, tool: state.tool, activePaletteId: state.activePaletteId,
			// A project without a view of its own (nobody has been in CINEMA yet) saves the defaults, not the placeholders.
			...cinemaViewForSave(state), cinematicSpeed: state.cinematicSpeed,
			isHandheldEnabled: state.isHandheldEnabled, handheldIntensity: state.handheldIntensity,
			paletteApplyToAllActive: state.paletteApplyToAllActive,
			paletteApplyToAllSnapshot: state.paletteApplyToAllSnapshot,
			// View state, not undo state — same category as hiddenLayers/locked3DLayers
			// above. Worth persisting: choosing a good CINEMA framing point takes real
			// work now that the picking is accurate (v3.17.17-25), and losing it on
			// reload was real pain, not a theoretical one.
			pointOfInterest: state.pointOfInterest,
		};
		try {
			const blob = new Blob([JSON.stringify(data)], { type: DIOR_MIME });
			let filename: string;
			if (handle) {
				await writeProjectFile(handle, blob);
				setProjectFileLink(meta.projectId, handle, name);
				filename = handle.name;
			} else {
				filename = `${projectFileStem(name, now)}.dior`;
				downloadBlob(blob, filename);
			}
			toast.success(t('toast.save.successTitle'), { description: t('toast.save.successDesc', { filename }), duration: 2000 });
			playSound('success');
			dispatch({ type: 'PROJECT_SAVED', payload: nextMeta });
			del(AUTOSAVE_KEY).catch(() => {});
			analytics.projectSaved();
		} catch (err) {
			console.warn('[save] failed:', err);
			if (handle) setProjectFileLink(meta.projectId, null);
			toast.error(t('toast.save.errorTitle'), { description: t('common.pleaseRetry') });
		}
	}, [state, dispatch, t]);

	// Before writing: an empty canvas asks first, and a drawing without a name gets one.
	const startSave = useCallback((intent: 'save' | 'saveAs', emptyConfirmed = false) => {
		if (!emptyConfirmed && state.shapes.length === 0) { setSavePrompt({ step: 'empty', intent }); return; }
		if (state.projectName === UNTITLED_PROJECT_SENTINEL) { setSavePrompt({ step: 'name', intent }); return; }
		void performSave(intent, state.projectName);
	}, [state.shapes.length, state.projectName, performSave]);

	const handleSaveProject = useCallback(() => startSave('save'), [startSave]);
	const handleSaveProjectAs = useCallback(() => startSave('saveAs'), [startSave]);
	const handleDuplicateProject = useCallback(() => setSavePrompt({ step: 'name', intent: 'duplicate' }), []);

	// Answers from SaveDialogsV2.
	const confirmEmptySave = useCallback((intent: SaveIntent) => {
		setSavePrompt(null);
		if (intent !== 'duplicate') startSave(intent, true);
	}, [startSave]);

	const confirmProjectName = useCallback((intent: SaveIntent, name: string) => {
		setSavePrompt(null);
		dispatch(intent === 'duplicate'
			? { type: 'DUPLICATE_PROJECT', payload: { projectName: name } }
			: { type: 'SET_PROJECT_NAME', payload: name });
		if (intent === 'duplicate') {
			toast.success(t('toast.duplicate.title'), { description: t('toast.duplicate.desc', { name }), duration: 3000 });
			return;
		}
		void performSave(intent, name);
	}, [dispatch, performSave, t]);

	// `handle`: the file on disk (Chromium open dialog, or the OS through launchQueue). A real .dior stays
	// linked, so "Guardar" writes over it; any other load unlinks.
	const handleLoadProject = useCallback((file: File, handle: ProjectFileHandle | null = null) => {
		if (file.size > 50 * 1024 * 1024) {
			toast.error(t('toast.load.errorDescFile'), { description: t('toast.load.errorDescSize') });
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const json = JSON.parse(ev.target?.result as string);
				if (!json || typeof json !== 'object' || !Array.isArray(json.shapes)) throw new Error('Invalid project format');
				// Decided here, not in the reducer, so the linked file knows its projectId.
				const meta = readProjectMeta(json.meta) ?? createProjectMeta();
				dispatch({ type: 'LOAD_PROJECT', payload: { ...json, meta } });
				const loadedName = typeof json.projectName === 'string' ? json.projectName.slice(0, 100) : '';
				setProjectFileLink(meta.projectId, handle && isDiorFile(handle.name) ? handle : null, loadedName === 'Untitled Project' ? UNTITLED_PROJECT_SENTINEL : loadedName);
				const n = json.shapes.length;
				const desc = n === 1 ? t('toast.load.successDescOne', { n }) : t('toast.load.successDesc', { n });
				toast.success(t('toast.load.successTitle'), { description: desc, duration: 2000 });
				analytics.projectLoaded();
			} catch (err) {
				toast.error(t('toast.load.errorTitle'), { description: err instanceof Error ? err.message : t('toast.load.errorDescGeneric') });
			}
		};
		reader.readAsText(file);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}, [dispatch, t]);

	const triggerFileSelect = useCallback(() => {
		if (!canOverwriteFiles()) { fileInputRef.current?.click(); return; }
		pickOpenFile()
			.then(async handle => { if (handle) handleLoadProject(await handle.getFile(), handle); })
			.catch(err => {
				if (isAbortError(err)) return;
				console.warn('[load] file dialog failed:', err);
				fileInputRef.current?.click();
			});
	}, [handleLoadProject]);

	return {
		handleSaveProject, handleSaveProjectAs, handleDuplicateProject, confirmEmptySave, confirmProjectName,
		handleLoadProject, triggerFileSelect, fileInputRef,
	};
}
