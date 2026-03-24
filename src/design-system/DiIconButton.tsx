import React from 'react';
import { RippleButton } from '../components/ui/ripple-button';
import { EnhancedTooltip } from '../components/ui/enhanced-tooltip';
import { cn } from '../components/ui/utils';

interface DiIconButtonProps {
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
	tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
	active?: boolean;
	disabled?: boolean;
	className?: string;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function DiIconButton({
	icon, label, shortcut, tooltipSide = 'bottom',
	active = false, disabled = false, className, onClick,
}: DiIconButtonProps) {
	const button = (
		<RippleButton
			variant={active ? 'default' : 'ghost'}
			size="icon"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95",
				className
			)}
		>
			{icon}
		</RippleButton>
	);

	if (disabled) return button;

	return (
		<EnhancedTooltip content={label} shortcut={shortcut} side={tooltipSide}>
			{button}
		</EnhancedTooltip>
	);
}
