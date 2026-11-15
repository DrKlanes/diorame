import React, { useMemo } from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { T, TYPE, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';
import { BrushModeButton } from '../bottombar/_shared';
import { useTranslation } from '../../../i18n';
import { BRUSH_SLIDER_POSITION_MIN, BRUSH_SLIDER_POSITION_MAX, BRUSH_SLIDER_POSITION_STEP } from '../../../constants/brush';
import { sliderPositionToThickness, thicknessToSliderPosition } from '../../../utils/brushThicknessCurve';
import { layerThicknessRange, shownThickness } from '../../../utils/layerBrush';

interface ToolOptionsPanelProps {
	dark: boolean;
}

export function ToolOptionsPanel({ dark }: ToolOptionsPanelProps) {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();
	// «Mixto» (v3.26.23): the active layer holds brush strokes of more than one thickness.
	const range = useMemo(() => layerThicknessRange(state.shapes, state.currentLayerIndex), [state.shapes, state.currentLayerIndex]);

	if (state.mode !== 'drawing') return null;
	if (state.tool !== 'brush') return null;

	const isPlaybackLocked = state.isAnimationMode && state.isAnimationPlaying;
	const thickness = state.currentBrushThickness;
	const labelColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const trackBg = dk(dark, T.border, T.trackDark) as string;
	const isMixed = !!range?.mixed;
	// Where a thickness falls on the track: the handle's centre travels the track less its own width
	// (16 px by default), so the band is inset by half of it on each side, and 3 px wider than the range.
	const onTrack = (thickness: number, pad: number) => `calc(8px + (100% - 16px) * ${thicknessToSliderPosition(thickness) / 100} + ${pad}px)`;
	const mixedTrack = range && isMixed
		? `linear-gradient(to right, ${trackBg} ${onTrack(range.min, -3)}, ${T.purpleLight} ${onTrack(range.min, -3)}, ${T.purpleLight} ${onTrack(range.max, 3)}, ${trackBg} ${onTrack(range.max, 3)})`
		: trackBg;
	const shown = isMixed ? t('bottombar.draw.toolOptions.mixed') : String(shownThickness(thickness));

	return (
		<div style={{ opacity: isPlaybackLocked ? 0.3 : undefined, pointerEvents: isPlaybackLocked ? 'none' : undefined }}>
		<DiPill dark={dark} height={40} padding="0 10px" gap={6}>
			<BrushModeButton dark={dark} />
			<DiVSep dark={dark} />
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontSize: TYPE.controlLabel.size,
				fontWeight: TYPE.controlLabel.weight,
				color: labelColor,
				whiteSpace: 'nowrap',
			}}>
				{t('bottombar.draw.toolOptions.size')}
			</span>
			<input
				type="range"
				min={BRUSH_SLIDER_POSITION_MIN}
				max={BRUSH_SLIDER_POSITION_MAX}
				step={BRUSH_SLIDER_POSITION_STEP}
				// The handle's position is the INVERSE curve of the real thickness, recomputed
				// every render — so it lands correctly regardless of why currentBrushThickness
				// changed (drag, layer switch, undo/redo, .dior load), with no extra wiring.
				value={thicknessToSliderPosition(thickness)}
				disabled={isPlaybackLocked}
				// The input's own value is a position on the track, not a thickness: this is what a screen reader says.
				aria-label={t('bottombar.draw.toolOptions.size')}
				aria-valuetext={range && isMixed ? t('bottombar.draw.toolOptions.mixedAria', { min: range.min, max: range.max }) : shown}
				onInput={(e) => dispatch({ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: sliderPositionToThickness(parseInt((e.target as HTMLInputElement).value)) })}
				onChange={(e) => dispatch({ type: 'SET_BRUSH_THICKNESS', payload: sliderPositionToThickness(parseInt(e.target.value)) })}
				// One undo step per gesture: the NATIVE change event is the end of the gesture for
				// mouse, touch, pen and keyboard alike (React's onChange fires per tick). pointerup
				// alone missed the keyboard, and an uncommitted restyle slipped into the next
				// stroke's snapshot — undoing that stroke reverted the thickness (v3.26.3).
				// A second commit is a no-op.
				ref={(el) => { if (el) el.onchange = () => dispatch({ type: 'COMMIT_BRUSH_THICKNESS' }); }}
				onPointerUp={() => dispatch({ type: 'COMMIT_BRUSH_THICKNESS' })}
				style={{
					width: 80,
					height: 3,
					appearance: 'none',
					WebkitAppearance: 'none',
					// Mixed: the layer's range, min to max, as a soft band on the track.
					background: mixedTrack,
					borderRadius: RADIUS.pill,
					cursor: isPlaybackLocked ? 'default' : 'pointer',
					outline: 'none',
					border: 'none',
					flexShrink: 0,
					// Mixed: a dimmed handle. It marks no thickness of the layer, only where a new stroke would start.
					accentColor: isMixed ? T.purpleLight : T.purple,
					opacity: isPlaybackLocked ? 0.3 : 1,
				}}
			/>
			<span style={{
				fontFamily: TYPE.numericValue.family,
				fontSize: TYPE.numericValue.size,
				fontWeight: TYPE.numericValue.weight,
				color: labelColor,
				minWidth: 20,
				textAlign: 'right',
			}}>
				{shown}
			</span>
		</DiPill>
		</div>
	);
}
