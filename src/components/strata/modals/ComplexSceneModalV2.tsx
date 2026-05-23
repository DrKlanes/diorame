import React from 'react';
import { DiModal } from './index';
import { useTranslation } from '../../../i18n';

// ── ComplexSceneModalV2 ───────────────────────────────────────────────────────

interface ComplexSceneModalV2Props {
	open:             boolean;
	onClose:          () => void;
	onContinue:       () => void;
	onUseCompressed:  () => void;
	shapeCount:       number;
	dark:             boolean;
}

export function ComplexSceneModalV2({ open, onClose, onContinue, onUseCompressed, shapeCount, dark }: ComplexSceneModalV2Props) {
	const { t, language } = useTranslation();
	const formattedShapeCount = new Intl.NumberFormat(
		language === 'es' ? 'es-ES' : 'en-US'
	).format(shapeCount);

	return (
		<DiModal open={open} onClose={onClose} variant="dialog" size="md" dark={dark}>
			<DiModal.Header title={t('modal.complexScene.title')} />
			<DiModal.Body>
				<p style={{ margin: 0 }}>
					{t('modal.complexScene.body', { shapeCount: formattedShapeCount })}
				</p>
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.TertiaryAction onClick={onUseCompressed}>{t('modal.complexScene.optimize')}</DiModal.TertiaryAction>
				<div style={{ flex: 1 }} />
				<DiModal.SecondaryAction onClick={onClose}>{t('modal.complexScene.cancel')}</DiModal.SecondaryAction>
				<DiModal.PrimaryAction onClick={onContinue}>{t('modal.complexScene.continue')}</DiModal.PrimaryAction>
			</DiModal.Footer>
		</DiModal>
	);
}
