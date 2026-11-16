import React from 'react';
import { Ico } from '../design-system';
import { T, TYPE, dk } from '../design-system/tokens';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function Section({ title, dark, bg, border, children }: {
	title: string; dark: boolean; bg: string; border: string; children: React.ReactNode;
}) {
	const headingColor = dk(dark, T.dark, T.textDark);
	return (
		<section style={{
			backgroundColor: bg,
			border: `1px solid ${border}`,
			borderRadius: 14,
			padding: 24,
			marginBottom: 24,
		}}>
			<h2 style={{
				fontSize: 14, fontWeight: 700, margin: '0 0 20px 0',
				textTransform: 'uppercase', letterSpacing: '0.1em',
				color: headingColor,
			}}>
				{title}
			</h2>
			{children}
		</section>
	);
}

export function Subsection({ title, dark, children }: {
	title: string; dark: boolean; children: React.ReactNode;
}) {
	const subtle = dk(dark, T.muted, T.textDarkMuted);
	return (
		<div style={{ marginBottom: 28 }}>
			<h3 style={{
				fontSize: 11, fontWeight: 600, color: subtle,
				margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em',
			}}>
				{title}
			</h3>
			{children}
		</div>
	);
}

export function LabelledItem({ label, dark, children }: {
	label: string; dark: boolean; children: React.ReactNode;
}) {
	const subtle = dk(dark, T.muted, T.textDarkMuted);
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			<span style={{ fontSize: 10, color: subtle }}>{label}</span>
			{children}
		</div>
	);
}

export function IconGroup({ title, names, dark }: { title: string; names: string[]; dark: boolean }) {
	const subtle    = dk(dark, T.muted, T.textDarkMuted);
	const cardBg    = dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.05)');
	const iconColor = dk(dark, T.dark, T.textDark);
	return (
		<div style={{ marginBottom: 20 }}>
			<h3 style={{
				fontSize: 11, fontWeight: 600, color: subtle,
				margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.05em',
			}}>
				{title} ({names.length})
			</h3>
			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
				gap: 8,
			}}>
				{names.map(name => (
					<div key={name} style={{
						backgroundColor: cardBg,
						borderRadius: 8,
						padding: '12px 8px',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 8,
					}}>
						<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
							<Ico name={name} size={16} color={iconColor} />
							<Ico name={name} size={20} color={iconColor} />
							<Ico name={name} size={24} color={iconColor} />
						</div>
						<span style={{
							fontSize: 9, color: subtle,
							fontFamily: TYPE.sora,
							textAlign: 'center',
							wordBreak: 'break-word',
						}}>
							{name}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
