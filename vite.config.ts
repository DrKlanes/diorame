
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tailwindcss from '@tailwindcss/vite';
  import { VitePWA } from 'vite-plugin-pwa';
  import path from 'path';

  export default defineConfig({
    plugins: [
      react(),
      tailwindcss(),
      // PWA Fase 1 — service worker (generateSW). registerType 'prompt': el SW nuevo
      // espera hasta que el usuario confirme (toast en Fase 2). NO skipWaiting automático.
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,   // registro manual en src/pwa.ts (evita doble registro)
        manifest: false,        // YA servimos public/manifest.webmanifest — no duplicar
        workbox: {
          // App-shell + iconos + manifest + fuentes. PNG incluido por los iconos; las
          // texturas grandes (>2 MiB) las excluye el cap default, y además globIgnores
          // explícito. woff2: fuentes self-hosted (@fontsource) → precache para offline.
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}', 'tour/*.webp'],  // covers of the tour modal (offline)
          globIgnores: ['**/welcome-videos/**', '**/texture-*.png', '**/textures/superRiso/**'],
          navigateFallback: '/index.html',   // SPA offline
          navigateFallbackDenylist: [/\/welcome-videos\//, /\/tour\/video\//],  // los .mp4 NUNCA caen al fallback HTML
          cleanupOutdatedCaches: true,       // purga precaches viejos al activar
          // maximumFileSizeToCacheInBytes: default 2 MiB → texturas grandes fuera del PRECACHE
          // (siguen fuera; se cachean por RUNTIME abajo, no por precache).
          runtimeCaching: [
            {
              // Vídeos del welcome (welcome-videos/*.mp4): NetworkOnly → el SW reenvía la
              // petición tal cual (Range header intacto) y devuelve el 206 Partial Content del
              // servidor SIN cachear ni transformar. Resultado: streaming idéntico a sin SW.
              // (Sin esto, las Range requests de <video> que pasan por el fetch handler se
              // rompen → el vídeo se para tras ~1s o descarga a trompicones.) NO cachea: los
              // vídeos siguen bajo demanda, sin offline, por diseño.
              // El vídeo del tour (tour/video/*.mp4, v3.26.108) sigue la misma estrategia.
              urlPattern: /\/(welcome-videos|tour\/video)\/.*\.mp4$/,
              handler: 'NetworkOnly',
            },
            {
              // Texturas grandes (papel/grunge) bundleadas con hash: /assets/texture-paper-XXXX.png
              // y texture-grunge-XXXX.png. El navegador las pide vía new Image().src → el SW
              // intercepta. CacheFirst: tras la 1ª carga ONLINE quedan disponibles OFFLINE.
              // Inmutables (hash en el nombre) → cambio de textura = nueva URL, sin staleness.
              urlPattern: /\/assets\/texture-(paper|grunge)-[\w-]+\.png$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'diorame-textures',
                expiration: {
                  maxEntries: 10,                    // tope anti-crecimiento (LRU evita acumular hashes viejos)
                  maxAgeSeconds: 60 * 60 * 24 * 60,  // 60 días (no caducan de facto; solo techo de higiene)
                },
                cacheableResponse: {
                  statuses: [0, 200],                // 200 normal; 0 por si alguna respuesta opaque
                },
              },
            },
            {
              // Pósters de los vídeos del welcome (public/welcome-posters/N.webp, 6–64 KB, v3.26.89): el primer fotograma
              // que se ve al instante mientras llega el vídeo. Fuera del precache (solo hace falta el del vídeo que toca);
              // CacheFirst: tras la 1ª vez, inmediato y offline. Sin hash: si cambia un vídeo, regenerar su póster con otro nombre.
              urlPattern: /\/welcome-posters\/\d+\.webp$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'diorame-welcome-posters',
                expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Texturas de Super Riso (public/textures/superRiso/*.png, ~1,4 MB): fuera del
              // precache (globIgnores) para no cargarlas a quien no usa el FX; solo las pide el
              // chunk del motor. CacheFirst: tras la 1ª carga, offline. Sin hash en el nombre:
              // si cambian, renombrarlas (o subir el cacheName) para que no se sirvan viejas.
              urlPattern: /\/textures\/superRiso\/[\w-]+\.png$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'diorame-superriso-textures',
                expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'sonner@2.0.3': 'sonner',
        'figma:asset/texture-paper.png': path.resolve(__dirname, './src/assets/texture-paper.png'),
        'figma:asset/texture-grunge.png': path.resolve(__dirname, './src/assets/texture-grunge.png'),
        'figma:asset/logo-symbol.png': path.resolve(__dirname, './src/assets/logo-symbol.png'),
        // 360 px copy of logo-symbol.png (1992 px, 1.6 MB) for the UI: shown at ≤ 120 px wide (v3.26.89)
        'figma:asset/logo-symbol-ui.png': path.resolve(__dirname, './src/assets/logo-symbol-ui.png'),
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      // dior-render.js (the .dior renderer the Super Riso Lab imports cross-origin) is NOT built here: it is a second,
      // self-contained build (vite.dior-render.config.ts, run by `npm run build`), so the Lab never depends on a hashed
      // chunk that the next deploy deletes (v3.26.91; before, a cached dior-render.js imported a chunk that was gone).
    },
    server: {
      port: 3000,
      open: true,
    },
  });