import React from 'react';
import { IconBtn } from '../topbar/_shared';
import { Ico } from '../../../design-system';
import { T, RADIUS, dk } from '../../../design-system/tokens';
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

const LINE_MODE_ORDER: Array<'tapered' | 'uniform' | 'ink'> = ['tapered', 'uniform', 'ink'];
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
const LINE_MODE_NEXT: Record<string, string> = {
	tapered: 'uniform',
	uniform: 'ink',
	ink: 'tapered',
};

interface LineModeButtonProps { dark: boolean; }

export function LineModeButton({ dark }: LineModeButtonProps) {
	const { state, dispatch } = useStrata();
	const currentMode = state.lineMode ?? 'tapered';
	const currentIndex = LINE_MODE_ORDER.indexOf(currentMode as any);

	const handleClick = () => {
		dispatch({ type: 'SET_LINE_MODE', payload: LINE_MODE_NEXT[currentMode] } as any);
	};

	const iconColor = dk(dark, T.purple, T.purpleLight) as string;
	const bgColor = dk(dark, T.purple10, T.purple20);
	const boxShadow = dark ? 'inset 0 0 0 1px rgba(154, 15, 249, 0.35)' : 'none';
	const dotActiveColor = dk(dark, T.purple, T.purpleLight);
	const dotInactiveColor = dk(dark, 'rgba(0,0,0,0.18)', 'rgba(255,255,255,0.22)');

	return (
		<button
			onClick={handleClick}
			title={`Line mode: ${LINE_MODE_LABELS[currentMode]} (${currentIndex + 1}/3) — click to cycle`}
			style={{
				width: 30,
				height: 30,
				padding: 0,
				paddingTop: 5,
				paddingBottom: 3,
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: bgColor,
				boxShadow,
				cursor: 'pointer',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'flex-start',
				flexShrink: 0,
			}}
		>
			<Ico name={LINE_MODE_ICONS[currentMode]} size={14} color={iconColor} />
			<div style={{ marginTop: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
				{[0, 1, 2].map(i => (
					<div
						key={i}
						style={{
							width: 3,
							height: 3,
							borderRadius: '50%',
							backgroundColor: i === currentIndex ? dotActiveColor : dotInactiveColor,
						}}
					/>
				))}
			</div>
		</button>
	);
}
