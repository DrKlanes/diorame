import React from 'react';
import { DiPill } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { DiActionButton } from '../../../design-system';

export function ThemeTogglePill({ dark }: { dark: boolean }) {
	const { dispatch } = useStrata();
	const setLight = () => { if (dark)  dispatch({ type: 'TOGGLE_DARK_MODE' }); };
	const setDark  = () => { if (!dark) dispatch({ type: 'TOGGLE_DARK_MODE' }); };

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<DiActionButton
				name="sun"
				onClick={setLight}
				dark={dark}
				active={!dark}
				activeStyle="wash"
				tooltip="Light mode"
			/>
			<DiActionButton
				name="moon"
				onClick={setDark}
				dark={dark}
				active={dark}
				activeStyle="wash"
				tooltip="Dark mode"
				shortcut="Shift+D"
			/>
		</DiPill>
	);
}
