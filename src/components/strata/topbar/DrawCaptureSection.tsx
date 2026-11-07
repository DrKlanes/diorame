import React, { useMemo, useState } from 'react';
import { DiSegmentControl } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { setNextPNGQuality, setNextPNGBackground, setNextPNGFormatSize, setNextPNGDrawingLongSide, setNextPNGLayersZip } from '../canvas/exportHandlers';
import { drawingBounds } from '../canvas/drawingBounds';
import { formatPresets, presetFits, sizeForLongSide, DRAWING_LONG_SIDES, type FormatPreset } from '../../../utils/formatExport';
import type { ExportBackground } from '../../../types/strataTypes';
import { useTranslation } from '../../../i18n';
import { ExportGroupHeader } from './exportMenuParts';
import { TimelapseSection } from './TimelapseSection';
import { ExportHelper, ExportPrimary, ExportSizeList, type SizeItem } from './exportConfigParts';
import { exportedLayerCount } from '../canvas/layersZip';

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

// ── Remembered size per output and format (per-user convenience) ─────────────────

const SIZE_KEY = 'diorame-png-size-prefs';
const readSizes = (): Record<string, string> => {
	try { return JSON.parse(window.localStorage.getItem(SIZE_KEY) || '{}') ?? {}; } catch (_) { return {}; }
};

export type DrawFraming = 'format' | 'view' | 'drawing';
export type DrawOutput = 'png' | 'layers' | 'timelapse';

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
	const timelapse = output === 'timelapse';
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
		() => (open && mode === 'drawing' && !timelapse ? drawingBounds(state) : null),
		[open, mode, state.shapes, state.hiddenLayers, state.camera.z, state.currentLayerIndex,
			state.layerSpacingFactor, state.isAnimationMode, state.locked3DLayers, timelapse],
	);
	// Hooks stay above the timelapse early return below.
	const [sizePrefs, setSizePrefs] = useState<Record<string, string>>(readSizes);
	const layerCount = useMemo(() => (layers && open ? exportedLayerCount(state) : 0), // eslint-disable-line react-hooks/exhaustive-deps
		[layers, open, state.shapes, state.hiddenLayers, state.isAnimationMode, state.currentLayerIndex, state.locked3DLayers]);

	const handleDrawingCapture = (long: number) => {
		setNextPNGQuality('device');
		setNextPNGFormatSize(null);
		setNextPNGDrawingLongSide(long);
		setNextPNGLayersZip(layers);
		setNextPNGBackground(drawBackground());
		dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
		close();
	};

	const outputControl = (
		<>
			<ExportGroupHeader label={t('topbar.snapshot.output')} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<DrawOutput>
					options={[
						{ value: 'png', label: t('topbar.snapshot.output.png') },
						{ value: 'layers', label: t('topbar.snapshot.output.layers'), tooltip: t('topbar.snapshot.layersHint') },
						{ value: 'timelapse', label: t('topbar.snapshot.output.timelapse'), tooltip: t('topbar.timelapse.hint') },
					]}
					value={output}
					onChange={onOutput}
					dark={dark}
					small
				/>
			</div>
		</>
	);

	// «Timelapse (vídeo)» (v3.25.19): its own options and sizes (TimelapseSection); the framing is shared with the PNG.
	if (timelapse) {
		return (
			<>
				{outputControl}
				<TimelapseSection dark={dark} open={open} framing={mode} onFraming={onFraming} close={close} />
			</>
		);
	}

	// ── Size: a selectable control (segments up to three options, a radio list beyond), remembered per output/format ──
	const sizeKey = `${output}:${mode}${mode === 'format' && format ? `:${format.type}` : ''}`;
	const chooseSize = (id: string) => setSizePrefs(prev => {
		const next = { ...prev, [sizeKey]: id };
		try { window.localStorage.setItem(SIZE_KEY, JSON.stringify(next)); } catch (_) { /* not remembered */ }
		return next;
	});

	type Option = SizeItem & { label: string; size: string | null; run: () => void };
	const options: Option[] = [];
	if (mode === 'format' && format) {
		for (const p of formatPresets(format.type, format.orientation)) {
			const fits = presetFits(p);
			const size = `${p.width} × ${p.height} px`;
			options.push({
				id: p.id, label: p.name, size, disabled: !fits,
				title: p.ppi ? `${p.name} · ${t('topbar.snapshot.ppi', { n: p.ppi })}` : p.name,
				description: fits ? size : `${size} · ${t('topbar.snapshot.tooBig')}`,
				run: () => handleFormatCapture(p),
			});
		}
	} else if (mode === 'drawing' && drawingBox) {
		for (const long of DRAWING_LONG_SIDES) {
			const sz = sizeForLongSide(drawingBox, long);
			const fits = presetFits(sz);
			const size = `${sz.width} × ${sz.height} px`;
			options.push({
				id: String(long), label: `${long} px`, size, disabled: !fits,
				title: `${long} px`, description: fits ? size : `${size} · ${t('topbar.snapshot.tooBig')}`,
				run: () => handleDrawingCapture(long),
			});
		}
	} else if (mode === 'view') {
		for (const q of ['device', 'hq'] as const) {
			const label = t(q === 'device' ? 'topbar.snapshot.deviceSize' : 'topbar.snapshot.highQuality');
			options.push({ id: q, label, size: null, disabled: false, title: label, description: '', run: () => onViewCapture(q) });
		}
	}
	const chosen = options.find(o => o.id === sizePrefs[sizeKey] && !o.disabled) ?? options.find(o => !o.disabled) ?? null;
	const sizeText = chosen ? (chosen.size ?? chosen.label) : '';
	const bgText = t(`topbar.snapshot.bg.${background}`).toLowerCase();
	const summary = !chosen ? '' : layers
		? (layerCount === 1 ? t('topbar.snapshot.summaryLayer', { size: sizeText }) : t('topbar.snapshot.summaryLayers', { n: layerCount, size: sizeText }))
		: t('topbar.snapshot.summaryPng', { size: sizeText, bg: bgText });
	const tooBigNotes = options.filter(o => o.disabled && o.size).map(o => t('topbar.snapshot.tooBigSize', { size: o.label }));

	return (
		<>
			{outputControl}
			{/* Helper line: the same tokens as DiSelectorOption's description (e.g. «Super Riso ↗»), not a section label. */}
			{layers && <ExportHelper dark={dark}>{t('topbar.snapshot.layersHint')}</ExportHelper>}
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
			{options.length > 0 && <ExportGroupHeader label={t('topbar.snapshot.size')} dark={dark} />}
			{options.length > 3
				? <ExportSizeList items={options} value={chosen?.id ?? null} onChange={chooseSize} dark={dark} />
				: options.length > 0 && <div style={{ padding: '2px 10px 6px' }}>
					<DiSegmentControl<string>
						options={options.map(o => ({ value: o.id, label: o.label, disabled: o.disabled }))}
						value={chosen?.id ?? ''}
						onChange={chooseSize}
						dark={dark}
						small
					/>
				</div>}
			{tooBigNotes.map(n => <ExportHelper key={n} dark={dark}>{n}</ExportHelper>)}
			{mode === 'drawing' && !drawingBox && <ExportHelper dark={dark}>{t('topbar.snapshot.drawingEmpty')}</ExportHelper>}
			<ExportPrimary
				label={t(layers ? 'topbar.export.layersZip' : 'topbar.export.png')}
				summary={summary}
				disabled={!chosen}
				dark={dark}
				onExport={() => chosen?.run()}
			/>
		</>
	);
}
