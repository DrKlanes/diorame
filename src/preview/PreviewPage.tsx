import React, { useState } from 'react';
import { Ico, DiPill, DiVSep, DiMiniSlider, DiSegmentControl, DiPanel, ICONS, ICON_SECTIONS } from '../design-system';
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
import { ResetViewPill } from '../components/strata/viewport/ResetViewPill';
import { ToolOptionsPanel } from '../components/strata/drawing/ToolOptionsPanel';
import { Section, Subsection, LabelledItem, IconGroup } from './previewHelpers';
import { LayersPreviewSection, FXPreviewSection, TextSessionPreviewSection, IntegratedUIPreviewSection } from './previewSeededSections';
import { PreviewModalsSection } from './previewModalsSection';

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
							<DiSegmentControl<string> options={['Primary', 'Alt']} value={segValue}
								onChange={setSegValue} dark={dark} />
						</LabelledItem>
						<LabelledItem label="2 options (small)" dark={dark}>
							<DiSegmentControl<string> options={['Flat', 'Grad']} value={segValueSmall}
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

{/* ── SECTION 1e3: Tool Options Panel (live) ── */}
			<Section title="Tool Options Panel (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Visible solo con tool=line. Selecciona la herramienta Brush en la Drawing Toolbar para activarla.
				</p>
				<div style={{
					height: 64,
					backgroundColor: dk(dark, 'rgb(240,238,234)', '#1a1a1a'),
					borderRadius: 12,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}>
					<ToolOptionsPanel dark={dark} />
				</div>
			</Section>

			{/* ── SECTION 1e4: Text Session Panel (live) ── */}
			<TextSessionPreviewSection dark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />

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
			<LayersPreviewSection dark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />

			{/* ── SECTION 1h: FX Panel (live) ── */}
			<FXPreviewSection dark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />

			<PreviewModalsSection dark={dark} headingColor={headingColor} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />


			{/* ── SECTION 1i: Reset View Pill (live) ── */}
			<Section title="Reset View Pill (live)" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
					Visible solo en modo drawing. <code>position: fixed</code>, bottom-left del viewport. Resetea drawingZoom y drawingPan.
				</p>
				<ResetViewPill />
				<p style={{ fontSize: 11, color: subtleColor, margin: '8px 0 0 0' }}>
					El pill usa <code>position: fixed</code> — aparece pegado al margen bottom-left del viewport global.
				</p>
			</Section>

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

			{/* ── SECTION 1l: Integrated UI V2 ── */}
			<IntegratedUIPreviewSection dark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />

			{/* ── SECTION 2: Icon Gallery ── */}
			<Section title={`Icons (${Object.keys(ICONS).length} total)`} dark={dark} bg={sectionBg} border={sectionBorder}>

				{Object.entries(ICON_SECTIONS).map(([title, names]) => (
					<IconGroup key={title} title={title} names={names} dark={dark} />
				))}

			</Section>

			<p style={{ fontSize: 10, color: subtleColor, marginTop: 32, textAlign: 'center' }}>
				Temporary dev page · ?preview=true · Will be removed in cleanup phase
			</p>
		</div>
	);
}
