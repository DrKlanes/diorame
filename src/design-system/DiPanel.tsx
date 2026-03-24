import React from 'react';
import { cn } from '../components/ui/utils';
import { diTokens } from './tokens';

interface DiPanelProps {
	children: React.ReactNode;
	className?: string;
}

export function DiPanel({ children, className }: DiPanelProps) {
	return (
		<div className={cn(
			"backdrop-blur-sm p-3 rounded-2xl shadow-sm border flex flex-col gap-2 w-40 sm:w-48 mt-1",
			diTokens.bgPanel, diTokens.border,
			className
		)}>
			{children}
		</div>
	);
}
