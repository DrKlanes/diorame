import React, { useMemo } from 'react';
import { DiSegmentControl } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { DiSelectorOption } from '../popovers';
import { setNextPNGQuality, setNextPNGBackground, setNextPNGFormatSize, setNextPNGDrawingLongSide, setNextPNGLayersZip } from '../canvas/exportHandlers';
import { drawingBounds } from '../canvas/drawingBounds';
import { formatPresets, presetFits, sizeForLongSide, DRAWING_LONG_SIDES, type FormatPreset } from '../../../utils/formatExport';
import type { ExportBackground } from '../../../types/strataTypes';
import { useTranslation } from '../../../i18n';
import { ExportGroupHeader } from './exportMenuParts';

// ── DRAW PNG background: remembered between exports (per-user convenience) ─────

const PNG_BG_KEY = 'diorame-png-background';

export const readPngBackground = (): ExportBackground => {
	try {
		const v = window.localStorage.getItem(PNG_BG_KEY);
		if (v === 'paper' || v === 'solid' || v === 'transparent') return v;
	} catch (_) { /* private mode / storage blocked: just the default */ }
	return 'paper';
};

export const savePngBackground = (bg: ExportBackground): void => {
	try { window.localStorage.setItem(PNG_BG_KEY, bg); } catch (_) { /* not remembered this time */ }
};

export type DrawFraming = 'format' | 'view' | 'drawing';
export type DrawOutput = 'png' | 'layers';

interface DrawCaptureSectionProps {
	dark: boolean;
	/** The popover is open (the section also renders during its closing animation). */
	open: boolean;
	output: DrawOutput;
	onOutput: (o: DrawOutput) => void;
	background: ExportBackground;
	onBackground: (bg: ExportBackground) => void;
	framing: DrawFraming;
	onFraming: (f: DrawFraming) => void;
	/** Vista: device / HQ — ExportPill's handler, shared with CINEMA. */
	onViewCapture: (quality: 'device' | 'hq') => void;
	close: () => void;
}

/**
 * The DRAW «Captura» block of the export popover (out of ExportPill.tsx in v3.25.12, no behaviour change):
 * Salida (PNG / Capas ZIP), Fondo, Encuadre (Formato / Vista / Dibujo completo) and the sizes of each.
 * The choices themselves live in ExportPill so they survive folding the block (as before the split).
 */
export function DrawCaptureSection({
	dark, open, output, onOutput, background, onBackground, framing, onFraming, onViewCapture, close,
}: DrawCaptureSectionProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const layers = output === 'layers';
	const drawBackground = (): ExportBackground => (layers ? 'transparent' : background);

	// DRAW PNG of the format frame at a preset size
	const handleFormatCapture = (p: FormatPreset) => {
		setNextPNGQuality('device');
		setNextPNGFormatSize({ width: p.width, height: p.height });
		setNextPNGDrawingLongSide(null);
		setNextPNGLayersZip(layers);
		setNextPNGBackground(drawBackground());
		dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
		close();
	};
	const format = state.format;
	// Formato exists only with a frame: without one the menu's default ('format') reads as Vista.
	const mode = framing === 'format' && !format ? 'view' : framing;

	// «Dibujo completo» (v3.25.9): the box of the visible ink in the live projection, measured only while that
	// mode is on screen (getLayerBoundingBox paints each layer to measure its ink).
	const drawingBox = useMemo(
		() => (open && mode === 'drawing' ? drawingBounds(state) : null),
		[open, mode, state.shapes, state.hiddenLayers, state.camera.z, state.currentLayerIndex,
			state.layerSpacingFactor, state.isAnimationMode, state.locked3DLayers],
	);
	const handleDrawingCapture = (long: number) => {
		setNextPNGQuality('device');
		setNextPNGFormatSize(null);
		setNextPNGDrawingLongSide(long);
		setNextPNGLayersZip(layers);
		setNextPNGBackground(drawBackground());
		dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
		close();
	};

	return (
		<>
			<ExportGroupHeader label={t('topbar.snapshot.output')} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<DrawOutput>
					options={[
						{ value: 'png', label: t('topbar.snapshot.output.png') },
						{ value: 'layers', label: t('topbar.snapshot.output.layers'), tooltip: t('topbar.snapshot.layersHint') },
					]}
					value={output}
					onChange={onOutput}
					dark={dark}
					small
				/>
			</div>
			{layers && <ExportGroupHeader label={t('topbar.snapshot.layersHint')} dark={dark} />}
			{!layers && <ExportGroupHeader label={t('topbar.snapshot.background')} dark={dark} />}
			{!layers && <div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<ExportBackground>
					options={[
						{ value: 'paper', label: t('topbar.snapshot.bg.paper') },
						{ value: 'solid', label: t('topbar.snapshot.bg.solid') },
						{ value: 'transparent', label: t('topbar.snapshot.bg.transparent') },
					]}
					value={background}
					onChange={onBackground}
					dark={dark}
					small
				/>
			</div>}
			<ExportGroupHeader label={t('topbar.snapshot.framing')} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<DrawFraming>
					options={[
						...(format ? [{ value: 'format' as const, label: t('topbar.snapshot.framing.format') }] : []),
						{ value: 'view', label: t('topbar.snapshot.framing.view') },
						{ value: 'drawing', label: t('topbar.snapshot.framing.drawing') },
					]}
					value={mode}
					onChange={onFraming}
					dark={dark}
					small
				/>
			</div>
			{mode === 'format' && format && formatPresets(format.type, format.orientation).map(p => {
				const fits = presetFits(p);
				const size = `${p.width} × ${p.height} px`;
				return (
					<DiSelectorOption
						key={p.id}
						title={p.ppi ? `${p.name} · ${t('topbar.snapshot.ppi', { n: p.ppi })}` : p.name}
						description={fits ? size : `${size} · ${t('topbar.snapshot.tooBig')}`}
						disabled={!fits}
						onSelect={() => handleFormatCapture(p)}
					/>
				);
			})}
			{mode === 'drawing' && (drawingBox ? DRAWING_LONG_SIDES.map(long => {
				const sz = sizeForLongSide(drawingBox, long);
				const fits = presetFits(sz);
				const size = `${sz.width} × ${sz.height} px`;
				return (
					<DiSelectorOption
						key={long}
						title={`${long} px`}
						description={fits ? size : `${size} · ${t('topbar.snapshot.tooBig')}`}
						disabled={!fits}
						onSelect={() => handleDrawingCapture(long)}
					/>
				);
			}) : (
				<DiSelectorOption title={t('topbar.snapshot.drawingEmpty')} disabled onSelect={() => {}} />
			))}
			{mode === 'view' && (
				<>
					<DiSelectorOption title={t('topbar.snapshot.deviceSize')} onSelect={() => onViewCapture('device')} />
					<DiSelectorOption title={t('topbar.snapshot.highQuality')} onSelect={() => onViewCapture('hq')} />
				</>
			)}
		</>
	);
}
