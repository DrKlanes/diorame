import { useState, useEffect } from 'react';

const COMPACT_QUERY = '(max-width: 1100px)';

/**
 * True when the CINEMA camera bar stacks in two rows. Single source for the bar itself and for the
 * panels that size themselves above it (utils/panelLayout.ts).
 */
export function useIsCameraBarCompact(): boolean {
	const [isCompact, setIsCompact] = useState<boolean>(() => window.matchMedia(COMPACT_QUERY).matches);

	useEffect(() => {
		const mq = window.matchMedia(COMPACT_QUERY);
		const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsCompact(e.matches);
		handler(mq);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	}, []);

	return isCompact;
}
