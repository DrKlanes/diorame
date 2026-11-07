import React, { useRef, useState } from 'react';
import { DiPill, DiActionButton } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { useExportFlow } from '../../../hooks/useExportFlow';
import { useSuperRisoExport } from '../../../hooks/useSuperRisoExport';
import { DiSelectorPopover, DiSelectorOption } from '../popovers';
import { ComplexSceneModalV2 } from '../modals/ComplexSceneModalV2';
import { setNextPNGQuality, setNextPNGBackground, setNextPNGFormatSize, setNextPNGDrawingLongSide, setNextPNGLayersZip } from '../canvas/exportHandlers';
import type { ExportBackground } from '../../../types/strataTypes';
import { useTranslation } from '../../../i18n';
// v3.25.12: the popover pieces and the DRAW «Captura» block live in their own files (no behaviour change).
import { ExportGroupHeader, ExportGroupRow, ExportSeparator } from './exportMenuParts';
import { DrawCaptureSection, readPngBackground, savePngBackground, type DrawFraming, type DrawOutput } from './DrawCaptureSection';

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

	const handleSuperRiso = useSuperRisoExport();

	const [open, setOpen] = useState(false);
	const [sub, setSub] = useState<'capture' | 'video' | 'gif' | null>(null);
	const exportBtnRef = useRef<HTMLDivElement>(null);
	const [pngBackground, setPngBackground] = useState<ExportBackground>(readPngBackground);
	// «Encuadre» (v3.25.7): Formato by default whenever the menu opens with a frame on the canvas.
	const [framing, setFraming] = useState<DrawFraming>('format');

	const isCinematic = state.mode === 'cinematic';
	const isAnim = state.isAnimationMode;

	const close = () => { setOpen(false); setSub(null); };
	const toggleSub = (key: 'capture' | 'video' | 'gif') =>
		setSub(s => s === key ? null : key);

	// «Salida» (v3.25.11, DRAW): one PNG, or «Capas (ZIP)» = one transparent PNG per layer, same framing and size.
	const [output, setOutput] = useState<DrawOutput>('png');
	const layers = !isCinematic && output === 'layers';
	const drawBackground = (): ExportBackground => (layers ? 'transparent' : pngBackground);

	const handleBackground = (bg: ExportBackground) => {
		setPngBackground(bg);
		savePngBackground(bg);
	};

	// Snapshot: dispatch quality (+ DRAW background) then REQUEST_EXPORT png
	const handleCapture = (quality: 'device' | 'hq') => {
		setNextPNGQuality(quality);
		setNextPNGFormatSize(null);
		setNextPNGDrawingLongSide(null);
		setNextPNGLayersZip(layers);
		if (!isCinematic) setNextPNGBackground(drawBackground());
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
						onClick={() => { setOpen(v => !v); setSub(null); setFraming('format'); }}
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

						<ExportSeparator dark={dark} />
						<ExportGroupHeader label={t('topbar.export.group.image')} dark={dark} />

						<ExportGroupRow
							title={t('topbar.export.capture')}
							dark={dark}
							expanded={sub === 'capture'}
							onToggle={() => toggleSub('capture')}
						/>
						{sub === 'capture' && (
							<>
								<DrawCaptureSection
									dark={dark}
									open={open}
									output={output}
									onOutput={setOutput}
									background={pngBackground}
									onBackground={handleBackground}
									framing={framing}
									onFraming={setFraming}
									onViewCapture={handleCapture}
									close={close}
								/>
							</>
						)}

						<ExportSeparator dark={dark} />
						<DiSelectorOption
							title={t('topbar.export.superRiso')}
							description={t('topbar.export.superRisoDesc')}
							onSelect={handleSuperRiso}
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
