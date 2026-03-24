import React from 'react';
import { cn } from '../components/ui/utils';
import { diTokens } from './tokens';

interface DiDividerProps {
	orientation?: 'horizontal' | 'vertical';
	className?: string;
}

export function DiDivider({ orientation = 'horizontal', className }: DiDividerProps) {
	if (orientation === 'vertical') {
		return <div className={cn("w-[1px] h-4 mx-1", diTokens.divider, className)} />;
	}
	return <div className={cn("h-px w-full my-1", diTokens.divider, className)} />;
}
