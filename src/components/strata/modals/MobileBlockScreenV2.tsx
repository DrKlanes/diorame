import React from 'react';
import logoImg from 'figma:asset/logo-symbol.png';
import { toast } from 'sonner@2.0.3';
import { Ico } from '../../../design-system';
import { DiButton } from '../../../design-system/DiButton';
import { T, TYPE, RADIUS } from '../../../design-system/tokens';
import { Wordmark } from '../../../design-system/Wordmark';
import { useTranslation } from '../../../i18n';
import type { Language } from '../../../i18n';
import { analytics } from '../../../analytics/analytics';
import { PRESENTATION_URL } from '../../../constants/videos';

// Same pill geometry as the DiModal *ActionLg buttons (Welcome): RADIUS.pill, 44px, 18px padding, 13/600.
// DiButton wraps shadcn's Button, whose base class is rounded-md, so the radius is set inline.
const CTA_STYLE: React.CSSProperties = {
	borderRadius: RADIUS.pill,
	fontFamily:   TYPE.controlLabel.family,
	fontWeight:   600,
	fontSize:     13,
};

const LANDING_URL: Readonly<Record<Language, string>> = {
	es: 'https://diorame.com/es/',
	en: 'https://diorame.com/en/',
};

// Clipboard fallback for contexts without navigator.clipboard (insecure origin, old WebView).
function legacyCopy(text: string): boolean {
	const ta = document.createElement('textarea');
	ta.value = text;
	ta.setAttribute('readonly', '');
	ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
	document.body.appendChild(ta);
	ta.select();
	let ok = false;
	try { ok = document.execCommand('copy'); } catch { ok = false; }
	document.body.removeChild(ta);
	return ok;
}

// ── Theme CSS — prefers-color-scheme ─────────────────────────────────────────
// Values are hardcoded because this component renders before ThemeProvider.
// Token reference (keep in sync if tokens.ts changes):
//   light bg      = T.white           rgb(255, 255, 255)
//   dark bg       = T.dark            rgb(26, 26, 26)
//   light text    = T.dark            rgb(26, 26, 26)
//   dark text     = T.textDark        rgba(255, 255, 255, 0.85)
//   light muted   = T.muted           rgb(140, 140, 140)
//   dark muted    = T.textDarkMuted   rgba(255, 255, 255, 0.40)
const THEME_CSS = `
:root {
	--mbs-bg:    rgb(255, 255, 255);           /* T.white          */
	--mbs-text:  rgb(26, 26, 26);              /* T.dark           */
	--mbs-muted: rgb(140, 140, 140);           /* T.muted          */
	--mbs-line:  rgb(212, 212, 212);           /* T.border         */
	--mbs-hover: rgb(245, 245, 245);           /* T.light          */
}
@media (prefers-color-scheme: dark) {
	:root {
		--mbs-bg:    rgb(26, 26, 26);              /* T.dark           */
		--mbs-text:  rgba(255, 255, 255, 0.85);    /* T.textDark       */
		--mbs-muted: rgba(255, 255, 255, 0.40);    /* T.textDarkMuted  */
		--mbs-line:  rgba(255, 255, 255, 0.10);    /* T.borderDark     */
		--mbs-hover: rgba(255, 255, 255, 0.07);    /* T.hoverDark      */
	}
}
.mbs-root  { background: var(--mbs-bg);   color: var(--mbs-text);  }
.mbs-muted { color: var(--mbs-muted); }
`;

// ── MobileBlockScreenV2 ───────────────────────────────────────────────────────
// No props — terminal component. Renders before ThemeProvider.
// Uses prefers-color-scheme CSS for theming; no framer-motion.
// CTAs (v3.26.0): send the link to a tablet/desktop (Web Share, clipboard fallback), watch the video, open the landing.
// Wrapped by LanguageProvider in main.tsx → useTranslation is available even on mobile path.

export function MobileBlockScreenV2() {
	const { t, language } = useTranslation();

	React.useEffect(() => { analytics.mobileGateShown(language); }, [language]);

	const sendLink = async () => {
		const url = window.location.href;
		if (typeof navigator.share === 'function') {
			try {
				await navigator.share({ title: 'Diorame', text: t('modal.mobile.shareText'), url });
				analytics.mobileLinkShared(language);
				return;
			} catch (err) {
				if (err instanceof DOMException && err.name === 'AbortError') return;
			}
		}
		let copied = false;
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
		} catch {
			copied = legacyCopy(url);
		}
		if (!copied) return;
		toast.success(t('modal.mobile.copied'), { duration: 2500 });
		analytics.mobileLinkCopied(language);
	};

	const openVideo = () => {
		analytics.mobileVideoOpened(language);
		window.open(PRESENTATION_URL[language], '_blank', 'noopener,noreferrer');
	};

	return (
		<>
			<style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
			<div
				className="mbs-root"
				style={{
					position:       'fixed',
					inset:          0,
					zIndex:         9999,
					display:        'flex',
					flexDirection:  'column',
					alignItems:     'center',
					padding:        'env(safe-area-inset-top) 32px env(safe-area-inset-bottom)',
					overflowY:      'auto',
					fontFamily:     "'Manrope', sans-serif",
					textAlign:      'center',
				}}
			>
				<div style={{ margin: 'auto 0', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
					{/* Logo — symbol glyph only; wordmark rendered as text below */}
					<img
						src={logoImg}
						alt={t('modal.mobile.alt')}
						style={{
							maxWidth:     120,
							width:        '100%',
							height:       'auto',
							objectFit:    'contain',
							marginBottom: 8,
						}}
					/>

					{/* Wordmark */}
					<div style={{
						fontFamily:    "'Manrope', sans-serif",
						fontWeight:    700,
						fontSize:      18,
						letterSpacing: '-0.02em',
						marginBottom:  32,
					}}>
						<Wordmark />
					</div>

					{/* Device icons — tablet + monitor, T.purple = rgb(154, 15, 249) */}
					<div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
						<Ico name="tablet"  size={52} color={T.purple} />
						<Ico name="monitor" size={52} color={T.purple} />
					</div>

					{/* Primary message */}
					<p style={{
						margin:     0,
						fontFamily: "'Manrope', sans-serif",
						fontWeight: 600,
						fontSize:   16,
						lineHeight: 1.4,
					}}>
						{t('modal.mobile.primary')}
					</p>

					{/* Secondary message */}
					<p
						className="mbs-muted"
						style={{
							margin:     '8px 0 0',
							fontFamily: "'Manrope', sans-serif",
							fontWeight: 400,
							fontSize:   14,
							lineHeight: 1.5,
							maxWidth:   320,
						}}
					>
						{t('modal.mobile.secondary')}
					</p>

					{/* Actions */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, marginTop: 28 }}>
						<DiButton variant="brand" className="w-full h-11 px-[18px] has-[>svg]:px-[18px] scale-100 hover:scale-100 hover:bg-[#9a0ff9] hover:opacity-90" style={CTA_STYLE} onClick={sendLink}>
							<Ico name="export" size={18} />
							{t('modal.mobile.send')}
						</DiButton>
						<DiButton
							variant="ghost"
							className="w-full h-11 px-[18px] has-[>svg]:px-[18px] border hover:bg-[var(--mbs-hover)]"
							style={{ ...CTA_STYLE, color: 'var(--mbs-text)', borderColor: 'var(--mbs-line)' }}
							onClick={openVideo}
						>
							<Ico name="play" size={18} />
							{t('modal.mobile.video')}
						</DiButton>
						<a
							className="mbs-muted"
							href={LANDING_URL[language]}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => analytics.mobileLandingOpened(language)}
							style={{ marginTop: 6, padding: '10px 0', fontSize: 14, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}
						>
							{t('modal.mobile.about')}
						</a>
					</div>
				</div>
			</div>
		</>
	);
}
