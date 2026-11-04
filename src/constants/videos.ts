import type { Language } from '../i18n/types';

// Single source of truth for the public YouTube videos, keyed by app language.
export const INTERFACE_TOUR_URL: Readonly<Record<Language, string>> = {
	es: 'https://youtu.be/Xr5cw77hJls',
	en: 'https://youtu.be/CDC0PQLCHCQ',
};

export const PRESENTATION_URL: Readonly<Record<Language, string>> = {
	es: 'https://youtu.be/ds6Ui7qB6Yc',
	en: 'https://youtu.be/MiXzFndPSzI',
};
