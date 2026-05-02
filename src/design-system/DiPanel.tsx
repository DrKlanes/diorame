import React from 'react';
import { cn } from '../components/ui/utils';
import { diTokens } from './tokens';

interface DiPanelProps {
	children: React.ReactNode;
	className?: string;
	// Optional overrides — when provided, inline style takes precedence over
	// the corresponding Tailwind default. Existing usage without these props
	// is completely unaffected.
	width?: number | string;
	radius?: number;
	padding?: string;
}

export function DiPanel({ children, className, width, radius, padding }: DiPanelProps) {
	// Build override style only for props that were explicitly passed
	const overrideStyle: React.CSSProperties = {};
	if (width   !== undefined) overrideStyle.width        = width;
	if (radius  !== undefined) overrideStyle.borderRadius = radius;
	if (padding !== undefined) overrideStyle.padding      = padding;

	// Remove the corresponding Tailwind class when an inline override is active
	// so they don't compete (Tailwind utility vs. inline style specificity).
	const baseClass = cn(
		'backdrop-blur-sm shadow-sm border flex flex-col gap-2 mt-1',
		diTokens.bgPanel,
		diTokens.border,
		width   === undefined && 'w-40 sm:w-48',
		radius  === undefined && 'rounded-2xl',
		padding === undefined && 'p-3',
		className,
	);

	return (
		<div className={baseClass} style={overrideStyle}>
			{children}
		</div>
	);
}
