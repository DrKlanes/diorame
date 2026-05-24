import React, { useState } from 'react';
import { useStrata, PostProcessingEnabled, PostProcessingSettings } from '../StrataContext';
import { DiPill, DiPanel, DiActionButton, Ico } from '../../../design-system';
import { T, TYPE, RADIUS, dk, SPACE } from '../../../design-system/tokens';
import { useTheme } from '../../../design-system/useTheme';
import { useTranslation } from '../../../i18n';
import { supportsCanvasFilter } from '../../../utils/browserCapabilities';
import { toast } from 'sonner@2.0.3';
import { FXRow } from './FXRow';

const STORAGE_KEY = 'diorame-fx-expanded';

// ── Types ────────────────────────────────────────────────────────────────────
// All visible strings carry i18n keys (resolved via t() in FXRow at render time).
// Option values are stable internal identifiers (numeric or canonical string).

type DiscreteOption = { value: number; labelKey: string };
type CompositeOption = { value: 'circle' | 'square' | 'stroke'; labelKey: string };

type FXEntry = {
	fxKey: keyof PostProcessingEnabled;
	iconName: string;
	labelKey: string;
	level: 1 | 'special' | 'bipolar' | 'discrete' | 'composite' | 'pixel' | 'dof';
	valueKey?: keyof PostProcessingSettings;
	discreteOptions?: DiscreteOption[];
	compositeOptions?: CompositeOption[];
	browserUnsupported?: true;
};

const TEXTURE_FX: FXEntry[] = [
	{ fxKey: 'grain',  iconName: 'fx-grain',  labelKey: 'fx.texture.grain.label',  level: 1, valueKey: 'grain' },
	{ fxKey: 'grunge', iconName: 'fx-grunge', labelKey: 'fx.texture.grunge.label', level: 'discrete', valueKey: 'grungeIntensity', discreteOptions: [
		{ value: 0,   labelKey: 'fx.intensity.subtle'  },
		{ value: 0.5, labelKey: 'fx.intensity.medium'  },
		{ value: 1,   labelKey: 'fx.intensity.intense' },
	]},
	{ fxKey: 'riso',   iconName: 'fx-riso',   labelKey: 'fx.texture.riso.label',   level: 1, valueKey: 'riso' },
];

const LENS_FX: FXEntry[] = [
	{ fxKey: 'vignette',            iconName: 'fx-vignette',   labelKey: 'fx.lens.vignette.label',      level: 1,         valueKey: 'vignette' },
	{ fxKey: 'chromaticAberration', iconName: 'fx-chroma',     labelKey: 'fx.lens.chromaticAb.label',   level: 1,         valueKey: 'chromaticAberration' },
	{ fxKey: 'distortion',          iconName: 'fx-distortion', labelKey: 'fx.lens.distortion.label',    level: 'bipolar', valueKey: 'distortion' },
	{ fxKey: 'glow',                iconName: 'fx-glow',       labelKey: 'fx.lens.glow.label',          level: 1,         valueKey: 'glow',  browserUnsupported: true },
	{ fxKey: 'dof',                 iconName: 'fx-dof',        labelKey: 'fx.lens.dof.label',           level: 'dof',     valueKey: 'dof',   browserUnsupported: true },
];

const ATMOSPHERE_FX: FXEntry[] = [
	{ fxKey: 'fog',       iconName: 'fx-fog',       labelKey: 'fx.atmosphere.fog.label',        level: 1, valueKey: 'fog' },
	{ fxKey: 'particles', iconName: 'fx-particles', labelKey: 'fx.atmosphere.particles.label',  level: 'composite', valueKey: 'particles', compositeOptions: [
		{ value: 'circle', labelKey: 'fx.particles.circle' },
		{ value: 'square', labelKey: 'fx.particles.square' },
		{ value: 'stroke', labelKey: 'fx.particles.stroke' },
	]},
	{ fxKey: 'wiggle',    iconName: 'fx-wiggle',    labelKey: 'fx.atmosphere.stopMotion.label', level: 'discrete',  valueKey: 'wiggle', discreteOptions: [
		{ value: 0,   labelKey: 'fx.intensity.light'  },
		{ value: 0.5, labelKey: 'fx.intensity.medium' },
		{ value: 1,   labelKey: 'fx.intensity.heavy'  },
	]},
	{ fxKey: 'pixelArt',  iconName: 'fx-pixel',     labelKey: 'fx.atmosphere.pixelArt.label',   level: 'pixel' },
];

// Local helper: master FX button — larger size + outline to distinguish from FX row icons
function FXMasterBtn({ dark, active, onClick }: { dark: boolean; active: boolean; onClick: () => void }) {
	const { t } = useTranslation();
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
			title={t('fx.panel.toggleAll')}
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
	const { t } = useTranslation();
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
							{t('fx.panel.header')}
						</span>
						{!fxMasterEnabled && (
							<> · <span style={{
								fontFamily: TYPE.numericValue.family,
								fontSize: TYPE.numericValue.size,
								fontWeight: 600,
								color: dk(dark, T.danger, T.dangerDark),
								marginRight: 4,
								flexShrink: 0,
							}}>{t('common.off')}</span></>
						)}
						<div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<FXMasterBtn dark={dark} active={fxMasterEnabled && Object.values(px).some(v => v)} onClick={() => dispatch({ type: 'TOGGLE_FX_MASTER' })} />
							<DiActionButton name="chevron-right" onClick={() => toggle(false)} dark={dark} tooltip={t('fx.panel.collapse')} />
						</div>
					</div>
					<PanelHSep />
					<div className="di-panel-scroll" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 141px)' }}>
					{/* Texture */}
					<GroupLabel label={t('fx.group.texture')} />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{TEXTURE_FX.map(({ fxKey, iconName, labelKey, level, valueKey, discreteOptions, compositeOptions, browserUnsupported }) => (
							<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} labelKey={labelKey}
								isActive={px[fxKey]} dark={dark}
								onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })}
								level={level} valueKey={valueKey}
								discreteOptions={discreteOptions} compositeOptions={compositeOptions} browserUnsupported={browserUnsupported} />
						))}
					</div>
					<PanelHSep />
					{/* Lens */}
					<GroupLabel label={t('fx.group.lens')} />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{LENS_FX.map(({ fxKey, iconName, labelKey, level, valueKey, discreteOptions, compositeOptions, browserUnsupported }) => (
							<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} labelKey={labelKey}
								isActive={px[fxKey]} dark={dark}
								onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })}
								level={level} valueKey={valueKey}
								discreteOptions={discreteOptions} compositeOptions={compositeOptions} browserUnsupported={browserUnsupported} />
						))}
					</div>
					<PanelHSep />
					{/* Atmosphere */}
					<GroupLabel label={t('fx.group.atmosphere')} />
					<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
						{ATMOSPHERE_FX.map(({ fxKey, iconName, labelKey, level, valueKey, discreteOptions, compositeOptions, browserUnsupported }) => (
							<FXRow key={fxKey} fxKey={fxKey} iconName={iconName} labelKey={labelKey}
								isActive={px[fxKey]} dark={dark}
								onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: fxKey })}
								level={level} valueKey={valueKey}
								discreteOptions={discreteOptions} compositeOptions={compositeOptions} browserUnsupported={browserUnsupported} />
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
				<DiActionButton name="chevron-left" onClick={() => toggle(true)} dark={dark} tooltip={t('fx.panel.expand')} />
				<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: 40, opacity: hasSnapshot ? 0.5 : 1 }}>
				<PillHSep />
				<DiActionButton name="fx-grain"     onClick={fxClick('grain')} dark={dark} active={snap ? snap.grain : px.grain}  tooltip={t('fx.texture.grain.tooltip')} />
				<DiActionButton name="fx-grunge"    onClick={fxClick('grunge')} dark={dark} active={snap ? snap.grunge : px.grunge} tooltip={t('fx.texture.grunge.tooltip')} />
				<DiActionButton name="fx-riso"      onClick={fxClick('riso')} dark={dark} active={snap ? snap.riso : px.riso}   tooltip={t('fx.texture.riso.tooltip')} />
				<PillHSep />
				<DiActionButton name="fx-vignette"   onClick={fxClick('vignette')} dark={dark} active={snap ? snap.vignette : px.vignette}            tooltip={t('fx.lens.vignette.tooltip')} />
				<DiActionButton name="fx-chroma"     onClick={fxClick('chromaticAberration')} dark={dark} active={snap ? snap.chromaticAberration : px.chromaticAberration} tooltip={t('fx.lens.chromaticAb.tooltip')} />
				<DiActionButton name="fx-distortion" onClick={fxClick('distortion')} dark={dark} active={snap ? snap.distortion : px.distortion}          tooltip={t('fx.lens.distortion.tooltip')} />
				<div style={{ position: 'relative' }}>
					<DiActionButton name="fx-glow"       onClick={() => { if (!hasSnapshot && !px.glow && !supportsCanvasFilter()) { toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } fxClick('glow')(); }} dark={dark} active={snap ? snap.glow : px.glow}                tooltip={t('fx.lens.glow.tooltip')} />
					{!supportsCanvasFilter() && <button onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} aria-label={t('fx.common.browserUnsupported')} style={{ position: 'absolute', top: 3, right: 3, pointerEvents: 'auto', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}><Ico name="info" size={8} color={dk(dark, T.warning, T.warningDark) as string} /></button>}
				</div>
				<div style={{ position: 'relative' }}>
					<DiActionButton name="fx-dof"        onClick={() => { if (!hasSnapshot && !px.dof && !supportsCanvasFilter()) { toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } fxClick('dof')(); }} dark={dark} active={snap ? snap.dof : px.dof}                 tooltip={t('fx.lens.dof.tooltip')} />
					{!supportsCanvasFilter() && <button onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} aria-label={t('fx.common.browserUnsupported')} style={{ position: 'absolute', top: 3, right: 3, pointerEvents: 'auto', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}><Ico name="info" size={8} color={dk(dark, T.warning, T.warningDark) as string} /></button>}
				</div>
				<PillHSep />
				<DiActionButton name="fx-fog"       onClick={fxClick('fog')} dark={dark} active={snap ? snap.fog : px.fog}       tooltip={t('fx.atmosphere.fog.tooltip')} />
				<DiActionButton name="fx-particles" onClick={fxClick('particles')} dark={dark} active={snap ? snap.particles : px.particles} tooltip={t('fx.atmosphere.particles.tooltip')} />
				<DiActionButton name="fx-wiggle"    onClick={fxClick('wiggle')} dark={dark} active={snap ? snap.wiggle : px.wiggle}    tooltip={t('fx.atmosphere.wiggle.tooltip')} />
				<DiActionButton name="fx-pixel"     onClick={fxClick('pixelArt')} dark={dark} active={snap ? snap.pixelArt : px.pixelArt}  tooltip={t('fx.atmosphere.pixelArt.tooltip')} />
				</div>
			</DiPill>
		</div>
	);
}
