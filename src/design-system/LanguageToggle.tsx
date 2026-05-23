import React, { FC } from 'react';
import { useLanguage } from '../i18n';
import type { Language } from '../i18n';
import { T, dk } from './tokens';
import { useTheme } from './useTheme';

interface LanguageToggleProps {
	className?: string;
	style?: React.CSSProperties;
}

/**
 * LanguageToggle — chip-style EN / ES switch.
 *
 * Visual: minimal chips (no surrounding pill), active = filled purple, inactive = muted.
 * State: reads/writes via useLanguage() hook from the i18n module.
 * Persistence: handled by LanguageProvider (localStorage).
 *
 * Used in: WelcomeModalV2 bottom-left corner.
 */
export const LanguageToggle: FC<LanguageToggleProps> = ({ className, style }) => {
	const { language, setLanguage } = useLanguage();
	const { dark } = useTheme();

	const chipStyle = (active: boolean): React.CSSProperties => ({
		fontSize: 11,
		fontWeight: active ? 600 : 500,
		padding: '4px 8px',
		borderRadius: 5,
		letterSpacing: '0.02em',
		cursor: 'pointer',
		userSelect: 'none',
		background: active ? (dk(dark, T.purple, T.purpleLight) as string) : 'transparent',
		color: active ? '#FFFFFF' : (dk(dark, T.muted, T.textDarkMuted) as string),
		transition: 'background 120ms ease, color 120ms ease',
		border: 'none',
		fontFamily: 'inherit',
	});

	const renderChip = (code: Language, label: string) => (
		<button
			type="button"
			onClick={() => setLanguage(code)}
			style={chipStyle(language === code)}
			aria-label={code === 'en' ? 'English' : 'Español'}
			aria-pressed={language === code}
		>
			{label}
		</button>
	);

	return (
		<div
			className={className}
			style={{ display: 'inline-flex', gap: 2, ...style }}
		>
			{renderChip('en', 'EN')}
			{renderChip('es', 'ES')}
		</div>
	);
};
