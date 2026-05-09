import React from 'react';
import { IconBtn } from '../topbar/_shared';
import { T } from '../../../design-system/tokens';

interface ToolBtnProps {
	name: string;
	onClick: () => void;
	dark: boolean;
	active?: boolean;
	tooltip?: string;
	paletteColor?: string | null;
	showDot?: boolean;
}

export function ToolBtn({
	name, onClick, dark, active = false, tooltip, paletteColor, showDot = false,
}: ToolBtnProps) {
	return (
		<div style={{ position: 'relative', display: 'inline-block' }}>
			<IconBtn
				name={name}
				onClick={onClick}
				dark={dark}
				active={active}
				activeStyle="solid"
				tooltip={tooltip}
			/>
			{active && showDot && paletteColor && (
				<div style={{
					position: 'absolute',
					top: 4,
					right: 4,
					width: 8,
					height: 8,
					borderRadius: '50%',
					backgroundColor: paletteColor,
					border: `2px solid ${T.purple}`,
					pointerEvents: 'none',
					boxSizing: 'content-box',
				}} />
			)}
		</div>
	);
}
