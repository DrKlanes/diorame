// Vitest (Phase 1 of the refactor, v3.26.7): the safety net for the reducer and the pure stroke
// generators. Its own config on purpose: only `resolve.alias` is inherited from vite.config.ts,
// so the PWA plugin, Tailwind and the two build entries never run here. Node environment: the
// reducer and the generators need neither DOM nor canvas. What it covers: REFERENCE.md §10, «Tests».
import { defineConfig } from 'vitest/config';
import type { UserConfig } from 'vite';
import viteConfig from './vite.config';

export default defineConfig({
	resolve: { alias: (viteConfig as UserConfig).resolve?.alias },
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
	},
});
