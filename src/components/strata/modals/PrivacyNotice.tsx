import React, { useState } from 'react';
import { Ico } from '../../../design-system';
import { TYPE } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';

interface PrivacyNoticeProps {
	/** Color del enlace y del texto (Welcome: muted del tema; pantalla móvil: variable CSS). */
	color: string;
}

// Plegable, como «Créditos de sonido». Lo usan el Welcome y la pantalla de bloqueo móvil.
export function PrivacyNotice({ color }: PrivacyNoticeProps) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	const text: React.CSSProperties = {
		fontFamily: TYPE.numericValue.family,
		fontWeight: 400,
		fontSize: TYPE.numericValue.size,
		lineHeight: 1.5,
		color,
	};
	return (
		<>
			<button
				onClick={() => setExpanded(!expanded)}
				aria-expanded={expanded}
				style={{ ...text, background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}
			>
				<span style={{ textDecoration: 'underline' }}>{t('modal.privacy.title')}</span>
				<Ico name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={color} />
			</button>
			{expanded && <p style={{ ...text, margin: '6px 0 0' }}>{t('modal.privacy.body')}</p>}
		</>
	);
}
