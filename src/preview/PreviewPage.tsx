import React, { useState } from 'react';
import { Ico, DiPill, DiVSep, DiMiniSlider, DiSegmentControl, DiPanel, ICONS } from '../design-system';
import { T, TYPE, dk } from '../design-system/tokens';
import { StrataProvider } from '../components/strata/StrataContext';
import { TopBar } from '../components/strata/topbar/TopBar';

export function PreviewPage() {
	const [dark, setDark] = useState(false);
	const [sliderVal, setSliderVal] = useState(50);
	const [segValue, setSegValue] = useState('Primary');
	const [segValueSmall, setSegValueSmall] = useState('Flat');

	const bg            = dark ? '#0e0e0e' : '#e8e8e8';
	const sectionBg     = dk(dark, 'rgba(0,0,0,0.03)', 'rgba(255,255,255,0.04)');
	const sectionBorder = dk(dark, T.border, T.borderDark);
	const headingColor  = dk(dark, T.dark, T.textDark);
	const subtleColor   = dk(dark, T.muted, T.textDarkMuted);

	return (
		<div style={{
			minHeight: '100vh',
			backgroundColor: bg,
			padding: 32,
			fontFamily: TYPE.manrope,
			color: headingColor,
		}}>
			{/* Header */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
				<h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
					Diorame Design System v2 — Preview
				</h1>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<span style={{ fontSize: 12, color: subtleColor }}>Theme</span>
					<DiSegmentControl
						options={['Light', 'Dark']}
						value={dark ? 'Dark' : 'Light'}
						onChange={v => setDark(v === 'Dark')}
						dark={dark}
					/>
				</div>
			</div>

			{/* ── SECTION 1: Primitives ── */}
			<Section title="Primitives" dark={dark} bg={sectionBg} border={sectionBorder}>

				<Subsection title="DiPill — flex container" dark={dark}>
					<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
						<DiPill dark={dark}>
							<Ico name="undo" size={18} color={dk(dark, T.dark, T.textDark)} />
							<Ico name="redo" size={18} color={dk(dark, T.dark, T.textDark)} />
							<DiVSep dark={dark} />
							<span style={{ fontSize: 13, fontWeight: 600, padding: '0 8px', color: dk(dark, T.dark, T.textDark) }}>
								Filename.diorame
							</span>
						</DiPill>

						<DiPill dark={dark} height={52} padding="0 12px" gap={6}>
							<Ico name="brush"  size={20} color={T.purple} />
							<Ico name="eraser" size={20} color={dk(dark, T.dark, T.textDark)} />
							<Ico name="blob"   size={20} color={dk(dark, T.dark, T.textDark)} />
							<DiVSep dark={dark} />
							<Ico name="move"   size={20} color={dk(dark, T.muted, T.textDarkMuted)} />
						</DiPill>
					</div>
				</Subsection>

				<Subsection title="DiVSep — standard vs tall" dark={dark}>
					<DiPill dark={dark}>
						<span style={{ padding: '0 8px', fontSize: 11, color: dk(dark, T.dark, T.textDark) }}>standard</span>
						<DiVSep dark={dark} />
						<span style={{ padding: '0 8px', fontSize: 11, color: dk(dark, T.dark, T.textDark) }}>tall</span>
						<DiVSep dark={dark} tall />
						<span style={{ padding: '0 8px', fontSize: 11, color: dk(dark, T.dark, T.textDark) }}>end</span>
					</DiPill>
				</Subsection>

				<Subsection title="DiMiniSlider — variants" dark={dark}>
					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, maxWidth: 560 }}>
						<DiMiniSlider value={sliderVal} onChange={setSliderVal} dark={dark}
							label="Opacity" formattedValue={`${sliderVal}%`} />
						<DiMiniSlider value={sliderVal} onChange={setSliderVal} dark={dark}
							formattedValue={`${sliderVal}%`} />
						<DiMiniSlider value={sliderVal} onChange={setSliderVal} dark={dark}
							label="Disabled" formattedValue={`${sliderVal}%`} disabled />
						<DiMiniSlider value={sliderVal} onChange={setSliderVal} dark={dark} />
					</div>
				</Subsection>

				<Subsection title="DiSegmentControl — sizes and option counts" dark={dark}>
					<div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
						<LabelledItem label="2 options (standard)" dark={dark}>
							<DiSegmentControl options={['Primary', 'Alt']} value={segValue}
								onChange={setSegValue} dark={dark} />
						</LabelledItem>
						<LabelledItem label="2 options (small)" dark={dark}>
							<DiSegmentControl options={['Flat', 'Grad']} value={segValueSmall}
								onChange={setSegValueSmall} dark={dark} small />
						</LabelledItem>
						<LabelledItem label="3 options" dark={dark}>
							<DiSegmentControl options={['Off', 'Soft', 'Strong']} value="Soft"
								onChange={() => {}} dark={dark} />
						</LabelledItem>
						<LabelledItem label="4 options" dark={dark}>
							<DiSegmentControl options={['XS', 'S', 'M', 'L']} value="M"
								onChange={() => {}} dark={dark} />
						</LabelledItem>
					</div>
				</Subsection>

				<Subsection title="DiPanel — default vs overrides" dark={dark}>
					<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
						<DiPanel>
							<span style={{ fontSize: 11 }}>Default (w-40 sm:w-48)</span>
						</DiPanel>
						<DiPanel width={220} radius={20}>
							<span style={{ fontSize: 11 }}>width=220, radius=20</span>
						</DiPanel>
						<DiPanel width={300} padding="20px">
							<span style={{ fontSize: 11 }}>width=300, padding=20px</span>
						</DiPanel>
					</div>
				</Subsection>

			</Section>

			{/* ── SECTION 1b: Top Bar ── */}
			<Section title="Top Bar (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Estado independiente — usa los botones de modo y tema dentro del demo.
				</p>
				<StrataProvider>
					<div style={{
						position: 'relative',
						width: '100%',
						height: 72,
						backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
						borderRadius: 12,
						overflow: 'hidden',
					}}>
						<TopBar />
					</div>
				</StrataProvider>
			</Section>

			{/* ── SECTION 2: Icon Gallery ── */}
			<Section title={`Icons (${Object.keys(ICONS).length} total)`} dark={dark} bg={sectionBg} border={sectionBorder}>

				<IconGroup title="Navigation & Global"
					names={['draw-mode', 'view-mode', 'hide-ui', 'sun', 'moon', 'chevron-left', 'chevron-right']}
					dark={dark} />

				<IconGroup title="Export"
					names={['snapshot', 'record']}
					dark={dark} />

				<IconGroup title="FX"
					names={Object.keys(ICONS).filter(k => k.startsWith('fx-'))}
					dark={dark} />

				<IconGroup title="Camera Presets"
					names={Object.keys(ICONS).filter(k => k.startsWith('cam-'))}
					dark={dark} />

				<IconGroup title="Camera Controls"
					names={Object.keys(ICONS).filter(k => k.startsWith('ctrl-'))}
					dark={dark} />

				<IconGroup title="Drawing Tools"
					names={['brush', 'eraser', 'blob', 'text', 'move', 'symmetry', 'smooth', 'organic', 'draw-behind', 'draw-inside', 'rotate', 'pen']}
					dark={dark} />

				<IconGroup title="File Operations"
					names={['new', 'open', 'save', 'export', 'undo', 'redo']}
					dark={dark} />

				<IconGroup title="Layer Panel"
					names={['eye', 'eye-off', 'duplicate', 'trash', 'arrow-up', 'arrow-down', 'opacity', 'plus-layer', 'drag', 'blend-normal']}
					dark={dark} />

				<IconGroup title="Custom Additions"
					names={['align-left', 'align-center', 'align-right', 'lock', 'unlock', 'flip-horizontal', 'maximize', 'minimize', 'cloud-fog', 'globe', 'scan-line', 'zoom-in', 'target', 'loader', 'monitor', 'tablet', 'sparkles', 'info', 'check', 'x', 'plus', 'hand', 'move-vertical', 'move-horizontal', 'aperture', 'wand', 'tornado', 'image']}
					dark={dark} />

			</Section>

			<p style={{ fontSize: 10, color: subtleColor, marginTop: 32, textAlign: 'center' }}>
				Temporary dev page · ?preview=true · Will be removed in cleanup phase
			</p>
		</div>
	);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Section({ title, dark, bg, border, children }: {
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

function Subsection({ title, dark, children }: {
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

function LabelledItem({ label, dark, children }: {
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

function IconGroup({ title, names, dark }: { title: string; names: string[]; dark: boolean }) {
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
