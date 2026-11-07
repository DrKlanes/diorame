import React, { useState } from 'react';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';

// Pieces of the export popover (ExportPill and DrawCaptureSection), out of ExportPill.tsx in v3.25.12.

// ── Group header — non-interactive section label inside the popover ────────────

export function ExportGroupHeader({ label, dark }: { label: string; dark: boolean }) {
	return (
		<div style={{
			padding: '6px 10px 2px',
			fontFamily: TYPE.panelHeader.family,
			fontSize: TYPE.panelHeader.size,
			fontWeight: TYPE.panelHeader.weight,
			letterSpacing: TYPE.panelHeader.letterSpacing,
			textTransform: TYPE.panelHeader.textTransform,
			color: dk(dark, T.muted, T.textDarkMuted) as string,
			userSelect: 'none',
		}}>
			{label}
		</div>
	);
}

// ── Group row — expands/collapses sub-options inline; does NOT close popover ──

interface ExportGroupRowProps {
	title: string;
	dark: boolean;
	expanded: boolean;
	onToggle: () => void;
}

export function ExportGroupRow({ title, dark, expanded, onToggle }: ExportGroupRowProps) {
	const [hovered, setHovered] = useState(false);
	const highlighted = hovered;

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onToggle}
			onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				padding: '8px 10px',
				borderRadius: RADIUS.iconBtn,
				cursor: 'pointer',
				background: highlighted || expanded ? dk(dark, T.purple10, T.purple20) : 'transparent',
				transition: 'background 0.1s ease',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				outline: 'none',
				userSelect: 'none',
			}}
		>
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: highlighted || expanded ? T.purple : dk(dark, T.dark, T.textDark),
				transition: 'color 0.1s ease',
			}}>
				{title}
			</span>
			{/* Chevron */}
			<svg
				width={12} height={12}
				viewBox="0 0 12 12"
				fill="none"
				stroke={highlighted || expanded ? T.purple : dk(dark, T.muted, T.textDarkMuted) as string}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease', flexShrink: 0 }}
			>
				<path d="M4.5 3L7.5 6L4.5 9" />
			</svg>
		</div>
	);
}

// ── Thin visual separator inside the popover ─────────────────────────────────

export function ExportSeparator({ dark }: { dark: boolean }) {
	return (
		<div style={{
			height: 1,
			margin: '4px 10px',
			backgroundColor: dk(dark, T.border, T.borderDark) as string,
		}} />
	);
}
