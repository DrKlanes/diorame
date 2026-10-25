import type { CinematicType } from '../types/strataTypes';

// First-view CINEMA framing: what a project gets for every view field it does not bring itself (a new project, or a
// file saved without it). Single source for the first CINEMA entry (ControlsV2), LOAD_PROJECT gaps and the save payload.
export const CINEMA_VIEW_DEFAULTS: {
	readonly focalLength: number;
	readonly viewZoomOffset: number;
	readonly layerSpacingFactor: number;
	readonly cinematicType: CinematicType;
} = {
	focalLength: 3840,
	viewZoomOffset: -2500,
	layerSpacingFactor: 1.0,
	cinematicType: 'forward',
};
