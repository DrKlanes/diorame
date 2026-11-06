import { DIOR_ACCEPT } from './projectMeta';

// iPhone / iPad / iPod, and iPadOS 13+ Safari (which reports itself as a Macintosh with a touch screen).
export function isAppleTouchWebKit(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

// `accept` for the .dior open inputs. iOS WebKit maps `accept` to UTIs: ".dior" has none, and next to ".json"
// only .json stays selectable (.dior greyed out). "*/*" greys out everything, so there it goes without `accept`
// and the content is validated after the pick.
export const diorAccept = (): string | undefined => (isAppleTouchWebKit() ? undefined : DIOR_ACCEPT);
