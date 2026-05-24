import React from 'react';
import { useStrata, GRADIENT_DEFAULTS } from '../StrataContext';
import { DiMiniSlider } from '../../../design-system';

interface GradientControlsProps { dark: boolean; }

export function GradientControls({ dark }: GradientControlsProps) {
	const { state, dispatch } = useStrata();
	const currentGradParams = state.layerGradParams[state.currentLayerIndex] ?? GRADIENT_DEFAULTS;

	return (
		<div style={{ display: 'flex', gap: 8 }}>
			<div style={{ flex: 1, minWidth: 0 }}>
				<DiMiniSlider
					value={currentGradParams.angle}
					onChange={v => dispatch({ type: 'SET_PALETTE_GRADIENT_ANGLE', payload: v } as any)}
					min={0}
					max={360}
					step={15}
					dark={dark}
					width="100%"
					formattedValue={`${currentGradParams.angle}°`}
				/>
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<DiMiniSlider
					value={currentGradParams.intensity}
					onChange={v => dispatch({ type: 'SET_PALETTE_GRADIENT_INTENSITY', payload: v } as any)}
					min={0}
					max={1}
					step={0.05}
					dark={dark}
					width="100%"
					formattedValue={`${Math.round(currentGradParams.intensity * 100)}%`}
				/>
			</div>
		</div>
	);
}
