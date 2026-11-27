import React, { useState, useEffect } from 'react';
import { DiModal } from './index';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { INTERFACE_TOUR_SRC, INTERFACE_TOUR_CAPTIONS, INTERFACE_TOUR_COVER } from '../../../constants/videos';
import { analytics } from '../../../analytics/analytics';

interface TourModalV2Props {
	open:    boolean;
	onClose: () => void;
	dark:    boolean;
}

export function TourModalV2({ open, onClose, dark }: TourModalV2Props) {
	const { t, language } = useTranslation();
	const [playing, setPlaying] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (open) { analytics.tourVideo('shown'); return; }
		setPlaying(false); setFailed(false);
	}, [open]);

	const handlePlay = () => {
		if (!navigator.onLine) { setFailed(true); return; }
		setPlaying(true);
		analytics.tourVideo('played');
	};

	const box: React.CSSProperties = {
		position: 'relative',
		width: '100%',
		aspectRatio: '16 / 9',
		borderRadius: RADIUS.fxRow,
		overflow: 'hidden',
		background: dark ? T.hoverDark : T.light,
	};

	return (
		<DiModal open={open} onClose={onClose} dark={dark} variant="dialog" width={640}>
			<DiModal.Header title={t('modal.tour.title')} />
			<DiModal.Body>
				<div style={box}>
					{failed ? (
						<div style={{
							position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
							alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, textAlign: 'center',
						}}>
							<span>{t('modal.tour.fallback')}</span>
						</div>
					) : playing ? (
						<video
							src={INTERFACE_TOUR_SRC[language]}
							poster={INTERFACE_TOUR_COVER[language]}
							aria-label={t('modal.tour.videoLabel')}
							controls
							autoPlay
							playsInline
							preload="auto"
							onError={() => setFailed(true)}
							style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
						>
							<track kind="captions" src={INTERFACE_TOUR_CAPTIONS[language]} srcLang={language} label={t('modal.tour.captions')} />
						</video>
					) : (
						<button
							onClick={handlePlay}
							aria-label={t('modal.tour.play')}
							style={{ position: 'absolute', inset: 0, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
						>
							<img
								src={INTERFACE_TOUR_COVER[language]}
								alt=""
								style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
							/>
							<span style={{
								position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
								width: 64, height: 64, borderRadius: '50%', background: T.purple,
								display: 'flex', alignItems: 'center', justifyContent: 'center',
								boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
							}}>
								<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
									<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="#fff" />
								</svg>
							</span>
						</button>
					)}
				</div>
				{/* CC BY 4.0: the music credit goes with every publication of the video. */}
				<p style={{
					margin: '8px 0 0', fontSize: TYPE.numericValue.size, lineHeight: 1.5,
					color: dk(dark, T.muted, T.textDarkMuted) as string,
				}}>
					{t('modal.tour.musicCredit')}
				</p>
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.PrimaryActionLg onClick={onClose}>{t('modal.tour.start')}</DiModal.PrimaryActionLg>
			</DiModal.Footer>
		</DiModal>
	);
}
