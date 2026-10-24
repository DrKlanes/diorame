import React, { useState, useSyncExternalStore } from 'react';
import { DiMiniSlider, DiSegmentControl, DiChip } from '../../../design-system';
import { T, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { XEROX_MARKERS, XEROX_PAPERS, XEROX_PAPER_ORDER } from '../../../constants/superRisoXerox';
import type { SuperRisoPatch } from '../../../constants/superRiso';
import { getXeroxPalette, subscribeXeroxPalette, type XeroxMarker } from '../canvas/superRiso/xeroxPalette';
import type { XeroxSettings } from '../../../types/strataTypes';
import { Field, segmentWrap, pct, labelStyle, Divider } from './superRisoFields';

// Super Riso · Fotocopia — the lab's macro controls (Copiadora / Color a mano / Papel). The lab's fine-tuning has no
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
	// Marker picker: index of the marker being changed, -1 to add one, null closed.
	const [picking, setPicking] = useState<number | null>(null);
	const setX = (patch: Partial<XeroxSettings>) => set({ xerox: patch });
	const list: readonly XeroxMarker[] = palette?.list ?? [];
	const nameOf = (m: XeroxMarker) => m.id ? t(`fx.superRiso.xerox.marker.${m.id}`) : t('fx.superRiso.xerox.ownColor');
	// Editing the list switches to "A mano" with the markers on screen (lab xToManual).
	const toManual = (edit: (hexes: string[]) => string[]) => setX({ colors: 'manual', manual: edit(list.map(m => m.hex)).slice(0, 6) });
	const sectionTitle = (key: string) => <span style={{ ...labelStyle, color: dk(dark, T.dark, T.textDark) as string }}>{t(key)}</span>;

	return (
		<>
			{sectionTitle('fx.superRiso.xerox.copier')}
			<Field label={t('fx.superRiso.xerox.mode')} dark={dark} muted={muted}>
				<div style={segmentWrap(dark)}>
					<DiSegmentControl<XeroxSettings['mode']> dark={dark} small
						options={[{ value: 'line', label: t('fx.superRiso.xerox.mode.line') }, { value: 'photo', label: t('fx.superRiso.xerox.mode.photo') }]}
						value={x.mode} onChange={v => setX({ mode: v })} />
				</div>
			</Field>
			<Field label={t('fx.superRiso.xerox.dark')} value={pct(x.dark)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.dark} min={0} max={1} step={0.01} onChange={v => setX({ dark: v })} />
			</Field>
			<Field label={t('fx.superRiso.xerox.toner')} value={pct(x.toner)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.toner} min={0} max={1} step={0.01} onChange={v => setX({ toner: v })} />
			</Field>
			<Field label={t('fx.superRiso.xerox.gens')} value={String(x.gens)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.gens} min={1} max={6} step={1} onChange={v => setX({ gens: v })} />
			</Field>
			<Field label={t('fx.superRiso.xerox.dirt')} value={pct(x.dirt)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={x.dirt} min={0} max={1} step={0.01} onChange={v => setX({ dirt: v })} />
			</Field>

			<Divider dark={dark} />
			{sectionTitle('fx.superRiso.xerox.hand')}
			<div style={segmentWrap(dark)}>
				<DiSegmentControl<XeroxSettings['hand']> dark={dark} small
					options={(['none', 'marker', 'water'] as const).map(v => ({ value: v, label: t(`fx.superRiso.xerox.hand.${v}`) }))}
					value={x.hand} onChange={v => setX({ hand: v })} />
			</div>
			{x.hand !== 'none' && (
				<>
					<Field label={t('fx.superRiso.xerox.what')} dark={dark} muted={muted}>
						<div style={segmentWrap(dark)}>
							<DiSegmentControl<XeroxSettings['what']> dark={dark} small
								options={(['auto', 'color', 'fill'] as const).map(v => ({ value: v, label: t(`fx.superRiso.xerox.what.${v}`), tooltip: t(`fx.superRiso.xerox.what.${v}.tooltip`) }))}
								value={x.what} onChange={v => setX({ what: v })} />
						</div>
					</Field>
					{palette?.what === 'fill' && (
						<>
							<Field label={t('fx.superRiso.xerox.fillCover')} value={pct(x.fillCover)} dark={dark} muted={muted}>
								<DiMiniSlider dark={dark} value={x.fillCover} min={0.2} max={1} step={0.01} onChange={v => setX({ fillCover: v })} />
							</Field>
							<div style={{ display: 'flex' }}>
								<DiChip dark={dark} label={t('fx.superRiso.xerox.reroll')} onClick={() => setX({ fillSeed: x.fillSeed + 1 })} />
							</div>
						</>
					)}
					<Field label={t('fx.superRiso.xerox.colors')} value={palette?.unused ? t('fx.superRiso.xerox.unused', { n: palette.unused }) : undefined} dark={dark} muted={muted}>
						<div style={segmentWrap(dark)}>
							<DiSegmentControl<XeroxSettings['colors']> dark={dark} small
								options={(['own', 'markers', 'manual'] as const).map(v => ({ value: v, label: t(`fx.superRiso.xerox.colors.${v}`), tooltip: t(`fx.superRiso.xerox.colors.${v}.tooltip`) }))}
								value={x.colors} onChange={v => v === 'manual' ? toManual(h => h) : setX({ colors: v })} />
						</div>
					</Field>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
						{list.map((m, i) => (
							<div key={i} style={{ display: 'flex', gap: 2, minWidth: 0 }}>
								<DiChip dark={dark} swatch={m.hex} label={nameOf(m)} active={picking === i}
									tooltip={t('fx.superRiso.xerox.changeColor')} onClick={() => setPicking(picking === i ? null : i)} />
								{list.length > 1 && (
									<button onClick={() => { setPicking(null); toManual(h => h.filter((_, j) => j !== i)); }}
										onMouseDown={(e) => e.preventDefault()} aria-label={t('fx.superRiso.xerox.removeColor')}
										style={{ ...labelStyle, width: 18, flexShrink: 0, border: 'none', padding: 0, background: 'transparent', cursor: 'pointer', color: dk(dark, T.muted, T.textDarkMuted) as string }}>×</button>
								)}
							</div>
						))}
						{list.length > 0 && list.length < 6 && (
							<DiChip dark={dark} label={t('fx.superRiso.xerox.addColor')} active={picking === -1} onClick={() => setPicking(picking === -1 ? null : -1)} />
						)}
					</div>
					{picking !== null && (
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
							{XEROX_MARKERS.map(([id, hex]) => (
								<DiChip key={id} dark={dark} swatch={hex} active={picking >= 0 && list[picking]?.hex === hex}
									tooltip={t(`fx.superRiso.xerox.marker.${id}`)} ariaLabel={t(`fx.superRiso.xerox.marker.${id}`)}
									onClick={() => { const at = picking; setPicking(null); toManual(h => at < 0 ? [...h, hex] : h.map((v, j) => j === at ? hex : v)); }} />
							))}
						</div>
					)}
					<Field label={t('fx.superRiso.xerox.n')} value={String(x.n)} dark={dark} muted={muted}>
						<DiMiniSlider dark={dark} value={x.n} min={1} max={6} step={1} disabled={x.colors === 'manual'} onChange={v => setX({ n: v })} />
					</Field>
					<Field label={t('fx.superRiso.xerox.sloppy')} value={pct(x.sloppy)} dark={dark} muted={muted}>
						<DiMiniSlider dark={dark} value={x.sloppy} min={0} max={1} step={0.01} onChange={v => setX({ sloppy: v })} />
					</Field>
				</>
			)}

			<Divider dark={dark} />
			<Field label={t('fx.superRiso.paper')} value={x.paper === 'custom' ? undefined : t(`fx.superRiso.xerox.paper.${x.paper}`)} dark={dark} muted={muted}>
				<div style={{ display: 'flex', gap: 3 }}>
					{XEROX_PAPER_ORDER.map(p => (
						<DiChip key={p} dark={dark} active={x.paper === p} swatch={XEROX_PAPERS[p].paper}
							tooltip={t(`fx.superRiso.xerox.paper.${p}`)} ariaLabel={t(`fx.superRiso.xerox.paper.${p}`)}
							onClick={() => setX({ paper: p, paperHex: XEROX_PAPERS[p].paper })} />
					))}
				</div>
			</Field>
		</>
	);
}
