import React from 'react';
import { StrataProvider, useStrata } from './components/strata/StrataContext';
import { StrataCanvas } from './components/strata/StrataCanvas';
import { Controls } from './components/strata/Controls';
import { useIsMobile } from './hooks/useIsMobile';
import { useLoadExampleScene } from './hooks/useLoadExampleScene';
import { MobileBlockScreenV2, ExportProgressV2, WelcomeModalV2 } from './components/strata/modals';
import { ToastProvider } from './components/ui/toast-provider';
import { PreviewPage } from './preview/PreviewPage';

function AppContent() {
  const { state, dispatch } = useStrata();
  const loadExampleScene = useLoadExampleScene();
  const handleLoadExample = async () => {
    await loadExampleScene();
    dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
  };
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden font-manrope select-none transition-colors duration-200 bg-slate-50 text-[#353535]">
      {/* Global interaction lock */}
      <style dangerouslySetInnerHTML={{__html: `
          * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      `}} />

      <StrataCanvas />
      <Controls />
      <WelcomeModalV2
        open={state.isWelcomeModalOpen}
        onClose={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
        onLoadExample={handleLoadExample}
        dark={state.isDarkMode}
      />
      <ExportProgressV2
        open={state.isExporting}
        exportType={state.exportRequest === 'none' || state.exportRequest === 'webm' ? 'png' : state.exportRequest}
        dark={state.isDarkMode}
      />
    </div>
  );
}

export default function App() {
  // Preview mode: dev only, activated via ?preview=true
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'true') {
    return <PreviewPage />;
  }

  const isMobile = useIsMobile();

  // If mobile, show only the block screen (no app initialization)
  if (isMobile) {
    return <MobileBlockScreenV2 />;
  }

  // If tablet/desktop, render the full app
  return (
    <StrataProvider>
      <ToastProvider />
      <AppContent />
    </StrataProvider>
  );
}