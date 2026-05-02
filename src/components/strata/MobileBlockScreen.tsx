import React, { useState, useEffect } from 'react';
import { Monitor, Tablet } from 'lucide-react';
import logoImg from "figma:asset/41cbeec613d6de6fbe96a0b93ab21aceb0db707d.png";

export const MobileBlockScreen = () => {
  return (
    <div className="w-full h-[100dvh] bg-slate-50 flex items-center justify-center font-manrope">
      <div
        className="relative bg-white w-[90%] max-w-[420px] p-8 flex flex-col items-center text-center shadow-2xl"
        style={{ borderRadius: '2rem' }}
      >
        {/* Logo Image */}
        <div className="mb-6 w-full flex justify-center">
             <img 
                src={logoImg} 
                alt="Diorame Logo" 
                className="w-full max-w-[280px] h-auto object-contain"
             />
        </div>

        {/* Title */}
        <h1 
            className="text-6xl mb-4 relative leading-none"
            style={{ color: '#353535', fontWeight: 678, letterSpacing: '-0.05em' }}
        >
            diorame<span className="text-xl align-top ml-1 font-normal absolute top-1">tm</span>
        </h1>

        {/* Device Icons */}
        <div className="flex gap-4 mb-6 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-slate-100 rounded-2xl">
              <Tablet className="w-8 h-8 text-[#9a0ff9]" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Tablet</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-slate-100 rounded-2xl">
              <Monitor className="w-8 h-8 text-[#9a0ff9]" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Desktop</span>
          </div>
        </div>

        {/* Message */}
        <p 
            className="text-base leading-relaxed max-w-[320px] mb-2"
            style={{ color: '#666666', fontWeight: 398 }}
        >
            <strong style={{ color: '#353535', fontWeight: 600 }}>Diorame</strong> is designed for tablet and desktop devices.
        </p>

        <p 
            className="text-sm leading-relaxed max-w-[320px] mb-6"
            style={{ color: '#888888', fontWeight: 398 }}
        >
            For the best creative experience, please use a tablet with a stylus or a desktop computer.
        </p>

        {/* Hint */}
        <div className="text-xs text-slate-400 mt-4 max-w-[280px]">
          Open this page on a larger screen to start creating
        </div>
      </div>
    </div>
  );
};

// Hook to detect if device is mobile
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial check on mount
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Re-check on resize
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  return isMobile;
};