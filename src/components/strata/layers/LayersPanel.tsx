import React, { useState } from 'react';
import { useStrata, BASE_DEPTH_STEP, MAX_LAYERS } from '../StrataContext';
import { DiPill, DiPanel } from '../../../design-system';
import { IconBtn } from '../topbar/_shared';
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

	const off = (cond: boolean): React.CSSProperties =>
		cond ? { opacity: 0.3, pointerEvents: 'none' } : {};

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
					<IconBtn name="chevron-left"
						onClick={() => toggle(true)}
						dark={dark} tooltip="Expand layers panel" />
					<HSep />
					<IconBtn
						name={isCurrentHidden ? 'eye-off' : 'eye'}
						onClick={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: currentLayerIndex } as any)}
						dark={dark}
						active={isCurrentHidden}
						tooltip={isCurrentHidden ? 'Show layer' : 'Hide layer'}
					/>
					<div style={off(!canDuplicate)}>
						<IconBtn name="duplicate"
							onClick={() => dispatch({ type: 'DUPLICATE_LAYER', payload: currentLayerIndex } as any)}
							dark={dark} tooltip="Duplicate layer" />
					</div>
					<div style={off(!canDelete)}>
						<IconBtn name="trash"
							onClick={() => dispatch({ type: 'DELETE_CURRENT_LAYER' } as any)}
							dark={dark} tooltip="Delete layer" />
					</div>
					<HSep />
					<div style={off(isAtTop)}>
						<IconBtn name="arrow-up"
							onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex + 1 } } as any)}
							dark={dark} tooltip="Move layer up" />
					</div>
					<div style={off(isAtBottom)}>
						<IconBtn name="arrow-down"
							onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex - 1 } } as any)}
							dark={dark} tooltip="Move layer down" />
					</div>
					<HSep />
					<div style={off(!canAdd)}>
						<IconBtn name="plus"
							onClick={() => dispatch({ type: 'NEXT_LAYER' } as any)}
							dark={dark} tooltip="Add layer" />
					</div>
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
					<div style={off(!canAdd)}>
						<IconBtn name="plus"
							onClick={() => dispatch({ type: 'NEXT_LAYER' } as any)}
							dark={dark} tooltip="Add layer" />
					</div>
					<IconBtn name="chevron-right"
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
						{layerDescriptors.map(({ slotIndex, contentKey }) => (
							<LayerRow key={contentKey} index={slotIndex} dark={dark} />
						))}
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
					<div style={off(!canDuplicate)}>
						<IconBtn name="duplicate"
							onClick={() => dispatch({ type: 'DUPLICATE_LAYER', payload: currentLayerIndex } as any)}
							dark={dark} tooltip="Duplicate layer" />
					</div>
					<div style={off(isAtTop)}>
						<IconBtn name="arrow-up"
							onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex + 1 } } as any)}
							dark={dark} tooltip="Move layer up" />
					</div>
					<div style={off(isAtBottom)}>
						<IconBtn name="arrow-down"
							onClick={() => dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: currentLayerIndex, toIndex: currentLayerIndex - 1 } } as any)}
							dark={dark} tooltip="Move layer down" />
					</div>
					<div style={off(!canDelete)}>
						<IconBtn name="trash"
							onClick={() => dispatch({ type: 'DELETE_CURRENT_LAYER' } as any)}
							dark={dark} tooltip="Delete layer" />
					</div>
				</div>
			</DiPanel>
		</div>
	);
}
