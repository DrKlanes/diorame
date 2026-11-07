import React, { useEffect, useMemo, useState } from 'react';
import { DiSegmentControl } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { ExportPrimary } from './exportConfigParts';
import { ExportGroupHeader } from './exportMenuParts';
import { useTranslation } from '../../../i18n';
import { setNextTimelapse } from '../canvas/timelapseExport';
import { timelapseRect, timelapseSize, TIMELAPSE_DURATIONS, TIMELAPSE_HOLD_S, TIMELAPSE_LONG_SIDES, TIMELAPSE_RATES, type TimelapseBackground } from '../canvas/timelapse';
import { timelapseCodec, TIMELAPSE_FPS } from '../canvas/timelapseEncode';
import { isTouchDevice } from '../../../utils/formatExport';
import type { DrawFraming } from './DrawCaptureSection';

// The choices are remembered between exports (per-viewer convenience, like the PNG background).
const PREFS_KEY = 'diorame-timelapse-prefs';
type Prefs = { duration: number; background: TimelapseBackground; fps: number; long: number };
// v3.25.20: 15 fps (Diorame's stepped look); long side 1080 on touch devices (an iPad encodes 1920 several times slower), 1920 elsewhere.
const defaults = (): Prefs => ({ duration: TIMELAPSE_DURATIONS[0], background: 'paper', fps: TIMELAPSE_FPS, long: isTouchDevice() ? 1080 : 1920 });
const readPrefs = (): Prefs => {
	const d = defaults();
	try {
		const p = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}');
		return {
			duration: TIMELAPSE_DURATIONS.includes(p.duration) ? p.duration : d.duration,
			background: p.background === 'solid' ? 'solid' : 'paper',
			fps: TIMELAPSE_RATES.includes(p.fps) ? p.fps : d.fps,
			long: TIMELAPSE_LONG_SIDES.includes(p.long) ? p.long : d.long,
		};
	} catch (_) { return d; }
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
 * «Timelapse (vídeo)» in the DRAW Captura block (v3.25.19; Ritmo and Tamaño segments v3.25.20): duration, rate,
 * size (long side, aspect kept), background, framing, and one primary button that starts the export, with the real size under it (v3.25.21). Sizes are
 * probed with VideoEncoder.isConfigSupported (H.264) at the chosen rate: with none encodable the options are replaced
 * by a short note.
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

	// H.264 support per size and rate (undefined while probing).
	const [support, setSupport] = useState<Record<string, boolean>>({});
	const key = (s: { width: number; height: number }, fps: number) => `${s.width}x${s.height}@${fps}`;
	useEffect(() => {
		let alive = true;
		for (const s of sizes) {
			const k = key(s, prefs.fps);
			if (support[k] !== undefined) continue;
			timelapseCodec(s.width, s.height, prefs.fps).then(codec => { if (alive) setSupport(prev => ({ ...prev, [k]: codec !== null })); });
		}
		return () => { alive = false; };
	}, [sizes, prefs.fps]); // eslint-disable-line react-hooks/exhaustive-deps

	const probed = sizes.length > 0 && sizes.every(s => support[key(s, prefs.fps)] !== undefined);
	const unsupported = typeof VideoEncoder === 'undefined' || (probed && sizes.every(s => !support[key(s, prefs.fps)]));

	const helper: React.CSSProperties = {
		padding: '0 10px 6px',
		fontFamily: TYPE.numericValue.family,
		fontWeight: TYPE.numericValue.weight,
		fontSize: TYPE.numericValue.size,
		color: dk(dark, T.muted, T.textDarkMuted),
		lineHeight: 1.4,
	};

	if (unsupported) return <div style={helper}>{t('topbar.timelapse.unsupported')}</div>;

	const segment = <V extends string | number,>(label: string, options: { value: V; label: string }[], value: V, onChange: (v: V) => void) => (
		<>
			<ExportGroupHeader label={label} dark={dark} />
			<div style={{ padding: '2px 10px 6px' }}>
				<DiSegmentControl<V> options={options} value={value} onChange={onChange} dark={dark} small />
			</div>
		</>
	);
	const chosen = sizes.find(s => s.long === prefs.long);
	const ok = chosen ? support[key(chosen, prefs.fps)] : false;
	const seconds = (prefs.duration + TIMELAPSE_HOLD_S).toLocaleString(undefined, { maximumFractionDigits: 1 });
	const sizeText = chosen ? `${chosen.width} × ${chosen.height} px` : '';
	const start = () => {
		setNextTimelapse({ framing, duration: prefs.duration, long: prefs.long, background: prefs.background, fps: prefs.fps });
		dispatch({ type: 'REQUEST_EXPORT', payload: 'timelapse' });
		close();
	};

	return (
		<>
			<div style={helper}>{t('topbar.timelapse.hint')}</div>
			{segment(t('topbar.timelapse.duration'), TIMELAPSE_DURATIONS.map(d => ({ value: d, label: t('topbar.timelapse.seconds', { n: d }) })), prefs.duration, d => update({ duration: d }))}
			{segment(t('topbar.timelapse.rate'), TIMELAPSE_RATES.map(f => ({ value: f, label: t('topbar.timelapse.fps', { n: f }) })), prefs.fps, f => update({ fps: f }))}
			{segment(t('topbar.timelapse.size'), TIMELAPSE_LONG_SIDES.map(l => ({ value: l, label: `${l} px` })), prefs.long, l => update({ long: l }))}
			{segment<TimelapseBackground>(t('topbar.snapshot.background'), [
				{ value: 'paper', label: t('topbar.snapshot.bg.paper') },
				{ value: 'solid', label: t('topbar.snapshot.bg.solid') },
			], prefs.background, b => update({ background: b }))}
			{segment<DrawFraming>(t('topbar.snapshot.framing'), [
				...(state.format ? [{ value: 'format' as const, label: t('topbar.snapshot.framing.format') }] : []),
				{ value: 'view', label: t('topbar.snapshot.framing.view') },
				{ value: 'drawing', label: t('topbar.snapshot.framing.drawing') },
			], framing, onFraming)}
			{!rect && <div style={helper}>{t('topbar.snapshot.drawingEmpty')}</div>}
			<ExportPrimary
				label={t('topbar.export.video')}
				summary={ok === undefined ? `${sizeText} · ${t('topbar.timelapse.checking')}`
					: ok ? t('topbar.timelapse.rowDesc', { size: sizeText, fps: prefs.fps, secs: seconds })
					: `${sizeText} · ${t('topbar.timelapse.sizeUnsupported')}`}
				disabled={!rect || !ok}
				dark={dark}
				onExport={start}
			/>
		</>
	);
}
