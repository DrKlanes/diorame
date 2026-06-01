import React, { useState, useRef } from 'react';
import { DiPill, DiVSep, Ico } from '../../../design-system';
import { T, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { DiActionButton, DiSegmentControl } from '../../../design-system';
import { InfoButton } from './InfoButton';
import { DiSelectorPopover, DiSelectorOption } from '../popovers';
import { setNextPNGQuality } from '../canvas/exportHandlers';
import { useTranslation } from '../../../i18n';

// Loop count options for animation video export, shown as ×1 / ×2 / ×3.
const LOOP_OPTIONS: { value: number; label: string }[] = [
	{ value: 1, label: '×1' },
	{ value: 2, label: '×2' },
	{ value: 3, label: '×3' },
];

// GIF export resolution presets.
const GIF_SCALE_OPTIONS: { value: number; label: string }[] = [
	{ value: 1,    label: '100%' },
	{ value: 0.5,  label: '50%'  },
	{ value: 0.25, label: '25%'  },
];

interface SnapshotRecordPillProps { dark: boolean; }

export function SnapshotRecordPill({ dark }: SnapshotRecordPillProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const recording = state.isExporting && state.exportRequest === 'mp4';
	const [snapshotMenuOpen, setSnapshotMenuOpen] = useState(false);
	const snapshotBtnRef = useRef<HTMLDivElement>(null);

	const handleSnapshot    = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
	const handleRecord      = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' });
	const handlePNGSequence = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'png-sequence' });
	const handleGIF         = () => dispatch({ type: 'REQUEST_EXPORT', payload: 'gif' });

	return (
		<>
			<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
				<InfoButton dark={dark} />
				<DiVSep dark={dark} />
				<div ref={snapshotBtnRef}>
					<DiActionButton name="snapshot" onClick={() => setSnapshotMenuOpen(v => !v)} dark={dark} tooltip={t('topbar.snapshot.png')} />
				</div>
				{/* Animation-mode controls: loops selector + PNG sequence export */}
				{state.isAnimationMode && (
					<>
						<DiVSep dark={dark} />
						<div title={t('topbar.record.loops')}>
							<DiSegmentControl<number>
								options={LOOP_OPTIONS}
								value={state.animationExportLoops}
								onChange={(v) => dispatch({ type: 'SET_ANIMATION_EXPORT_LOOPS', payload: v })}
								dark={dark}
								small={true}
							/>
						</div>
						<DiActionButton
							name="film"
							onClick={handlePNGSequence}
							dark={dark}
							iconSize={16}
							tooltip={t('topbar.record.pngSequence')}
							disabled={state.isExporting}
						/>
						<DiVSep dark={dark} />
						<div title={t('topbar.record.gifScale')}>
							<DiSegmentControl<number>
								options={GIF_SCALE_OPTIONS}
								value={state.gifExportScale}
								onChange={(v) => dispatch({ type: 'SET_GIF_EXPORT_SCALE', payload: v })}
								dark={dark}
								small={true}
							/>
						</div>
						<DiActionButton
							name="bounce"
							onClick={handleGIF}
							dark={dark}
							iconSize={16}
							tooltip={t('topbar.record.gif')}
							disabled={state.isExporting}
						/>
					</>
				)}
				<RecordBtn recording={recording} onClick={handleRecord} dark={dark} />
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
