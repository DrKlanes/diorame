# Diorame — Project Reference Document

**Version**: 3.0.1
**Last Updated**: Mayo 2026
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
1. **Blob** (Internal: `brush`)
   - Pressure-sensitive blob tool
   - Creates filled shapes from stroke paths
   - Supports symmetry, draw-inside, draw-behind modes

2. **Brush** (Internal: `line`)
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
- **Cinematic Moves**: 10 preset camera animations (Forward, Spiral, Yoyo, Pulse, Twist, Arc, Crane, Truck, Orbit, Zoom)
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

7. **Canvas Recovery**
   - `useCanvasRecovery` hook monitors page visibility and window focus events
   - Dispatches synthetic `pointerup` events to reset stuck drawing state after download dialogs or tab switches
   - Intercepts native `pointercancel` events (not bound by StrataCanvas) and forwards as `pointerup`
   - Refocuses the canvas element with staggered delays (50ms, 300ms) to restore keyboard/pointer input

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
| `StrataCanvas.tsx` | ~1289 | Thin React shell: render loop, event handlers, gesture input. **Frozen** — extract only, never add. |
| `StrataContext.tsx` | ~1669 | React Context + useReducer: app reducer, constants, re-exports all types |
| `ControlsV2.tsx` | ~150 | Thin root compositor for both modes. Mounts all UI atoms; enforces `isUIHidden`; hosts 3 global side-effects (keyboard shortcuts, sessionStorage cleanup, mode-change camera reset). |

**Drawing mode atoms (`topbar/`, `bottombar/`, `layers/`, `colorpalette/`, `drawing/`, `viewport/`, `text/`):**

| File | Purpose |
|---|---|
| `topbar/TopBar.tsx` | Slot router: FileControlsPill (draw) / SnapshotRecordPill (view) + shared ModeSwitchPill + ThemeTogglePill |
| `topbar/FileControlsPill.tsx` | new / open / save / export (SVG/SVGZ) + undo/redo + project name + info |
| `topbar/SnapshotRecordPill.tsx` | PNG snapshot + MP4 record in VIEW mode |
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
| `fx/FXPanel.tsx` | FX panel (VIEW mode): 12 effects in 3 groups, master toggle FXMasterBtn, snapshot/restore |
| `fx/FXRow.tsx` | Per-effect row: toggle + slider/discrete/composite control |

**Modals (`modals/`):** ClearCanvasAlertV2, ComplexSceneModalV2, WelcomeModalV2, OnboardingOverlayV2, ExportProgressV2, MobileBlockScreenV2 + shared DiModal primitives

**Popovers (`popovers/`):** DiSelectorPopover + DiSelectorOption

### Canvas Pipeline (`src/components/strata/canvas/`)

| File | Lines | Purpose |
|---|---|---|
| `cinematicCamera.ts` | 150 | `computeCinematicTick`: all 10 camera modes + handheld shake, returns new camera state |
| `composeLayer.ts` | 98 | Layer compositing to offscreen buffer (pixel art + fog/glow/DoF) |
| `drawBackground.ts` | 47 | Canvas background rendering (paper texture, dark mode) |
| `drawGizmo.ts` | 179 | Move tool gizmo handles + flip overlay buttons |
| `drawSymmetryAxis.ts` | 31 | Symmetry axis line rendering |
| `exportHandlers.ts` | 422 | `exportAsPNG`, `exportAsSVG`, `exportAsMP4`: all export logic |
| `PixelArtProcessor.ts` | 173 | Pixel art post-processing: downscale, palette quantization, Bayer dithering |
| `postProcessing.ts` | 409 | 8 effects: `applyFog`, `applyGlow`, `applyDoFBlur`, `applyRisoV2` (4-pass), `applyChromaticAberration`, `applyVignette`, `applyGrain`, `applyGrunge` |
| `quantizePixelArtCamera.ts` | 99 | Snaps camera to pixel grid for pixel art mode |
| `renderEraserShape.ts` | 30 | Eraser shape rendering (destination-out compositing) |
| `renderLayerBody.ts` | 380 | Per-layer renderer: `renderLayer(z, rc, offCtx, pfc)` |
| `renderLiveStroke.ts` | 151 | In-progress live stroke rendering |
| `renderParticles.ts` | 98 | Floating cinematic particles rendering |
| `renderPipeline.ts` | 476 | Frame orchestrator: `renderFrame(ctx, rc: RenderContext)` — accepted 400L oversize (see §12) |
| `renderRegularFillShape.ts` | 95 | Regular fill shapes (blob / tapered brush) |
| `renderTextShape.ts` | 175 | Text shape rendering with font + alignment |
| `renderUniformLineShape.ts` | 144 | Uniform-mode brush stroke rendering |
| `transformPoint.ts` | 124 | `createTransformPoint` factory for 3D projection |
| `transformUtils.ts` | 134 | `getLayerBoundingBox`: pixel-accurate bounding box for Move tool gizmo |

### Type System (`src/types/`)

| File | Lines | Purpose |
|---|---|---|
| `strataTypes.ts` | 136 | All TypeScript interfaces and types: `Point`, `Shape`, `AppState`, `AppMode`, `ToolType`, `HistorySnapshot`, post-processing types, etc. Re-exported from `StrataContext.tsx` for backwards compatibility. |

### Utilities (`src/utils/`)

| File | Lines | Purpose |
|---|---|---|
| `colorUtils.ts` | 33 | `hexToHSL`, `hslToHex`, `getVibrantVariant`, `hexToRgba` |
| `canvasUtils.ts` | 32 | `createNoise`, `drawSmoothLine`, `drawStraightLine` |
| `strokeGenerators.ts` | 294 | `generateTaperedStroke`, `generateUniformStroke`, `generateInkStroke`, `generateStrokeForMode` |

### Constants (`src/constants/`)

| File | Lines | Purpose |
|---|---|---|
| `renderConstants.ts` | 32 | `PARTICLE_COUNT`, `MIN_TOUCH_STROKE_POINTS`, `FOG_DENSITY_FACTOR`, `HANDHELD_SWAY_FREQ`, `HANDHELD_TREMOR_FREQ`, `DOUBLE_CLICK_DELAY`, `RENDER_THROTTLE_MS`, `DRAW_FOCAL_LENGTH`, `NEAR_CLIP` |

### Hooks (`src/hooks/`)

| File | Purpose |
|---|---|
| `useAutoSave.ts` | Periodic auto-save of the project |
| `useBeforeUnload.ts` | Warns before closing if there are unsaved changes |
| `useExportFlow.ts` | Orchestrates the export flow (PNG / SVG / MP4) |
| `useIsMobile.ts` | Mobile device detection via `matchMedia` |
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
- `hiddenLayers` is excluded from undo/redo

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
| `src/components/strata/StrataCanvas.tsx` | ~1290 | Legacy monolith — subject of ongoing extraction (Plan C). Never add to it. |
| `src/components/strata/canvas/renderPipeline.ts` | ~476 | Frame orchestrator. Accepted oversize: its purpose is to sequence all render sub-modules in the correct order. Splitting into smaller files would fragment the orchestration logic without reducing real complexity. |

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
APP_VERSION = "3.0.1"           // Current release version
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

## Appendix C: Changelog Highlights (1.7.3 → 3.0.1)

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
- **Canvas recovery hook** (`useCanvasRecovery.ts`): monitors page visibility and window focus; dispatches synthetic `pointerup` to reset stuck pointer state after download dialogs; intercepts native `pointercancel` events
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

## Phase 8 — Cutover Plan

> **Estado:** COMPLETADA en versión 1.16.0. Todas las sub-fases (8.0 a 8.8) cerradas. El plan que sigue queda como referencia histórica del orden de ejecución y las decisiones tomadas.

### Overview

Phase 8 replaces all legacy modal/UI components with their V2 counterparts in the production app. The V2 system built in Phase 7.5 has been validated in `/preview?preview=true`; Phase 8 integrates it into the real render tree.

Key principles:
- **Ordering: low → high risk** — sub-phases 8.1 (terminal screen) → 8.7 (popover) proceed from simplest to most complex. Each validates before the next begins.
- **Atomic cutover**: each sub-phase deletes the legacy component AND integrates V2 in the **same commit**. No moment where legacy and V2 coexist in the live render tree (avoids z-index inversion: V2 uses `Z_INDEX.*` 800–1000 while legacy uses Tailwind `z-[60]`/`z-[100]`).
- **Branch**: all work in `feat/ui-redesign-v2`. Push to `main` only after 8.8 validation completes.
- **Rollback**: any sub-phase failure → revert commit or reset to `pre-phase-8` tag (created in 8.0.3) before attempting again.

---

### Pre-cutover (Sub-phase 8.0)

Complete before beginning any sub-phase cutover.

**8.0.1 — Resolve missing icons (BACKLOG Item 2)**

Extract SVG paths from the Diorame icon source file and add to `src/design-system/icons.ts`:
- `video` — replaces fallback `record` in `ExportProgressV2.tsx` (`EXPORT_CONFIG.mp4`)
- `code` — replaces fallback `export` in `ExportProgressV2.tsx` (`EXPORT_CONFIG.svg/svgz`)
- `layers` — replaces fallback `duplicate` in `OnboardingOverlayV2.tsx` (`DRAW_CARDS[2]`)

After adding icons: update `ExportProgressV2.tsx` and `OnboardingOverlayV2.tsx` to use the canonical names. Low-risk, self-contained.

**8.0.2 — Confirm atomic cutover rule**

Review every sub-phase below and confirm that legacy deletion + V2 integration happen in the same commit. Document explicitly if any sub-phase requires a two-commit approach (and justify why).

**8.0.3 — Tag current branch state**

```bash
git tag pre-phase-8
```

This tag is the safe rollback point if a sub-phase introduces a critical regression.

---

### Cutover Sequence (Sub-phases 8.1 → 8.7)

---

#### Sub-phase 8.1 — MobileBlockScreen

- **Risk**: low
- **Legacy to delete**: `src/components/strata/MobileBlockScreen.tsx`
- **V2 to integrate**: `src/components/strata/modals/MobileBlockScreenV2.tsx`
- **Parent file**: `src/App.tsx`
- **Pre-delete task**: `useIsMobile()` hook is exported from `MobileBlockScreen.tsx` and used in `App.tsx`. Extract it to a standalone file **before** deleting the legacy:
  - Create `src/hooks/useIsMobile.ts` with the hook implementation
  - Update `App.tsx` import: `useIsMobile` from `../hooks/useIsMobile`
  - Then delete `MobileBlockScreen.tsx`
- **Swap in `App.tsx`**:
  - Replace `import { MobileBlockScreen, useIsMobile } from './components/strata/MobileBlockScreen'` with imports from V2 and new hook
  - Replace `<MobileBlockScreen />` with `<MobileBlockScreenV2 />`
  - `MobileBlockScreenV2` accepts no props ✅
- **Verification**:
  - Chrome DevTools → viewport < 768px → `MobileBlockScreenV2` appears
  - OS dark mode toggle → background and text update via `prefers-color-scheme`
  - Viewport ≥ 768px → app renders normally (overlay not present)
- **Risks**: none critical. Terminal component with no interactive state.

---

#### Sub-phase 8.2 — ExportProgress

- **Risk**: low
- **Legacy to delete**: `src/components/strata/ExportProgress.tsx`
- **V2 to integrate**: `src/components/strata/modals/ExportProgressV2.tsx`
- **Current parent**: `src/App.tsx` (inside `AppContent` function)
- **State consumed by legacy** (via internal `useStrata()`): `state.isExporting`, `state.exportRequest`
- **Move render to `Controls.tsx`**: `ExportProgressV2` requires `dark` prop (from `useTheme()`). `Controls.tsx` already consumes `useStrata()` and can add `useTheme()`. Moving the render avoids adding new hooks to `AppContent`.
- **Props to pass from `Controls.tsx`**:
  ```tsx
  <ExportProgressV2
    open={state.isExporting}
    exportType={state.exportRequest ?? 'png'}
    dark={dark}
  />
  ```
  Note: `state.exportRequest` type is `'svg' | 'svgz' | 'mp4' | 'png' | null` — the `?? 'png'` fallback handles `null`.
- **Verification**:
  - Trigger PNG export → banner slides in from top, icon pulses, bar advances, banner disappears on completion
  - Trigger MP4 → same flow with `video` icon (post-8.0.1) and longer duration
  - Trigger SVG/SVGZ → `code` icon (post-8.0.1)
  - Banner does NOT block canvas interaction (pointer-events on banner only, not full viewport)
- **Risks**: low. Banner is display-only; no dispatch needed.

---

#### Sub-phase 8.3 — WelcomeModal

- **Risk**: medium-low
- **Legacy to delete**: `src/components/strata/WelcomeModal.tsx`
- **V2 to integrate**: `src/components/strata/modals/WelcomeModalV2.tsx`
- **Current parent**: `src/App.tsx` (inside `AppContent`, no props — reads state internally via `useStrata()`)
- **State consumed by legacy**: `state.isWelcomeModalOpen`, dispatches `TOGGLE_WELCOME_MODAL` and `LOAD_PROJECT`
- **Move render to `Controls.tsx`**: V2 requires `open`, `onClose`, `onLoadExample`, `dark` — all derivable in `Controls.tsx`.
- **Handler to extract**: the `onLoadExample` logic (fetch + `LOAD_PROJECT` dispatch + close) currently lives inside `WelcomeModal.tsx`. Extract to `src/hooks/useLoadExampleScene.ts` — this hook will be shared with `OnboardingOverlayV2` (sub-phase 8.6).
- **Props to pass from `Controls.tsx`**:
  ```tsx
  <WelcomeModalV2
    open={state.isWelcomeModalOpen}
    onClose={() => dispatch({ type: 'TOGGLE_WELCOME_MODAL' })}
    onLoadExample={handleLoadExampleScene}   // from extracted hook
    dark={dark}
  />
  ```
- **Verification**:
  - Fresh load → `WelcomeModalV2` appears with `v1-15.png` illustration
  - Click "Start drawing" → closes; canvas ready
  - Click "Load example scene" → loads `.dior` example, closes modal
  - Press `Shift + ?` → reopens `WelcomeModalV2`
  - Dark mode → modal renders correctly in dark variant
- **Risks**: medium-low. First modal with real dispatch. Verify `TOGGLE_WELCOME_MODAL` action exists in reducer.

---

#### Sub-phase 8.4 — ClearCanvasAlertDialog

- **Risk**: medium-low
- **Legacy to delete**: Radix `<AlertDialog>` inline in `src/components/strata/ControlsDrawing.tsx` (lines ~558–590)
- **V2 to integrate**: `src/components/strata/modals/ClearCanvasAlertV2.tsx`
- **Parent file**: `src/components/strata/ControlsDrawing.tsx`
- **Current trigger**: Trash2 icon button at line ~559–567, currently uses Radix `<AlertDialogTrigger asChild>`. After swap: button becomes a regular `onClick={() => setClearCanvasOpen(true)}`.
- **Add local state** in `ControlsDrawing.tsx`:
  ```tsx
  const [clearCanvasOpen, setClearCanvasOpen] = useState(false);
  ```
- **The `onConfirm` handler must dispatch three things** (currently at lines ~579–583):
  ```tsx
  const handleClearCanvas = () => {
    dispatch({ type: 'CLEAR_CANVAS' });
    dispatch({ type: 'UPDATE_CAMERA', payload: { x: 0, y: 0, z: 0, rotation: 0 } });
    sessionStorage.removeItem('diorame-view-initialized');
    setClearCanvasOpen(false);
  };
  ```
- **Props to pass**:
  ```tsx
  <ClearCanvasAlertV2
    open={clearCanvasOpen}
    onClose={() => setClearCanvasOpen(false)}
    onConfirm={handleClearCanvas}
    dark={dark}
  />
  ```
- **Remove Radix imports**: after swap, remove `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` from imports (lines ~10–18) if no longer used elsewhere in the file.
- **Verification**:
  - Draw something → click Trash2 button → `ClearCanvasAlertV2` appears
  - Click "Clear canvas" → all three dispatches fire, canvas is empty, modal closes
  - Click "Cancel" → no dispatch, modal closes
  - Press ESC → no dispatch (alert variant: ESC disabled in V2 — confirm this is the desired UX, else add ESC handler)
  - Click backdrop → no dismiss (alert variant: backdrop click disabled)
- **Risks**: medium-low. Destructive action — verify all three dispatches in `onConfirm`.

---

#### Sub-phase 8.5 — ComplexSceneModal (ControlsExport)

- **Risk**: medium
- **Legacy to delete**: `src/components/strata/ControlsExport.tsx`
- **V2 to integrate**: `src/components/strata/modals/ComplexSceneModalV2.tsx`
- **Parent file**: `src/components/strata/Controls.tsx` (renders `<ControlsExport>` at the bottom of JSX)
- **Existing state in `Controls.tsx`** (already present — no new state needed):
  - `showComplexityWarning` / `setShowComplexityWarning`
  - `pendingExportFormat` / `setPendingExportFormat`
  - `handleProceedWithExport` — dispatches `REQUEST_EXPORT` with `pendingExportFormat`
  - `handleCancelExport` — clears warning state
- **New handler needed**:
  ```tsx
  const handleUseCompressedExport = useCallback(() => {
    dispatch({ type: 'REQUEST_EXPORT', payload: 'svgz' });
    setShowComplexityWarning(false);
    setPendingExportFormat(null);
  }, [dispatch]);
  ```
- **Props to pass**:
  ```tsx
  <ComplexSceneModalV2
    open={showComplexityWarning}
    onClose={handleCancelExport}
    onContinue={handleProceedWithExport}
    onUseCompressed={handleUseCompressedExport}
    shapeCount={getSceneComplexity().totalShapes}
    dark={dark}
  />
  ```
- **Remove `ControlsExport` import** from `Controls.tsx` after swap.
- **Verification**:
  - Create scene with >800 visible shapes, trigger SVG export → `ComplexSceneModalV2` appears
  - Shape count displays with US formatting ("1,243" not "1243")
  - Purple-wash recommendation box visible
  - "Continue" → exports SVG with original format
  - "Use Compressed instead" → exports SVGZ
  - "Cancel" / ESC / backdrop click → cancels without exporting
- **Risks**: medium. Three exit paths; verify each dispatches correctly and state clears cleanly.

---

#### Sub-phase 8.6 — OnboardingOverlay

- **Risk**: medium-high
- **Legacy to delete**: `src/components/strata/OnboardingOverlay.tsx`
- **V2 to integrate**: `src/components/strata/modals/OnboardingOverlayV2.tsx`
- **Current parent**: `src/components/strata/StrataCanvas.tsx` (line 2254) — rendered as `<OnboardingOverlay />` with no props; reads all state internally
- **StrataCanvas is frozen** — only line-count-neutral swaps allowed. Strategy:
  - Create `src/components/strata/OnboardingOverlayConnected.tsx` — a thin adapter that reads state via `useStrata()` internally, derives all props, and renders `<OnboardingOverlayV2 .../>`. Takes no props (drop-in replacement for `<OnboardingOverlay />`).
  - In `StrataCanvas.tsx`: swap import only (`OnboardingOverlay` → `OnboardingOverlayConnected`), JSX tag unchanged. Net change: 0 lines added/removed in StrataCanvas.
- **`OnboardingOverlayConnected` logic**:
  ```tsx
  // Derives shouldShow from 4 conditions (matches legacy OnboardingOverlay.tsx):
  const shouldShow = !state.isWelcomeModalOpen
    && state.isOnboardingVisible
    && state.shapes.length === 0
    && state.mode === 'drawing';

  // Respects localStorage persistence on mount (from legacy):
  useEffect(() => {
    const seen = localStorage.getItem('diorame-onboarding-seen');
    if (seen === 'true' && state.isOnboardingVisible) {
      dispatch({ type: 'DISMISS_ONBOARDING' });
    }
  }, []);
  ```
- **Dismiss handler** (combines persistence + dispatch):
  ```tsx
  const handleDismiss = () => {
    localStorage.setItem('diorame-onboarding-seen', 'true');
    dispatch({ type: 'DISMISS_ONBOARDING' });
  };
  ```
- **`onLoadExample`**: reuse `handleLoadExampleScene` extracted in 8.3 (import from `src/hooks/useLoadExampleScene.ts`).
- **Auto-dismiss on drawing** (`StrataCanvas.tsx` lines 789–793): already dispatches `DISMISS_ONBOARDING` and sets localStorage on `handlePointerDown`. No change needed — this logic depends on `state.isOnboardingVisible`, not on the component itself.
- **Verification**:
  - Clear `localStorage.removeItem('diorame-onboarding-seen')`, reload
  - Dismiss WelcomeModal → OnboardingOverlayV2 appears (canvas empty, drawing mode)
  - All 6 cards visible with correct icons (including `layers` icon from 8.0.1)
  - Click "Start drawing" → overlay closes, `localStorage` set
  - Click "Load example scene" → loads `.dior`, overlay closes
  - Make first stroke on canvas → overlay dismisses immediately (via StrataCanvas pointerdown)
  - Reload → overlay does NOT appear (localStorage persists)
- **Risks**: medium-high. Most conditions of any single cutover. The connected-adapter pattern protects StrataCanvas from modifications beyond a 1-line import swap.

---

#### Sub-phase 8.7 — SVG Export Popover

- **Risk**: medium
- **Legacy to delete**: Radix `<Popover>` inline in `src/components/strata/ControlsDrawing.tsx` (lines ~237–281)
- **V2 to integrate**: `src/components/strata/popovers/DiSelectorPopover.tsx` + `DiSelectorOption.tsx`
- **Parent file**: `src/components/strata/ControlsDrawing.tsx`
- **`svgExportOpen` / `setSvgExportOpen`** already received as props from `Controls.tsx` ✅ — no state changes
- **Add `anchorRef`**: create a `useRef` for the SVG export trigger button in `ControlsDrawing.tsx`:
  ```tsx
  const svgButtonRef = useRef<HTMLButtonElement>(null);
  ```
  Attach to the trigger button: `ref={svgButtonRef}`
- **Swap**:
  ```tsx
  <DiSelectorPopover
    anchorRef={svgButtonRef}
    open={svgExportOpen}
    onClose={() => setSvgExportOpen(false)}
    dark={dark}
    placement="auto"
    align="center"
  >
    <DiSelectorOption
      title="SVG"
      description="Standard vector — full fidelity"
      onSelect={() => handleExportRequest('svg')}
    />
    <DiSelectorOption
      title="SVG (Compressed)"
      description="Smaller file, same quality"
      onSelect={() => handleExportRequest('svgz')}
    />
  </DiSelectorPopover>
  ```
- **Remove Radix imports**: remove `Popover`, `PopoverContent`, `PopoverTrigger` from imports if no longer used elsewhere in `ControlsDrawing.tsx`. (A second `<Popover>` exists at line ~488 for LayersPanel — do not remove Radix import if that Popover is still present.)
- **Verification**:
  - Click SVG export button in drawing toolbar → `DiSelectorPopover` appears anchored
  - Two options with title + muted description visible
  - Click "SVG" → `handleExportRequest('svg')` fires, popover closes
  - Click "SVG (Compressed)" → `handleExportRequest('svgz')` fires, popover closes
  - Click outside → closes without export
  - Press ESC → closes without export
  - Arrow keys / Tab → navigate options
  - Dark mode → popover renders in dark variant
- **Risks**: medium. Popover uses `anchorRef` for positioning — ensure the ref is attached before the popover opens.

---

### Post-cutover (Sub-phase 8.8)

Complete after all 7 sub-phases pass verification.

**8.8.1 — Audit dead imports**

```bash
grep -r "WelcomeModal" src/ --include="*.tsx" --include="*.ts" | grep -v "WelcomeModalV2"
grep -r "ExportProgress" src/ --include="*.tsx" --include="*.ts" | grep -v "ExportProgressV2"
grep -r "OnboardingOverlay" src/ --include="*.tsx" | grep -v "OnboardingOverlayV2\|OnboardingOverlayConnected"
grep -r "MobileBlockScreen" src/ --include="*.tsx" | grep -v "MobileBlockScreenV2"
grep -r "ControlsExport" src/ --include="*.tsx"
```

Any residual imports from files other than the deleted legacy files → remove.

**8.8.2 — Bump version**

- `src/constants/version.ts`: `APP_VERSION = "1.16.0"` (minor bump — significant visual redesign)
- `package.json`: `"version": "1.16.0"`
- `CLAUDE.md`: update version in header table

**8.8.3 — Update REFERENCE.md**

- Add note at the top of the "Phase 7.5 — Modal System (V2)" section: `> ✅ Cutover complete (Fase 8, v1.16.0, commit <hash>).`
- In "Phase 8 — Cutover Plan", mark each sub-phase as complete.
- Update "UI Redesign v2 — Estado actual" → move sub-phases 8.1–8.7 from "Pendiente" to "Completado".

**8.8.4 — Update BACKLOG.md**

- Move BACKLOG Item 1 (z-index cohabitation) and Item 2 (missing icons) to a `✅ Resuelto` section with commit hashes.
- Reassess Item 4 (ToolType rename) urgency — now that codebase is stable post-cutover, it may be promoted from Fase 9 to active work.

**8.8.5 — Merge and push**

```bash
git checkout main
git merge feat/ui-redesign-v2
git push origin main
```

**8.8.6 — Production validation**

- Load `diorame.dumaker.com` in a fresh browser session
- Verify: MobileBlockScreen on mobile viewport, WelcomeModal on first load, ExportProgress banner on export, ClearCanvasAlert, ComplexSceneModal (>800 shapes), OnboardingOverlay (after clearing localStorage), SVG export popover
- Check `v1-15.png` illustration loads from GitHub Pages CDN
- Check `prefers-color-scheme` dark mode in MobileBlockScreen
- No console errors

---

### Risk Management

| # | Risk | Mitigation |
|---|---|---|
| 1 | Z-index inversion if legacy + V2 coexist momentarily | Atomic commits: delete legacy + integrate V2 in same commit |
| 2 | Legacy logic not fully captured before deletion | Read the full legacy file before each sub-phase; extract shared logic to hooks (8.1: `useIsMobile`, 8.3: `useLoadExampleScene`) |
| 3 | StrataCanvas modification breaks render loop | Use `OnboardingOverlayConnected` adapter — StrataCanvas import swap only, zero additional lines |
| 4 | `DISMISS_ONBOARDING` / localStorage drift | Verify localStorage key (`diorame-onboarding-seen`) matches between legacy and connected adapter |
| 5 | `onConfirm` in ClearCanvas missing a dispatch | Confirm all 3 dispatches: `CLEAR_CANVAS` + `UPDATE_CAMERA` reset + `sessionStorage.removeItem` |
| 6 | `anchorRef` for SVG popover not attached at open time | Ensure `useRef` created before the popover open state can be true |
| 7 | Radix import removal breaks other Radix consumers | Check for secondary `<Popover>` (LayersPanel, ~line 488) before removing Radix imports from `ControlsDrawing.tsx` |

---

### Rollback Strategy

If a sub-phase introduces a regression that cannot be fixed quickly:

1. **Revert specific commit**: `git revert <sub-phase-commit-hash>` — undoes only that sub-phase, leaving earlier completed sub-phases intact.
2. **Hard reset to tag**: `git reset --hard pre-phase-8` — restores the full pre-cutover state. Use only if multiple sub-phases are broken simultaneously.
3. **Root-cause before retry**: do not begin a new cutover attempt until the regression is understood and a fix is ready.

Never attempt the next sub-phase while the current one has an unresolved regression.


## Final Notes

This document is a living reference. It should evolve with the project, but its core principles remain fixed.

**When in doubt**:
1. Prioritize stability over features
2. Measure performance before and after
3. Respect the existing baseline
4. Keep changes small and reversible

Diorame is a tool for artists, not engineers. Every decision should serve the creative experience first.
