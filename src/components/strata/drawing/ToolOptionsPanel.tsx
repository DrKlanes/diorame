import React, { useMemo } from 'react';
import { DiPill, DiVSep, DiActionButton } from '../../../design-system';
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
	const { t, language } = useTranslation();
	// «Mixto» (v3.26.23): the active layer holds brush strokes of more than one thickness.
	const range = useMemo(() => layerThicknessRange(state.shapes, state.currentLayerIndex), [state.shapes, state.currentLayerIndex]);

	if (state.mode !== 'drawing') return null;
	if (state.tool !== 'brush') return null;

	const isPlaybackLocked = state.isAnimationMode && state.isAnimationPlaying;
	const thickness = state.currentBrushThickness;
	const labelColor = dk(dark, T.muted, T.textDarkMuted) as string;
	const trackBg = dk(dark, T.border, T.trackDark) as string;
	const isMixed = !!range?.mixed;
	// Proportional scale (v3.26.25): on a «Mixto» layer with the lock closed, the slider multiplies every
	// stroke by k instead of unifying them. A gesture already open stays proportional to its end, even if
	// the layer stops reading as mixed halfway (two strokes that round to the same number when small).
	const gesture = state.brushScaleGesture;
	const proportional = !!gesture || (isMixed && state.brushScaleProportional);
	const formatK = (k: number) => k.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
	// k from where the handle is, against the thickness in force when the gesture began; in steps of 0.1.
	// The reducer bounds it, and the handle follows the bounded value: it cannot be dragged past.
	const scaleTo = (k: number) => dispatch({ type: 'SCALE_LAYER_THICKNESS_PREVIEW', payload: Math.round(k * 10) / 10 });
	const commitScale = () => { if (state.brushScaleGesture) dispatch({ type: 'COMMIT_BRUSH_THICKNESS' }); };
	// Where a thickness falls on the track: the handle's centre travels the track less its own width
	// (16 px by default), so the band is inset by half of it on each side, and 3 px wider than the range.
	const onTrack = (thickness: number, pad: number) => `calc(8px + (100% - 16px) * ${thicknessToSliderPosition(thickness) / 100} + ${pad}px)`;
	const mixedTrack = range && isMixed
		? `linear-gradient(to right, ${trackBg} ${onTrack(range.min, -3)}, ${T.purpleLight} ${onTrack(range.min, -3)}, ${T.purpleLight} ${onTrack(range.max, 3)}, ${trackBg} ${onTrack(range.max, 3)})`
		: trackBg;
	const mixedLabel = t('bottombar.draw.toolOptions.mixed');
	const shown = gesture ? `×${formatK(gesture.k)}` : isMixed ? mixedLabel : String(shownThickness(thickness));
	const valueText = range && proportional
		? t('bottombar.draw.toolOptions.mixedScaleAria', { min: range.min, max: range.max, k: formatK(gesture?.k ?? 1) })
		: range && isMixed ? t('bottombar.draw.toolOptions.mixedAria', { min: range.min, max: range.max }) : shown;
	const valueStyle: React.CSSProperties = {
		fontFamily: TYPE.numericValue.family,
		fontSize: TYPE.numericValue.size,
		fontWeight: TYPE.numericValue.weight,
		color: labelColor,
		minWidth: 20,
		textAlign: 'right',
	};
	const showScaleLock = isMixed || !!gesture;

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
				aria-valuetext={valueText}
				onInput={proportional ? undefined : (e) => dispatch({ type: 'SET_BRUSH_THICKNESS_PREVIEW', payload: sliderPositionToThickness(parseInt((e.target as HTMLInputElement).value)) })}
				// Proportional: React's onChange (every tick) carries the scale, so that React puts the handle back
				// on the bounded value when the pointer goes past a limit.
				onChange={proportional
					? (e) => scaleTo(sliderPositionToThickness(parseInt(e.target.value)) / (gesture?.baseThickness ?? thickness))
					: (e) => dispatch({ type: 'SET_BRUSH_THICKNESS', payload: sliderPositionToThickness(parseInt(e.target.value)) })}
				// Proportional, keyboard: the arrows move k by 0.1 while held; letting go closes the gesture (one step).
				onKeyDown={proportional ? (e) => {
					const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
					if (!dir) return;
					e.preventDefault();
					scaleTo((gesture?.k ?? 1) + dir * 0.1);
				} : undefined}
				onKeyUp={(e) => { if (e.key.startsWith('Arrow')) commitScale(); }}
				onBlur={commitScale}
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
			{showScaleLock ? (
				// Mixed: «Mixto» and «×k» take turns in the same cell, sized for the wider of the two (and of a
				// two-digit k), so the pill does not change width when a drag starts or ends.
				<span style={{ ...valueStyle, display: 'inline-grid', justifyItems: 'end' }}>
					<span style={{ gridArea: '1 / 1' }}>{shown}</span>
					<span aria-hidden style={{ gridArea: '1 / 1', visibility: 'hidden' }}>{mixedLabel}</span>
					<span aria-hidden style={{ gridArea: '1 / 1', visibility: 'hidden' }}>{`×${formatK(10)}`}</span>
				</span>
			) : (
				<span style={valueStyle}>{shown}</span>
			)}
			{showScaleLock && (
				<DiActionButton
					name={state.brushScaleProportional ? 'lock' : 'unlock'}
					onClick={() => dispatch({ type: 'SET_BRUSH_SCALE_PROPORTIONAL', payload: !state.brushScaleProportional })}
					dark={dark}
					active={state.brushScaleProportional}
					iconWeight="secondary"
					iconSize={16}
					tooltip={t(state.brushScaleProportional ? 'bottombar.draw.toolOptions.scaleProportional' : 'bottombar.draw.toolOptions.scaleUnify')}
					ariaLabel={t(state.brushScaleProportional ? 'bottombar.draw.toolOptions.scaleProportional' : 'bottombar.draw.toolOptions.scaleUnify')}
				/>
			)}
		</DiPill>
		</div>
	);
}
