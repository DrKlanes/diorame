import React from 'react';
import { useStrata } from './StrataContext';
import { Button } from '../ui/button';
import { RotateCw, Sparkles } from 'lucide-react';
import { cn } from '../ui/utils';
import { DiSlider } from '../../design-system/DiSlider';

export const ToolOptionsPanel = () => {
  const { state, dispatch } = useStrata();
  
  // Determine if we should show the panel
  const showGradOptions = state.paletteMode === 'grad';
  const showBrushOptions = state.tool === 'line'; // 'line' is the internal name for Brush tool
  
  const showPanel = showGradOptions || showBrushOptions;
  
  if (!showPanel) return null;
  
  // UI Theme - Light Mode (Single Source of Truth)
  const uiTheme = {
    bg: "bg-white/90",
    border: "border-slate-200",
    borderSubtle: "border-slate-200/50",
    text: "text-slate-900",
    textMuted: "text-slate-500",
    sliderBg: "bg-slate-200",
    sliderAccent: "accent-slate-900",
    toggleBg: "bg-slate-100",
    toggleActiveBg: "bg-white",
    toggleActiveText: "text-slate-900",
    toggleInactiveText: "text-slate-600",
    toggleHoverBg: "hover:bg-white/50",
    toggleHoverText: "hover:text-slate-900",
  };
  
  return (
    <div className="absolute bottom-32 sm:bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Gradient Options Panel */}
      {showGradOptions && (
        <div className={cn(
          "backdrop-blur-sm rounded-2xl shadow-sm border w-48",
          uiTheme.bg, uiTheme.border
        )}>
          {/* Header */}
          <div className={cn("px-3 pt-2 pb-1.5 border-b", uiTheme.borderSubtle)}>
            <span className={cn("text-[10px] font-medium tracking-wider uppercase", uiTheme.textMuted)}>
              Gradient
            </span>
          </div>
          
          {/* Content */}
          <div className="p-3 pt-2 flex flex-col gap-2">
            {/* Gradient Type Selector */}
            <div className={cn("flex items-center gap-1 p-0.5 rounded-lg", uiTheme.toggleBg)}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_PALETTE_GRADIENT_TYPE', payload: 'solid' })}
                className={cn(
                  "flex-1 h-7 rounded-md transition-all text-[10px]",
                  state.paletteGradientType === 'solid'
                    ? cn("shadow-sm", uiTheme.toggleActiveBg, uiTheme.toggleActiveText)
                    : cn(uiTheme.toggleInactiveText, uiTheme.toggleHoverBg, uiTheme.toggleHoverText)
                )}
                title="Solid gradient (light → dark)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16">
                  <defs>
                    <linearGradient id="solidGradIcon" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.4"/>
                      <stop offset="100%" stopColor="currentColor" stopOpacity="1"/>
                    </linearGradient>
                  </defs>
                  <rect x="1" y="3" width="14" height="10" rx="2" fill="url(#solidGradIcon)"/>
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_PALETTE_GRADIENT_TYPE', payload: 'fade' })}
                className={cn(
                  "flex-1 h-7 rounded-md transition-all text-[10px]",
                  state.paletteGradientType === 'fade'
                    ? cn("shadow-sm", uiTheme.toggleActiveBg, uiTheme.toggleActiveText)
                    : cn(uiTheme.toggleInactiveText, uiTheme.toggleHoverBg, uiTheme.toggleHoverText)
                )}
                title="Fade gradient (solid → transparent)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16">
                  <defs>
                    <linearGradient id="fadeGradIcon" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <rect x="1" y="3" width="14" height="10" rx="2" fill="url(#fadeGradIcon)"/>
                  <rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="0.5"/>
                </svg>
              </Button>
            </div>

            <DiSlider
              label={<><RotateCw className="w-3 h-3"/> Angle</>}
              formattedValue={`${state.paletteGradientAngle}°`}
              value={state.paletteGradientAngle}
              min={0}
              max={360}
              step={15}
              onChange={(v) => dispatch({ type: 'SET_PALETTE_GRADIENT_ANGLE', payload: Math.round(v) })}
            />
            <DiSlider
              label={<><Sparkles className="w-3 h-3"/> Intensity</>}
              formattedValue={`${Math.round(state.paletteGradientIntensity * 100)}%`}
              value={state.paletteGradientIntensity}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => dispatch({ type: 'SET_PALETTE_GRADIENT_INTENSITY', payload: v })}
            />
          </div>
        </div>
      )}
      
      {/* Brush Tool Options Panel */}
      {showBrushOptions && (
        <div className={cn(
          "backdrop-blur-sm rounded-2xl shadow-sm border w-48",
          uiTheme.bg, uiTheme.border
        )}>
          {/* Header */}
          <div className={cn("px-3 pt-2 pb-1.5 border-b", uiTheme.borderSubtle)}>
            <span className={cn("text-[10px] font-medium tracking-wider uppercase", uiTheme.textMuted)}>
              Brush
            </span>
          </div>
          
          {/* Content */}
          <div className="p-3 pt-2 flex flex-col gap-2.5">
            {/* Line Mode Selector - Integrated like DRAW/VIEW toggle */}
            <div className={cn("flex items-center gap-1 p-0.5 rounded-lg", uiTheme.toggleBg)}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_LINE_MODE', payload: 'tapered' })}
                className={cn(
                  "flex-1 h-7 rounded-md transition-all",
                  state.lineMode === 'tapered' 
                    ? cn("shadow-sm", uiTheme.toggleActiveBg, uiTheme.toggleActiveText)
                    : cn(uiTheme.toggleInactiveText, uiTheme.toggleHoverBg, uiTheme.toggleHoverText)
                )}
                title="Tapered"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 8 L8 4 L14 8 L8 12 Z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_LINE_MODE', payload: 'uniform' })}
                className={cn(
                  "flex-1 h-7 rounded-md transition-all",
                  state.lineMode === 'uniform' 
                    ? cn("shadow-sm", uiTheme.toggleActiveBg, uiTheme.toggleActiveText)
                    : cn(uiTheme.toggleInactiveText, uiTheme.toggleHoverBg, uiTheme.toggleHoverText)
                )}
                title="Uniform"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="2" y="6" width="12" height="4" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_LINE_MODE', payload: 'ink' })}
                className={cn(
                  "flex-1 h-7 rounded-md transition-all",
                  state.lineMode === 'ink' 
                    ? cn("shadow-sm", uiTheme.toggleActiveBg, uiTheme.toggleActiveText)
                    : cn(uiTheme.toggleInactiveText, uiTheme.toggleHoverBg, uiTheme.toggleHoverText)
                )}
                title="Ink"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 9.5 C3 7, 5 6.2, 7 7.5 C9 8.8, 11 6, 14 6.5 L14 9.5 C11 10, 9 12.2, 7 10.8 C5 9.5, 3 11, 2 9.5 Z" />
                </svg>
              </Button>
            </div>
            
            {/* Thickness Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-medium">
                <span className={uiTheme.textMuted}>Thickness</span>
                <span className={uiTheme.textMuted}>{Math.round(state.currentLineThickness)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={state.currentLineThickness}
                onInput={(e) => dispatch({ type: 'SET_LINE_THICKNESS_PREVIEW', payload: parseInt((e.target as HTMLInputElement).value) })}
                onChange={(e) => dispatch({ type: 'SET_LINE_THICKNESS', payload: parseInt(e.target.value) })}
                onMouseUp={() => dispatch({ type: 'COMMIT_LINE_THICKNESS' })}
                onTouchEnd={() => dispatch({ type: 'COMMIT_LINE_THICKNESS' })}
                className={cn("w-full h-1 rounded-lg appearance-none cursor-pointer", uiTheme.sliderBg, uiTheme.sliderAccent)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};