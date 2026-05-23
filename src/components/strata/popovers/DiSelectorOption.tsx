import React, { createContext, useContext, useState } from 'react';
import { T, TYPE, dk } from '../../../design-system/tokens';

// ── Internal context — provided by DiSelectorPopover, consumed here ──────────
export type DiSelectorContextValue = {
	dark: boolean;
	onClose: () => void;
};

export const DiSelectorContext = createContext<DiSelectorContextValue>({
	dark: false,
	onClose: () => {},
});

// ── DiSelectorOption ─────────────────────────────────────────────────────────

type DiSelectorOptionProps = {
	title: string;
	description?: string;
	onSelect: () => void;
	disabled?: boolean;
};

export function DiSelectorOption({
	title,
	description,
	onSelect,
	disabled = false,
}: DiSelectorOptionProps) {
	const { dark, onClose } = useContext(DiSelectorContext);
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);

	const highlighted = (hovered || focused) && !disabled;

	const handleSelect = () => {
		if (disabled) return;
		onSelect();
		onClose();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleSelect();
		}
	};

	return (
		<div
			role="option"
			aria-selected={false}
			aria-disabled={disabled}
			tabIndex={disabled ? -1 : 0}
			onClick={handleSelect}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => { if (!disabled) setHovered(true); }}
			onMouseLeave={() => setHovered(false)}
			onFocus={() => { if (!disabled) setFocused(true); }}
			onBlur={() => setFocused(false)}
			style={{
				padding: '8px 10px',
				borderRadius: 12,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.4 : 1,
				background: highlighted ? dk(dark, T.purple10, T.purple20) : 'transparent',
				transition: 'background 0.1s ease',
				outline: 'none',
				userSelect: 'none',
			}}
		>
			<div style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: highlighted ? T.purple : dk(dark, T.dark, T.textDark),
				lineHeight: 1.3,
				marginBottom: description ? 2 : 0,
				transition: 'color 0.1s ease',
			}}>
				{title}
			</div>
			{description && (
				<div style={{
					fontFamily: TYPE.numericValue.family,
					fontWeight: TYPE.numericValue.weight,
					fontSize: TYPE.numericValue.size,
					color: dk(dark, T.muted, T.textDarkMuted),
					lineHeight: 1.4,
				}}>
					{description}
				</div>
			)}
		</div>
	);
}
