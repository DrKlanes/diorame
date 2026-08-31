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
			// Apoyar el lápiz/dedo en el lienzo para dibujar es un pointerdown fuera
			// del tooltip, pero es dibujar, no descartar. Sin esto, el propio gesto
			// de trazo cerraba el tooltip antes de que se pudiera leer — el mismo
			// síntoma que el auto-cierre por trazo que ya se quitó, solo que por
			// esta vía en vez de aquella. `data-drawing-canvas` marca el <canvas>
			// real de StrataCanvas.tsx; el canvas de CompositionGuideOverlay que
			// se pinta encima es pointer-events:none y nunca es target.
			const onDrawingCanvas = target instanceof Element && target.closest('[data-drawing-canvas]');
			if (!inside && !onAnchor && !onDrawingCanvas) onDismiss('click_outside');
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
						// Fondo morado sólido — mismo token que DiButton variant="brand" y los
						// botones primarios de DiModalActions (T.purple / #9a0ff9). Un tooltip
						// que usa el color de superficie del panel se lee como "otro panel más";
						// esto tiene que leerse como mensaje. Sin borde: el color saturado ya
						// es su propio límite visual contra el papel.
						background: T.purple,
						borderRadius: RADIUS.panel,
						boxShadow: dk(dark, SHADOW.modal, SHADOW.modalDark) as string,
					}}
				>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
						<span style={{
							fontFamily: TYPE.panelHeader.family,
							fontWeight: 700,
							fontSize: 13,
							color: T.white,
							flexGrow: 1,
							paddingTop: 4,
						}}>
							{t('layers.discoveryTooltip.title')}
						</span>
						{/* dark={true} fijo, no el tema de la app: este botón vive siempre
						    sobre el morado sólido de arriba, nunca sobre el panel del tema. */}
						<DiActionButton
							name="x"
							iconSize={14}
							onClick={() => onDismiss('close_button')}
							dark={true}
						/>
					</div>
					<p style={{
						margin: 0,
						fontFamily: TYPE.controlLabel.family,
						fontWeight: 400,
						fontSize: 12,
						lineHeight: 1.45,
						color: T.white,
					}}>
						{t('layers.discoveryTooltip.body')}
					</p>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
