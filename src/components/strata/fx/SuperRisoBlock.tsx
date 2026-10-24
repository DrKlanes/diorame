import React, { useState, useSyncExternalStore } from 'react';
import { useStrata } from '../StrataContext';
import { Ico, DiMiniSlider, DiSegmentControl, DiChip } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';
import { SUPER_RISO_STYLES, SUPER_RISO_PAPERS, SUPER_RISO_REPRINT_FPS, type SuperRisoPatch } from '../../../constants/superRiso';
import { XEROX_STYLE_ORDER, XEROX_PAPERS, XEROX_PAPER_ORDER, xeroxStyleMatches } from '../../../constants/superRisoXerox';
import { isSuperRisoPreviewDevice, subscribeSuperRisoPreviewDevice } from '../canvas/superRiso/deviceLevel';
import type { SuperRisoSettings, SuperRisoStyle, SuperRisoPaper, XeroxSettings } from '../../../types/strataTypes';
import { Field, segmentWrap, pct, labelStyle, Divider } from './superRisoFields';
import { XeroxControls } from './XeroxControls';

// Paper tints as the engine prints them (canvas/superRiso/panel.ts PAPERS).
const PAPER_HEX: Readonly<Record<SuperRisoPaper, string>> = {
	white: '#f8f7f3', natural: '#f3efe6', recycled: '#ebe5d6', cream: '#f4e9d0',
};
const STYLE_ORDER: readonly SuperRisoStyle[] = ['clean', 'zine', 'lofi', 'cmyk'];
const INK_SETS: readonly SuperRisoSettings['inkSet'][] = ['own', 'cmyk', 'dpal'];

interface SuperRisoBlockProps {
	dark: boolean;
	isActive: boolean;
	onToggle: () => void;
}

export function SuperRisoBlock({ dark, isActive, onToggle }: SuperRisoBlockProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const [printOpen, setPrintOpen] = useState(false);
	const previewDevice = useSyncExternalStore(subscribeSuperRisoPreviewDevice, isSuperRisoPreviewDevice);
	const sr = state.postProcessing.superRiso;

	// Master-OFF snapshot: same contract as FXRow — keep the controls, muted, click to wake.
	const snapshot = state.postProcessingSnapshot;
	const isMuted = snapshot !== null;
	const showExpanded = isActive || (isMuted && snapshot.superRiso === true);
	const handleClick = isMuted ? () => dispatch({ type: 'TOGGLE_FX_MASTER' }) : onToggle;
	const tint = isActive ? T.purple : dk(dark, T.dark, T.textDark) as string;
	const headTint = isMuted ? (dk(dark, T.muted, T.textDarkMuted) as string) : tint;
	const set = (patch: SuperRisoPatch) => dispatch({ type: 'SET_SUPER_RISO', payload: patch });
	const xerox = sr.technique === 'xerox';
	const screenSize = xerox ? sr.xerox.screenSize : sr.screenSize;
	const imperfection = xerox ? sr.xerox.dirt : sr.imperfection;

	// A style chip stays lit only while the controls still match it.
	const matches = (id: SuperRisoStyle) => sr.style === id
		&& (Object.entries(SUPER_RISO_STYLES[id].panel) as [keyof SuperRisoSettings, unknown][]).every(([k, v]) => sr[k] === v);

	return (
		<div style={{
			borderRadius: RADIUS.iconBtn,
			background: showExpanded && !isMuted ? dk(dark, T.purple10, T.purple20) : 'transparent',
			opacity: isMuted ? 0.5 : 1,
		}}>
			<button
				onClick={handleClick}
				onMouseDown={(e) => e.preventDefault()}
				style={{
					display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px',
					borderRadius: RADIUS.iconBtn, border: 'none', cursor: 'pointer', textAlign: 'left',
					boxSizing: 'border-box', background: isActive && isMuted ? dk(dark, T.purple10, T.purple20) : 'transparent',
				}}
			>
				<Ico name="fx-super-riso" size={16} color={headTint} />
				<span style={{ ...labelStyle, color: headTint, flexShrink: 0 }}>{t('fx.superRiso.label')}</span>
			</button>

			{showExpanded && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 10px 10px', pointerEvents: isMuted ? 'none' : undefined }}>
					<Field label={t('fx.superRiso.technique')} dark={dark} muted={isMuted}>
						<div style={segmentWrap(dark)}>
							<DiSegmentControl<SuperRisoSettings['technique']> dark={dark} small
								options={[{ value: 'riso', label: t('fx.superRiso.technique.riso') }, { value: 'xerox', label: t('fx.superRiso.technique.xerox') }]}
								value={sr.technique} onChange={v => set({ technique: v })} />
						</div>
					</Field>

					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
						{xerox ? XEROX_STYLE_ORDER.map(id => (
							<DiChip key={id} dark={dark} active={xeroxStyleMatches(sr.xerox, id)} label={t(`fx.superRiso.xerox.style.${id}`)}
								onClick={() => dispatch({ type: 'APPLY_SUPER_RISO_STYLE', payload: id })} />
						)) : STYLE_ORDER.map(id => (
							<DiChip key={id} dark={dark} active={matches(id)} label={t(`fx.superRiso.style.${id}`)}
								onClick={() => dispatch({ type: 'APPLY_SUPER_RISO_STYLE', payload: id })} />
						))}
					</div>

					{xerox && <XeroxControls dark={dark} muted={isMuted} x={sr.xerox} set={set} />}

					{!xerox && (
						<>
							<Field label={t('fx.superRiso.inks')} dark={dark} muted={isMuted}>
								<div style={segmentWrap(dark)}>
									<DiSegmentControl<SuperRisoSettings['inkSet']> dark={dark} small
										options={INK_SETS.map(v => ({ value: v, label: t(`fx.superRiso.inks.${v}`), tooltip: t(`fx.superRiso.inks.${v}.tooltip`) }))}
										value={sr.inkSet} onChange={v => set({ inkSet: v })} />
								</div>
							</Field>

							<Field label={t('fx.superRiso.maxInks')} value={String(sr.maxInks)} dark={dark} muted={isMuted}>
								<DiMiniSlider dark={dark} value={sr.maxInks} min={1} max={8} step={1} onChange={v => set({ maxInks: v })} />
							</Field>
						</>
					)}

					<Field label={t('fx.superRiso.reprint')} value={sr.reprintFps ? `${sr.reprintFps} fps` : t('common.off')} dark={dark} muted={isMuted}>
						<div style={segmentWrap(dark)}>
							<DiSegmentControl<number> dark={dark} small
								options={SUPER_RISO_REPRINT_FPS.map(v => ({ value: v, label: v ? String(v) : t('common.off') }))}
								value={sr.reprintFps} onChange={v => set({ reprintFps: v as SuperRisoSettings['reprintFps'] })} />
						</div>
					</Field>

					<Divider dark={dark} />
					<button
						onClick={() => setPrintOpen(o => !o)}
						onMouseDown={(e) => e.preventDefault()}
						aria-expanded={printOpen}
						style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
					>
						<span style={{ ...labelStyle, flex: 1, color: dk(dark, T.dark, T.textDark) as string }}>{t('fx.superRiso.printSettings')}</span>
						<Ico name={printOpen ? 'chevron-up' : 'chevron-down'} size={14} color={dk(dark, T.muted, T.textDarkMuted) as string} />
					</button>

					{/* Same five controls in the same order for both techniques; only what they hold differs (Fotocopia: xerox.* fields). */}
					{printOpen && (
						<>
							<Field label={t('fx.superRiso.paper')} dark={dark} muted={isMuted}>
								<div style={{ display: 'flex', gap: 4 }}>
									{xerox ? XEROX_PAPER_ORDER.map(p => (
										<DiChip key={p} dark={dark} active={sr.xerox.paper === p} swatch={XEROX_PAPERS[p].paper}
											tooltip={t(`fx.superRiso.xerox.paper.${p}`)} ariaLabel={t(`fx.superRiso.xerox.paper.${p}`)}
											onClick={() => set({ xerox: { paper: p, paperHex: XEROX_PAPERS[p].paper } })} />
									)) : SUPER_RISO_PAPERS.map(p => (
										<DiChip key={p} dark={dark} active={sr.paper === p} swatch={PAPER_HEX[p]}
											tooltip={t(`fx.superRiso.paper.${p}`)} ariaLabel={t(`fx.superRiso.paper.${p}`)}
											onClick={() => set({ paper: p })} />
									))}
								</div>
							</Field>

							<Field label={t('fx.superRiso.screen')} dark={dark} muted={isMuted}>
								<div style={segmentWrap(dark)}>
									{xerox ? (
										<DiSegmentControl<XeroxSettings['mode']> dark={dark} small
											options={[
												{ value: 'line', label: t('fx.superRiso.xerox.mode.line') },
												{ value: 'photo', label: t('fx.superRiso.xerox.mode.photo') },
											]}
											value={sr.xerox.mode} onChange={v => set({ xerox: { mode: v } })} />
									) : (
										<DiSegmentControl<SuperRisoSettings['screen']> dark={dark} small
											options={[
												{ value: 'grain', label: t('fx.superRiso.screen.grain') },
												{ value: 'dots', label: t('fx.superRiso.screen.dots') },
											]}
											value={sr.screen} onChange={v => set({ screen: v })} />
									)}
								</div>
							</Field>

							<Field label={t('fx.superRiso.screenSize')} value={pct(screenSize)} dark={dark} muted={isMuted}>
								<DiMiniSlider dark={dark} value={screenSize} min={0} max={1} step={0.01}
									onChange={v => set(xerox ? { xerox: { screenSize: v } } : { screenSize: v })} />
							</Field>
							<Field label={t(xerox ? 'fx.superRiso.xerox.dirt' : 'fx.superRiso.imperfection')} value={pct(imperfection)} dark={dark} muted={isMuted}>
								<DiMiniSlider dark={dark} value={imperfection} min={0} max={1} step={0.01}
									onChange={v => set(xerox ? { xerox: { dirt: v } } : { imperfection: v })} />
							</Field>
							<Field label={t('fx.superRiso.resolution')} value={pct(sr.resolution)} dark={dark} muted={isMuted}>
								<DiMiniSlider dark={dark} value={sr.resolution} min={0} max={1} step={0.01} onChange={v => set({ resolution: v })} />
							</Field>
						</>
					)}

					{previewDevice && (
						<>
							<div style={{ display: 'flex' }}>
								<DiChip dark={dark} active={sr.fullQuality} label={t('fx.superRiso.fullQuality')}
									onClick={() => set({ fullQuality: !sr.fullQuality })} />
							</div>
							<span style={{
								fontFamily: TYPE.controlLabel.family, fontWeight: 500, fontSize: TYPE.numericValue.size,
								lineHeight: 1.35, color: dk(dark, T.muted, T.textDarkMuted),
							}}>{t('fx.superRiso.previewNotice')}</span>
						</>
					)}
				</div>
			)}
		</div>
	);
}
