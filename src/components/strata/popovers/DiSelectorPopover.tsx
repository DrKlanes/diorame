import React, { useRef, useEffect, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { T, RADIUS, SHADOW, Z_INDEX, dk } from '../../../design-system/tokens';
import { DiSelectorContext } from './DiSelectorOption';
import { usePopoverPosition, PopoverPlacement, PopoverAlign } from './usePopoverPosition';

// ── Animation variants (no scale — popovers don't scale like modals) ──────────

const bottomVariants = {
	hidden:  { opacity: 0, y: -4, transition: { duration: 0.10, ease: 'easeOut' } },
	visible: { opacity: 1, y:  0, transition: { duration: 0.14, ease: 'easeOut' } },
};

const topVariants = {
	hidden:  { opacity: 0, y:  4, transition: { duration: 0.10, ease: 'easeOut' } },
	visible: { opacity: 1, y:  0, transition: { duration: 0.14, ease: 'easeOut' } },
};

// ── Component ─────────────────────────────────────────────────────────────────

type DiSelectorPopoverProps = {
	anchorRef:  RefObject<HTMLElement | null>;
	open:       boolean;
	onClose:    () => void;
	dark:       boolean;
	placement?: PopoverPlacement;
	align?:     PopoverAlign;
	children:   React.ReactNode;
};

export function DiSelectorPopover({
	anchorRef,
	open,
	onClose,
	dark,
	placement = 'auto',
	align     = 'center',
	children,
}: DiSelectorPopoverProps) {
	const popoverRef = useRef<HTMLDivElement>(null);
	const { top, left, resolvedPlacement } = usePopoverPosition(
		anchorRef, popoverRef, placement, align, 8, open,
	);

	const variants = resolvedPlacement === 'top' ? topVariants : bottomVariants;

	const closedByKeyboardRef = useRef(false);

	// ── Keyboard: Esc + arrow navigation ─────────────────────────────────────
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				closedByKeyboardRef.current = true;
				onClose();
				return;
			}
			const popover = popoverRef.current;
			if (!popover) return;
			const options = Array.from(
				popover.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'),
			);
			const idx = options.indexOf(document.activeElement as HTMLElement);
			if (idx === -1) return;

			if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
				e.preventDefault();
				options[(idx + 1) % options.length]?.focus();
			} else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
				e.preventDefault();
				options[(idx - 1 + options.length) % options.length]?.focus();
			} else if (e.key === 'Enter' || e.key === ' ') {
				closedByKeyboardRef.current = true;
			}
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [open, onClose]);

	// ── Click-outside detection ───────────────────────────────────────────────
	useEffect(() => {
		if (!open) return;
		const handler = (e: PointerEvent) => {
			const target = e.target as Node;
			const inside = popoverRef.current?.contains(target);
			const onAnchor = anchorRef.current?.contains(target);
			if (!inside && !onAnchor) onClose();
		};
		document.addEventListener('pointerdown', handler);
		return () => document.removeEventListener('pointerdown', handler);
	}, [open, onClose, anchorRef]);

	// ── Focus management ──────────────────────────────────────────────────────
	const wasOpenRef = useRef(false);
	useEffect(() => {
		if (open) {
			requestAnimationFrame(() => {
				const first = popoverRef.current?.querySelector<HTMLElement>(
					'[role="option"]:not([aria-disabled="true"])',
				);
				first?.focus();
			});
		} else if (wasOpenRef.current) {
			if (closedByKeyboardRef.current) {
				anchorRef.current?.focus();
			}
			closedByKeyboardRef.current = false;
		}
		wasOpenRef.current = open;
	}, [open, anchorRef]);

	return createPortal(
		<DiSelectorContext.Provider value={{ dark, onClose }}>
			<AnimatePresence>
				{open && (
					<motion.div
						ref={popoverRef}
						variants={variants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						role="listbox"
						style={{
							position: 'fixed',
							top,
							left,
							zIndex: Z_INDEX.popover,
							minWidth: 200,
							maxWidth: 320,
							padding: 6,
							display: 'flex',
							flexDirection: 'column',
							gap: 2,
							background: dk(dark, T.white, T.panelDarkOpaque) as string,
							border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
							borderRadius: RADIUS.panel,
							boxShadow: dk(dark, SHADOW.modal, SHADOW.modalDark) as string,
						}}
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</DiSelectorContext.Provider>,
		document.body,
	);
}
