import { toast } from 'sonner@2.0.3';
import { useStrata } from '../components/strata/StrataContext';
import { useTranslation } from '../i18n';

/**
 * Returns an async function that fetches /examples/diorame_onboarding.dior,
 * validates it, and dispatches LOAD_PROJECT to the reducer.
 *
 * On failure: shows a toast.error and re-throws so the caller can react
 * (e.g. keep the modal open, reset loading state).
 *
 * Used by: WelcomeModalV2 (Sub-phase 8.3), OnboardingOverlayV2 (Sub-phase 8.6).
 */
export function useLoadExampleScene(): () => Promise<void> {
	const { dispatch } = useStrata();
	const { t } = useTranslation();

	return async () => {
		try {
			const res = await fetch('/examples/diorame_onboarding.dior');
			if (!res.ok) throw new Error('Could not fetch example file');
			const text = await res.text();
			const json = JSON.parse(text);
			if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('Invalid project format');
			if (!Array.isArray(json.shapes)) throw new Error('Missing or invalid shapes data');
			dispatch({ type: 'LOAD_PROJECT', payload: json });
		} catch (err) {
			toast.error(t('toast.example.errorTitle'), {
				description: err instanceof Error ? err.message : t('toast.example.errorDesc'),
				duration: 3000,
			});
			throw err;
		}
	};
}
