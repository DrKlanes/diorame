import React from 'react';
import { useStrata } from '../StrataContext';
import { DiMiniSlider } from '../../../design-system';

interface GradientControlsProps { dark: boolean; }

export function GradientControls({ dark }: GradientControlsProps) {
	const { state, dispatch } = useStrata();

	return (
		<div style={{ display: 'flex', gap: 8 }}>
			<div style={{ flex: 1, minWidth: 0 }}>
				<DiMiniSlider
					value={state.paletteGradientAngle}
					onChange={v => dispatch({ type: 'SET_PALETTE_GRADIENT_ANGLE', payload: v } as any)}
					min={0}
					max={360}
					step={15}
					dark={dark}
					width="100%"
					formattedValue={`${state.paletteGradientAngle}°`}
				/>
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<DiMiniSlider
					value={state.paletteGradientIntensity}
					onChange={v => dispatch({ type: 'SET_PALETTE_GRADIENT_INTENSITY', payload: v } as any)}
					min={0}
					max={1}
					step={0.05}
					dark={dark}
					width="100%"
					formattedValue={`${Math.round(state.paletteGradientIntensity * 100)}%`}
				/>
			</div>
		</div>
	);
}
