import React, { useState } from 'react';
import { Ico } from './Ico';
import { T, TYPE, RADIUS, dk } from './tokens';
import { EnhancedTooltip } from '../components/ui/enhanced-tooltip';

export function DiActionButton({ name, onClick, dark, active = false, activeStyle = 'wash', iconWeight = 'normal', iconSize = 18, label, labelSize, tooltip, shortcut, disabled = false, danger = false, minWidth }: {
	name: string;
	onClick: () => void;
	dark: boolean;
	active?: boolean;
	activeStyle?: 'wash' | 'solid';
	iconWeight?: 'normal' | 'secondary';
	iconSize?: number;
	label?: string;
	labelSize?: number;
	tooltip?: string;
	shortcut?: string;
	disabled?: boolean;
	danger?: boolean;
	minWidth?: number;
}) {
	const [hov, setHov] = useState(false);
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
	const btn = (
		<button
			onClick={onClick}
			// An immediate-action button must not keep the DOM focus after its click.
			// Keeping it makes the global shortcut guard (useKeyboardShortcuts) stand
			// down for Space and Enter for as long as the button stays focused — which
			// is forever — so Space-to-pan died the moment you picked a tool (v3.17.14
			// regression). preventDefault on mousedown stops the focus being taken in
			// the first place: it does NOT touch the keyboard route, so Tab still
			// reaches this button and Space still activates it. Do not "simplify" this
			// away, and do not swap it for blur(): blur fires after the fact and dumps
			// focus on <body>.
			onMouseDown={(e) => e.preventDefault()}
			onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHov(true); }}
			onPointerLeave={() => setHov(false)}
			style={{
				width: label ? 'auto' : 30,
				minWidth: minWidth,
				height: 30,
				padding: label ? '0 10px' : 0,
				gap: label ? 6 : 0,
				justifyContent: label && minWidth ? 'flex-start' : 'center',
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: bg,
				boxShadow,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
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
					fontSize: labelSize ?? TYPE.controlLabel.size,
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
	if (!tooltip) return btn;
	return (
		<EnhancedTooltip content={tooltip} shortcut={shortcut} side="bottom">
			{btn}
		</EnhancedTooltip>
	);
}
