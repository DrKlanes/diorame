import React, { useState } from 'react';
import { DiModal } from './index';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { APP_VERSION } from '../../../constants/version';
import { getWelcomeIllustration } from './welcomeIllustrations';

// ── Internal helpers ──────────────────────────────────────────────────────────

function ResourceLink({ href, children }: { href: string; children: React.ReactNode }) {
	const [hovered, setHovered] = useState(false);
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{ color: T.purple, textDecoration: hovered ? 'underline' : 'none' }}
		>
			{children}
		</a>
	);
}

// ── WelcomeModalV2 ────────────────────────────────────────────────────────────

interface WelcomeModalV2Props {
	open:          boolean;
	onClose:       () => void;
	onLoadExample: () => Promise<void>;
	dark:          boolean;
}

export function WelcomeModalV2({ open, onClose, onLoadExample, dark }: WelcomeModalV2Props) {
	const [isLoadingExample, setIsLoadingExample] = useState(false);
	const [isBugHovered, setIsBugHovered] = useState(false);

	const handleLoadExample = async () => {
		setIsLoadingExample(true);
		try { await onLoadExample(); }
		finally { setIsLoadingExample(false); }
	};

	const handleBugReport = () => {
		const parts = ['dumaker', 'gmail.com'];
		const addr = parts.join('@');
		const subject = encodeURIComponent('Diorame bug report — v' + APP_VERSION);
		const body = encodeURIComponent([
			'What I expected:',
			'',
			'',
			'What happened instead:',
			'',
			'',
			'Steps to reproduce:',
			'',
			'',
			'---',
			'Browser:',
			'OS:',
		].join('\n'));
		window.location.href = 'mailto:' + addr + '?subject=' + subject + '&body=' + body;
	};

	const muted = dk(dark, T.muted, T.textDarkMuted) as string;

	return (
		<DiModal open={open} onClose={onClose} dark={dark} variant="dialog" size="md">
			<div style={{ display: 'flex', minHeight: 280 }}>

				{/* ── Left: full-bleed illustration ────────────────────────── */}
				<div style={{ width: 160, flexShrink: 0, position: 'relative' }}>
					<img
						src={getWelcomeIllustration(APP_VERSION)}
						alt=""
						loading="eager"
						style={{
							position: 'absolute',
							inset: 0,
							width: '100%',
							height: '100%',
							objectFit: 'cover',
							display: 'block',
						}}
					/>
				</div>

				{/* ── Right: content ───────────────────────────────────────── */}
				<div style={{
					flex: 1,
					position: 'relative',
					padding: '28px 24px 24px',
					display: 'flex',
					flexDirection: 'column',
				}}>
					{/* Close button — absolute positioned top-right of content zone */}
					<div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
						<DiModal.CloseButton />
					</div>

					{/* Zona 1 — Identidad */}
					<div style={{ marginBottom: 28 }}>
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
							<span style={{
								fontFamily: TYPE.panelHeader.family,
								fontWeight: 700,
								fontSize: 20,
								letterSpacing: '-0.01em',
								color: dk(dark, T.dark, T.textDark) as string,
							}}>
								diorame<span style={{ fontSize: '0.6em' }}>™</span>
							</span>
							<span style={{
								fontFamily: TYPE.numericValue.family,
								fontWeight: TYPE.numericValue.weight,
								fontSize: TYPE.numericValue.size,
								letterSpacing: '0.03em',
								color: muted,
							}}>
								v{APP_VERSION}
							</span>
						</div>
						<p style={{
							margin: '6px 0 0',
							fontFamily: TYPE.controlLabel.family,
							fontWeight: TYPE.controlLabel.weight,
							fontSize: 12,
							lineHeight: 1.4,
							color: muted,
						}}>
							Draw in 2D. Watch it come alive in 3D.
						</p>
					</div>

					{/* Zona 2 — Acciones (PrimaryActionLg arriba, Secondary abajo) */}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', marginBottom: 28 }}>
						<DiModal.PrimaryActionLg onClick={onClose}>
							Start drawing
						</DiModal.PrimaryActionLg>
						<DiModal.SecondaryAction onClick={handleLoadExample} disabled={isLoadingExample}>
							{isLoadingExample ? 'Loading…' : 'Load example scene'}
						</DiModal.SecondaryAction>
					</div>

					{/* Zona 3 — Recursos */}
					<div style={{
						textAlign: 'center',
						fontFamily: TYPE.controlLabel.family,
						fontWeight: TYPE.controlLabel.weight,
						fontSize: TYPE.controlLabel.size,
						lineHeight: 1.5,
					}}>
						<ResourceLink href="https://www.youtube.com/watch?v=Ieb280ncEfA">Watch tutorial</ResourceLink>
						<span style={{ color: muted, margin: '0 6px' }}>·</span>
						<ResourceLink href="https://ko-fi.com/dumaker">Support on Ko-fi 🤍</ResourceLink>
					</div>

					{/* Zona 4 — Créditos */}
					<div style={{
						marginTop: 12,
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
						textAlign: 'center',
						fontFamily: TYPE.numericValue.family,
						fontWeight: TYPE.numericValue.weight,
						fontSize: TYPE.numericValue.size,
						color: muted,
					}}>
						<div>
							by <ResourceLink href="https://www.instagram.com/dumaker/">@dumaker</ResourceLink>
						</div>
						<div>
							Inspired by <ResourceLink href="https://apps.apple.com/pa/app/graintouch/id6740813845">Graintouch</ResourceLink>
						</div>
					</div>

					{/* Zona 5 — Footer bug report */}
					<div style={{ marginTop: 12, textAlign: 'center' }}>
						<button
							onClick={handleBugReport}
							onMouseEnter={() => setIsBugHovered(true)}
							onMouseLeave={() => setIsBugHovered(false)}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								fontFamily: TYPE.numericValue.family,
								fontWeight: TYPE.numericValue.weight,
								fontSize: TYPE.numericValue.size,
								color: muted,
								textDecoration: isBugHovered ? 'underline' : 'none',
								padding: 0,
							}}
						>
							Found a bug? Email me.
						</button>
					</div>

				</div>
			</div>
		</DiModal>
	);
}
