import React from 'react';
import { T, TYPE, dk } from './tokens';

interface DiMiniSliderProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	dark: boolean;
	width?: number | string;
	label?: string;
	formattedValue?: string;
	disabled?: boolean;
}

export function DiMiniSlider({
	value,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	dark,
	width = '100%',
	label,
	formattedValue,
	disabled = false,
}: DiMiniSliderProps) {
	const pct = ((value - min) / (max - min)) * 100;

	return (
		<div style={{ width, display: 'flex', flexDirection: 'column', gap: 3, opacity: disabled ? 0.4 : 1 }}>
			{(label || formattedValue) && (
				<div style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					fontSize: TYPE.controlLabel.size,
					fontFamily: TYPE.controlLabel.family,
				}}>
					{label && (
						<span style={{ color: dk(dark, T.muted, T.textDarkSubtle), fontWeight: TYPE.controlLabel.weight }}>
							{label}
						</span>
					)}
					{formattedValue && (
						<span style={{ color: T.purple, fontWeight: TYPE.numericValue.weight, fontFamily: TYPE.numericValue.family, fontSize: TYPE.numericValue.size }}>
							{formattedValue}
						</span>
					)}
				</div>
			)}
			<div style={{ position: 'relative', height: 14 }}>
				{/* Track background */}
				<div style={{
					position: 'absolute',
					top: 5,
					left: 0,
					right: 0,
					height: 4,
					borderRadius: 2,
					backgroundColor: dk(dark, T.light, T.trackDark),
				}} />
				{/* Track fill */}
				<div style={{
					position: 'absolute',
					top: 5,
					left: 0,
					width: `${pct}%`,
					height: 4,
					borderRadius: 2,
					background: `linear-gradient(to right, ${T.purple10}, ${T.purple})`,
					pointerEvents: 'none',
				}} />
				{/* Thumb */}
				<div style={{
					position: 'absolute',
					top: 0,
					left: `calc(${pct}% - 7px)`,
					width: 14,
					height: 14,
					borderRadius: '50%',
					backgroundColor: dk(dark, T.dark, T.textDark),
					pointerEvents: 'none',
					boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
				}} />
				{/* Native input (invisible, handles interaction) */}
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					disabled={disabled}
					onChange={e => onChange(parseFloat(e.target.value))}
					style={{
						position: 'absolute',
						inset: 0,
						opacity: 0,
						cursor: disabled ? 'not-allowed' : 'pointer',
						width: '100%',
						height: '100%',
						margin: 0,
						WebkitAppearance: 'none',
						background: 'transparent',
					}}
				/>
			</div>
		</div>
	);
}
