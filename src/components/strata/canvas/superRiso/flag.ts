// Super Riso — spike C1 gate. The ONLY Super Riso file renderPipeline imports statically.
//
// Without ?superriso=1 in the URL nothing else is loaded: the engine lives in a dynamic-import
// chunk, so no WebGL context is ever created and getSuperRiso() stays null, which makes the
// pipeline take exactly the same path as before.

type SuperRisoModule = typeof import('./applySuperRiso');

let loaded: SuperRisoModule | null = null;

const enabled = typeof window !== 'undefined'
	&& new URLSearchParams(window.location.search).get('superriso') === '1';

if (enabled) {
	import('./applySuperRiso')
		.then(m => { loaded = m; })
		.catch(e => console.warn('[SuperRiso] module failed to load; disabled for this session', e));
}

export function getSuperRiso(): SuperRisoModule | null {
	return loaded;
}
