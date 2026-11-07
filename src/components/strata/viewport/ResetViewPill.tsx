import React from 'react';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';
import { useTheme } from '../../../design-system/useTheme';
import { useTranslation } from '../../../i18n';

/**
 * ResetViewPill — resets drawing pan/zoom to origin, or fits the format frame when there is one (v3.25.5,
 * RESET_DRAWING_VIEW).
 *
 * Renders only a DiActionButton; position, DiPill wrapper, and mode/UI-visibility
 * filters all live in the shared ViewPills wrapper inside ControlsV2.
 */
export function ResetViewPill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();

	return (
		<DiActionButton
			name="target"
			onClick={() => dispatch({ type: 'RESET_DRAWING_VIEW' } as any)}
			dark={dark}
			tooltip={t(state.format ? 'viewport.resetViewFormat' : 'viewport.resetView')}
			shortcut="Space"
		/>
	);
}
