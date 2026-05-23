import React from 'react';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';
import { useTranslation } from '../../../i18n';

const PRESETS = [
	{ type: 'forward', icon: 'cam-forward', tooltipKey: 'bottombar.view.preset.forward' },
	{ type: 'spiral',  icon: 'cam-spiral',  tooltipKey: 'bottombar.view.preset.spiral'  },
	{ type: 'yoyo',    icon: 'cam-yoyo',    tooltipKey: 'bottombar.view.preset.yoyo'    },
	{ type: 'pulse',   icon: 'cam-pulse',   tooltipKey: 'bottombar.view.preset.pulse'   },
	{ type: 'twist',   icon: 'cam-twist',   tooltipKey: 'bottombar.view.preset.twist'   },
	{ type: 'arc',     icon: 'cam-arc',     tooltipKey: 'bottombar.view.preset.arc'     },
	{ type: 'crane',   icon: 'cam-crane',   tooltipKey: 'bottombar.view.preset.crane'   },
	{ type: 'truck',   icon: 'cam-truck',   tooltipKey: 'bottombar.view.preset.truck'   },
	{ type: 'orbit',   icon: 'cam-orbit',   tooltipKey: 'bottombar.view.preset.free'   },
	{ type: 'zoom',    icon: 'cam-zoom',    tooltipKey: 'bottombar.view.preset.zoom'    },
] as const;

interface CameraPresetsZoneProps { dark: boolean; }

export function CameraPresetsZone({ dark }: CameraPresetsZoneProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const active = state.cinematicType;

	return (
		<div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
			{PRESETS.map(p => (
				<DiActionButton
					key={p.type}
					name={p.icon}
					onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: p.type } as any)}
					dark={dark}
					active={active === p.type}
					activeStyle="solid"
					tooltip={t(p.tooltipKey)}
				/>
			))}
		</div>
	);
}
