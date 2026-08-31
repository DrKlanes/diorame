import { RefObject, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { T, TYPE, RADIUS, SHADOW, Z_INDEX, dk } from '../../../design-system/tokens';
import { DiActionButton } from '../../../design-system';
import { usePopoverPosition } from '../popovers/usePopoverPosition';
import { useTranslation } from '../../../i18n';
import type { LayersTooltipDismissMethod } from '../../../hooks/useLayersDiscoveryTooltip';

type Props = {
	anchorRef: RefObject<HTMLElement | null>;
	open: boolean;
	dark: boolean;
	onDismiss: (method: LayersTooltipDismissMethod) => void;
};

// Reutiliza el motor de posicionamiento de DiSelectorPopover (usePopoverPosition
// + portal), no el componente entero: DiSelectorPopover está pensado para listas
// de opciones (role="option", navegación con flechas) y este es un aviso de
// texto libre con un único botón de cierre.
export function LayersDiscoveryTooltip({ anchorRef, open, dark, onDismiss }: Props) {
	const popoverRef = useRef<HTMLDivElement>(null);
	const { t } = useTranslation();
	// placement fijo en 'top', no 'auto': el panel de capas vive centrado
	// verticalmente (top:50%, right:12) y 'auto' solo mide contra el borde del
	// viewport, no contra otros paneles fijos — resolvía 'bottom' y el tooltip
	// quedaba tapando la paleta de colores (bottom:12, right:12).
	const { top, left, resolvedPlacement } = usePopoverPosition(
		anchorRef, popoverRef, 'top', 'end', 8, open,
	);

	useEffect(() => {
		if (!open) return;
		const handler = (e: PointerEvent) => {
			const target = e.target as Node;
			const inside = popoverRef.current?.contains(target);
			const onAnchor = anchorRef.current?.contains(target);
			if (!inside && !onAnchor) onDismiss('click_outside');
		};
		document.addEventListener('pointerdown', handler);
		return () => document.removeEventListener('pointerdown', handler);
	}, [open, onDismiss, anchorRef]);

	const yOffset = resolvedPlacement === 'top' ? 4 : -4;

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					ref={popoverRef}
					initial={{ opacity: 0, y: yOffset }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: yOffset }}
					transition={{ duration: 0.14, ease: 'easeOut' }}
					role="status"
					style={{
						position: 'fixed',
						top,
						left,
						zIndex: Z_INDEX.popover,
						width: 240,
						padding: '12px 10px 12px 14px',
						display: 'flex',
						flexDirection: 'column',
						gap: 6,
						background: dk(dark, T.white, T.panelDarkOpaque) as string,
						border: `1px solid ${dk(dark, T.border, T.borderDark)}`,
						borderRadius: RADIUS.panel,
						boxShadow: dk(dark, SHADOW.modal, SHADOW.modalDark) as string,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
						<span style={{
							fontFamily: TYPE.panelHeader.family,
							fontWeight: 700,
							fontSize: 13,
							color: dk(dark, T.dark, T.textDark) as string,
							flexGrow: 1,
							paddingTop: 4,
						}}>
							{t('layers.discoveryTooltip.title')}
						</span>
						<DiActionButton
							name="x"
							iconSize={14}
							onClick={() => onDismiss('close_button')}
							dark={dark}
						/>
					</div>
					<p style={{
						margin: 0,
						fontFamily: TYPE.controlLabel.family,
						fontWeight: 400,
						fontSize: 12,
						lineHeight: 1.45,
						color: dk(dark, T.muted, T.textDarkMuted) as string,
					}}>
						{t('layers.discoveryTooltip.body')}
					</p>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
