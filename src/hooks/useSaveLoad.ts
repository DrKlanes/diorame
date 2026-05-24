import { useRef, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { del } from 'idb-keyval';
import { useStrata } from '../components/strata/StrataContext';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../constants/project';
import { useTranslation } from '../i18n';
import { AUTOSAVE_KEY } from './useAutoSave';

export function useSaveLoad() {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSaveProject = useCallback(() => {
		const data = {
			shapes: state.shapes, palette: state.palette, totalLayers: state.totalLayers,
			isDarkMode: state.isDarkMode, postProcessing: state.postProcessing,
			postProcessingEnabled: state.postProcessingEnabled, cinematicType: state.cinematicType,
			hiddenLayers: state.hiddenLayers, locked3DLayers: state.locked3DLayers,
			projectName: state.projectName, layerRenderModes: state.layerRenderModes,
			layerGradParams: state.layerGradParams, currentLineThickness: state.currentLineThickness,
			lineMode: state.lineMode, tool: state.tool, activePaletteId: state.activePaletteId,
			focalLength: state.focalLength, viewZoomOffset: state.viewZoomOffset,
			layerSpacingFactor: state.layerSpacingFactor, cinematicSpeed: state.cinematicSpeed,
			isHandheldEnabled: state.isHandheldEnabled, handheldIntensity: state.handheldIntensity,
			paletteApplyToAllActive: state.paletteApplyToAllActive,
			paletteApplyToAllSnapshot: state.paletteApplyToAllSnapshot,
		};
		const displayName = state.projectName === UNTITLED_PROJECT_SENTINEL
			? t('topbar.file.untitledProject')
			: state.projectName;
		const sanitized = getFilenameBase(displayName);
		setTimeout(() => {
			let url: string | null = null;
			let link: HTMLAnchorElement | null = null;
			try {
				const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
				url = URL.createObjectURL(blob);
				link = document.createElement('a');
				link.href = url;
				link.download = `${sanitized}-${Date.now()}.dior`;
				link.style.display = 'none';
				document.body.appendChild(link);
				link.click();
				toast.success(t('toast.save.successTitle'), { description: t('toast.save.successDesc', { filename: sanitized }), duration: 2000 });
				dispatch({ type: 'MARK_CLEAN' });
				del(AUTOSAVE_KEY).catch(() => {});
			} catch (err) {
				toast.error(t('toast.save.errorTitle'), { description: t('common.pleaseRetry') });
			} finally {
				setTimeout(() => {
					try { if (link?.parentNode) document.body.removeChild(link!); } catch (_) { /* */ }
					if (url) URL.revokeObjectURL(url);
				}, 200);
			}
		}, 0);
	}, [state, t]);

	const handleLoadProject = useCallback((file: File) => {
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
				dispatch({ type: 'LOAD_PROJECT', payload: json });
				const n = json.shapes.length;
				const desc = n === 1 ? t('toast.load.successDescOne', { n }) : t('toast.load.successDesc', { n });
				toast.success(t('toast.load.successTitle'), { description: desc, duration: 2000 });
			} catch (err) {
				toast.error(t('toast.load.errorTitle'), { description: err instanceof Error ? err.message : t('toast.load.errorDescGeneric') });
			}
		};
		reader.readAsText(file);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}, [dispatch, t]);

	const triggerFileSelect = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	return { handleSaveProject, handleLoadProject, triggerFileSelect, fileInputRef };
}
