import React, { useState } from 'react';
import { T, TYPE, RADIUS, dk } from './tokens';
import { EnhancedTooltip } from '../components/ui/enhanced-tooltip';

interface DiChipProps {
	onClick: () => void;
	dark: boolean;
	active?: boolean;
	label?: string;
	/** Colour dot shown before the label (or alone, e.g. paper swatches). */
	swatch?: string;
	tooltip?: string;
	/** Accessible name when the chip has no label. */
	ariaLabel?: string;
}

export function DiChip({ onClick, dark, active = false, label, swatch, tooltip, ariaLabel }: DiChipProps) {
	const [hov, setHov] = useState(false);
	const btn = (
		<button
			onClick={onClick}
			// Immediate action — no focus retention (see DiActionButton).
			onMouseDown={(e) => e.preventDefault()}
			onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHov(true); }}
			onPointerLeave={() => setHov(false)}
			aria-pressed={active}
			aria-label={ariaLabel ?? label}
			style={{
				flex: 1,
				minWidth: 0,
				height: 24,
				padding: '0 6px',
				borderRadius: RADIUS.segment + 2,
				border: 'none',
				boxSizing: 'border-box',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 5,
				backgroundColor: active
					? dk(dark, 'rgba(154,15,249,0.12)', 'rgba(154,15,249,0.25)')
					: hov
						? dk(dark, 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)')
						: dk(dark, T.light, T.tabBgDark),
				boxShadow: active ? 'inset 0 0 0 1px rgba(154, 15, 249, 0.45)' : 'none',
				transition: 'background 0.1s',
			}}
		>
			{swatch && (
				<span style={{
					width: 14,
					height: 14,
					borderRadius: '50%',
					flexShrink: 0,
					backgroundColor: swatch,
					boxShadow: `inset 0 0 0 1px ${dk(dark, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.35)')}`,
				}} />
			)}
			{label && (
				<span style={{
					fontFamily: TYPE.controlLabel.family,
					fontWeight: active ? 700 : 500,
					fontSize: TYPE.badge.size + 1,
					color: active ? T.purple : dk(dark, T.muted, T.textDarkMuted),
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
				}}>
					{label}
				</span>
			)}
		</button>
	);
	return tooltip ? <EnhancedTooltip content={tooltip} side="left">{btn}</EnhancedTooltip> : btn;
}
