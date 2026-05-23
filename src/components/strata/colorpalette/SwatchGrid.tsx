import React from 'react';
import { useStrata } from '../StrataContext';
import { T } from '../../../design-system/tokens';
import { DARK_COLORS, COLOR_NAME_KEYS } from '../../../constants/palette';
import { useTranslation } from '../../../i18n';

interface SwatchGridProps { dark: boolean; }

// 14 organic blob paths — closed cubic bezier curves, viewBox 0 0 24 24.
// Each is a distinct asymmetric shape suggesting Riso ink blobs.
const BLOB_PATHS = [
	'M12 4 C17 4 20 7.5 20 12 C20 16.5 17 20 12 20 C7 20 4 16.5 4 12 C4 7.5 7 4 12 4 Z',
	'M11 4 C16 3 21 8 21 12 C21 17 17 21 12 21 C7 21 3 17 3 12 C3 7 6 5 11 4 Z',
	'M12 5 C17 4 21 8 21 12 C21 16 17 20 12 20 C7 20 3 16 3 12 C3 8 7 5 12 5 Z',
	'M12 3 C16 3 20 7 20 12 C20 17 16 21 12 21 C8 21 4 17 4 12 C4 7 8 3 12 3 Z',
	'M13 3 C18 4 21 8 20 13 C19 18 15 21 12 21 C8 21 3 17 3 12 C3 7 8 3 13 3 Z',
	'M12 4 C17 3 21 7 21 12 C21 17 16 21 12 21 C8 21 3 18 3 12 C3 7 7 5 12 4 Z',
	'M12 4 C16 4 20 6 20 12 C20 18 16 20 12 20 C8 20 4 18 4 12 C4 6 8 4 12 4 Z',
	'M12 5 C15.5 5 19 8 19 12 C19 16 15.5 19 12 19 C8.5 19 5 16 5 12 C5 8 8.5 5 12 5 Z',
	'M11 3 C17 3 21 7 21 12 C21 17 17 21 12 21 C7 21 3 17 3 12 C3 7 5 3 11 3 Z',
	'M12 4 C17 3 20 8 21 12 C22 16 17 21 12 21 C7 21 3 17 3 12 C3 7 7 4 12 4 Z',
	'M12 4 C15 4 20 7 20 12 C20 17 15 20 12 20 C9 20 4 17 4 12 C4 7 9 4 12 4 Z',
	'M13 4 C17 4 20 8 20 13 C20 18 16 21 12 21 C7 21 4 17 4 12 C4 8 8 4 13 4 Z',
	'M12 3 C17 3 20 8 20 13 C20 18 16 21 12 21 C8 21 4 18 4 13 C4 8 7 3 12 3 Z',
	'M12 4 C16 3 21 7 21 13 C21 17 17 21 12 20 C7 20 3 17 3 12 C3 7 8 4 12 4 Z',
];

export function SwatchGrid({ dark }: SwatchGridProps) {
	const { state, dispatch } = useStrata();

	return (
		<div style={{
			display: 'grid',
			gridTemplateColumns: 'repeat(8, 1fr)',
			gap: 2,
		}}>
			{state.palette.map((color, idx) => (
				<Swatch
					key={idx}
					color={color}
					isActive={idx === state.currentColorIndex}
					blobPath={BLOB_PATHS[idx % BLOB_PATHS.length]}
					dark={dark}
					onClick={() => dispatch({ type: 'SET_COLOR_INDEX', payload: idx })}
				/>
			))}
		</div>
	);
}

function isLightColor(hex: string): boolean {
	const c = hex.replace('#', '');
	const r = parseInt(c.substring(0, 2), 16);
	const g = parseInt(c.substring(2, 4), 16);
	const b = parseInt(c.substring(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.92;
}

interface SwatchProps {
	color: string;
	isActive: boolean;
	blobPath: string;
	dark: boolean;
	onClick: () => void;
}

function Swatch({ color, isActive, blobPath, dark, onClick }: SwatchProps) {
	const { t } = useTranslation();
	const nameKey = COLOR_NAME_KEYS.get(color);
	const displayName = nameKey ? t(nameKey) : color;
	const lightColor = isLightColor(color);
	const strokeColor = lightColor
		? (dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)')
		: 'none';
	const strokeWidth = lightColor ? 0.75 : 0;

	return (
		<button
			onClick={onClick}
			title={displayName}
			style={{
				width: 24,
				height: 24,
				padding: 0,
				background: 'transparent',
				border: 'none',
				cursor: 'pointer',
				position: 'relative',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			<svg viewBox="0 0 24 24" width="22" height="22" style={{ display: 'block', overflow: 'visible' }}>
				<path d={blobPath} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
			</svg>
			{isActive && (
				<div style={{
					position: 'absolute',
					inset: -1,
					border: `2px solid ${T.purple}`,
					borderRadius: '50%',
					pointerEvents: 'none',
				}} />
			)}
		</button>
	);
}
