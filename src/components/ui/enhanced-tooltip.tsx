import React, { useState, useRef } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from './utils';

interface EnhancedTooltipProps {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
}

export function EnhancedTooltip({
  children,
  content,
  shortcut,
  side = 'bottom',
  disabled = false
}: EnhancedTooltipProps) {
  const [open, setOpen] = useState(false);
  const pointerTypeRef = useRef<string>('mouse');

  if (disabled) return <>{children}</>;

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root
        open={open}
        onOpenChange={(wantsOpen) => {
          // Suppress tooltip on touch — keyboard shortcuts are irrelevant for touch input
          if (wantsOpen && pointerTypeRef.current === 'touch') return;
          setOpen(wantsOpen);
        }}
      >
        <TooltipPrimitive.Trigger
          asChild
          onPointerDown={(e: React.PointerEvent) => {
            pointerTypeRef.current = e.pointerType;
          }}
          onBlur={() => {
            pointerTypeRef.current = 'mouse'; // Reset so keyboard Tab after touch works correctly
          }}
        >
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={8}
            className={cn(
              "z-50 overflow-hidden rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-md",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2",
              "data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2",
              "data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{content}</span>
              {shortcut && (
                <kbd className="inline-flex items-center gap-0.5 rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white">
                  {shortcut}
                </kbd>
              )}
            </div>
            <TooltipPrimitive.Arrow className="fill-slate-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
