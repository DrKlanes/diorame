import { useState, useEffect } from 'react';

// 1300 since v3.26.77: with the 12th preset («Plana») the one-row bar is 1034 px plus the framing pill (≤ 240): 1284 px. At
// 1100 it overflowed both edges at 1180×820 (iPad landscape), with any preset.
const COMPACT_QUERY = '(max-width: 1300px)';

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
