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
 * Always shows "Double tap to focus" hint; reveals an X button only when a
 * point of interest is currently set. Semi-transparent at rest, opaque on hover.
 */
export function POIPill() {
	const { state, dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();
	const [hovered, setHovered] = useState(false);
	const isPoiSet = state.pointOfInterest !== null;

	return (
		<div
			style={{
				opacity: hovered ? 1 : 0.7,
				transition: 'opacity 0.2s ease',
			}}
			onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
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
					{t('viewport.cinema.doubleTapHint')}
				</span>
				{isPoiSet && (
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
