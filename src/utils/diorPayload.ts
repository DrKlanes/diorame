import { cinemaViewForSave } from './cinemaView';
import type { DiorFileMeta } from './projectMeta';
import type { AppState } from '../types/strataTypes';

// What a project saves besides its identity: the ONE list of fields a .dior and the autosave both hold
// (v3.26.19; the autosave used to keep its own copy of this list by hand). A new saved field goes here and
// into its reader, LOAD_PROJECT (state/loadProject.ts).
export function buildDiorFields(state: AppState, name: string) {
	return {
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
		// DRAW format guide (v3.25.5): optional, null = no frame. Older apps ignore it.
		format: state.format,
	};
}

// The JSON a .dior holds (v3.23.0: out of useSaveLoad so "Save" and "Super Riso ↗" write the same file).
export function buildDiorData(state: AppState, name: string, fileMeta: DiorFileMeta) {
	return { meta: fileMeta, ...buildDiorFields(state, name) };
}

// What the autosave holds: the same fields, with the project's identity as `meta` (.dior v2: a recovered
// project keeps its projectId and version). No formatVersion, shape count or thumbnail: those belong to a file.
export function buildAutosaveData(state: AppState) {
	return { meta: state.projectMeta, ...buildDiorFields(state, state.projectName) };
}
