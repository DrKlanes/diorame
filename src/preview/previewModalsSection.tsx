import React, { useState, useRef } from 'react';
import { T, TYPE, dk } from '../design-system/tokens';
import { DiModal, WelcomeModalV2, ClearCanvasAlertV2, ComplexSceneModalV2, ExportProgressV2, OnboardingOverlayV2, MobileBlockScreenV2 } from '../components/strata/modals';
import type { ExportType } from '../components/strata/modals';
import { DiSelectorPopover, DiSelectorOption } from '../components/strata/popovers';
import { Section, Subsection, LabelledItem } from './previewHelpers';

export function PreviewModalsSection({ dark, headingColor, subtleColor, sectionBg, sectionBorder }: {
	dark: boolean; headingColor: string; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
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

	return (
		<>
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
		</>
	);
}
