import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { useIsCameraBarCompact } from '../../../hooks/useIsCameraBarCompact';
import { CameraPresetsZone } from './CameraPresetsZone';
import { CameraSpeedZone } from './CameraSpeedZone';
import { CameraSlidersZone } from './CameraSlidersZone';
import { POIPill } from '../viewport/POIPill';

interface CameraBarProps { dark: boolean; }

export function CameraBar({ dark }: CameraBarProps) {
	const isCompact = useIsCameraBarCompact();

	// Compact: the framing hint sits beside the sliders, so no row is wider than the presets pill
	// (709 px); next to the presets it pushed the bar to 873 px and cut it off at 820 px wide.
	if (isCompact) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
				<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
					<DiPill dark={dark} height={40} padding="0 12px" gap={8}>
						<CameraSlidersZone dark={dark} />
					</DiPill>
					<POIPill />
				</div>
				<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
					<CameraPresetsZone dark={dark} />
					<DiVSep dark={dark} tall />
					<CameraSpeedZone dark={dark} />
				</DiPill>
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<CameraPresetsZone dark={dark} />
				<DiVSep dark={dark} tall />
				<CameraSpeedZone dark={dark} />
				<DiVSep dark={dark} tall />
				<CameraSlidersZone dark={dark} />
			</DiPill>
			<POIPill />
		</div>
	);
}
