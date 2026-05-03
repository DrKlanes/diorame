import React from 'react';
import { StrataProvider } from './components/strata/StrataContext';
import { StrataCanvas } from './components/strata/StrataCanvas';
import { Controls } from './components/strata/Controls';
import { WelcomeModal } from './components/strata/WelcomeModal';
import { MobileBlockScreen, useIsMobile } from './components/strata/MobileBlockScreen';
import { ToastProvider } from './components/ui/toast-provider';
import { ExportProgress } from './components/strata/ExportProgress';
import { PreviewPage } from './preview/PreviewPage';

function AppContent() {
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden font-manrope select-none transition-colors duration-200 bg-slate-50 text-[#353535]">
      {/* Global interaction lock */}
      <style dangerouslySetInnerHTML={{__html: `
          * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      `}} />
      
      <StrataCanvas />
      <Controls />
      <WelcomeModal />
      <ExportProgress />
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
    return <MobileBlockScreen />;
  }

  // If tablet/desktop, render the full app
  return (
    <StrataProvider>
      <ToastProvider />
      <AppContent />
    </StrataProvider>
  );
}