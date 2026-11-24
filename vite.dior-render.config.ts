import { defineConfig } from 'vite';
import path from 'path';
import app from './vite.config';

// Second build of `npm run build` (v3.26.91): https://diorame.dumaker.com/dior-render.js, the .dior renderer the Super Riso
// Lab imports cross-origin (contract: src/dior-render.ts, REFERENCE.md §8). ONE self-contained file at a fixed name: no
// import of a hashed chunk, so a copy cached by the browser or the CDN keeps working after the next deploy deletes the
// old chunks. Its only external files are the paper texture and the text fonts (assets/ with content hashes, the same
// files the app build emits). tools/build-guards/check-build.mjs fails the build if this stops being true.
//
// Super Riso stays out: renderDior draws with every FX off, so its lazy engine (superRiso/flag.ts → applySuperRiso) is never
// asked for; inlined, its module body would load /textures/superRiso/*.png from the page's origin (the Lab's) at import.
// The stub is what DRAW sees when the engine is unavailable.
const SUPER_RISO_STUB = '\0dior-render:super-riso-stub';

export default defineConfig({
	resolve: app.resolve,
	plugins: [{
		name: 'dior-render-without-super-riso',
		enforce: 'pre',
		resolveId(source, importer) {
			if (source === './applySuperRiso' && /[\\/]superRiso[\\/]flag\.ts$/.test(importer ?? '')) return SUPER_RISO_STUB;
			return null;
		},
		load(id) {
			if (id === SUPER_RISO_STUB) return 'export const applySuperRiso = () => false;\nexport const beginSuperRisoFrame = () => {};\n';
			return null;
		},
	}],
	publicDir: false,
	build: {
		target: 'esnext',
		outDir: 'build',
		emptyOutDir: false,
		rollupOptions: {
			input: { 'dior-render': path.resolve(__dirname, 'src/dior-render.ts') },
			preserveEntrySignatures: 'strict',
			output: {
				entryFileNames: 'dior-render.js',
				assetFileNames: 'assets/[name]-[hash][extname]',
				inlineDynamicImports: true,
			},
		},
	},
});
