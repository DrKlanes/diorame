import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { IconBtn } from './_shared';

export function ModeSwitchPill({ dark }: { dark: boolean }) {
	const { state, dispatch } = useStrata();
	const isDrawing    = state.mode === 'drawing';
	const isCinematic  = state.mode === 'cinematic';
	const uiHidden     = state.isUIHidden;

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<IconBtn
				name="draw-mode"
				onClick={() => dispatch({ type: 'SET_MODE', payload: 'drawing' })}
				dark={dark}
				active={isDrawing}
				tooltip="Draw mode"
			/>
			<IconBtn
				name="view-mode"
				onClick={() => dispatch({ type: 'SET_MODE', payload: 'cinematic' })}
				dark={dark}
				active={isCinematic}
				tooltip="View mode"
			/>
			<DiVSep dark={dark} />
			<IconBtn
				name="hide-ui"
				onClick={() => dispatch({ type: 'TOGGLE_UI' })}
				dark={dark}
				active={uiHidden}
				tooltip="Hide UI"
			/>
		</DiPill>
	);
}
