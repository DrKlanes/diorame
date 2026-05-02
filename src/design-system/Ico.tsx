import React from 'react';
import { ICONS } from './icons';

interface IcoProps {
	name: string;
	size?: number;
	color?: string;
	style?: React.CSSProperties;
}

export function Ico({ name, size = 20, color = 'currentColor', style }: IcoProps) {
	const path = ICONS[name];
	if (!path) {
		if (import.meta.env.DEV) {
			console.warn(`[Ico] Unknown icon: "${name}"`);
		}
		return null;
	}
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
			strokeLinejoin="round"
			style={{ color, flexShrink: 0, display: 'block', ...style }}
			dangerouslySetInnerHTML={{ __html: path }}
		/>
	);
}
