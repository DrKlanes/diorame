import React from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { DiPill, DiVSep, DiActionButton, DiSegmentControl } from '../../../design-system';
import { T, TYPE, dk } from '../../../design-system/tokens';
import { getAnimationFrames } from '../../../utils/animationFrames';
import { useTranslation } from '../../../i18n';

const FPS_OPTIONS = [4, 6, 8];

export function AnimationPlayerUI() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();

	const frames = getAnimationFrames(state);
	const currentPos = frames.indexOf(state.currentLayerIndex);
	const frameLabel = frames.length === 0
		? '– / 0'
		: `${currentPos === -1 ? '–' : currentPos + 1} / ${frames.length}`;

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<DiActionButton
				name="film"
				onClick={() => dispatch({ type: 'TOGGLE_ANIMATION_MODE' })}
				dark={dark}
				active={state.isAnimationMode}
				activeStyle="wash"
				tooltip={t('bottombar.anim.toggle')}
			/>
			{state.isAnimationMode && (
				<>
					<DiVSep dark={dark} />
					<DiActionButton
						name={state.isAnimationPlaying ? 'pause' : 'play'}
						onClick={() => dispatch({ type: 'SET_ANIMATION_PLAYING', payload: !state.isAnimationPlaying })}
						dark={dark}
						active={state.isAnimationPlaying}
						activeStyle="wash"
						tooltip={state.isAnimationPlaying ? t('bottombar.anim.pause') : t('bottombar.anim.play')}
					/>
					<span style={{
						fontFamily: TYPE.numericValue.family,
						fontWeight: TYPE.numericValue.weight,
						fontSize: TYPE.numericValue.size,
						color: dk(dark, T.muted, T.textDarkMuted) as string,
						padding: '0 4px',
						userSelect: 'none',
						whiteSpace: 'nowrap',
					}}>
						{frameLabel}
					</span>
					<DiVSep dark={dark} />
					<DiSegmentControl<number>
						options={FPS_OPTIONS}
						value={state.animationFramerate}
						onChange={(v) => dispatch({ type: 'SET_ANIMATION_FRAMERATE', payload: v })}
						dark={dark}
						small={true}
					/>
				</>
			)}
		</DiPill>
	);
}
