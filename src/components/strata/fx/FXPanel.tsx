import React, { useState } from 'react';
import { useStrata, PostProcessingEnabled } from '../StrataContext';
import { DiPill, DiPanel } from '../../../design-system';
import { IconBtn } from '../topbar/_shared';
import { T, TYPE, RADIUS, dk, SPACE } from '../../../design-system/tokens';
import { useTheme } from '../../../design-system/useTheme';
import { FXRow } from './FXRow';

const STORAGE_KEY = 'diorame-fx-expanded';

const TEXTURE_FX: { fxKey: keyof PostProcessingEnabled; iconName: string; label: string }[] = [
	{ fxKey: 'grain',  iconName: 'fx-grain',  label: 'Grain' },
	{ fxKey: 'grunge', iconName: 'fx-grunge', label: 'Grunge' },
	{ fxKey: 'riso',   iconName: 'fx-riso',   label: 'RISO' },
];

const LENS_FX: { fxKey: keyof PostProcessingEnabled; iconName: string; label: string }[] = [
	{ fxKey: 'vignette',            iconName: 'fx-vignette',   label: 'Vignette' },
	{ fxKey: 'chromaticAberration', iconName: 'fx-chroma',     label: 'Chromatic Ab.' },
	{ fxKey: 'distortion',          iconName: 'fx-distortion', label: 'Distortion' },
	{ fxKey: 'glow',                iconName: 'fx-glow',       label: 'Glow' },
	{ fxKey: 'dof',                 iconName: 'fx-dof',        label: 'Blur / DoF' },
];

const ATMOSPHERE_FX: { fxKey: keyof PostProcessingEnabled; iconName: string; label: string }[] = [
	{ fxKey: 'fog',       iconName: 'fx-fog',       label: 'Fog' },
	{ fxKey: 'particles', iconName: 'fx-particles', label: 'Particles' },
	{ fxKey: 'wiggle',    iconName: 'fx-wiggle',    label: 'Stop Motion' },
	{ fxKey: 'pixelArt',  iconName: 'fx-pixel',     label: 'Pixel Art' },
];

export function FXPanel() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const [isExpanded, setIsExpanded] = useState(() => {
		try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
		catch { return false; }
	});

	if (state.mode !== 'cinematic') return null;
	if (state.isUIHidden) return null;

	const { postProcessingEnabled: px, fxMasterEnabled } = state;

	const toggle = (expanded: boolean) => {
		setIsExpanded(expanded);
		try { localStorage.setItem(STORAGE_KEY, String(expanded)); }
		catch {}
	};

	const mutedColor = dk(dark, T.muted, T.textDarkMuted) as string;

	const PillHSep = () => (
		<div style={{
			width: 22,
			height: 1,
			backgroundColor: dk(dark, T.border, T.borderDark),
			alignSelf: 'center',
			flexShrink: 0,
		}} />
	);

	const PanelHSep = () => (
		<div style={{
			width: '100%',
			height: 1,
			backgroundColor: dk(dark, T.border, T.borderDark),
			flexShrink: 0,
			margin: '3px 0',
		}} />
	);

	const GroupLabel = ({ label }: { label: string }) => (
		<span style={{
			fontFamily: TYPE.numericValue.family,
			fontWeight: TYPE.numericValue.weight,
			fontSize: TYPE.numericValue.size,
			color: mutedColor,
			letterSpacing: '0.05em',
			padding: '3px 10px 1px',
			display: 'block',
		}}>
			{label}
		</span>
	);

	if (isExpanded) {
		return (
			<div style={{ position: 'absolute', top: '50%', right: SPACE.edge, transform: 'translateY(-50%)', zIndex: 50 }}>
				<DiPanel dark={dark} width={248} radius={RADIUS.panel} padding="10px" style={{ gap: 0 }}>
					{/* Header */}
					<div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
						<span style={{
							fontFamily: TYPE.panelHeader.family,
							fontWeight: TYPE.panelHeader.weight,
							fontSize: TYPE.panelHeader.size,
							letterSpacing: TYPE.panelHeader.letterSpacing,
							textTransform: TYPE.panelHeader.textTransform,
							color: dk(dark, T.dark, T.textDark),
							flex: 1,
						}}>
							FX
						</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<IconBtn name="sparkles" onClick={() => dispatch({ type: 'TOGGLE_FX_MASTER' })} dark={dark} active={fxMasterEnabled} tooltip="Toggle all FX" />
							<IconBtn name="chevron-right" onClick={() => toggle(false)} dark={dark} tooltip="Collapse" />
						</div>
					</div>
					<PanelHSep />
					{/* Texture */}
					<GroupLabel label="Texture" />
					{TEXTURE_FX.map(({ fxKey, iconName, label }) => (
						<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} label={label}
							isActive={px[fxKey]} dark={dark}
							onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })} />
					))}
					<PanelHSep />
					{/* Lens */}
					<GroupLabel label="Lens" />
					{LENS_FX.map(({ fxKey, iconName, label }) => (
						<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} label={label}
							isActive={px[fxKey]} dark={dark}
							onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })} />
					))}
					<PanelHSep />
					{/* Atmosphere */}
					<GroupLabel label="Atmosphere" />
					{ATMOSPHERE_FX.map(({ fxKey, iconName, label }) => (
						<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} label={label}
							isActive={px[fxKey]} dark={dark}
							onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })} />
					))}
				</DiPanel>
			</div>
		);
	}

	// Collapsed pill
	return (
		<div style={{ position: 'absolute', top: '50%', right: SPACE.edge, transform: 'translateY(-50%)', zIndex: 50 }}>
			<DiPill dark={dark} padding="8px 0" gap={2}
				style={{ flexDirection: 'column', width: 40, height: 'auto' } as React.CSSProperties}
			>
				<IconBtn name="sparkles" onClick={() => dispatch({ type: 'TOGGLE_FX_MASTER' })} dark={dark} active={fxMasterEnabled} tooltip="Toggle all FX" />
				<PillHSep />
				<IconBtn name="fx-grain"     onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'grain'  })} dark={dark} active={px.grain}  tooltip="Grain" />
				<IconBtn name="fx-grunge"    onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'grunge' })} dark={dark} active={px.grunge} tooltip="Grunge" />
				<IconBtn name="fx-riso"      onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'riso'   })} dark={dark} active={px.riso}   tooltip="Riso" />
				<PillHSep />
				<IconBtn name="fx-vignette"   onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'vignette'            })} dark={dark} active={px.vignette}            tooltip="Vignette" />
				<IconBtn name="fx-chroma"     onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'chromaticAberration' })} dark={dark} active={px.chromaticAberration} tooltip="Chromatic Aberration" />
				<IconBtn name="fx-distortion" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'distortion'          })} dark={dark} active={px.distortion}          tooltip="Distortion" />
				<IconBtn name="fx-glow"       onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'glow'                })} dark={dark} active={px.glow}                tooltip="Glow" />
				<IconBtn name="fx-dof"        onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'dof'                 })} dark={dark} active={px.dof}                 tooltip="Depth of Field" />
				<PillHSep />
				<IconBtn name="fx-fog"       onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'fog'      })} dark={dark} active={px.fog}       tooltip="Fog" />
				<IconBtn name="fx-particles" onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'particles' })} dark={dark} active={px.particles} tooltip="Particles" />
				<IconBtn name="fx-wiggle"    onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'wiggle'    })} dark={dark} active={px.wiggle}    tooltip="Wiggle" />
				<IconBtn name="fx-pixel"     onClick={() => dispatch({ type: 'TOGGLE_FX', payload: 'pixelArt'  })} dark={dark} active={px.pixelArt}  tooltip="Pixel Art" />
				<PillHSep />
				<IconBtn name="chevron-left" onClick={() => toggle(true)} dark={dark} tooltip="Expand FX panel" />
			</DiPill>
		</div>
	);
}
