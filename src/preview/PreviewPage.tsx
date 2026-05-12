import React, { useState } from 'react';
import { Ico, DiPill, DiVSep, DiMiniSlider, DiSegmentControl, DiPanel, ICONS } from '../design-system';
import { T, TYPE, dk } from '../design-system/tokens';
import { StrataProvider, useStrata } from '../components/strata/StrataContext';
import { useTheme } from '../design-system/useTheme';
import { TopBar } from '../components/strata/topbar/TopBar';
import { DrawingToolbar } from '../components/strata/bottombar/DrawingToolbar';
import { CameraPresetsZone } from '../components/strata/bottombar/CameraPresetsZone';
import { CameraSpeedZone } from '../components/strata/bottombar/CameraSpeedZone';
import { CameraSlidersZone } from '../components/strata/bottombar/CameraSlidersZone';
import { CameraBar } from '../components/strata/bottombar/CameraBar';
import { BottomBar } from '../components/strata/bottombar/BottomBar';
import { ColorPalette } from '../components/strata/colorpalette/ColorPalette';
import { LayersPanel } from '../components/strata/layers/LayersPanel';
import { LayerDotsRail } from '../components/strata/layers/LayerDotsRail';

export function PreviewPage() {
	return (
		<StrataProvider>
			<PreviewPageContent />
		</StrataProvider>
	);
}

function PreviewPageContent() {
	const { dark } = useTheme();
	const { dispatch } = useStrata();
	const [sliderVal, setSliderVal] = useState(50);
	const [segValue, setSegValue] = useState('Primary');
	const [segValueSmall, setSegValueSmall] = useState('Flat');

	const bg            = dark ? '#0e0e0e' : '#e8e8e8';
	const sectionBg     = dk(dark, 'rgba(0,0,0,0.03)', 'rgba(255,255,255,0.04)');
	const sectionBorder = dk(dark, T.border, T.borderDark);
	const headingColor  = dk(dark, T.dark, T.textDark);
	const subtleColor   = dk(dark, T.muted, T.textDarkMuted);

	const handleThemeChange = (v: string) => {
		if ((v === 'Dark') !== dark) dispatch({ type: 'TOGGLE_DARK_MODE' });
	};

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
						onChange={handleThemeChange}
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
						<DiPanel dark={dark}>
							<span style={{ fontSize: 11 }}>Default</span>
						</DiPanel>
						<DiPanel dark={dark} width={220} radius={20}>
							<span style={{ fontSize: 11 }}>width=220, radius=20</span>
						</DiPanel>
						<DiPanel dark={dark} width={300} padding="20px">
							<span style={{ fontSize: 11 }}>width=300, padding=20px</span>
						</DiPanel>
					</div>
				</Subsection>

			</Section>

			{/* ── SECTION 1a: Drawing Toolbar ── */}
			<Section title="Drawing Toolbar (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Clickea cada herramienta para ver los modificadores condicionales.
				</p>
				<div style={{
					position: 'relative',
					width: '100%',
					height: 72,
					backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
					borderRadius: 12,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}>
					<DrawingToolbar dark={dark} />
				</div>
			</Section>

			{/* ── SECTION 1c: Camera Bar zones (isolated) ── */}
			<Section title="Camera Bar zones (isolated)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Zonas de la Camera Bar. Conectadas al store global.
				</p>

				<Subsection title="Presets" dark={dark}>
					<div style={{
						height: 52,
						backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
						borderRadius: 12,
						display: 'flex',
						alignItems: 'center',
						paddingLeft: 12,
					}}>
						<CameraPresetsZone dark={dark} />
					</div>
				</Subsection>
				<Subsection title="Focal + Distance + Spacing" dark={dark}>
					<div style={{
						height: 52,
						backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
						borderRadius: 12,
						display: 'flex',
						alignItems: 'center',
					}}>
						<CameraSlidersZone dark={dark} />
					</div>
				</Subsection>

				<Subsection title="Speed + Handshake" dark={dark}>
					<div style={{
						height: 52,
						backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
						borderRadius: 12,
						display: 'flex',
						alignItems: 'center',
					}}>
						<CameraSpeedZone dark={dark} />
					</div>
				</Subsection>
			</Section>

			{/* ── SECTION 1d: Camera Bar (responsive) ── */}
			<Section title="Camera Bar (responsive)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Wrapper completo. Desktop: pill única. Tablet (&lt;1100px): dos pills apiladas.
				</p>
				<div style={{
					height: 100,
					backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
					borderRadius: 12,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}>
					<CameraBar dark={dark} />
				</div>
			</Section>

			{/* ── SECTION 1e: Bottom Bar (live) ── */}
			<Section title="Bottom Bar (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Cambia de modo desde la TopBar live (draw-mode / view-mode) para ver DrawingToolbar ↔ CameraBar.
				</p>
				<div style={{
					position: 'relative',
					width: '100%',
					height: 100,
					backgroundColor: dk(dark, 'rgb(248,247,243)', '#1a1a1a'),
					borderRadius: 12,
					overflow: 'hidden',
				}}>
					<BottomBar />
				</div>
			</Section>

			{/* ── SECTION 1f: Color Palette (live) ── */}
			<Section title="Color Palette (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Visible solo en modo drawing. Cambia Primary/Alt, Flat/Solid/Fade, sliders de ángulo e intensidad. Selecciona swatches.
				</p>
				<div style={{
					position: 'relative',
					width: '100%',
					height: 400,
					backgroundColor: dk(dark, 'rgb(248,247,243)', '#1a1a1a'),
					borderRadius: 12,
					overflow: 'hidden',
				}}>
					<ColorPalette />
				</div>
			</Section>

			{/* ── SECTION 1g: Layers Panel (live) ── */}
			<Section title="Layers Panel (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Visible solo en modo drawing. Collapsed (pill vertical) → expanded (panel con lista). Persiste en localStorage.
				</p>
				<div style={{
					position: 'relative',
					width: '100%',
					height: 320,
					backgroundColor: dk(dark, 'rgb(248,247,243)', '#1a1a1a'),
					borderRadius: 12,
					overflow: 'hidden',
				}}>
					<LayersPanel />
				</div>
				<p style={{ fontSize: 11, color: subtleColor, margin: '8px 0 0 0' }}>
					LayerDotsRail usa <code>position: fixed</code> — aparece pegada al margen derecho del viewport global.
				</p>
			</Section>
			<LayerDotsRail />

			{/* ── SECTION 1b: Top Bar ── */}
			<Section title="Top Bar (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Conectado al store global — el toggle de tema afecta toda la página.
				</p>
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
					names={['brush', 'eraser', 'blob', 'text', 'move', 'symmetry', 'smooth', 'organic', 'draw-behind', 'draw-inside', 'rotate', 'pen', 'line-tapered', 'line-uniform', 'line-ink']}
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
