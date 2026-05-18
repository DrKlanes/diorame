import React, { useState } from 'react';
import {
	DndContext,
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
	closestCenter,
} from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useStrata, BASE_DEPTH_STEP, MAX_LAYERS } from '../StrataContext';
import { DiPill, DiPanel, DiActionButton } from '../../../design-system';
import { LayerRow } from './LayerRow';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { useTheme } from '../../../design-system/useTheme';

const STORAGE_KEY = 'diorame-layers-expanded';

export function LayersPanel() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const [isExpanded, setIsExpanded] = useState(() => {
		try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
		catch { return false; }
	});

	// dnd-kit sensors — distance:5 avoids drag activation on short clicks
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 5 },
		})
	);

	if (state.mode !== 'drawing') return null;
	if (state.isUIHidden) return null;

	const { totalLayers, currentLayerIndex, hiddenLayers } = state;
	const currentZIndex = currentLayerIndex * -BASE_DEPTH_STEP;
	const activeLayerEmpty = !state.shapes.some(s => s.zIndex === currentZIndex);
	const isCurrentHidden = hiddenLayers.includes(currentLayerIndex);
	const isAtTop = currentLayerIndex >= totalLayers - 1;
	const isAtBottom = currentLayerIndex <= 0;
	const canAdd = totalLayers < MAX_LAYERS;
	const canDelete = totalLayers > 1;
	const canDuplicate = !activeLayerEmpty && totalLayers < MAX_LAYERS;

	const toggle = (expanded: boolean) => {
		setIsExpanded(expanded);
		try { localStorage.setItem(STORAGE_KEY, String(expanded)); }
		catch {}
	};

	const HSep = () => (
		<div style={{
			width: 22,
			height: 1,
			backgroundColor: dk(dark, T.border, T.borderDark),
			alignSelf: 'center',
			flexShrink: 0,
		}} />
	);

	const mutedColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const borderColor = dk(dark, T.border, T.borderDark) as string;

	if (!isExpanded) {
		return (
			<div style={{ position: 'absolute', top: 12, right: 12, zIndex: 50 }}>
				<DiPill
					dark={dark}
					padding="8px 0"
					gap={2}
					style={{ flexDirection: 'column', width: 40, height: 'auto' } as React.CSSProperties}
				>
					{/* Badge N/total */}
					<div style={{
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'center',
						padding: '4px 0',
						flexShrink: 0,
					}}>
						<span style={{
							fontFamily: TYPE.sora,
							fontSize: 11,
							fontWeight: 500,
							color: T.purple,
							letterSpacing: '0.3px',
						}}>
							{currentLayerIndex + 1}
						</span>
						<span style={{
							fontFamily: TYPE.sora,
							fontSize: 11,
							fontWeight: 400,
							color: mutedColor,
							letterSpacing: '0.3px',
						}}>
							/{totalLayers}
						</span>
					</div>
					<HSep />
					{/* Chevron expand — top position */}
					<DiActionButton name="chevron-left"
						onClick={() => toggle(true)}
						dark={dark} tooltip="Expand layers panel" />
					<HSep />
					<DiActionButton
						name={isCurrentHidden ? 'eye-off' : 'eye'}
						onClick={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: currentLayerIndex } as any)}
						dark={dark}
						active={isCurrentHidden}
						tooltip={isCurrentHidden ? 'Show layer' : 'Hide layer'}
					/>
					<DiActionButton name="duplicate"
						onClick={() => dispatch({ type: 'DUPLICATE_LAYER', payload: currentLayerIndex } as any)}
						dark={dark} tooltip="Duplicate layer" disabled={!canDuplicate} />
					<DiActionButton name="trash"
						onClick={() => dispatch({ type: 'DELETE_CURRENT_LAYER' } as any)}
						dark={dark} tooltip="Delete layer" disabled={!canDelete} danger={true} />
					<HSep />
					<DiActionButton name="arrow-up"
						onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex + 1 } } as any)}
						dark={dark} tooltip="Move layer up" disabled={isAtTop} />
					<DiActionButton name="arrow-down"
						onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex - 1 } } as any)}
						dark={dark} tooltip="Move layer down" disabled={isAtBottom} />
					<HSep />
					<DiActionButton name="plus"
						onClick={() => dispatch({ type: 'NEXT_LAYER' } as any)}
						dark={dark} tooltip="Add layer" disabled={!canAdd} />
				</DiPill>
			</div>
		);
	}

	// Content-keyed layer descriptors for framer-motion FLIP animation
	const layerDescriptors = Array.from({ length: totalLayers }, (_, i) => {
		const zIdx = i * -BASE_DEPTH_STEP;
		const firstShape = state.shapes.find(s => s.zIndex === zIdx);
		return {
			slotIndex: i,
			contentKey: firstShape ? firstShape.id : `empty-${i}`,
		};
	}).sort((a, b) => b.slotIndex - a.slotIndex);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const fromSlot = layerDescriptors.find(d => d.contentKey === active.id);
		const toSlot = layerDescriptors.find(d => d.contentKey === over.id);
		if (!fromSlot || !toSlot) return;

		dispatch({
			type: 'MOVE_LAYER_TO',
			payload: { fromIndex: fromSlot.slotIndex, toIndex: toSlot.slotIndex },
		} as any);
	};

	return (
		<div style={{ position: 'absolute', top: 12, right: 12, zIndex: 50 }}>
			<DiPanel dark={dark} width={220} radius={20} padding="10px">
				{/* Header — chevron-right always top right */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
					<span style={{
						fontFamily: TYPE.panelHeader.family,
						fontWeight: TYPE.panelHeader.weight,
						fontSize: TYPE.panelHeader.size,
						letterSpacing: TYPE.panelHeader.letterSpacing,
						textTransform: TYPE.panelHeader.textTransform,
						color: dk(dark, T.dark, T.textDark),
						flexGrow: 1,
					}}>
						Layers
					</span>
					<span style={{
						fontFamily: TYPE.numericValue.family,
						fontWeight: TYPE.numericValue.weight,
						fontSize: TYPE.numericValue.size,
						color: mutedColor,
					}}>
						{totalLayers}/10
					</span>
					<DiActionButton name="plus"
						onClick={() => dispatch({ type: 'NEXT_LAYER' } as any)}
						dark={dark} tooltip="Add layer" disabled={!canAdd} />
					<DiActionButton name="chevron-right"
						onClick={() => toggle(false)}
						dark={dark} tooltip="Collapse" />
				</div>

				{/* Z-axis + Layer list */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
					{/* Near circle — camera end */}
					<div style={{
						width: 10,
						height: 10,
						borderRadius: '50%',
						backgroundColor: borderColor,
						marginLeft: -4,
						marginBottom: 3,
						flexShrink: 0,
					}} />
					<div style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 1,
						borderLeft: `1px solid ${borderColor}`,
						paddingLeft: 6,
					}}>
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={layerDescriptors.map(d => d.contentKey)}
								strategy={verticalListSortingStrategy}
							>
								{layerDescriptors.map(({ slotIndex, contentKey }) => (
									<LayerRow key={contentKey} sortableId={contentKey} index={slotIndex} dark={dark} />
								))}
							</SortableContext>
						</DndContext>
					</div>
					{/* Far circle — depth end */}
					<div style={{
						width: 5,
						height: 5,
						borderRadius: '50%',
						backgroundColor: borderColor,
						marginLeft: -2,
						marginTop: 3,
						flexShrink: 0,
					}} />
				</div>

				{/* Bottom actions */}
				<div style={{
					display: 'flex',
					gap: 2,
					justifyContent: 'flex-end',
					borderTop: `1px solid ${borderColor}`,
					paddingTop: 6,
				}}>
					<DiActionButton name="duplicate"
						onClick={() => dispatch({ type: 'DUPLICATE_LAYER', payload: currentLayerIndex } as any)}
						dark={dark} tooltip="Duplicate layer" disabled={!canDuplicate} />
					<DiActionButton name="arrow-up"
						onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex + 1 } } as any)}
						dark={dark} tooltip="Move layer up" disabled={isAtTop} />
					<DiActionButton name="arrow-down"
						onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex - 1 } } as any)}
						dark={dark} tooltip="Move layer down" disabled={isAtBottom} />
					<DiActionButton name="trash"
						onClick={() => dispatch({ type: 'DELETE_CURRENT_LAYER' } as any)}
						dark={dark} tooltip="Delete layer" disabled={!canDelete} danger={true} />
				</div>
			</DiPanel>
		</div>
	);
}
