import React, { useState } from 'react';
import { X } from 'lucide-react';
import logoImg from "figma:asset/41cbeec613d6de6fbe96a0b93ab21aceb0db707d.png";
import { useStrata, APP_VERSION } from './StrataContext';
import { toast } from 'sonner@2.0.3';

export const WelcomeModal = () => {
  const { state, dispatch } = useStrata();
  const [isClosing, setIsClosing] = useState(false);
  const [isLoadingExample, setIsLoadingExample] = useState(false);

  const onLoadExampleScene = async () => {
    setIsLoadingExample(true);
    try {
      const res = await fetch('/examples/diorame_onboarding.dior');
      if (!res.ok) throw new Error('Could not fetch example file');
      const text = await res.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Invalid project format');
      if (!Array.isArray(json.shapes)) throw new Error('Missing or invalid shapes data');
      dispatch({ type: 'LOAD_PROJECT', payload: json });
      handleClose();
    } catch (err) {
      console.error('Failed to load example scene', err);
      toast.error('Failed to load example', {
        description: err instanceof Error ? err.message : 'Please check your connection',
        duration: 3000,
      });
      setIsLoadingExample(false);
    }
  };

  // Close handler
  const handleClose = (e?: React.MouseEvent) => {
    // Prevent multiple triggers (e.g. double clicks or event bubbling)
    if (isClosing) return;
    
    // Stop propagation if event is provided (especially for the X button)
    if (e) e.stopPropagation();

    setIsClosing(true);
    setTimeout(() => {
        dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
        setIsClosing(false); // Reset for next open
    }, 300); // Wait for fade out animation
  };

  if (!state.isWelcomeModalOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={(e) => handleClose(e)}
    >
      <div 
        className={`relative bg-white w-[90%] max-w-[420px] p-8 flex flex-col items-center text-center shadow-2xl transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ borderRadius: '2rem' }}
        // onClick={(e) => e.stopPropagation()} // Removed so clicking inside also closes it, per "touch anywhere" instruction
      >
        {/* Close Button */}
        <button 
          onClick={(e) => handleClose(e)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-all duration-200 text-slate-400 hover:text-slate-600 hover:scale-110 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

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
        
        {/* Version Badge */}
        <div className="mb-6 px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500 border border-slate-200">
            v{APP_VERSION}
        </div>

        {/* Description */}
        <p 
            className="text-base leading-relaxed max-w-[320px]"
            style={{ color: '#666666', fontWeight: 398 }}
        >
            Draw in 2D. Explore in 3D. Layer your illustration, add cinematic depth, and watch it come alive — right in your browser, completely free.
        </p>

        <a 
             href="https://apps.apple.com/es/app/graintouch/id6740813845"
             target="_blank"
             rel="noopener noreferrer"
             className="text-sm mt-4 text-[rgb(175,188,210)] hover:text-slate-600 transition-colors block"
             onClick={(e) => e.stopPropagation()}
        >
             Inspired by Graintoch, by iorama studio
        </a>

        {/* Click anywhere hint (optional, but good for UX given the "click anywhere" requirement) */}
        <a 
            href="https://www.instagram.com/dumaker/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 text-xs text-[rgb(144,161,185)] font-medium tracking-wide uppercase hover:text-slate-500 transition-colors cursor-pointer block"
            onClick={(e) => e.stopPropagation()}
        >
            by @dumaker 
        </a>

        <a 
            href="https://ko-fi.com/dumaker"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 px-4 py-2 bg-purple-600 rounded-full text-xs text-white font-medium tracking-wide uppercase hover:bg-purple-700 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm w-full"
            onClick={(e) => e.stopPropagation()}
        >
            <span>🤍</span> Support on Ko-fi
        </a>

        <button
          onClick={(e) => { e.stopPropagation(); onLoadExampleScene(); }}
          disabled={isLoadingExample}
          className="mt-3 px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase transition-all duration-200 border border-slate-300 text-slate-700 bg-transparent hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed w-full"
        >
          {isLoadingExample ? 'Loading...' : 'Load example scene'}
        </button>

        <a
          href="https://www.youtube.com/watch?v=Ieb280ncEfA"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase transition-all duration-200 border border-slate-300 text-slate-700 bg-transparent hover:bg-slate-50 hover:border-slate-400 w-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          Watch tutorial
        </a>
      </div>
    </div>
  );
};