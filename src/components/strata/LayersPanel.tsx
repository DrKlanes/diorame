import React, { useState, useEffect, useCallback } from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { Button } from '../ui/button';
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { cn } from '../ui/utils';

interface LayerItemProps {
  layerIndex: number;
  isActive: boolean;
  isHidden: boolean;
  isLocked: boolean;
  hasShapes: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canDelete: boolean;
  canDuplicate: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  theme: any;
  duplicateTooltip: string;
  isTouchDevice: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layerIndex,
  isActive,
  isHidden,
  isLocked,
  hasShapes,
  onSelect,
  onDuplicate,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onMoveUp,
  onMoveDown,
  canDelete,
  canDuplicate,
  canMoveUp,
  canMoveDown,
  theme,
  duplicateTooltip,
  isTouchDevice,
  isExpanded,
  onToggleExpand
}) => {
  const handleClick = () => {
    onSelect();
    if (isTouchDevice) {
      onToggleExpand();
    }
  };

  // Determine if actions should be visible:
  // - Active layer: always visible
  // - Touch device: visible when expanded (tapped)
  // - Desktop: visible on hover (handled via CSS group-hover)
  const actionsAlwaysVisible = isActive || (isTouchDevice && isExpanded);

  return (
    <div className="relative group">
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all select-none",
          isTouchDevice ? "cursor-default touch-manipulation active:scale-98" : "cursor-pointer",
          isActive ? theme.bgActive : theme.bg,
          isActive ? theme.borderActive : "border border-transparent",
          !isActive && !isTouchDevice && theme.hover
        )}
      >
        {/* Move Up/Down Buttons */}
        <div className="flex flex-col gap-0.5 mr-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="h-5 w-5 p-0 rounded disabled:opacity-20 touch-manipulation active:scale-95 hover:bg-blue-100 transition-colors"
            title="Move Layer Up"
          >
            <ChevronUp className={cn(
              "w-3.5 h-3.5",
              canMoveUp ? "text-slate-700" : "text-slate-300"
            )} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="h-5 w-5 p-0 rounded disabled:opacity-20 touch-manipulation active:scale-95 hover:bg-blue-100 transition-colors"
            title="Move Layer Down"
          >
            <ChevronDown className={cn(
              "w-3.5 h-3.5",
              canMoveDown ? "text-slate-700" : "text-slate-300"
            )} />
          </Button>
        </div>

        {/* Layer Number */}
        <div className={cn(
          "flex-1 text-xs font-semibold",
          isActive ? theme.text : theme.textMuted
        )}>
          Layer {layerIndex + 1}
          {!hasShapes && <span className={cn("ml-1 text-[10px]", theme.textMuted)}>(empty)</span>}
        </div>

        {/* Actions - Always visible for active layer, hover on desktop, expanded on touch */}
        <div className={cn(
          "flex items-center gap-1 transition-opacity duration-150",
          actionsAlwaysVisible
            ? "opacity-100"
            : isTouchDevice
              ? "opacity-0 pointer-events-none"
              : "opacity-0 group-hover:opacity-100"
        )}>
          {/* Duplicate */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (!canDuplicate) return;
              onDuplicate();
            }}
            disabled={!canDuplicate}
            className={cn(
              "h-7 w-7 sm:h-6 sm:w-6 rounded disabled:opacity-50 touch-manipulation active:scale-95"
            )}
            title={duplicateTooltip}
          >
            <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-700" />
          </Button>

          {/* Visibility */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            className="h-7 w-7 sm:h-6 sm:w-6 rounded touch-manipulation active:scale-95"
            title={isHidden ? "Show Layer" : "Hide Layer"}
          >
            {isHidden ? (
              <EyeOff className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-700" />
            )}
          </Button>

          {/* 3D Lock */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            className="h-7 w-7 sm:h-6 sm:w-6 rounded touch-manipulation active:scale-95"
            title={isLocked ? "Unlock 3D (Enable Parallax)" : "Lock 3D (Disable Parallax)"}
          >
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-amber-600" />
            ) : (
              <Unlock className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-700" />
            )}
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={!canDelete}
            className="h-7 w-7 sm:h-6 sm:w-6 rounded disabled:opacity-50 touch-manipulation active:scale-95"
            title="Delete Layer"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-700 hover:text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const LayersPanel: React.FC = () => {
  const { state, dispatch } = useStrata();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  // Track which layer has its actions expanded (for touch devices)
  const [expandedLayerIndex, setExpandedLayerIndex] = useState<number | null>(null);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Auto-expand active layer's actions on touch, collapse when switching
  useEffect(() => {
    if (isTouchDevice) {
      setExpandedLayerIndex(state.currentLayerIndex);
    }
  }, [state.currentLayerIndex, isTouchDevice]);

  // UI Theme - Light Mode (Single Source of Truth)
  const uiTheme = {
    bg: 'bg-white/90',
    bgActive: 'bg-blue-50',
    bgAlt: 'bg-slate-50/90',
    border: 'border-slate-200',
    borderActive: 'border-blue-400',
    text: 'text-slate-900',
    textMuted: 'text-slate-500',
    hover: 'hover:bg-slate-100',
    iconColor: 'text-slate-700',
    divider: 'bg-slate-200'
  };

  const getActiveZ = (layerIndex: number) => layerIndex * -BASE_DEPTH_STEP;

  const handleMoveUp = (layerIndex: number) => {
    // In UI, layers are displayed top-to-bottom (high index to low)
    // Moving "up" in UI means increasing the layer index
    const layers = Array.from({ length: state.totalLayers }, (_, i) => state.totalLayers - 1 - i);
    const currentPos = layers.indexOf(layerIndex);
    
    if (currentPos === 0) return; // Already at top
    
    const toIndex = layers[currentPos - 1];
    
    dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: layerIndex, toIndex } });
    
    toast.success(`Layer ${layerIndex + 1} moved up`, {
      duration: 1500,
    });
  };

  const handleMoveDown = (layerIndex: number) => {
    // In UI, layers are displayed top-to-bottom (high index to low)
    // Moving "down" in UI means decreasing the layer index
    const layers = Array.from({ length: state.totalLayers }, (_, i) => state.totalLayers - 1 - i);
    const currentPos = layers.indexOf(layerIndex);
    
    if (currentPos === layers.length - 1) return; // Already at bottom
    
    const toIndex = layers[currentPos + 1];
    
    dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: layerIndex, toIndex } });
    
    toast.success(`Layer ${layerIndex + 1} moved down`, {
      duration: 1500,
    });
  };

  const handleDuplicate = (layerIndex: number) => {
    if (state.totalLayers >= 10) {
      toast.error('Maximum 10 layers reached', {
        description: 'Cannot duplicate more layers',
        duration: 2000,
      });
      return;
    }

    // Check if layer is empty
    const layerZ = getActiveZ(layerIndex);
    const hasShapes = state.shapes.some(s => s.zIndex === layerZ);
    
    if (!hasShapes) {
      toast.error('Cannot duplicate empty layer', {
        description: 'Draw something first',
        duration: 2000,
      });
      return;
    }

    dispatch({ type: 'DUPLICATE_LAYER', payload: layerIndex });
    
    toast.success(`Layer ${layerIndex + 1} duplicated`, {
      duration: 1500,
    });
  };

  const handleSelectLayer = (index: number) => {
    if (index < state.currentLayerIndex) {
      for (let i = 0; i < state.currentLayerIndex - index; i++) {
        dispatch({ type: 'PREV_LAYER' });
      }
    } else if (index > state.currentLayerIndex) {
      for (let i = 0; i < index - state.currentLayerIndex; i++) {
        dispatch({ type: 'NEXT_LAYER' });
      }
    }
  };

  const handleDelete = (layerIndex: number) => {
    if (state.totalLayers <= 1) return;
    
    // Select the layer first
    handleSelectLayer(layerIndex);
    
    // Then delete it
    setTimeout(() => {
      dispatch({ type: 'DELETE_CURRENT_LAYER' });
      toast.success(`Layer ${layerIndex + 1} deleted`, {
        duration: 1500,
      });
    }, 50);
  };

  const handleToggleExpand = useCallback((layerIndex: number) => {
    setExpandedLayerIndex(prev => prev === layerIndex ? null : layerIndex);
  }, []);

  // Build layer array (reverse order: top layer first in UI)
  const layers = Array.from({ length: state.totalLayers }, (_, i) => state.totalLayers - 1 - i);

  return (
    <div className={cn(
      "w-64 max-h-[400px] overflow-y-auto overflow-x-hidden rounded-lg shadow-lg border backdrop-blur-sm p-2 space-y-1",
      uiTheme.bg,
      uiTheme.border
    )}>
      <div className={cn("px-2 py-1 text-[10px] uppercase font-bold tracking-wider", uiTheme.textMuted)}>
        Layers ({state.totalLayers}/10)
      </div>
      
      {layers.map((layerIndex) => {
        const layerZ = getActiveZ(layerIndex);
        const hasShapes = state.shapes.some(s => s.zIndex === layerZ);
        const currentPos = layers.indexOf(layerIndex);
        
        // Determine duplicate tooltip
        let duplicateTooltip = "Duplicate Layer";
        if (!hasShapes) {
          duplicateTooltip = "Cannot duplicate empty layer";
        } else if (state.totalLayers >= 10) {
          duplicateTooltip = "Maximum 10 layers reached";
        }
        
        return (
          <LayerItem
            key={layerIndex}
            layerIndex={layerIndex}
            isActive={layerIndex === state.currentLayerIndex}
            isHidden={state.hiddenLayers.includes(layerIndex)}
            isLocked={state.locked3DLayers.includes(layerIndex)}
            hasShapes={hasShapes}
            onSelect={() => handleSelectLayer(layerIndex)}
            onDuplicate={() => handleDuplicate(layerIndex)}
            onToggleVisibility={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layerIndex })}
            onToggleLock={() => dispatch({ type: 'TOGGLE_3D_LOCK', payload: layerIndex })}
            onDelete={() => handleDelete(layerIndex)}
            onMoveUp={() => handleMoveUp(layerIndex)}
            onMoveDown={() => handleMoveDown(layerIndex)}
            canDelete={state.totalLayers > 1}
            canDuplicate={state.totalLayers < 10 && hasShapes}
            canMoveUp={currentPos > 0}
            canMoveDown={currentPos < layers.length - 1}
            duplicateTooltip={duplicateTooltip}
            theme={uiTheme}
            isTouchDevice={isTouchDevice}
            isExpanded={expandedLayerIndex === layerIndex}
            onToggleExpand={() => handleToggleExpand(layerIndex)}
          />
        );
      })}
    </div>
  );
};