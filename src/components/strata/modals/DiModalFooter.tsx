import React from 'react';
import { useDiModalContext } from './DiModalContext';

type DiModalFooterProps = {
	children: React.ReactNode;
};

export function DiModalFooter({ children }: DiModalFooterProps) {
	const { variant } = useDiModalContext();
	const isBanner = variant === 'banner';

	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			gap: 8,
			padding: isBanner ? '0 16px 14px' : '4px 20px 20px',
			justifyContent: 'flex-end',
			flexWrap: 'wrap',
		}}>
			{children}
		</div>
	);
}
