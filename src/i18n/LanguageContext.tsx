import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Language, LanguageContextValue } from './types';
import { getInitialLanguage, persistLanguage } from './detectLanguage';

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

	const setLanguage = useCallback((lang: Language) => {
		setLanguageState(lang);
		persistLanguage(lang);
	}, []);

	return (
		<LanguageContext.Provider value={{ language, setLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (!ctx) {
		throw new Error('useLanguage must be used within a LanguageProvider');
	}
	return ctx;
}
