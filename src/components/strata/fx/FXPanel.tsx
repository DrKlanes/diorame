import React from 'react';
import { useStrata } from '../StrataContext';
import { DiPill } from '../../../design-system';
import { IconBtn } from '../topbar/_shared';
import { T, dk, SPACE } from '../../../design-system/tokens';
import { useTheme } from '../../../design-system/useTheme';

export function FXPanel() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();

	if (state.mode !== 'cinematic') return null;
	if (state.isUIHidden) return null;

	const { postProcessingEnabled: px, fxMasterEnabled } = state;

	const HSep = () => (
		<div style={{
			width: 22,
			height: 1,
			backgroundColor: dk(dark, T.border, T.borderDark),
			alignSelf: 'center',
			flexShrink: 0,
		}} />
	);

	return (
		<div style={{ position: 'absolute', top: '50%', right: SPACE.edge, transform: 'translateY(-50%)', zIndex: 50 }}>
			<DiPill
				dark={dark}
				padding="8px 0"
				gap={2}
				style={{ flexDirection: 'column', width: 40, height: 'auto' } as React.CSSProperties}
			>
				{/* Master toggle */}
				<IconBtn name="sparkles" onClick={() => dispatch({ type: 'TOGGLE_FX_MASTER' })} dark={dark} active={fxMasterEnabled} tooltip="Toggle all FX" />
				<HSep />
				{/* Texture: grain, grunge, riso */}
				<IconBtn name="fx-grain" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'grain' })} dark={dark} active={px.grain} tooltip="Grain" />
				<IconBtn name="fx-grunge" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'grunge' })} dark={dark} active={px.grunge} tooltip="Grunge" />
				<IconBtn name="fx-riso" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'riso' })} dark={dark} active={px.riso} tooltip="Riso" />
				<HSep />
				{/* Lens: vignette, chroma, distortion, glow, dof */}
				<IconBtn name="fx-vignette" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'vignette' })} dark={dark} active={px.vignette} tooltip="Vignette" />
				<IconBtn name="fx-chroma" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'chromaticAberration' })} dark={dark} active={px.chromaticAberration} tooltip="Chromatic Aberration" />
				<IconBtn name="fx-distortion" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'distortion' })} dark={dark} active={px.distortion} tooltip="Distortion" />
				<IconBtn name="fx-glow" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'glow' })} dark={dark} active={px.glow} tooltip="Glow" />
				<IconBtn name="fx-dof" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'dof' })} dark={dark} active={px.dof} tooltip="Depth of Field" />
				<HSep />
				{/* Atmosphere: fog, particles, wiggle, pixelArt */}
				<IconBtn name="fx-fog" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'fog' })} dark={dark} active={px.fog} tooltip="Fog" />
				<IconBtn name="fx-particles" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'particles' })} dark={dark} active={px.particles} tooltip="Particles" />
				<IconBtn name="fx-wiggle" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'wiggle' })} dark={dark} active={px.wiggle} tooltip="Wiggle" />
				<IconBtn name="fx-pixel" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'pixelArt' })} dark={dark} active={px.pixelArt} tooltip="Pixel Art" />
				<HSep />
				{/* Expand — deferred */}
				<IconBtn name="chevron-left" onClick={() => {}} dark={dark} tooltip="Expand FX panel" />
			</DiPill>
		</div>
	);
}
