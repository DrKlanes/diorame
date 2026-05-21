import React, { useState } from 'react';
import { DiPill, DiVSep, DiActionButton } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { ClearCanvasAlertV2 } from '../modals/ClearCanvasAlertV2';

interface UndoRedoBarProps {
	dark: boolean;
}

export function UndoRedoBar({ dark }: UndoRedoBarProps) {
	const { state, dispatch } = useStrata();
	const [clearCanvasOpen, setClearCanvasOpen] = useState(false);

	const canUndo = state.historyIndex > 0;
	const canRedo = state.historyIndex < state.history.length - 1;

	const handleUndo = () => dispatch({ type: 'UNDO' });
	const handleRedo = () => dispatch({ type: 'REDO' });
	const handleResetView = () => dispatch({ type: 'RESET_DRAWING_VIEW' });

	const handleClearConfirm = () => {
		dispatch({ type: 'CLEAR_CANVAS' });
		dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
		sessionStorage.removeItem('diorame-view-initialized');
		setClearCanvasOpen(false);
	};

	return (
		<>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<DiActionButton name="undo"     onClick={handleUndo}                  dark={dark} disabled={!canUndo} tooltip="Undo (Ctrl+Z)" />
				<DiActionButton name="redo"     onClick={handleRedo}                  dark={dark} disabled={!canRedo} tooltip="Redo (Ctrl+Y)" />
				<DiVSep dark={dark} />
				<DiActionButton name="maximize" onClick={handleResetView}             dark={dark} tooltip="Reset view" />
				<DiVSep dark={dark} />
				<DiActionButton name="trash"    onClick={() => setClearCanvasOpen(true)} dark={dark} danger tooltip="Clear canvas" />
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
