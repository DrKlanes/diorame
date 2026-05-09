import React from 'react';
import { useStrata } from '../StrataContext';
import { Ico, DiMiniSlider } from '../../../design-system';
import { T, dk } from '../../../design-system/tokens';
import { flToMm, mmToFl } from '../../../utils/cinematic';

interface CameraSlidersZoneProps { dark: boolean; }

export function CameraSlidersZone({ dark }: CameraSlidersZoneProps) {
	const { state, dispatch } = useStrata();

	const focalMm       = flToMm(state.focalLength);
	const offset        = state.viewZoomOffset ?? 0;
	const offsetDisplay = (offset > 0 ? '+' : '') + Math.round(offset).toString();
	const spacingPct    = Math.round((state.layerSpacingFactor ?? 1) * 100).toString();

	const iconColor = dk(dark, T.dark, T.textDark) as string;

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px', flexShrink: 0 }}>
			<SliderSlot
				icon="ctrl-focal"
				formattedValue={`${focalMm}mm`}
				sliderValue={focalMm}
				onSliderChange={v => dispatch({ type: 'SET_FOCAL_LENGTH', payload: mmToFl(v) } as any)}
				min={24} max={300} step={1}
				dark={dark} iconColor={iconColor}
			/>
			<SliderSlot
				icon="ctrl-distance"
				formattedValue={offsetDisplay}
				sliderValue={offset}
				onSliderChange={v => dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: v } as any)}
				min={-5000} max={2000} step={10}
				dark={dark} iconColor={iconColor}
			/>
			<SliderSlot
				icon="ctrl-spacing"
				formattedValue={spacingPct}
				sliderValue={state.layerSpacingFactor ?? 1}
				onSliderChange={v => dispatch({ type: 'SET_LAYER_SPACING_FACTOR', payload: v } as any)}
				min={0} max={2.0} step={0.05}
				dark={dark} iconColor={iconColor}
			/>
		</div>
	);
}

interface SliderSlotProps {
	icon: string;
	formattedValue: string;
	sliderValue: number;
	onSliderChange: (v: number) => void;
	min: number;
	max: number;
	step: number;
	dark: boolean;
	iconColor: string;
}

function SliderSlot({ icon, formattedValue, sliderValue, onSliderChange, min, max, step, dark, iconColor }: SliderSlotProps) {
	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
			<Ico name={icon} size={16} color={iconColor} />
			<DiMiniSlider
				value={sliderValue}
				onChange={onSliderChange}
				dark={dark}
				min={min}
				max={max}
				step={step}
				width={60}
				formattedValue={formattedValue}
			/>
		</div>
	);
}
