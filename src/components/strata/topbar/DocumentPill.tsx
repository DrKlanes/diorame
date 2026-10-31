import React, { useRef, useState } from 'react';
import { DiPill, DiVSep, DiActionButton } from '../../../design-system';
import { T, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { useSaveLoad } from '../../../hooks/useSaveLoad';
import { useTranslation } from '../../../i18n';
import { UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import { ClearCanvasAlertV2 } from '../modals/ClearCanvasAlertV2';
import { InfoButton } from './InfoButton';
import { DiSelectorPopover, DiSelectorOption } from '../popovers';
import { DIOR_ACCEPT } from '../../../utils/projectMeta';
import { canOverwriteFiles, getProjectFileLink } from '../../../utils/projectFile';
import { projectFileStem } from '../../../utils/projectMeta';
import { ProjectNameButton } from './ProjectNameButton';

interface DocumentPillProps { dark: boolean; }

export function DocumentPill({ dark }: DocumentPillProps) {
	const { state, dispatch } = useStrata();
	const { handleSaveProject, handleSaveProjectAs, handleDuplicateProject, handleLoadProject, triggerFileSelect, fileInputRef } = useSaveLoad();
	const { t } = useTranslation();
	const [clearCanvasOpen, setClearCanvasOpen] = useState(false);
	const [saveMenuOpen, setSaveMenuOpen] = useState(false);
	const saveMenuRef = useRef<HTMLDivElement>(null);
	// Overwriting the same file exists only with the File System Access API (Chromium desktop); elsewhere every
	// save is a new download, and the button says so.
	const canOverwrite = canOverwriteFiles();
	// What «Guardar» will do now: write over the linked file, or (name changed) make a new one. The file on disk
	// is never touched by a rename.
	const link = canOverwrite ? getProjectFileLink(state.projectMeta.projectId) : null;
	const docName = state.projectName === UNTITLED_PROJECT_SENTINEL ? t('topbar.file.untitledProject') : state.projectName;
	const saveTooltip = !canOverwrite ? t('topbar.file.saveDownload')
		: link && link.name === state.projectName ? t('topbar.file.saveTo', { file: link.handle.name })
		: link ? t('topbar.file.saveAsNew', { file: `${projectFileStem(docName)}.dior` })
		: t('topbar.file.save');

	const isDrawing = state.mode === 'drawing';

	const handleNew = () => setClearCanvasOpen(true);
	const handleClearConfirm = () => {
		// The name first: renaming marks the project dirty and CLEAR_CANVAS resets that, so a new project starts clean.
		dispatch({ type: 'SET_PROJECT_NAME', payload: UNTITLED_PROJECT_SENTINEL });
		dispatch({ type: 'CLEAR_CANVAS' });
		dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
		setClearCanvasOpen(false);
	};

	const handleUndo = () => dispatch({ type: 'UNDO' });
	const handleRedo = () => dispatch({ type: 'REDO' });

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept={DIOR_ACCEPT}
				style={{ display: 'none' }}
				onChange={e => { const f = e.target.files?.[0]; if (f) handleLoadProject(f); }}
			/>

			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<InfoButton dark={dark} />
				<DiVSep dark={dark} />

				<DiActionButton name="new"  onClick={handleNew}         dark={dark} tooltip={t('topbar.file.new')} />
				<DiActionButton name="open" onClick={triggerFileSelect} dark={dark} tooltip={t('topbar.file.open')} />
				{/* Split button: Save + menu are one control */}
				<div ref={saveMenuRef} style={{ display: 'flex', alignItems: 'center', height: 30, borderRadius: RADIUS.iconBtn, boxShadow: `inset 0 0 0 1px ${dk(dark, T.border, T.borderDark)}` }}>
					<DiActionButton name="save" onClick={handleSaveProject} dark={dark} tooltip={saveTooltip} shortcut="Ctrl+S" />
					<div style={{ width: 1, height: 16, backgroundColor: dk(dark, T.border, T.borderDark), flexShrink: 0 }} />
					<DiActionButton name="chevron-down" onClick={() => setSaveMenuOpen(v => !v)} dark={dark} active={saveMenuOpen} iconSize={14} tooltip={t('topbar.file.saveMore')} />
				</div>

				<DiVSep dark={dark} />

				<ProjectNameButton dark={dark} />

				{/* Undo / Redo — DRAW only */}
				{isDrawing && (
					<>
						<DiVSep dark={dark} />
						<DiActionButton name="undo" onClick={handleUndo} dark={dark} tooltip={t('topbar.file.undo')} shortcut="Ctrl+Z" disabled={state.historyIndex <= 0} />
						<DiActionButton name="redo" onClick={handleRedo} dark={dark} tooltip={t('topbar.file.redo')} shortcut="Ctrl+Y" disabled={state.historyIndex >= state.history.length - 1} />
					</>
				)}
			</DiPill>

			<DiSelectorPopover anchorRef={saveMenuRef} open={saveMenuOpen} onClose={() => setSaveMenuOpen(false)} dark={dark} placement="bottom" align="start">
				<DiSelectorOption title={t('topbar.file.save')} description="Ctrl+S" onSelect={handleSaveProject} />
				{canOverwrite && (
					<DiSelectorOption title={t('topbar.file.saveAs')} description={`${t('topbar.file.saveAsDesc')} · Ctrl+Shift+S`} onSelect={handleSaveProjectAs} />
				)}
				<DiSelectorOption title={t('topbar.file.duplicate')} description={t('topbar.file.duplicateDesc')} onSelect={handleDuplicateProject} />
			</DiSelectorPopover>

			<ClearCanvasAlertV2
				open={clearCanvasOpen}
				onClose={() => setClearCanvasOpen(false)}
				onConfirm={handleClearConfirm}
				dark={dark}
			/>
		</>
	);
}
