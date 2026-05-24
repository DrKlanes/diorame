import React, { ReactNode } from 'react';
import { useStrata, PostProcessingSettings, PostProcessingEnabled } from '../StrataContext';
import { Ico, DiMiniSlider, DiSegmentControl } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { DiActionButton } from '../../../design-system';
import { useTranslation } from '../../../i18n';
import { supportsCanvasFilter } from '../../../utils/browserCapabilities';
import { toast } from 'sonner@2.0.3';

// ── Pixel Art depth mapping ──────────────────────────────────────────
// Values are i18n keys, resolved via t() at render time.
// If a depth value falls outside this map, fallback to literal '?' (defensive).
const DEPTH_LABEL_MAP: Record<number, string> = {
	2:  'fx.depth.1bit',
	4:  'fx.depth.cga',
	6:  'fx.depth.8color',
	8:  'fx.depth.retro',
	10: 'fx.depth.hiColor',
	12: 'fx.depth.pocket',
	14: 'fx.depth.stylized',
	16: 'fx.depth.original',
};

// ── Types ────────────────────────────────────────────────────────────
type DiscreteOption = { value: number; labelKey: string };
type CompositeOption = { value: 'circle' | 'square' | 'stroke'; labelKey: string };

// ── Helpers ─────────────────────────────────────────────────────────
const stopProp = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

const findClosestOption = (value: number, options: DiscreteOption[]): DiscreteOption =>
	options.reduce((closest, opt) =>
		Math.abs(opt.value - value) < Math.abs(closest.value - value) ? opt : closest
	);

const formatBipolar = (v: number) => {
	const snapped = Math.abs(v) < 0.005 ? 0 : v;
	if (snapped === 0) return '0.00';
	return snapped > 0 ? `+${snapped.toFixed(2)}` : snapped.toFixed(2);
};

const formatZPlane = (v: number): string => {
	const rounded = Math.round(v);
	if (Math.abs(rounded) < 25) return '0 px';
	const sign = rounded > 0 ? '+' : '-';
	return `${sign}${Math.abs(rounded)} px`;
};

// ── Sub-control block ────────────────────────────────────────────────
type SubControlBlockProps = {
	label: string;
	value: string;
	dark: boolean;
	children: ReactNode;
	accentColor: string;
};

function SubControlBlock({ label, value, dark, children, accentColor }: SubControlBlockProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
				<span style={{
					fontFamily: TYPE.numericValue.family,
					fontWeight: TYPE.numericValue.weight,
					fontSize: TYPE.numericValue.size,
					color: dk(dark, T.muted, T.textDarkMuted),
					letterSpacing: '0.05em',
				}}>
					{label}
				</span>
				<span style={{
					fontFamily: TYPE.numericValue.family,
					fontWeight: TYPE.numericValue.weight,
					fontSize: TYPE.numericValue.size,
					color: accentColor,
				}}>
					{value}
				</span>
			</div>
			{children}
		</div>
	);
}

// ── Props ────────────────────────────────────────────────────────────
interface FXRowProps {
	fxKey: keyof PostProcessingEnabled;
	iconName: string;
	labelKey: string;
	isActive: boolean;
	dark: boolean;
	onToggle: () => void;
	level?: 1 | 'special' | 'bipolar' | 'discrete' | 'composite' | 'pixel' | 'dof';
	valueKey?: keyof PostProcessingSettings;
	discreteOptions?: DiscreteOption[];
	compositeOptions?: CompositeOption[];
	browserUnsupported?: boolean;
}

export function FXRow({ fxKey, iconName, labelKey, isActive, dark, onToggle, level = 'special', valueKey, discreteOptions, compositeOptions, browserUnsupported = false }: FXRowProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const sliderValue = (level === 1 && valueKey) ? (state.postProcessing[valueKey] as number) : 0;

	// Master-OFF snapshot: preserve config UI but muted + click-to-wake.
	const snapshot = state.postProcessingSnapshot;
	const hasSnapshot = snapshot !== null;
	const wasInSnapshot = hasSnapshot && snapshot[fxKey] === true;
	const showExpanded = isActive || wasInSnapshot;
	const isMuted = hasSnapshot;  // whole panel dims when master OFF
	const accentColor = isMuted ? (dk(dark, T.muted, T.textDarkMuted) as string) : T.purple;
	const handleClick = hasSnapshot ? () => dispatch({ type: 'TOGGLE_FX_MASTER' }) : onToggle;
	const handleButtonClick = () => {
		if (browserUnsupported && !supportsCanvasFilter() && !hasSnapshot && !isActive) {
			toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 });
		}
		handleClick();
	};

	const tint = isActive ? T.purple : dk(dark, T.dark, T.textDark) as string;
	const flatTint = isMuted ? (dk(dark, T.muted, T.textDarkMuted) as string) : tint;
	const label = t(labelKey);

	const expandedBtnStyle = {
		display: 'flex',
		width: '100%',
		padding: '8px 10px',
		borderRadius: RADIUS.iconBtn,
		background: isMuted ? 'transparent' : dk(dark, T.purple10, T.purple20),
		border: 'none',
		cursor: 'pointer',
		textAlign: 'left' as const,
		boxSizing: 'border-box' as const,
		opacity: isMuted ? 0.5 : 1,
	};
	const headerRowStyle = { display: 'flex', alignItems: 'center', gap: 10 };
	const colStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, gap: 6, width: '100%', pointerEvents: isMuted ? 'none' : undefined };

	// --- Level 1: header + slider (0–1) ---
	if (showExpanded && level === 1 && valueKey) {
		return (
			<button onClick={handleButtonClick} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={accentColor} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: accentColor }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: accentColor }}>
							{Math.round(sliderValue * 100)}
						</span>
						{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
					</div>
					<div onPointerDown={stopProp} onClick={stopProp}>
						<DiMiniSlider dark={dark} value={sliderValue} min={0} max={1} step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })} />
					</div>
				</div>
			</button>
		);
	}

	// --- Bipolar: header + bipolar slider (-1–1) + center tick ---
	if (showExpanded && level === 'bipolar' && valueKey) {
		const bv = state.postProcessing[valueKey] as number;
		return (
			<button onClick={handleButtonClick} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={accentColor} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: accentColor }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: accentColor }}>
							{formatBipolar(bv)}
						</span>
						{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
					</div>
					<div onPointerDown={stopProp} onClick={stopProp} style={{ position: 'relative' }}>
						<DiMiniSlider dark={dark} value={bv} min={-1} max={1} step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })} />
						<div style={{ position: 'absolute', left: 'calc(50% - 0.5px)', top: 5, height: 4, width: 1, backgroundColor: accentColor, opacity: 0.4, pointerEvents: 'none' }} />
					</div>
				</div>
			</button>
		);
	}

	// --- Discrete: header + SegmentControl (no slider) ---
	// Numeric value identifiers; labels resolved via t() at render time.
	if (showExpanded && level === 'discrete' && valueKey && discreteOptions) {
		const dv = state.postProcessing[valueKey] as number;
		const currentValue = findClosestOption(dv, discreteOptions).value;
		return (
			<button onClick={handleButtonClick} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={accentColor} />
						<span style={{ fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: accentColor }}>
							{label}
						</span>
						{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
					</div>
					<div onPointerDown={stopProp} onClick={stopProp} style={{ borderRadius: RADIUS.segmentSmall + 2, overflow: 'hidden', background: dk(dark, T.white, T.panelDarkOpaque) }}>
						<DiSegmentControl<number>
							dark={dark}
							options={discreteOptions.map(o => ({ value: o.value, label: t(o.labelKey) }))}
							value={currentValue}
							onChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })}
							small
						/>
					</div>
				</div>
			</button>
		);
	}

	// --- Composite: header + slider (0–1) + SegmentControl for type ---
	// Internal identifier ('circle' | 'square' | 'stroke') used directly as segment value.
	if (showExpanded && level === 'composite' && valueKey && compositeOptions) {
		const cv = state.postProcessing[valueKey] as number;
		const pType = state.postProcessing.particleType;
		return (
			<button onClick={handleButtonClick} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={accentColor} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: accentColor }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: accentColor }}>
							{Math.round(cv * 100)}
						</span>
						{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
					</div>
					<div onPointerDown={stopProp} onClick={stopProp}>
						<DiMiniSlider dark={dark} value={cv} min={0} max={1} step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })} />
					</div>
					<div onPointerDown={stopProp} onClick={stopProp} style={{ borderRadius: RADIUS.segmentSmall + 2, overflow: 'hidden', background: dk(dark, T.white, T.panelDarkOpaque) }}>
						<DiSegmentControl<'circle' | 'square' | 'stroke'>
							dark={dark}
							options={compositeOptions.map(o => ({ value: o.value, label: t(o.labelKey) }))}
							value={pType}
							onChange={(v) => dispatch({ type: 'SET_PARTICLE_TYPE', payload: v })}
							small
						/>
					</div>
				</div>
			</button>
		);
	}

	// --- Pixel: header + Size / Depth / Dither sub-controls ---
	if (showExpanded && level === 'pixel') {
		const sz = state.postProcessing.pixelArtSize;
		const dp = state.postProcessing.pixelArtDepth;
		const di = state.postProcessing.pixelArtDither;
		const depthKey = DEPTH_LABEL_MAP[dp];
		const depthLabel = depthKey ? t(depthKey) : '?';
		const ditherDisplay = di < 0.05 ? t('fx.dither.clean') : `${Math.round(di * 100)}%`;
		return (
			<button onClick={handleButtonClick} style={expandedBtnStyle}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', pointerEvents: isMuted ? 'none' : undefined }}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={accentColor} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: accentColor }}>
							{label}
						</span>
						{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
					</div>
					<SubControlBlock accentColor={accentColor} label={t('fx.subcontrol.size')} value={`${sz}px`} dark={dark}>
						<div onPointerDown={stopProp} onClick={stopProp}>
							<DiMiniSlider dark={dark} value={sz} min={2} max={12} step={1}
								onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtSize', value: v } })} />
						</div>
					</SubControlBlock>
					<SubControlBlock accentColor={accentColor} label={t('fx.subcontrol.depth')} value="" dark={dark}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}
							onPointerDown={stopProp} onClick={stopProp}>
							<DiActionButton name="chevron-left" dark={dark}
								onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDepth', value: Math.max(2, dp - 2) } })} />
							<span style={{ flex: 1, textAlign: 'center', fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: accentColor }}>
								{depthLabel}
							</span>
							<DiActionButton name="chevron-right" dark={dark}
								onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDepth', value: Math.min(16, dp + 2) } })} />
						</div>
					</SubControlBlock>
					<SubControlBlock accentColor={accentColor} label={t('fx.subcontrol.dither')} value={ditherDisplay} dark={dark}>
						<div onPointerDown={stopProp} onClick={stopProp}>
							<DiMiniSlider dark={dark} value={di} min={0} max={1} step={0.1}
								onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDither', value: v } })} />
						</div>
					</SubControlBlock>
				</div>
			</button>
		);
	}

	// --- DoF: header + intensity + Free/Lock + conditional Z-Plane or Layer ---
	if (showExpanded && level === 'dof') {
		const dofIntensity = state.postProcessing.dof;
		const focusDist = state.postProcessing.focusDist;
		const focusTargetLayer = state.postProcessing.focusTargetLayer;
		const isFree = focusTargetLayer === -1;
		return (
			<button onClick={handleButtonClick} style={expandedBtnStyle}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', pointerEvents: isMuted ? 'none' : undefined }}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={accentColor} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: accentColor }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: accentColor }}>
							{Math.round(dofIntensity * 100)}
						</span>
						{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
					</div>
					<div onPointerDown={stopProp} onClick={stopProp}>
						<DiMiniSlider dark={dark} value={dofIntensity} min={0} max={1} step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'dof', value: v } })} />
					</div>
					<div style={{ height: 1, width: '100%', backgroundColor: dk(dark, T.border, T.borderDark), margin: '4px 0' }} />
					<div onPointerDown={stopProp} onClick={stopProp} style={{ borderRadius: RADIUS.segmentSmall + 2, overflow: 'hidden', background: dk(dark, T.white, T.panelDarkOpaque) }}>
						<DiSegmentControl<'free' | 'lock'>
							dark={dark}
							small
							options={[
								{ value: 'free', label: t('fx.dof.free') },
								{ value: 'lock', label: t('fx.dof.lock') },
							]}
							value={isFree ? 'free' : 'lock'}
							onChange={(v) => {
								const newValue = v === 'free' ? -1 : state.currentLayerIndex;
								dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: newValue } });
							}}
						/>
					</div>
					{isFree ? (
						<SubControlBlock accentColor={accentColor} label={t('fx.subcontrol.zPlane')} value={formatZPlane(focusDist)} dark={dark}>
							<div onPointerDown={stopProp} onClick={stopProp} style={{ position: 'relative' }}>
								<DiMiniSlider dark={dark} value={focusDist} min={-5000} max={5000} step={50}
									onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusDist', value: v } })} />
								<div style={{ position: 'absolute', left: 'calc(50% - 0.5px)', top: 5, height: 4, width: 1, backgroundColor: accentColor, opacity: 0.4, pointerEvents: 'none' }} />
							</div>
						</SubControlBlock>
					) : (
						<SubControlBlock accentColor={accentColor} label={t('fx.subcontrol.layer')} value="" dark={dark}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}
								onPointerDown={stopProp} onClick={stopProp}>
								<DiActionButton name="chevron-left" dark={dark}
									onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: Math.max(0, focusTargetLayer - 1) } })} />
								<span style={{ flex: 1, textAlign: 'center', fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: accentColor }}>
									{t('fx.dof.layerDynamic', { n: focusTargetLayer + 1 })}
								</span>
								<DiActionButton name="chevron-right" dark={dark}
									onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: Math.min(state.totalLayers - 1, focusTargetLayer + 1) } })} />
							</div>
						</SubControlBlock>
					)}
				</div>
			</button>
		);
	}

	// --- Flat row: inactive or special (placeholder) ---
	return (
		<button
			onClick={handleButtonClick}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				width: '100%',
				padding: '8px 10px',
				borderRadius: RADIUS.iconBtn,
				background: isActive ? dk(dark, T.purple10, T.purple20) : 'transparent',
				border: 'none',
				cursor: 'pointer',
				textAlign: 'left',
				boxSizing: 'border-box',
				opacity: isMuted ? 0.5 : 1,
			}}
		>
			<Ico name={iconName} size={16} color={flatTint} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: flatTint,
				flexShrink: 0,
			}}>
				{label}
			</span>
			{browserUnsupported && !supportsCanvasFilter() && <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toast.warning(t('fx.common.browserUnsupported'), { duration: 4000 }); } }} aria-label={t('fx.common.browserUnsupported')} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', pointerEvents: 'auto' }}><Ico name='info' size={12} color={dk(dark, T.warning, T.warningDark) as string} /></span>}
		</button>
	);
}
