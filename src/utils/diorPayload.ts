import { cinemaViewForSave } from './cinemaView';
import type { DiorFileMeta } from './projectMeta';
import type { AppState } from '../types/strataTypes';

// The JSON a .dior holds (v3.23.0: out of useSaveLoad so "Save" and "Super Riso ↗" write the same file).
export function buildDiorData(state: AppState, name: string, fileMeta: DiorFileMeta) {
	return {
		meta: fileMeta,
		shapes: state.shapes, palette: state.palette, totalLayers: state.totalLayers,
		isDarkMode: state.isDarkMode, postProcessing: state.postProcessing,
		postProcessingEnabled: state.postProcessingEnabled,
		// Master FX OFF: the flags are all false and the look that was on is the snapshot (v3.20.5).
		fxMasterEnabled: state.fxMasterEnabled, postProcessingSnapshot: state.postProcessingSnapshot,
		hiddenLayers: state.hiddenLayers, locked3DLayers: state.locked3DLayers,
		projectName: name, layerRenderModes: state.layerRenderModes,
		layerGradParams: state.layerGradParams, currentBrushThickness: state.currentBrushThickness,
		brushMode: state.brushMode, tool: state.tool, activePaletteId: state.activePaletteId,
		// A project without a view of its own (nobody has been in CINEMA yet) saves the defaults, not the placeholders.
		...cinemaViewForSave(state), cinematicSpeed: state.cinematicSpeed,
		isHandheldEnabled: state.isHandheldEnabled, handheldIntensity: state.handheldIntensity,
		paletteApplyToAllActive: state.paletteApplyToAllActive,
		paletteApplyToAllSnapshot: state.paletteApplyToAllSnapshot,
		// View state, not undo state — same category as hiddenLayers/locked3DLayers
		// above. Worth persisting: choosing a good CINEMA framing point takes real
		// work now that the picking is accurate (v3.17.17-25), and losing it on
		// reload was real pain, not a theoretical one.
		pointOfInterest: state.pointOfInterest,
	};
}
