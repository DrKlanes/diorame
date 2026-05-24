import React, { useState, useEffect } from 'react';
import { useStrata } from '../StrataContext';
import { useTheme } from '../../../design-system/useTheme';
import { useTranslation } from '../../../i18n';
import { DiActionButton, T } from '../../../design-system';

/**
 * Renders the persistent "show UI" eye button when the interface is hidden.
 * Emits a purple sonar pulse for 1.5s on mount to help users discover the button.
 * Mounted/unmounted by ControlsV2 based on state.isUIHidden.
 */
export function ShowUIButton() {
	const { dispatch } = useStrata();
	const { dark } = useTheme();
	const { t } = useTranslation();
	const [isPulsing, setIsPulsing] = useState(true);
	const [hovered, setHovered] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setIsPulsing(false), 1500);
		return () => clearTimeout(timer);
	}, []);

	const restOpacity = isPulsing ? 0.75 : 0.25;

	return (
		<div
			style={{
				position: 'fixed',
				bottom: 16,
				right: 16,
				zIndex: 100,
				opacity: hovered ? 1 : restOpacity,
				transition: 'opacity 0.3s ease',
			}}
			onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}
			onPointerLeave={() => setHovered(false)}
		>
			<div style={{ position: 'relative' }}>
				<DiActionButton
					name="eye"
					onClick={() => dispatch({ type: 'TOGGLE_UI' })}
					dark={dark}
					tooltip={t('viewport.showUi')}
				/>
				{isPulsing && (
					<div
						className="ui-sonar-pulse"
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius: '50%',
							border: `2px solid ${T.purple}`,
							pointerEvents: 'none',
						}}
					/>
				)}
			</div>
		</div>
	);
}
