export type Language = 'en' | 'es';

export type TranslationParams = Record<string, string | number>;

export type Dictionary = Record<string, string>;

export interface LanguageContextValue {
	language: Language;
	setLanguage: (lang: Language) => void;
}
