import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { LineModeButton } from '../bottombar/_shared';
import { useTranslation } from '../../../i18n';

interface ToolOptionsPanelProps {
	dark: boolean;
}

export function ToolOptionsPanel({ dark }: ToolOptionsPanelProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	if (state.tool !== 'line') return null;

	const thickness = state.currentLineThickness;
	const labelColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const trackBg = dk(dark, T.border, T.trackDark) as string;

	return (
		<DiPill dark={dark} height={40} padding="0 10px" gap={6}>
			<LineModeButton dark={dark} />
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
				onInput={(e) => dispatch({ type: 'SET_LINE_THICKNESS_PREVIEW', payload: parseInt((e.target as HTMLInputElement).value) })}
				onChange={(e) => dispatch({ type: 'SET_LINE_THICKNESS', payload: parseInt(e.target.value) })}
				onPointerUp={() => dispatch({ type: 'COMMIT_LINE_THICKNESS' })}
				style={{
					width: 80,
					height: 3,
					appearance: 'none',
					WebkitAppearance: 'none',
					background: trackBg,
					borderRadius: RADIUS.pill,
					cursor: 'pointer',
					outline: 'none',
					border: 'none',
					flexShrink: 0,
					accentColor: T.purple,
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
	);
}
