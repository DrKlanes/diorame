import React from 'react';
import { Ico } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { PostProcessingEnabled } from '../StrataContext';

interface FXRowProps {
	fxKey: keyof PostProcessingEnabled;
	iconName: string;
	label: string;
	isActive: boolean;
	dark: boolean;
	onToggle: () => void;
}

export function FXRow({ iconName, label, isActive, dark, onToggle }: FXRowProps) {
	const tint = isActive ? T.purple : dk(dark, T.dark, T.textDark) as string;
	return (
		<button
			onClick={onToggle}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				width: '100%',
				padding: '8px 10px',
				borderRadius: RADIUS.iconBtn,
				background: isActive ? dk(dark, T.purple10, T.purple20) : 'transparent',
				border: 'none',
				cursor: 'pointer',
				textAlign: 'left',
				boxSizing: 'border-box',
			}}
		>
			<Ico name={iconName} size={16} color={tint} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: isActive ? 500 : TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: tint,
				flexShrink: 0,
			}}>
				{label}
			</span>
		</button>
	);
}
