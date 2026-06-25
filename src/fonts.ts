// Self-hosted fonts via @fontsource — replaces the Google Fonts CDN <link> tags
// (formerly in index.html + a dynamic <link> injected by StrataCanvas). Importing
// here, at the entry point, registers the @font-face rules and bundles the woff2
// files into build/assets so the service worker can precache them → typography
// works fully offline.
//
// Subset: latin only — Diorame ships EN/ES, both fully covered by the latin subset.
// Other subsets (latin-ext, cyrillic, …) are intentionally omitted to keep the
// precache small; add them here if a future locale needs them.
//
// Weights mirror exactly what was loaded before (no visual change):
//   UI (tokens.ts):        Manrope 400/500/600/700 · Sora 400/600
//   Canvas text fonts:     each used in bold via ctx.font in renderTextShape.ts —
//                          400 + 700 self-hosted (Bangers is single-weight 400).

// --- UI (design-system/tokens.ts) ---
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/sora/latin-400.css';
import '@fontsource/sora/latin-600.css';

// --- Canvas text fonts (renderTextShape.ts) ---
import '@fontsource/inter/latin-400.css';          // pharma (default)
import '@fontsource/inter/latin-700.css';
import '@fontsource/courier-prime/latin-400.css';  // noir
import '@fontsource/courier-prime/latin-700.css';
import '@fontsource/cinzel/latin-400.css';         // mansion
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/bangers/latin-400.css';        // comic (single weight)
import '@fontsource/inknut-antiqua/latin-400.css'; // dungeons
import '@fontsource/inknut-antiqua/latin-700.css';
