import React, { useState } from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { useTranslation } from '../../../i18n';
import {
	DiPill,
	DiActionButton,
	DiVSep,
	T,
	TYPE,
	dk,
} from '../../../design-system';

/**
 * POIPill — compact hint pill shown to the right of CameraBar in Cinema mode.
 * Always shows the "Double tap to frame" hint; reveals an X button only when a
 * point of interest is currently set. Semi-transparent at rest, opaque on hover.
 *
 * Copy says "frame"/"framing" (v3.17.27), never "focus" — that word is DoF's
 * (`postProcessing.focusDist`/`focusTargetLayer`, a Z-depth blur control). The POI
 * is a camera X/Y position, a different axis entirely; sharing the word invited
 * confusing the two.
 *
 * DISABLED IN STORYTELLING (v3.17.28), derived from `state.cinematicType` — no new
 * AppState field. That preset drives the camera along its own waypoint tour and
 * never reads the POI (`cinematicCamera.ts`), so the double-tap gesture there does
 * nothing visible. Before this, the pill kept advertising it anyway: same hint,
 * same live X button, both promising a gesture that had no effect — which read as
 * a second bug stacked on top of the framing fix (v3.17.17-25), not as "this preset
 * doesn't use it". Hiding the pill outright was considered and rejected: an element
 * that vanishes teaches nothing, it just relocates the confusion to "where did it
 * go". Disabled-with-explanation says the true thing instead.
 */
export function POIPill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();
	const [hovered, setHovered] = useState(false);
	const isPoiSet = state.pointOfInterest !== null;
	const isStorytelling = state.cinematicType === 'storytelling';

	return (
		<div
			style={{
				opacity: isStorytelling ? 0.4 : (hovered ? 1 : 0.7),
				transition: 'opacity 0.2s ease',
			}}
			onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !isStorytelling) setHovered(true); }}
			onPointerLeave={() => setHovered(false)}
		>
			<DiPill dark={dark} height={32} padding="0 10px" gap={6}>
				<span
					style={{
						fontFamily: TYPE.controlLabel.family,
						fontWeight: TYPE.controlLabel.weight,
						fontSize: 10,
						color: dk(dark, T.muted, T.textDarkMuted) as string,
						whiteSpace: 'nowrap',
						userSelect: 'none',
					}}
				>
					{isStorytelling ? t('viewport.cinema.storytellingHint') : t('viewport.cinema.doubleTapHint')}
				</span>
				{isPoiSet && !isStorytelling && (
					<>
						<DiVSep dark={dark} />
						<DiActionButton
							name="x"
							iconSize={14}
							onClick={() => dispatch({ type: 'CLEAR_POINT_OF_INTEREST' })}
							dark={dark}
							tooltip={t('viewport.cinema.resetPoi')}
						/>
					</>
				)}
			</DiPill>
		</div>
	);
}
