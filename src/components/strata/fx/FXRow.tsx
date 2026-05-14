import React from 'react';
import { useStrata, PostProcessingSettings, PostProcessingEnabled } from '../StrataContext';
import { Ico, DiMiniSlider } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';

interface FXRowProps {
	fxKey: keyof PostProcessingEnabled;
	iconName: string;
	label: string;
	isActive: boolean;
	dark: boolean;
	onToggle: () => void;
	level?: 1 | 'special';
	valueKey?: keyof PostProcessingSettings;
}

export function FXRow({ iconName, label, isActive, dark, onToggle, level = 'special', valueKey }: FXRowProps) {
	const { state, dispatch } = useStrata();
	const sliderValue = (level === 1 && valueKey) ? (state.postProcessing[valueKey] as number) : 0;
	const tint = isActive ? T.purple : dk(dark, T.dark, T.textDark) as string;

	if (isActive && level === 1 && valueKey) {
		return (
			<button
				onClick={onToggle}
				style={{
					display: 'flex',
					width: '100%',
					padding: '8px 10px',
					borderRadius: RADIUS.iconBtn,
					background: dk(dark, T.purple10, T.purple20),
					border: 'none',
					cursor: 'pointer',
					textAlign: 'left',
					boxSizing: 'border-box',
				}}
			>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
					{/* Line 1 — header */}
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<Ico name={iconName} size={16} color={T.purple} />
						<span style={{
							flex: 1,
							fontFamily: TYPE.controlLabel.family,
							fontWeight: TYPE.controlLabel.weight,
							fontSize: TYPE.controlLabel.size,
							color: T.purple,
						}}>
							{label}
						</span>
						<span style={{
							fontFamily: TYPE.numericValue.family,
							fontWeight: TYPE.numericValue.weight,
							fontSize: TYPE.numericValue.size,
							color: T.purple,
						}}>
							{Math.round(sliderValue * 100)}
						</span>
					</div>
					{/* Line 2 — slider */}
					<div
						onPointerDown={e => e.stopPropagation()}
						onClick={e => e.stopPropagation()}
					>
						<DiMiniSlider
							dark={dark}
							value={sliderValue}
							min={0}
							max={1}
							step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })}
						/>
					</div>
				</div>
			</button>
		);
	}

	// Flat row — inactive or special
	return (
		<button
			onClick={onToggle}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				width: '100%',
				padding: '8px 10px',
				borderRadius: RADIUS.iconBtn,
				background: isActive ? dk(dark, T.purple10, T.purple20) : 'transparent',
				border: 'none',
				cursor: 'pointer',
				textAlign: 'left',
				boxSizing: 'border-box',
			}}
		>
			<Ico name={iconName} size={16} color={tint} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: tint,
				flexShrink: 0,
			}}>
				{label}
			</span>
		</button>
	);
}
