import React from 'react';
import logoImg from 'figma:asset/logo-symbol.png';
import { Ico } from '../../../design-system';
import { T } from '../../../design-system/tokens';
import { Wordmark } from '../../../design-system/Wordmark';

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
}
@media (prefers-color-scheme: dark) {
	:root {
		--mbs-bg:    rgb(26, 26, 26);              /* T.dark           */
		--mbs-text:  rgba(255, 255, 255, 0.85);    /* T.textDark       */
		--mbs-muted: rgba(255, 255, 255, 0.40);    /* T.textDarkMuted  */
	}
}
.mbs-root  { background: var(--mbs-bg);   color: var(--mbs-text);  }
.mbs-muted { color: var(--mbs-muted); }
`;

// ── MobileBlockScreenV2 ───────────────────────────────────────────────────────
// No props — terminal component. Renders before ThemeProvider.
// Uses prefers-color-scheme CSS for theming; no framer-motion; no CTAs.

export function MobileBlockScreenV2() {
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
					justifyContent: 'center',
					padding:        '0 32px',
					fontFamily:     "'Manrope', sans-serif",
					textAlign:      'center',
				}}
			>
				{/* Logo — symbol glyph only; wordmark rendered as text below */}
				<img
					src={logoImg}
					alt="Diorame"
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
					Diorame is designed for tablet and desktop.
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
					You'll need a larger screen to draw, layer, and view your scenes in motion.
				</p>
			</div>
		</>
	);
}
