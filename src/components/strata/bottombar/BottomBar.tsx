import React from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { DrawingToolbar } from './DrawingToolbar';
import { CameraBar } from './CameraBar';
import { POIPill } from '../viewport/POIPill';
import { AnimationPlayerUI } from './AnimationPlayerUI';

export function BottomBar() {
	const { state } = useStrata();
	const { dark } = useTheme();
	const mode = state.mode;

	return (
		<div style={{
			position: 'absolute',
			bottom: 'max(12px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
			left: '50%',
			transform: 'translateX(-50%)',
			zIndex: 50,
		}}>
			{mode === 'cinematic' ? (
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
					<CameraBar dark={dark} />
					<POIPill />
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
					<AnimationPlayerUI />
					<DrawingToolbar dark={dark} />
				</div>
			)}
		</div>
	);
}
