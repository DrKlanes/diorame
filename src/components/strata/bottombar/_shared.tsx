import React from 'react';
import { IconBtn } from '../topbar/_shared';
import { T } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';

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
					top: -3,
					right: -3,
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

const LINE_MODE_CYCLE: Array<'tapered' | 'uniform' | 'ink'> = ['tapered', 'uniform', 'ink'];
const LINE_MODE_ICONS: Record<string, string> = {
	tapered: 'line-tapered',
	uniform: 'line-uniform',
	ink: 'line-ink',
};
const LINE_MODE_LABELS: Record<string, string> = {
	tapered: 'Tapered',
	uniform: 'Uniform',
	ink: 'Ink',
};

interface LineModeButtonProps { dark: boolean; }

export function LineModeButton({ dark }: LineModeButtonProps) {
	const { state, dispatch } = useStrata();
	const current = state.lineMode ?? 'tapered';
	const idx = LINE_MODE_CYCLE.indexOf(current as any);
	const next = LINE_MODE_CYCLE[(idx + 1) % LINE_MODE_CYCLE.length];

	return (
		<IconBtn
			name={LINE_MODE_ICONS[current]}
			onClick={() => dispatch({ type: 'SET_LINE_MODE', payload: next } as any)}
			dark={dark}
			active={true}
			activeStyle="wash"
			iconWeight="secondary"
			tooltip={`Line mode: ${LINE_MODE_LABELS[current]} (click to cycle)`}
		/>
	);
}
