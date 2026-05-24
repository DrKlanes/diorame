import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../design-system/useTheme';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { useSaveLoad } from '../../hooks/useSaveLoad';
import { useExportFlow } from '../../hooks/useExportFlow';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { DiPill } from '../../design-system';
import { useTranslation } from '../../i18n';
import { TopBar } from './topbar/TopBar';
import { BottomBar } from './bottombar/BottomBar';
import { LayersPanel } from './layers/LayersPanel';
import { ColorPalette } from './colorpalette/ColorPalette';
import { ResetViewPill } from './viewport/ResetViewPill';
import { GridTogglePill } from './viewport/GridTogglePill';
import { FXPanel } from './fx/FXPanel';
import { ToolOptionsPanel } from './drawing/ToolOptionsPanel';
import { TextSessionPanel } from './text/TextSessionPanel';
import { ShowUIButton } from './viewport/ShowUIButton';

// Overlay panels float above DrawingToolbar:
// BottomBar sits at bottom:12; toolbar height = 40px; gap = 8px → bottom: 60
const OVERLAY_BOTTOM = 60;

/**
 * V2 controls root — assembles all atoms for both DRAW and VIEW modes.
 * Each atom self-filters by mode (returns null when inactive).
 * isUIHidden is enforced at root level: all atoms are unmounted together.
 * A persistent mini-button at bottom-right allows reactivating UI when hidden.
 *
 * Also hosts 3 global side-effects (preserved from legacy Controls.tsx):
 *   1) useKeyboardShortcuts — all global keyboard shortcuts
 *   2) sessionStorage cleanup on mount — re-arms first-view defaults each refresh
 *   3) mode-change effect — camera reset + first-view init when entering cinematic
 *
 * Note: useSaveLoad and useExportFlow are also instantiated by FileControlsPill
 * internally. Light duplication is intentional and harmless (both hooks rely on
 * useStrata context, not local state). May be hoisted in a future housekeeping pass.
 *
 * Must be mounted inside a position:relative container.
 * LayerDotsRail + ResetViewPill use position:fixed (viewport-relative).
 */
export function ControlsV2() {
	const { dark } = useTheme();
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	// Side-effect 1: global keyboard shortcuts
	const { handleSaveProject } = useSaveLoad();
	const { handleExportRequest } = useExportFlow();
	useKeyboardShortcuts({ handleExportRequest, handleSaveProject });

	// Side-effect 2: clear "first view initialized" flag on mount
	useEffect(() => {
		sessionStorage.removeItem('diorame-view-initialized');
	}, []);

	// Side-effect 3: mode-change camera reset + first-view init
	const prevModeRef = useRef(state.mode);
	useEffect(() => {
		if (prevModeRef.current === state.mode) return;
		prevModeRef.current = state.mode;

		if (state.mode === 'cinematic') {
			const isFirstView = !sessionStorage.getItem('diorame-view-initialized');
			dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 500 } });
			if (isFirstView) {
				sessionStorage.setItem('diorame-view-initialized', 'true');
				dispatch({ type: 'SET_FOCAL_LENGTH', payload: 3840 });
				dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: -2500 });
				dispatch({ type: 'SET_LAYER_SPACING_FACTOR', payload: 1.0 });
				dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'forward' });
			}
		} else if (state.mode === 'drawing') {
			const activeZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
			dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: activeZ, rotation: 0 } });
		}
	}, [state.mode, state.currentLayerIndex, dispatch]);

	return (
		<>
			{/* All UI atoms — hidden together when isUIHidden is true */}
			{/* Wrapper applies pointer-events: none during active drag → panels become pass-through */}
			{!state.isUIHidden && (
				<div style={{ pointerEvents: state.isDrawing ? 'none' : undefined }}>
					{/* TopBar — absolute top-12, three slots. FileControlsPill in draw, SnapshotRecordPill in view */}
					<TopBar />

					{/* BottomBar — absolute bottom-12 center. DrawingToolbar in draw, CameraBar in view */}
					<BottomBar />

					{/* LayersPanel — absolute top-72 right-12, drawing mode only */}
					<LayersPanel />

					{/* ColorPalette — absolute bottom-12 right-12, drawing mode only */}
					<ColorPalette />


					{/* ViewPills — fixed left-8 bottom-8, drawing mode only. Single DiPill: GridToggle (left) + ResetView (right) */}
					{state.mode === 'drawing' && (
						<div style={{
							position: 'fixed',
							left: 8,
							bottom: 8,
							zIndex: 50,
						}}>
							<DiPill dark={dark} padding="5px">
								<GridTogglePill />
								<ResetViewPill />
							</DiPill>
						</div>
					)}

					{/* FXPanel — absolute top-50% right-12, cinematic mode only */}
					<FXPanel />

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
				</div>
			)}

			{/* Persistent mini-button — only visible when UI is hidden, allows reactivation */}
			{state.isUIHidden && <ShowUIButton />}
		</>
	);
}
