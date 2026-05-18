import React from 'react';
import { useStrata } from '../StrataContext';
import { DiPill } from '../../../design-system';
import { DiActionButton } from '../../../design-system';
import { useTheme } from '../../../design-system/useTheme';

export function ResetViewPill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();

	if (state.mode !== 'drawing') return null;
	if (state.isUIHidden) return null;

	return (
		<div style={{
			position: 'fixed',
			left: 8,
			bottom: 8,
			zIndex: 50,
		}}>
			<DiPill dark={dark} padding="5px">
				<DiActionButton
					name="target"
					onClick={() => dispatch({ type: 'RESET_DRAWING_VIEW' } as any)}
					dark={dark}
					tooltip="Reset view"
				/>
			</DiPill>
		</div>
	);
}
