import React from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { Button } from '../ui/button';
import { Play, Eye, EyeOff } from 'lucide-react';
import { cn } from '../ui/utils';
import { EnhancedTooltip } from '../ui/enhanced-tooltip';
import { ControlsDrawing } from './ControlsDrawing';
import { ControlsCinematic } from './ControlsCinematic';
import { ControlsExport } from './ControlsExport';
import { diTokens } from '../../design-system/tokens';
import { toast } from 'sonner@2.0.3';

export const Controls = () => {
	const { state, dispatch } = useStrata();
	const [uiFocusLayer, setUiFocusLayer] = React.useState(0);
	const [svgExportOpen, setSvgExportOpen] = React.useState(false);
	const [showComplexityWarning, setShowComplexityWarning] = React.useState(false);
	const [pendingExportFormat, setPendingExportFormat] = React.useState<'svg' | 'svgz' | null>(null);

	// Sync uiFocusLayer with state when locked
	React.useEffect(() => {
		if (state.postProcessing.focusTargetLayer !== undefined && state.postProcessing.focusTargetLayer !== -1) {
			setUiFocusLayer(state.postProcessing.focusTargetLayer);
		}
	}, [state.postProcessing.focusTargetLayer]);

	// Reset view initialization flag on mount
	React.useEffect(() => {
		sessionStorage.removeItem('diorame-view-initialized');
	}, []);

	const getActiveZ = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;

	// Calculate scene complexity
	const getSceneComplexity = React.useCallback(() => {
		let totalShapes = 0;

		if (state.shapes) {
			totalShapes = state.shapes.filter(shape => {
				return !state.hiddenLayers.includes(shape.zIndex);
			}).length;
		}

		return { totalShapes };
	}, [state.shapes, state.hiddenLayers]);

	const COMPLEXITY_THRESHOLD = 800;

	const handleExportRequest = React.useCallback((format: 'svg' | 'svgz') => {
		const { totalShapes } = getSceneComplexity();

		if (totalShapes > COMPLEXITY_THRESHOLD) {
			setPendingExportFormat(format);
			setShowComplexityWarning(true);
			setSvgExportOpen(false);
		} else {
			dispatch({ type: 'REQUEST_EXPORT', payload: format });
			setSvgExportOpen(false);
		}
	}, [getSceneComplexity, dispatch]);

	const handleProceedWithExport = React.useCallback(() => {
		if (pendingExportFormat) {
			dispatch({ type: 'REQUEST_EXPORT', payload: pendingExportFormat });
		}
		setShowComplexityWarning(false);
		setPendingExportFormat(null);
	}, [pendingExportFormat, dispatch]);

	const handleCancelExport = React.useCallback(() => {
		setShowComplexityWarning(false);
		setPendingExportFormat(null);
	}, []);

	const handleReturnToDraw = () => {
		dispatch({ type: 'SET_MODE', payload: 'drawing' });
		const activeZ = getActiveZ(state.currentLayerIndex);
		dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: activeZ, rotation: 0 } });
	};

	// Save project (for Ctrl+S shortcut)
	const handleSaveProject = React.useCallback(() => {
		const data = {
			shapes: state.shapes, palette: state.palette, totalLayers: state.totalLayers,
			isDarkMode: state.isDarkMode, postProcessing: state.postProcessing,
			postProcessingEnabled: state.postProcessingEnabled, cinematicType: state.cinematicType,
			hiddenLayers: state.hiddenLayers, locked3DLayers: state.locked3DLayers,
			projectName: state.projectName, layerRenderModes: state.layerRenderModes,
			layerGradParams: state.layerGradParams, currentLineThickness: state.currentLineThickness,
			lineMode: state.lineMode, tool: state.tool, activePaletteId: state.activePaletteId,
			focalLength: state.focalLength, viewZoomOffset: state.viewZoomOffset,
			layerSpacingFactor: state.layerSpacingFactor, cinematicSpeed: state.cinematicSpeed,
			isHandheldEnabled: state.isHandheldEnabled, handheldIntensity: state.handheldIntensity,
		};
		const sanitized = state.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		setTimeout(() => {
			let url: string | null = null;
			let link: HTMLAnchorElement | null = null;
			try {
				const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
				url = URL.createObjectURL(blob);
				link = document.createElement('a');
				link.href = url;
				link.download = `${sanitized}-${Date.now()}.dior`;
				link.style.display = 'none';
				document.body.appendChild(link);
				link.click();
				toast.success('Project saved', { description: `${sanitized}.dior`, duration: 2000 });
			} catch (err) {
				toast.error('Failed to save', { description: 'Please try again' });
			} finally {
				setTimeout(() => {
					try { if (link?.parentNode) document.body.removeChild(link!); } catch (_) { /* */ }
					if (url) URL.revokeObjectURL(url);
				}, 200);
			}
		}, 0);
	}, [state]);

	// Keyboard shortcuts
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Guard 1: text session active
			if (state.textSession.isActive) return;
			// Guard 2: input/textarea focused
			const activeEl = document.activeElement;
			if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

			const cmd = e.metaKey || e.ctrlKey;
			const shift = e.shiftKey;

			// === EXISTING SHORTCUTS ===
			if (cmd && e.key.toLowerCase() === 'e' && !shift) {
				e.preventDefault();
				handleExportRequest('svg');
				return;
			}
			if (cmd && shift && e.key.toLowerCase() === 'e') {
				e.preventDefault();
				handleExportRequest('svgz');
				return;
			}
			if (shift && e.key.toLowerCase() === 'd') {
				e.preventDefault();
				dispatch({ type: 'TOGGLE_DARK_MODE' });
				return;
			}
			if (cmd && !shift && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				dispatch({ type: 'UNDO' });
				return;
			}
			if (cmd && e.key.toLowerCase() === 'y') {
				e.preventDefault();
				dispatch({ type: 'REDO' });
				return;
			}

			// === NEW GLOBAL SHORTCUTS ===
			if (cmd && !shift && e.key === 's') {
				e.preventDefault();
				handleSaveProject();
				return;
			}
			if (!cmd && shift && e.key === '?') {
				dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
				return;
			}

			// === DRAWING MODE ONLY (Guard 3) ===
			if (state.mode !== 'drawing') return;

			if (!cmd && !shift) {
				switch (e.key.toLowerCase()) {
					case 'b': dispatch({ type: 'SET_TOOL', payload: 'brush' }); return;
					case 'l': dispatch({ type: 'SET_TOOL', payload: 'line' }); return;
					case 'e': dispatch({ type: 'SET_TOOL', payload: 'eraser' }); return;
					case 't': dispatch({ type: 'SET_TOOL', payload: 'text' }); return;
					case 'm': dispatch({ type: 'SET_TOOL', payload: 'move' }); return;
				}
				if (e.key === '[') { dispatch({ type: 'PREV_LAYER' }); return; }
				if (e.key === ']') { dispatch({ type: 'NEXT_LAYER' }); return; }
				if (e.key === ' ') { e.preventDefault(); dispatch({ type: 'RESET_DRAWING_VIEW' }); return; }
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleExportRequest, handleSaveProject, dispatch, state.textSession.isActive, state.mode]);

	if (state.isUIHidden) {
		return (
			<div className="absolute top-6 right-6 z-50 animate-in fade-in duration-300">
				<Button
					variant="secondary"
					size="icon"
					className="rounded-full shadow-md opacity-50 hover:opacity-100 transition-opacity"
					onClick={() => dispatch({ type: 'TOGGLE_UI' })}
					title="Show UI"
				>
					<Eye className="w-4 h-4" />
				</Button>
			</div>
		);
	}

	return (
		<>
			{/* Top Center: Mode Switch */}
			<div className={cn(
				"absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full shadow-sm border transition-all duration-200 hover:shadow-md z-50 select-none backdrop-blur-sm",
				diTokens.bgAlt, diTokens.border
			)}>
				<EnhancedTooltip content="Drawing Mode" disabled={state.mode === 'drawing'}>
					<Button
						variant={state.mode === 'drawing' ? 'secondary' : 'ghost'}
						size="sm"
						onClick={handleReturnToDraw}
						className={cn(
							"rounded-full px-4 text-xs font-medium tracking-wide transition-all duration-300",
							state.mode === 'drawing'
								? "bg-[#9a0ff9] text-white hover:bg-[#8a0fe0] scale-105 shadow-sm"
								: "hover:bg-slate-50"
						)}
					>
						DRAW
					</Button>
				</EnhancedTooltip>
				<div className="h-4 w-[1px] bg-slate-200" />
				<EnhancedTooltip content="Preview Mode" disabled={state.mode === 'cinematic'}>
					<Button
						variant={state.mode === 'cinematic' ? 'secondary' : 'ghost'}
						size="sm"
						onClick={() => {
							const isFirstView = !sessionStorage.getItem('diorame-view-initialized');
							dispatch({ type: 'SET_MODE', payload: 'cinematic' });
							dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 500 } });
							if (isFirstView) {
								sessionStorage.setItem('diorame-view-initialized', 'true');
								dispatch({ type: 'SET_FOCAL_LENGTH', payload: 3840 });
								dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: -2500 });
								dispatch({ type: 'SET_LAYER_SPACING_FACTOR', payload: 1.0 });
								dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'forward' });
							}
						}}
						className={cn(
							"rounded-full px-4 text-xs font-medium tracking-wide transition-all duration-300",
							state.mode === 'cinematic'
								? "bg-[#9a0ff9] text-white hover:bg-[#8a0fe0] scale-105 shadow-sm"
								: "hover:bg-slate-50"
						)}
					>
						<Play className="w-3 h-3 mr-1.5" /> VIEW
					</Button>
				</EnhancedTooltip>

				{state.mode === 'cinematic' && (
					<>
						<div className="h-4 w-[1px] bg-slate-200" />
						<Button
							variant="ghost"
							size="icon"
							onClick={() => dispatch({ type: 'TOGGLE_UI' })}
							className="rounded-full w-8 h-8"
							title="Hide UI"
						>
							<EyeOff className={cn("w-3.5 h-3.5", diTokens.textSubtle)} />
						</Button>
					</>
				)}
			</div>

			{/* Drawing Mode */}
			{state.mode === 'drawing' && (
				<ControlsDrawing
					svgExportOpen={svgExportOpen}
					setSvgExportOpen={setSvgExportOpen}
					handleExportRequest={handleExportRequest}
				/>
			)}

			{/* Cinematic Mode */}
			{state.mode === 'cinematic' && (
				<ControlsCinematic
					uiFocusLayer={uiFocusLayer}
					setUiFocusLayer={setUiFocusLayer}
				/>
			)}

			{/* Export Warning Dialog */}
			<ControlsExport
				showComplexityWarning={showComplexityWarning}
				totalShapes={getSceneComplexity().totalShapes}
				onCancel={handleCancelExport}
				onProceed={handleProceedWithExport}
			/>
		</>
	);
};
