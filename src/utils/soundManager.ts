const SOUND_FILES = {
	click:       '/sounds/ui-click.mp3',
	success:     '/sounds/ui-success.mp3',
	brushStroke: [
		'/sounds/ui-brush-stroke.mp3',
		'/sounds/ui-brush-stroke-2.mp3',
		'/sounds/ui-brush-stroke-3.mp3',
		'/sounds/ui-brush-stroke-4.mp3',
		'/sounds/ui-brush-stroke-5.mp3',
		'/sounds/ui-brush-stroke-6.mp3',
	],
	modeSwitch:  '/sounds/ui-mode-switch.mp3',
} as const;

const SOUND_VOLUMES: Record<keyof typeof SOUND_FILES, number> = {
	click:       0.5,
	success:     0.6,
	brushStroke: 0.3,
	modeSwitch:  0.5,
};

export type SoundType = keyof typeof SOUND_FILES;

const audioCache = new Map<SoundType, HTMLAudioElement | HTMLAudioElement[]>();

// Último índice reproducido por tipo — para evitar repetición inmediata
const lastVariantIndex = new Map<SoundType, number>();

let soundsEnabled = false;

export function setSoundsEnabled(enabled: boolean): void {
	soundsEnabled = enabled;
}

export function getSoundsEnabled(): boolean {
	return soundsEnabled;
}

function pickVariant(type: SoundType, count: number): number {
	if (count === 1) return 0;

	const last = lastVariantIndex.get(type) ?? -1;
	let next: number;

	if (last === -1) {
		next = Math.floor(Math.random() * count);
	} else {
		// Elegir entre los (count - 1) restantes, excluyendo el último
		next = Math.floor(Math.random() * (count - 1));
		if (next >= last) next++;
	}

	lastVariantIndex.set(type, next);
	return next;
}

function getAudio(type: SoundType): HTMLAudioElement | HTMLAudioElement[] | null {
	if (typeof window === 'undefined') return null;

	const cached = audioCache.get(type);
	if (cached) return cached;

	try {
		const source = SOUND_FILES[type];
		const volume = SOUND_VOLUMES[type];

		if (Array.isArray(source)) {
			const audios = source.map(src => {
				const audio = new Audio(src);
				audio.preload = 'auto';
				audio.volume = volume;
				return audio;
			});
			audioCache.set(type, audios);
			return audios;
		} else {
			const audio = new Audio(source as string);
			audio.preload = 'auto';
			audio.volume = volume;
			audioCache.set(type, audio);
			return audio;
		}
	} catch (err) {
		console.warn(`[sound] failed to create audio for ${type}:`, err);
		return null;
	}
}

export function playSound(type: SoundType): void {
	if (!soundsEnabled) return;

	const cached = getAudio(type);
	if (!cached) return;

	let audio: HTMLAudioElement;

	if (Array.isArray(cached)) {
		const index = pickVariant(type, cached.length);
		audio = cached[index];
	} else {
		audio = cached;
	}

	try {
		audio.currentTime = 0;
		const playPromise = audio.play();
		if (playPromise) {
			playPromise.catch(() => {
				// Silenciar errores de autoplay / user gesture
			});
		}
	} catch {
		// Silenciar
	}
}

const STORAGE_KEY = 'diorame-sounds-enabled';

export function initSoundsFromStorage(): boolean {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		const enabled = stored === 'true';
		soundsEnabled = enabled;
		return enabled;
	} catch {
		soundsEnabled = false;
		return false;
	}
}

export function persistSoundsPreference(enabled: boolean): void {
	try {
		localStorage.setItem(STORAGE_KEY, String(enabled));
	} catch {
		// Silenciar
	}
}
