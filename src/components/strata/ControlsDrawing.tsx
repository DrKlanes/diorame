import React from 'react';
import { useStrata, BASE_DEPTH_STEP, MAX_LAYERS } from './StrataContext';
import { Button } from '../ui/button';
import { RippleButton } from '../ui/ripple-button';
import { Undo, Redo, Trash2, ArrowLeftRight, Layers, Eye, EyeOff, FileCode, Pen, Type, AlignLeft, AlignCenter, AlignRight, Check, X, Waves, Save, FolderOpen, Eraser, Info, Move, Lock, Unlock, Maximize, FlipHorizontal, Copy, Droplet, Paintbrush, Target, ChevronLeft, ChevronRight, Plus, Sun, Moon } from 'lucide-react';
import { cn } from '../ui/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import { toast } from 'sonner@2.0.3';
import { EnhancedTooltip } from '../ui/enhanced-tooltip';
import { DiIconButton } from '../../design-system/DiIconButton';
import { DiDivider } from '../../design-system/DiDivider';
import { DiBadge } from '../../design-system/DiBadge';
import { diTokens } from '../../design-system/tokens';
import { LayersPanel } from './LayersPanel';
import { ToolOptionsPanel } from './ToolOptionsPanel';

interface ControlsDrawingProps {
	svgExportOpen: boolean;
	setSvgExportOpen: (v: boolean) => void;
	handleExportRequest: (format: 'svg' | 'svgz') => void;
}

export const ControlsDrawing = ({
	svgExportOpen,
	setSvgExportOpen,
	handleExportRequest,
}: ControlsDrawingProps) => {
	const { state, dispatch } = useStrata();
	const fileInputRef = React.useRef<HTMLInputElement>(null);
	const [showLayersPanel, setShowLayersPanel] = React.useState(false);

	const getActiveZ = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;
	const currentLayerZ = getActiveZ(state.currentLayerIndex);
	const currentLayerHasShapes = state.shapes.some(shape => shape.zIndex === currentLayerZ);

	const handleSaveProject = () => {
		try {
			const projectData = {
				shapes: state.shapes,
				palette: state.palette,
				totalLayers: state.totalLayers,
				isDarkMode: state.isDarkMode,
				postProcessing: state.postProcessing,
				postProcessingEnabled: state.postProcessingEnabled,
				cinematicType: state.cinematicType,
				hiddenLayers: state.hiddenLayers,
				locked3DLayers: state.locked3DLayers,
				projectName: state.projectName,
				layerRenderModes: state.layerRenderModes,
				layerGradParams: state.layerGradParams,
				currentLineThickness: state.currentLineThickness,
				lineMode: state.lineMode,
				tool: state.tool,
				activePaletteId: state.activePaletteId
			};

			const sanitizedName = state.projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

			setTimeout(() => {
				let url: string | null = null;
				let link: HTMLAnchorElement | null = null;
				try {
					const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
					url = URL.createObjectURL(blob);
					link = document.createElement('a');
					link.href = url;
					link.download = `${sanitizedName}-${Date.now()}.dior`;
					link.style.display = 'none';
					document.body.appendChild(link);
					link.click();

					toast.success('Project saved successfully', {
						description: `Saved as ${sanitizedName}.dior`,
						duration: 2000,
					});
				} catch (err) {
					console.error('Save failed', err);
					toast.error('Failed to save project', {
						description: 'Please try again',
						duration: 3000,
					});
				} finally {
					setTimeout(() => {
						try { if (link && link.parentNode) document.body.removeChild(link); } catch (_) { /* already removed */ }
						if (url) URL.revokeObjectURL(url);
						const canvas = document.querySelector('canvas');
						if (canvas) (canvas as HTMLCanvasElement).focus();
					}, 200);
				}
			}, 0);
		} catch (err) {
			console.error('Save setup failed', err);
			toast.error('Failed to save project', {
				description: 'Please try again',
				duration: 3000,
			});
		}
	};

	const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const MAX_FILE_SIZE = 50 * 1024 * 1024;
		if (file.size > MAX_FILE_SIZE) {
			toast.error('File too large', {
				description: 'Maximum file size is 50 MB',
				duration: 3000,
			});
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const json = JSON.parse(event.target?.result as string);
				if (!json || typeof json !== 'object' || Array.isArray(json)) {
					throw new Error('Invalid project format');
				}
				if (!Array.isArray(json.shapes)) {
					throw new Error('Missing or invalid shapes data');
				}
				dispatch({ type: 'LOAD_PROJECT', payload: json });
				toast.success('Project loaded successfully', {
					description: `Loaded ${json.shapes.length} shapes`,
					duration: 2000,
				});
			} catch (err) {
				console.error("Failed to load project", err);
				toast.error('Failed to load project', {
					description: err instanceof Error ? err.message : 'Please check if the file is valid',
					duration: 3000,
				});
			}
		};
		reader.readAsText(file);
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	return (
		<>
			{/* Active Tool & Layer Indicator */}
			<div className={cn(
				"absolute top-6 right-4 sm:right-6 z-40 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 transition-all duration-200 backdrop-blur-sm",
				diTokens.bg, diTokens.border, "border"
			)}>
				<div className="flex items-center gap-2">
					<span className={cn("text-[11px] font-bold tracking-wider uppercase", diTokens.textMuted)}>
						Layer {state.currentLayerIndex + 1}
					</span>
					<DiDivider orientation="vertical" />
					<div className="flex items-center gap-1.5">
						{state.tool === 'brush' && <Droplet className={cn("w-4 h-4", diTokens.iconColor)} />}
						{state.tool === 'line' && <Paintbrush className={cn("w-4 h-4", diTokens.iconColor)} />}
						{state.tool === 'eraser' && <Eraser className={cn("w-4 h-4", diTokens.iconColor)} />}
						{state.tool === 'text' && <Type className={cn("w-4 h-4", diTokens.iconColor)} />}
						{state.tool === 'move' && <Move className={cn("w-4 h-4", diTokens.iconColor)} />}
						<span className={cn("text-sm font-semibold capitalize", diTokens.text)}>
							{state.tool === 'brush' ? 'Blob' : state.tool === 'line' ? 'Brush' : state.tool === 'eraser' ? 'Eraser' : state.tool === 'text' ? 'Text' : 'Move'}
						</span>
					</div>

					{/* Extra Tools Context */}
					{(state.tool === 'brush' || state.tool === 'line') && (
						state.isSymmetryEnabled || state.isDrawInside || state.isDrawBehind || state.isOrganicMode
					) && (
						<>
							<DiDivider orientation="vertical" />
							<div className="flex items-center gap-1">
								{state.isSymmetryEnabled && (
									<DiBadge icon={<FlipHorizontal className="w-3 h-3" />}>SYM</DiBadge>
								)}
								{state.isDrawInside && (
									<DiBadge icon={<Target className="w-3 h-3" />}>IN</DiBadge>
								)}
								{state.isDrawBehind && (
									<DiBadge icon={<Layers className="w-3 h-3" />}>BACK</DiBadge>
								)}
								{state.isOrganicMode && (
									<DiBadge icon={<Waves className="w-3 h-3" />}>FLUID</DiBadge>
								)}
							</div>
						</>
					)}
				</div>
			</div>

			{/* Top Left: Project Controls & Dark Mode */}
			<div className="absolute top-6 left-4 sm:left-6 flex flex-col gap-2 z-50 pointer-events-none">

				{/* File Controls */}
				<div className={cn(
					"p-1.5 rounded-full shadow-sm border flex items-center gap-2 sm:gap-1 select-none pointer-events-auto backdrop-blur-sm",
					diTokens.bgAlt, diTokens.border
				)}>
					<DiIconButton
						icon={<Save className="w-4 h-4" />}
						label="Save Project"
						shortcut="Cmd+S"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						onClick={handleSaveProject}
					/>

					<DiIconButton
						icon={<FolderOpen className="w-4 h-4" />}
						label="Open Project"
						shortcut="Cmd+O"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						onClick={() => fileInputRef.current?.click()}
					/>
					<input
						type="file"
						ref={fileInputRef}
						onChange={handleLoadProject}
						className="hidden"
						accept=".dior,.json"
					/>

					<Popover open={svgExportOpen} onOpenChange={setSvgExportOpen}>
						<EnhancedTooltip content="Export SVG" shortcut="Cmd+E">
							<PopoverTrigger asChild>
								<RippleButton
									variant="ghost"
									size="icon"
									className={cn(
										"h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation",
										diTokens.hover
									)}
									disabled={state.isExporting}
								>
									<FileCode className={cn("w-4 h-4", diTokens.iconColor)} />
								</RippleButton>
							</PopoverTrigger>
						</EnhancedTooltip>
						<PopoverContent
							className={cn("w-auto p-2", diTokens.bg, diTokens.border)}
							align="start"
							sideOffset={8}
						>
							<div className="flex flex-col gap-1">
								<button
									onClick={() => handleExportRequest('svg')}
									className={cn(
										"px-3 py-2 text-sm rounded-md text-left transition-colors",
										diTokens.hover,
										diTokens.text
									)}
								>
									SVG
								</button>
								<button
									onClick={() => handleExportRequest('svgz')}
									className={cn(
										"px-3 py-2 text-sm rounded-md text-left transition-colors",
										diTokens.hover,
										diTokens.text
									)}
								>
									SVG (Compressed)
								</button>
							</div>
						</PopoverContent>
					</Popover>

					<DiDivider orientation="vertical" />
					<DiIconButton
						icon={<Info className="w-4 h-4" />}
						label="About & Help"
						shortcut="?"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						onClick={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
					/>
				</div>

				{/* Project Name Editor */}
				<div className={cn(
					"px-3 py-1.5 rounded-full shadow-sm border select-none pointer-events-auto backdrop-blur-sm flex items-center gap-2",
					diTokens.bgAlt, diTokens.border
				)}>
					<Pen className={cn("w-3.5 h-3.5", diTokens.textMuted)} />
					<input
						type="text"
						value={state.projectName}
						onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
						onFocus={(e) => e.target.select()}
						maxLength={50}
						className={cn(
							"bg-transparent border-none outline-none text-xs font-medium w-32 placeholder:text-slate-400",
							diTokens.text
						)}
						placeholder="Project Name"
					/>
				</div>

				{/* Dark Mode */}
				<div className={cn(
					"p-1.5 rounded-full shadow-sm border select-none w-fit pointer-events-auto backdrop-blur-sm flex items-center gap-1",
					diTokens.bgAlt, diTokens.border
				)}>
					<DiIconButton
						icon={state.isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
						label="Toggle Canvas Dark Paper"
						shortcut="Shift+D"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
					/>
				</div>
			</div>

			{/* Layer Control (Bottom Center) */}
			<div className="absolute bottom-6 left-4 translate-x-0 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 select-none pointer-events-none">
				<div className={cn("backdrop-blur-sm px-2 py-1.5 rounded-full shadow-sm border flex items-center gap-1 pointer-events-auto", diTokens.bg, diTokens.border)}>

					{/* Visibility Toggle */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: state.currentLayerIndex })}
						className="h-8 w-8 rounded-full"
						title={state.hiddenLayers.includes(state.currentLayerIndex) ? "Show Layer" : "Hide Layer"}
					>
						{state.hiddenLayers.includes(state.currentLayerIndex) ? (
							<EyeOff className={cn("w-4 h-4", diTokens.textMuted)} />
						) : (
							<Eye className={cn("w-4 h-4", diTokens.iconColor)} />
						)}
					</Button>

					{/* 3D Lock Toggle */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => dispatch({ type: 'TOGGLE_3D_LOCK', payload: state.currentLayerIndex })}
						className="h-8 w-8 rounded-full"
						title={state.locked3DLayers.includes(state.currentLayerIndex) ? "Unlock 3D (Enable Parallax)" : "Lock 3D (Disable Parallax)"}
					>
						{state.locked3DLayers.includes(state.currentLayerIndex) ? (
							<Lock className="w-4 h-4 text-amber-600" />
						) : (
							<Unlock className={cn("w-4 h-4", diTokens.iconColor)} />
						)}
					</Button>

					{/* Duplicate Layer */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							if (state.totalLayers >= MAX_LAYERS) {
								toast.error('Maximum 10 layers reached', {
									description: 'Cannot duplicate more layers',
									duration: 2000,
								});
								return;
							}

							const currentLayerZ2 = state.currentLayerIndex * -BASE_DEPTH_STEP;
							const hasShapes = state.shapes.some(s => s.zIndex === currentLayerZ2);

							if (!hasShapes) {
								toast.error('Cannot duplicate empty layer', {
									description: 'Draw something first',
									duration: 2000,
								});
								return;
							}

							dispatch({ type: 'DUPLICATE_LAYER', payload: state.currentLayerIndex });
							toast.success(`Layer ${state.currentLayerIndex + 1} duplicated`, {
								duration: 1500,
							});
						}}
						disabled={state.totalLayers >= MAX_LAYERS || !state.shapes.some(s => s.zIndex === state.currentLayerIndex * -BASE_DEPTH_STEP)}
						className="h-8 w-8 rounded-full disabled:opacity-50"
						title={
							state.totalLayers >= MAX_LAYERS
								? "Maximum 10 layers reached"
								: !state.shapes.some(s => s.zIndex === state.currentLayerIndex * -BASE_DEPTH_STEP)
									? "Cannot duplicate empty layer"
									: "Duplicate Current Layer"
						}
					>
						<Copy className={cn("w-4 h-4", diTokens.iconColor)} />
					</Button>

					{/* Delete Layer */}
					<Button
						variant="ghost"
						size="icon"
						onClick={() => dispatch({ type: 'DELETE_CURRENT_LAYER' })}
						disabled={state.totalLayers <= 1}
						className="h-8 w-8 rounded-full disabled:opacity-50"
						title="Delete Current Layer"
					>
						<Trash2 className={cn("w-4 h-4 hover:text-red-500", diTokens.iconColor)} />
					</Button>

					<DiDivider orientation="vertical" />

					{/* Prev Layer */}
					<EnhancedTooltip content="Previous Layer" shortcut="[" disabled={state.currentLayerIndex === 0}>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								dispatch({ type: 'PREV_LAYER' });
								if (state.currentLayerIndex > 0) {
									toast(`Layer ${state.currentLayerIndex}`, {
										duration: 1000,
										icon: '🎨',
									});
								}
							}}
							disabled={state.currentLayerIndex === 0}
							className="h-8 w-8 rounded-full hover:scale-110 active:scale-95 transition-transform"
						>
							<ChevronLeft className={cn("w-4 h-4", diTokens.iconColor)} />
						</Button>
					</EnhancedTooltip>

					<div className="px-3 flex flex-col items-center">
						<span className={cn("text-[10px] uppercase font-bold tracking-wider", diTokens.textMuted)}>Layer</span>
						<span className={cn("text-sm font-semibold leading-none transition-all", diTokens.text)}>
							{state.currentLayerIndex + 1} <span className={cn("font-normal", diTokens.textMuted)}>/ {state.totalLayers}</span>
						</span>
					</div>

					{/* Next / New Layer */}
					<EnhancedTooltip
						content={state.currentLayerIndex === state.totalLayers - 1 ? "New Layer" : "Next Layer"}
						shortcut="]"
						disabled={state.totalLayers >= MAX_LAYERS && state.currentLayerIndex === state.totalLayers - 1}
					>
						<Button
							variant={state.currentLayerIndex === state.totalLayers - 1 ? "default" : "ghost"}
							size="icon"
							onClick={() => {
								const isCreatingNew = state.currentLayerIndex === state.totalLayers - 1;
								dispatch({ type: 'NEXT_LAYER' });
								if (isCreatingNew) {
									toast.success(`New layer ${state.totalLayers + 1} created`, {
										duration: 1500,
									});
								} else {
									toast(`Layer ${state.currentLayerIndex + 2}`, {
										duration: 1000,
										icon: '🎨',
									});
								}
							}}
							disabled={state.totalLayers >= MAX_LAYERS && state.currentLayerIndex === state.totalLayers - 1}
							className={cn(
								"h-8 w-8 rounded-full transition-all hover:scale-110 active:scale-95",
								state.currentLayerIndex === state.totalLayers - 1
									? "bg-slate-900 text-white hover:bg-slate-800 shadow-md"
									: ""
							)}
						>
							{state.currentLayerIndex === state.totalLayers - 1 ? (
								<Plus className="w-4 h-4" />
							) : (
								<ChevronRight className={cn("w-4 h-4", diTokens.iconColor)} />
							)}
						</Button>
					</EnhancedTooltip>

					<DiDivider orientation="vertical" />

					{/* All Layers Panel */}
					<Popover open={showLayersPanel} onOpenChange={setShowLayersPanel}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className={cn(
									"h-8 w-8 rounded-full transition-all",
									showLayersPanel && "bg-slate-200"
								)}
								title="All Layers"
							>
								<Layers className={cn("w-4 h-4", diTokens.iconColor)} />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							side="top"
							align="center"
							className="w-auto p-0 border-none shadow-none bg-transparent"
							sideOffset={10}
						>
							<LayersPanel />
						</PopoverContent>
					</Popover>
				</div>
			</div>

			{/* Bottom Left: Actions */}
			<div className="absolute bottom-6 left-4 sm:bottom-8 sm:left-6 flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200 z-50 select-none pointer-events-none">
				<div className={cn(
					"flex items-center gap-1 p-1 rounded-lg shadow-sm border pointer-events-auto backdrop-blur-sm",
					diTokens.bgAlt, diTokens.border
				)}>
					<EnhancedTooltip content="Undo" shortcut="Cmd+Z" disabled={state.historyIndex <= 0}>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => dispatch({ type: 'UNDO' })}
							disabled={state.historyIndex <= 0}
							className={cn("h-8 w-8 active:scale-95 transition-transform", diTokens.hover)}
						>
							<Undo className={cn("w-4 h-4", diTokens.iconColor)} />
						</Button>
					</EnhancedTooltip>
					<EnhancedTooltip content="Redo" shortcut="Cmd+Shift+Z" disabled={state.historyIndex >= state.history.length - 1}>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => dispatch({ type: 'REDO' })}
							disabled={state.historyIndex >= state.history.length - 1}
							className={cn("h-8 w-8 active:scale-95 transition-transform", diTokens.hover)}
						>
							<Redo className={cn("w-4 h-4", diTokens.iconColor)} />
						</Button>
					</EnhancedTooltip>

					<DiDivider orientation="vertical" />

					<EnhancedTooltip content="Reset View" shortcut="Space">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => dispatch({ type: 'RESET_DRAWING_VIEW' })}
							className={cn("h-8 w-8 active:scale-95 transition-transform", diTokens.hover)}
						>
							<Maximize className={cn("w-4 h-4", diTokens.iconColor)} />
						</Button>
					</EnhancedTooltip>

					<DiDivider orientation="vertical" />

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className={cn("h-8 w-8 text-red-500 hover:text-red-600", diTokens.hover)}
								title="Clear Canvas"
							>
								<Trash2 className="w-4 h-4" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This will delete your entire drawing and cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										dispatch({ type: 'CLEAR_CANVAS' });
										dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
									}}
									className="bg-red-500 hover:bg-red-600 text-white"
								>
									Delete Everything
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			{/* Bottom Right: Toolbar */}
			<div className="absolute bottom-24 right-4 sm:bottom-8 sm:right-6 flex flex-col items-end gap-2 opacity-100 z-50 select-none pointer-events-none">

				{/* Tool Selector */}
				<div className={cn(
					"p-1 rounded-lg shadow-sm border flex flex-col gap-1 pointer-events-auto backdrop-blur-sm",
					diTokens.bgAlt, diTokens.border
				)}>
					{/* Palette Mode Toggle */}
					<Button
						variant={state.paletteMode === 'grad' ? "secondary" : "ghost"}
						size="sm"
						onClick={() => dispatch({ type: 'SET_PALETTE_MODE', payload: state.paletteMode === 'flat' ? 'grad' : 'flat' })}
						className={cn(
							"h-6 text-[10px] font-bold px-0 w-full mb-1 border-b",
							diTokens.border
						)}
						title="Toggle Gradient Mode"
					>
						{state.paletteMode === 'grad' ? 'GRAD' : 'FLAT'}
					</Button>

					<EnhancedTooltip content="Blob Tool" shortcut="B" disabled={state.tool === 'brush'}>
						<Button
							variant={state.tool === 'brush' ? "default" : "ghost"}
							size="icon"
							onClick={() => dispatch({ type: 'SET_TOOL', payload: 'brush' })}
							className={cn(
								"h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95",
								state.tool === 'brush' && "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20 ring-offset-1"
							)}
						>
							<Droplet className="w-4 h-4" />
						</Button>
					</EnhancedTooltip>

					<EnhancedTooltip content="Brush Tool" shortcut="L" disabled={state.tool === 'line'}>
						<Button
							variant={state.tool === 'line' ? "default" : "ghost"}
							size="icon"
							onClick={() => dispatch({ type: 'SET_TOOL', payload: 'line' })}
							className={cn(
								"h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95",
								state.tool === 'line' && "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20 ring-offset-1"
							)}
						>
							<Paintbrush className="w-4 h-4" />
						</Button>
					</EnhancedTooltip>

					<EnhancedTooltip content="Eraser" shortcut="E" disabled={state.tool === 'eraser'}>
						<Button
							variant={state.tool === 'eraser' ? "default" : "ghost"}
							size="icon"
							onClick={() => dispatch({ type: 'SET_TOOL', payload: 'eraser' })}
							className={cn(
								"h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95",
								state.tool === 'eraser' && "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20 ring-offset-1"
							)}
						>
							<Eraser className="w-4 h-4" />
						</Button>
					</EnhancedTooltip>

					<EnhancedTooltip content="Text Tool" shortcut="T" disabled={state.tool === 'text'}>
						<Button
							variant={state.tool === 'text' ? "default" : "ghost"}
							size="icon"
							onClick={() => dispatch({ type: 'SET_TOOL', payload: 'text' })}
							className={cn(
								"h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95",
								state.tool === 'text' && "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20 ring-offset-1"
							)}
						>
							<Type className="w-4 h-4" />
						</Button>
					</EnhancedTooltip>

					<DiDivider />

					<EnhancedTooltip content="Move Layer" shortcut="M" disabled={state.tool === 'move'}>
						<Button
							variant={state.tool === 'move' ? "default" : "ghost"}
							size="icon"
							onClick={() => dispatch({ type: 'SET_TOOL', payload: 'move' })}
							className={cn(
								"h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-95",
								state.tool === 'move' && "bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20 ring-offset-1"
							)}
						>
							<Move className="w-4 h-4" />
						</Button>
					</EnhancedTooltip>

					<DiDivider />

					<Button
						variant={state.isSymmetryEnabled ? "default" : "ghost"}
						size="icon"
						onClick={() => dispatch({ type: 'TOGGLE_SYMMETRY' })}
						disabled={state.tool === 'move' || state.tool === 'text'}
						className={cn(
							"h-8 w-8",
							state.isSymmetryEnabled && "bg-slate-900 text-white",
							(state.tool === 'move' || state.tool === 'text') && "opacity-50 cursor-not-allowed"
						)}
						title={state.tool === 'move' ? "Not available with Move tool" : state.tool === 'text' ? "Not available with Text tool" : "Vertical Symmetry"}
					>
						<FlipHorizontal className="w-4 h-4" />
					</Button>

					<Button
						variant={state.isDrawInside ? "default" : "ghost"}
						size="icon"
						onClick={() => dispatch({ type: 'TOGGLE_DRAW_INSIDE' })}
						disabled={state.tool === 'eraser' || state.tool === 'move' || state.tool === 'text' || !currentLayerHasShapes}
						className={cn(
							"h-8 w-8",
							state.isDrawInside && "bg-slate-900 text-white",
							(state.tool === 'eraser' || state.tool === 'move' || state.tool === 'text' || !currentLayerHasShapes) && "opacity-50 cursor-not-allowed"
						)}
						title={
							state.tool === 'eraser' ? "Not available with Eraser" :
							state.tool === 'move' ? "Not available with Move tool" :
							state.tool === 'text' ? "Not available with Text tool" :
							!currentLayerHasShapes ? "Empty layer - draw something first" :
							"Draw Inside (Target Alpha)"
						}
					>
						<Target className="w-4 h-4" />
					</Button>

					<Button
						variant={state.isDrawBehind ? "default" : "ghost"}
						size="icon"
						onClick={() => dispatch({ type: 'TOGGLE_DRAW_BEHIND' })}
						disabled={state.tool === 'eraser' || state.tool === 'move' || state.tool === 'text' || !currentLayerHasShapes}
						className={cn(
							"h-8 w-8",
							state.isDrawBehind && "bg-slate-900 text-white",
							(state.tool === 'eraser' || state.tool === 'move' || state.tool === 'text' || !currentLayerHasShapes) && "opacity-50 cursor-not-allowed"
						)}
						title={
							state.tool === 'eraser' ? "Not available with Eraser" :
							state.tool === 'move' ? "Not available with Move tool" :
							state.tool === 'text' ? "Not available with Text tool" :
							!currentLayerHasShapes ? "Empty layer - draw something first" :
							"Draw Behind (Draw Underneath)"
						}
					>
						<Layers className="w-4 h-4" />
					</Button>

					<Button
						variant={state.isOrganicMode ? "default" : "ghost"}
						size="icon"
						onClick={() => dispatch({ type: 'TOGGLE_ORGANIC_MODE' })}
						disabled={state.tool === 'move' || state.tool === 'line' || state.tool === 'text'}
						className={cn(
							"h-8 w-8",
							state.isOrganicMode && "bg-slate-900 text-white",
							(state.tool === 'move' || state.tool === 'line' || state.tool === 'text') && "opacity-50 cursor-not-allowed"
						)}
						title={
							state.tool === 'move' ? "Not available with Move tool" :
							state.tool === 'line' ? "Not available with Line tool" :
							state.tool === 'text' ? "Not available with Text tool" :
							"Organic Stroke (Fluid Wiggle)"
						}
					>
						<Waves className="w-4 h-4" />
					</Button>
				</div>

				{/* Palette */}
				<div className={cn(
					"p-2 rounded-xl shadow-sm border flex flex-col gap-2 pointer-events-auto backdrop-blur-sm",
					diTokens.bgAlt, diTokens.border
				)}>
					{/* Palette Switcher */}
					<div className="flex justify-between items-center px-1 pb-1 mb-1 border-b border-slate-200/50">
						<span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Palette</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => dispatch({ type: 'SET_ACTIVE_PALETTE', payload: state.activePaletteId === 'primary' ? 'alternative' : 'primary' })}
							className="h-5 px-2 text-[10px] font-medium text-slate-500 hover:text-slate-900 gap-1"
							title="Switch Palette"
						>
							{state.activePaletteId === 'primary' ? 'Standard' : 'Alternative'} <ArrowLeftRight className="w-3 h-3" />
						</Button>
					</div>

					<div className="grid grid-cols-4 md:grid-cols-8 gap-2 p-1">
						{state.palette.map((color, index) => {
							const isSelected = state.currentColorIndex === index;
							const isDark = ['#000000', '#073B4C', '#2D6A4F', '#5A189A', '#6F4E37', '#C1121F'].includes(color);

							return (
								<button
									key={index}
									onClick={() => dispatch({ type: 'SET_COLOR_INDEX', payload: index })}
									className={cn(
										"w-5 h-5 sm:w-6 sm:h-6 rounded-md transition-all duration-200",
										isSelected
											? cn(
												"scale-125 z-10 shadow-md",
												isDark ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "ring-2 ring-slate-900 ring-offset-2 ring-offset-white"
											)
											: "scale-100 hover:scale-110 z-0 hover:shadow-sm"
									)}
									style={{ backgroundColor: color }}
									aria-label={`Select color ${color}`}
								/>
							);
						})}
					</div>
				</div>
			</div>

			{/* Contextual Tool Options Panel */}
			<ToolOptionsPanel />

			{/* Text Input Panel */}
			{state.textSession.isActive && (
				<div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-[100] shadow-2xl animate-in slide-in-from-bottom-full duration-300">
					<div className="max-w-2xl mx-auto flex flex-col gap-3">
						<div className="flex items-center justify-between mb-1">
							<Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'CANCEL_TEXT_SESSION' })} className="text-slate-500 hover:text-red-500"><X className="w-4 h-4 mr-1"/> Cancel</Button>
							<span className="font-semibold text-sm">Add Text</span>
							<Button variant="default" size="sm" onClick={() => dispatch({ type: 'COMMIT_TEXT_SESSION' })}><Check className="w-4 h-4 mr-1"/> Done</Button>
						</div>

						<textarea
							autoFocus
							placeholder="Type something (max 140 chars)..."
							maxLength={140}
							className="w-full min-h-[100px] p-3 border rounded-xl resize-none text-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
							style={{
								fontFamily: state.textSession.font === 'noir' ? '"Courier Prime", "Courier New", monospace' :
										state.textSession.font === 'mansion' ? '"Cinzel", "Times New Roman", serif' :
										state.textSession.font === 'comic' ? '"Bangers", system-ui' :
										state.textSession.font === 'dungeons' ? '"Inknut Antiqua", serif' :
										'"Inter", "Helvetica", sans-serif',
								letterSpacing: state.textSession.font === 'dungeons' ? '-0.04em' : state.textSession.font === 'comic' ? '0.05em' : '0',
								textAlign: state.textSession.align,
								color: state.palette[state.currentColorIndex]
							}}
							value={state.textSession.content}
							onChange={(e) => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { content: e.target.value } })}
						/>
						<div className="flex justify-end -mt-2 mb-1">
							<span className={cn("text-xs", state.textSession.content.length >= 130 ? "text-red-500 font-bold" : "text-slate-400")}>
								{state.textSession.content.length}/140
							</span>
						</div>

						<div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
							{/* Fonts */}
							<div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto justify-center overflow-x-auto no-scrollbar gap-1">
								<button
									className={cn(
										"h-8 px-3 text-xs font-medium rounded-md transition-all flex-shrink-0 whitespace-nowrap",
										state.textSession.font === 'noir' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { font: 'noir' } })}
									style={{ fontFamily: '"Courier Prime", monospace' }}
								>Noir</button>
								<button
									className={cn(
										"h-8 px-3 text-xs font-medium rounded-md transition-all flex-shrink-0 whitespace-nowrap",
										state.textSession.font === 'mansion' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { font: 'mansion' } })}
									style={{ fontFamily: '"Cinzel", serif' }}
								>Mansion</button>
								<button
									className={cn(
										"h-8 px-3 text-xs font-medium rounded-md transition-all flex-shrink-0 whitespace-nowrap",
										state.textSession.font === 'pharma' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { font: 'pharma' } })}
									style={{ fontFamily: '"Inter", sans-serif' }}
								>Pharma</button>
								<button
									className={cn(
										"h-8 px-3 text-xs font-medium rounded-md transition-all flex-shrink-0 whitespace-nowrap",
										state.textSession.font === 'comic' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { font: 'comic' } })}
									style={{ fontFamily: '"Bangers", system-ui', letterSpacing: '0.05em' }}
								>Comic</button>
								<button
									className={cn(
										"h-8 px-3 text-xs font-medium rounded-md transition-all flex-shrink-0 whitespace-nowrap",
										state.textSession.font === 'dungeons' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { font: 'dungeons' } })}
									style={{ fontFamily: '"Inknut Antiqua", serif', letterSpacing: '-0.04em' }}
								>Dungeons</button>
							</div>

							{/* Align */}
							<div className="flex bg-slate-100 p-1 rounded-lg">
								<button
									className={cn(
										"h-8 w-10 flex items-center justify-center rounded-md transition-all",
										state.textSession.align === 'left' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { align: 'left' } })}
								><AlignLeft className="w-4 h-4"/></button>
								<button
									className={cn(
										"h-8 w-10 flex items-center justify-center rounded-md transition-all",
										state.textSession.align === 'center' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { align: 'center' } })}
								><AlignCenter className="w-4 h-4"/></button>
								<button
									className={cn(
										"h-8 w-10 flex items-center justify-center rounded-md transition-all",
										state.textSession.align === 'right' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
									)}
									onClick={() => dispatch({ type: 'UPDATE_TEXT_SESSION', payload: { align: 'right' } })}
								><AlignRight className="w-4 h-4"/></button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};
