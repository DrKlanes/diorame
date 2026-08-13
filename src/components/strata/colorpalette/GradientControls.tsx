import React from 'react';
import { useStrata, GRADIENT_DEFAULTS } from '../StrataContext';
import { DiMiniSlider } from '../../../design-system';

interface GradientControlsProps { dark: boolean; }

export function GradientControls({ dark }: GradientControlsProps) {
	const { state, dispatch } = useStrata();
	const currentGradParams = state.layerGradParams[state.currentLayerIndex] ?? GRADIENT_DEFAULTS;

	// Commit-on-release: the drag folds into a single undo step (or a single
	// last-writer-wins patch) instead of riding on the next content snapshot.
	// pointerup, not mouseup — the panel has to work under a finger too.
	const commit = () => dispatch({ type: 'COMMIT_PALETTE_GRADIENT' } as any);

	return (
		<div style={{ display: 'flex', gap: 8 }}>
			<div style={{ flex: 1, minWidth: 0 }} onPointerUp={commit} onPointerCancel={commit}>
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
			<div style={{ flex: 1, minWidth: 0 }} onPointerUp={commit} onPointerCancel={commit}>
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
