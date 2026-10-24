import React, { useState, useSyncExternalStore } from 'react';
import { DiMiniSlider, DiSegmentControl, DiChip } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { XEROX_MARKERS } from '../../../constants/superRisoXerox';
import type { SuperRisoPatch } from '../../../constants/superRiso';
import { getXeroxPalette, subscribeXeroxPalette, type XeroxRow } from '../canvas/superRiso/xeroxPalette';
import { xOverFor } from '../canvas/superRiso/xeroxMarkers';
import type { XeroxSettings } from '../../../types/strataTypes';
import { Field, segmentWrap, pct, labelStyle, Divider } from './superRisoFields';

// Super Riso · Fotocopia — the lab's macro controls (Copiadora / Color a mano; Papel, Trama, Tamaño de trama, Suciedad and Resolución live in the shared «Ajustes de impresión» of SuperRisoBlock). The lab's fine-tuning has no
// sliders here: its values derive from these controls (canvas/superRiso/xeroxParams.ts), plus a style's fine overrides.

interface XeroxControlsProps {
	dark: boolean;
	muted: boolean;
	x: XeroxSettings;
	set: (patch: SuperRisoPatch) => void;
}

export function XeroxControls({ dark, muted, x, set }: XeroxControlsProps) {
	const { t } = useTranslation();
	const palette = useSyncExternalStore(subscribeXeroxPalette, getXeroxPalette);
	// Picker target: a colour zone of the drawing, a slot of the box (-1 adds one), or closed.
	type Target = { zone: string } | { box: number };
	const [picking, setPicking] = useState<Target | null>(null);
	const setX = (patch: Partial<XeroxSettings>) => set({ xerox: patch });
	const rows: readonly XeroxRow[] = palette?.rows ?? [];
	const what = palette?.what ?? (x.what === 'fill' ? 'fill' : 'color'), zones = palette?.zones ?? 0;
	const water = x.hand === 'water';
	const nameOf = (m: XeroxRow) => m.id ? t(`fx.superRiso.xerox.marker.${m.id}`) : t('fx.superRiso.xerox.ownColor');
	const isPicking = (v: string | number) => !!picking && (typeof v === 'string' ? 'zone' in picking && picking.zone === v : 'box' in picking && picking.box === v);
	const count = x.hand === 'none' ? t('fx.superRiso.xerox.bw') : what === 'fill' ? t('fx.superRiso.xerox.inBox', { n: rows.length }) : t('fx.superRiso.xerox.colorsN', { n: rows.length });
	// An override is tied to the nearest zone colour (xOverFor), so editing a row only touches that zone's entry.
	const withoutZone = (zone: string) => { const out = { ...x.over }, k = xOverFor(x.over, zone); if (k) delete out[k]; return out; };
	const resetZone = (zone: string) => setX({ over: withoutZone(zone) });
	const pick = (hex: string) => {
		const tgt = picking; setPicking(null); if (!tgt) return;
		if ('zone' in tgt) setX({ over: { ...withoutZone(tgt.zone), [tgt.zone]: hex } });
		else { const box = rows.map(q => q.hex); if (tgt.box < 0) box.push(hex); else box[tgt.box] = hex; setX({ box: box.slice(0, 6) }); }
	};
	const sectionTitle = (key: string) => <span style={{ ...labelStyle, color: dk(dark, T.dark, T.textDark) as string }}>{t(key)}</span>;

	return (
		<>
			{sectionTitle('fx.superRiso.xerox.copier')}
			<Field label={t('fx.superRiso.xerox.dark')} value={pct(x.dark)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.dark} min={0} max={1} step={0.01} onChange={v => setX({ dark: v })} />
			</Field>
			<Field label={t('fx.superRiso.xerox.toner')} value={pct(x.toner)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.toner} min={0} max={1} step={0.01} onChange={v => setX({ toner: v })} />
			</Field>
			<Field label={t('fx.superRiso.xerox.gens')} value={String(x.gens)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.gens} min={1} max={6} step={1} onChange={v => setX({ gens: v })} />
			</Field>

			<Divider dark={dark} />
			<Field label={t('fx.superRiso.xerox.hand')} value={count} dark={dark} muted={muted}>
				<div style={segmentWrap(dark)}>
					<DiSegmentControl<XeroxSettings['hand']> dark={dark} small
						options={(['none', 'marker', 'water'] as const).map(v => ({ value: v, label: t(`fx.superRiso.xerox.hand.${v}`) }))}
						value={x.hand} onChange={v => { setPicking(null); setX({ hand: v }); }} />
				</div>
			</Field>
			{x.hand !== 'none' && (
				<>
					<Field label={t('fx.superRiso.xerox.what')} dark={dark} muted={muted}>
						<div style={segmentWrap(dark)}>
							<DiSegmentControl<'color' | 'fill'> dark={dark} small
								options={(['color', 'fill'] as const).map(v => ({ value: v, label: t(`fx.superRiso.xerox.what.${v}`), tooltip: t(`fx.superRiso.xerox.what.${v}.tooltip`) }))}
								value={what} onChange={v => { setPicking(null); setX({ what: v }); }} />
						</div>
					</Field>
					{what === 'fill' ? (
						<>
							<Field label={t('fx.superRiso.xerox.fillCover')} value={pct(x.fillCover)} dark={dark} muted={muted}>
								<DiMiniSlider dark={dark} value={x.fillCover} min={0.2} max={1} step={0.01} onChange={v => setX({ fillCover: v })} />
							</Field>
							<div style={{ display: 'flex' }}>
								<DiChip dark={dark} label={t('fx.superRiso.xerox.reroll')} onClick={() => setX({ fillSeed: x.fillSeed + 1 })} />
							</div>
							<Field label={t(`fx.superRiso.xerox.box.${water ? 'water' : 'marker'}`)} dark={dark} muted={muted}>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
									{rows.map((r, i) => (
										<div key={i} style={{ display: 'flex', gap: 2, minWidth: 0 }}>
											<DiChip dark={dark} swatch={r.hex} label={nameOf(r)} active={isPicking(i)}
												tooltip={t('fx.superRiso.xerox.changeColor')} onClick={() => setPicking(isPicking(i) ? null : { box: i })} />
											{rows.length > 1 && (
												<button onClick={() => { setPicking(null); setX({ box: rows.map(q => q.hex).filter((_, j) => j !== i) }); }}
													onMouseDown={(e) => e.preventDefault()} aria-label={t('fx.superRiso.xerox.removeColor')}
													style={{ ...labelStyle, width: 18, flexShrink: 0, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', color: dk(dark, T.muted, T.textDarkMuted) as string }}>×</button>
											)}
										</div>
									))}
									{rows.length < 6 && (
										<DiChip dark={dark} label={t('fx.superRiso.xerox.addToBox')} active={isPicking(-1)} onClick={() => setPicking(isPicking(-1) ? null : { box: -1 })} />
									)}
								</div>
							</Field>
						</>
					) : (
						<>
							<Field label={t('fx.superRiso.xerox.colors')} dark={dark} muted={muted}>
								<div style={segmentWrap(dark)}>
									<DiSegmentControl<XeroxSettings['pal']> dark={dark} small
										options={[
											{ value: 'own', label: t('fx.superRiso.xerox.pal.own'), tooltip: t('fx.superRiso.xerox.pal.own.tooltip') },
											{ value: 'kit', label: t(`fx.superRiso.xerox.pal.${water ? 'water' : 'marker'}`), tooltip: t('fx.superRiso.xerox.pal.kit.tooltip') },
										]}
										value={x.pal} onChange={v => { setPicking(null); setX({ pal: v, over: {} }); }} />
								</div>
							</Field>
							{zones === 0 ? (
								<span style={{ fontFamily: TYPE.controlLabel.family, fontWeight: 500, fontSize: TYPE.numericValue.size, lineHeight: 1.35, color: dk(dark, T.muted, T.textDarkMuted) }}>{t('fx.superRiso.xerox.noZones')}</span>
							) : (
								<>
									<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
										{rows.map(r => (
											<div key={r.zone} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
												<span title={t('fx.superRiso.xerox.zone')} style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: r.zone, boxShadow: `inset 0 0 0 1px ${dk(dark, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.35)')}` }} />
												<span aria-hidden style={{ ...labelStyle, color: dk(dark, T.muted, T.textDarkMuted) as string }}>→</span>
												<DiChip dark={dark} swatch={r.hex} label={nameOf(r)} active={isPicking(r.zone!)}
													tooltip={t('fx.superRiso.xerox.changeZone')} onClick={() => setPicking(isPicking(r.zone!) ? null : { zone: r.zone! })} />
												{r.over && (
													<button onClick={() => { setPicking(null); resetZone(r.zone!); }} onMouseDown={(e) => e.preventDefault()}
														aria-label={t('fx.superRiso.xerox.resetZone')} title={t('fx.superRiso.xerox.resetZone')}
														style={{ ...labelStyle, width: 18, flexShrink: 0, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', color: T.purple }}>↺</button>
												)}
											</div>
										))}
									</div>
									<Field label={t('fx.superRiso.xerox.n')} value={t('fx.superRiso.xerox.nOf', { n: rows.length, m: Math.min(6, zones) })} dark={dark} muted={muted}>
										<DiMiniSlider dark={dark} value={Math.min(x.n, Math.min(6, zones))} min={1} max={Math.max(2, Math.min(6, zones))} step={1} disabled={zones <= 1} onChange={v => setX({ n: v })} />
									</Field>
								</>
							)}
						</>
					)}
					{picking !== null && (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
							{XEROX_MARKERS.map(([id, hex]) => (
								<DiChip key={id} dark={dark} swatch={hex} tooltip={t(`fx.superRiso.xerox.marker.${id}`)} ariaLabel={t(`fx.superRiso.xerox.marker.${id}`)}
									onClick={() => pick(hex)} />
							))}
						</div>
					)}
					<Field label={t('fx.superRiso.xerox.sloppy')} value={pct(x.sloppy)} dark={dark} muted={muted}>
						<DiMiniSlider dark={dark} value={x.sloppy} min={0} max={1} step={0.01} onChange={v => setX({ sloppy: v })} />
					</Field>
				</>
			)}

		</>
	);
}
