# Diorame — Architecture Guidelines

## Golden Rules

1. **No new code in StrataCanvas.tsx.** This file is a frozen monolith (~3200 lines). Only _extract_ code out of it; never add lines to it.
2. **Max 400 lines per file.** If a new file approaches this limit, split it before continuing.
3. **Tabs for indentation.** The entire codebase uses tabs. Never mix in spaces.

## Where to Put New Code

| Type of code | Target location | Example |
|---|---|---|
| Pure data / constants | `/components/strata/<name>.ts` | `pixelArtPalettes.ts` |
| Reusable logic / helpers | `/components/strata/hooks/use<Name>.ts` or `/components/strata/utils/<name>.ts` | `useCanvasGestures.ts`, `projectionMath.ts` |
| UI sub-components | `/components/strata/<Name>.tsx` | `LayersPanel.tsx`, `ToolOptionsPanel.tsx` |
| Shared types | `/components/strata/StrataContext.tsx` (existing) or a dedicated `types.ts` if it grows | — |

## Extracting from StrataCanvas (incremental strategy)

* Identify a self-contained block (e.g., gesture handling, pixel-art post-processing, SVG export).
* Create a new file following the table above.
* Import into StrataCanvas replacing the inline code.
* Verify the app compiles and behavior is identical before moving on.
* Leave a one-line comment at the extraction point: `// Extracted to <filename>`.

## Editing StrataCanvas (when you must)

The file uses tab indentation which breaks multi-line diffs in most AI editing tools. Follow these rules:

* Use **short, unique anchors** — match 1-3 lines of distinctive context, avoid leading whitespace in search strings.
* Prefer single-line edits or very small blocks (< 5 lines).
* When a search string matches multiple locations (live code + dead code inside `/* */` blocks), include surrounding context from _before_ the block to disambiguate.
* Never reformat or re-indent existing lines.

## Protected Behaviors (do NOT modify)

* Eraser tool logic
* Draw Inside / Draw Behind compositing
* Clipping / composition / rendering pipeline
* `hiddenLayers` is excluded from undo/redo

## Versioning

* `APP_VERSION` lives in `StrataContext.tsx`.
* Bump it (semver) on any user-facing change or structural refactor.
* Current version: **1.9.0**

## General

* Use `sonner@2.0.3` for toasts.
* Use `figma:asset/...` for raster image imports (no path prefix).
* SVGs go in `/imports` and use relative paths.
* Prefer `readonly` types for extracted constant data (arrays, palettes, matrices).
