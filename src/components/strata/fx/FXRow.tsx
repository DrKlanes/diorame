import React, { ReactNode } from 'react';
import { useStrata, PostProcessingSettings, PostProcessingEnabled } from '../StrataContext';
import { Ico, DiMiniSlider, DiSegmentControl } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { IconBtn } from '../topbar/_shared';

// ── Pixel Art depth mapping ──────────────────────────────────────────
const DEPTH_LABEL_MAP: Record<number, string> = {
	2:  '1-bit',
	4:  'CGA',
	6:  '8-Color',
	8:  'Retro',
	10: 'Hi-Color',
	12: 'Handheld',
	14: 'Stylized',
	16: 'Original',
};

// ── Helpers ─────────────────────────────────────────────────────────
const stopProp = (e: React.MouseEvent | React.PointerEvent) => e.stopPropagation();

const findClosestLabel = (value: number, options: Array<{ label: string; value: number }>) =>
	options.reduce((closest, opt) =>
		Math.abs(opt.value - value) < Math.abs(closest.value - value) ? opt : closest
	).label;

const formatBipolar = (v: number) => {
	const snapped = Math.abs(v) < 0.005 ? 0 : v;
	if (snapped === 0) return '0.00';
	return snapped > 0 ? `+${snapped.toFixed(2)}` : snapped.toFixed(2);
};

const formatDither = (v: number): string => {
	if (v < 0.05) return 'Clean';
	return `${Math.round(v * 100)}%`;
};

// ── Sub-control block ────────────────────────────────────────────────
type SubControlBlockProps = {
	label: string;
	value: string;
	dark: boolean;
	children: ReactNode;
};

function SubControlBlock({ label, value, dark, children }: SubControlBlockProps) {
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
					color: T.purple,
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
	label: string;
	isActive: boolean;
	dark: boolean;
	onToggle: () => void;
	level?: 1 | 'special' | 'bipolar' | 'discrete' | 'composite' | 'pixel';
	valueKey?: keyof PostProcessingSettings;
	discreteOptions?: Array<{ label: string; value: number }>;
	compositeOptions?: string[];
}

export function FXRow({ fxKey, iconName, label, isActive, dark, onToggle, level = 'special', valueKey, discreteOptions, compositeOptions }: FXRowProps) {
	const { state, dispatch } = useStrata();
	const sliderValue = (level === 1 && valueKey) ? (state.postProcessing[valueKey] as number) : 0;
	const tint = isActive ? T.purple : dk(dark, T.dark, T.textDark) as string;

	const expandedBtnStyle = {
		display: 'flex',
		width: '100%',
		padding: '8px 10px',
		borderRadius: RADIUS.iconBtn,
		background: dk(dark, T.purple10, T.purple20),
		border: 'none',
		cursor: 'pointer',
		textAlign: 'left' as const,
		boxSizing: 'border-box' as const,
	};
	const headerRowStyle = { display: 'flex', alignItems: 'center', gap: 10 };
	const colStyle = { display: 'flex', flexDirection: 'column' as const, gap: 6, width: '100%' };

	// --- Level 1: header + slider (0–1) ---
	if (isActive && level === 1 && valueKey) {
		return (
			<button onClick={onToggle} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={T.purple} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: T.purple }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: T.purple }}>
							{Math.round(sliderValue * 100)}
						</span>
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
	if (isActive && level === 'bipolar' && valueKey) {
		const bv = state.postProcessing[valueKey] as number;
		return (
			<button onClick={onToggle} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={T.purple} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: T.purple }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: T.purple }}>
							{formatBipolar(bv)}
						</span>
					</div>
					<div onPointerDown={stopProp} onClick={stopProp} style={{ position: 'relative' }}>
						<DiMiniSlider dark={dark} value={bv} min={-1} max={1} step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })} />
						<div style={{ position: 'absolute', left: 'calc(50% - 0.5px)', top: 5, height: 4, width: 1, backgroundColor: T.purple, opacity: 0.4, pointerEvents: 'none' }} />
					</div>
				</div>
			</button>
		);
	}

	// --- Discrete: header + SegmentControl (no slider) ---
	if (isActive && level === 'discrete' && valueKey && discreteOptions) {
		const dv = state.postProcessing[valueKey] as number;
		const currentLabel = findClosestLabel(dv, discreteOptions);
		return (
			<button onClick={onToggle} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={T.purple} />
						<span style={{ fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: T.purple }}>
							{label}
						</span>
					</div>
					<div onPointerDown={stopProp} onClick={stopProp} style={{ borderRadius: RADIUS.segmentSmall + 2, overflow: 'hidden', background: dk(dark, T.white, T.panelDarkOpaque) }}>
						<DiSegmentControl
							dark={dark}
							options={discreteOptions.map(o => o.label)}
							value={currentLabel}
							onChange={newLabel => {
								const opt = discreteOptions.find(o => o.label === newLabel);
								if (opt) dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: opt.value } });
							}}
							small
						/>
					</div>
				</div>
			</button>
		);
	}

	// --- Composite: header + slider (0–1) + SegmentControl for type ---
	if (isActive && level === 'composite' && valueKey && compositeOptions) {
		const cv = state.postProcessing[valueKey] as number;
		const pType = state.postProcessing.particleType;
		const pTypeLabel = pType.charAt(0).toUpperCase() + pType.slice(1);
		return (
			<button onClick={onToggle} style={expandedBtnStyle}>
				<div style={colStyle}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={T.purple} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: T.purple }}>
							{label}
						</span>
						<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: T.purple }}>
							{Math.round(cv * 100)}
						</span>
					</div>
					<div onPointerDown={stopProp} onClick={stopProp}>
						<DiMiniSlider dark={dark} value={cv} min={0} max={1} step={0.01}
							onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: valueKey, value: v } })} />
					</div>
					<div onPointerDown={stopProp} onClick={stopProp} style={{ borderRadius: RADIUS.segmentSmall + 2, overflow: 'hidden', background: dk(dark, T.white, T.panelDarkOpaque) }}>
						<DiSegmentControl
							dark={dark}
							options={compositeOptions}
							value={pTypeLabel}
							onChange={v => dispatch({ type: 'SET_PARTICLE_TYPE', payload: v.toLowerCase() as 'circle' | 'square' | 'stroke' })}
							small
						/>
					</div>
				</div>
			</button>
		);
	}

	// --- Pixel: header + Size / Depth / Dither sub-controls ---
	if (isActive && level === 'pixel') {
		const sz = state.postProcessing.pixelArtSize;
		const dp = state.postProcessing.pixelArtDepth;
		const di = state.postProcessing.pixelArtDither;
		return (
			<button onClick={onToggle} style={expandedBtnStyle}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
					<div style={headerRowStyle}>
						<Ico name={iconName} size={16} color={T.purple} />
						<span style={{ flex: 1, fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: T.purple }}>
							{label}
						</span>
					</div>
					<SubControlBlock label="Size" value={`${sz}px`} dark={dark}>
						<div onPointerDown={stopProp} onClick={stopProp}>
							<DiMiniSlider dark={dark} value={sz} min={2} max={12} step={1}
								onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtSize', value: v } })} />
						</div>
					</SubControlBlock>
					<SubControlBlock label="Depth" value="" dark={dark}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}
							onPointerDown={stopProp} onClick={stopProp}>
							<IconBtn name="chevron-left" dark={dark}
								onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDepth', value: Math.max(2, dp - 2) } })} />
							<span style={{ flex: 1, textAlign: 'center', fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: TYPE.numericValue.size, color: T.purple }}>
								{DEPTH_LABEL_MAP[dp] ?? '?'}
							</span>
							<IconBtn name="chevron-right" dark={dark}
								onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDepth', value: Math.min(16, dp + 2) } })} />
						</div>
					</SubControlBlock>
					<SubControlBlock label="Dither" value={formatDither(di)} dark={dark}>
						<div onPointerDown={stopProp} onClick={stopProp}>
							<DiMiniSlider dark={dark} value={di} min={0} max={1} step={0.1}
								onChange={v => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDither', value: v } })} />
						</div>
					</SubControlBlock>
				</div>
			</button>
		);
	}

	// --- Flat row: inactive or special (placeholder) ---
	return (
		<button
			onClick={onToggle}
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
			}}
		>
			<Ico name={iconName} size={16} color={tint} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: tint,
				flexShrink: 0,
			}}>
				{label}
			</span>
		</button>
	);
}
