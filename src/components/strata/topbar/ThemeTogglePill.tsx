import React, { useState } from 'react';
import { DiPill, Ico } from '../../../design-system';
import { T, RADIUS, dk } from '../../../design-system/tokens';
import { useStrata } from '../StrataContext';

export function ThemeTogglePill({ dark }: { dark: boolean }) {
	const { dispatch } = useStrata();
	const setLight = () => { if (dark)  dispatch({ type: 'TOGGLE_DARK_MODE' }); };
	const setDark  = () => { if (!dark) dispatch({ type: 'TOGGLE_DARK_MODE' }); };

	return (
		<DiPill dark={dark} height={40} padding="0 6px" gap={2}>
			<ThemeBtn name="sun"  onClick={setLight} dark={dark} active={!dark} />
			<ThemeBtn name="moon" onClick={setDark}  dark={dark} active={dark} />
		</DiPill>
	);
}

function ThemeBtn({ name, onClick, dark, active }: {
	name: string;
	onClick: () => void;
	dark: boolean;
	active: boolean;
}) {
	const [hov, setHov] = useState(false);
	const bg = active
		? T.purple10
		: hov
			? dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.07)')
			: 'transparent';
	const color = active ? T.purple : (dk(dark, T.dark, T.textDark) as string);
	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setHov(true)}
			onMouseLeave={() => setHov(false)}
			style={{
				width: 30,
				height: 30,
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: bg,
				cursor: active ? 'default' : 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transition: 'background 0.1s',
				flexShrink: 0,
			}}
		>
			<Ico name={name} size={18} color={color} />
		</button>
	);
}
