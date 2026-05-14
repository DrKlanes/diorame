import React from 'react';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useDiModalContext } from './DiModalContext';

type DiModalBodyProps = {
	children: React.ReactNode;
};

export function DiModalBody({ children }: DiModalBodyProps) {
	const { dark, variant } = useDiModalContext();
	const isBanner = variant === 'banner';

	return (
		<div style={{
			padding: isBanner ? '8px 16px 12px' : '12px 20px 16px',
			fontFamily: TYPE.controlLabel.family,
			fontWeight: TYPE.controlLabel.weight,
			fontSize: 13,
			lineHeight: 1.55,
			color: dk(dark, T.muted, T.textDarkMuted),
		}}>
			{children}
		</div>
	);
}
