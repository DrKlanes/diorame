import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { CameraPresetsZone } from './CameraPresetsZone';
import { CameraSpeedZone } from './CameraSpeedZone';
import { CameraSlidersZone } from './CameraSlidersZone';

interface CameraBarProps { dark: boolean; }

export function CameraBar({ dark }: CameraBarProps) {
	const [isCompact, setIsCompact] = React.useState(false);

	React.useEffect(() => {
		const mq = window.matchMedia('(max-width: 1100px)');
		const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsCompact(e.matches);
		handler(mq);
		mq.addEventListener('change', handler as any);
		return () => mq.removeEventListener('change', handler as any);
	}, []);

	if (isCompact) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
				<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
					<CameraPresetsZone dark={dark} />
					<DiVSep dark={dark} tall />
					<CameraSpeedZone dark={dark} />
				</DiPill>
				<DiPill dark={dark} height={40} padding="0 12px" gap={8}>
					<CameraSlidersZone dark={dark} />
				</DiPill>
			</div>
		);
	}

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<CameraPresetsZone dark={dark} />
			<DiVSep dark={dark} tall />
			<CameraSpeedZone dark={dark} />
			<DiVSep dark={dark} tall />
			<CameraSlidersZone dark={dark} />
		</DiPill>
	);
}
