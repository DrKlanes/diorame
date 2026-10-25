import { CINEMA_VIEW_DEFAULTS } from '../constants/cinemaView';
import type { AppState } from '../types/strataTypes';

/**
 * The four CINEMA view fields as they go into a `.dior` or the autosave. Until the project has its own view
 * (`cinemaViewInitialized`: opened from a file, or the first CINEMA entry already happened) the state still holds
 * the app's initial placeholders, not a framing anyone chose, so the first-view defaults are written instead.
 */
export function cinemaViewForSave(state: Pick<AppState, 'cinemaViewInitialized' | 'focalLength' | 'viewZoomOffset' | 'layerSpacingFactor' | 'cinematicType'>) {
	if (!state.cinemaViewInitialized) return { ...CINEMA_VIEW_DEFAULTS };
	return {
		focalLength: state.focalLength,
		viewZoomOffset: state.viewZoomOffset,
		layerSpacingFactor: state.layerSpacingFactor,
		cinematicType: state.cinematicType,
	};
}
