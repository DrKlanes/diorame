import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DiModalContext, DiModalVariant } from './DiModalContext';
import { DiModalBackdrop } from './DiModalBackdrop';
import { useModalBehavior } from './useModalBehavior';
import { T, RADIUS, SHADOW, Z_INDEX, dk } from '../../../design-system/tokens';

type DiModalSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<DiModalSize, number> = { sm: 340, md: 440, lg: 680 };

const SPRING: [number, number, number, number] = [0.16, 1, 0.3, 1];

const dialogVariants = {
	hidden:  { opacity: 0, scale: 0.96, x: '-50%', y: '-50%', transition: { duration: 0.18, ease: 'easeOut'  } },
	visible: { opacity: 1, scale: 1,    x: '-50%', y: '-50%', transition: { duration: 0.22, ease: SPRING     } },
};

const alertVariants = {
	hidden:  { opacity: 0, scale: 0.96, x: '-50%', y: '-50%', transition: { duration: 0.14, ease: 'easeOut'  } },
	visible: { opacity: 1, scale: 1,    x: '-50%', y: '-50%', transition: { duration: 0.16, ease: SPRING     } },
};

const bannerVariants = {
	hidden:  { opacity: 0, y: -8, x: '-50%', transition: { duration: 0.15, ease: 'easeOut' } },
	visible: { opacity: 1, y: 0,  x: '-50%', transition: { duration: 0.18, ease: 'easeOut' } },
};

function getVariants(variant: DiModalVariant) {
	if (variant === 'alert')  return alertVariants;
	if (variant === 'banner') return bannerVariants;
	return dialogVariants;
}

type DiModalRootProps = {
	open: boolean;
	onClose: () => void;
	variant?: DiModalVariant;
	size?: DiModalSize;
	width?: number;
	dark: boolean;
	children: React.ReactNode;
};

function DiModalRoot({ open, onClose, variant = 'dialog', size = 'md', width: widthOverride, dark, children }: DiModalRootProps) {
	const panelRef = useRef<HTMLDivElement>(null);
	useModalBehavior({ isOpen: open, onClose, variant, modalRef: panelRef });

	const isBanner = variant === 'banner';
	const width = widthOverride ?? SIZE_MAP[size];
	const bg = dk(dark, T.white, T.panelDarkOpaque) as string;
	const shadow = dk(dark, SHADOW.modal, SHADOW.modalDark) as string;
	const border = dark ? `1px solid ${T.borderDark}` : 'none';

	const panelStyle: React.CSSProperties = isBanner
		? {
			position: 'fixed',
			top: 80,
			left: '50%',
			zIndex: Z_INDEX.toast,
			width,
			background: bg,
			borderRadius: RADIUS.modal,
			boxShadow: shadow,
			border,
			overflow: 'hidden',
		}
		: {
			position: 'fixed',
			top: '50%',
			left: '50%',
			zIndex: Z_INDEX.modal,
			width,
			background: bg,
			borderRadius: RADIUS.modal,
			boxShadow: shadow,
			border,
			overflow: 'hidden',
		};

	return createPortal(
		<DiModalContext.Provider value={{ onClose, dark, variant }}>
			<AnimatePresence>
				{open && variant !== 'banner' && (
					<DiModalBackdrop
						dark={dark}
						onClick={variant !== 'alert' ? onClose : undefined}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{open && (
					<motion.div
						ref={panelRef}
						variants={getVariants(variant)}
						initial="hidden"
						animate="visible"
						exit="hidden"
						role={variant === 'alert' ? 'alertdialog' : 'dialog'}
						aria-modal="true"
						style={panelStyle}
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</DiModalContext.Provider>,
		document.body,
	);
}

export { DiModalRoot };
