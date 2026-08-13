# Diorame — Project Reference Document

**Version**: 3.12.0
**Last Updated**: Agosto 2026
**Audience**: Designers, developers, and human collaborators.
**Purpose**: Product and UX reference for Diorame. Covers feature design, tool behavior, visual philosophy, and architecture rationale.
For AI collaboration instructions (architecture rules, coding conventions, workflow), see **CLAUDE.md** in the repo root.

---

## 1. Project Overview

**Diorame** is a web-based Risograph-style art tool that bridges 2D drawing with 3D spatial depth. It allows artists to create layered illustrations where each layer occupies a distinct Z-depth, enabling parallax effects and cinematic camera movements.

### What Diorame Is
- A stress-free 2D drawing tool with automatic 3D transformation
- A Risograph-inspired creative environment with fixed palettes and texture overlays
- A cinematic preview system for exploring depth and parallax
- A performance-focused canvas renderer optimized for smooth interaction

### What Diorame Is NOT
- A professional vector editor (not Illustrator, not Figma)
- A photo manipulation tool
- A general-purpose 3D modeling application
- A complex animation suite

### Core Problem It Solves
Traditional drawing tools are flat. Diorame lets you sketch freely in 2D, then instantly experience your work in a 3D parallax environment — no manual positioning, no rigging, just draw and view.

---

## 2. Core Principles (Non-Negotiable)

These principles are the foundation of every decision:

1. **Simplicity Over Features**
   Every feature must justify its existence. Complexity is rejected by default.

2. **Performance Is Sacred**
   The canvas must remain fluid and responsive. Stuttering, lag, or frame drops are deal-breakers.

3. **Predictable Behavior**
   Tools should behave the same way every time. No hidden states, no confusing interactions.

4. **Artistic Expressivity**
   Riso-inspired aesthetics, texture-first rendering, and organic line quality are central to the identity.

5. **Stability Over Innovation**
   A stable baseline is more valuable than experimental features. New functionality must not break existing workflows.

6. **Incremental Evolution**
   Changes must be small, testable, and reversible. Big rewrites are forbidden.

7. **Transparency in UX**
   Users should always know what mode/tool/layer they're in. No guesswork.

---

## 3. Visual & UX Philosophy

### Aesthetic Identity
- **Risograph Print Style**: Flat colors, grain texture, ink imperfection
- **Minimalist UI**: Clean, uncluttered, single-column palettes
- **Texture-First Rendering**: Paper texture, riso halftone, grunge overlays
- **Organic Line Quality**: Tapered strokes, fluid curves, hand-drawn feel

### UX Approach
- **Zero Onboarding Friction**: The welcome modal is dismissible immediately; an onboarding overlay appears on the empty canvas and auto-dismisses once drawing begins
- **Keyboard-First Shortcuts**: Power users should never need to reach for the mouse
- **Instant Feedback**: Every action reflects immediately on canvas
- **No Hidden Modes**: Active tool, layer, and modifiers are always visible in the top-right indicator

### Color & Typography
- **Fixed Palettes**: 24 colors per palette (Primary, Alternative). No custom colors.
- **Palette Consistency**: Switching palettes re-maps shapes by index, preserving composition
- **UI Theme**: Light mode only. Soft grays, minimal shadows, clean typography (Manrope font family)

---

## 4. Tooling & Modes

### Drawing Tools
1. **Blob** (Internal: `blob`)
   - Pressure-sensitive blob tool
   - Creates filled shapes from stroke paths
   - Supports symmetry, draw-inside, draw-behind modes

2. **Brush** (Internal: `brush`)
   - Stroke-based drawing with three modes:
     - **Tapered**: Variable width, natural taper at ends (sine-arch profile)
     - **Uniform**: Consistent width, smooth curves (densified + multi-pass smoothing)
     - **Ink**: Organic, hand-drawn feel with deterministic noise-based wobble, width variation, rough ink-bleed edges, and round end caps
   - Adjustable thickness (1-100)
   - Per-layer brush settings: thickness and mode are saved per layer and restored when switching layers
   - Supports organic/fluid mode for more randomness

3. **Eraser**
   - Removes strokes from the current layer
   - Clipping-based rendering (not destructive)

4. **Text**
   - 5 custom fonts: Noir, Mansion, Pharma, Comic, Dungeons
   - Alignment: Left, Center, Right
   - Click to place, type, commit with Enter or click away

5. **Move**
   - Transform entire layers (translate, rotate, scale)
   - Bounding box with corner handles
   - Flip buttons overlay (horizontal / vertical) appear near the bounding box
   - Disables all drawing modifiers when active

### Drawing Modes & Modifiers
- **Symmetry** (Shift + S): Horizontal mirroring across canvas center
- **Draw Inside** (Shift + I): Alpha-lock mode (draw only where existing shapes exist)
- **Draw Behind** (Shift + B): Draw behind existing shapes on the same layer
- **Organic/Fluid** (Shift + O): Adds subtle randomness to blob strokes

### Operational Modes
1. **DRAW Mode** (Shortcut: D)
   - 2D orthographic view
   - Camera locked to active layer
   - Zoom and pan controls for precision
   - All drawing tools available

2. **VIEW Mode** (Shortcut: V)
   - 3D perspective with parallax
   - Orbital camera controls (click-drag to orbit)
   - Post-processing effects enabled
   - Drawing tools disabled
   - UI can be hidden (Shift + H)

---

## 5. Color System

### Palette Structure
- **2 Fixed Palettes**: Primary (default), Alternative — switchable via `SET_ACTIVE_PALETTE` action
- **24 Colors Each**: Organized in 3 rows of 8 colors
- **No Custom Colors**: Artists must work within constraints (part of the Riso philosophy)

### Palette Behavior
- **Index-Based Mapping**: Shapes store color by palette index, not hex value
- **Palette Switching**: Changing palettes re-colors all shapes based on their index
- **Gradient Mode**: Optional per-layer gradient overlay with configurable parameters:
  - **Gradient Type**: Solid-to-solid or Solid-to-transparent (fade)
  - **Gradient Angle**: Configurable direction in degrees (default 90 - vertical)
  - **Gradient Intensity**: Adjustable strength (0-1)
  - Per-layer gradient params are stored independently via `layerGradParams`

### Color Philosophy
Constraints breed creativity. Fixed palettes force intentional color choices and maintain the Riso print aesthetic.

---

## 6. Layers & Depth

### Layer System
- **Maximum 10 Layers** (`MAX_LAYERS = 10`)
- **Depth Step**: 150 units per layer (`BASE_DEPTH_STEP`)
- **Layer 0 (Front)** -> **Layer 9 (Back)**
- Layers are created on-demand (next layer created when you navigate forward from the last layer)

### Layer Operations
- **Reorder**: Move layers up/down in the stack (swaps all shapes between layers)
- **Duplicate**: Clone all shapes from a layer into a new adjacent layer (respects `MAX_LAYERS` limit)
- **Delete**: Remove a layer and all its shapes (re-maps remaining layers to close gaps)
- **Flip**: Mirror all shapes on a layer horizontally or vertically around the layer's bounding box center
- **Per-Layer Settings**: Each layer stores its own render mode (flat/grad), gradient params, and brush settings (thickness + line mode)

### Layer Creation Semantics (v2.9.3+)

Two distinct actions create layers — they are **not** interchangeable:

| Action | Trigger | Behavior |
|---|---|---|
| `ADD_LAYER` | "+" button in Layers Panel | Always creates a new layer **above the active layer**, shifting indices. Does not navigate. |
| `NEXT_LAYER` | `]` key | Navigates to the next layer. Creates a new layer only when already on the last layer. |

### 3D Depth & Parallax
- **DRAW Mode**: Orthographic, no parallax (camera at active layer Z)
- **VIEW Mode**: Perspective projection, full parallax based on layer depth
- **Layer Spacing Factor**: Adjustable multiplier (0.00-2.00) to compress/expand depth; value of 0 produces a flat 2D visualization

### 3D Lock (Per-Layer)
- Layers can be "locked" in 3D space
- Locked layers maintain their world position during camera movements
- Useful for foreground/background elements that should stay fixed

### Layer Visibility
- Layers can be hidden individually
- Hidden layers are not rendered or exported
- Useful for composition planning and final output control

---

## 7. Views & Navigation

### DRAW Mode (2D)
- **Purpose**: Focused drawing experience
- **Camera**: Locked to active layer, no parallax
- **Controls**:
  - Scroll Wheel: Zoom in/out
  - Middle Mouse + Drag: Pan
  - Pinch/Spread (Touch): Zoom
  - Two-Finger Drag (Touch): Pan
- **Tools**: All drawing tools available
- **Layer Navigation**: `[` and `]` keys to switch layers

### VIEW Mode (3D)
- **Purpose**: Cinematic preview and composition evaluation
- **Camera**: Free orbit, full parallax
- **Controls**:
  - Click + Drag: Pan camera
  - Shift + Drag: Orbit camera
  - Scroll Wheel / MMB: Zoom in/out
  - Arrow Keys: Manual camera pan
  - Double-Click: Set Point of Interest (camera focus target)
- **Touch Controls**: 1-finger pan, 2-finger orbit, pinch zoom
- **Cinematic Moves**: 11 preset camera animations (Forward, Spiral, Yoyo, Pulse, Twist, Arc, Crane, Truck, Orbit, Zoom, Storytelling)
- **Speed Control**: Adjustable cinematic speed (0.1-1.0)
- **Handheld Shake**: Optional camera shake (Low, Medium, High)

### Depth of Field (DoF) System
- **Two Focus Modes**:
  1. **FREE Mode** (Default): Manual focus distance slider
  2. **LOCK TO LAYER Mode**: Focus dynamically tracks a specific layer during camera movement
- **Layer Picker Behavior**:
  - In FREE mode: Acts as "one-shot focus" (sets focus to layer Z, no tracking)
  - In LOCK mode: Enables dynamic tracking (focus follows layer as camera moves)
- **Focus Distance**: Adjustable manually in FREE mode
- **DoF Intensity**: Adjustable blur amount (0-1)

---

## 8. Project Persistence

### Save / Load (.dior format)
- **Save**: Serializes project state to a `.dior` file (JSON) and triggers a browser download
  - Serialization uses `setTimeout` deferral to avoid blocking the main thread's click handler path
  - Canvas is refocused after download to prevent stuck pointer/keyboard state
  - Saved data includes: shapes, palette, layers, dark mode, post-processing settings, hidden/locked layers, project name, per-layer render modes, gradient params, brush settings, line mode, active palette ID
- **Load**: Reads `.dior` files via `FileReader`, validates structure, and dispatches `LOAD_PROJECT`
  - File size guard: rejects files larger than 50 MB
  - Triggers fit-to-view on successful load
- **Project Name**: Editable via the UI; sanitized for filename generation

### Export Formats
- **PNG**: Rasterized canvas export
- **WebM / MP4**: Video capture of cinematic camera moves
- **SVG**: Vector export of all visible layers (Cmd/Ctrl + E)
- **SVGZ**: Compressed SVG export (Cmd/Ctrl + Shift + E)
- **Complexity Warning**: SVG/SVGZ exports with more than 800 shapes trigger a confirmation dialog
- **Export Progress**: Visual progress indicator overlay during video exports
- **Download sink (all formats)**: every export downloads through `utils/downloadBlob.ts` — blob URL + hidden anchor appended to the DOM + deferred revoke. Required for iPadOS WebKit, which silently drops `data:` URL downloads, detached-anchor clicks, and synchronously-revoked object URLs (v3.11.1). New export formats MUST use this helper.

---

## 9. Performance Guidelines

Performance is a first-class concern. Any change that degrades performance is rejected.

### Optimization Rules
1. **No Redundant Re-Renders**
   - Use `useRef` for animation loop state
   - Minimize state updates during drawing
   - Throttle draw events to ~120 fps max

2. **Reuse Canvas Buffers**
   - Offscreen canvases are reused, not recreated
   - Avoid GC thrashing with persistent refs

3. **Batch Shape Operations**
   - Shapes are cached by Z-index
   - Sorted Z-indices are pre-computed
   - Avoid per-frame sorting

4. **Limit History Size**
   - Maximum 50 undo/redo steps (`MAX_HISTORY_STEPS`)
   - Older history is trimmed automatically

5. **Throttle Expensive Effects**
   - Post-processing is skipped during drawing
   - Texture loading is deferred until needed

6. **Mobile Optimization**
   - Mobile devices are blocked by design (tablet+ only)
   - Touch events use native listeners for palm rejection
   - Pinch-to-zoom is hardware-accelerated

7. **Canvas Recovery** (implemented v3.10.10)
   - `useCanvasRecovery(onRecover)` hook listens to `visibilitychange` + `pageshow`
   - Calls `onRecover` ONLY when the document returns to `visible` — never on the way to hidden (a live gesture on return is necessarily orphaned; resetting on hidden would kill legitimate strokes)
   - In StrataCanvas, `onRecover` is `resetGestureState`: clears `gestureRef.isPinching`/`isOrbitTouch`, `isPanningRef`, `isDrawingRef` (+ `SET_DRAWING_ACTIVE` dispatch), `currentPointsRef`, `drawingPointerTypeRef`, and releases any orphaned pointer capture (try/catch)
   - The canvas `onPointerCancel` is bound directly to `resetGestureState` as a same-frame safety net (discards the interrupted stroke rather than committing it)

### Performance Metrics to Preserve
- **Draw Latency**: < 10ms from pointer down to first render
- **Frame Rate**: Consistent 60 fps in DRAW mode, 30+ fps in VIEW mode
- **Memory Usage**: No memory leaks, stable heap over time

---

## 10. Architecture & File Structure

The codebase has been modularized through a multi-phase refactoring (phases 1–5 in v1.11.0; Plan C render pipeline in v3.0.0). Code is organized into four layers: UI components, canvas pipeline modules, shared utilities, and the type system.

### Main Canvas (`src/components/strata/`)

| File | Lines | Purpose |
|---|---|---|
| `StrataCanvas.tsx` | ~1450 | Thin React shell: render loop, event handlers, gesture input. **Frozen** — extract only, never add. |
| `StrataContext.tsx` | ~1800 | React Context + useReducer: app reducer, constants, re-exports all types |
| `ControlsV2.tsx` | ~165 | Thin root compositor for both modes. Mounts all UI atoms; enforces `isUIHidden`; hosts 3 global side-effects (keyboard shortcuts, sessionStorage cleanup, mode-change camera reset). |

**Drawing mode atoms (`topbar/`, `bottombar/`, `layers/`, `colorpalette/`, `drawing/`, `viewport/`, `text/`):**

| File | Purpose |
|---|---|
| `topbar/TopBar.tsx` | Three-column grid (auto/1fr/auto): DocumentPill left · ModeSwitchPill + AnimationPlayerUI center · ExportPill + ThemeTogglePill right. `useIsStandalone` paddingTop for iOS standalone safe-area |
| `topbar/DocumentPill.tsx` | Transversal (both modes): new / open / save .dior + project name + undo/redo (DRAW only) + info |
| `topbar/ExportPill.tsx` | Context-sensitive export popover: SVG/SVGZ (DRAW) · PNG/MP4/GIF/PNG-seq with sub-options (CINEMA) |
| `topbar/ProjectNameButton.tsx` | Inline-editable project name; fixed-width pill to prevent layout shift on edit |
| `topbar/InfoButton.tsx` | Opens welcome modal (`TOGGLE_WELCOME_MODAL`); shortcut Shift+? |
| `topbar/AnimationPlayerUI.tsx` | Collapsible animation pill: bounce toggle + play/pause + frame nav + X/N counter + FPS (4/6/8) + loop/ping-pong + onion skin (DRAW) + zero-Z depth toggle (CINEMA) |
| `topbar/ModeSwitchPill.tsx` | DRAW / VIEW / hide-UI mode toggle |
| `topbar/ThemeTogglePill.tsx` | Light/dark paper toggle |
| `bottombar/BottomBar.tsx` | Slot router: DrawingToolbar (draw) / CameraBar (view) |
| `bottombar/DrawingToolbar.tsx` | 5-tool selector + modifiers + LineModeButton (line tool) |
| `bottombar/CameraBar.tsx` | Camera presets + speed + sliders; responsive desktop/tablet layout |
| `layers/LayersPanel.tsx` | Layer management (collapsed pill + expanded panel) with dnd-kit drag-reorder |
| `layers/LayerRow.tsx` | Per-layer row: Empty/Flat/Grad/Fade chip, visibility, 3D lock |
| `layers/LayerDotsRail.tsx` | Dot indicator rail, inline or fixed |
| `colorpalette/ColorPalette.tsx` | Palette panel: header + gradient controls + swatch grid |
| `drawing/ToolOptionsPanel.tsx` | Line thickness + mode overlay (line tool only) |
| `viewport/ResetViewPill.tsx` | Reset drawingZoom/Pan to defaults (draw mode) |
| `text/TextSessionPanel.tsx` | Text input overlay: fonts, textarea, align, confirm/cancel |
| `fx/FXPanel.tsx` | FX panel (VIEW mode): 12 effects in 3 groups, master toggle FXMasterBtn, snapshot/restore. All effects work on every browser since 3.12.0 (no capability gate) |
| `fx/FXRow.tsx` | Per-effect row: toggle + slider/discrete/composite control |

**Modals (`modals/`):** ClearCanvasAlertV2, ComplexSceneModalV2, WelcomeModalV2, OnboardingOverlayV2, ExportProgressV2, MobileBlockScreenV2 + shared DiModal primitives

**Popovers (`popovers/`):** DiSelectorPopover + DiSelectorOption

### Canvas Pipeline (`src/components/strata/canvas/`)

| File | Lines | Purpose |
|---|---|---|
| `blurCompat.ts` | ~100 | `applyBlurCompat`: Gaussian-approx blur via iterative downscale/upscale `drawImage` — the ctx.filter-free path used by Glow/DoF on WebKit/iPadOS |
| `cinematicCamera.ts` | ~290 | `computeCinematicTick`: all 11 camera modes (Forward, Spiral, Yoyo, Pulse, Twist, Arc, Orbit, Crane, Truck, Zoom, Storytelling) + handheld shake, returns new camera state |
| `composeLayer.ts` | ~105 | Layer compositing to offscreen buffer (pixel art + fog/glow/DoF) |
| `drawBackground.ts` | ~50 | Canvas background rendering (paper texture, dark mode) |
| `drawGizmo.ts` | ~240 | Move tool gizmo handles + flip overlay buttons (incl. side-bar handles for squash & stretch) |
| `drawSymmetryAxis.ts` | ~30 | Symmetry axis line rendering |
| `exportHandlers.ts` | ~600 | `exportAsPNG`, `exportAsSVG`, `exportAsMP4`: all export logic |
| `PixelArtProcessor.ts` | ~175 | Pixel art post-processing: downscale, palette quantization, Bayer dithering |
| `postProcessing.ts` | ~430 | 8 effects: `applyFog`, `applyGlow`, `applyDoFBlur`, `applyRisoV2` (4-pass), `applyChromaticAberration`, `applyVignette`, `applyGrain`, `applyGrunge`. Glow/DoF pick native `ctx.filter` or `blurCompat` per browser |
| `quantizePixelArtCamera.ts` | ~100 | Snaps camera to pixel grid for pixel art mode |
| `renderEraserShape.ts` | ~30 | Eraser shape rendering (destination-out compositing) |
| `renderLayerBody.ts` | ~440 | Per-layer renderer: `renderLayer(z, rc, offCtx, pfc)` |
| `renderLiveStroke.ts` | ~150 | In-progress live stroke rendering |
| `renderParticles.ts` | ~100 | Floating cinematic particles rendering |
| `renderPipeline.ts` | ~565 | Frame orchestrator: `renderFrame(ctx, rc: RenderContext)` — accepted oversize (see §12) |
| `renderRegularFillShape.ts` | ~95 | Regular fill shapes (blob / tapered brush) |
| `renderTextShape.ts` | ~175 | Text shape rendering with font + alignment |
| `renderUniformLineShape.ts` | ~160 | Uniform-mode brush stroke rendering |
| `transformPoint.ts` | ~130 | `createTransformPoint` factory for 3D projection |
| `transformUtils.ts` | ~135 | `getLayerBoundingBox`: pixel-accurate bounding box for Move tool gizmo |
| `moveGizmoInteraction.ts` | ~150 | `hitTestGizmo`, `computeMoveTransform`: Move tool hit-testing + transform math (translate/rotate/scale uniform + scaleX/scaleY non-uniform for squash & stretch). Pure module extracted from StrataCanvas |
| `animationExportRender.ts` | ~195 | `renderAnimationFrames`: shared frame-by-frame render infrastructure; builds fake `RenderContext` with dedicated canvases per frame, async yield between frames |
| `pngSequenceHandler.ts` | ~100 | `exportAsPNGSequence`: `ImageData[]` → PNG bytes → ZIP via `fflate`; files `{project}_frame_01.png`, ZIP `{project}_frames.zip` |
| `gifHandler.ts` | ~140 | `exportAsGIF`: `ImageData[]` → animated GIF via `gifenc`; per-frame palette quantization, scale presets 1/0.5/0.25, infinite native loop |

### Type System (`src/types/`)

| File | Lines | Purpose |
|---|---|---|
| `strataTypes.ts` | ~170 | All TypeScript interfaces and types: `Point`, `Shape`, `AppState`, `AppMode`, `ToolType`, `HistorySnapshot`, post-processing types, etc. Re-exported from `StrataContext.tsx` for backwards compatibility. |

### Utilities (`src/utils/`)

| File | Lines | Purpose |
|---|---|---|
| `colorUtils.ts` | ~35 | `hexToHSL`, `hslToHex`, `getVibrantVariant`, `hexToRgba` |
| `canvasUtils.ts` | ~30 | `createNoise`, `drawSmoothLine`, `drawStraightLine` |
| `strokeGenerators.ts` | ~295 | `generateTaperedStroke`, `generateUniformStroke`, `generateInkStroke`, `generateStrokeForMode` |
| `animationFrames.ts` | ~80 | `getAnimationFrames`, `isLayerEmpty`, `getOnionGhostZs` — animation frame logic shared by the render pipeline, playback, onion skin, and exports |
| `cinematic.ts` | ~10 | `flToMm`, `mmToFl` — focal-length conversion helpers (FL raw ↔ mm); extracted from legacy ControlsCinematic |
| `keyboardShortcuts.ts` | ~55 | `ShortcutItem`/`ShortcutGroup` types, `formatShortcut`, `isMac`, `hasFinePointer` — shared keyboard shortcut formatting and platform detection |
| `browserCapabilities.ts` | ~55 | `supportsCanvasFilter()` — cached functional detection for `ctx.filter` support (Safari/WebKit silently ignores filter). Consumed by `postProcessing.ts` to route Glow/DoF to `blurCompat` |
| `downloadBlob.ts` | ~25 | `downloadBlob(blob, filename)` — Blob download via hidden appended anchor + deferred cleanup/revoke (iPadOS WebKit drops detached-anchor clicks and sync-revoked URLs); shared by PNG/SVG/MP4/GIF/ZIP export sinks |
| `soundManager.ts` | ~140 | UI sound playback manager: click, success, brush stroke (pool of 6), mode switch via HTMLAudioElement |

### Constants (`src/constants/`)

| File | Lines | Purpose |
|---|---|---|
| `renderConstants.ts` | ~30 | `PARTICLE_COUNT`, `MIN_TOUCH_STROKE_POINTS`, `FOG_DENSITY_FACTOR`, `HANDHELD_SWAY_FREQ`, `HANDHELD_TREMOR_FREQ`, `DOUBLE_CLICK_DELAY`, `RENDER_THROTTLE_MS`, `DRAW_FOCAL_LENGTH`, `NEAR_CLIP` |
| `palette.ts` | ~90 | `PALETTE_PRIMARY`, `PALETTE_ALTERNATIVE` (24 colors each, `{hex, nameKey, isDark}`), `GRADIENT_DEFAULTS`, `DARK_COLORS` — canonical color system, immutable by design |
| `version.ts` | ~5 | `APP_VERSION` — single source of truth for the current release version |
| `project.ts` | ~30 | `UNTITLED_PROJECT_SENTINEL` (`'__UNTITLED__'`) + `getFilenameBase()` — NFD-normalized filename sanitizer for exports and .dior saves |

### Hooks (`src/hooks/`)

| File | Purpose |
|---|---|
| `useAnimationPlayback.ts` | Drives animation playback: `setInterval` at `1000/animationFramerate` ms dispatching `ADVANCE_ANIMATION_FRAME`; invoked in `ControlsV2` |
| `useAutoSave.ts` | Periodic auto-save of the project |
| `useBeforeUnload.ts` | Warns before closing if there are unsaved changes |
| `useCanvasRecovery.ts` | Calls `onRecover` on `visibilitychange → visible` + `pageshow` to clean up orphaned gesture state after backgrounding; never fires on hidden (see §9.7) |
| `useExportFlow.ts` | SVG/SVGZ complexity gate: checks visible shape count against 800-shape threshold before dispatching `REQUEST_EXPORT`; shows `ComplexSceneModalV2` on overflow |
| `useIsMobile.ts` | Mobile device detection via `matchMedia` |
| `useIsStandalone.ts` | Reactive PWA standalone detection: combines `matchMedia('(display-mode: standalone)')` + legacy `navigator.standalone`; used by `TopBar` for iOS safe-area paddingTop |
| `useKeyboardShortcuts.ts` | All global and drawing-mode keyboard shortcuts |
| `useLoadExampleScene.ts` | Fetches, parses, and dispatches the example `.dior` scene |
| `useSaveLoad.ts` | Save and load projects from IndexedDB (idb-keyval) |

### Render Pipeline Architecture

**Pattern: "caller orchestrates, modules are pure"**

- `StrataCanvas.tsx` — manages the React lifecycle and refs. Calls `renderFrame(ctx, buildRenderContext())` on every animation frame.
- `renderPipeline.ts` — pure orchestrator. Receives `RenderContext`, sequences all render phases, never touches React refs or closures directly.
- `canvas/*.ts` modules — pure functions receiving typed parameters. Never import React hooks or access component state directly.

**Core types exported by `renderPipeline.ts`:**

| Type | Purpose |
|---|---|
| `RenderContext` | Bundle of all refs, state snapshots, frame-persistent refs, canvas refs, and overrides |
| `PerFrameComputed` | Values computed once per frame and shared across all layer render calls |
| `TransformRefState` | Per-ref transform state for the current frame |

**RenderContext overrides:**

| Override | Effect |
|---|---|
| `renderZsOverride?` | Forces an alternative layer order (used by Move tool) |
| `skipLiveStroke?` | Omits live stroke rendering |
| `skipCinematicOverlays?` | Omits particles and cinematic overlays |

**5 frame-persistent refs in StrataCanvas:**
`accumulatedTimeRef`, `accumulatedHandheldTimeRef`, `lastTimeRef`, `wiggleFrameRef`, `shapePatternRef` — migrated from `let` in useEffect closure to component-level `useRef` in v3.0.0.

**`renderFrame` phase sequence:**
throttle → quantize cam → FL/focus → buffers → background → viewport → layer loop → post-processing → overlays → cinematic tick

---

## 11. What NOT To Do

This section is critical. These actions are **forbidden**:

### Code Changes
- **No New Code in StrataCanvas.tsx**: Only extract code out; never add lines
- **No Large Refactors**: Do not rewrite entire files or systems
- **No Speculative Optimization**: Only optimize proven bottlenecks
- **No Experimental Features**: Every feature must be justified and tested
- **No Dependency Bloat**: Avoid adding new libraries unless absolutely necessary
- **No Breaking Changes**: Existing behavior must remain identical

### Protected Behaviors (do NOT modify)
- Eraser tool logic
- Draw Inside / Draw Behind compositing
- Clipping / composition / rendering pipeline
- Undo/redo follow the HYBRID contract (v3.11.3): brush/palette selectors display document properties — when changing them restyled/remapped shapes it is a content op (undo step; selector travels with undo/redo), when it changed nothing it is a pure selection (no step; last-writer-wins onto the current snapshot). `hiddenLayers` and `locked3DLayers` are pure view state, never in `HistorySnapshot`. Do not revert to the 3.7.3 (always-travel) or 3.11.2 (never-travel) models — both failed in production

### UX Changes
- **No Hidden Complexity**: Every interaction must be transparent
- **No Mode Confusion**: Users should always know what mode they're in
- **No Inconsistent Shortcuts**: Keyboard shortcuts must be memorable and conflict-free
- **No Palette Bloat**: Do not add more than 2-3 palettes

### Performance Violations
- **No Frame Drops**: Changes that cause stuttering are reverted
- **No Synchronous Heavy Operations**: Use async/deferred for file I/O, exports, etc.
- **No Unbounded Memory Growth**: History, particles, and caches must have limits

### Visual Violations
- **No Dark Patterns**: UI must be honest and straightforward
- **No Cluttered UI**: Less is more — every UI element must earn its space
- **No Accessibility Regressions**: Tooltips, shortcuts, and focus states must remain functional

---

## 12. Collaboration Rules

### How to Propose Changes
1. **Start with "Why"**: Explain the problem being solved
2. **Show, Don't Tell**: Provide mockups, examples, or prototypes
3. **Measure Impact**: Quantify performance, UX, or visual improvements
4. **Respect the Baseline**: Changes must not break existing functionality

### Change Workflow
1. **Small Commits**: One logical change per commit
2. **Incremental Testing**: Test after every small change
3. **Reversibility**: Changes must be easy to undo if issues arise
4. **Conservative Cleanup**: Only remove obvious dead code, unused imports, etc.

### Acceptable Change Categories
- **Bug Fixes**: Correct broken behavior
- **Performance Wins**: Proven optimizations with benchmarks
- **UX Polish**: Small tweaks that improve clarity or efficiency
- **New Tools/Features**: Justified additions that fit the philosophy
- **Accessibility**: Improvements to keyboard nav, tooltips, focus states
- **Extractions**: Moving self-contained blocks out of StrataCanvas into dedicated files

### Unacceptable Change Categories
- **Rewrites**: "Let's rebuild this from scratch"
- **Bikeshedding**: Arguing over trivial naming or formatting
- **Scope Creep**: "While we're at it, let's also add..."
- **Aesthetic Overhauls**: Changing the visual identity without justification

### Code Review Standards
- **Performance First**: If it slows down, it doesn't ship
- **Behavior Preservation**: Existing workflows must work identically
- **Clarity Over Cleverness**: Readable code beats clever code
- **Documentation**: Complex logic requires inline comments
- **Max 400 lines per file**: Split before exceeding
- **Tabs for indentation**: Never mix spaces

### Architectural Exceptions (400-line rule)

| File | Lines | Reason |
|---|---|---|
| `src/components/strata/StrataCanvas.tsx` | ~1450 | Legacy monolith — subject of ongoing extraction (Plan C). Never add to it. |
| `src/components/strata/canvas/renderPipeline.ts` | ~565 | Frame orchestrator. Accepted oversize: its purpose is to sequence all render sub-modules in the correct order. Splitting into smaller files would fragment the orchestration logic without reducing real complexity. |

---

## 13. Animation System

**Added**: v3.1.0 (core in DRAW) → v3.7.0 (all four exports complete).

### Conceptual Model

Animation is a **toggle inside DRAW mode**, not a separate mode. Activating it via `TOGGLE_ANIMATION_MODE` enters a frame-by-frame session while remaining in DRAW.

- **Frames** = non-empty, non-hidden layers. `getAnimationFrames(state)` is the canonical function: iterates `state.totalLayers`, returns indices where at least one non-eraser shape exists (`isLayerEmpty`) and the layer is not hidden.
- Frame order = layer order: Layer 0 = Frame 1, ascending.
- On entering animation mode, `layerIndexBeforeAnimation` stores the active layer. On exit: playback stops, that layer is restored (clamped to valid range).

### Z Flattening

Z depth is never erased — temporarily flattened in `renderLayerBody.ts` when:

```
isAnimFlat = isAnimationMode && (!isCinematic || isAnimationFlatZ)
```

When `isAnimFlat` is true, `baseZ + shapeZ + camZ` are all zeroed → exact scale 1.0 (`focalLength / focalLength`). When false, real Z depth is used (parallax and DoF as normal).

> **Why all three zeroed, not just `baseZ`**: `camZ` derives from `cameraRef.current.z`, which retains the last cinematic camera value after visiting CINEMA mode. Zeroing only `baseZ` would leave a non-1.0 scale dependent on the user's CINEMA history. Zeroing all three guarantees `dz = 0` → exact scale 1.0 in every scenario.

### CINEMA Animation — Three States

| State | Condition | Render behavior |
|---|---|---|
| Animation OFF | `!isAnimationMode` | All layers in 3D, full parallax, cinematic camera (unchanged) |
| Anim ON + zero-Z OFF | `isAnimationMode && !isAnimationFlatZ` | Current frame at its real Z depth — animation travels through 3D space |
| Anim ON + zero-Z ON | `isAnimationMode && isAnimationFlatZ` | Current frame flattened (2D flipbook); camera and FX still apply |

When `isAnimationFlatZ` is active, focal-length and layer-spacing sliders are disabled in `CameraSlidersZone.tsx` (no effect on a flat scene). Zoom slider remains active; under flat CINEMA `camZ = effectiveCameraZ − currentCamera.z` (= `viewZoomOffset`) gives a non-zero uniform `dz`, enabling the zoom slider to scale the plane (v3.5.1 fix).

> **Why `camZ = viewZoomOffset` instead of 0 under zero-Z**: Setting `camZ = 0` kills the zoom — `dz = 0` → `layerScale = focalLength / focalLength = 1.0` fixed, the zoom slider does nothing. Using `camZ = viewZoomOffset` gives a uniform, non-zero `dz` across all layers (they remain flattened *relative to each other* since `shapeZ = 0` for all), while letting the zoom slider scale the whole plane. `camX`/`camY` are not flattened — the cinematic camera keeps moving in X/Y, which is intentional. Focal-length and layer-spacing are disabled in the UI because they have no effect without relative Z differences between layers; zoom (control distance) does, so it stays enabled.

### Single-Frame Filter

`renderPipeline.ts`: when animation mode is active, `renderZs` is filtered to include only the current frame's Z (the flipbook effect). `renderZsOverride` (Move tool) runs before this filter and is unaffected.

### Playback

- `useAnimationPlayback` hook (`src/hooks/useAnimationPlayback.ts`), invoked in `ControlsV2`: `setInterval` at `1000 / animationFramerate` ms → dispatches `ADVANCE_ANIMATION_FRAME`.
- `ADVANCE_ANIMATION_FRAME` respects `animationPlaybackMode`:
  - **Loop**: wraps last → first.
  - **Ping-pong**: bounces without repeating extremes (1→2→3→2→1→2→3). Governed by `animationDirection (1 | -1)` runtime state.
- Skips empty and hidden layers — only real frames advance.
- `STEP_ANIMATION_FRAME` (payload ±1): used by pill buttons for manual navigation. Wraps circularly, never creates a layer. Intentionally diverges from `NEXT_LAYER`/`PREV_LAYER` (keyboard `[`/`]`) — button = navigate frames, shortcut = build layers.

> **Why the divergence is intentional — do not unify**: The pill frame buttons are *viewing controls* (scroll through the animation, including in CINEMA where creating layers would be wrong). `]`/`[` are *construction tools* (build the frame sequence in DRAW, creating layers at the end up to `MAX_LAYERS`). Unifying them would either break CINEMA (if they created) or remove the ability to grow the animation beyond existing layers (if they never created). The shortcut hint was removed from the button tooltips to avoid implying they match.

### Onion Skin (DRAW only)

Enabled by `isOnionSkinEnabled`. Implemented in `renderPipeline.ts` as an additive pre-pass before painting the active frame:

- `getOnionGhostZs(state)` (in `animationFrames.ts`) → `{ prev, next }` layer indices.
  - Current layer IS a frame → sequence neighbors.
  - Current layer is EMPTY → last frame below the index (prev), first frame above (next). Key use case: drawing a new blank frame while seeing adjacent frames as reference.
- Opacities: `ONION_ALPHA_PREV = 0.40`, `ONION_ALPHA_NEXT = 0.22` (set via `offCtx.globalAlpha`; reset to 1.0 after each ghost). Real color, no tint.
- Does NOT auto-disable during playback (auto-hiding while the toggle reads "on" would appear broken).
- `renderLayerBody.ts` and `composeLayer.ts`: unmodified.

### Animation Player UI

`AnimationPlayerUI.tsx` (`topbar/`) — collapsible pill docked to the right of the mode switch in `TopBar`.

- **Collapsed**: bounce icon only (primary toggle: expand/collapse + animation on/off).
- **Expanded**: bounce · frame-back · play/pause · frame-fwd · X/N counter · FPS selector (4/6/8) · loop/ping-pong toggle · onion skin toggle (DRAW only) · zero-Z depth toggle (CINEMA only).
- Secondary toggles (loop/ping-pong, onion, depth) use `iconWeight="secondary"` for visual hierarchy. All icons at `iconSize=16`.

### Export Infrastructure

All animation exports share `renderAnimationFrames`. Export `useEffect` branches are in `StrataCanvas.tsx`, following the existing export pattern.

**`renderAnimationFrames` (`animationExportRender.ts`)**:
- Dedicated offscreen canvases (main, offscreen, helper, composition, pixel) — no contact with the live RAF.
- Fresh `cameraRef` per frame: the cinematic tick mutates `cameraRef.current`; per-frame fresh refs keep mutations local.
- Renders each frame with the same mode / FX / `isAnimationFlatZ` as the current state. `skipLiveStroke + skipCinematicOverlays` suppress gizmo and particles.
- Async with `setTimeout(0)` yield between frames (UI stays responsive). No RAF pause needed — dedicated canvases, JS single-threaded.

**Video (exportAsMP4, `exportHandlers.ts`)** — when `isAnimationMode`:
- Dynamic duration: `(1000 / framerate) × frameCount × animationExportLoops` (1 | 2 | 3).
- 80ms pre-roll at `frame[0]` before `recorder.start`; stop just before the loop's wrap to avoid a duplicated frame.
- Static 6s recording (`STATIC_RECORD_MS`) unchanged when `isAnimationMode` is false.

**PNG Sequence (`pngSequenceHandler.ts`)**:
- `ImageData[]` → PNG bytes (canvas `toDataURL`) → ZIP via `fflate`.
- Files: `{project}_frame_01.png` (2-digit padding, up to 10 frames). ZIP: `{project}_frames.zip`.

**GIF (`gifHandler.ts`)**:
- `ImageData[]` → animated GIF via `gifenc` (`quantize + applyPalette` per frame).
- `gifExportScale` (1 / 0.5 / 0.25): downscale via temp canvas before encoding.
- GIF delay = `Math.round(1000 / framerate)` ms. `gifenc` expects milliseconds and divides by 10 internally to write centiseconds (1/100 s) to the GIF stream. Passing centiseconds directly was the v3.7.0 bug — it caused a double /10 conversion and GIFs ~10× too fast.
- Infinite native loop (`repeat: 0`). `animationExportLoops` not used (GIF loop extension handles looping; embedding N cycles would balloon file size).
- **Ping-pong**: GIF has no native ping-pong mode. When `playbackMode === 'pingpong'` and `frames.length > 2`, `gifHandler` builds a mirror sequence before encoding: `[1,2,3] → [1,2,3,2]`. The native GIF loop then produces `1→2→3→2→1→...`. PNG sequence remains linear by design.

**Playback safety lock**:
- `isPlaybackLocked = isAnimationMode && isAnimationPlaying` — when true in DRAW mode, all editing is disabled: tools, modifiers, layers, color, mode switch.
- Canvas input is cut via a `position:fixed; z-index:1` overlay rendered in `ControlsV2` (above the canvas at z:0, below all UI panels at z≥50). StrataCanvas was not modified.
- Keyboard shortcuts blocked via guard in `useKeyboardShortcuts`. Animation controls (play/pause, frame-nav via `AnimationPlayerUI` onClick handlers) remain live.

### New Dependencies

| Package | Purpose |
|---|---|
| `fflate` | ~8KB ESM — ZIP encoding for PNG sequence export |
| `gifenc` | GIF encoder: `GIFEncoder`, `quantize`, `applyPalette` |

### Animation State Fields

| Field | Type | Default | Purpose |
|---|---|---|---|
| `isAnimationMode` | `boolean` | `false` | Animation toggle |
| `isAnimationPlaying` | `boolean` | `false` | Playback active |
| `animationFramerate` | `4 \| 6 \| 8` | `6` | Frames per second |
| `animationPlaybackMode` | `'loop' \| 'pingpong'` | `'loop'` | Loop vs. bounce |
| `animationDirection` | `1 \| -1` | `1` | Runtime ping-pong direction (not persisted) |
| `isOnionSkinEnabled` | `boolean` | `false` | Ghost frames in DRAW |
| `isAnimationFlatZ` | `boolean` | `false` | Flatten Z in CINEMA |
| `layerIndexBeforeAnimation` | `number` | `0` | Layer restored on animation exit |
| `animationExportLoops` | `1 \| 2 \| 3` | `1` | Video export loop count |
| `gifExportScale` | `number` | `1` | GIF scale preset (1 / 0.5 / 0.25) |

### StrataCanvas Modifications During the Sprint

- **v3.1.0–v3.4.0**: `StrataCanvas.tsx` was **not modified** (empty diffs confirmed in all four commits).
- **v3.5.0–v3.7.0**: Minimal additions — one `useEffect` export branch per format (MP4, PNG sequence, GIF), following the established export pattern. Render pipeline and event handlers were not touched.

---

## Appendix A: Technical Constants

### Key Configuration Values
```typescript
BASE_DEPTH_STEP = 150           // Z-units per layer
MAX_LAYERS = 10                 // Maximum number of layers
MAX_HISTORY_STEPS = 50          // Undo/redo limit
CINEMATIC_DEPTH_MULTIPLIER = 3  // VIEW mode depth scaling
DRAW_FOCAL_LENGTH = 5000        // Orthographic focal length
NEAR_CLIP = 50                  // Near clipping plane
MAX_PAN = 1500                  // Maximum pan offset
APP_VERSION                     // → src/constants/version.ts (single source; not duplicated here)
```

### Post-Processing Effects
- **Grain**: Film grain overlay (0-1)
- **Vignette**: Edge darkening (0-1)
- **Distortion**: Lens distortion (0-1)
- **DoF**: Depth of field blur (0-1)
- **Chromatic Aberration**: RGB channel offset (0-1)
- **Fog**: Atmospheric depth fog (0-1)
- **Particles**: Floating particles (circle, square, stroke types)
- **Glow**: Soft glow around shapes (0-1)
- **Riso**: Risograph halftone texture (0-1)
- **Pixel Art**: Pixelation effect (size 2-16, depth 2-32 colors, dither 0-1)
- **Grunge**: Overlay texture (subtle, medium, intense)
- **Wiggle**: Hand-drawn line wobble (light, medium, heavy)

---

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **D** | DRAW mode |
| **V** | VIEW mode |
| **Shift + D** | Toggle dark canvas |
| **Shift + H** | Hide/Show UI (VIEW mode only) |
| **Shift + S** | Symmetry mode |
| **Shift + I** | Draw Inside mode |
| **Shift + B** | Draw Behind mode |
| **Shift + O** | Organic/Fluid mode |
| **[** / **]** | Previous / Next layer |
| **Cmd/Ctrl + Z** | Undo |
| **Cmd/Ctrl + Shift + Z** | Redo |
| **Cmd/Ctrl + E** | Export SVG |
| **Cmd/Ctrl + Shift + E** | Export SVGZ |
| **Space** | Hand tool (pan in DRAW mode) |
| **Arrow Keys** | Camera pan (VIEW mode) |

---

## Appendix C: Changelog Highlights (1.7.3 → 3.12.0)

### 3.12.0 — Glow y DoF vivos en iPad: blur sin `ctx.filter`

**feat(fx)** — Los dos FX más cinemáticos del catálogo (Glow y **DoF con su rack focus automático del preset Storytelling**) estaban muertos en iPadOS: WebKit acepta la asignación de `ctx.filter` y la ignora en silencio. La app lo detectaba (`supportsCanvasFilter()`) y, en vez de resolverlo, avisaba — badge de warning en la fila del panel, toast al activar, y un efecto que no hacía nada. Es decir: la profundidad de campo, el rasgo más "cine" del producto, no existía en el dispositivo principal de trabajo y validación.

**Solución**: `applyBlurCompat()` en `canvas/blurCompat.ts` — aproximación de blur gaussiano por **mip chain con `drawImage`**: mitades hacia abajo hasta el nivel objetivo, reconstrucción por dobles hacia arriba. Sin `getImageData`: todo son blits acelerados por GPU, universales en cualquier navegador.

**Dos trampas resueltas en la calibración** (ambas medidas, no supuestas):

1. **El blur de una mip chain está cuantizado a potencias de dos** — a secas produce mesetas y saltos en el slider (la respuesta medida era no monótona: radio 20 → σ 29.6 pero radio 30 → σ 27.3). Se corrige mezclando los dos niveles adyacentes por la parte fraccionaria del nivel, lo que da una respuesta continua.
2. **`source-over` con `globalAlpha` NO es una mezcla lineal**: atenúa el destino por `(1 − mix·srcAlpha)`, no por `(1 − mix)`, así que en las colas del blur sobrevive el nivel nítido y el radio efectivo colapsa (σ 26 donde tocaban 40). La mezcla honesta es `destination-out` con relleno alpha=mix para escalar el destino, y luego `lighter` con `globalAlpha=mix` para sumar encima.

**Calibración verificada** (segundo momento de la derivada del borde, medido contra `ctx.filter` en Chrome): σ ≈ **0.68 · downscale total** ⇒ `BLUR_COMPAT_K = 0.68` hace que `radius` signifique lo mismo en ambas rutas. Error ≤ 8.3% en todo el rango vivo (4–65 px) y respuesta monótona; en el rango de export HQ (hasta 130 px) ≤ 18%.

**Contrato de la función**: el draw final atraviesa el `globalCompositeOperation` y `globalAlpha` vigentes en el contexto destino — sustituye exactamente al `drawImage` que reemplaza. Esto es lo que permite que `applyDoFBlur`, que **es también la composición de la capa al offscreen**, no altere ni el orden ni el alfa de la mezcla. Verificado: con `dofBlur = 0` el resultado es idéntico bit a bit al de 3.11.3.

**Fallback, no sustitución**: la ruta nativa se mantiene íntegra donde `ctx.filter` funciona (Chrome/Firefox renderizan byte-idéntico a 3.11.3); el camino nuevo solo entra donde el efecto era inservible, así que el riesgo es unidireccional. Flag de desarrollo `localStorage['diorame-force-blur-compat'] = 'true'` para forzar la ruta compat en desktop y comparar ambas lado a lado.

**Coste medido**: 20 blurs a pantalla completa con radio 65 (el peor caso por frame: 10 capas × glow+dof) en **~1 ms** — las pasadas intermedias son minúsculas. Respeta `renderScale` sin contrato nuevo: los radios llegan ya escalados desde `applyGlow`/`composeLayer`, y a `scale=2` el área de bloom crece como debe.

**Retirada del gate**: eliminados `browserUnsupported` del catálogo de `FXPanel`, el prop y los 6 badges de `FXRow`, los dos botones envueltos de la píldora colapsada, y la clave i18n `fx.common.browserUnsupported` en ambos diccionarios. `browserCapabilities.ts` se conserva: ahora su consumidor es el router de blur.

- **Files**: `src/components/strata/canvas/blurCompat.ts` (nuevo), `src/components/strata/canvas/postProcessing.ts`, `src/components/strata/fx/FXPanel.tsx`, `src/components/strata/fx/FXRow.tsx`, `src/i18n/dictionaries/{en,es}.ts`, `src/constants/version.ts`, `package.json`.

---

### 3.11.3 — Undo híbrido: el selector viaja solo con los pasos materiales

**fix(undo)** — El contrato contenido-puro de 3.11.2 sobrecorrigió: deshacer el restyle de trazos devolvía la geometría pero dejaba el selector marcando el estilo nuevo (UI mentirosa), y deshacer un remapeo de paleta restauraba los hex viejos con el selector en la paleta nueva (mezcla de colores de ambas paletas). Validado en dispositivo como antinatural.

**Insight de diseño**: los selectores de tipo de trazo y paleta de Diorame NO son preferencias de herramienta (brush size de Photoshop) — son **displays de propiedades del documento** (estilo de la capa, set de tintas), como el blend mode de una capa: cuando su cambio altera el lienzo, deshacerlo debe revertir contenido Y selector juntos.

**Contrato híbrido**:
- **Cambio material** (restyle/remapeo modificó shapes): paso de undo con snapshot del par post-cambio (`shapes` + `layerBrushSettings`/`activePaletteId`). El selector viaja con undo/redo — canvas y selector nunca se desincronizan.
- **Selección pura** (nada que restylar/remapear): sin paso de undo, y **last-writer-wins** — `patchCurrentSnapshot()` estampa el valor nuevo sobre el snapshot presente, de modo que un undo posterior jamás resucita la selección vieja. (Esta pieza es la que faltaba en 3.7.3 y la fuga que empujó a 3.11.2.)
- `SET_PALETTE_MODE` (plano/degradado) entra al mismo modelo: en capa vacía ya no crea paso muerto.
- `createSnapshot` **materializa** el brush efectivo de la capa activa cuando el mapa no tiene entrada (las capas solo escriben su entrada al primer cambio explícito; sin materializar, el undo caía al valor vivo y el selector no viajaba — cazado en verificación).
- Se mantienen de 3.11.2: `hiddenLayers`/`locked3DLayers` fuera del historial (estado de vista puro), fix de capa fantasma en `DELETE_CURRENT_LAYER`, y guards anti-paso-muerto.

**Validado** (dev, instrumentando el estado real del reducer): flujo completo trazo→restyle→trazo→undo×2 (primer undo no mueve selector; segundo deshace restyle y marca el tipo anterior); redo re-aplica restyle y selector; paleta: selección pura sobrevive al undo, remapeo viaja con undo/redo sin mezcla; conteo de pasos exacto (sin pasos muertos ni pasos de más). **Validado en dispositivo (iPad)**: flujos de trazo y paleta confirmados naturales, sin fricción.

- **Files**: `src/types/strataTypes.ts`, `src/components/strata/StrataContext.tsx`, `src/constants/version.ts`, `package.json`.

---

### 3.11.2 — Undo restaura contenido, nunca herramienta (contrato nuevo de historial)

> **[REFINADO en 3.11.3]** — El modelo contenido-puro de esta entrada generó selector mentiroso tras deshacer restyles y mezcla de paletas tras deshacer remapeos. Sus otras piezas (snapshot de capa fantasma, guards, hiddenLayers/locked3D fuera del historial) siguen vigentes. Ver 3.11.3.

**fix(undo)** — Deshacer un trazo también desmarcaba el tipo de trazo elegido y devolvía la paleta activa a la anterior — antinatural frente al estándar de software de diseño (Photoshop/Procreate: undo toca el documento, no la herramienta). El audit destapó **cinco defectos de la misma familia**:

1. UNDO/REDO restauraban estado de herramienta desde el snapshot: `layerBrushSettings` → `brushMode`/`currentBrushThickness`, y `activePaletteId`/`palette`.
2. `SET_BRUSH_MODE` y `SET_ACTIVE_PALETTE` snapshoteaban `{...state, shapes: nuevas}` — shapes post-cambio con el setting pre-cambio (snapshot inconsistente: el undo del siguiente trazo "desmarcaba" el selector).
3. `TOGGLE_3D_LOCK` no pusheaba historial pero `locked3DLayers` sí se restauraba → deshacer tras bloquear una capa en 3D revertía el candado en silencio.
4. `DELETE_CURRENT_LAYER` snapshoteaba shapes reindexadas con `totalLayers` y mapas per-layer viejos → undo/redo cruzando un borrado resucitaba una capa fantasma con modos de render desalineados (corrupción real).
5. Los snapshots iniciales (`initialState`, `CLEAR_CANVAS`) omitían `activePaletteId` (TS no lo caza: `vite build` no typechequea) → deshacer hasta el fondo tras un clear corrompía la paleta a `undefined`.

**Contrato nuevo**: `HistorySnapshot` adelgazado a contenido puro — `{ shapes, totalLayers, layerRenderModes, layerGradParams }`. UNDO/REDO preservan en vivo todo el estado de herramienta/vista (`hiddenLayers` ya lo hacía; ahora también `locked3DLayers`, brush settings y paleta activa). Si el undo fuerza salto de capa (cambio de conteo), el brush adopta la memoria per-layer VIVA de la capa destino — mismo comportamiento que el cambio manual (`SET_CURRENT_LAYER`).

**Guards anti-paso-muerto**: `SET_BRUSH_MODE`, `SET_ACTIVE_PALETTE` y `COMMIT_BRUSH_THICKNESS` solo pushean historial si realmente modificaron shapes (regeneración de trazos / remapeo de colores). Cambiar tipo de trazo en capa vacía o alternar paleta con canvas vacío = cambio de herramienta puro, cero entradas de undo.

**Reversión documentada**: esto invierte deliberadamente el modelo de **3.7.3** (que hizo que undo restaurara selector de paleta y brush para "sincronizar" — ver anotación en esa entrada). El síntoma que 3.7.3 quería curar (ajuste pegado tras undo) era real, pero el remedio conflaba selector con contenido; el modelo vigente restaura el contenido (hex/geometría embebidos en las shapes) sin tocar el selector. Trade-off aceptado: deshacer MÁS ALLÁ de un restyle de trazo/paleta puede dejar capa con trazos estilo X y selector marcando Y (modos mixtos por capa son representables — cada shape hornea su `brushMode`/`brushThickness`/hex).

**Pendiente conocido (fuera de scope)**: los sliders de gradiente (`SET_PALETTE_GRADIENT_ANGLE`/`INTENSITY`/`TYPE`) no crean paso de undo propio; sus ajustes viajan a caballo del siguiente snapshot de contenido y se revierten al deshacerlo. Curarlo requiere commit-on-release como el ciclo de thickness.

- **Validado** (dev, funcional): toggle de paleta en canvas vacío no crea paso de undo (botón undo sigue deshabilitado); dibujar + deshacer elimina el trazo y el selector de paleta NO se mueve; toggle con contenido crea paso propio (remapeo) y deshacerlo restaura colores sin mover el selector; truncado de rama redo intacto; cero errores de consola. Pendiente validación en dispositivo: flujo de tipo de trazo, candado 3D y borrar-capa+undo.
- **Files**: `src/types/strataTypes.ts` (HistorySnapshot), `src/components/strata/StrataContext.tsx` (createSnapshot, UNDO, REDO, SET_BRUSH_MODE, SET_ACTIVE_PALETTE, COMMIT_BRUSH_THICKNESS, DELETE_CURRENT_LAYER, initialState, CLEAR_CANVAS, LOAD_PROJECT), `src/constants/version.ts`, `package.json`.

---

### 3.11.1 — Fix export iPad: descargas silenciosamente descartadas (PNG/SVG/MP4/GIF/ZIP)

**fix(export)** — En iPad (Safari y PWA standalone), exportar imagen en Modo Cine mostraba el toast de éxito pero no guardaba archivo ni abría el share sheet nativo. Desktop funcionaba. **Causa raíz doble en `exportAsPNG`, y ninguna lanza excepción — de ahí el falso éxito:**

- **`toDataURL` (data: URL gigante)**: iPadOS WebKit descarta en silencio las descargas de `data:` URLs grandes (varios MB de base64; hasta 8192px de lado en HQ). Desktop Chrome las acepta — por eso el bug era invisible fuera de iPad.
- **Anchor desacoplado del DOM**: iOS Safari no honra de forma fiable `.click()` en un `<a>` no insertado en el documento.

Los otros 4 sinks de descarga (SVG, MP4, GIF, ZIP de secuencia PNG) usaban blob URL (correcto) pero compartían el anchor desacoplado + `revokeObjectURL` **síncrono** tras el click — race con el share sheet async de iOS: la URL muere antes de que WebKit la lea.

**Fix**: `src/utils/downloadBlob.ts` (nuevo) replica el patrón del guardado `.dior` (`useSaveLoad.ts`), ya verificado en producción en iPad: blob URL + anchor oculto añadido al `body` + cleanup/revoke diferido (200ms, mismo valor que el flujo `.dior`). Los 5 sinks migrados al helper. `exportAsPNG` pasa de `toDataURL` a `canvas.toBlob` (async — evita además el pico de memoria del string base64 en iOS): toasts y `onFinish` resuelven en el callback, con rama de error si `toBlob` devuelve `null`.

**Regla destilada** (también en CLAUDE.md): toda descarga de archivo nueva DEBE usar `downloadBlob()` — nunca `toDataURL` + anchor, nunca anchor fuera del DOM, nunca revoke síncrono.

**Falso diagnóstico descartado**: no era necesario `navigator.share()` para obtener el diálogo nativo — el patrón `<a download>` bien ejecutado ya lo abre en standalone, y `navigator.share` exige activación de usuario transitoria que la cadena dispatch → useEffect → re-render HQ no garantiza (riesgo de `NotAllowedError` intermitente).

- **Validado**: iPad real (export estándar + HQ en Modo Cine → aparece el share sheet nativo y el archivo se guarda de verdad); desktop sin regresión (verificación funcional en dev: anchor con `blob:` URL adjunto al body, cleanup diferido ejecutado, cero errores de consola nuevos).
- **Files**: `src/utils/downloadBlob.ts` (nuevo), `src/components/strata/canvas/exportHandlers.ts`, `src/components/strata/canvas/gifHandler.ts`, `src/components/strata/canvas/pngSequenceHandler.ts`, `src/constants/version.ts`, `src/REFERENCE.md`.

---

### 3.11.0 — Fuentes auto-hospedadas (offline) vía @fontsource

**feat(pwa)** — La tipografía deja de depender del CDN de Google Fonts y funciona **offline** dentro de la PWA. Antes había **dos** puntos de carga CDN: el `<link>` de `index.html` (7 familias) y un `useEffect` dentro de `StrataCanvas.tsx` que inyectaba un `<link>` dinámico para las 5 fuentes del canvas. Ambos eliminados.

- **7 familias auto-hospedadas vía `@fontsource`** (woff2 bundleado, subset **latin** — cubre EN/ES; otros subsets omitidos a propósito para no inflar el precache):
  - **UI** (`design-system/tokens.ts`): Manrope 400/500/600/700 · Sora 400/600.
  - **Canvas** (`renderTextShape.ts`, todas en bold): Inter (`pharma`) · Courier Prime (`noir`) · Cinzel (`mansion`) · Bangers (`comic`, single-weight) · Inknut Antiqua (`dungeons`). Se hospedan 400+700 (Bangers solo 400).
  - Pesos = exactamente los que se renderizaban antes → **apariencia idéntica**. Cadena de fallback a system fonts intacta.
- **Imports** centralizados en `src/fonts.ts` (nuevo), importado en `main.tsx` antes de los estilos. Sin fallback woff2 manual: los 15 `latin-*.css` existen en @fontsource.
- **Service worker (offline)**: `globPatterns` de `vite.config.ts` amplía a `…,woff2}` → los **15 woff2 entran al precache** (CacheFirst, inmutables). El precache pasa de 12 a 27 entradas. Offline cubierto aunque las fuentes del canvas se carguen lazy (el SW las precachea todas al instalar, no on-demand).
- **StrataCanvas**: se elimina el `useEffect` "Load Fonts" (−6 líneas, reduce el monolito; no toca render loop/gestos/proyección). Sustituido por un comentario que apunta a `src/fonts.ts`.
- **Validado**: build verde (15 woff2 en `sw.js`), **cero** referencias a `fonts.googleapis.com`/`gstatic.com` en HTML/JS/CSS final, fuentes servidas desde mismo origen, las 5 del canvas cargan on-demand sin error, render UI idéntico (Manrope).
- **Files**: `src/fonts.ts` (nuevo), `src/main.tsx`, `index.html`, `vite.config.ts`, `src/components/strata/StrataCanvas.tsx`, `src/constants/version.ts`, `package.json` (+7 deps `@fontsource/*`).

---

### 3.10.10 — Fix bug intermitente iPad: estado de gesto/tooltip huérfano tras guardar

**fix** — En iPad PWA standalone, guardar un `.dior` dispara un `<a download>.click()` que abre el share sheet del sistema → la app pasa a background e iOS puede no entregar los eventos de cierre de gesto (`pointerup`/`leave`/`cancel`/`touchend`/`blur`). Quedaban huérfanos: `gestureRef.isPinching=true` (bloquea zoom **y** dibujo), `isDrawingRef=true`, pointer capture sin liberar, y el tooltip de Radix `open=true`. No existía ningún handler de visibility que lo limpiara — el hook `useCanvasRecovery` que esta doc describía **nunca se había implementado**. Solo un refresh lo curaba. Fix en 3 capas:

- **Capa 1 — `useCanvasRecovery` (el fix de fondo, ahora real)**: hook nuevo (`src/hooks/useCanvasRecovery.ts`) que escucha `visibilitychange` + `pageshow` y llama un callback `resetGestureState` SOLO al volver a `visible` (nunca al ir a hidden — un gesto vivo al volver es necesariamente huérfano; resetear al hidden mataría trazos legítimos). `resetGestureState` (en StrataCanvas, `useCallback`) limpia `isPinching`/`isOrbitTouch`, `isPanningRef`, `isDrawingRef`, `currentPointsRef`, `drawingPointerTypeRef` y libera el pointer capture huérfano (vía `activePointerIdRef`, try/catch).
- **Capa 2 — `onPointerCancel` en el canvas (red de seguridad)**: el JSX tenía `onPointerUp`/`Leave`/`onTouchCancel` pero NO `onPointerCancel`, y el dibujo va por pointer events. Se añade `onPointerCancel={resetGestureState}` — apunta a `resetGestureState`, **no** a `handlePointerUp`, porque un cancel = gesto abortado: descarta el trazo parcial en vez de commitearlo como shape.
- **Capa 3 — tooltip (`enhanced-tooltip.tsx`)**: (1) `useEffect` que fuerza `open=false` en cualquier `visibilitychange` → defiende contra el tooltip pegado cuando el cierre por `pointerleave`/`blur` nunca llega. (2) Se setea `pointerTypeRef` también en `onPointerEnter` (que precede a `focus` en touch) → elimina el race donde Radix abría el tooltip por focus antes de que `onPointerDown` marcara el input como touch.

`useCanvasRecovery` no toca el render loop, refs de frame, ni la lógica de pinch/draw — solo limpieza defensiva de lifecycle. La descripción de Canvas Recovery (sección 7 y changelog 1.10.x) se corrigió para reflejar el código real.

- **Files**: `src/hooks/useCanvasRecovery.ts` (nuevo), `src/components/strata/StrataCanvas.tsx`, `src/components/ui/enhanced-tooltip.tsx`, `src/constants/version.ts`, `package.json`, `src/REFERENCE.md`.

---

### 3.10.9 — Fix DEFINITIVO franja inferior PWA standalone iPad: root a 100vh estático

**fix(pwa)** — Fix definitivo de la franja inferior en iPad standalone, validado en dispositivo. El root de la app pasa a `h-[100vh]` estático (viewport units estáticas, NO dvh, NO position:fixed).

**Causa raíz completa — dos bugs de iOS standalone, un fix que los esquiva ambos:**
- **Bug A** (`100dvh`): en cold start, `dvh` reporta ~22px menos que la pantalla física en standalone iOS; solo se corrige tras rotación/reflow. Era el bug original (≤v3.10.6).
- **Bug B** (`position:fixed`): en standalone, los elementos `fixed` se desplazan como si una navbar invisible empujara el viewport *tras haber puesto la app en segundo plano y reanudarla*. Se dispara exactamente por el file picker al guardar → franja aparece y ya no desaparece. **Introducido en v3.10.8.** Documentado en Apple Developer Forums thread/744327 como sin fix oficial de Apple.
- **`100vh` estático** esquiva ambos: no sufre el recorte de arranque de `dvh` ni el desplazamiento post-backgrounding de `fixed`. Documentado como la unidad robusta para standalone en la literatura de iOS PWA.

El fix de franja superior (`paddingTop` standalone en TopBar, v3.10.8) se mantiene intacto. `useEffect` fondo tema-aware se mantiene como defensa de overscroll/rubber-band.

- **Files**: `src/App.tsx` (quita `position:fixed inset:0`, quita magenta debug), `src/constants/version.ts`, `package.json`.

---

### 3.10.8 — Fix safe-area PWA standalone iPad: franja inferior + superior

**fix(pwa)** — Dos fixes de safe-area para iPad en modo PWA standalone.

- **Franja inferior** ⚠️ **REVERTIDO en v3.10.9**: el root pasó de `h-[100dvh]` a `position: fixed; inset: 0`. Este cambio esquivaba el Bug A (dvh corto en cold start) pero exponía el Bug B de iOS standalone (position:fixed se rompe tras backgrounding — el file picker del guardado lo dispara, franja aparece permanente). El fix definitivo es `h-[100vh]` estático, aplicado en v3.10.9.
- **Franja superior**: nuevo hook `useIsStandalone` (reactivo, combina `matchMedia('(display-mode: standalone)')` + `navigator.standalone` legacy). En `TopBar`, `paddingTop` se amplía a `calc(12px + env(safe-area-inset-top, 0px))` solo cuando `isStandalone=true` → el DocumentPill libra la franja de sistema iOS. Navegador: byte-idéntico (12px). Portable (funciona en iOS y Android).
- **Cleanup debug**: `SafeAreaDebugOverlay.tsx` eliminado; referencias en `App.tsx` y grep vacío.
- **useEffect fondo tema-aware** (v3.10.7): se mantiene como defensa belt-and-suspenders para rubber-band/overscroll iOS.

- **Files**: `src/App.tsx`, `src/components/strata/topbar/TopBar.tsx`, `src/hooks/useIsStandalone.ts` (nuevo), `src/components/SafeAreaDebugOverlay.tsx` (eliminado).

---

### 3.10.7 — Fix franja blanca inferior en PWA standalone iPad

**fix(pwa)** — En PWA standalone iPad, tras un ciclo de foco (guardar → file picker iOS → volver), `100dvh` resuelve ~30-40px más corto que la pantalla física y asoma el fondo del viewport bajo el root (`h-[100dvh]`). El body era `#ffffff` siempre (el tema es estado JS, NO aplica clase `.dark` al DOM), así que la franja era blanca en ambos temas. **Fix:** un `useEffect` en `App.tsx` sincroniza el `backgroundColor` de `html`/`body` con el tema — `#f8fafc` (claro, = slate-50/canvas) / `#050505` (oscuro, = base del canvas) → la franja queda **invisible** en claro y oscuro. No toca el root, el canvas, el SW ni el manifest. No condicional a standalone (inerte en navegador, donde el hueco no aparece).

**Workaround de visibilidad, no de causa raíz.** La causa raíz (fluctuación de `100dvh` en standalone iOS) quedó documentada aquí. El fix definitivo — `h-[100vh]` estático — se aplicó en v3.10.9 (v3.10.8 usó `position:fixed` pero exponía otro bug de iOS; ver v3.10.8 y v3.10.9).

- **Files**: `src/App.tsx`.

---

### 3.10.6 — PWA completa: service worker, offline y toast de actualización

**feat(pwa) — Service worker en producción (Fases 1-3)**. La app es ahora una PWA con offline real. Construido con `vite-plugin-pwa` (generateSW, `registerType: 'prompt'`). **Primer despliegue del SW.**

- **Precache app-shell** (12 entradas): JS/CSS/HTML, iconos PWA, manifest, favicon, logo (<2 MiB), 1 ilustración welcome → la app **abre offline**.
- **Runtime cache de texturas** (`diorame-textures`, CacheFirst): `texture-paper` (~7 MiB) y `texture-grunge` (~13 MiB) están **fuera del precache** (cap 2 MiB) pero se cachean en runtime tras la 1ª carga online → **papel/grunge disponibles offline tras el primer uso**. Inmutables (hash en el nombre), `maxEntries: 10`.
- **Vídeos welcome — `NetworkOnly`**: `welcome-videos/*.mp4` se reenvían directos a la red con el Range header intacto (206 Partial Content) → streaming idéntico a sin SW. NO se cachean (bajo demanda, sin offline, por diseño). `navigateFallbackDenylist` excluye `/welcome-videos/` del fallback HTML. *(Resuelve la regresión de carga de vídeo introducida por el SW.)*
- **Toast de actualización** (`PwaUpdatePrompt.tsx`): con `registerType: 'prompt'`, al detectar versión nueva muestra un toast Sonner persistente "Nueva versión disponible / Recargar" → `updateServiceWorker(true)` (skipWaiting + reload). Toast breve `offlineReady`. i18n EN/ES (`pwa.update.*`, `pwa.offlineReady.message`). Registro vía `useRegisterSW` (hook React) montado junto a `ToastProvider`.
- **Kill-switch de rollback** documentado en `assets-source/kill-switch-sw.js` + `PWA-ROLLBACK-README.md` (NO se despliega; red de seguridad para purgar un SW roto en el campo).
- **Invariantes**: `manifest: false` (usa el `public/manifest.webmanifest` de Fase 0, sin duplicar), sin `base` (scope raíz, CNAME intacto). `vite.config.ts` solo gana el plugin PWA.
- **Files**: `vite.config.ts`, `src/components/PwaUpdatePrompt.tsx` (nuevo), `src/App.tsx`, `i18n/en.ts` + `es.ts`, `assets-source/` (kill-switch). `package.json`/`package-lock.json` (vite-plugin-pwa).

---

### 3.10.5 — PWA Fase 0: app instalable (manifest + iconos + meta tags)

**feat(pwa) — Fase 0 de PWA**: la app es ahora **instalable** como aplicación (Add to Home Screen con icono propio + modo standalone), sin service worker. **Offline diferido a fase futura** (riesgo de caché cero en esta fase).

- **`public/manifest.webmanifest`** (nuevo): name/short_name "Diorame", `display: standalone`, `start_url`/`scope` "/", `theme_color`/`background_color` `#511d65` (morado de marca), `orientation: any`, `lang: en`. 3 iconos: 192/512 `purpose:any` + 512 `purpose:maskable`.
- **Iconos** (creados manualmente): `public/pwa/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (fondo sólido #511d65), `public/apple-touch-icon.png` (180×180 en raíz). Máster 1024 conservado fuera de `public/` en `assets-source/` (no deployable).
- **`index.html`**: `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`. Favicon intacto.
- **SIN service worker / vite-plugin-pwa**: instalabilidad sí, offline no. `vite.config.ts` sin cambios (sin `base`, scope raíz limpio para el SW futuro).

---

### 3.10.4 — Welcome modal: créditos en desplegable + botón "Cargar archivo"

**feat(welcome) — Dos mejoras de UX en el welcome modal**:

1. **Créditos de sonido a desplegable**: los créditos ("Sonidos por Juniorsoundays, freesound_community & Photoqueiros") se movieron a un disclosure colapsable ("Créditos de sonido" / "Sound credits"), replicando el patrón exacto del desplegable de atajos de teclado existente. El toggle "Activar sonidos" sigue visible. Colapsado por defecto.

2. **Botón secundario "Cargar archivo"**: tercer botón en la zona de acciones (mismo nivel visual que "Cargar escena de ejemplo"). Reutiliza `useSaveLoad().handleLoadProject` con un `<input type="file" accept=".dior">` propio del modal — `DocumentPill` intacto, sin compartir refs. Flujo: archivo elegido → carga + cierra modal; cancelar → modal permanece abierto.

- **i18n**: `modal.welcome.cta.loadFile` (EN: "Load file" / ES: "Cargar archivo"), `modal.welcome.sounds.credits` (EN: "Sound credits" / ES: "Créditos de sonido").
- **Files**: `WelcomeModalV2.tsx`, `i18n/en.ts`, `i18n/es.ts`.

---

### 3.10.3 — Dos vídeos nuevos en la rueda del welcome modal

**feat(welcome)**: añade `8.mp4` y `9.mp4` a `public/welcome-videos/`. La rueda aleatoria del welcome modal pasa de 7 a **9 vídeos**. Selección vía `Math.floor(Math.random() * WELCOME_VIDEOS.length)` — sin off-by-one, rango 1–9 cubierto íntegramente.

- **Files**: `public/welcome-videos/8.mp4`, `public/welcome-videos/9.mp4`, `WelcomeModalV2.tsx`.

---

### 3.10.2 — DiActionButton migrado a EnhancedTooltip

**refactor(ui) — Unificación de tooltips**: `DiActionButton` usa ahora `EnhancedTooltip` (Radix UI) en lugar del atributo `title` HTML nativo, igualando el patrón de `DiIconButton`. Los 19 consumidores que pasan `tooltip=` no necesitan cambios (prop pública conservada). Código muerto eliminado: `hasFinePointer`, `formatShortcut` y `titleText`. El tooltip se suprime en touch (filtro `pointerType` interno de `EnhancedTooltip`); botones sin `tooltip` retornan el elemento sin envolver.

- **Files**: `src/design-system/DiActionButton.tsx`.

---

### 3.10.1 — DoF rack focus que sigue al tour en Storytelling

**feat(camera) — Storytelling + DoF lock: rack focus automático**: cuando el preset `storytelling` está activo y el DoF está en modo `lock` (`focusTargetLayer ≥ 0`), el plano de enfoque sigue automáticamente la capa hacia la que viaja la cámara con **rack focus suave** (índice de capa fraccional interpolado con la misma `frac` que la pose).

- **Acople implícito**: override puro en tiempo de render dentro del bloque de foco de `renderPipeline`. `state.focusTargetLayer` **nunca se muta** → el lock manual se restaura solo al salir de storytelling o apagar DoF.
- **Rack focus fraccional**: `focusLayerIndex = lerp(waypoints[seg].layerIndex, waypoints[(seg+1)%n].layerIndex, frac)`. Usa los `layerIndex` reales (no `seg`) porque los waypoints saltan capas pinned/vacías. Durante la obertura (`s=0`) colapsa a `waypoints[0].layerIndex` — sin salto en el handoff beat→viaje.
- **Coherencia proyectiva**: la fórmula `shapeZ/effectiveCameraZ` reutiliza exactamente el mismo cómputo que el bloque lock preexistente (con `CINEMATIC_DEPTH_MULTIPLIER` y `layerSpacingFactor`) → al posarse en un waypoint, `fxFocusDist = dzStar` = distancia de encuadre → la capa enmarcada queda nítida por construcción.
- **Fuera del gate byte-idéntico**: otros 10 presets, DoF off, `n=0` (sin waypoints), exports → `focusLayerIndex=null` → gate falla → ruta original intacta.
- **Files**: `cinematicCamera.ts` (`focusLayerIndex` en `CinematicTickResult` + interpolación por ramas), `renderPipeline.ts` (`storyFocusRef` en `RenderContext`, gate + override, escritura tras tick), `StrataCanvas.tsx` (`storyFocusRef` + `buildRenderContext`), `animationExportRender.ts` / `exportHandlers.ts` (`storyFocusRef: {current:null}` en fake RC).

---

### 3.10.0 — Preset cinemático "Storytelling" (tour data-driven)

**feat(camera) — Nuevo preset "Storytelling" (Narrativa)**: 11º movimiento cinemático. Tour contemplativo que recorre el **centroide de contenido visible** de cada capa en orden de stack (profundidad Z), con cámara orgánica continua.

- **Waypoints data-driven**: un waypoint por capa, computado en `StrataCanvas` (useEffect sobre `[state.shapes, state.locked3DLayers]`) como promedio de los puntos de las shapes de la capa. `radius` = mitad del lado mayor del bbox (medida barata de tamaño para zoom adaptativo). Sin `getImageData`.
- **Exclusiones**: capas **pinned** (`locked3DLayers`) y capas **sin contenido visible** (solo-eraser o sin puntos efectivos) no generan waypoint. Los **erasers se excluyen** del centroide/radius (solo sustraen, no aportan contenido espacial). El **texto sí cuenta** como contenido (aporta su ancla).
- **Obertura de entrada**: arranca posada en `wp[0]` con un beat de respiración a amplitud plena (`INTRO_DURATION ≈ 4.5`), luego entra al viaje con handoff C0-continuo. Stateless: función cerrada de `t` desde 0, scrub-safe, nunca re-entrada en loops posteriores.
- **Flujo orgánico continuo**: un único parámetro `s(t)` glide a lo largo de un spline cíclico Catmull-Rom a través de las poses. Velocidad **ondulante** (warp sinusoidal: lenta en cada capa, rápida entre capas) pero **estrictamente > 0** — sin frenazos, sin reversa, sin costura. Forma cerrada → reconstruible para cualquier `t`.
- **Encuadre real (~70% del canvas)**: cada capa aterriza a una distancia de cámara que la hace llenar `TARGET_FILL_RATIO` del canvas, invirtiendo la proyección `layerScale = FL/(FL+dz)` → `dz* = FL·(1−k)/k`. Cap de apparent-scale robusto al focal length (`min(cap artístico, FL/FADE_SAFE_DISTANCE)`) → degradación elegante en capas extremas sin entrar al fade de opacidad.
- **Respiración perceptualmente constante y continua**: amplitud relativa (fracción de la distancia de framing) → el swing de tamaño aparente se ve igual en capas cercanas y lejanas. Interpolada (`ampLerp`) entre waypoints adyacentes con la misma `frac` que la pose → sin escalón C0 en fronteras de segmento (mata el pop de zoom al llegar a cada capa).
- **Loop sin costura**: el retorno frente→fondo es un segmento más del spline cíclico, no una fase especial.
- **Files**: `strataTypes.ts` (tipo `Waypoint`, `'storytelling'` en `CinematicType`), `cinematicCamera.ts` (rama del motor + 4 params de framing), `renderPipeline.ts` (`waypoints` en `RenderContext`), `StrataCanvas.tsx` (`waypointsRef` + useEffect), `StrataContext.tsx` (whitelist `LOAD_PROJECT`), `animationExportRender.ts` / `exportHandlers.ts` (`waypoints: []`), `icons.ts` (`cam-storytelling`), `CameraPresetsZone.tsx`, `i18n/en.ts` + `es.ts`.

---

### 3.9.10 — Pulidos finales + cierre del sprint squash & stretch (Fase 5)

**feat — Pulidos finales de squash & stretch (cierra el sprint)**:
1. **Asas de lado ocultas en capas de solo-texto**: `renderFrame` computa `isActiveLayerPureText` (todas las shapes de la capa activa son texto) y lo pasa a `drawGizmo`, que omite las barras `mt/mb/ml/mr` del dibujo **y** del objeto `handles`. Como `hitTestGizmo` guarda con `handles.mt && …`, dejarlas `undefined` también **bloquea el hit-test** de los modos `scale_t/b/l/r` — sin guard extra en StrataCanvas. Capas **mixtas** (texto + trazos): asas visibles (los trazos se deforman, el texto no). Esquinas (uniforme, sí aplica a texto vía `fontSize·scale`) y rotación intactas.
2. **`eraserPolygon` horneado**: el reducer `TRANSFORM_LAYER` aplica el mismo `transformPoint` a `eraserPolygon` que a `points`/`originalPoints`. El **canvas** siempre renderizó el eraser desde `points` (sin cambio, ni uniforme ni deformado); `eraserPolygon` solo se usa en el cálculo de bounds del **SVG export**, que antes quedaba **stale** tras cualquier transform y ahora es coherente.

**Sprint squash & stretch — COMPLETO (Fases 0-5):** extracción del Move-gizmo a módulo puro (`moveGizmoInteraction.ts`), motor `scaleX/scaleY` con bake no uniforme, asas de lado visuales (barras orientadas), drag mono-eje (`scale_t/b/l/r`), preview en vivo (espeja el bake, sin salto), y pulidos. **Texto excluido** de la deformación por shape. **Quirk aceptado** (decisión, no pendiente): tras deformar no uniformemente un trazo brush, cambiar su grosor/tipo lo regenera desde el spine deformado (puede saltar) — se eligió mantener "deformar el outline" como semántica de squash & stretch.
- **Files**: `drawGizmo.ts`, `renderPipeline.ts`, `StrataContext.tsx`.

---

### 3.9.9 — Deformación interactiva con preview en vivo (squash & stretch Fase 3 + 4)

**feat — Squash & stretch interactivo en el Move (Fase 3 drag + Fase 4 preview)**: arrastrar las asas de lado del gizmo deforma la capa en su eje — izq/der → `scaleX`, arriba/abajo → `scaleY` — con escala **mono-eje** respecto al centro del box (ratio de la distancia horizontal/vertical del puntero al centro vs. el inicio; sin rotación). Nuevos modos `scale_t/b/l/r` en `moveGizmoInteraction.ts` (hit-test + `computeMoveTransform`); el commit incluye `scaleX/scaleY` en el payload, que dispara la ruta no uniforme del reducer (motor de Fase 1) horneando la deformación en `points` y `originalPoints`. **Preview EN VIVO** durante el arrastre: `renderLayerBody` y el `project()` del gizmo aplican `scaleX/scaleY` espejando **exactamente** la fórmula del bake (`rx=(ox·cos−oy·sin)·sx`, `ry=(ox·sin+oy·cos)·sy`), así que la capa y el bounding box se deforman mientras arrastras y **no hay salto al soltar**. Esquinas (escala uniforme) y todo el Move actual **byte-idénticos** cuando no hay `scaleX/scaleY`. Texto **no se deforma** (excluido por shape en reducer y preview). Clamp anti-flip `≥0.01` en el camino no uniforme.
- **Files**: `moveGizmoInteraction.ts`, `StrataCanvas.tsx` (tipo `mode` + payload), `renderPipeline.ts` (tipo), `renderLayerBody.ts` (preview), `drawGizmo.ts` (gizmo en vivo).
- **Nota de versión**: combina Fase 3 + Fase 4 en un commit; **v3.9.8 no llegó a desplegarse** (su commit no se ejecutó), por eso se salta sin dejar hueco real en el historial.

---

### 3.9.7 — Asas de lado medio en el gizmo del Move (squash & stretch Fase 2)

**feat (en progreso) — 4 asas de lado medio en el gizmo del Move**: añadidas las asas top/bottom/left/right (`mt/mb/ml/mr`) al `GizmoHandles` (opcionales, para mantener compatible la ref inline de StrataCanvas sin tocarla) y dibujadas en `drawGizmo.ts` como **barras pill** (14×4px, extremos redondeados) cuyo eje largo corre **a lo largo del borde adyacente** del box — verticales en izq/der (estiramiento horizontal), horizontales en arriba/abajo (estiramiento vertical). **Siguen la rotación del box**: los ángulos se derivan de las esquinas ya proyectadas (`topAngle`/`leftAngle`). Sutilmente distintas de las asas de esquina (círculos ⌀12) para comunicar "deformación de eje" vs "escala uniforme". Mismo relleno blanco + borde azul. **Solo dibujo** — sin hit-test ni drag aún (Fase 3). Rounded rect vía `arcTo` manual (compat iPad). El caso "capa de texto" (asas irrelevantes) se gestiona en Fase 3.
- **Files**: `drawGizmo.ts`.

---

### 3.9.6 — Motor de deformación no uniforme (squash & stretch Fase 1)

**feat (en progreso) — Motor `scaleX/scaleY` en el transform del Move**: el tipo `Transform`/`currentTransform` se extiende con `scaleX?`/`scaleY?` (en `moveGizmoInteraction.ts`, `renderPipeline.TransformRefState`, `StrataCanvas` `transformRef`) y el payload de `TRANSFORM_LAYER` los acepta. El reducer hornea la deformación en `points` **y** `originalPoints` (spine) con una fórmula unificada por eje — `rx=(ox·cos−oy·sin)·sx`, `ry=(ox·sin+oy·cos)·sy` — que **colapsa carácter por carácter al caso uniforme** cuando `sx===sy===scale`. Retrocompat total: todo transform sin `scaleX/scaleY` (esquinas del gizmo) es byte-idéntico al actual. **Texto excluido** (fuerza uniforme, `fontSize·scale` intacto). **Clamp anti-flip** (`≥0.01`) aplicado solo al camino no uniforme para no alterar el uniforme legacy. **Sin gizmos visuales aún** (Fase 2): este commit es el motor puro, validado por consola.
- **Files**: `moveGizmoInteraction.ts`, `renderPipeline.ts`, `StrataCanvas.tsx` (tipo), `StrataContext.tsx` (reducer + payload).

---

### 3.9.5 — Botón centrar capa (Move) + extracción Move-gizmo (squash & stretch Fase 0)

**feat — Botón "centrar capa" en las acciones del Move**: tercer botón en la fila de acciones del gizmo del Move (junto a reflejar H/V), icono crosshair. Traslada la capa actual al **centro del canvas** (origen del mundo `0,0`, donde centra Reset View) moviendo el centro de su bounding box ahí. Traslación pura vía `MOVE_LAYER` (hornea points + originalPoints, con undo). i18n EN/ES.
- **Files**: `StrataCanvas.tsx` (overlay de acciones del Move), `en.ts`, `es.ts`.

**refactor — Extracción de la interacción del Move-gizmo (Fase 0 de squash & stretch)**: la lógica de interacción del gizmo del Move (hit-test de asas, matemática de transform de onPointerMove, guard de commit) se extrajo de `StrataCanvas.tsx` a `canvas/moveGizmoInteraction.ts` (módulo puro: recibe valores, devuelve valores, no toca refs ni el RAF). Comportamiento **byte-idéntico** — solo reubicado. StrataCanvas −35 líneas netas. Prepara el terreno para las fases 1-5 de squash & stretch sin crecer el monolito. RAF/buildRenderContext/live-stroke intactos.
- **Files**: `moveGizmoInteraction.ts` (nuevo), `StrataCanvas.tsx`.

**docs — Reclasificación de squash & stretch en BACKLOG**: riesgo HIGH → MEDIUM. El modelo de datos es destructivo (transform horneado en `points`), así que la deformación no uniforme de trazos no toca proyección/SVG/save-load. Decisiones cerradas (texto excluido, asas de lado = escala pura de eje) y faseado 0-5.

---

### 3.9.4 — Captura HQ: fidelidad de FX a escala (Fase B)

**feat — FX a escala en HQ (cierra el HQ real)**: complemento de la Fase A (v3.9.3). Los efectos cuyos radios están en **píxeles fijos** (y por tanto no escalan solos con `renderScale`) ahora se multiplican por S para paridad visual total en HQ:
- **Glow**: la base del blur (`35`/`20` px) se multiplica por S (`applyGlow` recibe `scale`).
- **DoF**: `dofBlur` se escala **una sola vez** en `composeLayer` (`·opts.scale`); ese valor alimenta tanto a `applyGlow` (sumado a su radio) como a `applyDoFBlur` — nunca doble.
- **Pixel-art**: el grid de snapping `pSize` se multiplica por S en los sitios que operan sobre coordenadas **físicas** (proyectadas ×S) de `renderLayerBody`, conservando el tamaño relativo de los bloques. La quantización de cámara (`quantizePixelArtCamera`) y de `viewPan` permanecen en espacio **lógico** a propósito: el ancla alineada al grid lógico mapea al grid físico vía la proyección ×S.

Sin cambios (ya escalaban solos): **chromatic aberration** usa un factor proporcional a `w/h` (`s = 1 + 0.03·caInt`, desplazamiento ∝ `w`), no un offset en px fijos; y los FX basados en `w/h` (fog, vignette, grain, grunge, riso). `renderScale` default=1 deja el RAF en vivo y los exports existentes byte-idénticos. **Con A (v3.9.3) + B, el HQ tiene paridad visual completa con el preview** en toda la casuística (dibujo puro y full FX).
- **Files**: `postProcessing.ts`, `composeLayer.ts`, `renderLayerBody.ts`.

---

### 3.9.3 — Captura HQ = re-render real a 2× (Fase A)

**feat — HQ snapshot a doble resolución genuina**: la captura HQ era un **upscale falso** (`exportHandlers.ts` hacía `drawImage(canvas, 0,0, targetW, targetH)`, estirando el bitmap ya renderizado → borroso al ampliar). Ahora es **re-render REAL a 2×**: la escena se renderiza de nuevo a resolución física doble mediante `renderScale` paramétrico en el pipeline — proyección 3D, linework y trazos a 2× de detalle genuino, sin interpolar. El canvas y todos los buffers offscreen se dimensionan a `S·w × S·h`; la proyección se escala por S (`viewZoom·S`, `viewPan·S`, centro físico) para mantener el encuadre idéntico. El export usa canvases offscreen **propios** (calcados de `animationExportRender.ts`), nunca los del RAF en vivo. La distorsión de lente se preserva vía un **centro lógico desacoplado** (`distortCenterX/Y`, sin `·S`). `renderScale` default=1 deja el RAF en vivo y los exports existentes (mp4/gif/png-seq) **byte-idénticos**. La captura **device** permanece intacta (upscale del bitmap vivo a `dpr`). HQ scale=2 sobre resolución CSS, con clamp a `MAX_DIMENSION=8192`.
- **Files**: `renderPipeline.ts`, `transformPoint.ts`, `renderLayerBody.ts`, `exportHandlers.ts`, `StrataCanvas.tsx` (solo el call-site del export).

**Pendiente (Fase B) — fidelidad de FX a escala**: los efectos con blur/offset en píxeles (glow, DoF, chromatic aberration) y el grid de pixel-art (`pSize`) no escalan con S todavía; en HQ quedan a **radio relativo reducido** hasta Fase B. La geometría y el linework ya son correctos a 2×.

---

### 3.9.2 — Warnings de consola (DiModal + LayerRow)

**fix — Warning dev `ref is not a prop` en DiModal**: causa real **React 18.3.1, no React 19** (la premisa del backlog era falsa). El `motion.div` del panel se creaba con `ref={panelRef}`; React 18.3 instala un getter de warning sobre `props.ref` en todo elemento creado con ref, y `framer-motion@12.38` (`PopChild`) lee `children.props?.ref` (ruta React 19) antes del fallback React 18, disparándolo. El prefijo `"[object Object]"` delataba el `type` exótico de `motion` (forwardRef), no el backdrop. Fix: ref movida a un wrapper interno `display:contents` que envuelve `{children}` — el hijo directo de `AnimatePresence` ya no se crea con ref → warning eliminado en origen, sin depender de versión de framer-motion. Focus-trap (`querySelectorAll` atraviesa `display:contents`) y animación intactos. Un intento local previo (no commiteado) había envuelto `DiModalBackdrop` en `forwardRef`: código muerto basado en diagnóstico erróneo; descartado.
- **Files**: `DiModal.tsx`.

**fix — Warning `<button>` anidado en LayerRow**: la fila de capa era un `motion.button` que contenía otros `<button>` (visibilidad, pin) — `validateDOMNesting` inválido. Cambiada la fila a `motion.div` con `onKeyDown` (Enter/Space) para activación por teclado; `role="button"`/`tabIndex` ya los inyecta dnd-kit vía `{...attributes}`. Los `stopPropagation` de los botones internos y la accesibilidad se conservan.
- **Files**: `LayerRow.tsx`.

---

### 3.9.1 — Deuda técnica menor (design-system)

**chore — Reubicación del icono `pen`**: la definición de `pen` en `icons.ts` estaba físicamente posicionada en la zona "Custom additions" aunque `ICON_SECTIONS` lo clasifica correctamente como 'Drawing Tools'. Movido al bloque Drawing Tools del archivo para eliminar la discrepancia.
- **Files**: `icons.ts`.

**chore — Token `BLUR` propio**: `T.blur = 'blur(12px)'` era el único valor no-color dentro del objeto `T`. Extraído a `export const BLUR = { default: 'blur(12px)' } as const`, análogo a `SHADOW` y `RADIUS`. 6 referencias actualizadas en 3 componentes.
- **Files**: `tokens.ts`, `DiPill.tsx`, `DiPanel.tsx`, `TextSessionPanel.tsx`.

---

### 3.9.0 — Reorganización I/O de TopBar (DocumentPill + ExportPill)

**feat — Reorganización de la arquitectura de I/O de la TopBar**: las operaciones de archivo ya no están divididas por modo. Nuevo `DocumentPill` transversal (info, nuevo, abrir, guardar .dior, nombre de proyecto; undo/redo solo en DRAW) visible en ambos modos — ahora se puede guardar, cargar y nombrar proyectos también desde CINEMA (antes era imposible). Nuevo `ExportPill` (solo icono) contextual a la derecha: SVG/SVGZ en DRAW; Captura (calidad device/HQ), Vídeo (loops ×1/×3/×6), GIF (100%/50%/25%), Secuencia PNG en CINEMA, con sub-opciones inline anidadas sin popovers anidados. Eliminados `FileControlsPill` y `SnapshotRecordPill`. `TopBar` rediseñada en grid `auto/1fr/auto` — resuelve de paso el solape del pill central en tablet sin necesidad de pill flotante.
- **Files**: `DocumentPill.tsx` (nuevo), `ExportPill.tsx` (nuevo), `ProjectNameButton.tsx` (nuevo), `TopBar.tsx`, `FileControlsPill.tsx` (eliminado), `SnapshotRecordPill.tsx` (eliminado), `en.ts`, `es.ts`.

**feat — Loops de export de vídeo ampliados**: opciones de loop cambiadas de ×1/×2/×3 a ×1/×3/×6.
- **Files**: `ExportPill.tsx`, `en.ts`, `es.ts`.

**fix — Pill de nombre de proyecto**: el pill del DocumentPill se ensanchaba al entrar en modo edición (botón con `maxWidth` variable vs input con `width` fijo). Ambos modos ahora comparten un wrapper de ancho fijo — sin saltos.
- **Files**: `ProjectNameButton.tsx`.

**fix — Toasts en modo dark**: los toasts informativos ignoraban el modo oscuro (colores hardcodeados en light). `ToastProvider` lee `isDarkMode` vía `useStrata()` y aplica tokens `dk()` + prop `theme` de Sonner.
- **Files**: `toast-provider.tsx`.

---

### 3.8.0 — Capas ancladas como fondo/overlay persistente en animación

**feat — Capas ancladas (pin / `isLocked3D`) como fondo/overlay persistente en animación**: una capa con pin deja de contar como frame del flipbook (excluida de `getAnimationFrames`) y se pinta FIJA en todos los fotogramas, respetando su orden de pila: debajo de los frames = fondo persistente, encima = overlay persistente. Ideal para fondos fijos con sujeto animado. Funciona en DRAW y CINEMA (en CINEMA la capa anclada queda clavada en pantalla vía el comportamiento `isLocked3D` existente, mientras los frames responden a la cámara). El export (vídeo/GIF/PNG seq) hereda el comportamiento automáticamente. Implementación: filtro sobre `renderZs` (frame activo + zs de capas ancladas) en lugar de un único z. Preserva el orden back-to-front de `sortedZs`.
- **Files**: `animationFrames.ts`, `renderPipeline.ts`.

**fix — Live stroke en animación**: al introducir lo anterior, el trazo en vivo dejaba de verse en capas-frame vacías (el filtro leía `currentSortedZs` en vez de `renderZs`, ignorando la inyección de `activeZ` del injection block). Corregido filtrando sobre `renderZs`.
- **Files**: `renderPipeline.ts`.

---

### 3.7.4 — Onboarding: sección Animation

**feat — Onboarding didáctico: nueva sección "Animate/Animar"** (tras Draw y Cinema) que presenta la función de animación a quien entra por primera vez. Una card centrada (icono `bounce`) con badge "NEW/NUEVO" en púrpura de marca. Card del mismo ancho que las del grid 3-col para cierre visual coherente. i18n EN/ES.
- **Files**: `OnboardingOverlayV2.tsx`, `en.ts`, `es.ts`.

---

### 3.7.3 — Sincronización de ajustes de dibujo tras undo

> **[MODELO SUPERSEDIDO — ver 3.11.3]** — Esta entrada hizo que UNDO/REDO restauraran SIEMPRE `activePaletteId` y brush settings. En producción resultó antinatural (deshacer un trazo desmarcaba el tipo de trazo/paleta elegidos), pero su reemplazo puro (3.11.2, nunca restaurar) también falló (selector mentiroso, mezcla de paletas). El contrato vigente es el híbrido de 3.11.3: el selector viaja solo con los pasos que modificaron shapes.

**fix — Desincronización de ajustes de dibujo tras undo (patrón)**: el visual volvía atrás con undo pero el "ajuste activo" del próximo trazo quedaba pegado. Dos síntomas del mismo patrón:
- **Paleta**: `activePaletteId` no se capturaba en el snapshot → tras undo las shapes recuperaban su color (hex embebido) pero la paleta activa y el próximo trazo quedaban en la paleta nueva. Fix: `activePaletteId` añadido a `HistorySnapshot` + `createSnapshot` + `initialSnapshot` (LOAD_PROJECT); `UNDO`/`REDO` restauran `activePaletteId` y derivan `palette`.
- **Brush**: `currentBrushThickness`/`brushMode` no se re-derivaban en `UNDO`/`REDO` desde `layerBrushSettings` (que sí estaba en el snapshot) → próximo trazo con grosor/estilo viejo. Fix: derivar ambos del snapshot en `UNDO`/`REDO` (patrón idéntico a `paletteMode`).
- **Files**: `strataTypes.ts`, `StrataContext.tsx`.

---

### 3.7.2 — Undo de modo de color + DoF flat CINEMA

**fix — Undo de modo de color**: `SET_PALETTE_MODE` no pusheaba history → los cambios de modo (plano/degradado/fade, incluyendo "aplicar a todas") no se podían deshacer. Fix: `pushHistory` en ambas ramas del caso; `UNDO`/`REDO` derivan `paletteMode` de `snapshot.layerRenderModes[layerIndex]` al restaurar. El snapshot ya capturaba `layerRenderModes` — no hubo que ampliarlo.
- **Files**: `StrataContext.tsx`.

**fix — DoF enfocado en flat CINEMA**: con `isAnimationFlatZ` activo, todas las capas comparten el mismo `dz` extremo (`currentCamera.z − effectiveCameraZ`), muy lejano del `fxFocusDist` del slider → `dofBlur` máximo en todas las capas → escena completamente desenfocada. Fix: cuando `isCinematic && isAnimationMode && isAnimationFlatZ`, se fuerza `fxFocusDist = currentCamera.z − effectiveCameraZ` (= `dz` de las capas planas) → `Math.abs(layerAvgZ − fxFocusDist) = 0` → `dofBlur = 0` → todo enfocado. CINEMA con profundidad real (`isAnimationFlatZ` off) no se ve afectado.
- **Files**: `canvas/renderPipeline.ts`.

---

### 3.7.1 — GIF fixes + playback safety + export UI redesign

**fix — GIF export FPS**: `gifHandler.ts` calculaba el delay en centisegundos (`100/fps`) pero `gifenc` espera milisegundos y divide entre 10 internamente → doble conversión → GIF ~10× acelerado. Fix: `delayMs = Math.round(1000 / framerate)`.

**fix — GIF export ping-pong**: el export ignoraba `animationPlaybackMode`; el GIF salía siempre en loop clásico. GIF no tiene ping-pong nativo → solución: secuencia espejo `[1,2,3]→[1,2,3,2]` construida en `gifHandler` antes del encode. `StrataCanvas` solo transmite `playbackMode` como dato. PNG sequence permanece lineal por diseño.

**fix — Playback safety lock (DRAW)**: durante playback en DRAW, todas las herramientas de edición siguen activas → estado indefinido. Fix: `isPlaybackLocked = isAnimationMode && isAnimationPlaying` deshabilita herramientas, modificadores, capas, paleta y cambio de modo. Input del canvas cortado con overlay `position:fixed z-index:1` en `ControlsV2` (StrataCanvas no modificado). Controles de animación permanecen activos. Atajos de teclado bloqueados vía guard en `useKeyboardShortcuts`.
- **Files**: `ControlsV2.tsx`, `DrawingToolbar.tsx`, `ToolOptionsPanel.tsx`, `LayersPanel.tsx`, `ColorPalette.tsx`, `ModeSwitchPill.tsx`, `useKeyboardShortcuts.ts`.

**feat — Rediseño UI export de animación**: controles sueltos (DiSegmentControl de loops y escala GIF, botones con iconos placeholder `bounce`/`film`) reemplazados por botones de texto `Vídeo`/`GIF`/`PNG seq` con `DiSelectorPopover` por formato. Opciones: Vídeo→loops (×1/×2/×3), GIF→escala (100%/50%/25%), PNG seq→acción directa. `RecordBtn` condicionado a `!isAnimationMode`; indicador REC separado solo durante grabación de vídeo. i18n ES: "onion skin" → "Papel cebolla".
- **Files**: `SnapshotRecordPill.tsx`, `en.ts`, `es.ts`.

---

### 3.7.0 — GIF export

**feat — Animated GIF export (`gifenc`)**

- `gifHandler.ts` (new): `exportAsGIF` — `ImageData[]` → animated GIF via `gifenc`. Per-frame palette quantization (`quantize + applyPalette`; trivial with the Riso ≤24-color palette). `gifExportScale` (1 / 0.5 / 0.25) downscales before encoding to control file size. GIF delay = `round(100 / framerate)` centiseconds. Infinite native loop (`repeat: 0`). `animationExportLoops` intentionally not used — the GIF loop extension handles it natively; embedding N cycles would balloon file size.
- New state `gifExportScale` + `SET_GIF_EXPORT_SCALE`. `ExportType += 'gif'`.
- `SnapshotRecordPill`: GIF button + scale control (CINEMA, animation on).
- New dependency: `gifenc`.
- `renderFrame / renderPipeline / renderLayerBody / animationExportRender`: untouched.
- **Files**: `canvas/gifHandler.ts` (new), `StrataCanvas.tsx`, `topbar/SnapshotRecordPill.tsx`, `StrataContext.tsx`, `types/strataTypes.ts`, `i18n/dictionaries/{en,es}.ts`.

---

### 3.6.0 — Frame-by-frame export infrastructure + PNG sequence

**feat — Shared animation export infrastructure + PNG sequence**

- `animationExportRender.ts` (new): `renderAnimationFrames(options, onProgress)` — renders each real animation frame to dedicated offscreen canvases using a fake `RenderContext` (separate from the live RAF's refs). Fresh `cameraRef` per frame keeps cinematic tick mutations local. Async with `setTimeout(0)` yield between frames. Returns `ImageData[]`.
- `pngSequenceHandler.ts` (new): `exportAsPNGSequence` — `ImageData[]` → PNG bytes (canvas `toDataURL`) → ZIP via `fflate`. Files: `{project}_frame_01.png` (2-digit padding). ZIP: `{project}_frames.zip`.
- `ExportType += 'png-sequence'`. New dependency: `fflate`.
- `StrataCanvas.tsx`: new export `useEffect` branch (minimal, follows existing pattern).
- `renderFrame / renderPipeline / renderLayerBody`: untouched (called, not modified).
- **Files**: `canvas/animationExportRender.ts` (new), `canvas/pngSequenceHandler.ts` (new), `StrataCanvas.tsx`, `topbar/SnapshotRecordPill.tsx`, `i18n/dictionaries/{en,es}.ts`.

---

### 3.5.2 — fix: pill frame buttons navigate with wrap, never create

**fix — `STEP_ANIMATION_FRAME` for pill button frame navigation**

New `STEP_ANIMATION_FRAME` reducer action (payload ±1): navigates the real frame sequence with circular wrap in both DRAW and CINEMA. Never creates a layer. Replicates the side effects of `NEXT/PREV_LAYER` (camera.z, draw-inside/behind, paletteMode, brushSettings) for consistent layer state on arrival. Pill buttons now dispatch `STEP_ANIMATION_FRAME`; keyboard shortcuts `[`/`]` remain `PREV/NEXT_LAYER` (navigate + create in DRAW) — button and shortcut diverge by design.
- **Files**: `StrataContext.tsx`, `topbar/AnimationPlayerUI.tsx`.

---

### 3.5.1 — fix: zoom + focal/spacing disabled under zero-Z

**fix — Functional zoom and disabled sliders when `isAnimationFlatZ` is active**

- `renderLayerBody.ts`: under flat CINEMA, `camZ = effectiveCameraZ − currentCamera.z` (= `viewZoomOffset`) instead of 0, so the zoom (distance) slider produces visible scaling on the flat plane. The `!isAnimFlat` branch is byte-identical to before.
- `CameraSlidersZone.tsx`: focal-length and layer-spacing sliders disabled (opacity 0.35 + `pointer-events: none`) when `isAnimationFlatZ` is active; zoom slider remains enabled.
- **Files**: `canvas/renderLayerBody.ts`, `bottombar/CameraSlidersZone.tsx`.

---

### 3.5.0 — Video export with dynamic duration + loop control

**feat — MP4/WebM records the real animation duration**

- `exportAsMP4` gains optional `AnimationRecordOptions`. When present: `duration = (1000 / framerate) × frameCount × loops`. Orchestration inside `exportAsMP4`: stop prior playback, jump to `frame[0]`, 80ms pre-roll, `recorder.start`, start playback, stop after `durationMs`. Clean stop before the wrap to `frame[0]` — no duplicated frame at loop seams. Static 6s recording (`STATIC_RECORD_MS`) unchanged when `isAnimationMode` is false.
- New state `animationExportLoops` (1 | 2 | 3) + `SET_ANIMATION_EXPORT_LOOPS`. x1/x2/x3 segment control in `SnapshotRecordPill` (CINEMA, animation on).
- `StrataCanvas.tsx` diff minimal (one import + enriched mp4 branch, following existing export pattern).
- **Files**: `canvas/exportHandlers.ts`, `StrataCanvas.tsx`, `topbar/SnapshotRecordPill.tsx`, `StrataContext.tsx`, `types/strataTypes.ts`.

---

### 3.4.1 — Animation pill icon polish

**polish — Animation pill icons redesigned to match UI line-weight standard**

All 10 animation icons (bounce, play, pause, frame-back, frame-fwd, anim-loop, anim-pingpong, onion, depth-on, depth-off) redesigned to stroke-only at 1.5pt, matching the system icon family. Secondary toggles (loop/ping-pong, onion, depth) use `iconWeight="secondary"` for visual hierarchy. All pill buttons at `iconSize=16`. No logic changes.
- **Files**: `design-system/icons.ts`, `topbar/AnimationPlayerUI.tsx`.

---

### 3.4.0 — Onion skin in DRAW

**feat — Ghost-frame overlay for frame-by-frame drawing reference**

- `getOnionGhostZs` added to `animationFrames.ts`: returns `{ prev, next }` layer indices in the real frame sequence. Two branches: (1) current layer IS a frame → sequence neighbors; (2) current layer is EMPTY → last frame below index (prev), first frame above (next). The empty-layer branch is the primary use case: drawing a new blank frame while seeing adjacent frames as reference.
- `renderPipeline.ts`: additive pre-pass before the active frame — sets `offCtx.globalAlpha` to `ONION_ALPHA_PREV = 0.40` (previous) and `ONION_ALPHA_NEXT = 0.22` (next), resets to 1.0 after each ghost. `renderLayerBody` and `composeLayer` unmodified. Real color, no tint. Does NOT auto-disable during playback.
- DRAW-only toggle in expanded `AnimationPlayerUI` (mutually exclusive with CINEMA-only zero-Z toggle).
- `renderLayerBody.ts` and `StrataCanvas.tsx`: untouched (empty diffs).
- **Files**: `utils/animationFrames.ts`, `canvas/renderPipeline.ts`, `topbar/AnimationPlayerUI.tsx`.

---

### 3.3.0 — Animation playback in CINEMA with optional depth

**feat — Three-state CINEMA animation**

Animation mode extends into CINEMA mode. Depth behavior controlled by the `isAnimationFlatZ` toggle:

1. **Animation OFF**: CINEMA as before — all layers in 3D, full parallax, cinematic camera.
2. **Anim ON + zero-Z OFF**: only the current frame renders at its real Z depth. Animation travels through 3D space as it plays — time and depth as two independent axes.
3. **Anim ON + zero-Z ON**: only the current frame, flattened to a single plane (2D flipbook). Camera and FX still apply.

`renderLayerBody.ts`: Z-flatten condition becomes `isAnimFlat = isAnimationMode && (!isCinematic || isAnimationFlatZ)`. `renderPipeline.ts`: single-frame filter applies in CINEMA too (was DRAW-only). `AnimationPlayerUI` loses its DRAW-only guard; zero-Z toggle added (CINEMA-only). `StrataCanvas.tsx`: untouched (empty diff). Camera tick and playback interval are orthogonal — no conflict.
- **Files**: `canvas/renderLayerBody.ts`, `canvas/renderPipeline.ts`, `topbar/AnimationPlayerUI.tsx`.

---

### 3.2.0 — Animation control redesign: collapsible pill + frame nav + ping-pong

**feat — Collapsible pill in TopBar, frame navigation buttons, ping-pong playback**

- `AnimationPlayerUI` relocated from `bottombar/` to `topbar/`, redesigned as a collapsible pill docked beside the mode switch. Collapsed = bounce icon; expanded = full controls rightward (no overlap with mode switch).
- Frame back/forward buttons dispatch `PREV_LAYER`/`NEXT_LAYER` (later replaced by `STEP_ANIMATION_FRAME` in v3.5.2).
- Ping-pong mode: `animationPlaybackMode ('loop' | 'pingpong')` + `animationDirection (1 | -1)`. `ADVANCE_ANIMATION_FRAME` bounces without repeating extremes (1→2→3→2→1→2→3). `TOGGLE_ANIMATION_PLAYBACK_MODE` action added.
- `STEP_ANIMATION_FRAME` (added then superseded before shipping) removed.
- New icons: bounce, frame-back, frame-fwd, anim-loop, anim-pingpong.
- `StrataCanvas.tsx`: untouched (empty diff).
- **Files**: `topbar/AnimationPlayerUI.tsx` (new), `StrataContext.tsx`, `topbar/TopBar.tsx`, `bottombar/BottomBar.tsx`, `types/strataTypes.ts`.

---

### 3.1.0 — Frame-by-frame animation core in DRAW mode

**feat — Animation mode (first milestone)**

Architecture: animation is a **toggle inside DRAW mode** (not a separate mode). Frames = layers with drawable content (non-empty, non-hidden). Layer 0 = Frame 1, ascending order.

- **State**: `isAnimationMode`, `isAnimationPlaying`, `animationFramerate (4|6|8)`, `isOnionSkinEnabled`, `isAnimationFlatZ`, `layerIndexBeforeAnimation`.
- **Reducer**: `TOGGLE_ANIMATION_MODE` (stores layer on enter, restores on exit, stops playback); `ADVANCE_ANIMATION_FRAME` (infinite loop, skips empty/hidden); `SET_ANIMATION_PLAYING`; `SET_ANIMATION_FRAMERATE`; `TOGGLE_ONION_SKIN`; `TOGGLE_ANIMATION_FLAT_Z`.
- **`animationFrames.ts`** (new): `getAnimationFrames` + `isLayerEmpty`. Uses a local `BASE_DEPTH_STEP` constant to avoid circular import with `StrataContext`.
- **`renderLayerBody.ts`**: when `isAnimationMode && !isCinematic`, zeros `baseZ + shapeZ + camZ` → exact scale 1.0 (`focalLength/focalLength`).
- **`renderPipeline.ts`**: single-frame filter — renders only the current frame's Z when `isAnimationMode && !isCinematic` (flipbook effect). Does not touch `hiddenLayers`.
- **`useAnimationPlayback.ts`** (new): `setInterval` hook invoked in `ControlsV2`.
- **`StrataCanvas.tsx`**: untouched throughout — empty diff verified in commit.
- **Files**: `utils/animationFrames.ts` (new), `hooks/useAnimationPlayback.ts` (new), `canvas/renderLayerBody.ts`, `canvas/renderPipeline.ts`, `StrataContext.tsx`, `types/strataTypes.ts`, `i18n/dictionaries/{en,es}.ts`.

---

### 3.0.1 — 2026-05-31

**fix — Cmd+Z works after touching brush thickness slider**

- **Root cause**: Guard 2 in `useKeyboardShortcuts.ts` used `activeEl.tagName === 'INPUT'` to block shortcuts while typing. This incorrectly blocked Cmd+Z (and all other shortcuts) when `<input type="range">` (the brush thickness slider) had focus — which it held indefinitely on macOS and iPadOS after any interaction.
- **Fix**: Exclude `type="range"` from Guard 2 — sliders are intentional shortcut targets. Changed to `activeEl instanceof HTMLInputElement && activeEl.type !== 'range'`.
- **Files**: `src/hooks/useKeyboardShortcuts.ts` (1 file, 3-line diff). `src/constants/version.ts`, `package.json` (version bump).

---

### 3.0.0 — 2026-05-31

**refactor — Render pipeline orchestrator (Plan C completion)**

Extracted the remaining render logic from `StrataCanvas.tsx` into a dedicated pipeline module. StrataCanvas reduced from ~2326 to ~1289 lines (−44.6%).

**Key changes:**
- **`renderPipeline.ts`** — new frame orchestrator in `canvas/`. Exports `renderFrame(ctx, rc: RenderContext)`, `RenderContext`, `PerFrameComputed`, `TransformRefState`. Sequences all render sub-phases in order.
- **`renderLayerBody.ts`** — new per-layer renderer extracted from StrataCanvas. Exports `renderLayer(z, rc, offCtx, pfc)`.
- **`NEAR_CLIP = 50`** unified in `renderConstants.ts` — eliminated 3 local const declarations.
- **5 frame-persistent `useRef`s** — migrated from `let` in useEffect closure to component-level refs: `accumulatedTimeRef`, `accumulatedHandheldTimeRef`, `lastTimeRef`, `wiggleFrameRef`, `shapePatternRef`.
- **Render pipeline exception** — `renderPipeline.ts` (~476 lines) documented as accepted 400-line oversize in §12 Architectural Exceptions.
- **Files**: `src/components/strata/canvas/renderPipeline.ts` (new), `src/components/strata/canvas/renderLayerBody.ts` (new), `src/constants/renderConstants.ts`, `src/components/strata/StrataCanvas.tsx`.

---

### 2.9.3 — 2026-05-xx

**fix — ADD_LAYER: "+" button always creates a new layer**

Prior behavior: the "+" button in LayersPanel dispatched `NEXT_LAYER`, which navigated to the next layer and only created a new one at the end. This was confusing — pressing "+" while in the middle of the stack navigated instead of creating.

**Fix**: LayersPanel now dispatches `ADD_LAYER`, a new dedicated action that always inserts a new layer above the active one, shifts indices, and does not navigate. `NEXT_LAYER` retains its navigate-or-create-at-top semantics for the `]` keyboard shortcut.

---

### 2.9.2 — 2026-05-xx

**refactor — renderShape decomposition complete (regular fill branch)**

Extracted the regular fill / blob / tapered brush branch from the monolithic `renderShape` in StrataCanvas into `canvas/renderRegularFillShape.ts`. Combined with v2.9.0 and v2.9.1, the `renderShape` function is fully decomposed — all four shape-type branches now live in dedicated modules.

---

### 2.9.1 — 2026-05-xx

**refactor — extract uniform-line and eraser branches**

Extracted uniform-line stroke rendering into `canvas/renderUniformLineShape.ts` and eraser shape rendering into `canvas/renderEraserShape.ts`. Both modules are pure functions receiving typed parameters from the render context.

---

### 2.9.0 — 2026-05-xx

**refactor — extract renderTextShape (text branch of renderShape)**

First extraction from the monolithic `renderShape` function in StrataCanvas. Text rendering logic moved to `canvas/renderTextShape.ts` — pure function, no React imports, receives typed font/alignment params.

---

### 2.1.0 — 2026-05-24

Internationalization release. EN/ES bilingual support shipped, with several architectural refactors and visual polish.

**Key changes:**
- **i18n system**: full EN/ES support with browser-based auto-detection, localStorage persistence, and EN|ES toggle in WelcomeModal (bottom-left corner). Custom solution without external i18n libraries.
- **Product renames**: `Orbit → Free` (EN) / `Libre` (ES), `View → Cinema` (EN) / `Cine` (ES), `Tapered → Fluido` (ES only, Brush type). `Handheld → Pocket` (EN/ES) to avoid trademark associations.
- **Tagline updated**: “Draw in 2D. And watch it come alive in 3D.” / “Dibuja en 2D. Y mira cómo cobra vida en 3D.”
- **G3 resolved**: `paletteGradient*` UI-mirror fields removed from AppState. New named type `LayerGradParams` (canonical, `gradType` required). `GradientControls` and `PaletteHeader` now read directly from `layerGradParams[currentLayerIndex]`. Reducer simplified — no more bidirectional sync between mirror and canonical state.
- **Architectural refactors during i18n**: `DiSegmentControl` decoupled from string values via `{value, label}[]` API (i18n-safe by construction). Sentinel pattern for `Untitled Project` with Unicode normalization (NFD + diacritics strip). `Wordmark` component unified across the design system.
- **WelcomeModal visual polish**: width expanded 440px → 580px to let the tagline breathe. Footer links unified into a single row with middot separators (`tutorial · @dumaker · Ko-fi 💜`). Ko-fi heart emoji changed from 🤍 to 💜 for brand consistency.
- **Surgical exception to StrataCanvas (frozen zone)**: `t` translation function passed to pure export functions (1 import + 1 hook + 5 call sites + dependency array). Second authorized modification to the frozen zone, after careful review.
- **Cleanup**: 4 orphan i18n keys removed (`fx.atmosphere.stopMotion.tooltip`, `modal.welcome.gotIt`, `common.cancel`, `common.done`). Unused `state` destructuring removed from `ResetViewPill`. New atomic write protocol added to CLAUDE.md.
- **G5 reclassified**: ResetViewPill draw-only behavior was already operational in production — no actual work required, gap recategorized in DESIGN_MAP.

**Discarded (not deferred)**:
- **Symmetry dual axis**: evaluated and consciously discarded. Current vertical symmetry (horizontal mirror) covers real use cases; the risk of modifying StrataCanvas (frozen zone, two surgical exceptions already spent) does not justify the marginal value. Out of backlog.

---

### 2.0.0 — 2026-05-23

**Fase 10 completa — UI redesign V2 en producción.**

Full replacement of the legacy monolithic controls (Controls.tsx + ControlsDrawing.tsx + ControlsCinematic.tsx + ControlsExport.tsx) with a modular atom-based V2 UI system, orchestrated by the thin `ControlsV2` root.

**Key changes:**
- **UI v2**: TopBar/BottomBar as mode-variable containers, fixed panels (LayersPanel, ColorPalette, FXPanel) replace the legacy monolith. `ControlsV2` is the new thin orchestrator.
- **Full-canvas**: Paper texture fills the entire viewport. No card/frame border in drawing mode.
- **Pass-through during draw**: All UI panels become pointer-events transparent while a stroke is active (`state.isDrawing`), ensuring uninterrupted strokes across panel areas.
- **TEXT gradient**: TEXT shapes now apply `paletteMode` gradient/fade (parity with blob/brush shapes).
- **Master FX toggle**: `TOGGLE_FX_MASTER` as snapshot/restore — disables all effects, preserves individual settings, restores on re-enable.
- **FXMasterBtn**: Visual distinction for master toggle (35×35 / 21px icon vs 30×30 / 18px FX rows, purple inset outline).
- **Non-neutral FX defaults**: `distortion` initial value changed from 0 to -0.3 for visible effect on first toggle.
- **T.warning token**: `#F59E0B` amber added as `T.warning` / `T.warningDark` design token.
- **Bug report**: WelcomeModal bug report link opens in new tab (preserves unsaved canvas state).

### 1.16.0 — 2026-05-17

**Fase 8 completa — cutover UI redesign V2 a producción.**

7 cutovers atómicos en `feat/ui-redesign-v2` reemplazando todos los componentes legacy por sus equivalentes V2 construidos en Fase 7.5. Sin coexistencia, sin regresiones funcionales, validados visualmente uno por uno en navegador.

**Sub-fases:**
- **8.0** Pre-cutover: integración del nuevo icono `layers` (isométrico, 3 planos apilados), array del Layer Panel en PreviewPage sincronizado, tag `pre-phase-8` como rollback.
- **8.1** Cutover MobileBlockScreen + extracción del hook `useIsMobile`.
- **8.2** Cutover ExportProgress (banner variant, sin backdrop, sin scroll lock). Pulse animation (`ico-pulse`) preservada.
- **8.3** Cutover WelcomeModal + extracción del hook `useLoadExampleScene` (reutilizado en 8.6).
- **8.4** Cutover ClearCanvasAlertDialog (alert variant). Tres dispatches del `onConfirm` preservados exactamente: `CLEAR_CANVAS` + `UPDATE_CAMERA` reset + `sessionStorage.removeItem('diorame-view-initialized')`.
- **8.5** Cutover ControlsExport → `ComplexSceneModalV2`. Nuevo callback `onUseCompressed` añade tercera vía al usuario (export SVGZ comprimido) cuando la escena supera el threshold de complejidad (800 shapes).
- **8.6** Cutover OnboardingOverlay (medium-high risk). Introducción del patrón adapter (`OnboardingOverlayConnected`) que aísla la conexión al state global. Toque mínimo en `StrataCanvas.tsx`: 1 línea (swap de import con alias).
- **8.7** Cutover SVG Export Popover → `DiSelectorPopover` (primitivo de 7.5.2). Dos fixes posteriores al primitivo descubiertos en validación:
  - `mousedown` → `pointerdown` en click-outside listener (W3C spec: `preventDefault()` en `pointerdown` del canvas suprimía `mousedown` compatibility events).
  - Return-focus condicional al anchor: solo cuando el cierre fue por teclado (ESC, Enter en opción). Evita tooltip fantasma al cerrar por pointer.
- **8.8** Housekeeping: actualización de REFERENCE.md, BACKLOG.md, CLAUDE.md. Bump a 1.16.0. Push de la rama. Merge a `main` queda pendiente de decisión post-validación en uso real.

**Reglas operativas consolidadas:**
- Tablet como consideración sistemática en todo prompt que toque UX (documentado en CLAUDE.md).
- Swap de import con alias en `StrataCanvas.tsx` como excepción documentada al "no tocar StrataCanvas" (documentado en CLAUDE.md).

**Deuda técnica abierta para Fase 9:** ver `BACKLOG.md`.

**Fase 9 — Housekeeping interno (post Fase 8):**

8 sub-fases de limpieza técnica sobre la misma rama `feat/ui-redesign-v2`, sin push a main. No introducen cambios visibles para el usuario; reducen deuda acumulada y preparan el código para las fases siguientes del rediseño UI.

- **9.1** Hex hardcodeados `rgb(154,15,249)` en MobileBlockScreenV2 reemplazados por `T.purple`. Commit `61a934d`.
- **9.2** Hook `useIsMobile` consolidado: dos implementaciones idénticas (en `src/hooks/` y `src/components/ui/`) unificadas en la convención moderna `src/hooks/`. Commit `a656827`.
- **9.3** Array hardcodeado del Layer Panel en PreviewPage refactorizado a metadata uniforme `ICON_SECTIONS` en `icons.ts`. PreviewPage itera dinámicamente sobre las 9 secciones. Commit `4c7d9a9`.
- **9.4** Tokens de sombra migrados a objeto `SHADOW`: `T.shadow` → `SHADOW.surface`. `T.shadowStrong` eliminado como dead code (0 consumidores). Commit `6bafcd3`.
- **9.5** Union type `state.exportRequest` restringido: eliminados `'none'` y `'webm'` (valores muertos), modelado de "no export" via `null`. Narrowing residual eliminado de App.tsx. `ExportType` duplicado entre `strataTypes` y `ExportProgressV2` consolidado en fuente única. Commit `10a9ec5`.
- **9.6** `EnhancedTooltip` ya no muestra tooltips en input touch. Estado controlado + `pointerTypeRef` detectan `pointerType === 'touch'` y suprimen el tooltip entero. Mejora crítica de UX en tablet. Commit `2a8accf`.
- **9.7** Focus trap del primitivo `DiModal` excluye variant `banner` para coherencia con scroll lock y ESC handler. Fix de 1 línea. Commit `1ede6b7`.
- **9.8** `IconBtn` promovido a `DiActionButton` como primitivo oficial del design system. Añadidas props `disabled` (interna, elimina 10 wrappers ad-hoc) y `danger` (variante semántica para acciones destructivas como trash). Hover migrado a pointer events. 11 consumidores migrados. `topbar/_shared.tsx` eliminado. Commit `bada128`.

**Deuda técnica abierta tras Fase 9:** ver `BACKLOG.md` (items 6, 10-14). Las nuevas entradas (11-14) son deuda detectada durante esta misma fase: warning de framer-motion con React 19, integración pendiente de EnhancedTooltip en DiActionButton, discrepancias menores en agrupación de iconos, y agrupación pendiente de tokens de blur.

---

### 1.15.1 — .dior serialization for VIEW params, first-time VIEW reset, CLEAR_CANVAS full reset

- **feat** — “Load example scene” button added to `WelcomeModal` and `OnboardingOverlay`: fetches `/examples/diorame_onboarding.dior`, dispatches `LOAD_PROJECT`, closes modal/overlay on success. Shows toast on error.

- **feat** — Updated copy: `WelcomeModal` description rewritten; `OnboardingOverlay` subtitle and all feature descriptions updated to reflect current capabilities.

- **feat** — Complete `.dior` serialization for VIEW parameters (`ControlsDrawing.tsx` + `LOAD_PROJECT` reducer): `focalLength`, `viewZoomOffset`, `layerSpacingFactor`, `cinematicSpeed`, `isHandheldEnabled`, `handheldIntensity` are now saved and restored. Fixed `safeCinematicType` to accept all 10 valid `CinematicType` values (previously only `'orbit'` and `'flythrough'` were accepted).

- **feat** — First-time VIEW reset (`Controls.tsx`): on the first DRAW→VIEW transition per browser session, camera is preset to `focalLength=3840` (240mm), `viewZoomOffset=-2500`, `layerSpacingFactor=1.0`, `cinematicType='forward'`. Uses `sessionStorage` flag `diorame-view-initialized`; subsequent transitions leave user settings untouched.

- **fix** — `CLEAR_CANVAS` now resets all VIEW camera parameters (`focalLength`, `viewZoomOffset`, `layerSpacingFactor`, `cinematicSpeed`, `isHandheldEnabled`, `handheldIntensity`, `cinematicType`), `postProcessing`, and `postProcessingEnabled` to `initialState` defaults. Also removes `diorame-view-initialized` from `sessionStorage` so the first-time VIEW preset triggers again.

### 1.15.0 — Procedural RISO V2: halftone grain + 3-pass ink pipeline

**Commits:** `908b5d3`–`b1836b0`
**Files:** `src/components/strata/canvas/postProcessing.ts`, `src/components/strata/StrataCanvas.tsx`

- **feat — `generateRisoGrain`** (`908b5d3`): Replaces PNG-based `risoTexture`. Generates a deterministic halftone grain canvas entirely in software. Architecture: (1) pre-computed density map per cell using bilinear-interpolated smooth noise across 40-cell macro blocks + per-cell micro variation; (2) per-pixel halftone dot — anisotropic distance (x × 1.6) to a jitter-displaced center, hard threshold with micropitting; (3) sinusoidal organic modulation (`organic` factor, range ~0.40–1.04) applied to alpha before write, creating broad zones of dense and sparse grain without gradients.

- **feat — `applyRisoV2`** (`908b5d3`): Replaces `applyRiso`. Three-pass pipeline, no `ctx.filter` (iPad compatible): **Pass 1** — paper grain (`destination-out`, alpha = `intensity × 0.6`, draws `cachedGrainCanvas`); **Pass 2** — ink spread (`multiply`, alpha = `intensity × 0.15`, draws snapshot in `helperCtx`); **Pass 3** — misregistration ghost (`screen`, alpha = `intensity × 0.08`, two fixed offsets +2/+1 and −1/−2 to avoid per-frame flicker). `helperCtx` (existing `helperCanvasRef`) used as explicit intermediate buffer — no self-draw.

- **infra — `StrataCanvas.tsx`** (`908b5d3`): Removed `risoTexture` import and `risoImgRef`/`processedRisoRef` refs. Added `risoGrainRef`. Replaced async PNG `useEffect` with synchronous `generateRisoGrain` call inside a `ResizeObserver` — grain regenerates automatically when canvas dimensions change.

- **tweak — grain params** (`5c764f9`–`c4837a2`): Multiple iterations to tune `cellSize` (settled at 3px), dot `radius` (settled at `density × 0.52`), macro density range (0.52–0.64), and organic modulation coefficients (base 0.72, harmonics 0.18/0.14).

### 1.14.1 — Smooth Blob (blobSmoothing) + mutual exclusivity with Organic

**Commits:** `9ff11a4`, `fe70dd0`
**Files:** `src/components/strata/StrataContext.tsx`, `src/components/strata/ControlsDrawing.tsx`, `src/components/strata/StrataCanvas.tsx`, `src/types/strataTypes.ts`

- **feat — blobSmoothing state & toggle** (`9ff11a4`): New `blobSmoothing: boolean` field in `AppState` (default `false`). `TOGGLE_BLOB_SMOOTHING` action added to the reducer and Action union. Toggle button (Spline icon) added in `ControlsDrawing.tsx` next to the Organic Mode button; active only when tool is `brush` or `eraser`.

- **feat — Chaikin subdivision pipeline** (`9ff11a4`): When `blobSmoothing` is active, raw `finalPoints` are processed in `handlePointerUp` before the shape is committed: decimate (keep every 3rd point, always preserve first/last) → 3 iterations of Chaikin corner-cutting (0.75/0.25 split). Applies to both `brush` (blob fills) and `eraser` tools.

- **feat — mutual exclusivity with isOrganicMode** (`fe70dd0`): Activating `blobSmoothing` now sets `isOrganicMode: false` in the reducer, and vice versa — only one mode can be active at a time. Both buttons in `ControlsDrawing.tsx` are disabled (with tooltip "Disable Smooth first" / "Disable Organic first") when the other mode is active.

### 1.14.0 — SVG Export overhaul + Undo/Redo shortcuts & gestures

**Commits:** `f6c52fb`, `99e6589`, `cc67951`, `b597795`, `e45f9fa`, `666e59c`, `0348d71`, `21d3f56`, `2cc6c72`
**Files:** `src/components/strata/canvas/exportHandlers.ts`, `src/components/strata/Controls.tsx`, `src/components/strata/StrataCanvas.tsx`
**Also touched:** `src/types/strataTypes.ts`

- **Fix — fill vs. stroke differentiation** (`f6c52fb`): SVG export now
  correctly distinguishes blob shapes (closed path + fill) from brush/line
  shapes (open path + stroke). Previously all shapes exported as filled
  silhouettes regardless of type. Uses `shape.type === 'stroke'` to branch;
  blob shapes use `createSmoothClosedPath`, strokes use `createSmoothOpenPath`
  with `stroke-width="${shape.lineThickness ?? 8}"`, `stroke-linecap="round"`,
  `stroke-linejoin="round"`.

- **Fix — drawInside draw order** (`99e6591`): `isDrawInside` shapes now emit
  in their correct position within the layer draw sequence, not batched at the
  end. Replaced dual-array approach (`svgStack` + `drawInsideShapes`) with a
  single-pass `layerEntries` accumulator. Each `isDrawInside` shape captures
  a snapshot of `normalShapesSoFar` at the exact moment it is processed, and
  its `<clipPath>` + `<defs>` emit inline before the shape, not after the
  full layer.

- **Fix — eraser: nested group+mask replicating destination-out** (`666e59c`):
  Replaced the single-mask-per-layer bucket approach with a nested groups
  stack. Each eraser uses `parts.splice(layerPartsStart)` to extract ALL
  previously emitted content for the current layer, wraps it in
  `<g mask="url(#maskN)">` with a `fill-rule="evenodd"` combined path
  (full-viewport white rect + eraser subpaths as holes), and reinserts.
  `layerPartsStart` is NOT reset between groups, so each successive eraser
  accumulates and wraps all preceding layer output — identical to Canvas
  `destination-out` compositing.

- **Fix — isDrawBehind in masked groups** (`666e59c`): `isDrawBehind` shapes
  inside a masked group now emit BEFORE `prevParts` (the spliced prior
  content), so they appear behind all existing layer content. This replicates
  Canvas `destination-over`.

- **Fix — isDrawBehind in no-eraser groups** (`0348d71`): In groups without
  erasers, `sortBehind` (which merely reordered within the group) was replaced
  by the same splice approach: if there is already emitted layer content,
  `parts.splice(layerPartsStart)` extracts it, behind shapes emit first, then
  prior content is reinserted, then normal shapes. This ensures behind shapes
  in any group appear behind ALL preceding layer output, not just their own
  group's shapes. `sortBehind` helper removed.

- **Fix — eraser path algorithm** (`666e59c`): Eraser mask paths use
  `createSmoothClosedPath(e.points)` — the same quadratic midpoint algorithm
  as Canvas `drawSmoothLine + fill()`. The `eraserPolygon` field (tapered
  stroke polygon) is NOT used because it is geometrically different.

- **Infra — eraser data for SVG** (`b597795`, `e45f9fa`): `lineThickness` is
  now stored in eraser shapes (previously `undefined` for all erasers).
  `eraserPolygon?: Point[]` added to the `Shape` interface in `strataTypes.ts`
  (retained for future use; not used in current mask generation).

- **feat — Undo/Redo keyboard shortcuts** (`21d3f56`): `Ctrl+Z` / `Cmd+Z` for
  Undo, `Ctrl+Y` / `Cmd+Y` for Redo. Added to the existing global `keydown`
  `useEffect` in `Controls.tsx`. Guard: no-op while `textSession.isActive`.

- **feat — Undo/Redo touch gestures** (`2cc6c72`): 2-finger tap (< 300ms) →
  Undo; 3-finger tap (< 250ms) → Redo. Drawing mode only. Implemented in
  `StrataCanvas.tsx` by extending `gestureRef` with `tapStartTime`,
  `tapMoved`, `tapTouchCount`. `isPinching` is now deferred until
  `handleTouchMove` confirms movement > 10px, ensuring taps never trigger
  the post-pinch cooldown. Compatible with existing pinch/zoom and palm
  rejection. `textSession.isActive` guard applied in both `handleTouchStart`
  and tap detection in `handleTouchEnd`.

### 1.13.x — Design System completion + RISO/Grain fix
- **DiToggleSlider** (`src/design-system/DiToggleSlider.tsx`): new primitive for the checkbox-toggle + label + value + range input pattern; supports optional `children` for extra content below the slider
- **DiToggleSlider adoption in ControlsCinematic**: 11 of 12 FX Mix sliders (Grain, Vignette, Chromatic Aberration, Fog, Glow, RISO, Distortion, Wiggle, Grunge, Particles, Depth of Field) replaced with DiToggleSlider; Pixel Art excluded (uses custom UI)
- **DS-5 — Local uiTheme objects removed**: `LayersPanel.tsx` and `ToolOptionsPanel.tsx` local `uiTheme` replaced with `diTokens`; 6 new tokens added (`layerBgActive`, `layerBorderActive`, `borderSubtle`, `segmentActiveBg`, `segmentHoverBg`, `segmentHoverText`)
- **Bugfix — RISO and Grain over Pixel Art**: removed `!isPixelArt` guard from both RISO and Grain conditions in the render pipeline; both effects now correctly apply on top of the pixel-art-processed image

### 1.12.x — Design System (DS-1 through DS-5)
- **DS-1 — Token centralization** (`src/design-system/tokens.ts`): single `diTokens` object with 35+ keys covering surfaces, borders, text, interaction, sliders/toggles, spinners, brand and dialog colors; replaces all `uiTheme` prop drilling
- **DS-2 — Primitive components** (`src/design-system/`): six new Di* components — `DiButton` (variants: default, ghost, icon, brand), `DiIconButton` (icon button with `EnhancedTooltip` integrated), `DiSlider` (label + formatted value + range), `DiPanel` (surface container), `DiDivider` (horizontal/vertical separator), `DiBadge` (status pill with optional icon)
- **DS-3 — Primitive adoption**: `ControlsDrawing.tsx` — 4 DiBadge, 9 DiDivider, 4 DiIconButton; `ControlsCinematic.tsx` — 3 DiIconButton, 3 DiSlider, 3 DiPanel, 2 DiDivider; `ToolOptionsPanel.tsx` — 2 DiSlider (Angle, Intensity)
- **DS-4 — Prop drilling eliminated**: `Controls.tsx` no longer creates or passes `uiTheme`; `ControlsDrawing` and `ControlsCinematic` import `diTokens` directly
- **DS-5 — Local uiTheme objects removed**: `LayersPanel.tsx` and `ToolOptionsPanel.tsx` local `uiTheme` replaced with `diTokens`; 6 new tokens added (`layerBgActive`, `layerBorderActive`, `borderSubtle`, `segmentActiveBg`, `segmentHoverBg`, `segmentHoverText`); `theme: any` typed as `typeof diTokens` in `LayerItemProps`
- **Bugfix**: Symmetry, Draw Inside, Draw Behind, and Organic Mode buttons now correctly disabled when Text tool is active

### 1.8.x — Brush & Stroke Enhancements
- Added **Ink line mode** (`generateInkStroke`): deterministic noise-based wobble, width variation, ink-bleed edges, round end caps
- Per-layer brush settings (thickness + mode stored per layer, restored on layer switch)
- Stroke generators extracted to `StrataContext.tsx` as shared utilities (`generateStrokeForMode`)

### 1.9.x — Layer Management & Persistence
- **Layers Panel** (`LayersPanel.tsx`): dedicated UI for layer visibility, 3D lock, reorder (up/down), duplicate, and delete
- **Layer flip** (horizontal/vertical): flip buttons appear as overlay near Move tool bounding box
- **Project save/load** (`.dior` format): JSON serialization with browser download; file reader with validation and 50 MB size guard
- **Alternative palette**: second 24-color palette; switchable via `SET_ACTIVE_PALETTE` action
- **Onboarding overlay** (`OnboardingOverlay.tsx`): contextual hints on empty canvas, persists dismissal to localStorage
- **Export progress indicator** (`ExportProgress.tsx`): visual overlay during video captures
- **SVG/SVGZ export**: vector export with complexity warning (>800 shapes), keyboard shortcuts Cmd+E / Cmd+Shift+E

### 1.10.x — Depth, Recovery & Polish
- **Layer Spacing slider**: range expanded to 0.00-2.00 (was 0.5-2.0); value of 0 produces flat 2D visualization
- **Canvas recovery hook**: *documented here but never actually committed in 1.10.x — the file did not exist.* A real `useCanvasRecovery` was finally implemented in v3.10.10 (see that changelog entry); this line is kept for historical accuracy.
- **Save deferral**: `handleSaveProject` wraps heavy JSON.stringify + download in `setTimeout(_, 0)` to avoid blocking the synchronous click path
- **Tool Options Panel** (`ToolOptionsPanel.tsx`): extracted context-sensitive UI for Brush line mode/thickness and Gradient settings
- **Fit-to-view on load**: `shouldFitToView` flag triggers auto-fit after loading a project
- **VIEW mode controls refinement**: drag = pan, Shift+drag = orbit, scroll/MMB = zoom (touch: 1-finger pan, 2-finger orbit, pinch zoom)

### 1.11.x — Modular Refactoring (Phases 1–5)
- **StrataCanvas.tsx** reduced from ~3205 to ~2143 lines through systematic extraction
- **Type system centralized**: all interfaces and types moved to `src/types/strataTypes.ts`; re-exported from `StrataContext` for backwards compatibility
- **Stroke generators extracted**: `generateTaperedStroke`, `generateUniformStroke`, `generateInkStroke`, `generateStrokeForMode` → `src/utils/strokeGenerators.ts`
- **Color utilities extracted**: `hexToHSL`, `hslToHex`, `getVibrantVariant`, `hexToRgba` → `src/utils/colorUtils.ts`
- **Canvas utilities extracted**: `createNoise`, `drawSmoothLine`, `drawStraightLine` → `src/utils/canvasUtils.ts`
- **Render constants extracted**: `PARTICLE_COUNT`, `DOUBLE_CLICK_DELAY`, `RENDER_THROTTLE_MS`, etc. → `src/constants/renderConstants.ts`
- **Canvas pipeline modularized** into `src/components/strata/canvas/`: `PixelArtProcessor.ts`, `postProcessing.ts`, `cinematicCamera.ts`, `exportHandlers.ts`, `transformUtils.ts`
- **Controls.tsx split** into three focused components: `ControlsDrawing.tsx` (950 lines), `ControlsCinematic.tsx` (1003 lines), `ControlsExport.tsx` (80 lines); `Controls.tsx` reduced to 229-line compositor

---

## UI Redesign v2 — Estado actual

**Producción.** El rediseño UI v2 está integrado en `feat/ui-redesign-v2` y consolidado en versión 1.16.0. Tras 7 sub-fases de cutover atómico (Fase 8.1 a 8.7), todos los componentes legacy fueron reemplazados por sus equivalentes V2 en commits singulares (sin coexistencia, sin stacking inverso de z-index).

### Inventario producción

**Modales** (vía primitivo compound `DiModal` salvo donde se indique):
- `WelcomeModalV2` — dialog, sin persistencia (opens on every load por diseño)
- `ClearCanvasAlertV2` — alert variant (ESC y backdrop deshabilitados)
- `ComplexSceneModalV2` — dialog con tercera vía "Use Compressed" (SVGZ)
- `ExportProgressV2` — banner variant (sin backdrop, sin scroll lock)
- `OnboardingOverlayV2` — componente propio (no usa primitivo), conectado al state global vía adapter
- `MobileBlockScreenV2` — componente propio, `prefers-color-scheme` autónomo

**Popovers** (vía primitivo `DiSelectorPopover`):
- SVG Export options en `ControlsDrawing.tsx` (SVG / SVG Compressed)

**Patrón adapter (introducido en 8.6):**
`OnboardingOverlayConnected.tsx` aísla la conexión al state global (`useStrata`, `useLoadExampleScene`, 4 condiciones de visibilidad, localStorage persistence) del componente puro V2. Permite mantener `StrataCanvas.tsx` con un cambio de 1 línea (swap de import con alias) y deja el componente V2 testable con props puras. Patrón aplicable a futuros V2 que necesiten lectura compleja de state global.

**Hooks reutilizables introducidos:**
- `src/hooks/useIsMobile.ts` (8.1) — viewport detection vía `matchMedia`
- `src/hooks/useLoadExampleScene.ts` (8.3) — fetch + parse + dispatch de escena de ejemplo, agnóstico al cierre del modal consumidor

### Tokens y design system

Sin cambios respecto a 7.5. La sección "Phase 7.5 — Modal System (V2)" de este documento sigue siendo la fuente de verdad para tokens, primitives `Di*`, y convenciones visuales.

**Fase 9 — cleanup interno completado.** Tras los 7 cutovers de Fase 8, una segunda pasada de housekeeping resolvió 8 items de deuda técnica acumulada: consolidación de hooks duplicados, restricción de tipos contaminados, promoción de primitivos al design system, fixes de UX en tablet, y migración de tokens. Sin cambios funcionales visibles para el usuario; mejora interna que reduce fricción para futuras fases del rediseño.

---

## Phase 7.5 — Modal System (V2)

### Overview

Phase 7.5 of the UI Redesign v2 builds the complete modal and onboarding system for Diorame's new design language. This includes a reusable `DiModal` compound component primitive, the `DiSelectorPopover` utility popover, and six standalone V2 components: `WelcomeModalV2`, `ClearCanvasAlertV2`, `ComplexSceneModalV2`, `ExportProgressV2`, `OnboardingOverlayV2`, and `MobileBlockScreenV2`.

All components live in parallel with their legacy counterparts until Fase 8 cutover. Nothing in this phase modifies production behavior.

- **Branch**: `feat/ui-redesign-v2`
- **Validation**: `/preview?preview=true` — all components rendered with live state from `StrataProvider`
- **Status**: Implementation complete. Pending Fase 8 (global cutover to V2 components).
- **Commits**: 29 commits — range `fae7754` → `2e5c19a`

---

### New Tokens (added in 7.5.0)

Tokens added to `src/design-system/tokens.ts`. All existing `T.*` values are unchanged.

| Token | Value | Use |
|---|---|---|
| `RADIUS.modal` | `24` | Border-radius for DiModal panels. Popovers and banners continue using `RADIUS.panel = 20` to differentiate anchored vs. floating surfaces. |
| `SHADOW.modal` | `0 24px 64px -16px rgba(0,0,0,0.24), 0 8px 24px -8px rgba(0,0,0,0.16)` | Modal box-shadow (light mode) |
| `SHADOW.modalDark` | `0 24px 64px -16px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)` | Modal box-shadow (dark mode). Inner 1px ring replaces border. |
| `Z_INDEX.onboarding` | `800` | `OnboardingOverlayV2` — below banners |
| `Z_INDEX.toast` | `900` | Banner variant (`ExportProgressV2`) — above onboarding, below popovers |
| `Z_INDEX.popover` | `950` | `DiSelectorPopover` — above banners |
| `Z_INDEX.modalBackdrop` | `999` | Backdrop behind modal panels |
| `Z_INDEX.modal` | `1000` | Modal panel container |
| `T.danger` | `rgb(220, 38, 38)` | Destructive action background (light mode) |
| `T.dangerDark` | `rgb(248, 113, 113)` | Destructive action background (dark mode) |
| `T.dangerHover` | `rgb(185, 28, 28)` | Destructive hover state (light mode) |
| `T.dangerHoverDark` | `rgb(252, 165, 165)` | Destructive hover state (dark mode) |

> **Nota:** la migración de tokens de sombra a `SHADOW` se completó en Sub-fase 9.4 (`T.shadow` → `SHADOW.surface`, `T.shadowStrong` eliminado como dead code).

---

### Core Primitives

#### DiModal — Compound Component

**Location:** `src/components/strata/modals/`

| File | Purpose |
|---|---|
| `DiModal.tsx` | Root — portal to `document.body`, backdrop, `AnimatePresence`, context provider |
| `DiModalContext.ts` | Internal context: `{ onClose, dark, variant }` — read by all sub-components |
| `useModalBehavior.ts` | Behavior hook: focus trap, ESC handler, scroll lock, initial focus, ARIA roles |
| `DiModalBackdrop.tsx` | Backdrop overlay — `blur(8px)` + asymmetric dim |
| `DiModalHeader.tsx` | Title + optional subtitle + optional close slot |
| `DiModalBody.tsx` | Padded scrollable content area |
| `DiModalFooter.tsx` | Action row — `justify-content: flex-end`, `gap: 8` |
| `DiModalCloseButton.tsx` | Standalone X button (used standalone in `WelcomeModalV2`) |
| `DiModalActions.tsx` | 6 action button variants (see table below) |
| `index.ts` | Barrel — `Object.assign` compound export + all V2 component named exports |

**API:**

```jsx
<DiModal open={...} onClose={...} variant="dialog|alert|banner" size="sm|md|lg" dark={dark}>
  <DiModal.Header title="..." subtitle="..." />
  <DiModal.Body>...</DiModal.Body>
  <DiModal.Footer>
    <DiModal.SecondaryAction onClick={onClose}>Cancel</DiModal.SecondaryAction>
    <DiModal.PrimaryAction onClick={onConfirm}>OK</DiModal.PrimaryAction>
  </DiModal.Footer>
</DiModal>
```

**Variants:**

| Variant | Backdrop | Scroll lock | ESC closes | Enter | Exit |
|---|---|---|---|---|---|
| `dialog` | ✅ blur+dim | ✅ | ✅ | 220ms fade+scale | 180ms fade+scale |
| `alert` | ✅ blur+dim | ✅ | ❌ (initial focus: Cancel) | 160ms fade+scale | 140ms fade+scale |
| `banner` | ❌ | ❌ | ❌ | 180ms slide-down | 150ms slide-up |

**Sizes:** `sm` = 340px · `md` = 440px (default) · `lg` = 680px

**Action sub-components:**

| Component | Height | Style | Notes |
|---|---|---|---|
| `PrimaryAction` | 36px | Purple fill, white text | Default CTA |
| `SecondaryAction` | 36px | Transparent + border | Cancel / secondary |
| `DestructiveAction` | 36px | Danger fill, white text | Irreversible actions |
| `TertiaryAction` | 36px | Transparent, no border | Ghost / low-emphasis |
| `PrimaryActionLg` | 44px | Purple fill — larger touch target | Dominant CTAs (Welcome, Onboarding) |
| `SecondaryActionLg` | 44px | Transparent + border — larger touch target | Symmetrical partner to `PrimaryActionLg` |

All actions read `dark` from `DiModalContext`. To use Actions outside a `DiModal` (e.g. `OnboardingOverlayV2`), wrap in `<DiModalContext.Provider value={{ onClose, dark, variant: 'dialog' }}>`.

---

#### DiSelectorPopover — Utility Popover

**Location:** `src/components/strata/popovers/`

| File | Purpose |
|---|---|
| `DiSelectorPopover.tsx` | Main popover — portal, auto-placement, keyboard nav |
| `DiSelectorOption.tsx` | Option row sub-component |
| `usePopoverPosition.ts` | Auto-placement hook: measures available space above/below anchor, flips as needed |
| `index.ts` | Barrel export |

**API:**

```jsx
<DiSelectorPopover
  anchorRef={btnRef}
  open={...}
  onClose={...}
  dark={dark}
  placement="auto"
  align="center"
>
  <DiSelectorOption title="..." description="..." onSelect={...} />
</DiSelectorPopover>
```

Not a modal — anchored to a trigger element. `Z_INDEX.popover = 950`. No backdrop, no focus trap. Keyboard: `Esc` closes, arrow keys + `Tab` navigate options.

---

### V2 Modal Components

All located in `src/components/strata/modals/`.

#### WelcomeModalV2 _(7.5.3 + 7.5.3.1)_

- **Primitive:** `DiModal` — `variant="dialog"`, `size="md"`
- **Props:** `open`, `onClose`, `onLoadExample` (async), `dark`
- Split layout: 160px illustration column + 280px content column
- No `DiModal.Header` — title inline; `DiModal.CloseButton` rendered standalone top-right
- Illustration system: `welcomeIllustrations.ts` maps version string → asset path; assets served from `public/welcome-illustrations/`
- No persistence — opens every page load (intentional design: returning users get a fresh illustration)
- Footer: `PrimaryActionLg` "Start drawing" + `SecondaryAction` "Load example scene" (stacked)
- `APP_VERSION` sourced from `src/constants/version.ts` (refactored out of `StrataContext.tsx` in 7.5.3)

#### ClearCanvasAlertV2 _(7.5.4)_

- **Primitive:** `DiModal` — `variant="alert"`, `size="sm"`
- **Props:** `open`, `onClose`, `onConfirm`, `dark`
- `alert` variant: ESC disabled, initial focus on Cancel (`data-di-cancel="true"`)
- Footer: `SecondaryAction` "Cancel" + `DestructiveAction` "Clear canvas"

#### ComplexSceneModalV2 _(7.5.4)_

- **Primitive:** `DiModal` — `variant="dialog"`, `size="md"`
- **Props:** `open`, `onClose`, `onContinue`, `onUseCompressed`, `shapeCount`, `dark`
- Body: shape count formatted via `Intl.NumberFormat('en-US')` + purple-wash recommendation box (`T.purple10` / `T.purple20` bg)
- Footer (3 buttons): `TertiaryAction` "Use Compressed instead" (left) · `<div style={{ flex: 1 }} />` spacer · `SecondaryAction` "Cancel" · `PrimaryAction` "Continue" (right)

#### ExportProgressV2 _(7.5.5)_

- **Primitive:** `DiModal` — `variant="banner"` (no backdrop, no scroll lock, no ESC)
- **Props:** `open`, `exportType` (`'png' | 'mp4' | 'svg' | 'svgz'`), `dark`
- No `onClose` — parent controls lifecycle by toggling `open`
- Layout: single-line — pulsing icon (16px) · label · `flex: 1` spacer · 80×4px progress bar · percentage
- Icon mapping: `camera` (png) · `record` (mp4) · `export` (svg/svgz) — all exist in `ICONS`
- Progress: asymptotic simulation `p += (100 − p) × 0.02` at 50ms intervals; resets when `open` → false
- `ico-pulse` keyframe defined in `src/styles/globals.css`

#### OnboardingOverlayV2 _(7.5.6 + 7.5.6.1)_

- **Primitive:** None — standalone component
- **Props:** `open`, `onClose`, `onLoadExample` (async), `dark`
- `position: fixed; inset: 0` · `pointer-events: none` wrapper · `auto` on content · `Z_INDEX.onboarding = 800`
- Animation: opacity fade only (no scale) — enter 250ms, exit 200ms via framer-motion
- Layout: centered container max-width 640px, 6 cards in 2 sections:
  - **DRAW**: Blob (`blob`) / Brush (`brush`) / Layers (`duplicate`)
  - **VIEW**: Motion (`camera`) / Effects (`sparkles`) / Depth (`depth-far`)
- Cards: transparent background + `RADIUS.iconBtn` border — glass-like effect on the canvas
- Card title: Manrope 700 16px · description: `TYPE.numericValue` muted
- CTAs: `SecondaryActionLg` "Load example scene" + `PrimaryActionLg` "Start drawing" (both 44px)
- Actions used outside `DiModal` — wrapped in `<DiModalContext.Provider value={{ onClose, dark, variant: 'dialog' }}>`

#### MobileBlockScreenV2 _(7.5.7)_

- **Primitive:** None — standalone terminal component
- **Props:** None
- `position: fixed; inset: 0` · `z-index: 9999` hardcoded (independent of design system — renders before `ThemeProvider`)
- Theming: CSS custom properties + `@media (prefers-color-scheme: dark)` injected via `<style dangerouslySetInnerHTML>`:

| CSS variable | Light value | Dark value | Token reference |
|---|---|---|---|
| `--mbs-bg` | `rgb(255, 255, 255)` | `rgb(26, 26, 26)` | `T.white` / `T.dark` |
| `--mbs-text` | `rgb(26, 26, 26)` | `rgba(255, 255, 255, 0.85)` | `T.dark` / `T.textDark` |
| `--mbs-muted` | `rgb(140, 140, 140)` | `rgba(255, 255, 255, 0.40)` | `T.muted` / `T.textDarkMuted` |

- Layout: vertically centered — logo (120px) → wordmark text → `tablet` + `monitor` icons (52px, `T.purple`, gap 16px) → primary message (Manrope 600 16px) → secondary message (Manrope 400 14px, max-width 320px)
- No animations · No CTAs · No interactive elements
- **Fase 8 integration:** In `App.tsx`, use `useIsMobile()` hook (already in legacy `MobileBlockScreen.tsx`):
  ```tsx
  const isMobile = useIsMobile();
  if (isMobile) return <MobileBlockScreenV2 />;
  ```

---

### Design Decisions

| # | Decision | Resolution |
|---|---|---|
| 1 | Modal system | Compound component (`DiModal`) with `Object.assign` sub-component API. No Radix UI — full control over animation, theming, and behavior with no external dependency. |
| 2 | Backdrop | `blur(8px)` + asymmetric dim: `rgba(0,0,0,0.32)` light / `rgba(0,0,0,0.55)` dark. Semi-transparent to preserve spatial context. |
| 3 | Surface treatment | Flat solid background + deep `SHADOW.modal` + 1px border (dark only — replaces border with inner ring in `SHADOW.modalDark`). |
| 4 | Animation | Fade + scale `0.96 → 1`. No spring/bounce. Per-variant timing. Banner uses translate-Y instead of scale. |
| 5 | WelcomeModal persistence | No localStorage — opens every load. Intentional: users can reload for a fresh illustration without added UI complexity. |
| 6 | Modal sizes | `sm` 340px · `md` 440px · `lg` 680px. Three breakpoints cover all current use cases without a fluid system. |
| 7 | Footer layout | `justify-content: flex-end`. Multi-button layouts use `<div style={{ flex: 1 }} />` to anchor left-side buttons. All footer buttons use pre-styled Action sub-components — no raw `<button>` in modal footers. |
| 8 | Border radius | `RADIUS.modal = 24` for floating dialogs vs. `RADIUS.panel = 20` for anchored panels. 4px delta provides perceptible visual hierarchy. |
| 9 | Banner variant | No backdrop, no scroll lock, no ESC handler. Architectural fix applied in 7.5.5.1 — initial implementation incorrectly shared all behaviors with `dialog`. |
| 10 | MobileBlockScreen theming | CSS custom properties via injected `<style>` tag — required because component renders before `ThemeProvider` and cannot use `dk()` or `T` tokens at runtime. Hex values are hardcoded with inline token reference comments. |

---

### Changelog — Sub-phase History

29 commits on `feat/ui-redesign-v2` (range `fae7754` → `2e5c19a`).

| Sub-fase | Description | Commits |
|---|---|---|
| **7.5.0** | New modal design tokens: `RADIUS.modal`, `SHADOW.modal/Dark`, full `Z_INDEX` scale, `T.danger*` | `fae7754` |
| **7.5.1** | `DiModal` compound: context + behavior hook · sub-components · root + barrel · preview | `4b87580`, `2b4a966`, `c25bfed`, `29629ab` |
| **7.5.2** | `DiSelectorPopover`: `Z_INDEX.popover` token · position hook · option · popover · preview | `e979b1b`, `1327b61`, `b0b4648`, `c2bc873`, `8f21a53` |
| **7.5.3** | `WelcomeModalV2`: APP_VERSION refactor · illustration map · component · preview | `068b386`, `bfb3906`, `a51b553`, `17f22df` |
| **7.5.3.1** | `DiModal.PrimaryActionLg` variant + WelcomeModal CTA reorder | `247b60c`, `8054046` |
| **7.5.3.1.1** | Fix: `PrimaryActionLg` border-radius → `RADIUS.pill` | `ffbe476` |
| **7.5.4** | `ClearCanvasAlertV2` + `ComplexSceneModalV2` + preview triggers | `a00f538`, `47e6355`, `07773d6` |
| **7.5.5** | `ExportProgressV2` banner + preview triggers for all 4 export types | `81c100d`, `4341da1` |
| **7.5.5.1** | Architectural fix: `banner` → no backdrop, `Z_INDEX.toast`, no scroll lock, no ESC | `2ea7069` |
| **7.5.6** | `OnboardingOverlayV2` with 6-card grid + preview trigger | `a413883`, `0c168c7` |
| **7.5.6.1** | `DiModal.SecondaryActionLg` + OnboardingOverlay visual polish | `22d5b95`, `8f966b0` |
| **7.5.7** | `MobileBlockScreenV2` + preview trigger with escape button | `c8e15fa`, `2e5c19a` |


> **Estado tras Fase 8:** todos los componentes V2 descritos en esta sección están en producción (versión 1.16.0). Esta sección queda como referencia histórica del diseño y decisiones tomadas durante la construcción del sistema en paralelo.

---

## Final Notes

This document is a living reference. It should evolve with the project, but its core principles remain fixed.

**When in doubt**:
1. Prioritize stability over features
2. Measure performance before and after
3. Respect the existing baseline
4. Keep changes small and reversible

Diorame is a tool for artists, not engineers. Every decision should serve the creative experience first.
