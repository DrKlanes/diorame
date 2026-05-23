import React from 'react';
import { DiModal } from './index';

// ── ClearCanvasAlertV2 ────────────────────────────────────────────────────────

interface ClearCanvasAlertV2Props {
	open:      boolean;
	onClose:   () => void;
	onConfirm: () => void;
	dark:      boolean;
}

export function ClearCanvasAlertV2({ open, onClose, onConfirm, dark }: ClearCanvasAlertV2Props) {
	return (
		<DiModal open={open} onClose={onClose} variant="alert" size="sm" dark={dark}>
			<DiModal.Header title="Clear canvas?" />
			<DiModal.Body>
				This will delete everything you've drawn. This action can't be undone.
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.SecondaryAction onClick={onClose}>Cancel</DiModal.SecondaryAction>
				<DiModal.DestructiveAction onClick={onConfirm}>Clear canvas</DiModal.DestructiveAction>
			</DiModal.Footer>
		</DiModal>
	);
}
