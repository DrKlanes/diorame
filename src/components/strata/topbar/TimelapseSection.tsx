import React, { useEffect, useMemo, useState } from 'react';
import { DiSegmentControl } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { DiSelectorOption } from '../popovers';
import { ExportGroupHeader } from './exportMenuParts';
import { useTranslation } from '../../../i18n';
import { setNextTimelapse } from '../canvas/timelapseExport';
import { timelapseRect, timelapseSize, TIMELAPSE_DURATIONS, TIMELAPSE_HOLD_S, TIMELAPSE_LONG_SIDES, type TimelapseBackground } from '../canvas/timelapse';
import { timelapseCodec } from '../canvas/timelapseEncode';
import type { DrawFraming } from './DrawCaptureSection';

// Duration and background are remembered between exports (per-viewer convenience, like the PNG background).
const PREFS_KEY = 'diorame-timelapse-prefs';
type Prefs = { duration: number; background: TimelapseBackground };
const readPrefs = (): Prefs => {
	try {
		const p = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}');
		return {
			duration: TIMELAPSE_DURATIONS.includes(p.duration) ? p.duration : TIMELAPSE_DURATIONS[0],
			background: p.background === 'solid' ? 'solid' : 'paper',
		};
	} catch (_) { return { duration: TIMELAPSE_DURATIONS[0], background: 'paper' }; }
};
const savePrefs = (p: Prefs) => { try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (_) { /* not remembered */ } };

interface TimelapseSectionProps {
	dark: boolean;
	open: boolean;
	/** Formato / Vista / Dibujo completo, shared with the PNG output (already resolved: no Formato without a frame). */
	framing: DrawFraming;
	onFraming: (f: DrawFraming) => void;
	close: () => void;
}

/**
 * «Timelapse (vídeo)» in the DRAW Captura block (v3.25.19): duration, framing, background, and one row per size
 * (long side 1080 / 1920, aspect kept). Each row is probed with VideoEncoder.isConfigSupported (H.264): with no size
 * encodable the options are replaced by a short note.
 */
export function TimelapseSection({ dark, open, framing, onFraming, close }: TimelapseSectionProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const [prefs, setPrefs] = useState<Prefs>(readPrefs);
	const update = (p: Partial<Prefs>) => setPrefs(prev => { const next = { ...prev, ...p }; savePrefs(next); return next; });

	// «Dibujo completo» measures the ink (getLayerBoundingBox paints each layer): only while the menu shows it.
	const rect = useMemo(
		() => (open ? timelapseRect(state, framing, state.viewportSize) : null),
		[open, framing, state.shapes, state.hiddenLayers, state.camera.z, state.currentLayerIndex, state.layerSpacingFactor,
			state.isAnimationMode, state.locked3DLayers, state.format, state.drawingZoom, state.drawingPan, state.viewportSize],
	);
	const sizes = useMemo(() => (rect ? TIMELAPSE_LONG_SIDES.map(long => ({ long, ...timelapseSize(rect, long) })) : []), [rect]);

	// H.264 support per size (null while probing).
	const [support, setSupport] = useState<Record<string, boolean>>({});
	const key = (s: { width: number; height: number }) => `${s.width}x${s.height}`;
	useEffect(() => {
		let alive = true;
		for (const s of sizes) {
			if (support[key(s)] !== undefined) continue;
			timelapseCodec(s.width, s.height).then(codec => { if (alive) setSupport(prev => ({ ...prev, [key(s)]: codec !== null })); });
		}
		return () => { alive = false; };
	}, [sizes]); // eslint-disable-line react-hooks/exhaustive-deps

	const probed = sizes.length > 0 && sizes.every(s => support[key(s)] !== undefined);
	const unsupported = typeof VideoEncoder === 'undefined' || (probed && sizes.every(s => !support[key(s)]));

	const helper: React.CSSProperties = {
		padding: '0 10px 6px',
		fontFamily: TYPE.numericValue.family,
		fontWeight: TYPE.numericValue.weight,
		fontSize: TYPE.numericValue.size,
		color: dk(dark, T.muted, T.textDarkMuted),
		lineHeight: 1.4,
	};

	if (unsupported) return <div style={helper}>{t('topbar.timelapse.unsupported')}</div>;

	const start = (long: number) => {
		setNextTimelapse({ framing, duration: prefs.duration, long, background: prefs.background });
		dispatch({ type: 'REQUEST_EXPORT', payload: 'timelapse' });
		close();
	};
	const seconds = (prefs.duration + TIMELAPSE_HOLD_S).toLocaleString(undefined, { maximumFractionDigits: 1 });

	return (
		<>
			<div style={helper}>{t('topbar.timelapse.hint')}</div>
			<ExportGroupHeader label={t('topbar.timelapse.duration')} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<number>
					options={TIMELAPSE_DURATIONS.map(d => ({ value: d, label: t('topbar.timelapse.seconds', { n: d }) }))}
					value={prefs.duration}
					onChange={d => update({ duration: d })}
					dark={dark}
					small
				/>
			</div>
			<ExportGroupHeader label={t('topbar.snapshot.background')} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<TimelapseBackground>
					options={[
						{ value: 'paper', label: t('topbar.snapshot.bg.paper') },
						{ value: 'solid', label: t('topbar.snapshot.bg.solid') },
					]}
					value={prefs.background}
					onChange={b => update({ background: b })}
					dark={dark}
					small
				/>
			</div>
			<ExportGroupHeader label={t('topbar.snapshot.framing')} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<DrawFraming>
					options={[
						...(state.format ? [{ value: 'format' as const, label: t('topbar.snapshot.framing.format') }] : []),
						{ value: 'view', label: t('topbar.snapshot.framing.view') },
						{ value: 'drawing', label: t('topbar.snapshot.framing.drawing') },
					]}
					value={framing}
					onChange={onFraming}
					dark={dark}
					small
				/>
			</div>
			{!rect && <DiSelectorOption title={t('topbar.snapshot.drawingEmpty')} disabled onSelect={() => {}} />}
			{sizes.map(s => {
				const ok = support[key(s)];
				const size = `${s.width} × ${s.height} px`;
				return (
					<DiSelectorOption
						key={s.long}
						title={`${s.long} px`}
						description={ok === undefined ? `${size} · ${t('topbar.timelapse.checking')}`
							: ok ? t('topbar.timelapse.rowDesc', { size, secs: seconds })
							: `${size} · ${t('topbar.timelapse.sizeUnsupported')}`}
						disabled={!ok}
						onSelect={() => start(s.long)}
					/>
				);
			})}
		</>
	);
}
