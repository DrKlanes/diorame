import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';
import { useTranslation } from '../../../i18n';

export function ModeSwitchPill({ dark }: { dark: boolean }) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	const isDrawing    = state.mode === 'drawing';
	const isCinematic  = state.mode === 'cinematic';
	const uiHidden     = state.isUIHidden;
	const isPlaybackLocked = state.isAnimationMode && state.isAnimationPlaying;

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={6}>
			<DiActionButton
				name="draw-mode"
				onClick={() => dispatch({ type: 'SET_MODE', payload: 'drawing' })}
				dark={dark}
				active={isDrawing}
				activeStyle="solid"
				label={t('topbar.mode.draw')}
				tooltip={t('topbar.mode.drawTooltip')}
				disabled={isPlaybackLocked}
			/>
			<DiActionButton
				name="view-mode"
				onClick={() => dispatch({ type: 'SET_MODE', payload: 'cinematic' })}
				dark={dark}
				active={isCinematic}
				activeStyle="solid"
				label={t('topbar.mode.view')}
				tooltip={t('topbar.mode.viewTooltip')}
				disabled={isPlaybackLocked}
			/>
			<DiVSep dark={dark} />
			<DiActionButton
				name="hide-ui"
				onClick={() => dispatch({ type: 'TOGGLE_UI' })}
				dark={dark}
				active={uiHidden}
				activeStyle="solid"
				iconWeight="secondary"
				iconSize={14}
				tooltip={t('topbar.mode.hideUi')}
				disabled={isPlaybackLocked}
			/>
		</DiPill>
	);
}
