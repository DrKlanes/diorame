import { Toaster } from 'sonner@2.0.3';

export function ToastProvider() {
  return (
    <Toaster 
      position="top-center"
      toastOptions={{
        style: {
          background: 'white',
          color: '#353535',
          border: '1px solid rgb(226 232 240)',
          borderRadius: '1rem',
          fontSize: '0.875rem',
          fontFamily: 'Manrope, sans-serif',
        },
        className: 'toast',
        duration: 2000,
      }}
    />
  );
}
