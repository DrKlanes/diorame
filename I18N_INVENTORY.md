# I18N_INVENTORY — Diorame v2.0.0

> **READ-ONLY AUDIT** — Este archivo es documentación generada. No modifica ningún archivo del codebase.
> Propósito: inventario exhaustivo de strings hardcodeados para la fase i18n v2.1.0.
> Generado a partir de lectura completa de `src/` (2025-05-23).

---

## 1. Resumen por componente

| Componente | Archivo | Strings UI | Strings toast | Strings aria/title | Strings data |
|---|---|---|---|---|---|
| FileControlsPill | `topbar/FileControlsPill.tsx` | 0 visible | 0 | 6 tooltips | 1 default name |
| ModeSwitchPill | `topbar/ModeSwitchPill.tsx` | 2 labels | 0 | 3 tooltips | 0 |
| ThemeTogglePill | `topbar/ThemeTogglePill.tsx` | 0 | 0 | 2 tooltips | 0 |
| SnapshotRecordPill | `topbar/SnapshotRecordPill.tsx` | 1 badge | 0 | 2 titles | 0 |
| InfoButton | `topbar/InfoButton.tsx` | 0 | 0 | 1 tooltip | 0 |
| DrawingToolbar | `bottombar/DrawingToolbar.tsx` | 0 | 0 | 10 tooltips | 0 |
| CameraPresetsZone | `bottombar/CameraPresetsZone.tsx` | 0 | 0 | 10 tooltips | 0 |
| CameraSpeedZone | `bottombar/CameraSpeedZone.tsx` | 1 label (+dynamic) | 0 | 1 tooltip | 3 intensity levels |
| LineModeButton | `bottombar/_shared.tsx` | 0 | 0 | 1 title (dynamic) | 3 mode labels |
| FXPanel | `fx/FXPanel.tsx` | 1 header + 1 status + 3 group labels | 0 | 15 tooltips | 0 |
| FXRow | `fx/FXRow.tsx` | 12 FX labels + 13 sub-labels + data | 0 | 0 | depth map labels |
| LayersPanel | `layers/LayersPanel.tsx` | 1 header + 1 counter format | 0 | 8 tooltips | 0 |
| LayerRow | `layers/LayerRow.tsx` | 1 name (dynamic) + 4 badge labels | 0 | 0 | 0 |
| LayerDotsRail | `layers/LayerDotsRail.tsx` | 0 | 0 | 2 (dynamic) | 0 |
| PaletteHeader | `colorpalette/PaletteHeader.tsx` | 5 segment options | 0 | 0 | 0 |
| ToolOptionsPanel | `drawing/ToolOptionsPanel.tsx` | 1 label | 0 | 0 | 0 |
| TextSessionPanel | `text/TextSessionPanel.tsx` | 5 font titles + 1 placeholder + 4 titles + 2 buttons | 0 | 0 | 0 |
| ControlsV2 | `ControlsV2.tsx` | 0 | 0 | 1 tooltip | 0 |
| ResetViewPill | `viewport/ResetViewPill.tsx` | 0 | 0 | 1 tooltip | 0 |
| GridTogglePill | `viewport/GridTogglePill.tsx` | 0 | 0 | 1 tooltip | 0 |
| WelcomeModalV2 | `modals/WelcomeModalV2.tsx` | 14 visible + 1 dynamic | 0 | 0 | 0 |
| ClearCanvasAlertV2 | `modals/ClearCanvasAlertV2.tsx` | 1 title + 1 body + 2 buttons | 0 | 0 | 0 |
| ComplexSceneModalV2 | `modals/ComplexSceneModalV2.tsx` | 1 title + 1 body (dynamic) + 1 tip + 3 buttons | 0 | 0 | 0 |
| ExportProgressV2 | `modals/ExportProgressV2.tsx` | 3 labels (config) | 0 | 0 | 0 |
| MobileBlockScreenV2 | `modals/MobileBlockScreenV2.tsx` | 1 wordmark + 2 messages | 0 | 1 alt | 0 |
| OnboardingOverlayV2 | `modals/OnboardingOverlayV2.tsx` | 1 header + 1 tagline + 2 section labels + 6 card titles + 6 card descs + 2 buttons + 1 dynamic | 0 | 0 | 0 |
| exportHandlers | `canvas/exportHandlers.ts` | 0 | 6 messages + 6 descriptions | 0 | 0 |
| useSaveLoad | `hooks/useSaveLoad.ts` | 0 | 4 messages + 5 descriptions | 0 | 0 |
| useLoadExampleScene | `hooks/useLoadExampleScene.ts` | 0 | 1 message + 2 descriptions | 0 | 0 |
| keyboardShortcuts | `utils/keyboardShortcuts.ts` | 0 | 0 | 0 | 15 shortcut labels + 6 categories |
| palette | `constants/palette.ts` | 0 | 0 | 0 | 48 color names |

---

## 2. Inventario detallado

### 2.1 Topbar

#### `topbar/InfoButton.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"About Diorame"` | `DiActionButton tooltip=` |

#### `topbar/FileControlsPill.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"New"` | `DiActionButton tooltip=` |
| tooltip | `"Open"` | `DiActionButton tooltip=` |
| tooltip | `"Save"` | `DiActionButton tooltip=` + `shortcut="Ctrl+S"` |
| tooltip | `"Export SVG"` | `DiActionButton tooltip=` + `shortcut="Ctrl+E"` |
| tooltip | `"Undo"` | `DiActionButton tooltip=` + `shortcut="Ctrl+Z"` |
| tooltip | `"Redo"` | `DiActionButton tooltip=` + `shortcut="Ctrl+Y"` |
| selector title | `"SVG"` | `DiSelectorOption title=` |
| selector title | `"SVG (Compressed)"` | `DiSelectorOption title=` |
| default value | `"Untitled Project"` | `dispatch SET_PROJECT_NAME` on clear |

#### `topbar/ModeSwitchPill.tsx`
| Tipo | String | Uso |
|---|---|---|
| label | `"Draw"` | `DiActionButton label=` |
| tooltip | `"Draw mode"` | `DiActionButton tooltip=` |
| label | `"View"` | `DiActionButton label=` |
| tooltip | `"View mode"` | `DiActionButton tooltip=` |
| tooltip | `"Hide UI"` | `DiActionButton tooltip=` |

#### `topbar/ThemeTogglePill.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Light mode"` | `DiActionButton tooltip=` |
| tooltip | `"Dark mode"` | `DiActionButton tooltip=` + `shortcut="Shift+D"` |

#### `topbar/SnapshotRecordPill.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Snapshot PNG"` | `DiActionButton tooltip=` |
| title | `"Stop recording"` | `RecordBtn button title=` (when recording) |
| title | `"Record MP4"` | `RecordBtn button title=` (when idle) |
| badge text | `"REC"` | `<span>` inside RecordBtn (inline badge) |

---

### 2.2 Bottombar

#### `bottombar/DrawingToolbar.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Blob"` | `ToolBtn tooltip=` + `shortcut="B"` |
| tooltip | `"Brush"` | `ToolBtn tooltip=` + `shortcut="L"` |
| tooltip | `"Eraser"` | `ToolBtn tooltip=` + `shortcut="E"` |
| tooltip | `"Text"` | `ToolBtn tooltip=` + `shortcut="T"` |
| tooltip | `"Move"` | `ToolBtn tooltip=` + `shortcut="M"` |
| tooltip | `"Symmetry"` | `MODIFIERS_BY_TOOL` config |
| tooltip | `"Draw Inside"` | `MODIFIERS_BY_TOOL` config |
| tooltip | `"Draw Behind"` | `MODIFIERS_BY_TOOL` config |
| tooltip | `"Organic"` | `MODIFIERS_BY_TOOL` config |
| tooltip | `"Smooth"` | `MODIFIERS_BY_TOOL` config |

#### `bottombar/CameraPresetsZone.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Forward"` | `PRESETS` array → `DiActionButton tooltip=` |
| tooltip | `"Spiral"` | `PRESETS` array |
| tooltip | `"Yoyo"` | `PRESETS` array |
| tooltip | `"Pulse"` | `PRESETS` array |
| tooltip | `"Twist"` | `PRESETS` array |
| tooltip | `"Arc"` | `PRESETS` array |
| tooltip | `"Crane"` | `PRESETS` array |
| tooltip | `"Truck"` | `PRESETS` array |
| tooltip | `"Orbit"` | `PRESETS` array |
| tooltip | `"Zoom"` | `PRESETS` array |

#### `bottombar/CameraSpeedZone.tsx`
| Tipo | String | Uso |
|---|---|---|
| label (static) | `"Handheld"` | `DiActionButton label=` (when disabled) |
| label (dynamic) | `"Handheld · low"` | `DiActionButton label=` (when enabled, intensity = low) |
| label (dynamic) | `"Handheld · medium"` | `DiActionButton label=` (when enabled, intensity = medium) |
| label (dynamic) | `"Handheld · high"` | `DiActionButton label=` (when enabled, intensity = high) |
| tooltip | `"Handheld camera"` | `DiActionButton tooltip=` |

#### `bottombar/_shared.tsx` — `LineModeButton`
| Tipo | String | Uso |
|---|---|---|
| data label | `"Tapered"` | `LINE_MODE_LABELS` object |
| data label | `"Uniform"` | `LINE_MODE_LABELS` object |
| data label | `"Ink"` | `LINE_MODE_LABELS` object |
| title (dynamic) | `"Line mode: {label} ({n}/3) — click to cycle"` | `button title=` |

---

### 2.3 FX

#### `fx/FXPanel.tsx`
| Tipo | String | Uso |
|---|---|---|
| panel header | `"FX"` | `<span>` header |
| status | `"· off"` | `<span>` badge when fxMasterEnabled = false |
| title | `"Toggle all FX"` | `FXMasterBtn button title=` |
| tooltip | `"Collapse"` | `DiActionButton tooltip=` |
| tooltip | `"Expand FX panel"` | `DiActionButton tooltip=` |
| group label | `"Texture"` | `<GroupLabel>` |
| group label | `"Lens"` | `<GroupLabel>` |
| group label | `"Atmosphere"` | `<GroupLabel>` |
| fx label | `"Grain"` | `TEXTURE_FX` config |
| fx label | `"Grunge"` | `TEXTURE_FX` config |
| fx label | `"RISO"` | `TEXTURE_FX` config |
| fx label | `"Vignette"` | `LENS_FX` config |
| fx label | `"Chromatic Ab."` | `LENS_FX` config |
| fx label | `"Distortion"` | `LENS_FX` config |
| fx label | `"Glow"` | `LENS_FX` config |
| fx label | `"Blur / DoF"` | `LENS_FX` config |
| fx label | `"Fog"` | `ATMOSPHERE_FX` config |
| fx label | `"Particles"` | `ATMOSPHERE_FX` config |
| fx label | `"Stop Motion"` | `ATMOSPHERE_FX` config |
| fx label | `"Pixel Art"` | `ATMOSPHERE_FX` config |
| discrete option | `"Subtle"` | Grunge `discreteOptions` |
| discrete option | `"Medium"` | Grunge `discreteOptions` (también en Wiggle) |
| discrete option | `"Intense"` | Grunge `discreteOptions` |
| discrete option | `"Light"` | Wiggle `discreteOptions` |
| discrete option | `"Heavy"` | Wiggle `discreteOptions` |
| composite option | `"Circle"` | Particles `compositeOptions` |
| composite option | `"Square"` | Particles `compositeOptions` |
| composite option | `"Stroke"` | Particles `compositeOptions` |
| collapsed tooltip | `"Grain"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Grunge"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Riso"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Vignette"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Chromatic Aberration"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Distortion"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Glow"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Depth of Field"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Fog"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Particles"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Wiggle"` | `DiActionButton tooltip=` (collapsed pill) |
| collapsed tooltip | `"Pixel Art"` | `DiActionButton tooltip=` (collapsed pill) |

#### `fx/FXRow.tsx`
| Tipo | String | Uso |
|---|---|---|
| sub-control label | `"Size"` | `SubControlBlock label=` (Pixel Art) |
| sub-control label | `"Depth"` | `SubControlBlock label=` (Pixel Art) |
| sub-control label | `"Dither"` | `SubControlBlock label=` (Pixel Art) |
| sub-control label | `"Z-Plane"` | `SubControlBlock label=` (DoF free mode) |
| sub-control label | `"Layer"` | `SubControlBlock label=` (DoF lock mode) |
| segment option | `"Free"` | DoF `DiSegmentControl options=` |
| segment option | `"Lock"` | DoF `DiSegmentControl options=` |
| depth label | `"1-bit"` | `DEPTH_LABEL_MAP[2]` |
| depth label | `"CGA"` | `DEPTH_LABEL_MAP[4]` |
| depth label | `"8-Color"` | `DEPTH_LABEL_MAP[6]` |
| depth label | `"Retro"` | `DEPTH_LABEL_MAP[8]` |
| depth label | `"Hi-Color"` | `DEPTH_LABEL_MAP[10]` |
| depth label | `"Handheld"` | `DEPTH_LABEL_MAP[12]` |
| depth label | `"Stylized"` | `DEPTH_LABEL_MAP[14]` |
| depth label | `"Original"` | `DEPTH_LABEL_MAP[16]` |
| dither label | `"Clean"` | `formatDither()` when v < 0.05 |
| dynamic label | `"Layer {focusTargetLayer + 1}"` | DoF layer display |
| pixel size value | `"{sz}px"` | `SubControlBlock value=` |
| dof intensity value | `"{Math.round(dofIntensity * 100)}"` | dynamic |

---

### 2.4 Layers

#### `layers/LayersPanel.tsx`
| Tipo | String | Uso |
|---|---|---|
| panel header | `"Layers"` | `<span>` |
| counter | `"{totalLayers}/10"` | `<span>` (semidynamic: total changes) |
| tooltip | `"Expand layers panel"` | `DiActionButton tooltip=` |
| tooltip | `"Collapse"` | `DiActionButton tooltip=` |
| tooltip | `"Show layer"` | conditional `DiActionButton tooltip=` |
| tooltip | `"Hide layer"` | conditional `DiActionButton tooltip=` |
| tooltip | `"Duplicate layer"` | `DiActionButton tooltip=` |
| tooltip | `"Delete layer"` | `DiActionButton tooltip=` |
| tooltip | `"Move layer up"` | `DiActionButton tooltip=` |
| tooltip | `"Move layer down"` | `DiActionButton tooltip=` |
| tooltip | `"Add layer"` | `DiActionButton tooltip=` |

#### `layers/LayerRow.tsx`
| Tipo | String | Uso |
|---|---|---|
| row name (dynamic) | `"Layer {index + 1}"` | `<span>` label |
| badge | `"Empty"` | `colorMode` computed value |
| badge | `"Fade"` | `colorMode` computed value |
| badge | `"Grad"` | `colorMode` computed value |
| badge | `"Flat"` | `colorMode` computed value |

#### `layers/LayerDotsRail.tsx`
| Tipo | String | Uso |
|---|---|---|
| aria-label (dynamic) | `"Go to layer {i + 1}"` | `button aria-label=` |
| title (dynamic) | `"Layer {i + 1}"` | `button title=` |

---

### 2.5 Color Palette

#### `colorpalette/PaletteHeader.tsx`
| Tipo | String | Uso |
|---|---|---|
| segment option | `"Primary"` | `DiSegmentControl options=` |
| segment option | `"Alt"` | `DiSegmentControl options=` |
| segment option | `"Flat"` | `DiSegmentControl options=` |
| segment option | `"Gradient"` | `DiSegmentControl options=` |
| segment option | `"Fade"` | `DiSegmentControl options=` |

---

### 2.6 Drawing — ToolOptionsPanel

#### `drawing/ToolOptionsPanel.tsx`
| Tipo | String | Uso |
|---|---|---|
| label | `"Size"` | `<span>` label |

---

### 2.7 Text Tool

#### `text/TextSessionPanel.tsx`
| Tipo | String | Uso |
|---|---|---|
| font title | `"Noir"` | `FONT_LABELS` → `button title=` |
| font title | `"Mansion"` | `FONT_LABELS` → `button title=` |
| font title | `"Pharma"` | `FONT_LABELS` → `button title=` |
| font title | `"Comic"` | `FONT_LABELS` → `button title=` |
| font title | `"Dungeon"` | `FONT_LABELS` → `button title=` |
| font display | `"Aa"` | `<button>` content |
| placeholder | `"Type here…"` | `textarea placeholder=` |
| align title | `"Align left"` | `button title=` |
| align title | `"Align center"` | `button title=` |
| align title | `"Align right"` | `button title=` |
| button | `"Cancel"` | `<button>` |
| button | `"Done"` | `<button>` |

---

### 2.8 Viewport Controls

#### `viewport/GridTogglePill.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Composition guide"` | `DiActionButton tooltip=` |

#### `viewport/ResetViewPill.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Reset view"` | `DiActionButton tooltip=` + `shortcut="Space"` |

#### `ControlsV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| tooltip | `"Show UI"` | `DiActionButton tooltip=` (hidden UI button) |

---

### 2.9 Modals

#### `modals/WelcomeModalV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| img alt | `"Diorame logo"` | `<img alt=>` |
| brand | `"diorame™"` | `<span>` (TM como elemento inline) |
| version | `"v{APP_VERSION}"` | `<span>` dynamic |
| tagline | `"Draw in 2D. Watch it come alive in 3D."` | `<p>` |
| link | `"Watch tutorial"` | `ResourceLink` |
| link | `"by @dumaker"` | `ResourceLink` |
| link | `"Support on Ko-fi 🤍"` | `ResourceLink` |
| link | `"Inspired by Graintouch"` | `ResourceLink mutedColor=` |
| button | `"Found a bug? Email me."` | `<button>` |
| button | `"Keyboard shortcuts"` | `<span>` inside toggle button |
| button | `"Start drawing"` | `DiModal.PrimaryActionLg` |
| button | `"Load example scene"` | `DiModal.SecondaryAction` (static) |
| button | `"Loading…"` | `DiModal.SecondaryAction` (while loading) |

#### `modals/ClearCanvasAlertV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| modal title | `"Clear canvas?"` | `DiModal.Header title=` |
| body | `"This will delete everything you've drawn. This action can't be undone."` | `DiModal.Body` |
| button | `"Cancel"` | `DiModal.SecondaryAction` |
| button | `"Clear canvas"` | `DiModal.DestructiveAction` |

#### `modals/ComplexSceneModalV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| modal title | `"Complex scene"` | `DiModal.Header title=` |
| body (dynamic) | `"Your drawing contains {shapeCount} shapes. Vector exports of complex scenes may take several seconds and produce large files."` | `<p>` |
| tip | `"Try SVG (Compressed) for smaller files without quality loss."` | `<div>` tip box |
| button | `"Use Compressed instead"` | `DiModal.TertiaryAction` |
| button | `"Cancel"` | `DiModal.SecondaryAction` |
| button | `"Continue"` | `DiModal.PrimaryAction` |

#### `modals/ExportProgressV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| progress label | `"Capturing snapshot…"` | `EXPORT_CONFIG.png.label` |
| progress label | `"Rendering animation…"` | `EXPORT_CONFIG.mp4.label` |
| progress label | `"Exporting vector…"` | `EXPORT_CONFIG.svg.label` and `EXPORT_CONFIG.svgz.label` |
| percentage | `"{pct}%"` | `<span>` dynamic |

#### `modals/MobileBlockScreenV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| img alt | `"Diorame"` | `<img alt=>` |
| wordmark | `"diorame™"` | `<div>` text (TM como `&#8482;` inline) |
| primary message | `"Diorame is designed for tablet and desktop."` | `<p>` |
| secondary message | `"You'll need a larger screen to draw, layer, and view your scenes in motion."` | `<p>` |

#### `modals/OnboardingOverlayV2.tsx`
| Tipo | String | Uso |
|---|---|---|
| header | `"Welcome to Diorame"` | `<div>` header |
| tagline | `"Draw in 2D. Watch it come alive in 3D."` | `<p>` |
| section label | `"DRAW"` | `CardSection label=` |
| section label | `"VIEW"` | `CardSection label=` |
| card title | `"Blob"` | `DRAW_CARDS` |
| card description | `"Spray-like organic shapes"` | `DRAW_CARDS` |
| card title | `"Brush"` | `DRAW_CARDS` |
| card description | `"Tapered, calligraphic strokes"` | `DRAW_CARDS` |
| card title | `"Layers"` | `DRAW_CARDS` |
| card description | `"Build depth with stacked planes"` | `DRAW_CARDS` |
| card title | `"Motion"` | `VIEW_CARDS` |
| card description | `"Camera presets and movements"` | `VIEW_CARDS` |
| card title | `"Effects"` | `VIEW_CARDS` |
| card description | `"Grain, glow, fog and more"` | `VIEW_CARDS` |
| card title | `"Depth"` | `VIEW_CARDS` |
| card description | `"Layer spacing and parallax"` | `VIEW_CARDS` |
| button | `"Load example scene"` | `SecondaryActionLg` (static) |
| button | `"Loading…"` | `SecondaryActionLg` (while loading) |
| button | `"Start drawing"` | `PrimaryActionLg` |

---

### 2.10 Notificaciones toast

#### `canvas/exportHandlers.ts`
| Tipo | String | Uso |
|---|---|---|
| toast.success title | `"Snapshot saved!"` | PNG export OK |
| toast.success desc | `"PNG image downloaded successfully"` | PNG export OK |
| toast.error title | `"Failed to save snapshot"` | PNG export error |
| toast.error desc | `"Please try again"` | PNG export error |
| toast.success title | `"Vector exported!"` | SVG/SVGZ export OK |
| toast.success desc | `"SVG file downloaded successfully"` | SVG export OK |
| toast.success desc | `"SVGZ file downloaded successfully"` | SVGZ export OK |
| toast.error title | `"Failed to export vector"` | SVG export error |
| toast.error desc | `"Please try again"` | SVG export error |
| toast.success title | `"Animation saved!"` | MP4 export OK |
| toast.success desc | `"Video loop downloaded successfully"` | MP4 export OK |
| toast.error title | `"Failed to save animation"` | MP4 export error |
| toast.error desc | `"Please try again"` | MP4 export error |

#### `hooks/useSaveLoad.ts`
| Tipo | String | Uso |
|---|---|---|
| toast.success title | `"Project saved"` | save OK |
| toast.success desc (dynamic) | `"{sanitized}.dior"` | save OK |
| toast.error title | `"Failed to save"` | save error |
| toast.error desc | `"Please try again"` | save error |
| toast.error title | `"File too large"` | load validation |
| toast.error desc | `"Maximum file size is 50 MB"` | load validation |
| toast.success title | `"Project loaded"` | load OK |
| toast.success desc (dynamic) | `"{n} shapes"` | load OK |
| toast.error title | `"Failed to load project"` | load error |
| toast.error desc (dynamic) | `"{err.message}"` or `"Check file validity"` | load error |

#### `hooks/useLoadExampleScene.ts`
| Tipo | String | Uso |
|---|---|---|
| toast.error title | `"Failed to load example"` | example load error |
| toast.error desc (dynamic) | `"{err.message}"` or `"Please check your connection"` | example load error |

---

### 2.11 Constantes y utilidades

#### `utils/keyboardShortcuts.ts` — `SHORTCUTS_GROUPS`
| Tipo | String | Uso |
|---|---|---|
| category | `"File"` | group header en WelcomeModalV2 shortcuts |
| shortcut label | `"Save project"` | ShortcutItem |
| shortcut label | `"Export SVG"` | ShortcutItem |
| shortcut label | `"Export SVGZ"` | ShortcutItem |
| category | `"Edit"` | group header |
| shortcut label | `"Undo"` | ShortcutItem |
| shortcut label | `"Redo"` | ShortcutItem |
| category | `"View"` | group header |
| shortcut label | `"Dark mode"` | ShortcutItem |
| shortcut label | `"Open shortcuts"` | ShortcutItem |
| category | `"Tools (Draw)"` | group header |
| shortcut label | `"Blob"` | ShortcutItem |
| shortcut label | `"Brush"` | ShortcutItem |
| shortcut label | `"Eraser"` | ShortcutItem |
| shortcut label | `"Text"` | ShortcutItem |
| shortcut label | `"Move"` | ShortcutItem |
| category | `"Layers (Draw)"` | group header |
| shortcut label | `"Previous layer"` | ShortcutItem |
| shortcut label | `"Next layer"` | ShortcutItem |
| category | `"Canvas (Draw)"` | group header |
| shortcut label | `"Reset view"` | ShortcutItem |

#### `constants/palette.ts` — Color names (display via `SwatchGrid` title y `LayerRow` badge)
**PALETTE_PRIMARY** (24 nombres): `"Black"`, `"Charcoal"`, `"Silver"`, `"White"`, `"Forest"`, `"Pine"`, `"Sage"`, `"Lime"`, `"Mint"`, `"Navy"`, `"Cobalt"`, `"Blue"`, `"Sky"`, `"Teal"`, `"Plum"`, `"Lavender"`, `"Brick"`, `"Red"`, `"Rose"`, `"Blush"`, `"Sand"`, `"Peach"`, `"Butter"`, `"Cream"`

**PALETTE_ALTERNATIVE** (24 nombres): `"Black"`, `"Dark Grey"`, `"Light Grey"`, `"Off White"`, `"Dark Green"`, `"Green"`, `"Olive"`, `"Light Green"`, `"Beige"`, `"Dark Teal"`, `"Blue Grey"`, `"Blue"`, `"Teal"`, `"Light Blue"`, `"Dark Purple"`, `"Grey Blue"`, `"Dark Maroon"`, `"Rust"`, `"Red"`, `"Pink"`, `"Brown"`, `"Orange"`, `"Yellow Green"`, `"Yellow"`

> **Nota de exposición**: Los nombres de color solo son visibles como `title=` en el componente `Swatch` (hover tooltip). No aparecen como texto visible en la interfaz.

---

## 3. Strings duplicados (aparecen en ≥2 componentes)

| String | Componentes | Notas |
|---|---|---|
| `"Draw in 2D. Watch it come alive in 3D."` | `WelcomeModalV2`, `OnboardingOverlayV2` | Tagline del producto. Misma string exacta. |
| `"Start drawing"` | `WelcomeModalV2`, `OnboardingOverlayV2` | CTA principal. Misma string exacta. |
| `"Load example scene"` | `WelcomeModalV2`, `OnboardingOverlayV2` | CTA secundario. Misma string exacta. |
| `"Loading…"` | `WelcomeModalV2`, `OnboardingOverlayV2` | Estado de carga del botón secondary. |
| `"Cancel"` | `ClearCanvasAlertV2`, `ComplexSceneModalV2`, `TextSessionPanel` | 3 usos en contextos distintos. |
| `"Please try again"` | `exportHandlers` (×3), `useSaveLoad` (×1) | 4 ocurrencias de error genérico. |
| `"Grain"` | `TEXTURE_FX` label, collapsed tooltip, `SHORTCUTS_GROUPS` category implícito | Misma string, distintos contextos. |
| `"Glow"` | `LENS_FX` label, collapsed tooltip | 2 ocurrencias. |
| `"Fog"` | `ATMOSPHERE_FX` label, collapsed tooltip | 2 ocurrencias. |
| `"Particles"` | `ATMOSPHERE_FX` label, collapsed tooltip | 2 ocurrencias. |
| `"Pixel Art"` | `ATMOSPHERE_FX` label, collapsed tooltip | 2 ocurrencias. |
| `"Vignette"` | `LENS_FX` label, collapsed tooltip | 2 ocurrencias. |
| `"Distortion"` | `LENS_FX` label, collapsed tooltip | 2 ocurrencias. |
| `"Riso"` / `"RISO"` | `TEXTURE_FX` label = `"RISO"`, collapsed tooltip = `"Riso"` | **INCONSISTENCIA** — caso distinto. Ver §7. |
| `"Blur / DoF"` / `"Depth of Field"` | `LENS_FX` label = `"Blur / DoF"`, collapsed tooltip = `"Depth of Field"` | **INCONSISTENCIA** — strings diferentes para el mismo FX. Ver §7. |
| `"Chromatic Ab."` / `"Chromatic Aberration"` | `LENS_FX` label = `"Chromatic Ab."`, collapsed tooltip = `"Chromatic Aberration"` | **INCONSISTENCIA** — abreviado vs completo. Ver §7. |
| `"Medium"` | Grunge `discreteOptions`, Wiggle `discreteOptions` | Usado en dos contextos discretos diferentes. |
| `"Size"` | `ToolOptionsPanel`, `FXRow` (Pixel Art sub-control) | Mismo string, distintos contextos. |
| `"Layer"` | `FXRow` (DoF sub-control), `LayersPanel` header, `LayerRow` label prefix | Palabra base usada en 3 contextos diferentes. |
| `"Handheld"` | `CameraSpeedZone`, `DEPTH_LABEL_MAP[12]` (FXRow) | **COLISIÓN SEMÁNTICA** — misma palabra para función de cámara vs profundidad de color. Ver §7. |
| `"Blob"` | `DrawingToolbar` tooltip, `OnboardingOverlayV2` card title, `SHORTCUTS_GROUPS` | 3 ocurrencias coherentes. |
| `"Brush"` | `DrawingToolbar` tooltip, `OnboardingOverlayV2` card title, `SHORTCUTS_GROUPS` | 3 ocurrencias coherentes. |
| `"Depth"` | `OnboardingOverlayV2` card title, `FXRow` sub-control label (Pixel Art) | Contextos semánticamente distintos. |
| `"Effects"` | `OnboardingOverlayV2` card title | Solo 1 ocurrencia visible. |
| `"diorame™"` | `WelcomeModalV2` (via componente), `MobileBlockScreenV2` | Mismo branding, renderizado diferente (span+span vs div+sup). |

---

## 4. Strings dinámicos (template literals y valores computados)

Estos strings **no pueden** ser reemplazados por claves estáticas directamente — requieren interpolación en la solución i18n.

| String template | Componente | Parámetros |
|---|---|---|
| `"v{APP_VERSION}"` | `WelcomeModalV2` | `APP_VERSION` string |
| `"Handheld · {intensity}"` | `CameraSpeedZone` | `intensity`: `'low' \| 'medium' \| 'high'` |
| `"Line mode: {label} ({n}/3) — click to cycle"` | `LineModeButton` | `label` string, `currentIndex + 1` number |
| `"Your drawing contains {shapeCount} shapes. …"` | `ComplexSceneModalV2` | `shapeCount` number (formatted via `Intl.NumberFormat`) |
| `"Layer {index + 1}"` | `LayerRow` | `index` number |
| `"Layer {i + 1}"` | `LayerDotsRail` title y aria-label | `i` number |
| `"Go to layer {i + 1}"` | `LayerDotsRail` aria-label | `i` number |
| `"{totalLayers}/10"` | `LayersPanel` | `totalLayers` number |
| `"{sz}px"` | `FXRow` Pixel Art | `sz` number |
| `"Layer {focusTargetLayer + 1}"` | `FXRow` DoF | `focusTargetLayer` number |
| `"{Math.round(sliderValue * 100)}"` | `FXRow` nivel 1 | `sliderValue` float |
| `"{Math.round(cv * 100)}"` | `FXRow` composite | `cv` float |
| `"{Math.round(dofIntensity * 100)}"` | `FXRow` DoF | `dofIntensity` float |
| `"{formatBipolar(bv)}"` | `FXRow` bipolar | `bv` float (±) |
| `"{formatDither(di)}"` → `"Clean"` o `"{n}%"` | `FXRow` Pixel Art | `di` float |
| `"{formatZPlane(v)}"` → `"0 px"` o `"±{n} px"` | `FXRow` DoF | `v` number |
| `"{pct}%"` | `ExportProgressV2` | `pct` number |
| `"{session.content.length}/140"` | `TextSessionPanel` | length number |
| `"Align {a}"` | `TextSessionPanel` button title | `a`: `'left' \| 'center' \| 'right'` |
| `"{sanitized}.dior"` | `useSaveLoad` toast desc | `sanitized` filename |
| `"{n} shapes"` | `useSaveLoad` toast desc | shape count |
| `"{err.message}"` | `useSaveLoad`, `useLoadExampleScene` toast desc | error string |
| `"Capturing snapshot…"` / `"Rendering animation…"` / `"Exporting vector…"` | `ExportProgressV2` via `EXPORT_CONFIG[exportType]` | `exportType` enum |

---

## 5. Template del bug report (email body)

`WelcomeModalV2.tsx` → `handleBugReport()` construye un `mailto:` con `body=` codificado:

```
What I expected:


What happened instead:


Steps to reproduce:


---
Browser:
OS:
```

**Subject template**: `"Diorame bug report — v{APP_VERSION}"`

> Estos strings son contenido del cuerpo de un email que el usuario edita manualmente. Son visibles pero no son UI renderizada — su rol es de plantilla de ayuda.

---

## 6. Strings en constantes y utilidades

### `constants/palette.ts` — nombres de color
- Expuestos como `title=` en `SwatchGrid.Swatch` (hover tooltip en desktop)
- **No son texto visible permanente** — solo en hover
- Total: 48 nombres únicos (24 PALETTE_PRIMARY + 24 PALETTE_ALTERNATIVE)
- Algunos se repiten entre paletas: `"Black"` (×2), `"Blue"` (×2), `"Red"` (×2), `"Teal"` (×2)

### `utils/keyboardShortcuts.ts` — SHORTCUTS_GROUPS
- 6 categorías, 15 ítems con `label` y `shortcut`
- Rendered en `WelcomeModalV2` shortcuts section
- Los `shortcut` strings (ej. `"Ctrl+S"`) pasan por `formatShortcut()` en macOS → no son i18n candidates directos

### `constants/version.ts`
- `APP_VERSION = '2.0.0'` — no es un string UI localizable

---

## 7. Anomalías detectadas

### A1 — Inconsistencia de capitalización: `"RISO"` vs `"Riso"`
- `FXPanel.tsx` línea 15: `TEXTURE_FX` config → `label: 'RISO'` (mayúsculas)
- `FXPanel.tsx` línea 220: collapsed tooltip → `tooltip="Riso"` (capitalización normal)
- Mismo efecto, dos strings diferentes. En i18n deberían ser la misma clave.

### A2 — Inconsistencia de label: `"Blur / DoF"` vs `"Depth of Field"`
- `FXPanel.tsx` línea 23: `LENS_FX` config → `label: 'Blur / DoF'`
- `FXPanel.tsx` línea 226: collapsed tooltip → `tooltip="Depth of Field"`
- Mismo efecto, nombres completamente diferentes. Requiere decisión de terminología antes de i18n.

### A3 — Abreviación inconsistente: `"Chromatic Ab."` vs `"Chromatic Aberration"`
- `FXPanel.tsx` línea 20: `label: 'Chromatic Ab.'` (abreviado — limitación de espacio en panel expandido)
- `FXPanel.tsx` línea 223: `tooltip="Chromatic Aberration"` (completo)
- Ambas son correctas por contexto (espacio en panel vs tooltip libre). En i18n deben ser claves separadas: `fx.chromaticAb.labelShort` y `fx.chromaticAb.label`.

### A4 — Colisión semántica: `"Handheld"` en dos dominios
- `CameraSpeedZone.tsx`: `"Handheld"` / `"Handheld · {intensity}"` → funcionalidad de cámara (handheld shake)
- `FXRow.tsx` `DEPTH_LABEL_MAP[12]`: `"Handheld"` → nivel de profundidad de color en Pixel Art
- Misma palabra en contextos completamente distintos. En i18n requieren claves distintas: `camera.handheld` vs `fx.pixelArt.depth.handheld`.

### A5 — String `"· off"` en FXPanel
- `FXPanel.tsx` línea 157: `"· off"` — badge de estado cuando fxMasterEnabled = false
- String muy corto con punto medio prefijado. En i18n debe incluir el separador en la traducción o extraerse como parte del patrón.

### A6 — Wordmark `"diorame™"` renderizado con DOM diferente en dos lugares
- `WelcomeModalV2`: `diorame<span style={{ fontSize: '0.6em' }}>™</span>` — span para reducir tamaño
- `MobileBlockScreenV2`: `diorame<sup style={{ fontSize: '0.55em', fontWeight: 400 }}>&#8482;</sup>` — sup + HTML entity
- Misma marca, dos implementaciones de renderizado. No es un problema de i18n sino de consistencia de componentes.

### A7 — Bug report email subject con APP_VERSION interpolado
- `WelcomeModalV2.tsx` línea 54: `'Diorame bug report — v' + APP_VERSION`
- Concatenación de string + variable. En i18n esto debe ser un template con interpolación: `t('welcome.bugReport.subject', { version: APP_VERSION })`.

### A8 — `"Medium"` ambiguo en FXRow
- Grunge `discreteOptions`: `{ label: 'Medium', value: 0.5 }` — intensidad media de textura
- Wiggle `discreteOptions`: `{ label: 'Medium', value: 0.5 }` — intensidad media de wiggle
- Mismo string, misma value, dos FX distintos. En i18n pueden compartir clave `fx.intensity.medium` si el contexto de categoría es suficiente.

### A9 — `"Aa"` como representación tipográfica en TextSessionPanel
- `TextSessionPanel.tsx` línea 111: `Aa` como contenido de botón de fuente
- Este string es una convención tipográfica universal (muestra del aspecto de la fuente). Generalmente no se traduce en ningún idioma.

### A10 — `"1-bit"`, `"CGA"`, `"8-Color"` como términos técnicos en FXRow
- Estos son nombres técnicos/históricos de modos de color. `"CGA"` y `"1-bit"` no tienen traducción directa.
- En i18n deben marcarse como `/* no-translate */` o mantenerse en inglés en todos los idiomas.

---

## 8. Conteo por tipo

| Tipo de string | Cantidad | Notas |
|---|---|---|
| **Tooltips / titles** (tooltip=, title=) | ~65 | Incluye duplicados por collapsed/expanded |
| **Labels visibles** (label=, `<span>`, `<p>`, `<div>`) | ~45 | Headers de panel, FX labels, group labels |
| **Botones de acción** (button text) | ~20 | CTAs, cancel, confirm, done |
| **Strings dinámicos** (template literals) | ~22 | Requieren interpolación en i18n |
| **Toast messages** (título) | ~13 | Toasts de éxito y error |
| **Toast descriptions** | ~15 | Descripciones de toast (incluye dinámicos) |
| **aria-label / alt** | ~4 | Accesibilidad |
| **Opciones de segmentos** | ~15 | DiSegmentControl options |
| **Placeholder** | 1 | textarea |
| **Etiquetas de datos** (depth map, line modes, etc.) | ~35 | FXRow, LineModeButton |
| **Nombres de color** (palette titles) | 48 | Solo visibles en hover |
| **Email template body** | ~8 | Bug report body lines |
| **Shortcut labels** (SHORTCUTS_GROUPS) | 15 | Solo visibles en shortcuts panel |
| **Shortcut categories** | 6 | Solo visibles en shortcuts panel |

---

### Resumen final

| Métrica | Valor |
|---|---|
| **Total de strings únicos** (estimado, excluyendo dinámicos y duplicados) | ~220 |
| **Total de ocurrencias** (incluyendo duplicados) | ~270 |
| **Strings con duplicados inconsistentes** (Anomalías A1–A3) | 3 pares |
| **Strings dinámicos que requieren interpolación** | 22 |
| **Archivos con strings UI** | 28 de ~60 en `src/` |
| **Archivos sin strings UI** (canvas pipeline, types, etc.) | ~32 |

### Top 10 componentes por densidad de strings

| # | Componente | Strings únicos estimados |
|---|---|---|
| 1 | `FXPanel.tsx` + `FXRow.tsx` | ~60 |
| 2 | `WelcomeModalV2.tsx` | ~20 |
| 3 | `OnboardingOverlayV2.tsx` | ~20 |
| 4 | `exportHandlers.ts` | ~13 |
| 5 | `LayersPanel.tsx` + `LayerRow.tsx` | ~18 |
| 6 | `DrawingToolbar.tsx` | ~11 |
| 7 | `useSaveLoad.ts` | ~10 |
| 8 | `CameraPresetsZone.tsx` | ~10 |
| 9 | `keyboardShortcuts.ts` (SHORTCUTS_GROUPS) | ~21 |
| 10 | `TextSessionPanel.tsx` | ~14 |

---

*Generado por lectura exhaustiva de `src/` — v2.0.0 — 2025-05-23.*
*Este archivo debe actualizarse en cada release antes de iniciar trabajo de i18n.*
