import React from 'react';
import { DiModal } from './index';
import { useTranslation } from '../../../i18n';

// ── ClearCanvasAlertV2 ────────────────────────────────────────────────────────

interface ClearCanvasAlertV2Props {
	open:      boolean;
	onClose:   () => void;
	onConfirm: () => void;
	dark:      boolean;
}

export function ClearCanvasAlertV2({ open, onClose, onConfirm, dark }: ClearCanvasAlertV2Props) {
	const { t } = useTranslation();
	return (
		<DiModal open={open} onClose={onClose} variant="alert" size="sm" dark={dark}>
			<DiModal.Header title={t('modal.clearCanvas.title')} />
			<DiModal.Body>
				{t('modal.clearCanvas.body')}
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.SecondaryAction onClick={onClose}>{t('modal.clearCanvas.cancel')}</DiModal.SecondaryAction>
				<DiModal.DestructiveAction onClick={onConfirm}>{t('modal.clearCanvas.confirm')}</DiModal.DestructiveAction>
			</DiModal.Footer>
		</DiModal>
	);
}
