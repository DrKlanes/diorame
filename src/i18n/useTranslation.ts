import { useCallback } from 'react';
import { useLanguage } from './LanguageContext';
import { interpolate } from './interpolate';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';
import type { TranslationParams, Dictionary } from './types';

const dictionaries: Record<'en' | 'es', Dictionary> = { en, es };

export function useTranslation() {
	const { language } = useLanguage();

	const t = useCallback((key: string, params?: TranslationParams): string => {
		const dict = dictionaries[language];
		const raw = dict[key] ?? key;  // fallback: returns the key itself if missing
		return params ? interpolate(raw, params) : raw;
	}, [language]);

	return { t, language };
}
