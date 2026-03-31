# Diorame — Project Reference Document

**Version**: 1.13.0
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
| `postProcessing.ts` | 258 | 8 post-processing functions: `applyFog`, `applyGlow`, `applyDoFBlur`, `applyRiso`, `applyChromaticAberration`, `applyVignette`, `applyGrain`, `applyGrunge` |
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
APP_VERSION = "1.13.0"          // Current release version
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

## Appendix C: Changelog Highlights (1.7.3 -> 1.13.0)

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

## Final Notes

This document is a living reference. It should evolve with the project, but its core principles remain fixed.

**When in doubt**:
1. Prioritize stability over features
2. Measure performance before and after
3. Respect the existing baseline
4. Keep changes small and reversible

Diorame is a tool for artists, not engineers. Every decision should serve the creative experience first.
