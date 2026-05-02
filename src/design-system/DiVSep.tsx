import React from 'react';
import { T, dk } from './tokens';

interface DiVSepProps {
	dark: boolean;
	tall?: boolean;
}

export function DiVSep({ dark, tall = false }: DiVSepProps) {
	return (
		<div style={{
			width: 1,
			height: tall ? 36 : 18,
			backgroundColor: dk(dark, T.border, T.borderDark),
			flexShrink: 0,
			margin: '0 6px',
		}} />
	);
}
