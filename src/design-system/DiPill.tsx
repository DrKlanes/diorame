import React from 'react';
import { T, RADIUS, SHADOW, dk } from './tokens';

interface DiPillProps {
	dark: boolean;
	height?: number;
	padding?: string;
	gap?: number;
	style?: React.CSSProperties;
	children: React.ReactNode;
}

export function DiPill({
	dark,
	height = 40,
	padding = '0 8px',
	gap = 2,
	style,
	children,
}: DiPillProps) {
	return (
		<div style={{
			height,
			padding,
			gap,
			display: 'flex',
			alignItems: 'center',
			backgroundColor: dk(dark, T.white, T.panelDark),
			border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
			borderRadius: RADIUS.pill,
			boxShadow: SHADOW.surface,
			backdropFilter: T.blur,
			WebkitBackdropFilter: T.blur,
			...style,
		}}>
			{children}
		</div>
	);
}
