import React from 'react';
import { cn } from '../components/ui/utils';
import { diTokens } from './tokens';

interface DiBadgeProps {
	icon?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}

export function DiBadge({ icon, children, className }: DiBadgeProps) {
	return (
		<div className={cn(
			"px-2 py-0.5 rounded-md flex items-center gap-1",
			diTokens.badgeBg,
			className
		)}>
			{icon && (
				<span className={cn("flex items-center", diTokens.iconColor)}>
					{icon}
				</span>
			)}
			<span className={cn("text-[10px] font-medium", diTokens.textMuted)}>
				{children}
			</span>
		</div>
	);
}
