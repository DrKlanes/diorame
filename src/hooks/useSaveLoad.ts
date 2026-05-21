import { useRef, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { useStrata } from '../components/strata/StrataContext';

export function useSaveLoad() {
	const { state, dispatch } = useStrata();
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
		};
		const sanitized = state.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
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
				toast.success('Project saved', { description: `${sanitized}.dior`, duration: 2000 });
			} catch (err) {
				toast.error('Failed to save', { description: 'Please try again' });
			} finally {
				setTimeout(() => {
					try { if (link?.parentNode) document.body.removeChild(link!); } catch (_) { /* */ }
					if (url) URL.revokeObjectURL(url);
				}, 200);
			}
		}, 0);
	}, [state]);

	const handleLoadProject = useCallback((file: File) => {
		if (file.size > 50 * 1024 * 1024) {
			toast.error('File too large', { description: 'Maximum file size is 50 MB' });
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const json = JSON.parse(ev.target?.result as string);
				if (!json || typeof json !== 'object' || !Array.isArray(json.shapes)) throw new Error('Invalid project format');
				dispatch({ type: 'LOAD_PROJECT', payload: json });
				toast.success('Project loaded', { description: `${json.shapes.length} shapes`, duration: 2000 });
			} catch (err) {
				toast.error('Failed to load project', { description: err instanceof Error ? err.message : 'Check file validity' });
			}
		};
		reader.readAsText(file);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}, [dispatch]);

	const triggerFileSelect = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	return { handleSaveProject, handleLoadProject, triggerFileSelect, fileInputRef };
}
