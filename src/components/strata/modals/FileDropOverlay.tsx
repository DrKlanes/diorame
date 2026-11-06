import React from 'react';
import { useTranslation } from '../../../i18n';
import { T, TYPE, RADIUS, BLUR, Z_INDEX, dk } from '../../../design-system/tokens';

// Full-screen hint while a file is dragged over the window. Never intercepts pointer events: the drop is handled on window.
export function FileDropOverlay({ open, dark }: { open: boolean; dark: boolean }) {
	const { t } = useTranslation();
	if (!open) return null;
	return (
		<div
			aria-hidden="true"
			style={{
				position: 'fixed', inset: 0, zIndex: Z_INDEX.modal + 10, pointerEvents: 'none',
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				background: dk(dark, 'rgba(248,250,252,0.78)', 'rgba(5,5,5,0.78)'),
				backdropFilter: BLUR.default, WebkitBackdropFilter: BLUR.default,
			}}
		>
			<div
				style={{
					padding: '48px 64px', borderRadius: RADIUS.modal, border: `2px dashed ${T.purple}`,
					background: T.purple10, color: dk(dark, T.dark, T.textDark),
					fontFamily: TYPE.manrope, fontWeight: 700, fontSize: 20, textAlign: 'center',
				}}
			>
				{t('drop.openProject')}
			</div>
		</div>
	);
}
