import React, { useState } from 'react';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useDiModalContext } from './DiModalContext';

const ACTION_BASE: React.CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: 6,
	height: 36,
	paddingLeft: 16,
	paddingRight: 16,
	borderRadius: RADIUS.pill,
	border: 'none',
	cursor: 'pointer',
	fontFamily: TYPE.controlLabel.family,
	fontWeight: 600,
	fontSize: 13,
	transition: 'background 0.1s, color 0.1s, opacity 0.1s, border-color 0.1s',
	flexShrink: 0,
	whiteSpace: 'nowrap' as const,
};

// Larger variant — same visual style as PrimaryAction, bigger touch target
const ACTION_BASE_LG: React.CSSProperties = {
	...ACTION_BASE,
	height: 44,
	paddingLeft: 18,
	paddingRight: 18,
	fontSize: 12,
	borderRadius: RADIUS.pill,
};

type ActionProps = {
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
};

export function PrimaryAction({ children, onClick, disabled }: ActionProps) {
	const { dark } = useDiModalContext();
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...ACTION_BASE,
				background: T.purple,
				color: '#fff',
				opacity: disabled ? 0.45 : hovered ? 0.87 : 1,
			}}
		>
			{children}
		</button>
	);
}

export function SecondaryAction({ children, onClick, disabled }: ActionProps) {
	const { dark } = useDiModalContext();
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			data-di-cancel="true"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...ACTION_BASE,
				background: hovered ? dk(dark, T.light, T.hoverDark) : 'transparent',
				color: dk(dark, T.dark, T.textDark),
				border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
				opacity: disabled ? 0.45 : 1,
			}}
		>
			{children}
		</button>
	);
}

export function DestructiveAction({ children, onClick, disabled }: ActionProps) {
	const { dark } = useDiModalContext();
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...ACTION_BASE,
				background: hovered
					? dk(dark, T.dangerHover, T.dangerHoverDark)
					: dk(dark, T.danger, T.dangerDark),
				color: '#fff',
				opacity: disabled ? 0.45 : 1,
			}}
		>
			{children}
		</button>
	);
}

export function TertiaryAction({ children, onClick, disabled }: ActionProps) {
	const { dark } = useDiModalContext();
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...ACTION_BASE,
				background: hovered ? dk(dark, T.light, T.hoverDark) : 'transparent',
				color: hovered
					? dk(dark, T.dark, T.textDark)
					: dk(dark, T.muted, T.textDarkMuted),
				opacity: disabled ? 0.45 : 1,
			}}
		>
			{children}
		</button>
	);
}

export function PrimaryActionLg({ children, onClick, disabled }: ActionProps) {
	const { dark } = useDiModalContext();
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...ACTION_BASE_LG,
				background: T.purple,
				color: '#fff',
				opacity: disabled ? 0.45 : hovered ? 0.87 : 1,
			}}
		>
			{children}
		</button>
	);
}

export function SecondaryActionLg({ children, onClick, disabled }: ActionProps) {
	const { dark } = useDiModalContext();
	const [hovered, setHovered] = useState(false);
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...ACTION_BASE_LG,
				background: hovered ? dk(dark, T.light, T.hoverDark) : 'transparent',
				color: dk(dark, T.dark, T.textDark),
				border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
				opacity: disabled ? 0.45 : 1,
			}}
		>
			{children}
		</button>
	);
}
