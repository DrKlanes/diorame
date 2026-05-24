import React from 'react';
import { useStrata, GRADIENT_DEFAULTS } from '../StrataContext';
import { DiSegmentControl } from '../../../design-system';
import { useTranslation } from '../../../i18n';

interface PaletteHeaderProps { dark: boolean; }

type PaletteSegmentMode = 'flat' | 'gradient' | 'fade';

export function PaletteHeader({ dark }: PaletteHeaderProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	const handlePaletteChange = (v: 'primary' | 'alternative') => {
		dispatch({ type: 'SET_ACTIVE_PALETTE', payload: v } as any);
	};

	// Map 3-state (flat / grad+solid / grad+fade) to segment value
	const currentGradType = state.layerGradParams[state.currentLayerIndex]?.gradType ?? GRADIENT_DEFAULTS.gradType;
	const modeValue: PaletteSegmentMode =
		state.paletteMode === 'flat' ? 'flat' :
		currentGradType === 'fade' ? 'fade' : 'gradient';

	const handleModeChange = (v: PaletteSegmentMode) => {
		if (v === 'flat') {
			dispatch({ type: 'SET_PALETTE_MODE', payload: 'flat' } as any);
			return;
		}
		dispatch({ type: 'SET_PALETTE_MODE', payload: 'grad' } as any);
		dispatch({ type: 'SET_PALETTE_GRADIENT_TYPE', payload: v === 'gradient' ? 'solid' : 'fade' } as any);
	};

	return (
		<div style={{
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 6,
			flexWrap: 'wrap',
		}}>
			<DiSegmentControl<'primary' | 'alternative'>
				options={[
					{ value: 'primary',     label: t('palette.segment.primary') },
					{ value: 'alternative', label: t('palette.segment.alt') },
				]}
				value={state.activePaletteId}
				onChange={handlePaletteChange}
				dark={dark}
				small
			/>

			<DiSegmentControl<PaletteSegmentMode>
				options={[
					{ value: 'flat',     label: t('palette.segment.flat') },
					{ value: 'gradient', label: t('palette.segment.gradient') },
					{ value: 'fade',     label: t('palette.segment.fade') },
				]}
				value={modeValue}
				onChange={handleModeChange}
				dark={dark}
				small
			/>
		</div>
	);
}
