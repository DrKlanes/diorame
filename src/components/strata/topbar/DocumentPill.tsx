import React, { useRef, useState } from 'react';
import { DiPill, DiVSep, DiActionButton } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { useSaveLoad } from '../../../hooks/useSaveLoad';
import { useTranslation } from '../../../i18n';
import { UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import { ClearCanvasAlertV2 } from '../modals/ClearCanvasAlertV2';
import { InfoButton } from './InfoButton';
import { ProjectNameButton } from './ProjectNameButton';

interface DocumentPillProps { dark: boolean; }

export function DocumentPill({ dark }: DocumentPillProps) {
	const { state, dispatch } = useStrata();
	const { handleSaveProject, handleLoadProject, triggerFileSelect, fileInputRef } = useSaveLoad();
	const { t } = useTranslation();
	const [clearCanvasOpen, setClearCanvasOpen] = useState(false);

	const isDrawing = state.mode === 'drawing';

	const handleNew = () => setClearCanvasOpen(true);
	const handleClearConfirm = () => {
		dispatch({ type: 'CLEAR_CANVAS' });
		dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
		dispatch({ type: 'SET_PROJECT_NAME', payload: UNTITLED_PROJECT_SENTINEL });
		sessionStorage.removeItem('diorame-view-initialized');
		setClearCanvasOpen(false);
	};

	const handleUndo = () => dispatch({ type: 'UNDO' });
	const handleRedo = () => dispatch({ type: 'REDO' });

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept=".dior"
				style={{ display: 'none' }}
				onChange={e => { const f = e.target.files?.[0]; if (f) handleLoadProject(f); }}
			/>

			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<InfoButton dark={dark} />
				<DiVSep dark={dark} />

				<DiActionButton name="new"  onClick={handleNew}         dark={dark} tooltip={t('topbar.file.new')} />
				<DiActionButton name="open" onClick={triggerFileSelect} dark={dark} tooltip={t('topbar.file.open')} />
				<DiActionButton name="save" onClick={handleSaveProject} dark={dark} tooltip={t('topbar.file.save')} shortcut="Ctrl+S" />

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

			<ClearCanvasAlertV2
				open={clearCanvasOpen}
				onClose={() => setClearCanvasOpen(false)}
				onConfirm={handleClearConfirm}
				dark={dark}
			/>
		</>
	);
}
