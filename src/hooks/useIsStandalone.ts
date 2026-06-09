import { useState, useEffect } from 'react';

/**
 * Returns true when the app runs as an installed PWA in standalone display mode.
 * Combines the standard `(display-mode: standalone)` media query (iOS 16.4+, Android,
 * desktop) with the legacy `navigator.standalone` flag (older iOS Safari). Reactive via
 * matchMedia, mirroring useIsMobile. SSR-safe.
 */
export function useIsStandalone(): boolean {
	const read = (): boolean => {
		if (typeof window === 'undefined') return false;
		const mq = window.matchMedia('(display-mode: standalone)').matches;
		const legacy = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
		return mq || legacy;
	};

	const [isStandalone, setIsStandalone] = useState<boolean>(read);

	useEffect(() => {
		const mql = window.matchMedia('(display-mode: standalone)');
		const onChange = () => setIsStandalone(read());
		mql.addEventListener('change', onChange);
		setIsStandalone(read());
		return () => mql.removeEventListener('change', onChange);
	}, []);

	return isStandalone;
}
