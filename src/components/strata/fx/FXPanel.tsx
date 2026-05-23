import React, { useState } from 'react';
import { useStrata, PostProcessingEnabled, PostProcessingSettings } from '../StrataContext';
import { DiPill, DiPanel, DiActionButton, Ico } from '../../../design-system';
import { T, TYPE, RADIUS, dk, SPACE } from '../../../design-system/tokens';
import { useTheme } from '../../../design-system/useTheme';
import { FXRow } from './FXRow';

const STORAGE_KEY = 'diorame-fx-expanded';

type FXEntry = { fxKey: keyof PostProcessingEnabled; iconName: string; label: string; level: 1 | 'special' | 'bipolar' | 'discrete' | 'composite' | 'pixel' | 'dof'; valueKey?: keyof PostProcessingSettings; discreteOptions?: Array<{ label: string; value: number }>; compositeOptions?: string[] };

const TEXTURE_FX: FXEntry[] = [
	{ fxKey: 'grain',  iconName: 'fx-grain',  label: 'Grain',  level: 1,         valueKey: 'grain' },
	{ fxKey: 'grunge', iconName: 'fx-grunge', label: 'Grunge', level: 'discrete', valueKey: 'grungeIntensity', discreteOptions: [{ label: 'Subtle', value: 0 }, { label: 'Medium', value: 0.5 }, { label: 'Intense', value: 1 }] },
	{ fxKey: 'riso',   iconName: 'fx-riso',   label: 'RISO',   level: 1,         valueKey: 'riso' },
];

const LENS_FX: FXEntry[] = [
	{ fxKey: 'vignette',            iconName: 'fx-vignette',   label: 'Vignette',      level: 1,         valueKey: 'vignette' },
	{ fxKey: 'chromaticAberration', iconName: 'fx-chroma',     label: 'Chromatic Ab.', level: 1,         valueKey: 'chromaticAberration' },
	{ fxKey: 'distortion',          iconName: 'fx-distortion', label: 'Distortion',    level: 'bipolar', valueKey: 'distortion' },
	{ fxKey: 'glow',                iconName: 'fx-glow',       label: 'Glow',          level: 1,         valueKey: 'glow' },
	{ fxKey: 'dof',                 iconName: 'fx-dof',        label: 'Blur / DoF',    level: 'dof', valueKey: 'dof' },
];

const ATMOSPHERE_FX: FXEntry[] = [
	{ fxKey: 'fog',       iconName: 'fx-fog',       label: 'Fog',         level: 1,         valueKey: 'fog' },
	{ fxKey: 'particles', iconName: 'fx-particles', label: 'Particles',   level: 'composite', valueKey: 'particles', compositeOptions: ['Circle', 'Square', 'Stroke'] },
	{ fxKey: 'wiggle',    iconName: 'fx-wiggle',    label: 'Stop Motion', level: 'discrete', valueKey: 'wiggle', discreteOptions: [{ label: 'Light', value: 0 }, { label: 'Medium', value: 0.5 }, { label: 'Heavy', value: 1 }] },
	{ fxKey: 'pixelArt',  iconName: 'fx-pixel',     label: 'Pixel Art',   level: 'pixel' },
];

// Local helper: master FX button — larger size + outline to distinguish from FX row icons
function FXMasterBtn({ dark, active, onClick }: { dark: boolean; active: boolean; onClick: () => void }) {
	const [hov, setHov] = useState(false);
	const bg = active
		? dk(dark, T.purple10, T.purple20)
		: hov
			? dk(dark, 'rgba(0,0,0,0.05)', 'rgba(255,255,255,0.09)')
			: dk(dark, 'rgba(0,0,0,0.03)', 'rgba(255,255,255,0.05)');
	const outline = active
		? 'inset 0 0 0 1.5px rgba(154, 15, 249, 0.40)'
		: 'inset 0 0 0 1px rgba(154, 15, 249, 0.18)';
	return (
		<button
			onClick={onClick}
			onPointerEnter={() => setHov(true)}
			onPointerLeave={() => setHov(false)}
			title="Toggle all FX"
			style={{
				width: 35,
				height: 35,
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: bg as string,
				boxShadow: outline,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transition: 'background 0.1s',
				flexShrink: 0,
			}}
		>
			<Ico name="sparkles" size={21} color={active ? dk(dark, T.purple, T.purpleLight) as string : dk(dark, T.muted, T.textDarkMuted) as string} />
		</button>
	);
}

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
	const snap = state.postProcessingSnapshot;
	const hasSnapshot = snap !== null;
	const fxClick = (key: keyof typeof px) => hasSnapshot
		? () => dispatch({ type: 'TOGGLE_FX_MASTER' })
		: () => dispatch({ type: 'TOGGLE_FX', payload: key });

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
				<DiPanel dark={dark} width={248} radius={RADIUS.panel} padding="10px" style={{ gap: 0, maxHeight: 'calc(100vh - 80px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
					{/* Header */}
					<div style={{ display: 'flex', alignItems: 'center', marginBottom: 4, flexShrink: 0 }}>
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
						{!fxMasterEnabled && (
							<span style={{
								fontFamily: TYPE.numericValue.family,
								fontSize: TYPE.numericValue.size,
								fontWeight: 600,
								color: dk(dark, T.danger, T.dangerDark),
								marginRight: 4,
								flexShrink: 0,
							}}>
								· off
							</span>
						)}
						<div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<FXMasterBtn dark={dark} active={fxMasterEnabled && Object.values(px).some(v => v)} onClick={() => dispatch({ type: 'TOGGLE_FX_MASTER' })} />
							<DiActionButton name="chevron-right" onClick={() => toggle(false)} dark={dark} tooltip="Collapse" />
						</div>
					</div>
					<PanelHSep />
					<div className="di-panel-scroll" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 141px)' }}>
					{/* Texture */}
					<GroupLabel label="Texture" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{TEXTURE_FX.map(({ fxKey, iconName, label, level, valueKey, discreteOptions, compositeOptions }) => (
							<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} label={label}
								isActive={px[fxKey]} dark={dark}
								onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })}
								level={level} valueKey={valueKey}
								discreteOptions={discreteOptions} compositeOptions={compositeOptions} />
						))}
					</div>
					<PanelHSep />
					{/* Lens */}
					<GroupLabel label="Lens" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{LENS_FX.map(({ fxKey, iconName, label, level, valueKey, discreteOptions, compositeOptions }) => (
							<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} label={label}
								isActive={px[fxKey]} dark={dark}
								onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })}
								level={level} valueKey={valueKey}
								discreteOptions={discreteOptions} compositeOptions={compositeOptions} />
						))}
					</div>
					<PanelHSep />
					{/* Atmosphere */}
					<GroupLabel label="Atmosphere" />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{ATMOSPHERE_FX.map(({ fxKey, iconName, label, level, valueKey, discreteOptions, compositeOptions }) => (
							<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} label={label}
								isActive={px[fxKey]} dark={dark}
								onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })}
								level={level} valueKey={valueKey}
								discreteOptions={discreteOptions} compositeOptions={compositeOptions} />
						))}
					</div>
					</div>
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
				<FXMasterBtn dark={dark} active={fxMasterEnabled && Object.values(px).some(v => v)} onClick={() => dispatch({ type: 'TOGGLE_FX_MASTER' })} />
				<PillHSep />
				<DiActionButton name="chevron-left" onClick={() => toggle(true)} dark={dark} tooltip="Expand FX panel" />
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 40, opacity: hasSnapshot ? 0.5 : 1 }}>
				<PillHSep />
				<DiActionButton name="fx-grain"     onClick={fxClick('grain')} dark={dark} active={snap ? snap.grain : px.grain}  tooltip="Grain" />
				<DiActionButton name="fx-grunge"    onClick={fxClick('grunge')} dark={dark} active={snap ? snap.grunge : px.grunge} tooltip="Grunge" />
				<DiActionButton name="fx-riso"      onClick={fxClick('riso')} dark={dark} active={snap ? snap.riso : px.riso}   tooltip="Riso" />
				<PillHSep />
				<DiActionButton name="fx-vignette"   onClick={fxClick('vignette')} dark={dark} active={snap ? snap.vignette : px.vignette}            tooltip="Vignette" />
				<DiActionButton name="fx-chroma"     onClick={fxClick('chromaticAberration')} dark={dark} active={snap ? snap.chromaticAberration : px.chromaticAberration} tooltip="Chromatic Aberration" />
				<DiActionButton name="fx-distortion" onClick={fxClick('distortion')} dark={dark} active={snap ? snap.distortion : px.distortion}          tooltip="Distortion" />
				<DiActionButton name="fx-glow"       onClick={fxClick('glow')} dark={dark} active={snap ? snap.glow : px.glow}                tooltip="Glow" />
				<DiActionButton name="fx-dof"        onClick={fxClick('dof')} dark={dark} active={snap ? snap.dof : px.dof}                 tooltip="Depth of Field" />
				<PillHSep />
				<DiActionButton name="fx-fog"       onClick={fxClick('fog')} dark={dark} active={snap ? snap.fog : px.fog}       tooltip="Fog" />
				<DiActionButton name="fx-particles" onClick={fxClick('particles')} dark={dark} active={snap ? snap.particles : px.particles} tooltip="Particles" />
				<DiActionButton name="fx-wiggle"    onClick={fxClick('wiggle')} dark={dark} active={snap ? snap.wiggle : px.wiggle}    tooltip="Wiggle" />
				<DiActionButton name="fx-pixel"     onClick={fxClick('pixelArt')} dark={dark} active={snap ? snap.pixelArt : px.pixelArt}  tooltip="Pixel Art" />
				</div>
			</DiPill>
		</div>
	);
}
