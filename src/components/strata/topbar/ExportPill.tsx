import React, { useRef, useState } from 'react';
import { DiPill, DiActionButton } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { useExportFlow } from '../../../hooks/useExportFlow';
import { DiSelectorPopover, DiSelectorOption } from '../popovers';
import { ComplexSceneModalV2 } from '../modals/ComplexSceneModalV2';
import { setNextPNGQuality } from '../canvas/exportHandlers';
import { useTranslation } from '../../../i18n';

// ── Group header — non-interactive section label inside the popover ────────────

function ExportGroupHeader({ label, dark }: { label: string; dark: boolean }) {
	return (
		<div style={{
			padding: '6px 10px 2px',
			fontFamily: TYPE.panelHeader.family,
			fontSize: TYPE.panelHeader.size,
			fontWeight: TYPE.panelHeader.weight,
			letterSpacing: TYPE.panelHeader.letterSpacing,
			textTransform: TYPE.panelHeader.textTransform,
			color: dk(dark, T.muted, T.textDarkMuted) as string,
			userSelect: 'none',
		}}>
			{label}
		</div>
	);
}

// ── Group row — expands/collapses sub-options inline; does NOT close popover ──

interface ExportGroupRowProps {
	title: string;
	dark: boolean;
	expanded: boolean;
	onToggle: () => void;
}

function ExportGroupRow({ title, dark, expanded, onToggle }: ExportGroupRowProps) {
	const [hovered, setHovered] = useState(false);
	const highlighted = hovered;

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onToggle}
			onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				padding: '8px 10px',
				borderRadius: RADIUS.iconBtn,
				cursor: 'pointer',
				background: highlighted || expanded ? dk(dark, T.purple10, T.purple20) : 'transparent',
				transition: 'background 0.1s ease',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				outline: 'none',
				userSelect: 'none',
			}}
		>
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: highlighted || expanded ? T.purple : dk(dark, T.dark, T.textDark),
				transition: 'color 0.1s ease',
			}}>
				{title}
			</span>
			{/* Chevron */}
			<svg
				width={12} height={12}
				viewBox="0 0 12 12"
				fill="none"
				stroke={highlighted || expanded ? T.purple : dk(dark, T.muted, T.textDarkMuted) as string}
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease', flexShrink: 0 }}
			>
				<path d="M4.5 3L7.5 6L4.5 9" />
			</svg>
		</div>
	);
}

// ── Thin visual separator inside the popover ─────────────────────────────────

function ExportSeparator({ dark }: { dark: boolean }) {
	return (
		<div style={{
			height: 1,
			margin: '4px 10px',
			backgroundColor: dk(dark, T.border, T.borderDark) as string,
		}} />
	);
}

// ── Main component ────────────────────────────────────────────────────────────

interface ExportPillProps { dark: boolean; }

export function ExportPill({ dark }: ExportPillProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const {
		handleExportRequest,
		handleProceedWithExport,
		handleCancelExport,
		handleUseCompressedExport,
		showComplexityWarning,
		shapeCount,
	} = useExportFlow();

	const [open, setOpen] = useState(false);
	const [sub, setSub] = useState<'capture' | 'video' | 'gif' | null>(null);
	const exportBtnRef = useRef<HTMLDivElement>(null);

	const isCinematic = state.mode === 'cinematic';
	const isAnim = state.isAnimationMode;

	const close = () => { setOpen(false); setSub(null); };
	const toggleSub = (key: 'capture' | 'video' | 'gif') =>
		setSub(s => s === key ? null : key);

	// Snapshot (CINEMA): dispatch quality then REQUEST_EXPORT png
	const handleCapture = (quality: 'device' | 'hq') => {
		setNextPNGQuality(quality);
		dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
		close();
	};

	// Video (CINEMA, no anim): direct MP4
	const handleVideoDirect = () => {
		dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' });
		close();
	};

	// Video (CINEMA, anim): set loops then MP4
	const handleVideoAnim = (loops: number) => {
		dispatch({ type: 'SET_ANIMATION_EXPORT_LOOPS', payload: loops });
		dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' });
		close();
	};

	// GIF: set scale then gif
	const handleGif = (scale: number) => {
		dispatch({ type: 'SET_GIF_EXPORT_SCALE', payload: scale });
		dispatch({ type: 'REQUEST_EXPORT', payload: 'gif' });
		close();
	};

	// PNG sequence
	const handlePngSeq = () => {
		dispatch({ type: 'REQUEST_EXPORT', payload: 'png-sequence' });
		close();
	};

	// SVG (DRAW) — goes through useExportFlow complexity guard
	// The flow dispatches REQUEST_EXPORT when confirmed; close popover on trigger
	const handleSvg = (format: 'svg' | 'svgz') => {
		handleExportRequest(format);
		close();
	};

	// z-index note: DiSelectorPopover uses Z_INDEX.popover = 950, well above
	// LayersPanel / ColorPalette / FXPanel which use zIndex: 50. Safe. ✓

	return (
		<>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<div ref={exportBtnRef}>
					<DiActionButton
						name="export"
						onClick={() => { setOpen(v => !v); setSub(null); }}
						dark={dark}
						active={open}
						activeStyle="wash"
						tooltip={t('topbar.export.tooltip')}
						shortcut="Ctrl+E"
					/>
				</div>
			</DiPill>

			{/* Main popover — placement auto (resolves below for top-right anchor) */}
			<DiSelectorPopover
				anchorRef={exportBtnRef}
				open={open}
				onClose={close}
				dark={dark}
				placement="auto"
				align="end"
			>
				{/* ── DRAW mode ── */}
				{!isCinematic && (
					<>
						<DiSelectorOption
							title={t('topbar.file.svg')}
							onSelect={() => handleSvg('svg')}
						/>
						<DiSelectorOption
							title={t('topbar.file.svgCompressed')}
							onSelect={() => handleSvg('svgz')}
						/>

						{isAnim && (
							<>
								<ExportSeparator dark={dark} />
								<ExportGroupHeader label={t('topbar.export.group.motion')} dark={dark} />

								<ExportGroupRow
									title={t('topbar.record.video')}
									dark={dark}
									expanded={sub === 'video'}
									onToggle={() => toggleSub('video')}
								/>
								{sub === 'video' && (
									<>
										<DiSelectorOption title="×1" description={t('topbar.record.videoLoop1Desc')} onSelect={() => handleVideoAnim(1)} />
										<DiSelectorOption title="×3" description={t('topbar.record.videoLoop2Desc')} onSelect={() => handleVideoAnim(3)} />
										<DiSelectorOption title="×6" description={t('topbar.record.videoLoop3Desc')} onSelect={() => handleVideoAnim(6)} />
									</>
								)}

								<ExportGroupRow
									title="GIF"
									dark={dark}
									expanded={sub === 'gif'}
									onToggle={() => toggleSub('gif')}
								/>
								{sub === 'gif' && (
									<>
										<DiSelectorOption title="100%" description={t('topbar.record.gifFullDesc')}    onSelect={() => handleGif(1)}    />
										<DiSelectorOption title="50%"  description={t('topbar.record.gifHalfDesc')}    onSelect={() => handleGif(0.5)}  />
										<DiSelectorOption title="25%"  description={t('topbar.record.gifQuarterDesc')} onSelect={() => handleGif(0.25)} />
									</>
								)}

								<DiSelectorOption title={t('topbar.export.pngSeq')} onSelect={handlePngSeq} />
							</>
						)}
					</>
				)}

				{/* ── CINEMA mode ── */}
				{isCinematic && (
					<>
						<ExportGroupHeader label={t('topbar.export.group.image')} dark={dark} />

						<ExportGroupRow
							title={t('topbar.export.capture')}
							dark={dark}
							expanded={sub === 'capture'}
							onToggle={() => toggleSub('capture')}
						/>
						{sub === 'capture' && (
							<>
								<DiSelectorOption title={t('topbar.snapshot.deviceSize')} onSelect={() => handleCapture('device')} />
								<DiSelectorOption title={t('topbar.snapshot.highQuality')} onSelect={() => handleCapture('hq')} />
							</>
						)}

						<ExportSeparator dark={dark} />
						<ExportGroupHeader label={t('topbar.export.group.motion')} dark={dark} />

						{!isAnim && (
							<DiSelectorOption title={t('topbar.record.video')} onSelect={handleVideoDirect} />
						)}

						{isAnim && (
							<>
								<ExportGroupRow
									title={t('topbar.record.video')}
									dark={dark}
									expanded={sub === 'video'}
									onToggle={() => toggleSub('video')}
								/>
								{sub === 'video' && (
									<>
										<DiSelectorOption title="×1" description={t('topbar.record.videoLoop1Desc')} onSelect={() => handleVideoAnim(1)} />
										<DiSelectorOption title="×3" description={t('topbar.record.videoLoop2Desc')} onSelect={() => handleVideoAnim(3)} />
										<DiSelectorOption title="×6" description={t('topbar.record.videoLoop3Desc')} onSelect={() => handleVideoAnim(6)} />
									</>
								)}

								<ExportGroupRow
									title="GIF"
									dark={dark}
									expanded={sub === 'gif'}
									onToggle={() => toggleSub('gif')}
								/>
								{sub === 'gif' && (
									<>
										<DiSelectorOption title="100%" description={t('topbar.record.gifFullDesc')}    onSelect={() => handleGif(1)}    />
										<DiSelectorOption title="50%"  description={t('topbar.record.gifHalfDesc')}    onSelect={() => handleGif(0.5)}  />
										<DiSelectorOption title="25%"  description={t('topbar.record.gifQuarterDesc')} onSelect={() => handleGif(0.25)} />
									</>
								)}

								<DiSelectorOption title={t('topbar.export.pngSeq')} onSelect={handlePngSeq} />
							</>
						)}
					</>
				)}
			</DiSelectorPopover>

			{/* Complexity guard modal — only relevant for SVG exports in DRAW mode */}
			<ComplexSceneModalV2
				open={showComplexityWarning}
				onClose={handleCancelExport}
				onContinue={handleProceedWithExport}
				onUseCompressed={handleUseCompressedExport}
				shapeCount={shapeCount}
				dark={state.isDarkMode}
			/>
		</>
	);
}
