import React from 'react';
import { useStrata } from '../StrataContext';
import { DiPill, DiActionButton } from '../../../design-system';
import { useTheme } from '../../../design-system/useTheme';

/**
 * GridTogglePill — toggles the CompositionGuideOverlay (3x3 world-space dot grid).
 *
 * Position: fixed bottom-left, stacked ABOVE ResetViewPill (which lives at bottom:8).
 * Filters: DRAW mode only + UI not hidden (same as ResetViewPill).
 *
 * Same pattern as ResetViewPill — both are `position:fixed` viewport anchors, not
 * mounted inside any panel. Vertical stack with gap 8px (40px DiPill height + 8 gap = 56).
 */
export function GridTogglePill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();

	if (state.mode !== 'drawing') return null;
	if (state.isUIHidden) return null;

	return (
		<div style={{
			position: 'fixed',
			left: 8,
			bottom: 56,
			zIndex: 50,
		}}>
			<DiPill dark={dark} padding="5px">
				<DiActionButton
					name="guide"
					onClick={() => dispatch({ type: 'TOGGLE_GRID' } as any)}
					dark={dark}
					active={state.gridEnabled}
					activeStyle="wash"
					tooltip="Composition guide"
				/>
			</DiPill>
		</div>
	);
}
