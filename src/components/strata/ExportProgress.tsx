import React, { useEffect, useState } from 'react';
import { useStrata } from './StrataContext';
import { Video, Camera, FileCode, Loader2 } from 'lucide-react';

export function ExportProgress() {
  const { state } = useStrata();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (state.isExporting) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          // Smooth progress animation
          if (prev < 90) return prev + 2;
          return prev;
        });
      }, 50);
      
      return () => clearInterval(interval);
    } else {
      // Quick completion animation
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timeout);
    }
  }, [state.isExporting]);

  if (!state.isExporting && progress === 0) return null;

  const getIcon = () => {
    switch (state.exportRequest) {
      case 'mp4': return <Video className="w-4 h-4" />;
      case 'png': return <Camera className="w-4 h-4" />;
      case 'svg': return <FileCode className="w-4 h-4" />;
      default: return <Loader2 className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (state.exportRequest) {
      case 'mp4': return 'Rendering animation...';
      case 'png': return 'Capturing snapshot...';
      case 'svg': return 'Exporting vector...';
      default: return 'Exporting...';
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 p-4 min-w-[280px]">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-[#9a0ff9] animate-pulse">
            {getIcon()}
          </div>
          <span className="text-sm font-medium text-slate-700">{getLabel()}</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#9a0ff9] to-[#7a0fc9] rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {state.exportRequest === 'mp4' && (
          <div className="mt-2 text-xs text-slate-500 text-center">
            This may take a few seconds
          </div>
        )}
      </div>
    </div>
  );
}
