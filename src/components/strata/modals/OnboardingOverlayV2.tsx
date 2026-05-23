import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T, TYPE, RADIUS, Z_INDEX, dk } from '../../../design-system/tokens';
import { Ico } from '../../../design-system';
import { DiModalContext } from './DiModalContext';
import { PrimaryActionLg, SecondaryActionLg } from './DiModalActions';
import { useTranslation } from '../../../i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingOverlayV2Props {
	open:          boolean;
	onClose:       () => void;
	onLoadExample: () => Promise<void>;
	dark:          boolean;
}

type CardData = { icon: string; titleKey: string; descKey: string };

// ── Card data ─────────────────────────────────────────────────────────────────

const DRAW_CARDS: CardData[] = [
	{ icon: 'blob',   titleKey: 'modal.onboarding.card.blob.title',   descKey: 'modal.onboarding.card.blob.desc'   },
	{ icon: 'brush',  titleKey: 'modal.onboarding.card.brush.title',  descKey: 'modal.onboarding.card.brush.desc'  },
	{ icon: 'layers', titleKey: 'modal.onboarding.card.layers.title', descKey: 'modal.onboarding.card.layers.desc' },
];

// 'video' icon not in ICONS — Motion fallback: 'cam-orbit' (circular camera path)
const VIEW_CARDS: CardData[] = [
	{ icon: 'camera',    titleKey: 'modal.onboarding.card.motion.title',  descKey: 'modal.onboarding.card.motion.desc'  },
	{ icon: 'sparkles',  titleKey: 'modal.onboarding.card.effects.title', descKey: 'modal.onboarding.card.effects.desc' },
	{ icon: 'depth-far', titleKey: 'modal.onboarding.card.depth.title',   descKey: 'modal.onboarding.card.depth.desc'   },
];

// ── Animation variants ────────────────────────────────────────────────────────

const overlayVariants = {
	hidden:  { opacity: 0, transition: { duration: 0.20, ease: 'easeOut' as const } },
	visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

// ── Internal sub-components ───────────────────────────────────────────────────

function OnboardingCard({ icon, titleKey, descKey, dark }: CardData & { dark: boolean }) {
	const { t } = useTranslation();
	return (
		<div style={{
			border:        `1px solid ${dk(dark, T.border, T.borderDark) as string}`,
			borderRadius:  RADIUS.iconBtn,
			padding:       16,
			display:       'flex',
			flexDirection: 'column',
			gap:           8,
		}}>
			<Ico name={icon} size={32} color={T.purple} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: 700,
				fontSize:   16,
				color:      dk(dark, T.dark, T.textDark) as string,
			}}>
				{t(titleKey)}
			</span>
			<span style={{
				fontFamily: TYPE.numericValue.family,
				fontWeight: TYPE.numericValue.weight,
				fontSize:   TYPE.numericValue.size,
				lineHeight: 1.4,
				color:      dk(dark, T.muted, T.textDarkMuted) as string,
			}}>
				{t(descKey)}
			</span>
		</div>
	);
}

function CardSection({ labelKey, cards, dark }: { labelKey: string; cards: CardData[]; dark: boolean }) {
	const { t } = useTranslation();
	return (
		<div>
			<div style={{
				fontFamily:    TYPE.panelHeader.family,
				fontWeight:    TYPE.panelHeader.weight,
				fontSize:      TYPE.panelHeader.size,
				letterSpacing: TYPE.panelHeader.letterSpacing,
				textTransform: TYPE.panelHeader.textTransform,
				color:         dk(dark, T.muted, T.textDarkMuted) as string,
				marginBottom:  12,
			}}>
				{t(labelKey)}
			</div>
			<div style={{
				display:             'grid',
				gridTemplateColumns: '1fr 1fr 1fr',
				gap:                 12,
			}}>
				{cards.map(card => (
					<OnboardingCard key={card.titleKey} {...card} dark={dark} />
				))}
			</div>
		</div>
	);
}

// ── OnboardingOverlayV2 ───────────────────────────────────────────────────────

export function OnboardingOverlayV2({ open, onClose, onLoadExample, dark }: OnboardingOverlayV2Props) {
	const { t } = useTranslation();
	const [isLoadingExample, setIsLoadingExample] = useState(false);

	const handleLoadExample = async () => {
		setIsLoadingExample(true);
		try { await onLoadExample(); }
		finally {
			setIsLoadingExample(false);
			onClose();
		}
	};

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					variants={overlayVariants}
					initial="hidden"
					animate="visible"
					exit="hidden"
					style={{
						position:       'fixed',
						inset:          0,
						zIndex:         Z_INDEX.onboarding,
						display:        'flex',
						justifyContent: 'center',
						alignItems:     'center',
						pointerEvents:  'none',
					}}
				>
					{/* Inner container — pointer-events: auto so CTAs are clickable */}
					<div style={{
						maxWidth:      640,
						width:         '100%',
						padding:       32,
						pointerEvents: 'auto',
					}}>

						{/* Header */}
						<div style={{ textAlign: 'center', marginBottom: 32 }}>
							<div style={{
								fontFamily:    TYPE.panelHeader.family,
								fontWeight:    700,
								fontSize:      24,
								letterSpacing: '-0.01em',
								color:         dk(dark, T.dark, T.textDark) as string,
							}}>
								{t('modal.onboarding.header')}
							</div>
							<p style={{
								margin:     '8px 0 0',
								fontFamily: TYPE.controlLabel.family,
								fontWeight: TYPE.controlLabel.weight,
								fontSize:   14,
								lineHeight: 1.4,
								color:      dk(dark, T.muted, T.textDarkMuted) as string,
							}}>
								{t('modal.onboarding.tagline')}
							</p>
						</div>

						{/* DRAW + VIEW card sections */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
							<CardSection labelKey="modal.onboarding.section.draw" cards={DRAW_CARDS} dark={dark} />
							<CardSection labelKey="modal.onboarding.section.view" cards={VIEW_CARDS} dark={dark} />
						</div>

						{/* CTAs — DiModalContext.Provider supplies dark mode to Action sub-components */}
						<DiModalContext.Provider value={{ onClose, dark, variant: 'dialog' }}>
							<div style={{
								display:        'flex',
								justifyContent: 'center',
								alignItems:     'center',
								gap:            12,
								marginTop:      32,
							}}>
								<SecondaryActionLg onClick={handleLoadExample} disabled={isLoadingExample}>
									{isLoadingExample ? t('modal.onboarding.cta.exampleLoading') : t('modal.onboarding.cta.example')}
								</SecondaryActionLg>
								<PrimaryActionLg onClick={onClose}>
									{t('modal.onboarding.cta.start')}
								</PrimaryActionLg>
							</div>
						</DiModalContext.Provider>

					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
