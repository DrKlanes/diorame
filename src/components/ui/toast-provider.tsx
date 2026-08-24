import { Toaster } from 'sonner@2.0.3';
import { useStrata } from '../strata/StrataContext';
import { T, dk } from '../../design-system/tokens';

export function ToastProvider() {
	const { state } = useStrata();
	const dark = state.isDarkMode;

	return (
		<Toaster
			position="top-right"
			theme={dark ? 'dark' : 'light'}
			closeButton
			style={{
				// Prevent the toaster's container <section> from blocking pointer events
				// to underlying UI (mode switcher, canvas, etc.). Individual toasts
				// re-enable pointer-events via toastOptions below.
				pointerEvents: 'none',
			}}
			toastOptions={{
				style: {
					background:   dk(dark, T.white, T.panelDarkOpaque) as string,
					color:        dk(dark, T.dark, T.textDark) as string,
					border:       `1px solid ${dk(dark, T.border, T.borderDark)}`,
					borderRadius: '1rem',
					fontSize:     '0.875rem',
					fontFamily:   'Manrope, sans-serif',
					// Re-enable pointer events on individual toasts (for close button, hover)
					pointerEvents: 'auto',
				},
				className: 'toast',
				duration: 2000,
			}}
		/>
	);
}
