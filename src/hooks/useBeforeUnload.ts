import { useEffect } from 'react';
import { useStrata } from '../components/strata/StrataContext';

export function useBeforeUnload() {
	const { state } = useStrata();

	useEffect(() => {
		if (!state.isDirty) return;

		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};

		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [state.isDirty]);
}
