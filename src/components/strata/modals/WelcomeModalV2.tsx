import React, { useState } from 'react';
import { DiModal } from './index';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { Ico } from '../../../design-system';
import { APP_VERSION } from '../../../constants/version';
import { getWelcomeIllustration } from './welcomeIllustrations';
import logoImg from 'figma:asset/logo-symbol.png';

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

// ── Helpers (keyboard shortcuts section) ───────────────────────────────────

function hasFinePointer(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
}

function isMac(): boolean {
	return typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);
}

function formatShortcut(s: string): string {
	if (isMac()) {
		return s
			.replace(/Ctrl\+Shift\+/g, '⇧⌘')
			.replace(/Ctrl\+/g, '⌘')
			.replace(/Shift\+/g, '⇧')
			.replace(/Alt\+/g, '⌥');
	}
	return s;
}

const SHORTCUTS_GROUPS = [
	{ category: 'File', items: [
		{ label: 'Save project', shortcut: 'Ctrl+S' },
		{ label: 'Export SVG', shortcut: 'Ctrl+E' },
		{ label: 'Export SVGZ', shortcut: 'Ctrl+Shift+E' },
	] },
	{ category: 'Edit', items: [
		{ label: 'Undo', shortcut: 'Ctrl+Z' },
		{ label: 'Redo', shortcut: 'Ctrl+Y' },
	] },
	{ category: 'View', items: [
		{ label: 'Dark mode', shortcut: 'Shift+D' },
		{ label: 'Open shortcuts', shortcut: 'Shift+?' },
	] },
	{ category: 'Tools (Draw)', items: [
		{ label: 'Brush', shortcut: 'B' },
		{ label: 'Line', shortcut: 'L' },
		{ label: 'Eraser', shortcut: 'E' },
		{ label: 'Text', shortcut: 'T' },
		{ label: 'Move', shortcut: 'M' },
	] },
	{ category: 'Layers (Draw)', items: [
		{ label: 'Previous layer', shortcut: '[' },
		{ label: 'Next layer', shortcut: ']' },
	] },
	{ category: 'Canvas (Draw)', items: [
		{ label: 'Reset view', shortcut: 'Space' },
	] },
];

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
						textAlign: 'left',
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
						textAlign: 'left',
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
					<div style={{ marginTop: 12, textAlign: 'left' }}>
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
					
					{/* Zona 6 — Keyboard shortcuts (collapsible, desktop-only) */}
					{hasFinePointer() && (
						<div style={{ marginTop: 16 }}>
							<button
								onClick={() => setShortcutsExpanded(!shortcutsExpanded)}
								style={{
									background: 'transparent',
									border: 'none',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
									gap: 6,
									color: muted,
									fontFamily: TYPE.controlLabel.family,
									fontWeight: TYPE.controlLabel.weight,
									fontSize: TYPE.controlLabel.size,
									padding: 0,
								}}
							>
								<span>Keyboard shortcuts</span>
								<Ico name={shortcutsExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={muted} />
							</button>
							{shortcutsExpanded && (
								<div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
									{SHORTCUTS_GROUPS.map(group => (
										<div key={group.category}>
											<div style={{
												fontFamily: TYPE.controlLabel.family,
												fontWeight: 700,
												fontSize: 10,
												textTransform: 'uppercase' as const,
												letterSpacing: '0.08em',
												color: muted,
												marginBottom: 4,
											}}>
												{group.category}
											</div>
											{group.items.map(item => (
												<div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, lineHeight: '22px' }}>
													<span style={{ fontFamily: TYPE.controlLabel.family, fontWeight: 400, color: dk(dark, T.dark, T.textDark) as string }}>
														{item.label}
													</span>
													<span style={{ fontFamily: TYPE.numericValue.family, fontWeight: TYPE.numericValue.weight, fontSize: 10, color: muted, letterSpacing: '0.02em' }}>
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
		</DiModal>
	);
}
