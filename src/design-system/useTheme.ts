import { useStrata } from '../components/strata/StrataContext';

/**
 * Thin hook that exposes the current dark-mode flag from StrataContext.
 * Used in conjunction with dk() for conditional styling in new components.
 *
 * Usage:
 *   const { dark } = useTheme();
 *   style={{ color: dk(dark, T.dark, T.textDark) }}
 */
export function useTheme() {
	const { state } = useStrata();
	return { dark: state.isDarkMode };
}
