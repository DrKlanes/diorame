import React from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { Button } from '../ui/button';
import { RippleButton } from '../ui/ripple-button';
import { Video, Tornado, ArrowLeftRight, Layers, Eye, Wand2, Image as ImageIcon, Aperture, Scaling, Ban, Camera, Activity, RotateCw, SlidersHorizontal, ChevronLeft, ChevronRight, ScanLine, ZoomIn, Target, Waves, CloudFog, Globe, X, MoveVertical, MoveHorizontal, Hand, Info } from 'lucide-react';
import { cn } from '../ui/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { DiIconButton } from '../../design-system/DiIconButton';
import { DiDivider } from '../../design-system/DiDivider';
import { DiPanel } from '../../design-system/DiPanel';
import { DiSlider } from '../../design-system/DiSlider';
import { DiToggleSlider } from '../../design-system/DiToggleSlider';
import { diTokens } from '../../design-system/tokens';

const flToMm = (fl: number) => Math.round((fl / 800) * 50);
const mmToFl = (mm: number) => (mm / 50) * 800;

interface ControlsCinematicProps {
	uiFocusLayer: number;
	setUiFocusLayer: React.Dispatch<React.SetStateAction<number>>;
}

export const ControlsCinematic = ({ uiFocusLayer, setUiFocusLayer }: ControlsCinematicProps) => {
	const { state, dispatch } = useStrata();

	return (
		<>
			{/* Export Controls (View Mode Top Left) */}
			<div className="absolute top-6 left-4 sm:left-6 flex flex-col gap-2 z-50">
				<div className={cn("backdrop-blur-sm p-1.5 rounded-full shadow-sm border flex items-center gap-2 sm:gap-1 select-none", diTokens.bgPanel, diTokens.border)}>
					<DiIconButton
						icon={<Camera className="w-4 h-4" />}
						label="Save Snapshot (PNG)"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						disabled={state.isExporting}
						onClick={() => dispatch({ type: 'REQUEST_EXPORT', payload: 'png' })}
					/>
					<DiIconButton
						icon={state.isExporting && state.exportRequest === 'mp4' ? <div className={cn("w-3 h-3 border-2 rounded-full animate-spin", diTokens.spinnerBorder, diTokens.spinnerTop)} /> : <Video className="w-4 h-4" />}
						label="Save Animation Loop (MP4)"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						disabled={state.isExporting}
						onClick={() => dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' })}
					/>
					<DiDivider orientation="vertical" />
					<DiIconButton
						icon={<Info className="w-4 h-4" />}
						label="About"
						className="h-10 w-10 sm:h-8 sm:w-8 touch-manipulation"
						onClick={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
					/>
				</div>
			</div>

			{/* Animation Types & POI */}
			<div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 pointer-events-none">

				{/* Point of Interest Control (Above Panel) */}
				{state.pointOfInterest && (
					<div className={cn("absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-auto backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border flex items-center gap-2 z-50", diTokens.bgPanel, diTokens.border)}>
						<Target className={cn("w-3.5 h-3.5", diTokens.textMuted)} />
						<span className={cn("text-xs", diTokens.textMuted)}>POI Set</span>
						<Button
							variant="ghost"
							size="icon"
							className={cn("h-5 w-5 rounded-full", diTokens.hoverAlt)}
							onClick={() => dispatch({ type: 'CLEAR_POINT_OF_INTEREST' })}
							title="Clear Point of Interest"
						>
							<X className="w-3 h-3" />
						</Button>
					</div>
				)}

				<div className="pointer-events-auto w-full sm:w-auto flex justify-center overflow-x-auto no-scrollbar max-w-full">
					<div className={cn("flex items-center gap-1 backdrop-blur-md p-1 rounded-full shadow-sm border", diTokens.bgPanelAlt, diTokens.border)}>
						<Button
							variant={state.cinematicType === 'forward' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'forward' })}
							title="Forward"
						>
							<Video className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'spiral' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'spiral' })}
							title="Spiral"
						>
							<Tornado className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'yoyo' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'yoyo' })}
							title="Yo-Yo"
						>
							<ArrowLeftRight className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'pulse' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'pulse' })}
							title="Pulse"
						>
							<Activity className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'twist' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'twist' })}
							title="Twist"
						>
							<RotateCw className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'arc' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'arc' })}
							title="Arc Shot"
						>
							<ScanLine className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'crane' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'crane' })}
							title="Crane (Vertical)"
						>
							<MoveVertical className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'truck' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'truck' })}
							title="Truck (Horizontal)"
						>
							<MoveHorizontal className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'zoom' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'zoom' })}
							title="Zoom (Breathing)"
						>
							<ZoomIn className="w-4 h-4" />
						</Button>
						<Button
							variant={state.cinematicType === 'orbit' ? 'default' : 'ghost'}
							size="icon"
							className="h-8 w-8 rounded-full"
							onClick={() => dispatch({ type: 'SET_CINEMATIC_TYPE', payload: 'orbit' })}
							title="Free View (Compose)"
						>
							<Globe className="w-4 h-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Speed & Handheld Control (Combined) */}
			<div className={cn("absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border pointer-events-auto z-40 animate-in fade-in slide-in-from-bottom-2 duration-300", diTokens.bgPanel, diTokens.border)}>
				{/* Speed - Hidden in Orbit Mode */}
				{state.cinematicType !== 'orbit' && (
					<div className={cn("flex items-center gap-2 border-r pr-3 mr-1", diTokens.border)}>
						<Activity className={cn("w-3.5 h-3.5", diTokens.textSubtle)} />
						<input
							type="range"
							min="0.1"
							max="1.0"
							step="0.1"
							value={state.cinematicSpeed ?? 1.0}
							onChange={(e) => dispatch({ type: 'SET_CINEMATIC_SPEED', payload: parseFloat(e.target.value) })}
							className={cn("w-20 h-1.5 rounded-lg appearance-none cursor-pointer", diTokens.sliderBg, diTokens.sliderAccent)}
						/>
						<span className={cn("text-[10px] font-mono font-medium w-6 text-right", diTokens.textSubtle)}>
							{(state.cinematicSpeed ?? 1.0).toFixed(1)}x
						</span>
					</div>
				)}

				{/* Handheld */}
				<div className="flex items-center gap-2">
					<Button
						variant={state.isHandheldEnabled ? 'default' : 'ghost'}
						size="sm"
						onClick={() => dispatch({ type: 'TOGGLE_HANDHELD' })}
						className={cn(
							"h-6 px-2 rounded-full text-[10px] font-medium transition-all",
							state.isHandheldEnabled ? "bg-slate-900 text-white shadow-sm" : cn(diTokens.textSubtle, diTokens.toggleHoverBg, diTokens.toggleActiveText)
						)}
						title="Handheld Camera Shake"
					>
						<Hand className="w-3 h-3 mr-1" />
						{state.isHandheldEnabled ? 'ON' : 'OFF'}
					</Button>

					{state.isHandheldEnabled && (
						<div className={cn("flex items-center rounded-full p-0.5 animate-in fade-in zoom-in duration-200", diTokens.toggleBg)}>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'low' })}
								className={cn(
									"h-5 w-6 rounded-full text-[9px] transition-all",
									diTokens.toggleHoverBg,
									state.handheldIntensity === 'low' && cn("shadow-sm font-bold text-white", diTokens.toggleActiveBg)
								)}
								title="Low Intensity"
							>
								L
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'medium' })}
								className={cn(
									"h-5 w-6 rounded-full text-[9px] transition-all",
									diTokens.toggleHoverBg,
									state.handheldIntensity === 'medium' && cn("shadow-sm font-bold text-white", diTokens.toggleActiveBg)
								)}
								title="Medium Intensity"
							>
								M
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'high' })}
								className={cn(
									"h-5 w-6 rounded-full text-[9px] transition-all",
									diTokens.toggleHoverBg,
									state.handheldIntensity === 'high' && cn("shadow-sm font-bold text-white", diTokens.toggleActiveBg)
								)}
								title="High Intensity"
							>
								H
							</Button>
						</div>
					)}
				</div>
			</div>

			{/* POI Hint - Show when no POI is set */}
			{!state.pointOfInterest && state.cinematicType !== 'orbit' && (
				<div className="absolute bottom-32 left-4 sm:bottom-36 sm:left-1/2 sm:-translate-x-1/2 bg-black/50 text-white px-2.5 py-1.5 rounded-md shadow text-[10px] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300 z-30 max-w-[200px] sm:max-w-none pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
					<div className="flex items-center gap-1.5">
						<Target className="w-2.5 h-2.5" />
						<span>Double-click to set POI</span>
					</div>
				</div>
			)}

			{/* Orbit Controls Hint */}
			{state.cinematicType === 'orbit' && (
				<div className="absolute bottom-32 left-4 sm:bottom-36 sm:left-1/2 sm:-translate-x-1/2 bg-black/50 text-white px-2 py-1 rounded-md shadow text-[9px] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-300 z-30 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
					<div className="flex items-center gap-1.5 whitespace-nowrap">
						<Globe className="w-2.5 h-2.5 flex-shrink-0" />
						<span className="hidden sm:inline"><kbd className="px-0.5 py-0 bg-white/20 rounded text-[8px]">Drag</kbd> Pan • <kbd className="px-0.5 py-0 bg-white/20 rounded text-[8px]">Shift</kbd> Orbit • <kbd className="px-0.5 py-0 bg-white/20 rounded text-[8px]">Scroll/MMB</kbd> Zoom</span>
						<span className="inline sm:hidden">1 finger Pan • 2 fingers Orbit • Pinch Zoom</span>
					</div>
				</div>
			)}

			{/* Post-Processing Toggles & Lens Controls (Right Side) */}
			<div className="absolute top-20 left-4 items-start sm:top-6 sm:right-6 sm:left-auto sm:items-end flex flex-col gap-2 opacity-95 transition-opacity z-50 select-none">

				{/* FX Popover Trigger */}
				<div className={cn("backdrop-blur-sm p-1.5 rounded-full shadow-sm border", diTokens.bgPanel, diTokens.border)}>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className={cn("rounded-full px-3 text-xs font-medium tracking-wide flex items-center gap-2", diTokens.hoverAlt)}
							>
								<Wand2 className="w-3.5 h-3.5" />
								FX MIX
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-64 p-4 mr-6 mt-2 font-manrope bg-white border-slate-200 text-[#353535] max-h-[calc(100vh-8rem)] overflow-y-auto" align="end">
							<div className="space-y-4">
								<h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-slate-900">
									<SlidersHorizontal className="w-3.5 h-3.5" /> Post Processing
								</h4>

								{/* Grain */}
								<DiToggleSlider
									label={<><ImageIcon className="w-3 h-3" /> Grain</>}
									checked={state.postProcessingEnabled.grain}
									formattedValue={state.postProcessingEnabled.grain ? `${Math.round(state.postProcessing.grain * 100)}%` : 'Off'}
									value={state.postProcessing.grain ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'grain' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'grain', value: v } })}
								/>

								{/* Vignette */}
								<DiToggleSlider
									label={<><Ban className="w-3 h-3" /> Vignette</>}
									checked={state.postProcessingEnabled.vignette}
									formattedValue={state.postProcessingEnabled.vignette ? `${Math.round(state.postProcessing.vignette * 100)}%` : 'Off'}
									value={state.postProcessing.vignette ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'vignette' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'vignette', value: v } })}
								/>

								{/* Chromatic Aberration */}
								<DiToggleSlider
									label={<><Layers className="w-3 h-3" /> Chromatic Ab.</>}
									checked={state.postProcessingEnabled.chromaticAberration}
									formattedValue={state.postProcessingEnabled.chromaticAberration ? `${Math.round(state.postProcessing.chromaticAberration * 100)}%` : 'Off'}
									value={state.postProcessing.chromaticAberration ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'chromaticAberration' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'chromaticAberration', value: v } })}
								/>

								{/* Fog */}
								<DiToggleSlider
									label={<><CloudFog className="w-3 h-3" /> Fog</>}
									checked={state.postProcessingEnabled.fog}
									formattedValue={state.postProcessingEnabled.fog ? `${Math.round(state.postProcessing.fog * 100)}%` : 'Off'}
									value={state.postProcessing.fog ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'fog' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'fog', value: v } })}
								/>

								{/* Particles */}
								<DiToggleSlider
									label={<><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-sparkles'%3E%3Cpath d='m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z'/%3E%3Cpath d='M5 3v4'/%3E%3Cpath d='M9 5H5'/%3E%3Cpath d='M19 19v2'/%3E%3Cpath d='M21 19h-2'/%3E%3C/svg%3E" className="w-3 h-3" /> Particles</>}
									checked={state.postProcessingEnabled.particles}
									formattedValue={state.postProcessingEnabled.particles ? `${Math.round(state.postProcessing.particles * 100)}%` : 'Off'}
									value={state.postProcessing.particles ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'particles' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'particles', value: v } })}
								>
									{/* Particle Type Selector */}
									{state.postProcessingEnabled.particles && (
										<div className="flex items-center gap-1.5 text-xs pt-1">
											<span className="opacity-60 text-[10px]">Type:</span>
											<div className="flex gap-1 flex-1">
												<button
													onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'particleType', value: 'circle' as any } })}
													className={cn(
														"flex-1 px-2 py-1 rounded text-[10px] transition-all",
														state.postProcessing.particleType === 'circle'
															? "bg-slate-900 text-white"
															: "bg-slate-100 hover:bg-slate-200 text-slate-600"
													)}
												>
													Circle
												</button>
												<button
													onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'particleType', value: 'square' as any } })}
													className={cn(
														"flex-1 px-2 py-1 rounded text-[10px] transition-all",
														state.postProcessing.particleType === 'square'
															? "bg-slate-900 text-white"
															: "bg-slate-100 hover:bg-slate-200 text-slate-600"
													)}
												>
													Square
												</button>
												<button
													onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'particleType', value: 'stroke' as any } })}
													className={cn(
														"flex-1 px-2 py-1 rounded text-[10px] transition-all",
														state.postProcessing.particleType === 'stroke'
															? "bg-slate-900 text-white"
															: "bg-slate-100 hover:bg-slate-200 text-slate-600"
													)}
												>
													Stroke
												</button>
											</div>
										</div>
									)}
								</DiToggleSlider>

								<DiDivider className="my-2" />

								{/* PIXELART */}
								<div className="space-y-1.5">
									<div className="flex justify-between items-center text-xs opacity-70">
										<label className="flex items-center gap-2 cursor-pointer select-none">
											<input
												type="checkbox"
												checked={state.postProcessingEnabled.pixelArt}
												onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'pixelArt' })}
												className={cn("rounded-sm w-3 h-3", diTokens.sliderAccent)}
											/>
											<span className="flex items-center gap-1"><ScanLine className="w-3 h-3" /> Pixel Art</span>
										</label>
										<span className="text-[10px] font-mono border rounded px-1 border-slate-200">
											{state.postProcessingEnabled.pixelArt ? 'ON' : 'OFF'}
										</span>
									</div>

									{state.postProcessingEnabled.pixelArt && (
										<div className="space-y-2 pt-1 animate-in slide-in-from-top-1 fade-in duration-200">
											{/* Pixel Size */}
											<div className="space-y-1">
												<div className={cn("flex justify-between text-[10px]", diTokens.textSubtle)}>
													<span>Size</span>
													<span>{state.postProcessing.pixelArtSize}px</span>
												</div>
												<input
													type="range"
													min="2"
													max="12"
													step="1"
													value={state.postProcessing.pixelArtSize}
													onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtSize', value: parseInt(e.target.value) } })}
													className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer", diTokens.sliderBg, diTokens.sliderAccent)}
												/>
											</div>

											{/* Color Depth */}
											<div className="space-y-1">
												<div className={cn("flex justify-between text-[10px]", diTokens.textSubtle)}>
													<span>Depth</span>
													<span>
														{state.postProcessing.pixelArtDepth <= 2 ? '1-bit' :
														 state.postProcessing.pixelArtDepth <= 4 ? 'CGA' :
														 state.postProcessing.pixelArtDepth <= 6 ? '8-Color' :
														 state.postProcessing.pixelArtDepth <= 8 ? 'Retro' :
														 state.postProcessing.pixelArtDepth <= 10 ? 'Hi-Color' :
														 state.postProcessing.pixelArtDepth <= 12 ? 'Handheld' :
														 state.postProcessing.pixelArtDepth <= 14 ? 'Stylized' : 'Original'}
													</span>
												</div>
												<input
													type="range"
													min="2"
													max="16"
													step="2"
													value={state.postProcessing.pixelArtDepth}
													onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDepth', value: parseInt(e.target.value) } })}
													className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer", diTokens.sliderBg, diTokens.sliderAccent)}
												/>
											</div>

											{/* Dither Intensity */}
											<div className="space-y-1">
												<div className={cn("flex justify-between text-[10px]", diTokens.textSubtle)}>
													<span>Dither</span>
													<span>{state.postProcessing.pixelArtDither ? Math.round(state.postProcessing.pixelArtDither * 100) + '%' : 'Clean'}</span>
												</div>
												<input
													type="range"
													min="0"
													max="1"
													step="0.1"
													value={state.postProcessing.pixelArtDither ?? 0}
													onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'pixelArtDither', value: parseFloat(e.target.value) } })}
													className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer", diTokens.sliderBg, diTokens.sliderAccent)}
												/>
											</div>
										</div>
									)}
								</div>

								{/* Wiggle */}
								<DiToggleSlider
									label={<><Waves className="w-3 h-3" /> Stop Motion</>}
									checked={state.postProcessingEnabled.wiggle}
									formattedValue={state.postProcessingEnabled.wiggle ? (state.postProcessing.wiggle <= 0.2 ? 'Light' : state.postProcessing.wiggle >= 0.8 ? 'Strong' : 'Medium') : 'Off'}
									value={state.postProcessing.wiggle ?? 0.5}
									min={0} max={1} step={0.5}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'wiggle' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'wiggle', value: v } })}
								/>

								{/* Grunge Overlay */}
								<DiToggleSlider
									label={<><Tornado className="w-3 h-3" /> Grunge Overlay</>}
									checked={state.postProcessingEnabled.grungeOverlay}
									formattedValue={state.postProcessingEnabled.grungeOverlay ? (state.postProcessing.grungeIntensity <= 0.2 ? 'Subtle' : state.postProcessing.grungeIntensity >= 0.8 ? 'Intense' : 'Medium') : 'Off'}
									value={state.postProcessing.grungeIntensity ?? 0.5}
									min={0} max={1} step={0.5}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'grungeOverlay' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'grungeIntensity', value: v } })}
								/>

								{/* Glow */}
								<DiToggleSlider
									label={<><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='5'/%3E%3Cline x1='12' y1='1' x2='12' y2='3'/%3E%3Cline x1='12' y1='21' x2='12' y2='23'/%3E%3Cline x1='4.22' y1='4.22' x2='5.64' y2='5.64'/%3E%3Cline x1='18.36' y1='18.36' x2='19.78' y2='19.78'/%3E%3Cline x1='1' y1='12' x2='3' y2='12'/%3E%3Cline x1='21' y1='12' x2='23' y2='12'/%3E%3Cline x1='4.22' y1='19.78' x2='5.64' y2='18.36'/%3E%3Cline x1='18.36' y1='5.64' x2='19.78' y2='4.22'/%3E%3C/svg%3E" className="w-3 h-3" /> Glow</>}
									checked={state.postProcessingEnabled.glow}
									formattedValue={state.postProcessingEnabled.glow ? `${Math.round(state.postProcessing.glow * 100)}%` : 'Off'}
									value={state.postProcessing.glow ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'glow' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'glow', value: v } })}
								/>

								{/* RISO */}
								<DiToggleSlider
									label={<><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 7v10M7 12h10'/%3E%3C/svg%3E" className="w-3 h-3" /> RISO</>}
									checked={state.postProcessingEnabled.riso}
									formattedValue={state.postProcessingEnabled.riso ? `${Math.round(state.postProcessing.riso * 100)}%` : 'Off'}
									value={state.postProcessing.riso ?? 0}
									min={0} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'riso' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'riso', value: v } })}
								/>

								{/* Distortion */}
								<DiToggleSlider
									label={<><Scaling className="w-3 h-3" /> Distortion</>}
									checked={state.postProcessingEnabled.distortion}
									formattedValue={state.postProcessingEnabled.distortion ? `${Math.round(state.postProcessing.distortion * 100)}%` : 'Off'}
									value={state.postProcessing.distortion ?? 0}
									min={-1} max={1} step={0.05}
									onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'distortion' })}
									onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'distortion', value: v } })}
								/>

								{/* DoF & Focus */}
								<div className={cn("pt-2 border-t", diTokens.border)}>
									<DiToggleSlider
										label={<><Aperture className="w-3 h-3" /> Blur / DoF</>}
										checked={state.postProcessingEnabled.dof}
										formattedValue={state.postProcessingEnabled.dof ? `${Math.round(state.postProcessing.dof * 100)}%` : 'Off'}
										value={state.postProcessing.dof ?? 0}
										min={0} max={1} step={0.05}
										onToggle={() => dispatch({ type: 'TOGGLE_FX', payload: 'dof' })}
										onSliderChange={(v) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'dof', value: v } })}
									>

									{/* Focus Control */}
									<div className="flex justify-between items-end mt-2 mb-1">
										<span className="flex items-center gap-1 text-xs font-medium opacity-90"><Target className="w-3 h-3" /> Focus</span>
										<div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200">
											<button
												onClick={() => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: -1 } })}
												className={cn(
													"text-[10px] px-2 py-0.5 rounded-sm transition-colors",
													(state.postProcessing.focusTargetLayer === -1 || state.postProcessing.focusTargetLayer === undefined)
														? "bg-white shadow-sm text-black font-medium"
														: "text-slate-500 hover:text-slate-800"
												)}
											>
												Free
											</button>
											<button
												onClick={() => {
													const target = uiFocusLayer ?? state.currentLayerIndex;
													dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: target } });
												}}
												className={cn(
													"text-[10px] px-2 py-0.5 rounded-sm transition-colors",
													(state.postProcessing.focusTargetLayer !== undefined && state.postProcessing.focusTargetLayer !== -1)
														? "bg-white shadow-sm text-black font-medium"
														: "text-slate-500 hover:text-slate-800"
												)}
											>
												Lock
											</button>
										</div>
									</div>

									{/* Layer Selector (Always Visible) */}
									<div className="flex flex-col gap-2 mt-2">
										<div className="flex items-center gap-2">
											<span className="text-xs opacity-70 w-12">
												{(state.postProcessing.focusTargetLayer !== undefined && state.postProcessing.focusTargetLayer !== -1) ? "Target:" : "Set to:"}
											</span>
											<div className="flex-1 flex items-center gap-1">
												<button
													onClick={() => {
														const next = Math.max(0, uiFocusLayer - 1);
														setUiFocusLayer(next);

														if (state.postProcessing.focusTargetLayer !== -1 && state.postProcessing.focusTargetLayer !== undefined) {
															dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: next } });
														} else {
															const CINEMATIC_DEPTH_MULTIPLIER = 3;
															const effectiveCameraZ = state.camera.z + state.viewZoomOffset;
															const i = next;
															const z = i * -BASE_DEPTH_STEP;
															const baseZ = z * state.layerSpacingFactor;
															const isLocked3D = state.locked3DLayers.includes(i);
															const shapeZ = isLocked3D ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
															const camZ = isLocked3D ? 0 : effectiveCameraZ;
															const dist = shapeZ - camZ;
															dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusDist', value: dist } });
														}
													}}
													disabled={uiFocusLayer <= 0}
													className="w-6 h-6 flex items-center justify-center border rounded bg-white hover:bg-slate-50 disabled:opacity-50"
												>
													<ChevronLeft className="w-3 h-3" />
												</button>

												<span className="text-xs font-mono flex-1 text-center border rounded py-1 bg-white">
													Layer {uiFocusLayer + 1}
												</span>

												<button
													onClick={() => {
														const next = Math.min(state.totalLayers - 1, uiFocusLayer + 1);
														setUiFocusLayer(next);

														if (state.postProcessing.focusTargetLayer !== -1 && state.postProcessing.focusTargetLayer !== undefined) {
															dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: next } });
														} else {
															const CINEMATIC_DEPTH_MULTIPLIER = 3;
															const effectiveCameraZ = state.camera.z + state.viewZoomOffset;
															const i = next;
															const z = i * -BASE_DEPTH_STEP;
															const baseZ = z * state.layerSpacingFactor;
															const isLocked3D = state.locked3DLayers.includes(i);
															const shapeZ = isLocked3D ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
															const camZ = isLocked3D ? 0 : effectiveCameraZ;
															const dist = shapeZ - camZ;
															dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusDist', value: dist } });
														}
													}}
													disabled={uiFocusLayer >= state.totalLayers - 1}
													className="w-6 h-6 flex items-center justify-center border rounded bg-white hover:bg-slate-50 disabled:opacity-50"
												>
													<ChevronRight className="w-3 h-3" />
												</button>
											</div>
										</div>
									</div>

									{/* Slider (Only visible in Free mode) */}
									{(state.postProcessing.focusTargetLayer === undefined || state.postProcessing.focusTargetLayer === -1) && (
										<>
											<div className="flex justify-between text-xs opacity-70 mt-1">
												<span>Z-Plane</span>
												<span>{(() => {
													if (state.mode !== 'cinematic') return `${Math.round(state.postProcessing.focusDist)}px`;

													const CINEMATIC_DEPTH_MULTIPLIER = 3;
													const effectiveCameraZ = state.camera.z + state.viewZoomOffset;
													for (let i = 0; i < state.totalLayers; i++) {
														if (state.hiddenLayers.includes(i)) continue;
														const z = i * -BASE_DEPTH_STEP;
														const baseZ = z * state.layerSpacingFactor;
														const isLocked3D = state.locked3DLayers.includes(i);
														const shapeZ = isLocked3D ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
														const camZ = isLocked3D ? 0 : effectiveCameraZ;
														const dist = shapeZ - camZ;
														if (Math.abs(state.postProcessing.focusDist - dist) < 1) {
															return `Layer ${i + 1} (${Math.round(dist)}px)`;
														}
													}
													return `${Math.round(state.postProcessing.focusDist)}px`;
												})()}</span>
											</div>
											<input
												type="range"
												min="-5000"
												max="5000"
												step="50"
												disabled={!state.postProcessingEnabled.dof}
												value={state.postProcessing.focusDist ?? 800}
												onChange={(e) => {
													let newValue = parseFloat(e.target.value);

													if (state.mode === 'cinematic') {
														const CINEMATIC_DEPTH_MULTIPLIER = 3;
														const effectiveCameraZ = state.camera.z + state.viewZoomOffset;
														let nearestDist = null;
														let minDiff = Infinity;

														for (let i = 0; i < state.totalLayers; i++) {
															if (state.hiddenLayers.includes(i)) continue;
															const z = i * -BASE_DEPTH_STEP;
															const baseZ = z * state.layerSpacingFactor;
															const isLocked3D = state.locked3DLayers.includes(i);
															const shapeZ = isLocked3D ? baseZ : baseZ * CINEMATIC_DEPTH_MULTIPLIER;
															const camZ = isLocked3D ? 0 : effectiveCameraZ;
															const dist = shapeZ - camZ;

															const diff = Math.abs(newValue - dist);
															if (diff < minDiff) {
																minDiff = diff;
																nearestDist = dist;
															}
														}

														if (nearestDist !== null) {
															const currentDist = state.postProcessing.focusDist;
															const isCurrentlySnapped = Math.abs(currentDist - nearestDist) < 1;
															const threshold = isCurrentlySnapped ? 300 : 100;

															if (minDiff < threshold) {
																newValue = nearestDist;
															}
														}
													}

													dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusDist', value: newValue } });
												}}
												className={cn(
													"w-full h-1.5 rounded-lg appearance-none cursor-pointer",
													diTokens.sliderBg, diTokens.sliderAccent,
													!state.postProcessingEnabled.dof && "opacity-50 cursor-not-allowed"
												)}
											/>
										</>
									)}
									</DiToggleSlider>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>

				{/* Lens Slider */}
				<DiPanel dark={state.isDarkMode}>
					<DiSlider
						label={<><Eye className="w-3 h-3" /> Focal Length</>}
						formattedValue={flToMm(state.focalLength) + 'mm'}
						value={flToMm(state.focalLength)}
						min={24}
						max={300}
						step={1}
						onChange={(v) => dispatch({ type: 'SET_FOCAL_LENGTH', payload: mmToFl(v) })}
					/>
				</DiPanel>

				{/* Zoom Slider */}
				<DiPanel dark={state.isDarkMode}>
					<DiSlider
						label={<><ZoomIn className="w-3 h-3" /> Distance</>}
						formattedValue={(state.viewZoomOffset > 0 ? '+' : '') + Math.round(state.viewZoomOffset)}
						value={state.viewZoomOffset}
						min={-5000}
						max={2000}
						step={10}
						onChange={(v) => dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: v })}
					/>
				</DiPanel>

				{/* Layer Spacing Slider */}
				<DiPanel dark={state.isDarkMode}>
					<DiSlider
						label={<><MoveVertical className="w-3 h-3" /> Layer Spacing</>}
						formattedValue={state.layerSpacingFactor.toFixed(2) + 'x'}
						value={state.layerSpacingFactor}
						min={0}
						max={2.0}
						step={0.05}
						onChange={(v) => dispatch({ type: 'SET_LAYER_SPACING_FACTOR', payload: v })}
					/>
				</DiPanel>
			</div>
		</>
	);
};
