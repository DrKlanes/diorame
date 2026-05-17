import React, { useState, useEffect, useRef } from 'react';
import { Ico, DiPill, DiVSep, DiMiniSlider, DiSegmentControl, DiPanel, ICONS } from '../design-system';
import { T, TYPE, dk } from '../design-system/tokens';
import { StrataProvider, useStrata, AppState } from '../components/strata/StrataContext';
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
import { ResetViewPill } from '../components/strata/viewport/ResetViewPill';
import { FXPanel } from '../components/strata/fx/FXPanel';
import { DiModal, WelcomeModalV2, ClearCanvasAlertV2, ComplexSceneModalV2, ExportProgressV2, OnboardingOverlayV2, MobileBlockScreenV2 } from '../components/strata/modals';
import type { ExportType } from '../components/strata/modals';
import { DiSelectorPopover, DiSelectorOption } from '../components/strata/popovers';

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
	const [dialogOpen, setDialogOpen] = useState(false);
	const [alertOpen, setAlertOpen] = useState(false);
	const [bannerOpen, setBannerOpen] = useState(false);
	const [popoverOpen, setPopoverOpen] = useState(false);
	const anchorRef = useRef<HTMLButtonElement>(null);
	const [welcomeOpen, setWelcomeOpen] = useState(false);
	const [clearCanvasOpen, setClearCanvasOpen] = useState(false);
	const [complexSceneOpen, setComplexSceneOpen] = useState(false);
	const [exportProgressType, setExportProgressType] = useState<ExportType | null>(null);
	const [onboardingOpen, setOnboardingOpen] = useState(false);
	const [mobileBlockOpen, setMobileBlockOpen] = useState(false);

	const handleLoadExample = async () => {
		await new Promise<void>(resolve => setTimeout(resolve, 800));
		console.log('Load example scene clicked');
		setWelcomeOpen(false);
	};

	const handleClearConfirm = () => {
		console.log('Clear canvas confirmed');
		setClearCanvasOpen(false);
	};

	const handleContinue = () => {
		console.log('Complex scene: continue with SVG');
		setComplexSceneOpen(false);
	};

	const handleUseCompressed = () => {
		console.log('Complex scene: use SVG Compressed');
		setComplexSceneOpen(false);
	};

	const triggerExport = (type: ExportType, durationMs: number) => {
		setExportProgressType(type);
		setTimeout(() => setExportProgressType(null), durationMs);
	};

	const handleOnboardingLoadExample = async () => {
		await new Promise<void>(resolve => setTimeout(resolve, 800));
		console.log('Load example from onboarding');
		setOnboardingOpen(false);
	};

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
			<LayersPreviewSection dark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />

			{/* ── SECTION 1h: FX Panel (live) ── */}
			<FXPreviewSection dark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />

			{/* ── SECTION 1j: DiModal ── */}
			<Section title="DiModal — compound component" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 16px 0' }}>
					3 variantes: <strong>dialog</strong> (dismiss con Esc/backdrop), <strong>alert</strong> (solo botones, sin Esc), <strong>banner</strong> (top-center, dismiss con Esc).
				</p>
				<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
					<button onClick={() => setDialogOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open Dialog
					</button>
					<button onClick={() => setAlertOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open Alert
					</button>
					<button onClick={() => setBannerOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open Banner
					</button>
					<button onClick={() => setWelcomeOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open WelcomeModal
					</button>
					<button onClick={() => setClearCanvasOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open Clear Canvas alert
					</button>
					<button onClick={() => setComplexSceneOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open Complex Scene dialog
					</button>
					<button onClick={() => triggerExport('png', 3000)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Trigger PNG export
					</button>
					<button onClick={() => triggerExport('mp4', 6000)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Trigger MP4 export
					</button>
					<button onClick={() => triggerExport('svg', 4000)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Trigger SVG export
					</button>
					<button onClick={() => triggerExport('svgz', 4000)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Trigger SVGZ export
					</button>
					<button onClick={() => setOnboardingOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open Onboarding
					</button>
					<button onClick={() => setMobileBlockOpen(true)} style={{ padding: '8px 16px', borderRadius: 20, border: `1px solid ${sectionBorder}`, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: headingColor, fontFamily: TYPE.manrope }}>
						Open MobileBlockScreen
					</button>
				</div>

				{/* Dialog variant */}
				<DiModal open={dialogOpen} onClose={() => setDialogOpen(false)} dark={dark} variant="dialog" size="md">
					<DiModal.Header title="Guardar cambios" />
					<DiModal.Body>
						¿Deseas guardar los cambios antes de salir? Los cambios no guardados se perderán.
					</DiModal.Body>
					<DiModal.Footer>
						<DiModal.TertiaryAction onClick={() => setDialogOpen(false)}>No guardar</DiModal.TertiaryAction>
						<DiModal.SecondaryAction onClick={() => setDialogOpen(false)}>Cancelar</DiModal.SecondaryAction>
						<DiModal.PrimaryAction onClick={() => setDialogOpen(false)}>Guardar</DiModal.PrimaryAction>
					</DiModal.Footer>
				</DiModal>

				{/* Alert variant */}
				<DiModal open={alertOpen} onClose={() => setAlertOpen(false)} dark={dark} variant="alert" size="sm">
					<DiModal.Header title="Borrar capa" showClose={false} />
					<DiModal.Body>
						Esta acción eliminará permanentemente la capa y todo su contenido. No se puede deshacer.
					</DiModal.Body>
					<DiModal.Footer>
						<DiModal.SecondaryAction onClick={() => setAlertOpen(false)}>Cancelar</DiModal.SecondaryAction>
						<DiModal.DestructiveAction onClick={() => setAlertOpen(false)}>Borrar capa</DiModal.DestructiveAction>
					</DiModal.Footer>
				</DiModal>

				{/* Banner variant */}
				<DiModal open={bannerOpen} onClose={() => setBannerOpen(false)} dark={dark} variant="banner" size="md">
					<DiModal.Header title="Exportación completada" />
					<DiModal.Body>
						El archivo se exportó como PNG en alta resolución (3840 × 2160 px).
					</DiModal.Body>
					<DiModal.Footer>
						<DiModal.TertiaryAction onClick={() => setBannerOpen(false)}>Cerrar</DiModal.TertiaryAction>
					</DiModal.Footer>
				</DiModal>

				{/* WelcomeModal v2 */}
				<WelcomeModalV2
					open={welcomeOpen}
					onClose={() => setWelcomeOpen(false)}
					onLoadExample={handleLoadExample}
					dark={dark}
				/>

				{/* ClearCanvasAlert v2 */}
				<ClearCanvasAlertV2
					open={clearCanvasOpen}
					onClose={() => setClearCanvasOpen(false)}
					onConfirm={handleClearConfirm}
					dark={dark}
				/>

				{/* ComplexScene dialog v2 */}
				<ComplexSceneModalV2
					open={complexSceneOpen}
					onClose={() => setComplexSceneOpen(false)}
					onContinue={handleContinue}
					onUseCompressed={handleUseCompressed}
					shapeCount={1243}
					dark={dark}
				/>

				{/* ExportProgress banner v2 */}
				<ExportProgressV2
					open={exportProgressType !== null}
					exportType={exportProgressType ?? 'png'}
					dark={dark}
				/>

				{/* OnboardingOverlay v2 */}
				<OnboardingOverlayV2
					open={onboardingOpen}
					onClose={() => setOnboardingOpen(false)}
					onLoadExample={handleOnboardingLoadExample}
					dark={dark}
				/>

				{/* MobileBlockScreen v2 — preview-only escape button overlaid at z=10000 */}
				{mobileBlockOpen && <MobileBlockScreenV2 />}
				{mobileBlockOpen && (
					<button
						onClick={() => setMobileBlockOpen(false)}
						style={{
							position:  'fixed',
							top:       16,
							right:     16,
							zIndex:    10000,
							padding:   '6px 14px',
							borderRadius: 20,
							border:    'none',
							background: 'rgba(0,0,0,0.55)',
							color:     '#fff',
							cursor:    'pointer',
							fontSize:  11,
							fontWeight: 600,
							fontFamily: TYPE.manrope,
						}}
					>
						× Close preview
					</button>
				)}
			</Section>

			{/* ── SECTION 1k: DiSelectorPopover ── */}
			<Section title="DiSelectorPopover" dark={dark} bg={sectionBg} border={sectionBorder}>
				<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 16px 0' }}>
					Popover anclado al trigger. Placement auto (detecta espacio arriba/abajo). Cierra con Esc, click-outside, o al seleccionar. Flechas + Tab navegan opciones.
				</p>
				<button
					ref={anchorRef}
					onClick={() => setPopoverOpen(v => !v)}
					style={{
						padding: '8px 16px',
						borderRadius: 20,
						border: `1px solid ${sectionBorder}`,
						background: popoverOpen ? dk(dark, T.light, T.hoverDark) : 'transparent',
						cursor: 'pointer',
						fontSize: 12,
						fontWeight: 600,
						color: headingColor,
						fontFamily: TYPE.manrope,
					}}
				>
					Export as…
				</button>
				<DiSelectorPopover
					anchorRef={anchorRef}
					open={popoverOpen}
					onClose={() => setPopoverOpen(false)}
					dark={dark}
					placement="auto"
					align="center"
				>
					<DiSelectorOption
						title="SVG"
						description="Vector format · standard size"
						onSelect={() => console.log('export svg')}
					/>
					<DiSelectorOption
						title="SVG (Compressed)"
						description="Vector format · smaller files"
						onSelect={() => console.log('export svgz')}
					/>
				</DiSelectorPopover>
			</Section>

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
					names={['eye', 'eye-off', 'layers', 'duplicate', 'trash', 'arrow-up', 'arrow-down', 'opacity', 'plus-layer', 'drag', 'blend-normal']}
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

// ─── Layers preview seed ────────────────────────────────────────────────────

const LAYER_SEED_STATE: Partial<AppState> = {
	mode: 'drawing',
	isUIHidden: false,
	totalLayers: 4,
	currentLayerIndex: 1,
	shapes: [
		{ id: 'seed-shape-0', points: [], color: '#e8433a', zIndex: 0 },
		{ id: 'seed-shape-1', points: [], color: '#384fbc', zIndex: -150 },
		{ id: 'seed-shape-2', points: [], color: '#2d9651', zIndex: -300 },
	],
	layerRenderModes: { 0: 'grad', 1: 'grad', 2: 'flat' },
	layerGradParams: {
		0: { angle: 90, intensity: 50, gradType: 'fade' },
		1: { angle: 45, intensity: 70, gradType: 'solid' },
	},
};

function LayersPreviewSection({ dark, subtleColor, sectionBg, sectionBorder }: {
	dark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const seedWithDark = { ...LAYER_SEED_STATE, isDarkMode: dark };
	return (
		<StrataProvider initialStateOverride={seedWithDark}>
			<LayersPreviewSectionContent parentDark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />
		</StrataProvider>
	);
}

function LayersPreviewSectionContent({ parentDark, subtleColor, sectionBg, sectionBorder }: {
	parentDark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		if (state.isDarkMode !== parentDark) {
			dispatch({ type: 'TOGGLE_DARK_MODE' } as any);
		}
	}, [parentDark]);

	return (
		<Section title="Layers Panel (live)" dark={parentDark} bg={sectionBg} border={sectionBorder}>
			<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
				Visible solo en modo drawing. 4 capas ficticias: Empty / Flat / Grad / Fade.
				Collapsed (pill vertical) → expanded (panel con lista FLIP animation). Persiste en localStorage.
			</p>
			<div style={{
				position: 'relative',
				width: '100%',
				height: 320,
				backgroundColor: dk(parentDark, 'rgb(248,247,243)', '#1a1a1a'),
				borderRadius: 12,
				overflow: 'hidden',
			}}>
				<LayersPanel />
			</div>
			<p style={{ fontSize: 11, color: subtleColor, margin: '8px 0 0 0' }}>
				LayerDotsRail usa <code>position: fixed</code> — aparece pegada al margen derecho del viewport global.
			</p>
			<LayerDotsRail />
		</Section>
	);
}

// ─── FX Panel preview seed ─────────────────────────────────────────────────────

const FX_SEED_STATE: Partial<AppState> = {
	mode: 'cinematic',
	isUIHidden: false,
	fxMasterEnabled: true,
	postProcessingEnabled: {
		grain: true,
		vignette: false,
		distortion: true,
		dof: true,
		wiggle: true,
		chromaticAberration: false,
		fog: false,
		particles: true,
		glow: false,
		riso: false,
		pixelArt: true,
		grunge: true,
	},
	postProcessing: {
		grain: 0.75,
		vignette: 0.5,
		distortion: -0.3,
		dof: 0.6,
		focusDist: 1500,
		focusTargetLayer: -1,
		chromaticAberration: 0.5,
		fog: 0.5,
		particles: 0.5,
		particleType: 'square',
		wiggle: 0.5,
		glow: 0.5,
		riso: 0.5,
		pixelArtSize: 6,
		pixelArtDepth: 8,
		pixelArtDither: 0.3,
		grungeIntensity: 1,
	},
};

function FXPreviewSection({ dark, subtleColor, sectionBg, sectionBorder }: {
	dark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const seedWithDark = { ...FX_SEED_STATE, isDarkMode: dark };
	return (
		<StrataProvider initialStateOverride={seedWithDark}>
			<FXPreviewSectionContent parentDark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />
		</StrataProvider>
	);
}

function FXPreviewSectionContent({ parentDark, subtleColor, sectionBg, sectionBorder }: {
	parentDark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		if (state.isDarkMode !== parentDark) {
			dispatch({ type: 'TOGGLE_DARK_MODE' } as any);
		}
	}, [parentDark]);

	return (
		<Section title="FX Panel collapsed (live)" dark={parentDark} bg={sectionBg} border={sectionBorder}>
			<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
				Visible solo en modo cinematic. 7 efectos activos cubriendo todas las variantes de tarjeta: Grain (nivel 1), Distortion (bipolar), Particles (composite), Wiggle y Grunge (discrete), Pixel Art (pixel), DoF (dof).
			</p>
			<div style={{
				position: 'relative',
				width: '100%',
				height: 700,
				backgroundColor: dk(parentDark, 'rgb(248,247,243)', '#1a1a1a'),
				borderRadius: 12,
				overflow: 'hidden',
			}}>
				<FXPanel />
			</div>
		</Section>
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
