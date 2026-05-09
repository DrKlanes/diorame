import React from 'react';
import { T, RADIUS, dk } from './tokens';

interface DiPanelProps {
	dark: boolean;
	children: React.ReactNode;
	width?: number | string;
	radius?: number;
	padding?: string;
	style?: React.CSSProperties;
	className?: string;
}

export function DiPanel({
	dark,
	children,
	width,
	radius = RADIUS.panel,
	padding = '12px',
	style,
	className,
}: DiPanelProps) {
	return (
		<div
			className={className}
			style={{
				width: width ?? 'auto',
				padding,
				backgroundColor: dk(dark, T.white, T.panelDark),
				border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
				borderRadius: radius,
				boxShadow: T.shadow,
				backdropFilter: T.blur,
				WebkitBackdropFilter: T.blur,
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				...style,
			}}
		>
			{children}
		</div>
	);
}
