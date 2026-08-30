import React from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStrata, BASE_DEPTH_STEP } from '../StrataContext';
import { Ico } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useTranslation } from '../../../i18n';

interface LayerRowProps {
	index: number;
	dark: boolean;
	sortableId: string;
}

const SPRING = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 0.8 };

export function LayerRow({ index, dark, sortableId }: LayerRowProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: sortableId });

	const zIndex = index * -BASE_DEPTH_STEP;
	const isEmpty = !state.shapes.some(s => s.zIndex === zIndex && !s.isEraser);
	const isActive = index === state.currentLayerIndex;
	const isHidden = state.hiddenLayers.includes(index);
	const isLocked3D = state.locked3DLayers.includes(index); // TODO: replace with anchor/pin icon

	const renderMode = state.layerRenderModes[index] ?? 'flat';
	const gradType = state.layerGradParams[index]?.gradType ?? 'solid';
	const colorMode = isEmpty
		? 'Empty'
		: renderMode === 'grad'
			? (gradType === 'fade' ? 'Fade' : 'Grad')
			: 'Flat';

	const textColor = dk(dark, T.dark, T.textDark) as string;
	const mutedColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const borderColor = dk(dark, T.border, T.borderDark) as string;

	const nameColor = isActive ? T.purple : (isEmpty ? mutedColor : textColor);
	const nameOpacity = isActive && isEmpty ? 0.6 : 1;

	const selectThisLayer = () => {
		if (isDragging) return;
		dispatch({ type: 'SET_CURRENT_LAYER', payload: index } as any);
	};

	// Enter/Space select the layer, mirroring DiSelectorOption's handleKeyDown. Reachable
	// at all now that the row is properly focusable (tabIndex/role below) — v3.17.14's
	// removed onKeyDown was dead code specifically BECAUSE the row could never take focus,
	// not because activating-by-keyboard was the wrong idea.
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			// preventDefault alone does not stop the event reaching the window-level
			// shortcut listener — see the identical note in DiSelectorOption.tsx, the
			// precedent this mirrors. Space bubbling out would pan the canvas instead of
			// selecting the layer.
			e.stopPropagation();
			selectThisLayer();
		}
	};

	const badgeIsFilled = !isEmpty;
	const badgeBg = badgeIsFilled
		? dk(dark, T.purple10, T.purple20) as string
		: dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.06)') as string;
	const badgeColor = badgeIsFilled ? T.purple : mutedColor;

	return (
		<motion.div
			ref={setNodeRef}
			layout={!isDragging}
			transition={SPRING}
			{...attributes}
			// AFTER {...attributes}, not before: dnd-kit's useSortable defaults it to
			// role="button" tabIndex={0} (verified in @dnd-kit/core's source — the row was
			// already Tab-reachable before this change, just as the wrong role and with no
			// keydown handling and no visible ring). Spread order is what decides which
			// value wins in JSX, so ours has to come last to actually take effect instead
			// of silently losing to dnd-kit's.
			onClick={!isDragging ? selectThisLayer : undefined}
			onKeyDown={handleKeyDown}
			role="option"
			aria-selected={isActive}
			aria-label={t('layers.row.name', { n: index + 1 })}
			tabIndex={0}
			className="di-layer-row"
			style={{
				width: '100%',
				padding: '5px 6px 5px 4px',
				background: isActive ? dk(dark, T.purple10, T.purple20) : 'transparent',
				border: 'none',
				borderRadius: RADIUS.iconBtn,
				boxShadow: isActive ? `inset 2px 0 0 ${T.purple}` : 'none',
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				gap: 4,
				opacity: isDragging ? 0.5 : (isHidden ? 0.5 : 1),
				boxSizing: 'border-box',
				flexShrink: 0,
				transform: CSS.Transform.toString(transform),
				transition: isDragging ? transition : undefined,
				zIndex: isDragging ? 10 : undefined,
				position: isDragging ? 'relative' : undefined,
			}}
		>
			{/* Drag handle — only this element initiates drag */}
			<span
				ref={setActivatorNodeRef}
				{...listeners}
				onClick={(e) => e.stopPropagation()}
				style={{
					display: 'flex',
					alignItems: 'center',
					padding: '2px 0',
					cursor: isDragging ? 'grabbing' : 'grab',
					opacity: 0.4,
					flexShrink: 0,
					touchAction: 'none',
				}}
			>
				<Ico name="drag" size={14} color={mutedColor} />
			</span>

			{/* Z-axis position dot */}
			<div style={{
				width: 6,
				height: 6,
				borderRadius: '50%',
				backgroundColor: isActive ? T.purple : borderColor,
				flexShrink: 0,
			}} />

			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: TYPE.controlLabel.weight,
				fontSize: TYPE.controlLabel.size,
				color: nameColor,
				opacity: nameOpacity,
				flexShrink: 0,
				flex: 1,
				textAlign: 'left',
			}}>
				{t('layers.row.name', { n: index + 1 })}
			</span>

			<div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
				<span style={{
					fontFamily: TYPE.sora,
					fontWeight: 500,
					fontSize: 10,
					color: badgeColor,
					backgroundColor: badgeBg,
					padding: '2px 8px',
					borderRadius: 999,
					letterSpacing: '0.3px',
				}}>
					{t(`layers.badge.${colorMode.toLowerCase()}`)}
				</span>

				<button
					onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: index } as any); }}
					// Immediate action — no focus retention. See DiActionButton.
					onMouseDown={(e) => e.preventDefault()}
					style={{
						width: 20,
						height: 20,
						border: 'none',
						background: 'transparent',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: 0,
						borderRadius: 4,
						flexShrink: 0,
					}}
				>
					<Ico
						name={isHidden ? 'eye-off' : 'eye'}
						size={13}
						color={isHidden ? mutedColor : textColor}
					/>
				</button>

				<button
					onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_3D_LOCK', payload: index } as any); }}
					// Immediate action — no focus retention. See DiActionButton.
					onMouseDown={(e) => e.preventDefault()}
					style={{
						width: 20,
						height: 20,
						border: 'none',
						background: 'transparent',
						cursor: 'pointer',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: 0,
						borderRadius: 4,
						flexShrink: 0,
					}}
				>
					<Ico
						name={isLocked3D ? 'pin' : 'pin-off'}
						size={13}
						color={isLocked3D ? T.purple : mutedColor}
					/>
				</button>
			</div>
		</motion.div>
	);
}
