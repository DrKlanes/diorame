import React, { useState, useEffect } from 'react';
import { get, del } from 'idb-keyval';
import { StrataProvider, useStrata } from './components/strata/StrataContext';
import { StrataCanvas } from './components/strata/StrataCanvas';
import { CompositionGuideOverlay } from './components/strata/viewport/CompositionGuideOverlay';
import { ControlsV2 } from './components/strata/ControlsV2';
import { useIsMobile } from './hooks/useIsMobile';
import { useLoadExampleScene } from './hooks/useLoadExampleScene';
import { MobileBlockScreenV2, ExportProgressV2, WelcomeModalV2 } from './components/strata/modals';
import { ToastProvider } from './components/ui/toast-provider';
import { PreviewPage } from './preview/PreviewPage';
import { useAutoSave, AUTOSAVE_KEY } from './hooks/useAutoSave';
import { initSoundsFromStorage } from './utils/soundManager';

function AppContent() {
  const { state, dispatch } = useStrata();
  const loadExampleScene = useLoadExampleScene();
  const [autosaveData, setAutosaveData] = useState<any>(null);

  // Leer autosave al montar (si existe)
  useEffect(() => {
    get(AUTOSAVE_KEY)
      .then(data => { if (data) setAutosaveData(data); })
      .catch(() => {});
  }, []);

  // Sincronizar preferencia de sonidos desde localStorage al state
  useEffect(() => {
    const enabled = initSoundsFromStorage();
    if (enabled) dispatch({ type: 'SET_SOUNDS_ENABLED', payload: true });
  }, []);

  // Mantener el autosave actualizado cada 30s cuando isDirty
  const { suspendAutosave, resumeAutosave } = useAutoSave();

  const handleLoadExample = async () => {
    handleDismissAutosave();
    await loadExampleScene();
    dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
  };

  const handleRestoreAutosave = () => {
    if (!autosaveData) return;

    // Suspender autosave antes del del() para evitar race condition:
    // un set() in-flight no puede reescribir la clave después del delete.
    suspendAutosave();

    dispatch({ type: 'LOAD_PROJECT', payload: autosaveData });

    del(AUTOSAVE_KEY)
      .then(() => { resumeAutosave(); })
      .catch((err) => {
        console.error('[autosave] del failed:', err);
        resumeAutosave();
      });

    setAutosaveData(null);
    dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
  };

  const handleDismissAutosave = () => {
    if (!autosaveData) return;
    del(AUTOSAVE_KEY).catch(() => {});
    setAutosaveData(null);
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden font-manrope select-none transition-colors duration-200 bg-slate-50 text-[#353535]">
      {/* Global interaction lock */}
      <style dangerouslySetInnerHTML={{__html: `
          * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
      `}} />

      <StrataCanvas />
      <CompositionGuideOverlay />
      <ControlsV2 />
      <WelcomeModalV2
        open={state.isWelcomeModalOpen}
        onClose={() => {
          handleDismissAutosave();
          dispatch({ type: 'TOGGLE_WELCOME_MODAL' });
        }}
        onLoadExample={handleLoadExample}
        onRestoreAutosave={autosaveData ? handleRestoreAutosave : undefined}
        isMidSession={state.shapes.length > 0}
        dark={state.isDarkMode}
      />
      <ExportProgressV2
        open={state.isExporting}
        exportType={state.exportRequest ?? 'png'}
        dark={state.isDarkMode}
      />
    </div>
  );
}

function AppContentWithMobileGate() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileBlockScreenV2 />;
  return <AppContent />;
}

export default function App() {
  // Preview mode: dev only, activated via ?preview=true
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'true') {
    return <PreviewPage />;
  }

  // StrataProvider lives outside the mobile gate so state survives breakpoint crossings.
  return (
    <StrataProvider>
      <ToastProvider />
      <AppContentWithMobileGate />
    </StrataProvider>
  );
}