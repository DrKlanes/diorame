
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
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
          globIgnores: ['**/welcome-videos/**', '**/texture-*.png'],
          navigateFallback: '/index.html',   // SPA offline
          navigateFallbackDenylist: [/\/welcome-videos\//],  // los .mp4 NUNCA caen al fallback HTML
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
              urlPattern: /\/welcome-videos\/.*\.mp4$/,
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
          ],
        },
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/texture-paper.png': path.resolve(__dirname, './src/assets/texture-paper.png'),
        'figma:asset/texture-grunge.png': path.resolve(__dirname, './src/assets/texture-grunge.png'),
        'figma:asset/logo-symbol.png': path.resolve(__dirname, './src/assets/logo-symbol.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  });