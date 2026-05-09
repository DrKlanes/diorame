import React from 'react';
import { useStrata } from '../StrataContext';
import { Ico, DiMiniSlider } from '../../../design-system';
import { T, dk } from '../../../design-system/tokens';

interface CameraSpeedZoneProps { dark: boolean; }

const HANDSHAKE_LABELS: Record<string, string> = {
	off:    'Off',
	low:    'Low',
	medium: 'Medium',
	high:   'High',
};

export function CameraSpeedZone({ dark }: CameraSpeedZoneProps) {
	const { state, dispatch } = useStrata();
	const speed     = state.cinematicSpeed ?? 1.0;
	const enabled   = state.isHandheldEnabled ?? false;
	const intensity = state.handheldIntensity ?? 'low';

	const currentLabel = !enabled ? 'off' : intensity;

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

	const iconColor          = dk(dark, T.dark, T.textDark) as string;
	const iconSecondaryColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const labelColor         = dk(dark, T.dark, T.textDark) as string;

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

			{/* Handshake button cíclico: icon + label de texto, ciclo 4 estados */}
			<button
				onClick={cycleHandshake}
				title={`Handshake: ${HANDSHAKE_LABELS[currentLabel]}`}
				style={{
					height: 30,
					padding: '0 8px',
					borderRadius: 9,
					border: 'none',
					background: 'transparent',
					cursor: 'pointer',
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					flexShrink: 0,
					fontFamily: "'Manrope', sans-serif",
				}}
			>
				<Ico
					name={enabled ? 'ctrl-handshake' : 'ctrl-handshake-off'}
					size={16}
					color={enabled ? iconColor : iconSecondaryColor}
				/>
				<span style={{
					fontSize: 10,
					fontWeight: 600,
					color: enabled ? labelColor : iconSecondaryColor,
					minWidth: 42,
					textAlign: 'left',
				}}>{HANDSHAKE_LABELS[currentLabel]}</span>
			</button>
		</div>
	);
}
