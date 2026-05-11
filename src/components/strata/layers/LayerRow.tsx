import React from 'react';
import { useStrata, BASE_DEPTH_STEP } from '../StrataContext';
import { Ico } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';

interface LayerRowProps {
	index: number;
	dark: boolean;
}

export function LayerRow({ index, dark }: LayerRowProps) {
	const { state, dispatch } = useStrata();
	const zIndex = index * -BASE_DEPTH_STEP;
	const isEmpty = !state.shapes.some(s => s.zIndex === zIndex);
	const isActive = index === state.currentLayerIndex;
	const isHidden = state.hiddenLayers.includes(index);
	const isLocked3D = state.locked3DLayers.includes(index); // TODO: replace with anchor/pin icon

	const renderMode = state.layerRenderModes[index] ?? 'flat';
	const gradType = state.layerGradParams[index]?.gradType ?? 'solid';
	const colorMode = isEmpty
		? 'Empty'
		: renderMode === 'grad'
			? (gradType === 'fade' ? 'Fade' : 'Grad')
			: 'Flat';

	const textColor = dk(dark, T.dark, T.textDark) as string;
	const mutedColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const badgeBg = dk(dark, 'rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)') as string;

	return (
		<button
			onClick={() => dispatch({ type: 'SET_CURRENT_LAYER', payload: index } as any)}
			style={{
				width: '100%',
				padding: '5px 6px 5px 8px',
				background: isActive ? dk(dark, T.purple10, T.purple20) : 'transparent',
				border: 'none',
				borderRadius: RADIUS.iconBtn,
				boxShadow: isActive ? `inset 2px 0 0 ${T.purple}` : 'none',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 4,
				opacity: isHidden ? 0.5 : 1,
				boxSizing: 'border-box',
				flexShrink: 0,
			}}
		>
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: isEmpty ? mutedColor : textColor,
				flexShrink: 0,
			}}>
				Layer {index + 1}
			</span>

			<div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
				<span style={{
					fontFamily: TYPE.badge.family,
					fontWeight: TYPE.badge.weight,
					fontSize: TYPE.badge.size,
					color: mutedColor,
					backgroundColor: badgeBg,
					padding: '1px 5px',
					borderRadius: 4,
					letterSpacing: '0.02em',
				}}>
					{colorMode}
				</span>

				<button
					onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: index } as any); }}
					style={{
						width: 20,
						height: 20,
						border: 'none',
						background: 'transparent',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: 0,
						borderRadius: 4,
						flexShrink: 0,
					}}
				>
					<Ico
						name={isHidden ? 'eye-off' : 'eye'}
						size={13}
						color={isHidden ? mutedColor : textColor}
					/>
				</button>

				{/* TODO: replace with anchor/pin icon */}
				{isLocked3D && (
					<Ico name="lock" size={12} color={mutedColor} />
				)}
			</div>
		</button>
	);
}
