import React, { useState } from 'react';
import { Ico } from './Ico';
import { T, TYPE, RADIUS, dk } from './tokens';
import { hasFinePointer, formatShortcut } from '../utils/keyboardShortcuts';

export function DiActionButton({ name, onClick, dark, active = false, activeStyle = 'wash', iconWeight = 'normal', iconSize = 18, label, tooltip, shortcut, disabled = false, danger = false }: {
	name: string;
	onClick: () => void;
	dark: boolean;
	active?: boolean;
	activeStyle?: 'wash' | 'solid';
	iconWeight?: 'normal' | 'secondary';
	iconSize?: number;
	label?: string;
	tooltip?: string;
	shortcut?: string;
	disabled?: boolean;
	danger?: boolean;
}) {
	const [hov, setHov] = useState(false);
	const titleText: string | undefined = (() => {
		if (!shortcut || !hasFinePointer()) return tooltip;
		const fmt = formatShortcut(shortcut);
		return tooltip ? tooltip + ' · ' + fmt : fmt;
	})();
	const activeBg = activeStyle === 'solid'
		? T.purple
		: dk(dark, T.purple10, T.purple20);
	const iconColor = danger
		? dk(dark, T.danger, T.dangerDark) as string
		: active
			? (activeStyle === 'solid' ? T.white : dk(dark, T.purple, T.purpleLight))
			: (iconWeight === 'secondary'
				? (dk(dark, T.muted, T.textDarkMuted) as string)
				: (dk(dark, T.dark, T.textDark) as string)
			);
	const bg = active
		? activeBg
		: hov
			? dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.07)')
			: 'transparent';
	const boxShadow = (active && activeStyle === 'wash' && dark)
		? 'inset 0 0 0 1px rgba(154, 15, 249, 0.35)'
		: 'none';
	return (
		<button
			onClick={onClick}
			onPointerEnter={() => setHov(true)}
			onPointerLeave={() => setHov(false)}
			title={titleText}
			style={{
				width: label ? 'auto' : 30,
				height: 30,
				padding: label ? '0 10px' : 0,
				gap: label ? 6 : 0,
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: bg,
				boxShadow,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transition: 'background 0.1s',
				flexShrink: 0,
				opacity: disabled ? 0.3 : 1,
				pointerEvents: disabled ? 'none' : undefined,
			}}
		>
			<Ico name={name} size={iconSize} color={iconColor} />
			{label && (
				<span style={{
					fontFamily: TYPE.controlLabel.family,
					fontSize: TYPE.controlLabel.size,
					fontWeight: active ? 600 : 400,
					color: iconColor as string,
					letterSpacing: '0.01em',
					whiteSpace: 'nowrap',
					userSelect: 'none',
				}}>
					{label}
				</span>
			)}
		</button>
	);
}
