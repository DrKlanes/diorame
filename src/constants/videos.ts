import type { Language } from '../i18n/types';

// Interface tour: self-hosted (public/tour/video/, 720p H.264, network only, never precached) so that the app embeds
// nothing from third parties. Masters and .srt: Diorame\motion\1_ENTREGABLES\video2_tour.
export const INTERFACE_TOUR_SRC: Readonly<Record<Language, string>> = {
	es: '/tour/video/tour-es.mp4',
	en: '/tour/video/tour-en.mp4',
};

export const INTERFACE_TOUR_CAPTIONS: Readonly<Record<Language, string>> = {
	es: '/tour/video/tour-es.vtt',
	en: '/tour/video/tour-en.vtt',
};

// Local covers (public/tour/, precached by the SW): the video is not requested until the user presses play.
export const INTERFACE_TOUR_COVER: Readonly<Record<Language, string>> = {
	es: '/tour/tour-es.webp',
	en: '/tour/tour-en.webp',
};

// Presentation video: only an outgoing link to YouTube (mobile block screen).
export const PRESENTATION_ID: Readonly<Record<Language, string>> = {
	es: 'ds6Ui7qB6Yc',
	en: 'MiXzFndPSzI',
};

const watchUrl = (id: string) => `https://youtu.be/${id}`;

export const PRESENTATION_URL: Readonly<Record<Language, string>> = {
	es: watchUrl(PRESENTATION_ID.es),
	en: watchUrl(PRESENTATION_ID.en),
};
