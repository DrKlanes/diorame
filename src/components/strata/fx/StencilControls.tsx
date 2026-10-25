import React, { useState, useSyncExternalStore } from 'react';
import { DiMiniSlider, DiSegmentControl, DiChip } from '../../../design-system';
import { T, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { STENCIL_SPRAYS, stencilSprayId } from '../../../constants/superRisoStencil';
import type { SuperRisoPatch } from '../../../constants/superRiso';
import { getStencilPalette, subscribeStencilPalette, type StencilRow } from '../canvas/superRiso/xeroxPalette';
import type { StencilSettings } from '../../../types/strataTypes';
import { Field, segmentWrap, pct, labelStyle, Divider } from './superRisoFields';

// Super Riso · Stencil — the lab's visible controls (Plantillas / Spray / Colores), same anatomy as XeroxControls.
// Support, its texture, droplet size, sloppiness and resolution live in the shared «Ajustes de impresión» of
// SuperRisoBlock. The lab's fine-tuning has no sliders here: its values derive from these controls (stencilParams.ts).

interface StencilControlsProps {
	dark: boolean;
	muted: boolean;
	s: StencilSettings;
	set: (patch: SuperRisoPatch) => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function StencilControls({ dark, muted, s, set }: StencilControlsProps) {
	const { t } = useTranslation();
	const layers: readonly StencilRow[] = useSyncExternalStore(subscribeStencilPalette, getStencilPalette) ?? [];
	// Spray picker: a template row (index), the cloud, or closed.
	const [picking, setPicking] = useState<number | 'cloud' | null>(null);
	const setS = (patch: Partial<StencilSettings>) => set({ stencil: patch });
	const sectionTitle = (key: string, value?: string) => (
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
			<span style={{ ...labelStyle, color: dk(dark, T.dark, T.textDark) as string }}>{t(key)}</span>
			{value && <span style={{ ...labelStyle, color: muted ? dk(dark, T.muted, T.textDarkMuted) as string : T.purple }}>{value}</span>}
		</div>
	);
	const yesNo = (value: boolean, onChange: (v: boolean) => void) => (
		<div style={segmentWrap(dark)}>
			<DiSegmentControl<'no' | 'yes'> dark={dark} small
				options={[{ value: 'no', label: t('fx.superRiso.stencil.no') }, { value: 'yes', label: t('fx.superRiso.stencil.yes') }]}
				value={value ? 'yes' : 'no'} onChange={v => onChange(v === 'yes')} />
		</div>
	);
	const slider = (key: string, field: 'dark' | 'load' | 'lift' | 'over' | 'drips' | 'splat') => (
		<Field label={t(key)} value={pct(s[field])} dark={dark} muted={muted}>
			<DiMiniSlider dark={dark} value={s[field]} min={0} max={1} step={0.01} onChange={v => setS({ [field]: v })} />
		</Field>
	);
	const sprayName = (hex: string) => { const id = stencilSprayId(hex); return id ? t(`fx.superRiso.stencil.spray.${id}`) : t('fx.superRiso.stencil.fromDrawing'); };
	let colour = 0, tone = 0;
	const layerName = (l: StencilRow) => l.kind === 3 ? t('fx.superRiso.stencil.layer.accent') : l.kind === 2 ? t('fx.superRiso.stencil.layer.black')
		: l.kind === 1 ? t('fx.superRiso.stencil.layer.color', { n: ++colour }) : t('fx.superRiso.stencil.layer.tone', { n: ++tone });
	const rows = layers.map((l, i) => ({ name: layerName(l), hex: l.hex, target: i as number | 'cloud' }));
	if (s.cloud === 'color') rows.push({ name: t('fx.superRiso.stencil.layer.cloud'), hex: s.cloudHex, target: 'cloud' });
	const count = s.mode === 'tone' ? (s.n === 1 ? t('fx.superRiso.stencil.one') : t('fx.superRiso.stencil.many', { n: s.n })) : t('fx.superRiso.stencil.many', { n: s.n + 1 });
	// Only that row changes (lab openSpray): the whole list goes to `manual` with this entry replaced.
	const pick = (hex: string) => {
		const tgt = picking; setPicking(null);
		if (tgt === 'cloud') setS({ cloudHex: hex });
		else if (tgt !== null) setS({ manual: layers.map((l, i) => i === tgt ? hex : l.hex) });
	};

	return (
		<>
			{sectionTitle('fx.superRiso.stencil.templates', count)}
			<div style={segmentWrap(dark)}>
				<DiSegmentControl<StencilSettings['mode']> dark={dark} small
					options={[{ value: 'tone', label: t('fx.superRiso.stencil.mode.tone') }, { value: 'color', label: t('fx.superRiso.stencil.mode.color') }]}
					value={s.mode} onChange={v => setS({ mode: v, manual: [], n: v === 'color' ? Math.min(3, s.n) : s.n })} />
			</div>
			<Field label={t(s.mode === 'color' ? 'fx.superRiso.stencil.nColor' : 'fx.superRiso.stencil.n')} value={String(s.n)} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={s.n} min={1} max={s.mode === 'color' ? 3 : 4} step={1} onChange={v => setS({ n: v, manual: [] })} />
			</Field>
			{slider('fx.superRiso.xerox.dark', 'dark')}
			<Field label={t('fx.superRiso.stencil.cut')} value={`${lerp(.3, 4, Math.pow(s.cut, 1.5)).toFixed(1)} mm`} dark={dark} muted={muted}>
				<DiMiniSlider dark={dark} value={s.cut} min={0} max={1} step={0.01} onChange={v => setS({ cut: v })} />
			</Field>
			<Field label={t('fx.superRiso.stencil.bridges')} dark={dark} muted={muted}>
				{yesNo(s.bridges, v => setS({ bridges: v }))}
			</Field>

			<Divider dark={dark} />
			{sectionTitle('fx.superRiso.stencil.spray')}
			{slider('fx.superRiso.stencil.load', 'load')}
			{slider('fx.superRiso.stencil.lift', 'lift')}
			{slider('fx.superRiso.stencil.over', 'over')}
			{slider('fx.superRiso.stencil.drips', 'drips')}
			{slider('fx.superRiso.stencil.splat', 'splat')}

			<Divider dark={dark} />
			<Field label={t('fx.superRiso.xerox.colors')} value={t('fx.superRiso.stencil.layers', { n: layers.length })} dark={dark} muted={muted}>
				<div style={segmentWrap(dark)}>
					<DiSegmentControl<StencilSettings['colors']> dark={dark} small
						options={[{ value: 'spray', label: t('fx.superRiso.stencil.colors.spray') }, { value: 'own', label: t('fx.superRiso.stencil.colors.own') }]}
						value={s.colors} onChange={v => { setPicking(null); setS({ colors: v, manual: [] }); }} />
				</div>
			</Field>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
				{rows.map(r => (
					<DiChip key={String(r.target)} dark={dark} swatch={r.hex} label={`${r.name} · ${sprayName(r.hex)}`} active={picking === r.target}
						tooltip={t('fx.superRiso.xerox.changeColor')} onClick={() => setPicking(picking === r.target ? null : r.target)} />
				))}
			</div>
			{picking !== null && (
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3 }}>
					{STENCIL_SPRAYS.map(([id, hex]) => (
						<DiChip key={id} dark={dark} swatch={hex} tooltip={t(`fx.superRiso.stencil.spray.${id}`)} ariaLabel={t(`fx.superRiso.stencil.spray.${id}`)}
							onClick={() => pick(hex)} />
					))}
				</div>
			)}
			{s.mode === 'tone' && (
				<Field label={t('fx.superRiso.stencil.accent')} dark={dark} muted={muted}>
					{yesNo(s.accent, v => setS({ accent: v, manual: [] }))}
				</Field>
			)}
			<Field label={t('fx.superRiso.stencil.cloud')} dark={dark} muted={muted}>
				<div style={segmentWrap(dark)}>
					<DiSegmentControl<StencilSettings['cloud']> dark={dark} small
						options={(['none', 'white', 'color'] as const).map(v => ({ value: v, label: t(`fx.superRiso.stencil.cloud.${v}`) }))}
						value={s.cloud} onChange={v => setS({ cloud: v })} />
				</div>
			</Field>
		</>
	);
}
