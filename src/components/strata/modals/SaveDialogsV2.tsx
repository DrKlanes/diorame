import React, { useEffect, useState } from 'react';
import { DiModal } from './index';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { useStrata } from '../StrataContext';
import { useSaveLoad } from '../../../hooks/useSaveLoad';
import { useSavePrompt, setSavePrompt } from '../../../hooks/useSavePrompt';
import { UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';

// The save flow's questions (v3.21.0): empty canvas, name of an untitled drawing, name of a duplicate.
// Mounted once (ControlsV2); the flow itself lives in useSaveLoad.
export function SaveDialogsV2({ dark }: { dark: boolean }) {
	const { state } = useStrata();
	const { t } = useTranslation();
	const { confirmEmptySave, confirmProjectName } = useSaveLoad();
	const prompt = useSavePrompt();
	const [name, setName] = useState('');

	const isDuplicate = prompt?.intent === 'duplicate';
	const nameOpen = prompt?.step === 'name';

	// Seeded when the dialog opens: empty for a first save, "<name> (copia)" for a duplicate.
	useEffect(() => {
		if (!nameOpen) return;
		const current = state.projectName === UNTITLED_PROJECT_SENTINEL ? t('topbar.file.untitledProject') : state.projectName;
		setName(isDuplicate ? t('modal.duplicate.defaultName', { name: current }) : '');
	}, [nameOpen, isDuplicate]);

	const close = () => setSavePrompt(null);
	const trimmed = name.trim().slice(0, 100);
	const submitName = () => { if (prompt && trimmed) confirmProjectName(prompt.intent, trimmed); };

	return (
		<>
			<DiModal open={prompt?.step === 'empty'} onClose={close} variant="alert" size="sm" dark={dark}>
				<DiModal.Header title={t('modal.emptySave.title')} />
				<DiModal.Body>{t('modal.emptySave.body')}</DiModal.Body>
				<DiModal.Footer>
					<DiModal.SecondaryAction onClick={close}>{t('modal.emptySave.cancel')}</DiModal.SecondaryAction>
					<DiModal.PrimaryAction onClick={() => prompt && confirmEmptySave(prompt.intent)}>{t('modal.emptySave.confirm')}</DiModal.PrimaryAction>
				</DiModal.Footer>
			</DiModal>

			<DiModal open={nameOpen} onClose={close} size="sm" dark={dark}>
				<DiModal.Header title={t(isDuplicate ? 'modal.duplicate.title' : 'modal.saveName.title')} />
				<DiModal.Body>
					<div style={{ marginBottom: 12 }}>{t(isDuplicate ? 'modal.duplicate.body' : 'modal.saveName.body')}</div>
					<input
						autoFocus
						value={name}
						maxLength={100}
						placeholder={t('modal.saveName.placeholder')}
						onChange={e => setName(e.target.value)}
						onFocus={e => e.currentTarget.select()}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitName(); } }}
						style={{
							width: '100%',
							boxSizing: 'border-box',
							height: 40,
							padding: '0 12px',
							borderRadius: RADIUS.iconBtn,
							border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
							background: 'transparent',
							outline: 'none',
							fontFamily: TYPE.manrope,
							fontSize: 14,
							fontWeight: 600,
							color: dk(dark, T.dark, T.textDark) as string,
							userSelect: 'text',
							WebkitUserSelect: 'text',
						}}
					/>
				</DiModal.Body>
				<DiModal.Footer>
					<DiModal.SecondaryAction onClick={close}>{t('modal.saveName.cancel')}</DiModal.SecondaryAction>
					<DiModal.PrimaryAction onClick={submitName} disabled={!trimmed}>
						{t(isDuplicate ? 'modal.duplicate.confirm' : 'modal.saveName.confirm')}
					</DiModal.PrimaryAction>
				</DiModal.Footer>
			</DiModal>
		</>
	);
}
