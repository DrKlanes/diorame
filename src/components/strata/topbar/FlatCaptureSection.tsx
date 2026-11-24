import React, { useState } from 'react';
import { DiSegmentControl } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { setNextPNGQuality, setNextPNGFormatSize, setNextPNGDrawingLongSide, setNextPNGLayersZip } from '../canvas/exportHandlers';
import { formatPresets, presetFits, viewSnapshotSize } from '../../../utils/formatExport';
import { useTranslation } from '../../../i18n';
import { ExportGroupHeader } from './exportMenuParts';
import { ExportHelper, ExportPrimary, ExportSizeList, type SizeItem } from './exportConfigParts';

type FlatFraming = 'format' | 'view';

const SIZE_KEY = 'diorame-png-size-prefs';
const readSizes = (): Record<string, string> => {
	try { return JSON.parse(window.localStorage.getItem(SIZE_KEY) || '{}') ?? {}; } catch (_) { return {}; }
};

interface FlatCaptureSectionProps {
	dark: boolean;
	/** Vista: device / HQ — ExportPill's handler. */
	onViewCapture: (quality: 'device' | 'hq') => void;
	close: () => void;
}

/**
 * The «Captura» block of the export popover in the flat front view (CINEMA «Plana», v3.26.75;
 * docs/flat-view-proposal.md §3): DRAW's framings Formato (the frame at a preset size, when there is one) and Vista
 * (the screen, ×1 / HQ), with the FX, always on the paper — no background choice. «Dibujo completo» and «Capas (ZIP)»
 * stay in DRAW. Sizes are remembered under the same key as DRAW's, as `flat:<framing>`.
 */
export function FlatCaptureSection({ dark, onViewCapture, close }: FlatCaptureSectionProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const format = state.format;
	const [framing, setFraming] = useState<FlatFraming>('format');
	const mode: FlatFraming = framing === 'format' && !format ? 'view' : framing;
	const [sizePrefs, setSizePrefs] = useState<Record<string, string>>(readSizes);

	const sizeKey = `flat:${mode}${mode === 'format' && format ? `:${format.type}` : ''}`;
	const chooseSize = (id: string) => setSizePrefs(prev => {
		const next = { ...prev, [sizeKey]: id };
		try { window.localStorage.setItem(SIZE_KEY, JSON.stringify(next)); } catch (_) { /* not remembered */ }
		return next;
	});

	const handleFormatCapture = (width: number, height: number) => {
		setNextPNGQuality('device');
		setNextPNGFormatSize({ width, height });
		setNextPNGDrawingLongSide(null);
		setNextPNGLayersZip(false);
		dispatch({ type: 'REQUEST_EXPORT', payload: 'png' });
		close();
	};

	type Option = SizeItem & { label: string; size: string; run: () => void };
	const options: Option[] = [];
	if (mode === 'format' && format) {
		for (const p of formatPresets(format.type, format.orientation)) {
			const fits = presetFits(p);
			const size = `${p.width} × ${p.height} px`;
			options.push({
				id: p.id, label: p.name, size, disabled: !fits,
				title: p.ppi ? `${p.name} · ${t('topbar.snapshot.ppi', { n: p.ppi })}` : p.name,
				description: fits ? size : `${size} · ${t('topbar.snapshot.tooBig')}`,
				run: () => handleFormatCapture(p.width, p.height),
			});
		}
	} else {
		for (const q of ['device', 'hq'] as const) {
			const label = t(q === 'device' ? 'topbar.snapshot.deviceSize' : 'topbar.snapshot.highQuality');
			const vs = viewSnapshotSize(state.viewportSize, q);
			options.push({ id: q, label, size: `${vs.width} × ${vs.height} px`, disabled: false, title: label, description: '', run: () => onViewCapture(q) });
		}
	}
	const chosen = options.find(o => o.id === sizePrefs[sizeKey] && !o.disabled) ?? options.find(o => !o.disabled) ?? null;
	const summary = chosen ? t('topbar.snapshot.summaryPng', { size: chosen.size, bg: t('topbar.snapshot.bg.paper').toLowerCase() }) : '';
	const tooBigNotes = options.filter(o => o.disabled).map(o => t('topbar.snapshot.tooBigSize', { size: o.label }));

	return (
		<>
			<ExportHelper dark={dark}>{t('topbar.snapshot.flatPaperHint')}</ExportHelper>
			{format && <>
				<ExportGroupHeader label={t('topbar.snapshot.framing')} dark={dark} />
				<div style={{ padding: '2px 10px 6px' }}>
					<DiSegmentControl<FlatFraming>
						options={[
							{ value: 'format', label: t('topbar.snapshot.framing.format') },
							{ value: 'view', label: t('topbar.snapshot.framing.view') },
						]}
						value={mode}
						onChange={setFraming}
						dark={dark}
						small
					/>
				</div>
			</>}
			<ExportGroupHeader label={t('topbar.snapshot.size')} dark={dark} />
			{options.length > 3
				? <ExportSizeList items={options} value={chosen?.id ?? null} onChange={chooseSize} dark={dark} />
				: <div style={{ padding: '2px 10px 6px' }}>
					<DiSegmentControl<string>
						options={options.map(o => ({ value: o.id, label: o.label, disabled: o.disabled }))}
						value={chosen?.id ?? ''}
						onChange={chooseSize}
						dark={dark}
						small
					/>
				</div>}
			{tooBigNotes.map(n => <ExportHelper key={n} dark={dark}>{n}</ExportHelper>)}
			<ExportPrimary
				label={t('topbar.export.png')}
				summary={summary}
				disabled={!chosen}
				dark={dark}
				onExport={() => chosen?.run()}
			/>
		</>
	);
}
