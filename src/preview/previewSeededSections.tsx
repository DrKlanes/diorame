import { SUPER_RISO_DEFAULTS } from '../constants/superRiso';
import React, { useEffect } from 'react';
import { T, TYPE, dk } from '../design-system/tokens';
import { StrataProvider, useStrata, AppState } from '../components/strata/StrataContext';
import { ColorPalette } from '../components/strata/colorpalette/ColorPalette';
import { LayersPanel } from '../components/strata/layers/LayersPanel';
import { LayerDotsRail } from '../components/strata/layers/LayerDotsRail';
import { ResetViewPill } from '../components/strata/viewport/ResetViewPill';
import { FXPanel } from '../components/strata/fx/FXPanel';
import { TextSessionPanel } from '../components/strata/text/TextSessionPanel';
import { ControlsV2 } from '../components/strata/ControlsV2';
import { Section } from './previewHelpers';

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
		0: { angle: 90, intensity: 0.5, gradType: 'fade' },
		1: { angle: 45, intensity: 0.7, gradType: 'solid' },
	},
};

export function LayersPreviewSection({ dark, subtleColor, sectionBg, sectionBorder }: {
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
		superRiso: false,
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
		superRiso: SUPER_RISO_DEFAULTS,
	},
};

export function FXPreviewSection({ dark, subtleColor, sectionBg, sectionBorder }: {
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

// ─── Text Session preview seed ─────────────────────────────────────────────────────

const TEXT_SEED_STATE: Partial<AppState> = {
	mode: 'drawing',
	tool: 'text',
	textSession: {
		isActive: true,
		x: 0,
		y: 0,
		content: 'Diorame',
		font: 'noir',
		align: 'left',
	},
};

export function TextSessionPreviewSection({ dark, subtleColor, sectionBg, sectionBorder }: {
	dark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const seedWithDark = { ...TEXT_SEED_STATE, isDarkMode: dark };
	return (
		<StrataProvider initialStateOverride={seedWithDark}>
			<TextSessionPreviewSectionContent parentDark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />
		</StrataProvider>
	);
}

function TextSessionPreviewSectionContent({ parentDark, subtleColor, sectionBg, sectionBorder }: {
	parentDark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		if (state.isDarkMode !== parentDark) {
			dispatch({ type: 'TOGGLE_DARK_MODE' } as any);
		}
	}, [parentDark]);

	return (
		<Section title="Text Session Panel (live)" dark={parentDark} bg={sectionBg} border={sectionBorder}>
			<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
				Visible solo cuando textSession.isActive = true. 5 fuentes, 3 alineaciones, textarea con contador, Cancel + Done.
			</p>
			{!state.textSession.isActive && (
				<button
					onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { isActive: true, content: 'Diorame', font: 'noir', align: 'left' } } as any)}
					style={{
						marginBottom: 12,
						padding: '6px 16px',
						borderRadius: 20,
						border: `1px solid ${dk(parentDark, T.border, T.borderDark)}`,
						background: 'transparent',
						cursor: 'pointer',
						fontSize: 12,
						fontWeight: 600,
						color: dk(parentDark, T.dark, T.textDark),
						fontFamily: TYPE.manrope,
					}}
				>
					Activate text session
				</button>
			)}
			<div style={{
				width: '100%',
				minHeight: 220,
				backgroundColor: dk(parentDark, 'rgb(248,247,243)', '#1a1a1a'),
				borderRadius: 12,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
				boxSizing: 'border-box',
			}}>
				<TextSessionPanel dark={parentDark} />
			</div>
		</Section>
	);
}

// ─── Integrated UI V2 preview seed ───────────────────────────────────────────

const INTEGRATED_SEED_STATE: Partial<AppState> = {
	mode: 'drawing',
	tool: 'blob',
	totalLayers: 3,
	currentLayerIndex: 1,
	shapes: [
		{ id: 'int-0', points: [], color: '#e8433a', zIndex: 0 },
		{ id: 'int-1', points: [], color: '#384fbc', zIndex: -150 },
	],
	layerRenderModes: { 0: 'grad', 1: 'flat' },
	layerGradParams: { 0: { angle: 90, intensity: 0.5, gradType: 'fade' } },
};

export function IntegratedUIPreviewSection({ dark, subtleColor, sectionBg, sectionBorder }: {
	dark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const seedWithDark = { ...INTEGRATED_SEED_STATE, isDarkMode: dark };
	return (
		<StrataProvider initialStateOverride={seedWithDark}>
			<IntegratedUIPreviewSectionContent parentDark={dark} subtleColor={subtleColor} sectionBg={sectionBg} sectionBorder={sectionBorder} />
		</StrataProvider>
	);
}

function IntegratedUIPreviewSectionContent({ parentDark, subtleColor, sectionBg, sectionBorder }: {
	parentDark: boolean; subtleColor: string; sectionBg: string; sectionBorder: string;
}) {
	const { state, dispatch } = useStrata();

	useEffect(() => {
		if (state.isDarkMode !== parentDark) {
			dispatch({ type: 'TOGGLE_DARK_MODE' } as any);
		}
	}, [parentDark]);

	return (
		<Section title="Integrated UI V2 (live)" dark={parentDark} bg={sectionBg} border={sectionBorder}>
			<p style={{ fontSize: 11, color: subtleColor, margin: '0 0 12px 0' }}>
				UI V2 completa ensamblada. Cambia de modo con ModeSwitchPill (draw/view). LayersPanel, ColorPalette y FX se muestran según modo.
				LayerDotsRail + ResetViewPill usan <code>position:fixed</code> — aparecen pegados al borde del viewport.
			</p>
			<div style={{
				position: 'relative',
				width: '100%',
				height: 600,
				backgroundColor: dk(parentDark, 'rgb(248,247,243)', '#1a1a1a'),
				borderRadius: 12,
				overflow: 'hidden',
			}}>
				<ControlsV2 />
			</div>
		</Section>
	);
}
