import React from 'react';
import { useStrata } from '../StrataContext';
import { IconBtn } from '../topbar/_shared';

const PRESETS = [
	{ type: 'forward', icon: 'cam-forward', tooltip: 'Forward' },
	{ type: 'spiral',  icon: 'cam-spiral',  tooltip: 'Spiral'  },
	{ type: 'yoyo',    icon: 'cam-yoyo',    tooltip: 'Yoyo'    },
	{ type: 'pulse',   icon: 'cam-pulse',   tooltip: 'Pulse'   },
	{ type: 'twist',   icon: 'cam-twist',   tooltip: 'Twist'   },
	{ type: 'arc',     icon: 'cam-arc',     tooltip: 'Arc'     },
	{ type: 'crane',   icon: 'cam-crane',   tooltip: 'Crane'   },
	{ type: 'truck',   icon: 'cam-truck',   tooltip: 'Truck'   },
	{ type: 'orbit',   icon: 'cam-orbit',   tooltip: 'Orbit'   },
	{ type: 'zoom',    icon: 'cam-zoom',    tooltip: 'Zoom'    },
] as const;

interface CameraPresetsZoneProps { dark: boolean; }

export function CameraPresetsZone({ dark }: CameraPresetsZoneProps) {
	const { state, dispatch } = useStrata();
	const active = state.cinematicType;

	return (
		<div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
			{PRESETS.map(p => (
				<IconBtn
					key={p.type}
					name={p.icon}
					onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: p.type } as any)}
					dark={dark}
					active={active === p.type}
					activeStyle="solid"
					tooltip={p.tooltip}
				/>
			))}
		</div>
	);
}
