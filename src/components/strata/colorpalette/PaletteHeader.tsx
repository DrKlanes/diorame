import React from 'react';
import { useStrata } from '../StrataContext';
import { DiSegmentControl } from '../../../design-system';

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
		state.paletteGradientType === 'fade' ? 'Fade' : 'Gradient';

	const handleModeChange = (v: string) => {
		if (v === 'Flat') {
			dispatch({ type: 'SET_PALETTE_MODE', payload: 'flat' } as any);
			return;
		}
		dispatch({ type: 'SET_PALETTE_MODE', payload: 'grad' } as any);
		dispatch({ type: 'SET_PALETTE_GRADIENT_TYPE', payload: v === 'Gradient' ? 'solid' : 'fade' } as any);
	};

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

			<DiSegmentControl
				options={['Flat', 'Gradient', 'Fade']}
				value={modeValue}
				onChange={handleModeChange}
				dark={dark}
				small
			/>
		</div>
	);
}
