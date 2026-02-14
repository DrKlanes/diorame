import React from 'react';
import { useStrata, BASE_DEPTH_STEP, MAX_LAYERS } from './StrataContext';
import { Button } from '../ui/button';
import { RippleButton } from '../ui/ripple-button';
import { Undo, Redo, Play, Trash2, Video, Tornado, ArrowLeftRight, Layers, Eye, EyeOff, Wand2, Image as ImageIcon, Aperture, Scaling, Ban, Camera, Activity, RotateCw, SlidersHorizontal, ChevronLeft, ChevronRight, Plus, ScanLine, ZoomIn, Sun, Moon, Target, Waves, Save, FolderOpen, CloudFog, Globe, Eraser, Pen, Info, Type, AlignLeft, AlignCenter, AlignRight, Check, X, MoveVertical, MoveHorizontal, Move, Lock, Unlock, Maximize, FlipHorizontal, Hand, FileCode, Copy, Droplet, Paintbrush } from 'lucide-react';
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
} from "../ui/alert-dialog";
import { toast } from 'sonner@2.0.3';
import { EnhancedTooltip } from '../ui/enhanced-tooltip';
import { LayersPanel } from './LayersPanel';
import { ToolOptionsPanel } from './ToolOptionsPanel';

export const Controls = () => {
  const { state, dispatch } = useStrata();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showLayersPanel, setShowLayersPanel] = React.useState(false);
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
    let visibleLayers = 0;
    
    if (state.shapes) {
      // Count total shapes, excluding hidden layers
      totalShapes = state.shapes.filter(shape => {
        return !state.hiddenLayers.includes(shape.zIndex);
      }).length;
      
      // Count visible layers
      const layersWithShapes = new Set(state.shapes.map(s => s.zIndex));
      visibleLayers = Array.from(layersWithShapes).filter(
        layerIndex => !state.hiddenLayers.includes(layerIndex)
      ).length;
    }
    
    return { totalShapes, visibleLayers };
  }, [state.shapes, state.hiddenLayers]);

  // Complexity threshold (shapes count that triggers warning)
  const COMPLEXITY_THRESHOLD = 800;

  // Handle export request with complexity check
  const handleExportRequest = React.useCallback((format: 'svg' | 'svgz') => {
    const { totalShapes } = getSceneComplexity();
    
    if (totalShapes > COMPLEXITY_THRESHOLD) {
      // Scene is complex, show warning
      setPendingExportFormat(format);
      setShowComplexityWarning(true);
      setSvgExportOpen(false);
    } else {
      // Scene is simple enough, proceed directly
      dispatch({ type: 'REQUEST_EXPORT', payload: format });
      setSvgExportOpen(false);
    }
  }, [getSceneComplexity, dispatch]);

  // Proceed with export after user confirms warning
  const handleProceedWithExport = React.useCallback(() => {
    if (pendingExportFormat) {
      dispatch({ type: 'REQUEST_EXPORT', payload: pendingExportFormat });
    }
    setShowComplexityWarning(false);
    setPendingExportFormat(null);
  }, [pendingExportFormat, dispatch]);

  // Cancel export
  const handleCancelExport = React.useCallback(() => {
    setShowComplexityWarning(false);
    setPendingExportFormat(null);
  }, []);
  
  // Check if current layer has any shapes
  const currentLayerZ = getActiveZ(state.currentLayerIndex);
  const currentLayerHasShapes = state.shapes.some(shape => shape.zIndex === currentLayerZ);
  
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text session
      if (state.textSession.isActive) return;
      
      // Export SVG: Cmd/Ctrl + E
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e' && !e.shiftKey) {
        e.preventDefault();
        handleExportRequest('svg');
        return;
      }
      
      // Export SVGZ: Cmd/Ctrl + Shift + E
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleExportRequest('svgz');
        return;
      }
      
      // Canvas Dark Mode: Shift + D  
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_DARK_MODE' });
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExportRequest, dispatch, state.textSession.isActive]);

  const handleReturnToDraw = () => {
      dispatch({ type: 'SET_MODE', payload: 'drawing' });
      const activeZ = getActiveZ(state.currentLayerIndex);
      dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: activeZ, rotation: 0 } });
      // Removed reset of viewZoomOffset so it persists across sessions
  };

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

          // Defer the heavy JSON.stringify + download to avoid blocking the
          // click handler's synchronous path (which can freeze event processing
          // and cause the toast timer / UI handlers to desynchronise).
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
                  // Clean up DOM + blob URL after the browser has picked up the download
                  setTimeout(() => {
                      try { if (link && link.parentNode) document.body.removeChild(link); } catch (_) { /* already removed */ }
                      if (url) URL.revokeObjectURL(url);
                      // Refocus the canvas to restore keyboard event handling
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

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.shapes) {
                  dispatch({ type: 'LOAD_PROJECT', payload: json });
                  toast.success('Project loaded successfully', {
                      description: `Loaded ${json.shapes.length} shapes`,
                      duration: 2000,
                  });
              }
          } catch (err) {
              console.error("Failed to load project", err);
              toast.error('Failed to load project', {
                  description: 'Please check if the file is valid',
                  duration: 3000,
              });
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const flToMm = (fl: number) => Math.round((fl / 800) * 50);
  const mmToFl = (mm: number) => (mm / 50) * 800;

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

  // UI Theme - Light Mode (Single Source of Truth)
  const uiTheme = {
    bg: "bg-white/95",
    bgAlt: "bg-white/90",
    bgPanel: "bg-white/90",
    bgPanelAlt: "bg-white/80",
    border: "border-slate-200",
    text: "text-slate-900",
    textMuted: "text-slate-600",
    textSubtle: "text-slate-400",
    iconColor: "text-slate-700",
    hover: "hover:bg-slate-50",
    hoverAlt: "hover:bg-slate-100",
    divider: "bg-slate-200",
    sliderBg: "bg-slate-200",
    sliderAccent: "accent-slate-900",
    badgeBg: "bg-slate-100",
    toggleBg: "bg-slate-100",
    toggleHoverBg: "hover:bg-white",
    toggleActiveText: "text-slate-900",
    toggleActiveBg: "bg-slate-900",
    spinnerBorder: "border-slate-400",
    spinnerTop: "border-t-slate-900",
  };

  return (
    <>
      {/* Active Tool & Layer Indicator - Always visible in Draw mode */}
      {state.mode === 'drawing' && (
        <div className={cn(
          "absolute top-6 right-4 sm:right-6 z-40 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 transition-all duration-200 backdrop-blur-sm",
          uiTheme.bg, uiTheme.border, "border"
        )}>
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-bold tracking-wider uppercase", uiTheme.textMuted)}>
              Layer {state.currentLayerIndex + 1}
            </span>
            <div className={cn("w-[1px] h-4", uiTheme.divider)} />
            <div className="flex items-center gap-1.5">
              {state.tool === 'brush' && <Droplet className={cn("w-4 h-4", uiTheme.iconColor)} />}
              {state.tool === 'line' && <Paintbrush className={cn("w-4 h-4", uiTheme.iconColor)} />}
              {state.tool === 'eraser' && <Eraser className={cn("w-4 h-4", uiTheme.iconColor)} />}
              {state.tool === 'text' && <Type className={cn("w-4 h-4", uiTheme.iconColor)} />}
              {state.tool === 'move' && <Move className={cn("w-4 h-4", uiTheme.iconColor)} />}
              <span className={cn("text-sm font-semibold capitalize", uiTheme.text)}>
                {state.tool === 'brush' ? 'Blob' : state.tool === 'line' ? 'Brush' : state.tool === 'eraser' ? 'Eraser' : state.tool === 'text' ? 'Text' : 'Move'}
              </span>
            </div>
            
            {/* Extra Tools Context - Show when brush or line tool is active with modifiers */}
            {(state.tool === 'brush' || state.tool === 'line') && (
              state.isSymmetryEnabled || state.isDrawInside || state.isDrawBehind || state.isOrganicMode
            ) && (
              <>
                <div className={cn("w-[1px] h-4", uiTheme.divider)} />
                <div className="flex items-center gap-1">
                  {state.isSymmetryEnabled && (
                    <div className={cn("px-2 py-0.5 rounded-md flex items-center gap-1", uiTheme.badgeBg)}>
                      <FlipHorizontal className={cn("w-3 h-3", uiTheme.iconColor)} />
                      <span className={cn("text-[10px] font-medium", uiTheme.textMuted)}>SYM</span>
                    </div>
                  )}
                  {state.isDrawInside && (
                    <div className={cn("px-2 py-0.5 rounded-md flex items-center gap-1", uiTheme.badgeBg)}>
                      <Target className={cn("w-3 h-3", uiTheme.iconColor)} />
                      <span className={cn("text-[10px] font-medium", uiTheme.textMuted)}>IN</span>
                    </div>
                  )}
                  {state.isDrawBehind && (
                    <div className={cn("px-2 py-0.5 rounded-md flex items-center gap-1", uiTheme.badgeBg)}>
                      <Layers className={cn("w-3 h-3", uiTheme.iconColor)} />
                      <span className={cn("text-[10px] font-medium", uiTheme.textMuted)}>BACK</span>
                    </div>
                  )}
                  {state.isOrganicMode && (
                    <div className={cn("px-2 py-0.5 rounded-md flex items-center gap-1", uiTheme.badgeBg)}>
                      <Waves className={cn("w-3 h-3", uiTheme.iconColor)} />
                      <span className={cn("text-[10px] font-medium", uiTheme.textMuted)}>FLUID</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    
      {/* Top Center: Mode Switch */}
      <div className={cn(
        "absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full shadow-sm border transition-all duration-200 hover:shadow-md z-50 select-none backdrop-blur-sm",
        uiTheme.bgAlt, uiTheme.border
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
                  <EyeOff className={cn("w-3.5 h-3.5", uiTheme.textSubtle)} />
                </Button>
            </>
        )}
      </div>
      
      {/* Top Left: Project Controls & Dark Mode (Only in Draw Mode) */}
      {state.mode === 'drawing' && (
        <div className="absolute top-6 left-4 sm:left-6 flex flex-col gap-2 z-50 pointer-events-none">
          
          {/* File Controls */}
          <div className={cn(
            "p-1.5 rounded-full shadow-sm border flex items-center gap-2 sm:gap-1 select-none pointer-events-auto backdrop-blur-sm",
            uiTheme.bgAlt, uiTheme.border
          )}>
             <EnhancedTooltip content="Save Project" shortcut="Cmd+S">
               <RippleButton
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation",
                    uiTheme.hover
                  )}
                  onClick={handleSaveProject}
               >
                  <Save className={cn("w-4 h-4", uiTheme.iconColor)} />
               </RippleButton>
             </EnhancedTooltip>
             
             <EnhancedTooltip content="Open Project" shortcut="Cmd+O">
               <RippleButton
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation",
                    uiTheme.hover
                  )}
                  onClick={() => fileInputRef.current?.click()}
               >
                  <FolderOpen className={cn("w-4 h-4", uiTheme.iconColor)} />
               </RippleButton>
             </EnhancedTooltip>
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
                        uiTheme.hover
                      )}
                      disabled={state.isExporting}
                   >
                      <FileCode className={cn("w-4 h-4", uiTheme.iconColor)} />
                   </RippleButton>
                 </PopoverTrigger>
               </EnhancedTooltip>
               <PopoverContent 
                 className={cn("w-auto p-2", uiTheme.bg, uiTheme.border)}
                 align="start"
                 sideOffset={8}
               >
                 <div className="flex flex-col gap-1">
                   <button
                     onClick={() => handleExportRequest('svg')}
                     className={cn(
                       "px-3 py-2 text-sm rounded-md text-left transition-colors",
                       uiTheme.hover,
                       uiTheme.text
                     )}
                   >
                     SVG
                   </button>
                   <button
                     onClick={() => handleExportRequest('svgz')}
                     className={cn(
                       "px-3 py-2 text-sm rounded-md text-left transition-colors",
                       uiTheme.hover,
                       uiTheme.text
                     )}
                   >
                     SVG (Compressed)
                   </button>
                 </div>
               </PopoverContent>
             </Popover>
             
             <div className={cn("w-[1px] h-4 mx-1", uiTheme.divider)} />
             <EnhancedTooltip content="About & Help" shortcut="?">
               <RippleButton
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation",
                    uiTheme.hover
                  )}
                  onClick={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
               >
                  <Info className={cn("w-4 h-4", uiTheme.iconColor)} />
               </RippleButton>
             </EnhancedTooltip>
          </div>

          {/* Project Name Editor */}
          <div className={cn(
            "px-3 py-1.5 rounded-full shadow-sm border select-none pointer-events-auto backdrop-blur-sm flex items-center gap-2",
            uiTheme.bgAlt, uiTheme.border
          )}>
            <Pen className={cn("w-3.5 h-3.5", uiTheme.textMuted)} />
            <input
              type="text"
              value={state.projectName}
              onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })}
              onFocus={(e) => e.target.select()}
              maxLength={50}
              className={cn(
                "bg-transparent border-none outline-none text-xs font-medium w-32 placeholder:text-slate-400",
                uiTheme.text
              )}
              placeholder="Project Name"
            />
          </div>

          {/* Dark Mode */}
          <div className={cn(
            "p-1.5 rounded-full shadow-sm border select-none w-fit pointer-events-auto backdrop-blur-sm flex items-center gap-1",
            uiTheme.bgAlt, uiTheme.border
          )}>
            <EnhancedTooltip content="Toggle Canvas Dark Paper" shortcut="Shift+D">
              <RippleButton
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation",
                    uiTheme.hover
                  )}
                  onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
              >
                  {state.isDarkMode ? <Sun className={cn("w-4 h-4", uiTheme.iconColor)} /> : <Moon className={cn("w-4 h-4", uiTheme.iconColor)} />}
              </RippleButton>
            </EnhancedTooltip>
          </div>
        </div>
      )}
      
      {/* Export Controls (Only in View Mode) */}
      {state.mode === 'cinematic' && (
        <div className="absolute top-6 left-4 sm:left-6 flex flex-col gap-2 z-50">
          <div className={cn("backdrop-blur-sm p-1.5 rounded-full shadow-sm border flex items-center gap-2 sm:gap-1 select-none", uiTheme.bgPanel, uiTheme.border)}>
              <RippleButton
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation", uiTheme.hoverAlt)}
                onClick={() => dispatch({ type: 'REQUEST_EXPORT', payload: 'png' })}
                title="Save Snapshot (PNG)"
                disabled={state.isExporting}
              >
                <Camera className={cn("w-4 h-4", uiTheme.iconColor)} />
              </RippleButton>
              <RippleButton
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation", uiTheme.hoverAlt)}
                onClick={() => dispatch({ type: 'REQUEST_EXPORT', payload: 'mp4' })}
                title="Save Animation Loop (MP4)"
                disabled={state.isExporting}
              >
                  {state.isExporting && state.exportRequest === 'mp4' ? (
                      <div className={cn("w-3 h-3 border-2 rounded-full animate-spin", uiTheme.spinnerBorder, uiTheme.spinnerTop)} />
                  ) : (
                      <Video className={cn("w-4 h-4", uiTheme.iconColor)} />
                  )}
              </RippleButton>
              <div className={cn("w-[1px] h-4 mx-1", uiTheme.divider)} />
              <RippleButton
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 sm:h-8 sm:w-8 rounded-full active:scale-95 transition-transform touch-manipulation", uiTheme.hoverAlt)}
                onClick={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
                title="About"
              >
                <Info className={cn("w-4 h-4", uiTheme.iconColor)} />
              </RippleButton>
          </div>
        </div>
      )}

      {/* Cinematic Controls (Only in Cinematic Mode) */}
      {state.mode === 'cinematic' && (
         <>
             {/* Animation Types & POI */}
             <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 pointer-events-none">
                 
                 {/* Point of Interest Control (Above Panel) */}
                 {state.pointOfInterest && (
                     <div className={cn("absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-auto backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border flex items-center gap-2 z-50", uiTheme.bgPanel, uiTheme.border)}>
                         <Target className={cn("w-3.5 h-3.5", uiTheme.textMuted)} />
                         <span className={cn("text-xs", uiTheme.textMuted)}>POI Set</span>
                         <Button
                             variant="ghost"
                             size="icon"
                             className={cn("h-5 w-5 rounded-full", uiTheme.hoverAlt)}
                             onClick={() => dispatch({ type: 'CLEAR_POINT_OF_INTEREST' })}
                             title="Clear Point of Interest"
                         >
                             <X className="w-3 h-3" />
                         </Button>
                     </div>
                 )}

                 <div className="pointer-events-auto w-full sm:w-auto flex justify-center overflow-x-auto no-scrollbar max-w-full">
                     <div className={cn("flex items-center gap-1 backdrop-blur-md p-1 rounded-full shadow-sm border", uiTheme.bgPanelAlt, uiTheme.border)}>
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
             <div className={cn("absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border pointer-events-auto z-40 animate-in fade-in slide-in-from-bottom-2 duration-300", uiTheme.bgPanel, uiTheme.border)}>
                  {/* Speed - Hidden in Orbit Mode */}
                  {state.cinematicType !== 'orbit' && (
                      <div className={cn("flex items-center gap-2 border-r pr-3 mr-1", uiTheme.border)}>
                          <Activity className={cn("w-3.5 h-3.5", uiTheme.textSubtle)} />
                          <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.1"
                              value={state.cinematicSpeed ?? 1.0}
                              onChange={(e) => dispatch({ type: 'SET_CINEMATIC_SPEED', payload: parseFloat(e.target.value) })}
                              className={cn("w-20 h-1.5 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                          />
                          <span className={cn("text-[10px] font-mono font-medium w-6 text-right", uiTheme.textSubtle)}>
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
                                 state.isHandheldEnabled ? "bg-slate-900 text-white shadow-sm" : cn(uiTheme.textSubtle, uiTheme.toggleHoverBg, uiTheme.toggleActiveText)
                             )}
                             title="Handheld Camera Shake"
                         >
                             <Hand className="w-3 h-3 mr-1" />
                             {state.isHandheldEnabled ? 'ON' : 'OFF'}
                         </Button>
                         
                         {state.isHandheldEnabled && (
                             <div className={cn("flex items-center rounded-full p-0.5 animate-in fade-in zoom-in duration-200", uiTheme.toggleBg)}>
                                 <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => dispatch({ type: 'SET_HANDHELD_INTENSITY', payload: 'low' })}
                                     className={cn(
                                         "h-5 w-6 rounded-full text-[9px] transition-all",
                                         uiTheme.toggleHoverBg,
                                         state.handheldIntensity === 'low' && cn("shadow-sm font-bold text-white", uiTheme.toggleActiveBg)
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
                                         uiTheme.toggleHoverBg,
                                         state.handheldIntensity === 'medium' && cn("shadow-sm font-bold text-white", uiTheme.toggleActiveBg)
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
                                         uiTheme.toggleHoverBg,
                                         state.handheldIntensity === 'high' && cn("shadow-sm font-bold text-white", uiTheme.toggleActiveBg)
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
                 <div className={cn("backdrop-blur-sm p-1.5 rounded-full shadow-sm border", uiTheme.bgPanel, uiTheme.border)}>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("rounded-full px-3 text-xs font-medium tracking-wide flex items-center gap-2", uiTheme.hoverAlt)}
                            >
                                <Wand2 className="w-3.5 h-3.5" />
                                FX MIX
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 mr-6 mt-2 font-manrope bg-white border-slate-200 text-[#353535]" align="end">
                            <div className="space-y-4">
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-slate-900">
                                    <SlidersHorizontal className="w-3.5 h-3.5" /> Post Processing
                                </h4>
                                
                                {/* Grain */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.grain}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'grain' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Grain</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.grain ? `${Math.round(state.postProcessing.grain * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.grain}
                                        value={state.postProcessing.grain ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'grain', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.grain && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Vignette */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.vignette}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'vignette' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><Ban className="w-3 h-3" /> Vignette</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.vignette ? `${Math.round(state.postProcessing.vignette * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.vignette}
                                        value={state.postProcessing.vignette ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'vignette', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.vignette && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Chromatic Aberration */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.chromaticAberration}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'chromaticAberration' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Chromatic Ab.</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.chromaticAberration ? `${Math.round(state.postProcessing.chromaticAberration * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.chromaticAberration}
                                        value={state.postProcessing.chromaticAberration ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'chromaticAberration', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.chromaticAberration && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Fog (New) */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.fog}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'fog' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><CloudFog className="w-3 h-3" /> Fog</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.fog ? `${Math.round(state.postProcessing.fog * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.fog}
                                        value={state.postProcessing.fog ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'fog', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.fog && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Particles (New) */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.particles}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'particles' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-sparkles'%3E%3Cpath d='m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z'/%3E%3Cpath d='M5 3v4'/%3E%3Cpath d='M9 5H5'/%3E%3Cpath d='M19 19v2'/%3E%3Cpath d='M21 19h-2'/%3E%3C/svg%3E" className="w-3 h-3" /> Particles</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.particles ? `${Math.round(state.postProcessing.particles * 100)}%` : 'Off'}</span>
                                    </div>
                                    
                                    {/* Particle Amount Slider */}
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.particles}
                                        value={state.postProcessing.particles ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'particles', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.particles && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                    
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
                                </div>
                                
                                <div className={cn("h-[1px] w-full my-2", uiTheme.divider)} />

                                {/* PIXELART (New) */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.pixelArt}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'pixelArt' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
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
                                                <div className={cn("flex justify-between text-[10px]", uiTheme.textSubtle)}>
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
                                                    className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                                                />
                                            </div>

                                            {/* Color Depth */}
                                            <div className="space-y-1">
                                                <div className={cn("flex justify-between text-[10px]", uiTheme.textSubtle)}>
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
                                                    className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                                                />
                                            </div>

                                            {/* Dither Intensity */}
                                            <div className="space-y-1">
                                                <div className={cn("flex justify-between text-[10px]", uiTheme.textSubtle)}>
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
                                                    className={cn("w-full h-1.5 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Wiggle (New) */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.wiggle}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'wiggle' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><Waves className="w-3 h-3" /> Stop Motion</span>
                                        </label>
                                        <span className={state.postProcessingEnabled.wiggle ? 'font-medium' : ''}>
                                            {state.postProcessingEnabled.wiggle 
                                                ? (state.postProcessing.wiggle <= 0.2 ? 'Light' : state.postProcessing.wiggle >= 0.8 ? 'Strong' : 'Medium')
                                                : 'Off'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.5"
                                        disabled={!state.postProcessingEnabled.wiggle}
                                        value={state.postProcessing.wiggle ?? 0.5}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'wiggle', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.wiggle && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Grunge Overlay (New) */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.grungeOverlay}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'grungeOverlay' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><Tornado className="w-3 h-3" /> Grunge Overlay</span>
                                        </label>
                                        <span className={state.postProcessingEnabled.grungeOverlay ? 'font-medium' : ''}>
                                            {state.postProcessingEnabled.grungeOverlay 
                                                ? (state.postProcessing.grungeIntensity <= 0.2 ? 'Subtle' : state.postProcessing.grungeIntensity >= 0.8 ? 'Intense' : 'Medium')
                                                : 'Off'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.5"
                                        disabled={!state.postProcessingEnabled.grungeOverlay}
                                        value={state.postProcessing.grungeIntensity ?? 0.5}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'grungeIntensity', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.grungeOverlay && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Glow (New) */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.glow}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'glow' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='5'/%3E%3Cline x1='12' y1='1' x2='12' y2='3'/%3E%3Cline x1='12' y1='21' x2='12' y2='23'/%3E%3Cline x1='4.22' y1='4.22' x2='5.64' y2='5.64'/%3E%3Cline x1='18.36' y1='18.36' x2='19.78' y2='19.78'/%3E%3Cline x1='1' y1='12' x2='3' y2='12'/%3E%3Cline x1='21' y1='12' x2='23' y2='12'/%3E%3Cline x1='4.22' y1='19.78' x2='5.64' y2='18.36'/%3E%3Cline x1='18.36' y1='5.64' x2='19.78' y2='4.22'/%3E%3C/svg%3E" className="w-3 h-3" /> Glow</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.glow ? `${Math.round(state.postProcessing.glow * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.glow}
                                        value={state.postProcessing.glow ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'glow', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.glow && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* RISO */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.riso}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'riso' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23334155' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M7 7h.01M17 7h.01M7 17h.01M17 17h.01M12 7v10M7 12h10'/%3E%3C/svg%3E" className="w-3 h-3" /> RISO</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.riso ? `${Math.round(state.postProcessing.riso * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.riso}
                                        value={state.postProcessing.riso ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'riso', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.riso && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* Distortion */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.distortion}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'distortion' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><Scaling className="w-3 h-3" /> Distortion</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.distortion ? `${Math.round(state.postProcessing.distortion * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-1"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.distortion}
                                        value={state.postProcessing.distortion ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'distortion', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.distortion && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                </div>

                                {/* DoF & Focus */}
                                <div className={cn("space-y-1.5 pt-2 border-t", uiTheme.border)}>
                                    <div className="flex justify-between items-center text-xs opacity-70">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={state.postProcessingEnabled.dof}
                                                onChange={() => dispatch({ type: 'TOGGLE_FX', payload: 'dof' })}
                                                className={cn("rounded-sm w-3 h-3", uiTheme.sliderAccent)}
                                            />
                                            <span className="flex items-center gap-1"><Aperture className="w-3 h-3" /> Blur / DoF</span>
                                        </label>
                                        <span>{state.postProcessingEnabled.dof ? `${Math.round(state.postProcessing.dof * 100)}%` : 'Off'}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        disabled={!state.postProcessingEnabled.dof}
                                        value={state.postProcessing.dof ?? 0}
                                        onChange={(e) => dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'dof', value: parseFloat(e.target.value) } })}
                                        className={cn(
                                            "w-full h-1.5 rounded-lg appearance-none cursor-pointer",
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.dof && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                    
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
                                                    // Use current UI selection or fallback
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
                                                        
                                                        // If Locked, update target
                                                        if (state.postProcessing.focusTargetLayer !== -1 && state.postProcessing.focusTargetLayer !== undefined) {
                                                            dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: next } });
                                                        } else {
                                                            // If Free, trigger one-shot focus
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
                                                        
                                                        // If Locked, update target
                                                        if (state.postProcessing.focusTargetLayer !== -1 && state.postProcessing.focusTargetLayer !== undefined) {
                                                            dispatch({ type: 'SET_FX_INTENSITY', payload: { fx: 'focusTargetLayer', value: next } });
                                                        } else {
                                                            // If Free, trigger one-shot focus
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
                                            
                                            // Check if snapped to a layer
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
                                            
                                            // Snapping Logic
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
                                                    // Hysteresis: Stick hard (300px), Enter easy (100px)
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
                                            uiTheme.sliderBg, uiTheme.sliderAccent,
                                            !state.postProcessingEnabled.dof && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                    </>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                 </div>

                 {/* Lens Slider */}
                  <div className={cn("backdrop-blur-sm p-3 rounded-2xl shadow-sm border flex flex-col gap-2 w-40 sm:w-48 mt-1", uiTheme.bgPanel, uiTheme.border)}>
                      <div className={cn("flex justify-between items-center text-xs font-medium", uiTheme.textMuted)}>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> Focal Length</span>
                          <span>{flToMm(state.focalLength)}mm</span>
                      </div>
                      <input
                          type="range"
                          min="24"
                          max="300"
                          step="1"
                          value={flToMm(state.focalLength)}
                          onChange={(e) => dispatch({ type: 'SET_FOCAL_LENGTH', payload: mmToFl(Number(e.target.value)) })}
                          className={cn("w-full h-1 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                      />
                  </div>

                  {/* Zoom Slider */}
                  <div className={cn("backdrop-blur-sm p-3 rounded-2xl shadow-sm border flex flex-col gap-2 w-40 sm:w-48 mt-1", uiTheme.bgPanel, uiTheme.border)}>
                      <div className={cn("flex justify-between items-center text-xs font-medium", uiTheme.textMuted)}>
                          <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3"/> Distance</span>
                          <span>{state.viewZoomOffset > 0 ? '+' : ''}{Math.round(state.viewZoomOffset)}</span>
                      </div>
                      <input
                          type="range"
                          min="-5000"
                          max="2000"
                          step="10"
                          value={state.viewZoomOffset}
                          onChange={(e) => dispatch({ type: 'SET_VIEW_ZOOM_OFFSET', payload: parseFloat(e.target.value) })}
                          className={cn("w-full h-1 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                      />
                  </div>

                  {/* Layer Spacing Slider */}
                  <div className={cn("backdrop-blur-sm p-3 rounded-2xl shadow-sm border flex flex-col gap-2 w-40 sm:w-48 mt-1", uiTheme.bgPanel, uiTheme.border)}>
                      <div className={cn("flex justify-between items-center text-xs font-medium", uiTheme.textMuted)}>
                          <span className="flex items-center gap-1"><MoveVertical className="w-3 h-3"/> Layer Spacing</span>
                          <span>{state.layerSpacingFactor.toFixed(2)}x</span>
                      </div>
                      <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={state.layerSpacingFactor}
                          onChange={(e) => dispatch({ type: 'SET_LAYER_SPACING_FACTOR', payload: parseFloat(e.target.value) })}
                          className={cn("w-full h-1 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
                      />
                  </div>
             </div>
         </>
      )}

      {/* Layer Control (Bottom Center - Only in Draw Mode) */}
      {state.mode === 'drawing' && (
          <div className="absolute bottom-6 left-4 translate-x-0 sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 select-none pointer-events-none">
              <div className={cn("backdrop-blur-sm px-2 py-1.5 rounded-full shadow-sm border flex items-center gap-1 pointer-events-auto", uiTheme.bg, uiTheme.border)}>
                  
                  {/* Visibility Toggle */}
                  <Button 
                      variant="ghost"
                      size="icon"
                      onClick={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: state.currentLayerIndex })}
                      className="h-8 w-8 rounded-full"
                      title={state.hiddenLayers.includes(state.currentLayerIndex) ? "Show Layer" : "Hide Layer"}
                  >
                      {state.hiddenLayers.includes(state.currentLayerIndex) ? (
                          <EyeOff className={cn("w-4 h-4", uiTheme.textMuted)} />
                      ) : (
                          <Eye className={cn("w-4 h-4", uiTheme.iconColor)} />
                      )}
                  </Button>

                  {/* 3D Lock Toggle - Generalized for all layers */}
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
                          <Unlock className={cn("w-4 h-4", uiTheme.iconColor)} />
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
                          
                          // Check if current layer has content
                          const currentLayerZ = state.currentLayerIndex * -BASE_DEPTH_STEP;
                          const hasShapes = state.shapes.some(s => s.zIndex === currentLayerZ);
                          
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
                      <Copy className={cn("w-4 h-4", uiTheme.iconColor)} />
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
                      <Trash2 className={cn("w-4 h-4 hover:text-red-500", uiTheme.iconColor)} />
                  </Button>
                  
                  <div className={cn("w-[1px] h-4 mx-1", uiTheme.divider)} />

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
                        <ChevronLeft className={cn("w-4 h-4", uiTheme.iconColor)} />
                    </Button>
                  </EnhancedTooltip>

                  <div className="px-3 flex flex-col items-center">
                    <span className={cn("text-[10px] uppercase font-bold tracking-wider", uiTheme.textMuted)}>Layer</span>
                    <span className={cn("text-sm font-semibold leading-none transition-all", uiTheme.text)}>
                        {state.currentLayerIndex + 1} <span className={cn("font-normal", uiTheme.textMuted)}>/ {state.totalLayers}</span>
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
                            <ChevronRight className={cn("w-4 h-4", uiTheme.iconColor)} />
                        )}
                    </Button>
                  </EnhancedTooltip>
                  
                  <div className={cn("w-[1px] h-4 mx-1", uiTheme.divider)} />
                  
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
                        <Layers className={cn("w-4 h-4", uiTheme.iconColor)} />
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
      )}

      {/* Bottom Left: Actions (Only in Draw Mode) */}
      {state.mode === 'drawing' && (
        <div className="absolute bottom-6 left-4 sm:bottom-8 sm:left-6 flex items-center gap-2 opacity-80 hover:opacity-100 transition-all duration-200 z-50 select-none pointer-events-none">
           <div className={cn(
             "flex items-center gap-1 p-1 rounded-lg shadow-sm border pointer-events-auto backdrop-blur-sm",
             uiTheme.bgAlt, uiTheme.border
           )}>
            <EnhancedTooltip content="Undo" shortcut="Cmd+Z" disabled={state.historyIndex <= 0}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch({ type: 'UNDO' })}
                disabled={state.historyIndex <= 0}
                className={cn("h-8 w-8 active:scale-95 transition-transform", uiTheme.hover)}
              >
                <Undo className={cn("w-4 h-4", uiTheme.iconColor)} />
              </Button>
            </EnhancedTooltip>
            <EnhancedTooltip content="Redo" shortcut="Cmd+Shift+Z" disabled={state.historyIndex >= state.history.length - 1}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch({ type: 'REDO' })}
                disabled={state.historyIndex >= state.history.length - 1}
                className={cn("h-8 w-8 active:scale-95 transition-transform", uiTheme.hover)}
              >
                <Redo className={cn("w-4 h-4", uiTheme.iconColor)} />
              </Button>
            </EnhancedTooltip>
            
            <div className={cn("h-4 w-[1px] mx-1", uiTheme.divider)} />
            
            <EnhancedTooltip content="Reset View" shortcut="Space">
              <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => dispatch({ type: 'RESET_DRAWING_VIEW' })}
                 className={cn("h-8 w-8 active:scale-95 transition-transform", uiTheme.hover)}
              >
                 <Maximize className={cn("w-4 h-4", uiTheme.iconColor)} />
              </Button>
            </EnhancedTooltip>

            <div className={cn("h-4 w-[1px] mx-1", uiTheme.divider)} />
            
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 text-red-500 hover:text-red-600", uiTheme.hover)}
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
      )}

      {/* Bottom Right: Toolbar (Only in Draw Mode) */}
      {state.mode === 'drawing' && (
        <div className="absolute bottom-24 right-4 sm:bottom-8 sm:right-6 flex flex-col items-end gap-2 opacity-100 z-50 select-none pointer-events-none">
          
          {/* Tool Selector - Compact vertical column */}
          <div className={cn(
            "p-1 rounded-lg shadow-sm border flex flex-col gap-1 pointer-events-auto backdrop-blur-sm",
            uiTheme.bgAlt, uiTheme.border
          )}>
             {/* Palette Mode Toggle */}
             <Button
                 variant={state.paletteMode === 'grad' ? "secondary" : "ghost"}
                 size="sm"
                 onClick={() => dispatch({ type: 'SET_PALETTE_MODE', payload: state.paletteMode === 'flat' ? 'grad' : 'flat' })}
                 className={cn(
                   "h-6 text-[10px] font-bold px-0 w-full mb-1 border-b",
                   uiTheme.border
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

             <div className="w-full h-[1px] bg-slate-200 my-1" />

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

             <div className="w-full h-[1px] bg-slate-200 my-1" />

             <Button
                variant={state.isSymmetryEnabled ? "default" : "ghost"}
                size="icon"
                onClick={() => dispatch({ type: 'TOGGLE_SYMMETRY' })}
                disabled={state.tool === 'move'}
                className={cn(
                    "h-8 w-8",
                    state.isSymmetryEnabled && "bg-slate-900 text-white",
                    state.tool === 'move' && "opacity-50 cursor-not-allowed"
                )}
                title={state.tool === 'move' ? "Not available with Move tool" : "Vertical Symmetry"}
             >
                <FlipHorizontal className="w-4 h-4" />
             </Button>

             <Button
                variant={state.isDrawInside ? "default" : "ghost"}
                size="icon"
                onClick={() => dispatch({ type: 'TOGGLE_DRAW_INSIDE' })}
                disabled={state.tool === 'eraser' || state.tool === 'move' || !currentLayerHasShapes}
                className={cn(
                    "h-8 w-8",
                    state.isDrawInside && "bg-slate-900 text-white",
                    (state.tool === 'eraser' || state.tool === 'move' || !currentLayerHasShapes) && "opacity-50 cursor-not-allowed"
                )}
                title={
                    state.tool === 'eraser' ? "Not available with Eraser" : 
                    state.tool === 'move' ? "Not available with Move tool" :
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
                disabled={state.tool === 'eraser' || state.tool === 'move' || !currentLayerHasShapes}
                className={cn(
                    "h-8 w-8",
                    state.isDrawBehind && "bg-slate-900 text-white",
                    (state.tool === 'eraser' || state.tool === 'move' || !currentLayerHasShapes) && "opacity-50 cursor-not-allowed"
                )}
                title={
                    state.tool === 'eraser' ? "Not available with Eraser" :
                    state.tool === 'move' ? "Not available with Move tool" :
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
                disabled={state.tool === 'move' || state.tool === 'line'}
                className={cn(
                    "h-8 w-8",
                    state.isOrganicMode && "bg-slate-900 text-white",
                    (state.tool === 'move' || state.tool === 'line') && "opacity-50 cursor-not-allowed"
                )}
                title={
                    state.tool === 'move' ? "Not available with Move tool" : 
                    state.tool === 'line' ? "Not available with Line tool" :
                    "Organic Stroke (Fluid Wiggle)"
                }
             >
                <Waves className="w-4 h-4" />
             </Button>
          </div>

          <div className={cn(
            "p-2 rounded-xl shadow-sm border flex flex-col gap-2 pointer-events-auto backdrop-blur-sm",
            uiTheme.bgAlt, uiTheme.border
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
                      // Determine if we need a light border for contrast (if color is very dark)
                      // Updated for new palette
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
                  )})}
              </div>
          </div>
        </div>
      )}

      {/* Contextual Tool Options Panel - Appears above layers panel */}
      {state.mode === 'drawing' && <ToolOptionsPanel />}

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

      {/* Complexity Warning Dialog */}
      {showComplexityWarning && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-300 opacity-100"
          onClick={handleCancelExport}
        >
          <div 
            className="relative bg-white w-[90%] max-w-[420px] p-8 flex flex-col items-center text-center shadow-2xl transition-all duration-300 scale-100 opacity-100"
            style={{ borderRadius: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={handleCancelExport}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-all duration-200 text-slate-400 hover:text-slate-600 hover:scale-110 active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h1 
              className="text-2xl mb-4 leading-tight"
              style={{ color: '#353535', fontWeight: 678, letterSpacing: '-0.02em' }}
            >
              Complex Scene Warning
            </h1>

            {/* Description */}
            <div 
              className="text-base leading-relaxed max-w-[360px] space-y-4"
              style={{ color: '#666666', fontWeight: 398 }}
            >
              <p>
                Your scene contains <span className="font-semibold" style={{ color: '#353535' }}>{getSceneComplexity().totalShapes} shapes</span>, which may cause export to fail due to browser memory limits.
              </p>
              
              <div className="text-left">
                <p className="font-medium mb-2" style={{ color: '#353535', fontWeight: 500 }}>
                  Recommendations:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Save your project (.dior) before exporting</li>
                  <li>Use SVG (Compressed) format for better performance</li>
                  <li>Consider reducing scene complexity or hiding unused layers</li>
                </ul>
              </div>

              <p className="text-sm">
                Do you want to continue with the export?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 w-full max-w-[320px]">
              <button
                onClick={handleCancelExport}
                className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm font-medium tracking-wide transition-colors cursor-pointer hover:bg-slate-200 active:scale-95"
                style={{ color: '#353535' }}
              >
                Cancel
              </button>
              <button
                onClick={handleProceedWithExport}
                className="flex-1 px-4 py-2.5 bg-[rgb(3,2,19)] rounded-full text-sm text-white font-medium tracking-wide transition-colors cursor-pointer hover:bg-[#1d293d] shadow-sm active:scale-95"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
