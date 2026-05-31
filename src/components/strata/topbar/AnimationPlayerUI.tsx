import React, { useState, useEffect } from 'react';
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

	// All hooks before any early return (Rules of Hooks)
	const [isExpanded, setIsExpanded] = useState(state.isAnimationMode);

	// Sync: if animation mode changes externally, keep expand state in sync
	useEffect(() => {
		setIsExpanded(state.isAnimationMode);
	}, [state.isAnimationMode]);

	const isCinematic = state.mode === 'cinematic';

	const handleBounceClick = () => {
		setIsExpanded(prev => !prev);
		dispatch({ type: 'TOGGLE_ANIMATION_MODE' });
	};

	const frames = getAnimationFrames(state);
	const currentPos = frames.indexOf(state.currentLayerIndex);
	const frameLabel = frames.length === 0
		? '– / 0'
		: `${currentPos === -1 ? '–' : currentPos + 1} / ${frames.length}`;

	const mutedColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const isPingpong = state.animationPlaybackMode === 'pingpong';

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			{/* Bounce icon — toggle for expand/collapse + animation mode (DRAW + CINEMA) */}
			<DiActionButton
				name="bounce"
				onClick={handleBounceClick}
				dark={dark}
				active={state.isAnimationMode}
				activeStyle="wash"
				tooltip={t('topbar.anim.toggle')}
			/>

			{isExpanded && (
				<>
					<DiVSep dark={dark} />

					{/* Frame back — same action as [ shortcut */}
					<DiActionButton
						name="frame-back"
						onClick={() => dispatch({ type: 'PREV_LAYER' })}
						dark={dark}
						tooltip={t('topbar.anim.frameBack')}
						shortcut="["
					/>

					{/* Play / Pause */}
					<DiActionButton
						name={state.isAnimationPlaying ? 'pause' : 'play'}
						onClick={() => dispatch({ type: 'SET_ANIMATION_PLAYING', payload: !state.isAnimationPlaying })}
						dark={dark}
						active={state.isAnimationPlaying}
						activeStyle="wash"
						tooltip={state.isAnimationPlaying ? t('topbar.anim.pause') : t('topbar.anim.play')}
					/>

					{/* Frame forward — same action as ] shortcut (creates layer at end if < 10) */}
					<DiActionButton
						name="frame-fwd"
						onClick={() => dispatch({ type: 'NEXT_LAYER' })}
						dark={dark}
						tooltip={t('topbar.anim.frameForward')}
						shortcut="]"
					/>

					{/* Frame counter */}
					<span style={{
						fontFamily: TYPE.numericValue.family,
						fontWeight: TYPE.numericValue.weight,
						fontSize: TYPE.numericValue.size,
						color: mutedColor,
						padding: '0 4px',
						userSelect: 'none',
						whiteSpace: 'nowrap',
					}}>
						{frameLabel}
					</span>

					<DiVSep dark={dark} />

					{/* FPS selector */}
					<DiSegmentControl<number>
						options={FPS_OPTIONS}
						value={state.animationFramerate}
						onChange={(v) => dispatch({ type: 'SET_ANIMATION_FRAMERATE', payload: v })}
						dark={dark}
						small={true}
					/>

					<DiVSep dark={dark} />

					{/* Loop / Ping-pong toggle */}
					<DiActionButton
						name={isPingpong ? 'anim-pingpong' : 'anim-loop'}
						onClick={() => dispatch({ type: 'TOGGLE_ANIMATION_PLAYBACK_MODE' })}
						dark={dark}
						active={isPingpong}
						activeStyle="wash"
						tooltip={isPingpong ? t('topbar.anim.playbackPingpong') : t('topbar.anim.playbackLoop')}
					/>

					{/* Depth toggle — CINEMA only: real depth (parallax) vs. flat (zero-Z) */}
					{isCinematic && (
						<>
							<DiVSep dark={dark} />
							<DiActionButton
								name={state.isAnimationFlatZ ? 'depth-off' : 'depth-on'}
								onClick={() => dispatch({ type: 'TOGGLE_ANIMATION_FLAT_Z' })}
								dark={dark}
								active={state.isAnimationFlatZ}
								activeStyle="wash"
								tooltip={t('topbar.anim.depthToggle')}
							/>
						</>
					)}
				</>
			)}
		</DiPill>
	);
}
