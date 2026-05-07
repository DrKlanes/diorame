import React, { useState } from 'react';
import { Ico } from '../../../design-system';
import { T, RADIUS, dk } from '../../../design-system/tokens';

export function IconBtn({ name, onClick, dark, active = false, activeStyle = 'wash', tooltip }: {
	name: string;
	onClick: () => void;
	dark: boolean;
	active?: boolean;
	activeStyle?: 'wash' | 'solid';
	tooltip?: string;
}) {
	const [hov, setHov] = useState(false);
	const activeBg = activeStyle === 'solid'
		? T.purple
		: dk(dark, T.purple10, T.purple20);
	const iconColor = active ? (activeStyle === 'solid' ? T.white : T.purple) : (dk(dark, T.dark, T.textDark) as string);
	const bg = active
		? activeBg
		: hov
			? dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.07)')
			: 'transparent';
	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setHov(true)}
			onMouseLeave={() => setHov(false)}
			title={tooltip}
			style={{
				width: 30,
				height: 30,
				borderRadius: RADIUS.iconBtn,
				border: 'none',
				background: bg,
				cursor: 'pointer',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transition: 'background 0.1s',
				flexShrink: 0,
			}}
		>
			<Ico name={name} size={18} color={iconColor} />
		</button>
	);
}
