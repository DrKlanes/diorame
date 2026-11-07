import React, { useRef, useState } from 'react';
import { useStrata } from '../StrataContext';
import { DiActionButton, DiSegmentControl, T, TYPE, dk } from '../../../design-system';
import { useTheme } from '../../../design-system/useTheme';
import { useTranslation } from '../../../i18n';
import { DiSelectorPopover } from '../popovers/DiSelectorPopover';
import { DiSelectorOption } from '../popovers/DiSelectorOption';
import { newFormat, reshapeFormat, visibleWorldRect } from '../../../utils/formatFrame';
import type { FormatOrientation, FormatType } from '../../../types/strataTypes';

type Choice = FormatType | 'free';

/**
 * FormatPill — DRAW format guide (v3.25.5): button in the bottom-left ViewPills + its menu.
 * Libre (no frame) · A · 16:9 · 4:5 · 1:1, orientation, «Ajustar a la vista» (re-places the frame at ~88 % of
 * what is on screen) and «Quitar». A new frame is fitted to the current view; changing type or orientation keeps
 * the centre and the long side. Every change is a SET_FORMAT (view state, dirties the project, never in undo).
 */
export function FormatPill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);
	const format = state.format;

	const view = () => visibleWorldRect(state.drawingZoom, state.drawingPan, state.viewportSize.w, state.viewportSize.h);
	const orientation: FormatOrientation = format?.orientation ?? 'landscape';

	const choose = (choice: Choice) => {
		if (choice === 'free') { if (format) dispatch({ type: 'SET_FORMAT', payload: null }); return; }
		if (format?.type === choice) return;
		dispatch({ type: 'SET_FORMAT', payload: format ? reshapeFormat(format, choice, orientation) : newFormat(choice, orientation, view()) });
	};

	const orient = (o: FormatOrientation) => {
		if (format && format.orientation !== o) dispatch({ type: 'SET_FORMAT', payload: reshapeFormat(format, format.type, o) });
	};

	const hasOrientation = !!format && (format.type === 'A' || format.type === '16:9');

	return (
		<>
			<div ref={anchorRef}>
				<DiActionButton
					name="format-frame"
					onClick={() => setOpen(v => !v)}
					dark={dark}
					active={!!format || open}
					activeStyle="wash"
					tooltip={t('viewport.format.tooltip')}
				/>
			</div>
			{/* key: the rows change with the frame, and the popover measures its height only when it opens —
			    remounting re-measures it, so it never grows below the screen edge. */}
			<DiSelectorPopover key={`${!!format}-${hasOrientation}`} anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} dark={dark} placement="top" align="start">
				<Header label={t('viewport.format.header')} dark={dark} />
				<div style={{ padding: '2px 10px 6px' }}>
					<DiSegmentControl<Choice>
						options={[
							{ value: 'free', label: t('viewport.format.free') },
							{ value: 'A', label: 'A', tooltip: t('viewport.format.aTooltip') },
							{ value: '16:9', label: '16:9' },
							{ value: '4:5', label: '4:5' },
							{ value: '1:1', label: '1:1' },
						]}
						value={format?.type ?? 'free'}
						onChange={choose}
						dark={dark}
						small
					/>
				</div>
				{hasOrientation && (
					<>
						<Header label={t('viewport.format.orientation')} dark={dark} />
						<div style={{ padding: '2px 10px 6px' }}>
							<DiSegmentControl<FormatOrientation>
								options={[
									{ value: 'portrait', label: t('viewport.format.portrait') },
									{ value: 'landscape', label: t('viewport.format.landscape') },
								]}
								value={format.orientation}
								onChange={orient}
								dark={dark}
								small
							/>
						</div>
					</>
				)}
				{format && (
					<>
						<DiSelectorOption
							title={t('viewport.format.fitToView')}
							description={t('viewport.format.fitToViewDesc')}
							onSelect={() => dispatch({ type: 'SET_FORMAT', payload: newFormat(format.type, format.orientation, view()) })}
						/>
						<DiSelectorOption
							title={t('viewport.format.remove')}
							onSelect={() => dispatch({ type: 'SET_FORMAT', payload: null })}
						/>
					</>
				)}
			</DiSelectorPopover>
		</>
	);
}

function Header({ label, dark }: { label: string; dark: boolean }) {
	return (
		<div style={{
			padding: '6px 10px 2px',
			fontFamily: TYPE.panelHeader.family,
			fontSize: TYPE.panelHeader.size,
			fontWeight: TYPE.panelHeader.weight,
			letterSpacing: TYPE.panelHeader.letterSpacing,
			textTransform: TYPE.panelHeader.textTransform,
			color: dk(dark, T.muted, T.textDarkMuted) as string,
			userSelect: 'none',
		}}>
			{label}
		</div>
	);
}
