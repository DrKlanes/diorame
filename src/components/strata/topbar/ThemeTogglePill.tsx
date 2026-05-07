import React from 'react';
import { DiPill } from '../../../design-system';
import { useStrata } from '../StrataContext';
import { IconBtn } from './_shared';

export function ThemeTogglePill({ dark }: { dark: boolean }) {
	const { dispatch } = useStrata();
	const setLight = () => { if (dark)  dispatch({ type: 'TOGGLE_DARK_MODE' }); };
	const setDark  = () => { if (!dark) dispatch({ type: 'TOGGLE_DARK_MODE' }); };

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<IconBtn
				name="sun"
				onClick={setLight}
				dark={dark}
				active={!dark}
				activeStyle="wash"
				tooltip="Light mode"
			/>
			<IconBtn
				name="moon"
				onClick={setDark}
				dark={dark}
				active={dark}
				activeStyle="wash"
				tooltip="Dark mode"
			/>
		</DiPill>
	);
}
