import { useState, useEffect } from 'react';

/**
 * Returns true when the viewport is narrower than 768px.
 * Uses matchMedia for efficient resize detection (fires only at breakpoint,
 * not on every resize event). SSR-safe: initial state derived from window.innerWidth.
 */
export function useIsMobile(): boolean {
	const BREAKPOINT = 768;

	const [isMobile, setIsMobile] = useState<boolean>(
		() => typeof window !== 'undefined' && window.innerWidth < BREAKPOINT
	);

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
		const onChange = () => setIsMobile(window.innerWidth < BREAKPOINT);
		mql.addEventListener('change', onChange);
		// Sync once immediately in case mount state drifted
		setIsMobile(window.innerWidth < BREAKPOINT);
		return () => mql.removeEventListener('change', onChange);
	}, []);

	return isMobile;
}
