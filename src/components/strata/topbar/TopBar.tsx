import React from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { FileControlsPill } from './FileControlsPill';
import { SnapshotRecordPill } from './SnapshotRecordPill';
import { ModeSwitchPill } from './ModeSwitchPill';
import { ThemeTogglePill } from './ThemeTogglePill';
import { AnimationPlayerUI } from './AnimationPlayerUI';

export function TopBar() {
	const { state } = useStrata();
	const { dark } = useTheme();
	const isDrawing = state.mode === 'drawing';

	return (
		<>
			{/* Top-left: contextual per mode */}
			<div style={{ position: 'absolute', top: 12, left: 12, zIndex: 50 }}>
				{isDrawing
					? <FileControlsPill dark={dark} />
					: <SnapshotRecordPill dark={dark} />
				}
			</div>

			{/* Top-center: mode switch + animation player (DRAW only, auto-hides in CINEMA via mode guard) */}
			<div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
				<ModeSwitchPill dark={dark} />
				<AnimationPlayerUI />
			</div>

			{/* Top-right: theme toggle */}
			<div style={{ position: 'absolute', top: 12, right: 12, zIndex: 50 }}>
				<ThemeTogglePill dark={dark} />
			</div>
		</>
	);
}
