import React, { useState } from 'react';
import { T, TYPE, RADIUS, dk } from './tokens';

interface DiSegmentControlProps {
	options: string[];
	value: string;
	onChange: (value: string) => void;
	dark: boolean;
	small?: boolean;
}

export function DiSegmentControl({
	options,
	value,
	onChange,
	dark,
	small = false,
}: DiSegmentControlProps) {
	return (
		<div style={{
			display: 'flex',
			backgroundColor: dk(dark, T.light, T.tabBgDark),
			borderRadius: (small ? RADIUS.segmentSmall : RADIUS.segment) + 2,
			padding: 2,
			gap: 1,
		}}>
			{options.map(opt => (
				<SegmentItem
					key={opt}
					option={opt}
					active={value === opt}
					small={small}
					dark={dark}
					onClick={() => onChange(opt)}
				/>
			))}
		</div>
	);
}

interface SegmentItemProps {
	option: string;
	active: boolean;
	small: boolean;
	dark: boolean;
	onClick: () => void;
}

function SegmentItem({ option, active, small, dark, onClick }: SegmentItemProps) {
	const [hov, setHov] = useState(false);

	return (
		<div
			onClick={onClick}
			onMouseEnter={() => setHov(true)}
			onMouseLeave={() => setHov(false)}
			style={{
				flex: 1,
				height: small ? 18 : 22,
				borderRadius: small ? RADIUS.segmentItemSmall : RADIUS.segmentItem,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				cursor: 'pointer',
				userSelect: 'none',
				backgroundColor: active
					? dk(dark, 'rgba(154,15,249,0.12)', 'rgba(154,15,249,0.25)')
					: hov
						? dk(dark, 'rgba(0,0,0,0.04)', 'rgba(255,255,255,0.04)')
						: 'transparent',
				transition: 'background 0.1s',
			}}
		>
			<span style={{
				fontFamily: TYPE.controlLabel.family,
				fontWeight: active ? 700 : 500,
				fontSize: small ? TYPE.badge.size : TYPE.controlLabel.size,
				color: active ? T.purple : dk(dark, T.muted, T.textDarkMuted),
				whiteSpace: 'nowrap',
				padding: '0 5px',
			}}>
				{option}
			</span>
		</div>
	);
}
