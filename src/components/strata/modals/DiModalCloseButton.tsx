import React, { useState } from 'react';
import { T, RADIUS, dk } from '../../../design-system/tokens';
import { useDiModalContext } from './DiModalContext';
import { useTranslation } from '../../../i18n';

export function DiModalCloseButton() {
	const { onClose, dark } = useDiModalContext();
	const { t } = useTranslation();
	const [hovered, setHovered] = useState(false);

	return (
		<button
			onClick={onClose}
			aria-label={t('common.close')}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				width: 28,
				height: 28,
				flexShrink: 0,
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				cursor: 'pointer',
				background: hovered
					? dk(dark, T.light, T.hoverDark)
					: 'transparent',
				color: hovered
					? dk(dark, T.dark, T.textDark)
					: dk(dark, T.muted, T.textDarkMuted),
				transition: 'background 0.1s, color 0.1s',
			}}
		>
			<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
				<path d="M18 6 6 18M6 6l12 12" />
			</svg>
		</button>
	);
}
