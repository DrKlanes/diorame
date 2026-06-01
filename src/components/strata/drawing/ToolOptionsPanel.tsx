import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { BrushModeButton } from '../bottombar/_shared';
import { useTranslation } from '../../../i18n';

interface ToolOptionsPanelProps {
	dark: boolean;
}

export function ToolOptionsPanel({ dark }: ToolOptionsPanelProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	if (state.mode !== 'drawing') return null;
	if (state.tool !== 'brush') return null;

	const isPlaybackLocked = state.isAnimationMode && state.isAnimationPlaying;
	const thickness = state.currentBrushThickness;
	const labelColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const trackBg = dk(dark, T.border, T.trackDark) as string;

	return (
		<div style={{ opacity: isPlaybackLocked ? 0.3 : undefined, pointerEvents: isPlaybackLocked ? 'none' : undefined }}>
		<DiPill dark={dark} height={40} padding="0 10px" gap={6}>
			<BrushModeButton dark={dark} />
			<DiVSep dark={dark} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontSize: TYPE.controlLabel.size,
				fontWeight: TYPE.controlLabel.weight,
				color: labelColor,
				whiteSpace: 'nowrap',
			}}>
				{t('bottombar.draw.toolOptions.size')}
			</span>
			<input
				type="range"
				min={1}
				max={100}
				step={1}
				value={thickness}
				disabled={isPlaybackLocked}
				onInput={(e) => dispatch({ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: parseInt((e.target as HTMLInputElement).value) })}
				onChange={(e) => dispatch({ type: 'SET_BRUSH_THICKNESS', payload: parseInt(e.target.value) })}
				onPointerUp={() => dispatch({ type: 'COMMIT_BRUSH_THICKNESS' })}
				style={{
					width: 80,
					height: 3,
					appearance: 'none',
					WebkitAppearance: 'none',
					background: trackBg,
					borderRadius: RADIUS.pill,
					cursor: isPlaybackLocked ? 'default' : 'pointer',
					outline: 'none',
					border: 'none',
					flexShrink: 0,
					accentColor: T.purple,
					opacity: isPlaybackLocked ? 0.3 : 1,
				}}
			/>
			<span style={{
				fontFamily: TYPE.numericValue.family,
				fontSize: TYPE.numericValue.size,
				fontWeight: TYPE.numericValue.weight,
				color: labelColor,
				minWidth: 20,
				textAlign: 'right',
			}}>
				{Math.round(thickness)}
			</span>
		</DiPill>
		</div>
	);
}
