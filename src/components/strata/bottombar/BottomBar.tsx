import React from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { DrawingToolbar } from './DrawingToolbar';
import { CameraBar } from './CameraBar';

export function BottomBar() {
	const { state } = useStrata();
	const { dark } = useTheme();
	const mode = state.mode;

	return (
		<div style={{
			position: 'absolute',
			bottom: 12,
			left: '50%',
			transform: 'translateX(-50%)',
			zIndex: 50,
		}}>
			{mode === 'drawing' ? <DrawingToolbar dark={dark} /> : <CameraBar dark={dark} />}
		</div>
	);
}
