import React from 'react';
import { StrataProvider } from './components/strata/StrataContext';
import { StrataCanvas } from './components/strata/StrataCanvas';
import { Controls } from './components/strata/Controls';
import { WelcomeModal } from './components/strata/WelcomeModal';
import { MobileBlockScreen, useIsMobile } from './components/strata/MobileBlockScreen';
import { ToastProvider } from './components/ui/toast-provider';
import { ExportProgress } from './components/strata/ExportProgress';

function AppContent() {
  return (
    <div className="relative w-full h-[100dvh] overflow-hidden font-manrope select-none transition-colors duration-200 bg-slate-50 text-[#353535]">
      {/* Font Injection */}
      <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap');
          .font-manrope { font-family: 'Manrope', sans-serif; }
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