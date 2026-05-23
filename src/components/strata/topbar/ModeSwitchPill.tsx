import React from 'react';
import { DiPill, DiVSep } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';

export function ModeSwitchPill({ dark }: { dark: boolean }) {
	const { state, dispatch } = useStrata();
	const isDrawing    = state.mode === 'drawing';
	const isCinematic  = state.mode === 'cinematic';
	const uiHidden     = state.isUIHidden;

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<DiActionButton
				name="draw-mode"
				onClick={() => dispatch({ type: 'SET_MODE', payload: 'drawing' })}
				dark={dark}
				active={isDrawing}
				activeStyle="solid"
				tooltip="Draw mode"
			/>
			<DiActionButton
				name="view-mode"
				onClick={() => dispatch({ type: 'SET_MODE', payload: 'cinematic' })}
				dark={dark}
				active={isCinematic}
				activeStyle="solid"
				tooltip="View mode"
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
				tooltip="Hide UI"
			/>
		</DiPill>
	);
}
