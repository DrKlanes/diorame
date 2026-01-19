# Diorame — Project Reference Document

**Version**: 1.7.3  
**Last Updated**: January 2026  
**Purpose**: Single source of truth for AI collaborators, designers, and developers.

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
- **Zero Onboarding Friction**: The welcome modal is dismissible immediately
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
   - Stroke-based drawing with two modes:  
     - **Tapered**: Variable width, natural taper at ends  
     - **Uniform**: Consistent width, smooth curves  
   - Adjustable thickness (1–100)  
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
- **2 Fixed Palettes**: Primary (default), Alternative  
- **24 Colors Each**: Organized in 3 rows of 8 colors  
- **No Custom Colors**: Artists must work within constraints (part of the Riso philosophy)  

### Palette Behavior
- **Index-Based Mapping**: Shapes store color by palette index, not hex value  
- **Palette Switching**: Changing palettes re-colors all shapes based on their index  
- **Gradient Mode**: Optional per-layer gradient overlay (adjustable angle and intensity)  

### Color Philosophy
Constraints breed creativity. Fixed palettes force intentional color choices and maintain the Riso print aesthetic.

---

## 6. Layers & Depth

### Layer System
- **Maximum 10 Layers** (`MAX_LAYERS = 10`)  
- **Depth Step**: 150 units per layer (`BASE_DEPTH_STEP`)  
- **Layer 0 (Front)** → **Layer 9 (Back)**  
- Layers are created on-demand (next layer created when you navigate forward from the last layer)

### 3D Depth & Parallax
- **DRAW Mode**: Orthographic, no parallax (camera at active layer Z)  
- **VIEW Mode**: Perspective projection, full parallax based on layer depth  
- **Layer Spacing Factor**: Adjustable multiplier (0.5–2.0) to compress/expand depth  

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
  - Click + Drag: Orbit camera  
  - Scroll Wheel: Zoom in/out  
  - Arrow Keys: Manual camera pan  
  - Double-Click: Set Point of Interest (camera focus target)  
- **Cinematic Moves**: 10 preset camera animations (Forward, Spiral, Yoyo, Pulse, Twist, Arc, Crane, Truck, Orbit, Zoom)  
- **Speed Control**: Adjustable cinematic speed (0.1–1.0)  
- **Handheld Shake**: Optional camera shake (Low, Medium, High)  

### Depth of Field (DoF) System
- **Two Focus Modes**:  
  1. **FREE Mode** (Default): Manual focus distance slider  
  2. **LOCK TO LAYER Mode**: Focus dynamically tracks a specific layer during camera movement  
- **Layer Picker Behavior**:  
  - In FREE mode: Acts as "one-shot focus" (sets focus to layer Z, no tracking)  
  - In LOCK mode: Enables dynamic tracking (focus follows layer as camera moves)  
- **Focus Distance**: Adjustable manually in FREE mode  
- **DoF Intensity**: Adjustable blur amount (0–1)  

---

## 8. Performance Guidelines

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

### Performance Metrics to Preserve
- **Draw Latency**: < 10ms from pointer down to first render  
- **Frame Rate**: Consistent 60 fps in DRAW mode, 30+ fps in VIEW mode  
- **Memory Usage**: No memory leaks, stable heap over time  

---

## 9. What NOT To Do

This section is critical. These actions are **forbidden**:

### Code Changes
- ❌ **No Large Refactors**: Do not rewrite entire files or systems  
- ❌ **No Speculative Optimization**: Only optimize proven bottlenecks  
- ❌ **No Experimental Features**: Every feature must be justified and tested  
- ❌ **No Dependency Bloat**: Avoid adding new libraries unless absolutely necessary  
- ❌ **No Breaking Changes**: Existing behavior must remain identical  

### UX Changes
- ❌ **No Hidden Complexity**: Every interaction must be transparent  
- ❌ **No Mode Confusion**: Users should always know what mode they're in  
- ❌ **No Inconsistent Shortcuts**: Keyboard shortcuts must be memorable and conflict-free  
- ❌ **No Palette Bloat**: Do not add more than 2–3 palettes  

### Performance Violations
- ❌ **No Frame Drops**: Changes that cause stuttering are reverted  
- ❌ **No Synchronous Heavy Operations**: Use async for file I/O, exports, etc.  
- ❌ **No Unbounded Memory Growth**: History, particles, and caches must have limits  

### Visual Violations
- ❌ **No Dark Patterns**: UI must be honest and straightforward  
- ❌ **No Cluttered UI**: Less is more — every UI element must earn its space  
- ❌ **No Accessibility Regressions**: Tooltips, shortcuts, and focus states must remain functional  

---

## 10. Collaboration Rules

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
✅ **Bug Fixes**: Correct broken behavior  
✅ **Performance Wins**: Proven optimizations with benchmarks  
✅ **UX Polish**: Small tweaks that improve clarity or efficiency  
✅ **New Tools/Features**: Justified additions that fit the philosophy  
✅ **Accessibility**: Improvements to keyboard nav, tooltips, focus states  

### Unacceptable Change Categories
❌ **Rewrites**: "Let's rebuild this from scratch"  
❌ **Bikeshedding**: Arguing over trivial naming or formatting  
❌ **Scope Creep**: "While we're at it, let's also add..."  
❌ **Aesthetic Overhauls**: Changing the visual identity without justification  

### Code Review Standards
- **Performance First**: If it slows down, it doesn't ship  
- **Behavior Preservation**: Existing workflows must work identically  
- **Clarity Over Cleverness**: Readable code beats clever code  
- **Documentation**: Complex logic requires inline comments  

---

## Appendix: Technical Constants

### Key Configuration Values
```typescript
BASE_DEPTH_STEP = 150           // Z-units per layer
MAX_LAYERS = 10                 // Maximum number of layers
MAX_HISTORY_STEPS = 50          // Undo/redo limit
CINEMATIC_DEPTH_MULTIPLIER = 3  // VIEW mode depth scaling
DRAW_FOCAL_LENGTH = 5000        // Orthographic focal length
NEAR_CLIP = 50                  // Near clipping plane
MAX_PAN = 1500                  // Maximum pan offset
```

### Post-Processing Effects
- **Grain**: Film grain overlay (0–1)  
- **Vignette**: Edge darkening (0–1)  
- **Distortion**: Lens distortion (0–1)  
- **DoF**: Depth of field blur (0–1)  
- **Chromatic Aberration**: RGB channel offset (0–1)  
- **Fog**: Atmospheric depth fog (0–1)  
- **Particles**: Floating particles (circle, square, stroke types)  
- **Glow**: Soft glow around shapes (0–1)  
- **Riso**: Risograph halftone texture (0–1)  
- **Pixel Art**: Pixelation effect (size 2–16, depth 2–32 colors, dither 0–1)  
- **Grunge**: Overlay texture (subtle, medium, intense)  
- **Wiggle**: Hand-drawn line wobble (light, medium, heavy)  

### Keyboard Shortcuts (Summary)
- **D**: DRAW mode  
- **V**: VIEW mode  
- **Shift + D**: Toggle dark canvas  
- **Shift + H**: Hide/Show UI (VIEW mode only)  
- **Shift + S**: Symmetry mode  
- **Shift + I**: Draw Inside mode  
- **Shift + B**: Draw Behind mode  
- **Shift + O**: Organic/Fluid mode  
- **[** / **]**: Previous/Next layer  
- **Cmd/Ctrl + Z**: Undo  
- **Cmd/Ctrl + Shift + Z**: Redo  
- **Space**: Hand tool (pan in DRAW mode)  
- **Arrow Keys**: Camera pan (VIEW mode)  

---

## Final Notes

This document is a living reference. It should evolve with the project, but its core principles remain fixed.

**When in doubt**:
1. Prioritize stability over features  
2. Measure performance before and after  
3. Respect the existing baseline  
4. Keep changes small and reversible  

Diorame is a tool for artists, not engineers. Every decision should serve the creative experience first.
