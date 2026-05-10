import React from 'react';
import { useStrata } from '../StrataContext';
import { DiSegmentControl } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';

interface PaletteHeaderProps { dark: boolean; }

export function PaletteHeader({ dark }: PaletteHeaderProps) {
	const { state, dispatch } = useStrata();

	const paletteValue = state.activePaletteId === 'primary' ? 'Primary' : 'Alt';

	const handlePaletteChange = (v: string) => {
		dispatch({ type: 'SET_ACTIVE_PALETTE', payload: v === 'Primary' ? 'primary' : 'alternative' } as any);
	};

	// Map 3-state (flat / grad+solid / grad+fade) to segment value
	const modeValue =
		state.paletteMode === 'flat' ? 'Flat' :
		state.paletteGradientType === 'fade' ? 'Fade' : 'Solid';

	const handleModeChange = (v: string) => {
		if (v === 'Flat') {
			dispatch({ type: 'SET_PALETTE_MODE', payload: 'flat' } as any);
			return;
		}
		dispatch({ type: 'SET_PALETTE_MODE', payload: 'grad' } as any);
		dispatch({ type: 'SET_PALETTE_GRADIENT_TYPE', payload: v === 'Solid' ? 'solid' : 'fade' } as any);
	};

	const isGradient = state.paletteMode === 'grad';
	const summary = isGradient
		? `${state.paletteGradientAngle}° · ${Math.round(state.paletteGradientIntensity * 100)}%`
		: null;

	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 6,
			flexWrap: 'wrap',
		}}>
			<DiSegmentControl
				options={['Primary', 'Alt']}
				value={paletteValue}
				onChange={handlePaletteChange}
				dark={dark}
				small
			/>

			<div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
				<DiSegmentControl
					options={['Flat', 'Solid', 'Fade']}
					value={modeValue}
					onChange={handleModeChange}
					dark={dark}
					small
				/>
				{summary && (
					<span style={{
						fontFamily: TYPE.sora,
						fontSize: 10,
						fontWeight: 600,
						color: T.purple,
						whiteSpace: 'nowrap',
						letterSpacing: '0.02em',
					}}>
						{summary}
					</span>
				)}
			</div>
		</div>
	);
}
