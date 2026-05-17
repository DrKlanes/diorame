# Diorame — Project Reference Document

**Version**: 1.15.1
**Last Updated**: March 2026
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

The codebase has been modularized through a multi-phase refactoring (completed in v1.11.0). Code is organized into four layers: UI components, canvas pipeline modules, shared utilities, and the type system.

### Main Canvas (`src/components/strata/`)

| File | Lines | Purpose |
|---|---|---|
| `StrataCanvas.tsx` | ~2143 | Main canvas renderer, render loop, event handlers, gesture input. **Frozen** — extract only, never add. |
| `StrataContext.tsx` | ~1500 | React Context + useReducer: app reducer, constants, re-exports all types |
| `Controls.tsx` | 229 | Thin compositor: mode switch, shared export state, keyboard shortcuts |
| `ControlsDrawing.tsx` | 950 | Drawing mode UI: toolbar, palette, layer nav, undo/redo, save/load, text panel |
| `ControlsCinematic.tsx` | 1003 | View mode UI: animation types, FX Mix popover, focal length, zoom, spacing sliders |
| `ControlsExport.tsx` | 80 | Export complexity warning dialog |
| `LayersPanel.tsx` | — | Layer management panel: visibility, 3D lock, reorder, duplicate, delete |
| `ToolOptionsPanel.tsx` | — | Context-sensitive options for Brush (line mode, thickness) and Gradient settings |
| `WelcomeModal.tsx` | — | First-launch welcome dialog with version display |
| `OnboardingOverlay.tsx` | — | Empty-canvas onboarding hints, auto-dismissed on first stroke |
| `ExportProgress.tsx` | — | Visual overlay showing export progress during video captures |
| `MobileBlockScreen.tsx` | — | Full-screen block for mobile devices (tablet+ required) |
| `pixelArtPalettes.ts` | — | Readonly palette data for the Pixel Art post-processing effect |

### Canvas Pipeline (`src/components/strata/canvas/`)

| File | Lines | Purpose |
|---|---|---|
| `PixelArtProcessor.ts` | 173 | Pixel art post-processing: downscale, palette quantization, Bayer dithering |
| `postProcessing.ts` | 262 | 8 post-processing functions: `applyFog`, `applyGlow`, `applyDoFBlur`, `applyRisoV2` (4-pass: grain, ink spread, misregistration, ink blend), `applyChromaticAberration`, `applyVignette`, `applyGrain`, `applyGrunge` |
| `cinematicCamera.ts` | 150 | `computeCinematicTick`: all 10 camera modes + handheld shake, returns new camera state |
| `exportHandlers.ts` | 323 | `exportAsPNG`, `exportAsSVG`, `exportAsMP4`: all export logic |
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
| `renderConstants.ts` | 22 | `PARTICLE_COUNT`, `MIN_TOUCH_STROKE_POINTS`, `HANDHELD_SWAY_FREQ`, `HANDHELD_TREMOR_FREQ`, `DOUBLE_CLICK_DELAY`, `RENDER_THROTTLE_MS` |

### Hooks (`src/components/strata/hooks/`)

| File | Purpose |
|---|---|
| `useCanvasRecovery.ts` | Monitors visibility/focus changes, resets stuck pointer state, refocuses canvas |

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
APP_VERSION = "1.14.0"          // Current release version
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

## Appendix C: Changelog Highlights (1.7.3 -> 1.15.1)

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

## UI Redesign v2 — Estado actual (rama `feat/ui-redesign-v2`)

Rediseño visual integral de toda la capa de UI de Diorame. Componentes legacy mantenidos en disco durante la transición. **Integración en app real pendiente para Fase 8.**

### Fases completadas

| Fase | Descripción | Commit |
|---|---|---|
| **Fase 0** | Branch setup + tipografía global (Manrope + Sora) | `944bd14` |
| **Fase 1** | Token system v2 — `T`, `TYPE`, `RADIUS`, `dk()` | `026ff1c` |
| **Fase 2** | Primitivos DS: `Ico`, `DiPill`, `DiVSep`, `DiMiniSlider`, `DiSegmentControl`, `DiPanel` | `f4e0650` |
| **Fase 3** | TopBar — 4 pills: `FileControlsPill`, `SnapshotRecordPill`, `ModeSwitchPill`, `ThemeTogglePill` | `5b8f8f7` |
| **Fase 4** | BottomBar — `DrawingToolbar`, `CameraBar`, `CameraPresetsZone`, `CameraSpeedZone`, `CameraSlidersZone` | `ffa791e` |
| **Fase 5** | ColorPalette — `PaletteHeader`, `GradientControls`, `SwatchGrid` | `74ef20d` |
| **Fase 6.1** | Reducer: action `SET_CURRENT_LAYER` para navegación directa de capas | `d82cf09` |
| **Fase 6.2** | LayersPanel (collapsed pill + expanded panel) + LayerDotsRail | `061fa2c`, `17215e2` |
| **Fase 6.2-fix** | Badge, chevron, active accent, dark mode | `d2fc404` |
| **Fase 6.2-spatial** | Animación FLIP de reorder, eje Z visual con círculos de profundidad | `c549c74`, `d5e6d3d` |
| **Fase 6.3a** | Reducer: action `MOVE_LAYER_TO` para desplazamiento real (drag & drop) | `441d4cf` |
| **Fase 6.3b** | LayersPanel: drag & drop con `@dnd-kit` | `8394320` |
| **Fase 6.4** | ResetViewPill — mini-pill bottom-left para reset de zoom/pan | `5209690` |

### Nuevas actions en el reducer

- `SET_CURRENT_LAYER` — navegación directa a una capa por índice
- `MOVE_LAYER_TO` — desplazamiento real para drag & drop (mueve todas las capas intermedias entre `fromIndex` y `toIndex`)

### Nuevas dependencias

- `framer-motion@^12.38.0` — animación FLIP del reorder de capas en LayersPanel
- `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities@^3.2.2` — drag & drop en LayersPanel

### Nuevos directorios y componentes (en `src/components/strata/`)

| Directorio | Archivos |
|---|---|
| `topbar/` | `TopBar.tsx`, `FileControlsPill.tsx`, `SnapshotRecordPill.tsx`, `ModeSwitchPill.tsx`, `ThemeTogglePill.tsx`, `_shared.tsx` |
| `bottombar/` | `BottomBar.tsx`, `DrawingToolbar.tsx`, `CameraBar.tsx`, `CameraPresetsZone.tsx`, `CameraSpeedZone.tsx`, `CameraSlidersZone.tsx`, `_shared.tsx` |
| `colorpalette/` | `ColorPalette.tsx`, `PaletteHeader.tsx`, `GradientControls.tsx`, `SwatchGrid.tsx` |
| `layers/` | `LayersPanel.tsx`, `LayerRow.tsx`, `LayerDotsRail.tsx` |
| `viewport/` | `ResetViewPill.tsx` |

### Galería de preview (`/preview?preview=true`)

`src/preview/PreviewPage.tsx` — página de desarrollo exclusiva (`import.meta.env.DEV`). Renderiza todos los componentes del DS v2 con estado live desde `StrataProvider`. Incluye seeds ficticios para secciones que requieren estado específico (LayersPanel con 4 capas, etc.).

### Pendiente

- **Fase 7** — FX Panel (controles de post-processing en modo VIEW)
- **Fase 7.5** — Modales y onboarding rediseñados
- **Fase 8** — Integración global: conectar TopBar, BottomBar, ColorPalette, LayersPanel, LayerDotsRail y ResetViewPill en la app real; desconectar legacy

---

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

> **Note:** `T.shadow` and `T.shadowStrong` remain on `T` (used by `DiPill`, `DiPanel`). If more components need shadows, extend the `SHADOW` namespace rather than hanging more values from `T`. Minor technical debt.

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


## Final Notes

This document is a living reference. It should evolve with the project, but its core principles remain fixed.

**When in doubt**:
1. Prioritize stability over features
2. Measure performance before and after
3. Respect the existing baseline
4. Keep changes small and reversible

Diorame is a tool for artists, not engineers. Every decision should serve the creative experience first.
