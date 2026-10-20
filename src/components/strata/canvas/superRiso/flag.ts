// Super Riso — lazy loader. The ONLY Super Riso file renderPipeline imports statically.
//
// The engine lives in a dynamic-import chunk (code, textures, WebGL context). Nothing is loaded
// until the pipeline asks for it, and it only asks when postProcessingEnabled.superRiso is true:
// the first frame after the user switches it on, or after a .dior / autosave that has it on is
// loaded. Until the chunk arrives getSuperRiso() returns null and frames go out without it.

type SuperRisoModule = typeof import('./applySuperRiso');

let loaded: SuperRisoModule | null = null;
let started = false;

export function getSuperRiso(): SuperRisoModule | null {
	if (!started) {
		started = true;
		import('./applySuperRiso')
			.then(m => { loaded = m; })
			.catch(e => console.warn('[SuperRiso] module failed to load; disabled for this session', e));
	}
	return loaded;
}

let webgl2: boolean | null = null;

/** Throwaway probe, run when the user tries to switch Super Riso on (never at startup). */
export function isWebGL2Available(): boolean {
	if (webgl2 === null) {
		try {
			const gl = document.createElement('canvas').getContext('webgl2');
			webgl2 = !!gl;
			gl?.getExtension('WEBGL_lose_context')?.loseContext();
		} catch {
			webgl2 = false;
		}
	}
	return webgl2;
}
