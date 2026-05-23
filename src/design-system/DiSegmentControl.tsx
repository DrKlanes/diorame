import React, { useState } from 'react';
import { T, TYPE, RADIUS, dk } from './tokens';

/**
 * SegmentOption — admite dos formatos:
 *   1) primitivo (string | number): el value es el primitivo y el label es su String() (backward compat)
 *   2) { value, label }: value es el identifier estable (interno, no traducible),
 *      label es el display string (traducible, puede cambiar con i18n)
 *
 * Para i18n: pasa { value: 'primary', label: t('palette.segment.primary') } — el matching
 * y la key de React se hacen contra `value` (estable), así que el cambio de idioma
 * NO desmonta los segmentos.
 *
 * Soporta T number para casos donde el value semántico es numérico (e.g. discrete FX intensity).
 */
export type SegmentOption<T extends string | number = string> = T | { value: T; label: string };

interface DiSegmentControlProps<T extends string | number = string> {
	options: SegmentOption<T>[];
	value: T;
	onChange: (value: T) => void;
	dark: boolean;
	small?: boolean;
}

export function DiSegmentControl<T extends string | number = string>({
	options,
	value,
	onChange,
	dark,
	small = false,
}: DiSegmentControlProps<T>) {
	// Normalize each option to { value, label } shape.
	// Primitives (string or number) become { value: opt, label: String(opt) }.
	const normalized = options.map(opt => {
		if (typeof opt === 'string' || typeof opt === 'number') {
			return { value: opt as T, label: String(opt) };
		}
		return opt;
	});

	return (
		<div style={{
			display: 'flex',
			backgroundColor: dk(dark, T.light, T.tabBgDark),
			borderRadius: (small ? RADIUS.segmentSmall : RADIUS.segment) + 2,
			padding: 2,
			gap: 1,
		}}>
			{normalized.map(opt => (
				<SegmentItem
					key={opt.value}
					label={opt.label}
					active={value === opt.value}
					small={small}
					dark={dark}
					onClick={() => onChange(opt.value)}
				/>
			))}
		</div>
	);
}

interface SegmentItemProps {
	label: string;
	active: boolean;
	small: boolean;
	dark: boolean;
	onClick: () => void;
}

function SegmentItem({ label, active, small, dark, onClick }: SegmentItemProps) {
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
				{label}
			</span>
		</div>
	);
}
