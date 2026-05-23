import React, { useState } from 'react';
import { DiModal } from './index';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { Ico } from '../../../design-system';
import { Wordmark } from '../../../design-system/Wordmark';
import { APP_VERSION } from '../../../constants/version';
import { getWelcomeIllustration } from './welcomeIllustrations';
import logoImg from 'figma:asset/logo-symbol.png';
import { hasFinePointer, formatShortcut, SHORTCUTS_GROUPS } from '../../../utils/keyboardShortcuts';

// ── Internal helpers ──────────────────────────────────────────────────────────

function ResourceLink({ href, children, mutedColor }: { href: string; children: React.ReactNode; mutedColor?: string }) {
	const [hovered, setHovered] = useState(false);
	const isMuted = mutedColor !== undefined;
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				color: isMuted ? mutedColor : T.purple,
				textDecoration: isMuted ? 'underline' : (hovered ? 'underline' : 'none'),
			}}
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
	const [shortcutsExpanded, setShortcutsExpanded] = useState(false);

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
		window.open('mailto:' + addr + '?subject=' + subject + '&body=' + body, '_blank');
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
						<img
							src={logoImg}
							alt="Diorame logo"
							style={{ height: 28, width: 'auto', marginBottom: 8, display: 'block' }}
						/>
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
							<span style={{
								fontFamily: TYPE.panelHeader.family,
								fontWeight: 700,
								fontSize: 20,
								letterSpacing: '-0.01em',
								color: dk(dark, T.dark, T.textDark) as string,
							}}>
								<Wordmark />
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
							Draw in 2D. And watch it come alive in 3D.
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

					{/* NIVEL 1 — morado, peso 500, sin underline (C22) */}
					<div style={{
						textAlign: 'left',
						fontFamily: TYPE.numericValue.family,
						fontWeight: 500,
						fontSize: TYPE.numericValue.size,
						lineHeight: 1.5,
					}}>
						<div>
							<ResourceLink href="https://www.youtube.com/watch?v=Ieb280ncEfA">Watch tutorial</ResourceLink>
							<span style={{ color: muted, margin: '0 6px' }}>·</span>
							<ResourceLink href="https://www.instagram.com/dumaker/">by @dumaker</ResourceLink>
						</div>
						<div>
							<ResourceLink href="https://ko-fi.com/dumaker">Support on Ko-fi 🤍</ResourceLink>
						</div>
					</div>

					{/* NIVEL 2 — muted, peso 400, underline permanente (C22) */}
					<div style={{
						marginTop: 14,
						textAlign: 'left',
						fontFamily: TYPE.numericValue.family,
						fontWeight: 400,
						fontSize: TYPE.numericValue.size,
						lineHeight: 1.5,
						color: muted,
					}}>
						<div>
							<ResourceLink href="https://apps.apple.com/pa/app/graintouch/id6740813845" mutedColor={muted}>Inspired by Graintouch</ResourceLink>
						</div>
						<div>
							<button
								onClick={handleBugReport}
								style={{
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									fontFamily: TYPE.numericValue.family,
									fontWeight: 400,
									fontSize: TYPE.numericValue.size,
									color: muted,
									textDecoration: 'underline',
									padding: 0,
								}}
							>
								Found a bug? Email me.
							</button>
						</div>
						{hasFinePointer() && (
							<div>
								<button
									onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
									style={{
										background: 'transparent',
										border: 'none',
										cursor: 'pointer',
										display: 'inline-flex',
										alignItems: 'center',
										gap: 6,
										color: muted,
										fontFamily: TYPE.numericValue.family,
										fontWeight: 400,
										fontSize: TYPE.numericValue.size,
										padding: 0,
									}}
								>
									<span style={{ textDecoration: 'underline' }}>Keyboard shortcuts</span>
									<Ico name={shortcutsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={muted} />
								</button>
								{shortcutsExpanded && (
									<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 220, overflowY: 'auto' }}>
										{SHORTCUTS_GROUPS.map(group => (
											<div key={group.category}>
												<div style={{
													fontFamily: TYPE.controlLabel.family,
													fontWeight: 400,
													fontSize: 10,
													textTransform: 'uppercase' as const,
													letterSpacing: '0.06em',
													color: muted,
													marginBottom: 6,
												}}>
													{group.category}
												</div>
												{group.items.map(item => (
													<div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, fontSize: 10, lineHeight: '20px' }}>
														<span style={{ fontFamily: TYPE.controlLabel.family, fontWeight: 400, fontSize: 10, color: dk(dark, T.dark, T.textDark) as string }}>
															{item.label}
														</span>
														<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: 500, fontSize: 10, color: muted, letterSpacing: '0.02em' }}>
															{formatShortcut(item.shortcut)}
														</span>
													</div>
												))}
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</div>

				</div>
			</div>
		</DiModal>
	);
}
