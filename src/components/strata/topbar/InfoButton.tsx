import React from 'react';
import { DiActionButton } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { useTranslation } from '../../../i18n';

interface InfoButtonProps { dark: boolean; }

export function InfoButton({ dark }: InfoButtonProps) {
	const { dispatch } = useStrata();
	const { t } = useTranslation();
	return (
		<DiActionButton
			name="info"
			onClick={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
			dark={dark}
			tooltip={t('topbar.info.about')}
			shortcut="Shift+?"
		/>
	);
}
