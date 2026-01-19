import React, { useState, useRef, useEffect } from 'react';
import { useStrata, BASE_DEPTH_STEP } from './StrataContext';
import { Button } from '../ui/button';
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, GripVertical } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { cn } from '../ui/utils';

interface LayerItemProps {
  layerIndex: number;
  isActive: boolean;
  isHidden: boolean;
  isLocked: boolean;
  hasShapes: boolean;
  onSelect: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  canDelete: boolean;
  canDuplicate: boolean;
  isDragging: boolean;
  dragOverIndex: number | null;
  theme: any;
  duplicateTooltip: string;
  // Touch drag props
  isTouchDevice: boolean;
  onTouchDragStart: (index: number, y: number) => void;
  onTouchDragMove: (y: number) => void;
  onTouchDragEnd: () => void;
  isTouchDraggingThis: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layerIndex,
  isActive,
  isHidden,
  isLocked,
  hasShapes,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDuplicate,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  canDelete,
  canDuplicate,
  isDragging,
  dragOverIndex,
  theme,
  duplicateTooltip,
  isTouchDevice,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  isTouchDraggingThis
}) => {
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartYRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return;
    
    const touch = e.touches[0];
    touchStartYRef.current = touch.clientY;
    hasDraggedRef.current = false;

    // Long press to activate drag mode (500ms)
    const timer = setTimeout(() => {
      onTouchDragStart(layerIndex, touch.clientY);
      hasDraggedRef.current = true;
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
    
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isTouchDevice) return;
    
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
    
    // If moved significantly, cancel long press timer
    if (deltaY > 10 && longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // If already dragging, update position
    if (isTouchDraggingThis) {
      e.preventDefault();
      onTouchDragMove(touch.clientY);
      hasDraggedRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isTouchDraggingThis) {
      onTouchDragEnd();
    } else if (!hasDraggedRef.current) {
      // Simple tap without drag - toggle actions visibility
      setShowActions(!showActions);
    }
    
    hasDraggedRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    // On desktop, just select the layer
    if (!isTouchDevice) {
      onSelect();
    }
    // On touch, handled by touch events
  };

  // Auto-hide actions after 3 seconds on touch devices
  useEffect(() => {
    if (!isTouchDevice || !showActions) return;
    
    const timer = setTimeout(() => {
      setShowActions(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [showActions, isTouchDevice]);

  return (
    <div
      className={cn(
        "relative group",
        dragOverIndex === layerIndex && "border-t-2 border-blue-500"
      )}
    >
      <div
        draggable={!isTouchDevice}
        onDragStart={() => !isTouchDevice && onDragStart(layerIndex)}
        onDragOver={(e) => !isTouchDevice && onDragOver(e, layerIndex)}
        onDrop={() => !isTouchDevice && onDrop(layerIndex)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all select-none",
          isTouchDevice ? "cursor-default touch-manipulation active:scale-98" : "cursor-pointer",
          isActive ? theme.bgActive : theme.bg,
          isActive ? theme.borderActive : "border border-transparent",
          !isActive && !isTouchDevice && theme.hover,
          isDragging && "opacity-50",
          isTouchDraggingThis && "scale-105 shadow-2xl z-50 bg-blue-100 border-2 border-blue-400"
        )}
      >
        {/* Drag Handle */}
        <GripVertical 
          className={cn(
            "w-4 h-4",
            isTouchDevice ? "text-slate-400" : "cursor-grab active:cursor-grabbing",
            theme.textMuted,
            isTouchDraggingThis && "text-blue-600"
          )} 
        />

        {/* Layer Number */}
        <div className={cn(
          "flex-1 text-xs font-semibold",
          isActive ? theme.text : theme.textMuted
        )}>
          Layer {layerIndex + 1}
          {!hasShapes && <span className={cn("ml-1 text-[10px]", theme.textMuted)}>(empty)</span>}
        </div>

        {/* Actions - Always visible on touch when showActions is true, or on hover for desktop */}
        <div className={cn(
          "flex items-center gap-1 transition-opacity",
          isTouchDevice 
            ? (showActions || isActive ? "opacity-100" : "opacity-0")
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
              setShowActions(false);
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

          {/* 3D Lock (for any layer) */}
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
              setShowActions(false);
            }}
            disabled={!canDelete}
            className="h-7 w-7 sm:h-6 sm:w-6 rounded disabled:opacity-50 touch-manipulation active:scale-95"
            title="Delete Layer"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-slate-700 hover:text-red-500" />
          </Button>
        </div>
      </div>
      
      {/* Touch drag hint overlay */}
      {isTouchDevice && isTouchDraggingThis && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 rounded-lg pointer-events-none">
          <span className="text-xs font-bold text-blue-600 bg-white/90 px-2 py-1 rounded shadow">
            Drag to reorder
          </span>
        </div>
      )}
    </div>
  );
};

export const LayersPanel: React.FC = () => {
  const { state, dispatch } = useStrata();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Touch drag state
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const [touchDragY, setTouchDragY] = useState(0);
  const [touchDragStartY, setTouchDragStartY] = useState(0);
  const layerItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

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

  const handleDragStart = (index: number) => {
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (toIndex: number) => {
    if (draggingIndex === null || draggingIndex === toIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Dispatch reorder action
    dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: draggingIndex, toIndex } });
    
    toast.success(`Layer ${draggingIndex + 1} moved to position ${toIndex + 1}`, {
      duration: 1500,
    });

    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  // Touch drag handlers
  const handleTouchDragStart = (index: number, y: number) => {
    setTouchDragIndex(index);
    setTouchDragStartY(y);
    setTouchDragY(y);
  };

  const handleTouchDragMove = (y: number) => {
    setTouchDragY(y);
    
    // Calculate which layer we're over based on Y position
    const layers = Array.from({ length: state.totalLayers }, (_, i) => state.totalLayers - 1 - i);
    const delta = y - touchDragStartY;
    const itemHeight = 44; // Approximate height of each layer item
    const positionChange = Math.round(delta / itemHeight);
    
    if (touchDragIndex !== null) {
      const currentPos = layers.indexOf(touchDragIndex);
      const newPos = Math.max(0, Math.min(layers.length - 1, currentPos + positionChange));
      setDragOverIndex(layers[newPos]);
    }
  };

  const handleTouchDragEnd = () => {
    if (touchDragIndex !== null && dragOverIndex !== null && touchDragIndex !== dragOverIndex) {
      dispatch({ type: 'REORDER_LAYERS', payload: { fromIndex: touchDragIndex, toIndex: dragOverIndex } });
      toast.success(`Layer ${touchDragIndex + 1} moved to position ${dragOverIndex + 1}`, {
        duration: 1500,
      });
    }
    
    setTouchDragIndex(null);
    setDragOverIndex(null);
    setTouchDragY(0);
    setTouchDragStartY(0);
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

  // Build layer array (reverse order: top layer first in UI)
  const layers = Array.from({ length: state.totalLayers }, (_, i) => state.totalLayers - 1 - i);

  return (
    <div className={cn(
      "w-56 max-h-[400px] overflow-y-auto rounded-lg shadow-lg border backdrop-blur-sm p-2 space-y-1",
      uiTheme.bg,
      uiTheme.border
    )}>
      <div className={cn("px-2 py-1 text-[10px] uppercase font-bold tracking-wider", uiTheme.textMuted)}>
        Layers ({state.totalLayers}/10)
      </div>
      
      {isTouchDevice && (
        <div className={cn("px-2 py-1 text-[9px] italic", uiTheme.textMuted)}>
          Tap to show controls • Hold to reorder
        </div>
      )}
      
      {layers.map((layerIndex) => {
        const layerZ = getActiveZ(layerIndex);
        const hasShapes = state.shapes.some(s => s.zIndex === layerZ);
        
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
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDuplicate={() => handleDuplicate(layerIndex)}
            onToggleVisibility={() => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', payload: layerIndex })}
            onToggleLock={() => dispatch({ type: 'TOGGLE_3D_LOCK', payload: layerIndex })}
            onDelete={() => handleDelete(layerIndex)}
            canDelete={state.totalLayers > 1}
            canDuplicate={state.totalLayers < 10 && hasShapes}
            duplicateTooltip={duplicateTooltip}
            isDragging={draggingIndex === layerIndex}
            dragOverIndex={dragOverIndex}
            theme={uiTheme}
            isTouchDevice={isTouchDevice}
            onTouchDragStart={handleTouchDragStart}
            onTouchDragMove={handleTouchDragMove}
            onTouchDragEnd={handleTouchDragEnd}
            isTouchDraggingThis={touchDragIndex === layerIndex}
          />
        );
      })}
    </div>
  );
};
