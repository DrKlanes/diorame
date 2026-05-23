import React from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { DiPanel } from '../../../design-system';
import { PaletteHeader } from './PaletteHeader';
import { GradientControls } from './GradientControls';
import { SwatchGrid } from './SwatchGrid';

export function ColorPalette() {
	const { state } = useStrata();
	const { dark } = useTheme();

	if (state.mode !== 'drawing') return null;

	const isGradient = state.paletteMode === 'grad';

	return (
		<div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 50 }}>
			<DiPanel dark={dark} width={240} radius={20} padding="10px">
				<PaletteHeader dark={dark} />
				{isGradient && <GradientControls dark={dark} />}
				<SwatchGrid dark={dark} />
			</DiPanel>
		</div>
	);
}
