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

	// Keyboard shortcuts
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (state.textSession.isActive) return;

			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e' && !e.shiftKey) {
				e.preventDefault();
				handleExportRequest('svg');
				return;
			}

			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
				e.preventDefault();
				handleExportRequest('svgz');
				return;
			}

			if (e.shiftKey && e.key.toLowerCase() === 'd') {
				e.preventDefault();
				dispatch({ type: 'TOGGLE_DARK_MODE' });
				return;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleExportRequest, dispatch, state.textSession.isActive]);

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
				<EnhancedTooltip content="Drawing Mode" shortcut="D" disabled={state.mode === 'drawing'}>
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
				<EnhancedTooltip content="Preview Mode" shortcut="V" disabled={state.mode === 'cinematic'}>
					<Button
						variant={state.mode === 'cinematic' ? 'secondary' : 'ghost'}
						size="sm"
						onClick={() => {
							dispatch({ type: 'SET_MODE', payload: 'cinematic' });
							dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 500 } });
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
