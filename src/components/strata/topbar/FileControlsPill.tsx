import React, { useState, useRef } from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';
import { useSaveLoad } from '../../../hooks/useSaveLoad';
import { useExportFlow } from '../../../hooks/useExportFlow';
import { DiSelectorPopover, DiSelectorOption } from '../popovers';
import { ComplexSceneModalV2 } from '../modals/ComplexSceneModalV2';
import { ClearCanvasAlertV2 } from '../modals/ClearCanvasAlertV2';
import { InfoButton } from './InfoButton';

interface FileControlsPillProps { dark: boolean; }

export function FileControlsPill({ dark }: FileControlsPillProps) {
	const { state, dispatch } = useStrata();
	const { handleSaveProject, handleLoadProject, triggerFileSelect, fileInputRef } = useSaveLoad();
	const { handleExportRequest, handleProceedWithExport, handleCancelExport, handleUseCompressedExport, showComplexityWarning, shapeCount } = useExportFlow();
	const filename = state.projectName;
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(filename);
	const [exportOpen, setExportOpen] = useState(false);
	const [clearCanvasOpen, setClearCanvasOpen] = useState(false);
	const exportBtnRef = useRef<HTMLDivElement>(null);

	const iconColor = dk(dark, T.dark, T.textDark) as string;

	const handleNew = () => setClearCanvasOpen(true);
	const handleClearConfirm = () => {
		dispatch({ type: 'CLEAR_CANVAS' });
		dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
		dispatch({ type: 'SET_PROJECT_NAME', payload: 'Untitled Project' });
		sessionStorage.removeItem('diorame-view-initialized');
		setClearCanvasOpen(false);
	};

	const handleUndo = () => dispatch({ type: 'UNDO' });
	const handleRedo = () => dispatch({ type: 'REDO' });

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
				onChange={e => { const f = e.target.files?.[0]; if (f) handleLoadProject(f); }}
			/>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<InfoButton dark={dark} />
				<DiVSep dark={dark} />
				<DiActionButton name="new"  onClick={handleNew}         dark={dark} tooltip="New" />
				<DiActionButton name="open" onClick={triggerFileSelect} dark={dark} tooltip="Open" />
				<DiActionButton name="save" onClick={handleSaveProject} dark={dark} tooltip="Save" shortcut="Ctrl+S" />
				<div ref={exportBtnRef}>
					<DiActionButton name="export" onClick={() => setExportOpen(v => !v)} dark={dark} tooltip="Export SVG" shortcut="Ctrl+E" />
				</div>

				<DiVSep dark={dark} />

				<DiActionButton name="undo" onClick={handleUndo} dark={dark} tooltip="Undo" shortcut="Ctrl+Z" disabled={state.historyIndex <= 0} />
				<DiActionButton name="redo" onClick={handleRedo} dark={dark} tooltip="Redo" shortcut="Ctrl+Y" disabled={state.historyIndex >= state.history.length - 1} />

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
			<DiSelectorPopover
				anchorRef={exportBtnRef}
				open={exportOpen}
				onClose={() => setExportOpen(false)}
				dark={dark}
				placement="auto"
				align="start"
			>
				<DiSelectorOption
					title="SVG"
					onSelect={() => { handleExportRequest('svg'); setExportOpen(false); }}
				/>
				<DiSelectorOption
					title="SVG (Compressed)"
					onSelect={() => { handleExportRequest('svgz'); setExportOpen(false); }}
				/>
			</DiSelectorPopover>
			<ComplexSceneModalV2
				open={showComplexityWarning}
				onClose={handleCancelExport}
				onContinue={handleProceedWithExport}
				onUseCompressed={handleUseCompressedExport}
				shapeCount={shapeCount}
				dark={state.isDarkMode}
			/>
			<ClearCanvasAlertV2
				open={clearCanvasOpen}
				onClose={() => setClearCanvasOpen(false)}
				onConfirm={handleClearConfirm}
				dark={dark}
			/>
		</>
	);
}
