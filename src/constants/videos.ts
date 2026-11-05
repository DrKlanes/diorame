import type { Language } from '../i18n/types';

// Single source of truth for the public YouTube videos, keyed by app language.
export const INTERFACE_TOUR_ID: Readonly<Record<Language, string>> = {
	es: 'Xr5cw77hJls',
	en: 'CDC0PQLCHCQ',
};

export const PRESENTATION_ID: Readonly<Record<Language, string>> = {
	es: 'ds6Ui7qB6Yc',
	en: 'MiXzFndPSzI',
};

const watchUrl = (id: string) => `https://youtu.be/${id}`;

export const INTERFACE_TOUR_URL: Readonly<Record<Language, string>> = {
	es: watchUrl(INTERFACE_TOUR_ID.es),
	en: watchUrl(INTERFACE_TOUR_ID.en),
};

export const PRESENTATION_URL: Readonly<Record<Language, string>> = {
	es: watchUrl(PRESENTATION_ID.es),
	en: watchUrl(PRESENTATION_ID.en),
};

// Local covers (public/tour/, precached by the SW): nothing from YouTube loads until the user presses play.
export const INTERFACE_TOUR_COVER: Readonly<Record<Language, string>> = {
	es: '/tour/tour-es.webp',
	en: '/tour/tour-en.webp',
};
