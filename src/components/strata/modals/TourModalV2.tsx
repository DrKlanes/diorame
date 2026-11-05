import React, { useState, useEffect } from 'react';
import { DiModal } from './index';
import { T, TYPE, RADIUS } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { INTERFACE_TOUR_ID, INTERFACE_TOUR_URL, INTERFACE_TOUR_COVER } from '../../../constants/videos';
import { analytics } from '../../../analytics/analytics';

const LOAD_TIMEOUT_MS = 12000;

interface TourModalV2Props {
	open:    boolean;
	onClose: () => void;
	dark:    boolean;
}

export function TourModalV2({ open, onClose, dark }: TourModalV2Props) {
	const { t, language } = useTranslation();
	const [playing, setPlaying] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (open) { analytics.tourVideo('shown'); return; }
		setPlaying(false); setLoaded(false); setFailed(false);
	}, [open]);

	// Cross-origin iframes do not report load errors: offline mid-play or a stalled load falls back to the link.
	useEffect(() => {
		if (!playing || loaded || failed) return;
		const timer = setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
		const onOffline = () => setFailed(true);
		window.addEventListener('offline', onOffline);
		return () => { clearTimeout(timer); window.removeEventListener('offline', onOffline); };
	}, [playing, loaded, failed]);

	const handlePlay = () => {
		if (!navigator.onLine) { setFailed(true); return; }
		setPlaying(true);
		analytics.tourVideo('played');
	};

	const id = INTERFACE_TOUR_ID[language];
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
							<a
								href={INTERFACE_TOUR_URL[language]}
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: T.purple, fontFamily: TYPE.controlLabel.family, fontWeight: 600 }}
							>
								{t('modal.tour.fallbackLink')}
							</a>
						</div>
					) : playing ? (
						<iframe
							src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
							title={t('modal.tour.iframeTitle')}
							allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
							allowFullScreen
							referrerPolicy="strict-origin-when-cross-origin"
							onLoad={() => setLoaded(true)}
							style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
						/>
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
			</DiModal.Body>
			<DiModal.Footer>
				<DiModal.PrimaryActionLg onClick={onClose}>{t('modal.tour.start')}</DiModal.PrimaryActionLg>
			</DiModal.Footer>
		</DiModal>
	);
}
