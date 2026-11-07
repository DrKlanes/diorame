import React, { useState } from 'react';
import { DiButton } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';

// Pieces of the DRAW «Captura» configuration (v3.25.21): inside a section with settings everything is a setting, and
// one primary button at the end starts the export, with a summary line under it.

const helperStyle = (dark: boolean): React.CSSProperties => ({
	fontFamily: TYPE.numericValue.family,
	fontWeight: TYPE.numericValue.weight,
	fontSize: TYPE.numericValue.size,
	color: dk(dark, T.muted, T.textDarkMuted),
	lineHeight: 1.4,
});

/** A helper line (the same tokens as DiSelectorOption's description). */
export function ExportHelper({ dark, children, center }: { dark: boolean; children: React.ReactNode; center?: boolean }) {
	return <div style={{ ...helperStyle(dark), padding: '0 10px 6px', textAlign: center ? 'center' : undefined }}>{children}</div>;
}

interface ExportPrimaryProps {
	label: string;
	summary: string;
	disabled?: boolean;
	dark: boolean;
	onExport: () => void;
}

/**
 * The single action of a Captura section: DiButton «brand» (the design system's purple fill) at full width, with the
 * summary of what will be written under it. role="option" so the popover's arrow/Tab navigation reaches it.
 */
export function ExportPrimary({ label, summary, disabled = false, dark, onExport }: ExportPrimaryProps) {
	return (
		<div style={{ padding: '6px 10px 4px' }}>
			<DiButton
				variant="brand"
				role="option"
				aria-disabled={disabled}
				disabled={disabled}
				onClick={onExport}
				onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
				className="w-full h-9 scale-100 hover:scale-100 rounded-full text-[13px] font-semibold"
			>
				{label}
			</DiButton>
			<div style={{ ...helperStyle(dark), padding: '6px 0 0', textAlign: 'center' }}>{summary}</div>
		</div>
	);
}

export interface SizeItem {
	id: string;
	title: string;
	description: string;
	disabled: boolean;
}

/** Selectable list (radio-like) for more than three sizes: the selected row carries the dot and the purple wash. */
export function ExportSizeList({ items, value, onChange, dark }: { items: SizeItem[]; value: string | null; onChange: (id: string) => void; dark: boolean }) {
	return (
		<div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			{items.map(it => <SizeRow key={it.id} item={it} selected={it.id === value} onSelect={() => onChange(it.id)} dark={dark} />)}
		</div>
	);
}

function SizeRow({ item, selected, onSelect, dark }: { item: SizeItem; selected: boolean; onSelect: () => void; dark: boolean }) {
	const [hovered, setHovered] = useState(false);
	const [kbFocus, setKbFocus] = useState(false);
	const hi = (hovered && !item.disabled) || kbFocus;
	return (
		<div
			role="option"
			aria-selected={selected}
			aria-disabled={item.disabled}
			tabIndex={item.disabled ? -1 : 0}
			onClick={() => { if (!item.disabled) onSelect(); }}
			onKeyDown={e => {
				if (item.disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
				e.preventDefault();
				e.stopPropagation();
				onSelect();
			}}
			onFocus={e => setKbFocus(!item.disabled && e.currentTarget.matches(':focus-visible'))}
			onBlur={() => setKbFocus(false)}
			onPointerEnter={e => { if (e.pointerType === 'mouse') setHovered(true); }}
			onPointerLeave={() => setHovered(false)}
			style={{
				display: 'flex', alignItems: 'center', gap: 8,
				padding: '6px 10px', borderRadius: 12, outline: 'none', userSelect: 'none',
				cursor: item.disabled ? 'not-allowed' : 'pointer',
				opacity: item.disabled ? 0.4 : 1,
				background: hi ? dk(dark, T.purple10, T.purple20) : 'transparent',
				transition: 'background 0.1s ease',
			}}
		>
			<span aria-hidden style={{
				width: 12, height: 12, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
				border: `1.5px solid ${selected ? T.purple : dk(dark, T.muted, T.textDarkMuted)}`,
				background: selected ? `radial-gradient(circle, ${T.purple} 0 3px, transparent 3.5px)` : 'transparent',
			}} />
			<div>
				<div style={{
					fontFamily: TYPE.controlLabel.family, fontWeight: selected ? 700 : TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size,
					color: selected ? T.purple : dk(dark, T.dark, T.textDark), lineHeight: 1.3,
				}}>{item.title}</div>
				<div style={helperStyle(dark)}>{item.description}</div>
			</div>
		</div>
	);
}
