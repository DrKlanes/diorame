import React from 'react';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useDiModalContext } from './DiModalContext';
import { DiModalCloseButton } from './DiModalCloseButton';

type DiModalHeaderProps = {
	title: string;
	showClose?: boolean;
};

export function DiModalHeader({ title, showClose = true }: DiModalHeaderProps) {
	const { dark, variant } = useDiModalContext();
	const isBanner = variant === 'banner';

	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			padding: isBanner ? '14px 16px 0' : '20px 20px 0',
			gap: 8,
		}}>
			<span style={{
				fontFamily: TYPE.panelHeader.family,
				fontWeight: 700,
				fontSize: isBanner ? 11 : 15,
				letterSpacing: isBanner ? '0.07em' : '0',
				textTransform: isBanner ? 'uppercase' : 'none',
				color: dk(dark, T.dark, T.textDark),
				flex: 1,
				lineHeight: 1.3,
			}}>
				{title}
			</span>
			{showClose && variant !== 'alert' && <DiModalCloseButton />}
		</div>
	);
}
