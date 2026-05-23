import React, { FC } from 'react';

interface WordmarkProps {
	/** Optional font size (CSS value: px, em, rem, or number→px). Inherits from parent if omitted. */
	size?: string | number;
	/** Optional className for extra customization */
	className?: string;
	/** Optional inline style overrides */
	style?: React.CSSProperties;
}

export const Wordmark: FC<WordmarkProps> = ({ size, className, style }) => {
	const combinedStyle: React.CSSProperties = {
		...(size !== undefined ? { fontSize: typeof size === 'number' ? `${size}px` : size } : {}),
		...style,
	};

	return (
		<span className={className} style={combinedStyle}>
			diorame
			<sup style={{ fontSize: '0.55em', fontWeight: 400, verticalAlign: 'super', marginLeft: '0.05em' }}>
				™
			</sup>
		</span>
	);
};
