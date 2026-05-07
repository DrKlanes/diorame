import React, { useRef, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { DiPill, DiVSep } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { IconBtn } from './_shared';

interface FileControlsPillProps { dark: boolean; }

export function FileControlsPill({ dark }: FileControlsPillProps) {
	const { state, dispatch } = useStrata();
	const filename = state.projectName;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(filename);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const iconColor = dk(dark, T.dark, T.textDark) as string;

	const handleNew = () => {
		if (!window.confirm('Clear canvas? This cannot be undone.')) return;
		dispatch({ type: 'CLEAR_CANVAS' });
		dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
	};

	const handleOpen = () => fileInputRef.current?.click();

	const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
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
	};

	const handleSave = () => {
		try {
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
		} catch (err) {
			toast.error('Failed to save', { description: 'Please try again' });
		}
	};

	const handleExport = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'svg' });
	const handleUndo   = () => dispatch({ type: 'UNDO' });
	const handleRedo   = () => dispatch({ type: 'REDO' });

	const commitFilename = () => {
		setEditing(false);
		const trimmed = draft.trim();
		if (trimmed && trimmed !== filename) {
			dispatch({ type: 'SET_PROJECT_NAME', payload: trimmed });
		} else {
			setDraft(filename);
		}
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".dior"
				style={{ display: 'none' }}
				onChange={handleLoad}
			/>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<IconBtn name="new"    onClick={handleNew}    dark={dark} tooltip="Nuevo" />
				<IconBtn name="open"   onClick={handleOpen}   dark={dark} tooltip="Abrir" />
				<IconBtn name="save"   onClick={handleSave}   dark={dark} tooltip="Guardar" />
				<IconBtn name="export" onClick={handleExport} dark={dark} tooltip="Exportar SVG" />

				<DiVSep dark={dark} />

				<IconBtn name="undo" onClick={handleUndo} dark={dark} tooltip="Deshacer (Ctrl+Z)" />
				<IconBtn name="redo" onClick={handleRedo} dark={dark} tooltip="Rehacer (Ctrl+Y)" />

				<DiVSep dark={dark} />

				{editing ? (
					<input
						autoFocus
						value={draft}
						onChange={e => setDraft(e.target.value)}
						onBlur={commitFilename}
						onKeyDown={e => {
							if (e.key === 'Enter') commitFilename();
							if (e.key === 'Escape') { setDraft(filename); setEditing(false); }
						}}
						style={{
							background: 'transparent',
							border: 'none',
							outline: 'none',
							fontFamily: TYPE.manrope,
							fontSize: 13,
							fontWeight: 600,
							color: iconColor,
							padding: '0 8px',
							width: 160,
						}}
					/>
				) : (
					<button
						onClick={() => { setDraft(filename); setEditing(true); }}
						style={{
							background: 'transparent',
							border: 'none',
							cursor: 'text',
							fontFamily: TYPE.manrope,
							fontSize: 13,
							fontWeight: 600,
							color: iconColor,
							padding: '0 8px',
							maxWidth: 200,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							whiteSpace: 'nowrap',
						}}
					>
						{filename}
					</button>
				)}
			</DiPill>
		</>
	);
}
