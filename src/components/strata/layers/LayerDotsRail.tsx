import React from 'react';
import { useStrata } from '../StrataContext';
import { DiPill, Ico } from '../../../design-system';
import { T, dk } from '../../../design-system/tokens';
import { useTheme } from '../../../design-system/useTheme';

export function LayerDotsRail() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();

	if (state.mode !== 'drawing') return null;
	if (state.isUIHidden) return null;

	const { totalLayers, currentLayerIndex, hiddenLayers, locked3DLayers } = state;
	const layers = Array.from({ length: totalLayers }, (_, i) => i).reverse();
	const mutedColor = dk(dark, T.muted, T.textDarkMuted) as string;

	return (
		<div style={{
			position: 'fixed',
			right: 8,
			top: '50%',
			transform: 'translateY(-50%)',
			zIndex: 50,
		}}>
			<DiPill
				dark={dark}
				padding="6px 0"
				gap={0}
				style={{ flexDirection: 'column', width: 24, height: 'auto' } as React.CSSProperties}
			>
				{/* Camera icon — near end of Z axis */}
				<div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
					<Ico name="camera" size={12} color={mutedColor} />
				</div>

				{layers.map(i => {
					const isActive = i === currentLayerIndex;
					const isHidden = hiddenLayers.includes(i);
					const isLocked = locked3DLayers.includes(i);
					const dotBgColor = isActive
						? T.purple
						: dk(dark, T.border, T.borderDark) as string;

					return (
						<button
							key={i}
							onClick={() => dispatch({ type: 'SET_CURRENT_LAYER', payload: i } as any)}
							aria-label={`Go to layer ${i + 1}`}
							title={`Layer ${i + 1}`}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: 4,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							<div style={{
								width: 8,
								height: 8,
								borderRadius: '50%',
								backgroundColor: dotBgColor,
								opacity: isHidden ? 0.4 : 1,
								boxShadow: isLocked && !isActive ? `inset 0 0 0 1px ${T.purple}` : 'none',
								flexShrink: 0,
							}} />
						</button>
					);
				})}

				{/* Depth-far icon — far end of Z axis */}
				<div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
					<Ico name="depth-far" size={12} color={mutedColor} />
				</div>
			</DiPill>
		</div>
	);
}
