import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T, TYPE, RADIUS, Z_INDEX, dk } from '../../../design-system/tokens';
import { Ico } from '../../../design-system';
import { DiModalContext } from './DiModalContext';
import { PrimaryActionLg, SecondaryAction } from './DiModalActions';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingOverlayV2Props {
	open:          boolean;
	onClose:       () => void;
	onLoadExample: () => Promise<void>;
	dark:          boolean;
}

type CardData = { icon: string; title: string; description: string };

// ── Card data ─────────────────────────────────────────────────────────────────

// 'layers' icon not in ICONS — fallback: 'duplicate' (two stacked rectangles)
const DRAW_CARDS: CardData[] = [
	{ icon: 'blob',      title: 'Blob',   description: 'Spray-like organic shapes'       },
	{ icon: 'brush',     title: 'Brush',  description: 'Tapered, calligraphic strokes'   },
	{ icon: 'duplicate', title: 'Layers', description: 'Build depth with stacked planes' },
];

// 'video' icon not in ICONS — Motion fallback: 'cam-orbit' (circular camera path)
const VIEW_CARDS: CardData[] = [
	{ icon: 'cam-orbit', title: 'Motion',  description: 'Camera presets and movements' },
	{ icon: 'sparkles',  title: 'Effects', description: 'Grain, glow, fog and more'    },
	{ icon: 'depth-far', title: 'Depth',   description: 'Layer spacing and parallax'   },
];

// ── Animation variants ────────────────────────────────────────────────────────

const overlayVariants = {
	hidden:  { opacity: 0, transition: { duration: 0.20, ease: 'easeOut' as const } },
	visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

// ── Internal sub-components ───────────────────────────────────────────────────

function OnboardingCard({ icon, title, description, dark }: CardData & { dark: boolean }) {
	return (
		<div style={{
			background:    dk(dark, T.white, T.panelDarkOpaque) as string,
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
				fontWeight: 600,
				fontSize:   TYPE.controlLabel.size,
				color:      dk(dark, T.dark, T.textDark) as string,
			}}>
				{title}
			</span>
			<span style={{
				fontFamily: TYPE.numericValue.family,
				fontWeight: TYPE.numericValue.weight,
				fontSize:   TYPE.numericValue.size,
				lineHeight: 1.4,
				color:      dk(dark, T.muted, T.textDarkMuted) as string,
			}}>
				{description}
			</span>
		</div>
	);
}

function CardSection({ label, cards, dark }: { label: string; cards: CardData[]; dark: boolean }) {
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
				{label}
			</div>
			<div style={{
				display:             'grid',
				gridTemplateColumns: '1fr 1fr 1fr',
				gap:                 12,
			}}>
				{cards.map(card => (
					<OnboardingCard key={card.title} {...card} dark={dark} />
				))}
			</div>
		</div>
	);
}

// ── OnboardingOverlayV2 ───────────────────────────────────────────────────────

export function OnboardingOverlayV2({ open, onClose, onLoadExample, dark }: OnboardingOverlayV2Props) {
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
								Welcome to Diorame
							</div>
							<p style={{
								margin:     '8px 0 0',
								fontFamily: TYPE.controlLabel.family,
								fontWeight: TYPE.controlLabel.weight,
								fontSize:   14,
								lineHeight: 1.4,
								color:      dk(dark, T.muted, T.textDarkMuted) as string,
							}}>
								Draw in 2D. Watch it come alive in 3D.
							</p>
						</div>

						{/* DRAW + VIEW card sections */}
						<div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
							<CardSection label="DRAW" cards={DRAW_CARDS} dark={dark} />
							<CardSection label="VIEW" cards={VIEW_CARDS} dark={dark} />
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
								<SecondaryAction onClick={handleLoadExample} disabled={isLoadingExample}>
									{isLoadingExample ? 'Loading…' : 'Load example scene'}
								</SecondaryAction>
								<PrimaryActionLg onClick={onClose}>
									Start drawing
								</PrimaryActionLg>
							</div>
						</DiModalContext.Provider>

					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
