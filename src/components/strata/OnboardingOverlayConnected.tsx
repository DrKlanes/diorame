import React, { useEffect } from 'react';
import { useStrata } from './StrataContext';
import { useLoadExampleScene } from '../../hooks/useLoadExampleScene';
import { OnboardingOverlayV2 } from './modals/OnboardingOverlayV2';

const ONBOARDING_SEEN_KEY = 'diorame-onboarding-seen';

/**
 * Adapter that bridges global Strata state to OnboardingOverlayV2's pure props API.
 * Renders directly (no props) as a drop-in replacement for the legacy OnboardingOverlay
 * inside StrataCanvas.tsx.
 *
 * Computes the 4 visibility conditions, handles localStorage persistence
 * ('diorame-onboarding-seen'), and supplies the load-example callback.
 */
export function OnboardingOverlayConnected() {
	const { state, dispatch } = useStrata();
	const loadExampleScene = useLoadExampleScene();

	// Dismiss onboarding if it was already seen in a previous session
	useEffect(() => {
		const hasSeenOnboarding = localStorage.getItem(ONBOARDING_SEEN_KEY);
		if (hasSeenOnboarding === 'true' && state.isOnboardingVisible) {
			dispatch({ type: 'DISMISS_ONBOARDING' });
		}
	}, [dispatch, state.isOnboardingVisible]);

	const isOpen =
		!state.isWelcomeModalOpen &&
		state.isOnboardingVisible &&
		state.shapes.length === 0 &&
		state.mode === 'drawing';

	const handleClose = () => {
		localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
		dispatch({ type: 'DISMISS_ONBOARDING' });
	};

	return (
		<OnboardingOverlayV2
			open={isOpen}
			onClose={handleClose}
			onLoadExample={loadExampleScene}
			dark={state.isDarkMode}
		/>
	);
}
