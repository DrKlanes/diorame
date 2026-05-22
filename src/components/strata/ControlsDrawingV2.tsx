import React from 'react';
import { useTheme } from '../../design-system/useTheme';
import { useStrata } from './StrataContext';
import { DiActionButton } from '../../design-system';
import { TopBar } from './topbar/TopBar';
import { BottomBar } from './bottombar/BottomBar';
import { LayersPanel } from './layers/LayersPanel';
import { ColorPalette } from './colorpalette/ColorPalette';
import { LayerDotsRail } from './layers/LayerDotsRail';
import { ResetViewPill } from './viewport/ResetViewPill';
import { ToolOptionsPanel } from './drawing/ToolOptionsPanel';
import { TextSessionPanel } from './text/TextSessionPanel';

// Overlay panels float above DrawingToolbar:
// BottomBar sits at bottom:12; toolbar height = 40px; gap = 8px → bottom: 60
const OVERLAY_BOTTOM = 60;

/**
 * V2 UI root — assembles all atoms for both DRAW and VIEW modes.
 * Each atom self-filters by mode (returns null when inactive).
 * isUIHidden is enforced at root level: all atoms are unmounted together.
 * A persistent mini-button at bottom-right allows reactivating UI when hidden.
 * FXPanel added in sub-fase 10.5 (ControlsCinematicV2).
 *
 * Must be mounted inside a position:relative container.
 * LayerDotsRail + ResetViewPill use position:fixed (viewport-relative).
 */
export function ControlsDrawingV2() {
	const { dark } = useTheme();
	const { state, dispatch } = useStrata();

	return (
		<>
			{/* All UI atoms — hidden together when isUIHidden is true */}
			{!state.isUIHidden && (
				<>
					{/* TopBar — absolute top-12, three slots. FileControlsPill in draw, SnapshotRecordPill in view */}
					<TopBar />

					{/* BottomBar — absolute bottom-12 center. DrawingToolbar in draw, CameraBar in view */}
					<BottomBar />

					{/* LayersPanel — absolute top-50% right-12, drawing mode only */}
					<LayersPanel />

					{/* ColorPalette — absolute bottom-12 right-12, drawing mode only */}
					<ColorPalette />

					{/* LayerDotsRail — fixed right-8 center, drawing mode only */}
					<LayerDotsRail />

					{/* ResetViewPill — fixed left-8 bottom-8, drawing mode only */}
					<ResetViewPill />

					{/* ToolOptionsPanel — no built-in position; floated above DrawingToolbar (tool=line only) */}
					<div style={{
						position: 'absolute',
						bottom: OVERLAY_BOTTOM,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 60,
					}}>
						<ToolOptionsPanel dark={dark} />
					</div>

					{/* TextSessionPanel — no built-in position; overlay above DrawingToolbar (textSession.isActive only) */}
					<div style={{
						position: 'absolute',
						bottom: OVERLAY_BOTTOM,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 60,
					}}>
						<TextSessionPanel dark={dark} />
					</div>
				</>
			)}

			{/* Persistent mini-button — only visible when UI is hidden, allows reactivation */}
			{state.isUIHidden && (
				<div
					style={{
						position: 'fixed',
						bottom: 16,
						right: 16,
						zIndex: 100,
						opacity: 0.25,
						transition: 'opacity 0.2s ease',
					}}
					onPointerEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
					onPointerLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0.25'; }}
				>
					<DiActionButton
						name="eye"
						onClick={() => dispatch({ type: 'TOGGLE_UI' })}
						dark={dark}
						tooltip="Show UI"
					/>
				</div>
			)}
		</>
	);
}
