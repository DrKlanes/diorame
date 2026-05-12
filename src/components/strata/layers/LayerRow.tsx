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

	const nameColor = isActive ? T.purple : (isEmpty ? mutedColor : textColor);
	const nameOpacity = isActive && isEmpty ? 0.6 : 1;

	const badgeIsFilled = !isEmpty;
	const badgeBg = badgeIsFilled
		? dk(dark, T.purple10, T.purple20) as string
		: dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.06)') as string;
	const badgeColor = badgeIsFilled ? T.purple : mutedColor;

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
				color: nameColor,
				opacity: nameOpacity,
				flexShrink: 0,
			}}>
				Layer {index + 1}
			</span>

			<div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
				<span style={{
					fontFamily: TYPE.sora,
					fontWeight: 500,
					fontSize: 10,
					color: badgeColor,
					backgroundColor: badgeBg,
					padding: '2px 8px',
					borderRadius: 999,
					letterSpacing: '0.3px',
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
