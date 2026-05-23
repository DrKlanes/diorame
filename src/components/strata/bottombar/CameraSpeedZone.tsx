import React from 'react';
import { useStrata } from '../StrataContext';
import { Ico, DiMiniSlider, DiActionButton } from '../../../design-system';
import { useTranslation } from '../../../i18n';
import { T, dk } from '../../../design-system/tokens';

interface CameraSpeedZoneProps { dark: boolean; }

export function CameraSpeedZone({ dark }: CameraSpeedZoneProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const speed     = state.cinematicSpeed ?? 1.0;
	const enabled   = state.isHandheldEnabled ?? false;
	const intensity = state.handheldIntensity ?? 'low';

	// Cycle: Off → Low → Medium → High → Off
	const cycleHandshake = () => {
		if (!enabled) {
			dispatch({ type: 'TOGGLE_HANDHELD' } as any);
			dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'low' } as any);
			return;
		}
		if (intensity === 'low') {
			dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'medium' } as any);
			return;
		}
		if (intensity === 'medium') {
			dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'high' } as any);
			return;
		}
		// intensity === 'high' → Off
		dispatch({ type: 'TOGGLE_HANDHELD' } as any);
	};

	const iconColor = dk(dark, T.dark, T.textDark) as string;
	const handheldLabel = enabled
		? t('bottombar.view.handheld.dynamic', { intensity: t(`bottombar.view.handheld.intensity.${intensity}`) })
		: t('bottombar.view.handheld.label');

	return (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px', flexShrink: 0 }}>
			{/* Speed slider */}
			<Ico name="ctrl-speed" size={16} color={iconColor} />
			<DiMiniSlider
				value={speed}
				onChange={v => dispatch({ type: 'SET_CINEMATIC_SPEED', payload: v } as any)}
				dark={dark}
				min={0.1}
				max={1.0}
				step={0.1}
				width={80}
				formattedValue={speed.toFixed(1)}
			/>

			{/* Handheld cycle button: off → low → medium → high → off */}
			<DiActionButton
				name={enabled ? 'ctrl-handshake' : 'ctrl-handshake-off'}
				label={handheldLabel}
				onClick={cycleHandshake}
				dark={dark}
				active={enabled}
				activeStyle="wash"
				iconSize={16}
				tooltip={t('bottombar.view.handheld.tooltip')}
				minWidth={200}
			/>
		</div>
	);
}
