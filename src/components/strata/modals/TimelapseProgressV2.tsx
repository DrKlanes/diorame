import React, { useSyncExternalStore } from 'react';
import { DiModal } from './index';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { Ico } from '../../../design-system';
import { useTranslation } from '../../../i18n';
import { timelapseProgress } from '../canvas/timelapseProgress';

// ── TimelapseProgressV2 (v3.25.19) ────────────────────────────────────────────
// Real progress of «Timelapse (vídeo)»: work done (%), frames done / total, time left, and Cancel (a visible button: on a tablet
// there is no Esc). The backdrop does not close it and Esc does nothing: an accidental tap must not throw away a
// minute of encoding.

interface TimelapseProgressV2Props {
	open: boolean;
	dark: boolean;
}

export function TimelapseProgressV2({ open, dark }: TimelapseProgressV2Props) {
	const { t } = useTranslation();
	const progress = useSyncExternalStore(timelapseProgress.subscribe, timelapseProgress.get);
	const done = progress?.done ?? 0;
	const total = progress?.total ?? 0;
	// v3.25.20: bar and time left from the engine's work model (shapes rendered), not from the frame count.
	const pct = Math.floor((progress?.fraction ?? 0) * 100);
	const leftS = progress?.etaMs != null && done < total ? Math.max(1, Math.ceil(progress.etaMs / 1000)) : null;
	const muted = dk(dark, T.muted, T.textDarkMuted) as string;
	const labelColor = dk(dark, T.dark, T.textDark) as string;
	const trackColor = dk(dark, T.border, T.borderDark) as string;
	const numeric: React.CSSProperties = {
		fontFamily: TYPE.numericValue.family,
		fontWeight: TYPE.numericValue.weight,
		fontSize: TYPE.numericValue.size,
		color: muted,
	};

	return (
		<DiModal open={open} onClose={() => {}} variant="alert" size="sm" dark={dark}>
			<DiModal.Body>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
					<Ico name="record" size={16} color={T.purple} style={{ animation: 'ico-pulse 1.5s ease-in-out infinite' }} />
					<span style={{ fontFamily: TYPE.controlLabel.family, fontWeight: TYPE.controlLabel.weight, fontSize: TYPE.controlLabel.size, color: labelColor }}>
						{t('modal.timelapse.title')}
					</span>
					<div style={{ flex: 1 }} />
					<span style={{ ...numeric, width: 36, textAlign: 'right' as const }}>{pct}%</span>
				</div>
				<div style={{ height: 4, borderRadius: 2, background: trackColor, overflow: 'hidden' }}>
					<div style={{ height: '100%', width: `${pct}%`, background: T.purple, transition: 'width 100ms ease-out' }} />
				</div>
				<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, ...numeric }}>
					<span>{total > 0 ? t('modal.timelapse.frames', { done, total }) : t('modal.timelapse.preparing')}</span>
					<span>{progress?.canceling ? t('modal.timelapse.canceling') : leftS !== null ? t('modal.timelapse.left', { s: leftS }) : t('modal.timelapse.estimating')}</span>
				</div>
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.SecondaryAction onClick={() => timelapseProgress.cancel()} disabled={!progress || progress.canceling}>
					{t('modal.timelapse.cancel')}
				</DiModal.SecondaryAction>
			</DiModal.Footer>
		</DiModal>
	);
}
