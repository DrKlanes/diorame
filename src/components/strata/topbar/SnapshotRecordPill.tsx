import React, { useState, useRef } from 'react';
import { DiPill, DiVSep, Ico } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';
import { InfoButton } from './InfoButton';
import { DiSelectorPopover, DiSelectorOption } from '../popovers';
import { setNextPNGQuality } from '../canvas/exportHandlers';
import { useTranslation } from '../../../i18n';

interface SnapshotRecordPillProps { dark: boolean; }

export function SnapshotRecordPill({ dark }: SnapshotRecordPillProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const recording = state.isExporting && state.exportRequest === 'mp4';
	const [snapshotMenuOpen, setSnapshotMenuOpen] = useState(false);
	const [videoMenuOpen, setVideoMenuOpen]       = useState(false);
	const [gifMenuOpen, setGifMenuOpen]           = useState(false);
	const snapshotBtnRef = useRef<HTMLDivElement>(null);
	const videoBtnRef    = useRef<HTMLDivElement>(null);
	const gifBtnRef      = useRef<HTMLDivElement>(null);

	const handleSnapshot    = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
	const handlePNGSequence = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'png-sequence' });

	const textBtn = (open: boolean, isDisabled: boolean) => ({
		height: 30,
		padding: '0 10px',
		borderRadius: RADIUS.iconBtn,
		border: 'none',
		background: open ? dk(dark, T.purple10, T.purple20) as string : 'transparent',
		cursor: isDisabled ? 'not-allowed' as const : 'pointer' as const,
		fontFamily: TYPE.controlLabel.family,
		fontSize: TYPE.controlLabel.size,
		fontWeight: open ? 600 : 400,
		color: dk(dark, T.dark, T.textDark) as string,
		whiteSpace: 'nowrap' as const,
		flexShrink: 0 as const,
		opacity: isDisabled ? 0.3 : 1,
		pointerEvents: isDisabled ? 'none' as const : undefined,
	});

	return (
		<>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<InfoButton dark={dark} />
				<DiVSep dark={dark} />
				<div ref={snapshotBtnRef}>
					<DiActionButton name="snapshot" onClick={() => setSnapshotMenuOpen(v => !v)} dark={dark} tooltip={t('topbar.snapshot.png')} />
				</div>
				{state.isAnimationMode && (
					<>
						<DiVSep dark={dark} />
						<div ref={videoBtnRef}>
							<button
								disabled={state.isExporting}
								onClick={() => setVideoMenuOpen(v => !v)}
								style={textBtn(videoMenuOpen, state.isExporting)}
							>
								{t('topbar.record.video')}
							</button>
						</div>
						<div ref={gifBtnRef}>
							<button
								disabled={state.isExporting}
								onClick={() => setGifMenuOpen(v => !v)}
								style={textBtn(gifMenuOpen, state.isExporting)}
							>
								GIF
							</button>
						</div>
						<button
							disabled={state.isExporting}
							onClick={handlePNGSequence}
							style={textBtn(false, state.isExporting)}
						>
							{t('topbar.record.pngSeq')}
						</button>
						{recording && (
							<>
								<DiVSep dark={dark} />
								<RecordBtn recording={true} onClick={() => dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' })} dark={dark} />
							</>
						)}
					</>
				)}
				{!state.isAnimationMode && (
					<RecordBtn recording={recording} onClick={() => dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' })} dark={dark} />
				)}
			</DiPill>
			<DiSelectorPopover
				anchorRef={snapshotBtnRef}
				open={snapshotMenuOpen}
				onClose={() => setSnapshotMenuOpen(false)}
				dark={dark}
				placement="auto"
				align="start"
			>
				<DiSelectorOption
					title={t('topbar.snapshot.deviceSize')}
					onSelect={() => { setNextPNGQuality('device'); handleSnapshot(); setSnapshotMenuOpen(false); }}
				/>
				<DiSelectorOption
					title={t('topbar.snapshot.highQuality')}
					onSelect={() => { setNextPNGQuality('hq'); handleSnapshot(); setSnapshotMenuOpen(false); }}
				/>
			</DiSelectorPopover>
			<DiSelectorPopover
				anchorRef={videoBtnRef}
				open={videoMenuOpen}
				onClose={() => setVideoMenuOpen(false)}
				dark={dark}
				placement="auto"
				align="start"
			>
				<DiSelectorOption title="×1" description={t('topbar.record.videoLoop1Desc')}
					onSelect={() => { dispatch({ type: 'SET_ANIMATION_EXPORT_LOOPS', payload: 1 }); dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' }); }} />
				<DiSelectorOption title="×2" description={t('topbar.record.videoLoop2Desc')}
					onSelect={() => { dispatch({ type: 'SET_ANIMATION_EXPORT_LOOPS', payload: 2 }); dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' }); }} />
				<DiSelectorOption title="×3" description={t('topbar.record.videoLoop3Desc')}
					onSelect={() => { dispatch({ type: 'SET_ANIMATION_EXPORT_LOOPS', payload: 3 }); dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' }); }} />
			</DiSelectorPopover>
			<DiSelectorPopover
				anchorRef={gifBtnRef}
				open={gifMenuOpen}
				onClose={() => setGifMenuOpen(false)}
				dark={dark}
				placement="auto"
				align="start"
			>
				<DiSelectorOption title="100%" description={t('topbar.record.gifFullDesc')}
					onSelect={() => { dispatch({ type: 'SET_GIF_EXPORT_SCALE', payload: 1 }); dispatch({ type: 'REQUEST_EXPORT', payload: 'gif' }); }} />
				<DiSelectorOption title="50%" description={t('topbar.record.gifHalfDesc')}
					onSelect={() => { dispatch({ type: 'SET_GIF_EXPORT_SCALE', payload: 0.5 }); dispatch({ type: 'REQUEST_EXPORT', payload: 'gif' }); }} />
				<DiSelectorOption title="25%" description={t('topbar.record.gifQuarterDesc')}
					onSelect={() => { dispatch({ type: 'SET_GIF_EXPORT_SCALE', payload: 0.25 }); dispatch({ type: 'REQUEST_EXPORT', payload: 'gif' }); }} />
			</DiSelectorPopover>
		</>
	);
}

function RecordBtn({ recording, onClick, dark }: {
	recording: boolean;
	onClick: () => void;
	dark: boolean;
}) {
	const { t } = useTranslation();
	const [hov, setHov] = useState(false);
	return (
		<button
			onClick={onClick}
			onPointerEnter={() => setHov(true)}
			onPointerLeave={() => setHov(false)}
			title={t(recording ? 'topbar.record.stop' : 'topbar.record.start')}
			style={{
				height: 30,
				minWidth: 30,
				padding: recording ? '0 8px 0 6px' : '0',
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: recording
					? 'rgba(220, 38, 38, 0.12)'
					: hov
						? dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.07)')
						: 'transparent',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				gap: 4,
				flexShrink: 0,
				transition: 'background 0.1s',
			}}
		>
			<Ico
				name="record"
				size={18}
				color={recording ? '#dc2626' : (dk(dark, T.dark, T.textDark) as string)}
			/>
			{recording && (
				<span style={{
					fontFamily: "'Sora', sans-serif",
					fontSize: 9,
					fontWeight: 700,
					color: '#dc2626',
					letterSpacing: '0.05em',
				}}>{t('topbar.record.badge')}</span>
			)}
		</button>
	);
}
