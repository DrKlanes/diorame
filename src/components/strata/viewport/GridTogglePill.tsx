import React from 'react';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';
import { useTheme } from '../../../design-system/useTheme';
import { useTranslation } from '../../../i18n';

/**
 * GridTogglePill — toggles the CompositionGuideOverlay (3x3 world-space dot grid).
 *
 * Renders only a DiActionButton; position, DiPill wrapper, and mode/UI-visibility
 * filters all live in the shared ViewPills wrapper inside ControlsV2.
 */
export function GridTogglePill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();

	return (
		<DiActionButton
			name="guide"
			onClick={() => dispatch({ type: 'TOGGLE_GRID' } as any)}
			dark={dark}
			active={state.gridEnabled}
			activeStyle="wash"
			tooltip={t('viewport.compositionGuide')}
		/>
	);
}
