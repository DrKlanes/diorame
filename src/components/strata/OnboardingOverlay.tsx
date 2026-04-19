import React, { useState, useEffect } from 'react';
import { useStrata } from './StrataContext';
import { Droplet, Paintbrush, Layers, Video, Wand2, Aperture } from 'lucide-react';

const ONBOARDING_SEEN_KEY = 'diorame-onboarding-seen';

export const OnboardingOverlay = () => {
  const { state, dispatch } = useStrata();
  const [isClosing, setIsClosing] = useState(false);

  // Check if onboarding has been seen before
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_SEEN_KEY);
    if (hasSeenOnboarding === 'true' && state.isOnboardingVisible) {
      dispatch({ type: 'DISMISS_ONBOARDING' });
    }
  }, [dispatch, state.isOnboardingVisible]);

  // Only show if welcome modal is closed AND onboarding is visible AND canvas is empty AND in drawing mode
  const shouldShow = !state.isWelcomeModalOpen && state.isOnboardingVisible && state.shapes.length === 0 && state.mode === 'drawing';

  const onLoadExampleScene = () => {};

  const handleDismiss = () => {
    setIsClosing(true);
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    setTimeout(() => {
      dispatch({ type: 'DISMISS_ONBOARDING' });
      setIsClosing(false);
    }, 300); // Match fade out duration
  };

  if (!shouldShow) return null;

  return (
    <div 
      className={`absolute inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="w-full max-w-[550px] px-6 py-8 flex flex-col items-center text-center pointer-events-auto">
        
        {/* Intro Section */}
        <div className="mb-8">
          <h1 
            className="text-4xl mb-3 leading-none"
            style={{ color: '#353535', fontWeight: 678, letterSpacing: '-0.03em' }}
          >
            Welcome to Diorame
          </h1>
          <p 
            className="text-base leading-relaxed"
            style={{ color: '#666666', fontWeight: 398 }}
          >
            Draw in 2D. Watch it come alive in 3D.
          </p>
        </div>

        {/* DRAW Section */}
        <div className="mb-8 w-full">
          <div 
            className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-bold tracking-wider uppercase"
            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
          >
            DRAW
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4 px-4">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Droplet className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Blob</span>
                <span className="text-xs text-slate-500">Organic filled shapes</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Paintbrush className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Brush</span>
                <span className="text-xs text-slate-500">Expressive strokes</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Layers className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Layers</span>
                <span className="text-xs text-slate-500">Automatic 3D depth</span>
              </div>
            </div>
          </div>
          
          <p 
            className="text-xs leading-relaxed"
            style={{ color: '#666666', fontWeight: 398 }}
          >
            Plus: Erase, Move, Symmetry, Draw Inside, and more.
          </p>
        </div>

        {/* Separator */}
        <div className="w-12 h-[1px] bg-slate-200 mb-8 mx-auto" />

        {/* VIEW Section */}
        <div className="mb-10 w-full">
          <div 
            className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-bold tracking-wider uppercase"
            style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
          >
            VIEW
          </div>
          
          <div className="grid grid-cols-3 gap-4 px-4">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Video className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Motion</span>
                <span className="text-xs text-slate-500">Cinematic camera presets</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Wand2 className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Effects</span>
                <span className="text-xs text-slate-500">Cinematic & creative effects</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                <Aperture className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700">Depth</span>
                <span className="text-xs text-slate-500">Automatic parallax</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onLoadExampleScene()}
          className="mb-3 px-8 py-3 rounded-full text-sm font-bold tracking-wide uppercase transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white/60"
        >
          Load example scene
        </button>
        <button
          onClick={handleDismiss}
          className="px-8 py-3 rounded-full text-sm font-bold tracking-wide uppercase transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
          style={{ 
            backgroundColor: '#9a0ff9', 
            color: '#ffffff',
          }}
        >
          Start drawing
        </button>
      </div>
    </div>
  );
};
