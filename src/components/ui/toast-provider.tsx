import { Toaster } from 'sonner@2.0.3';

export function ToastProvider() {
  return (
    <Toaster 
      position="top-right"
      pauseWhenPageIsHidden={false}
      closeButton
      style={{
        // Prevent the toaster's container <section> from blocking pointer events
        // to underlying UI (mode switcher, canvas, etc.). Individual toasts
        // re-enable pointer-events via toastOptions below.
        pointerEvents: 'none',
      }}
      toastOptions={{
        style: {
          background: 'white',
          color: '#353535',
          border: '1px solid rgb(226 232 240)',
          borderRadius: '1rem',
          fontSize: '0.875rem',
          fontFamily: 'Manrope, sans-serif',
          // Re-enable pointer events on individual toasts (for close button, hover)
          pointerEvents: 'auto',
        },
        className: 'toast',
        duration: 2000,
      }}
    />
  );
}
