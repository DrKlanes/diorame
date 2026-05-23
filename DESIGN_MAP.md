# Diorame UI v2 — Mapa canónico del rediseño

**Estado:** documento canónico de referencia para Fase 10.  
Si código o decisión contradice este mapa, gana el mapa. Ediciones requieren acuerdo explícito.

**Estado:** release v2.0.0 (feat/ui-redesign-v2 lista para merge a main)

---

## 1. Filosofía del rediseño

El rediseño v2 no traduce el legacy 1:1 — lo reordena por principio. La premisa es que cada modo de uso (dibujo vs. preview cinemático) tiene un conjunto de controles completamente distinto, y la UI debe reflejar esa dicotomía sin compromisos. Los panels que antes eran popovers flotantes (Layers, FX, Palette) se convierten en panels fijos siempre visibles: en Riso, lo que no ves no existe.

Todos los tokens visuales provienen de `src/design-system/tokens.ts` (T, TYPE, SPACE, RADIUS, SHADOW, dk helper). No hay valores hardcoded en los átomos V2 salvo donde el sistema no cubre el caso (#F59E0B en TextSessionPanel — ver Sección 8). Los primitivos DiPill, DiPanel, DiActionButton, DiMiniSlider, DiSegmentControl, DiVSep son los bloques de construcción de toda la UI; no se usan componentes de Tailwind ni shadcn/ui en código nuevo.

La separación de responsabilidades sigue la jerarquía: `ControlsV2` (root) → `TopBar` (persistente) + `BottomBar` (persistente) + paneles fijos por modo. Los átomos de posicionamiento (LayerDotsRail, ResetViewPill) usan `position: fixed` (viewport-relative). Los paneles de contenido (LayersPanel, ColorPalette, FXPanel, TopBar, BottomBar) usan `position: absolute` relativo a su contenedor padre.

---

## 2. Layout DRAW (modo dibujo)

### 2.1 TopBar — slot izquierdo en DRAW

**Componente:** `FileControlsPill` (`topbar/FileControlsPill.tsx`)  
**Posición:** `absolute top-12 left-12`  
**Contenido:**
- `new` → `ClearCanvasAlertV2` → on confirm: `CLEAR_CANVAS` + `UPDATE_CAMERA {0,0,0,0}` + `sessionStorage.removeItem('diorame-view-initialized')`
- `open` → `fileInputRef.click()` → `LOAD_PROJECT`
- `save` → blob download `.dior`
- `export` → `DiSelectorPopover` con opciones SVG / SVG Compressed (ambas pasan por `useExportFlow` con complexity check >800 shapes)
- `DiVSep`
- `undo` → `UNDO` (disabled si `historyIndex <= 0`) | `redo` → `REDO` (disabled si `historyIndex >= history.length - 1`)
- `DiVSep`
- Project name: editable inline (`SET_PROJECT_NAME`), max 200px
- `info` → `TOGGLE_WELCOME_MODAL` (reabre WelcomeModalV2), tooltip "About Diorame"

### 2.2 TopBar — slot central (ambos modos)

**Componente:** `ModeSwitchPill` (`topbar/ModeSwitchPill.tsx`)  
**Posición:** `absolute top-12 left-50% -translateX(50%)`  
**Contenido:**
- `draw-mode` → `SET_MODE 'drawing'` (activeStyle: solid, label: "Draw", iconSize default 18px) — muestra texto "Draw" junto al icono en ambos estados
- `view-mode` → `SET_MODE 'cinematic'` (activeStyle: solid, label: "View", iconSize default 18px) — muestra texto "View" junto al icono en ambos estados
- `DiVSep`
- `hide-ui` → `TOGGLE_UI` (activeStyle: solid, iconSize 14px, iconWeight secondary) — solo icono (sin label), reducido ~22% y en muted cuando inactivo; color activo preservado cuando `isUIHidden === true`

### 2.3 TopBar — slot derecho (ambos modos)

**Componente:** `ThemeTogglePill` (`topbar/ThemeTogglePill.tsx`)  
**Posición:** `absolute top-12 right-12`  
**Contenido:**
- `sun` → `TOGGLE_DARK_MODE` si dark (activeStyle: wash cuando !dark)
- `moon` → `TOGGLE_DARK_MODE` si !dark (activeStyle: wash cuando dark)

### 2.4 BottomBar — DrawingToolbar

**Componente:** `DrawingToolbar` (`bottombar/DrawingToolbar.tsx`)  
**Wrapper:** `BottomBar` (`bottombar/BottomBar.tsx`) — `absolute bottom-12 left-50% -translateX(50%)`  
**Estructura:** DiPill con dos bloques fijos separados por DiVSep estructural:

**Bloque 1 — Herramientas (siempre visible, no shift):**
| Ícono | ToolType | Dot de color |
|---|---|---|
| `blob` | `'brush'` | ✓ |
| `brush` | `'line'` | ✓ |
| `eraser` | `'eraser'` | ✗ |
| `text` | `'text'` | ✓ |
| `move` | `'move'` | ✗ |

**Bloque 2 — Modificadores (minWidth 158, varía por tool):**
| Tool activo | Modificadores disponibles |
|---|---|
| `brush` | symmetry, draw-inside, draw-behind, organic, smooth |
| `line` | symmetry, draw-inside, draw-behind + `DiVSep` + `LineModeButton` |
| `eraser` | symmetry, smooth |
| `text` | (vacío) |
| `move` | (vacío) |

`LineModeButton` (`_shared.tsx`): ciclo tapered → uniform → ink, con 3 dots de posición indicadores. Solo aparece si `tool === 'line'`.

### 2.5 LayersPanel

**Componente:** `LayersPanel` (`layers/LayersPanel.tsx`)  
**Posición:** `absolute top-50% right-12 z-50 translateY(-50%)` (centrado vertical viewport, a la derecha)  
**Visibilidad:** `mode === 'drawing'` && `!isUIHidden`  
**Estado collapsed/expanded:** persiste en `localStorage` key `'diorame-layers-expanded'`

**Modo collapsed** — DiPill vertical (width 40, column):
- Badge `currentLayerIndex+1 / totalLayers` (purple / muted)
- HSep
- `chevron-left` → expand
- HSep
- `eye`/`eye-off` → `TOGGLE_LAYER_VISIBILITY` capa activa
- `duplicate` → `DUPLICATE_LAYER` (disabled si capa vacía o maxLayers)
- `trash` (danger) → `DELETE_CURRENT_LAYER` (disabled si totalLayers ≤ 1)
- HSep
- `arrow-up` → `REORDER_LAYERS` +1 (disabled si en top)
- `arrow-down` → `REORDER_LAYERS` -1 (disabled si en bottom)
- HSep
- `plus` → `NEXT_LAYER` (disabled si ≥ MAX_LAYERS=10)

**Modo expanded** — DiPanel width 220:
- Header: "LAYERS" + contador `N/10` + `plus` + `chevron-right` (collapse)
- Visualización eje Z (near/far decorativa)
- Lista de LayerRows en orden inverso (top = layer más cercana), con dnd-kit drag-reorder
- `DragEndEvent` → `MOVE_LAYER_TO { fromIndex, toIndex }`
- FLIP animation via Framer Motion `layout`

**Responsive height**: Panel centrado verticalmente con `translateY(-50%)`. `max-height: calc(100vh - 420px)` en DiPanel; rows list interna con `max-height: calc(100vh - 540px)` y `overflowY:auto`. Fórmula: `100vh − 64 (TopBar+margin) − 356 (BottomBar+ColorPalette+margin) = 100vh − 420`; rows = DiPanel − ~118px (header+circles+actions) ≈ 100vh − 540. Header y Z-axis visualization siempre visibles con `flexShrink:0`. Scrollbar: clase `.di-panel-scroll` (`globals.css`) — 4px, gray neutral, compatible light+dark.

**LayerRow** (`layers/LayerRow.tsx`) — por capa:
- Handle drag (useSortable, `touchAction: 'none'`)
- Dot Z-axis (purple si activa, borderColor si no)
- "Layer N" nombre (color: purple si activa, muted si vacía, dark si normal)
- Badge color mode: `Flat` | `Grad` | `Fade` | `Empty` (relleno con purple10/20 si aplica)
- `eye`/`eye-off` → `TOGGLE_LAYER_VISIBILITY payload: index`
- `pin`/`pin-off` → `TOGGLE_3D_LOCK payload: index`
  - `pin` = anclada en 2D (no se mueve con parallax) → color T.purple
  - `pin-off` = libre en 3D → color mutedColor
- Click en row → `SET_CURRENT_LAYER payload: index`

### 2.6 ColorPalette

**Componente:** `ColorPalette` (`colorpalette/ColorPalette.tsx`)  
**Posición:** `absolute bottom-12 right-12 z-50`  
**Visibilidad:** `mode === 'drawing'`  
**Estructura:** DiPanel width 240 radius 20:

- `PaletteHeader`: DiSegmentControl `Primary`/`Alt` (small) → `SET_ACTIVE_PALETTE` + DiSegmentControl `Flat`/`Gradient`/`Fade` (small) → `SET_PALETTE_MODE` + `SET_PALETTE_GRADIENT_TYPE`
- `GradientControls` (solo si `paletteMode === 'grad'`): dos DiMiniSlider — ángulo (0–360°) e intensidad (0–100%) ⚠️ GAP: despacha `SET_PALETTE_GRADIENT_ANGLE` / `SET_PALETTE_GRADIENT_INTENSITY` (campos mirror UI), no directamente a `layerGradParams`
- `SwatchGrid`: 14 blob-shapes organics en grid de 8 columnas (7 + 7), ring purple en activo, stroke luminance-based. Click → `SET_COLOR_INDEX`

### 2.7 LayerDotsRail

**Componente:** `LayerDotsRail` (`layers/LayerDotsRail.tsx`)  
**Posición:** Vive dentro del wrapper exterior de `LayersPanel` (`flex row, alignItems: center, gap: 6`), a la derecha del panel/pill (collapsed y expanded). Prop `inline=true` suprime el wrapper fixed y retorna el DiPill directamente. Sin `inline`, funciona como `fixed right-8 top-50% -translateY(50%) z-50` (standalone legacy).  
**Visibilidad:** `mode === 'drawing'` && `!isUIHidden` (controlado por el parent LayersPanel cuando inline)  
**Estructura:** DiPill vertical (width 24), dots para cada layer en orden inverso:
- Activa → punto purple
- Oculta → opacidad 0.4
- `locked3D` && no activa → `boxShadow: inset 0 0 0 1px T.purple`
- Click → `SET_CURRENT_LAYER payload: i`

### 2.8 ResetViewPill

**Componente:** `ResetViewPill` (`viewport/ResetViewPill.tsx`)  
**Posición:** `fixed left-8 bottom-8 z-50`  
**Visibilidad:** `mode === 'drawing'` && `!isUIHidden`  
**Contenido:** DiPill con un solo botón: ícono `target` → `RESET_DRAWING_VIEW` (resetea drawingZoom a 1, drawingPan a {0,0})

### 2.9 GridTogglePill + CompositionGuideOverlay

**Componente UI:** `GridTogglePill` (`viewport/GridTogglePill.tsx`)  
**Posición:** `fixed left-8 bottom-56 z-50` — stacked encima de ResetViewPill (gap 8px sobre los 40px del DiPill + 8 padding)  
**Visibilidad:** `mode === 'drawing'` && `!isUIHidden`  
**Contenido:** DiPill con un solo botón: ícono `guide` (3x3 dots) → `TOGGLE_GRID`. `active={state.gridEnabled}` con `activeStyle="wash"`.

**Overlay renderer:** `CompositionGuideOverlay` (`viewport/CompositionGuideOverlay.tsx`) — `<canvas>` separado montado en `App.tsx` como sibling de `<StrataCanvas />` (NO dentro). Position `absolute inset-0 z-1, pointer-events:none`. Se filtra por `mode/isUIHidden/gridEnabled` y retorna `null` cuando off (no monta DOM).  
**Render:** grid de puntos en world coords con spacing 50 unidades + marker más grande en world (0,0). Dark mode usa rgba blanco. Reactiva a `drawingZoom`, `drawingPan`, `isDarkMode`, container resize (vía ResizeObserver).  
**Export-safe:** PNG (`canvas.toDataURL`) y MP4 (`MediaRecorder` sobre canvas.captureStream) operan sobre el canvas principal de StrataCanvas. El overlay es un canvas DOM distinto → grid nunca aparece en exports.  
**Persistencia:** `state.gridEnabled` se lee/escribe en `localStorage["diorame-grid-enabled"]` desde el reducer (`TOGGLE_GRID` case). NO se serializa en `.dior` (whitelist explícita en useSaveLoad y LOAD_PROJECT).

### 2.10 Overlays condicionales en DRAW

**ToolOptionsPanel** (`drawing/ToolOptionsPanel.tsx`):
- Renderiza `null` si `state.tool !== 'line'`
- Cuando visible: DiPill con `LineModeButton` + `DiVSep` + label "Size" + `<input type="range" 1–100>` + valor numérico
- Slider: `onInput` → `SET_LINE_THICKNESS_PREVIEW`, `onChange` → `SET_LINE_THICKNESS`, `onPointerUp` → `COMMIT_LINE_THICKNESS`
- ⚠️ NO tiene posicionamiento propio — el parent (ControlsV2) debe posicionarlo encima del DrawingToolbar

**TextSessionPanel** (`text/TextSessionPanel.tsx`):
- Renderiza `null` si `!state.textSession.isActive`
- Cuando visible: panel 280px con fila de fuentes + textarea + fila de controles + acciones
- Fuentes: noir (Courier Prime) | mansion (Cinzel) | pharma (Inter) | comic (Bangers) | dungeons (Inknut Antiqua) — `UPDATE_TEXT_SESSION { font }`
- Textarea: `content` hasta 140 chars — `UPDATE_TEXT_SESSION { content }`
- Counter: color `#F59E0B` si length > 130, muted si ≤ 130
- Align: align-left / align-center / align-right — `UPDATE_TEXT_SESSION { align }`
- Cancel → `CANCEL_TEXT_SESSION` | Done → `COMMIT_TEXT_SESSION`
- Esc → cancel | Cmd/Ctrl+Enter → done
- ⚠️ NO tiene posicionamiento propio — el parent debe posicionarlo

---

## 3. Layout VIEW (modo cinemático)

### 3.1 TopBar — slot izquierdo en VIEW

**Componente:** `SnapshotRecordPill` (`topbar/SnapshotRecordPill.tsx`)  
**Posición:** `absolute top-12 left-12` (misma posición que FileControlsPill en DRAW)  
**Contenido:**
- `snapshot` → `REQUEST_EXPORT 'png'`
- `RecordBtn`: ícono `record` → `REQUEST_EXPORT 'mp4'`; cuando `isExporting && exportRequest === 'mp4'`: fondo rojo, etiqueta "REC" en Sora 9px

TopBar centro y derecha: idénticos a DRAW (ModeSwitchPill + ThemeTogglePill).

### 3.2 BottomBar — CameraBar

**Componente:** `CameraBar` (`bottombar/CameraBar.tsx`)  
**Wrapper:** `BottomBar` — misma posición bottom-center que DrawingToolbar  
**Responsive:** `window.matchMedia('(max-width: 1100px)')`

**Desktop (>1100px):** DiPill único:
```
[CameraPresetsZone] | tall-vsep | [CameraSpeedZone] | tall-vsep | [CameraSlidersZone]
```

**Tablet (≤1100px):** dos pills apiladas:
```
DiPill: [CameraSlidersZone]
DiPill: [CameraPresetsZone] | tall-vsep | [CameraSpeedZone]
```

**CameraPresetsZone:** 10 DiActionButton (activeStyle: solid) → `SET_CINEMATIC_TYPE`:
`forward` · `spiral` · `yoyo` · `pulse` · `twist` · `arc` · `crane` · `truck` · `orbit` · `zoom`

**CameraSpeedZone:**
- Ícono `ctrl-speed` + DiMiniSlider 0.1–1.0 → `SET_CINEMATIC_SPEED`
- Botón ciclo 4 estados (Off → Low → Medium → High → Off): ícono `ctrl-handshake`/`ctrl-handshake-off` + label → `TOGGLE_HANDHELD` + `SET_HANDHELD_INTENSITY`

**CameraSlidersZone:**
- `ctrl-focal` + DiMiniSlider 24–300mm → `SET_FOCAL_LENGTH` (conversión flToMm/mmToFl)
- `ctrl-distance` + DiMiniSlider -5000–2000 → `SET_VIEW_ZOOM_OFFSET`
- `ctrl-spacing` + DiMiniSlider 0–2.0 → `SET_LAYER_SPACING_FACTOR`

### 3.3 FXPanel

**Componente:** `FXPanel` (`fx/FXPanel.tsx`)  
**Posición:** `absolute top-50% right-12 -translateY(50%) z-50`  
**Visibilidad:** `mode === 'cinematic'` && `!isUIHidden`  
**Estado collapsed/expanded:** persiste en `localStorage` key `'diorame-fx-expanded'`

**Modo collapsed** — DiPill vertical (análogo a LayersPanel collapsed):
- `FXMasterBtn` (componente local en FXPanel.tsx): botón master 35×35 / icono sparkles 21px — visualmente mayor que los DiActionButton de FX individuales (30×30/18px). Background `T.purple10/T.purple20` cuando activo, gris sutil cuando OFF. `boxShadow inset` como outline: `rgba(154,15,249,0.40)` 1.5px cuando ON, `rgba(154,15,249,0.18)` 1px cuando OFF. Siempre visible, fuera del grupo de FX rows.
- Expander

**Modo expanded** — DiPanel width 248. **Responsive height**: panel con `max-height: calc(100vh - 80px)` + `overflow: hidden`; lista interna de FX (3 grupos con FXRows) en wrapper `.di-panel-scroll` con `max-height: calc(100vh - 141px)` y `overflow-y: auto` (mismo patrón que LayersPanel post-86dec45 — `maxHeight` directo en el hijo, sin `flex-grow`). Header + FXMasterBtn + chevron siempre visibles.
- Header: "FX" + (cuando master OFF: etiqueta roja "· off") + `FXMasterBtn` (TOGGLE_FX_MASTER) + `chevron-right` (collapse)
- 3 grupos con `FXRow` por efecto:

| Grupo | Efecto | Level | Control |
|---|---|---|---|
| Texture | Grain | 1 | Slider 0–1 |
| Texture | Grunge | discrete | Subtle / Medium / Intense |
| Texture | RISO | 1 | Slider 0–1 |
| Lens | Vignette | 1 | Slider 0–1 |
| Lens | Chromatic Ab. | 1 | Slider 0–1 |
| Lens | Distortion | bipolar | Slider -1–1 |
| Lens | Glow | 1 | Slider 0–1 |
| Lens | Blur / DoF | dof | Slider intensidad + focus dist + focus layer |
| Atmosphere | Fog | 1 | Slider 0–1 |
| Atmosphere | Particles | composite | Slider + type Circle/Square/Stroke |
| Atmosphere | Stop Motion | discrete | Light / Medium / Heavy |
| Atmosphere | Pixel Art | pixel | Size + Depth + Dither sub-sliders |

Cada `FXRow` tiene 4 estados visuales:

| Estado | `isActive` | `wasInSnapshot` | Render |
|---|---|---|---|
| 1 — Master ON, FX activo | `true` | `false` (snapshot=null) | Expandido normal (morado, slider funcional) |
| 2 — Master ON, FX inactivo | `false` | `false` (snapshot=null) | Flat row (solo icono + nombre) |
| 3 — Master OFF, en snapshot | `false` | `true` | Expandido muted (gris, opacity 0.5, `pointerEvents:none` en controles internos). Click dispara `TOGGLE_FX_MASTER`. |
| 4 — Master OFF, NO en snapshot | `false` | `false` | Flat row muted (gris, opacity 0.5). Click dispara `TOGGLE_FX_MASTER`. Snapshot sagrado: nunca se modifica con master OFF. |

Cuando hay snapshot activo, **todo el panel se ve visualmente apagado** (ningún FX se está aplicando):
- **Expanded**: `isMuted = hasSnapshot` → todos los FXRow usan `accentColor = T.muted` y `opacity: 0.5`. `wasInSnapshot` solo distingue si se muestra expandido o flat.
- **Collapsed**: wrapper `<div opacity: hasSnapshot ? 0.5 : 1>` atenúa los 12 iconos. Los que estaban en snapshot muestran `active={snap.KEY}` (tono morado atenuado); los que no estaban muestran `active=false` (gris atenuado). Esto da una pista visual sutil de qué se restaurará.

`handleClick`/`fxClick`: cualquier click sobre FX con master OFF dispara `TOGGLE_FX_MASTER` (wake/restore). Aplica en expanded y collapsed. `isMuted` solo gobierna render visual.

Toggle ON/OFF normal: `TOGGLE_FX payload: fxKey` + controles expandidos según `level`.

### 3.4 ResetViewPill en VIEW

El componente `ResetViewPill` retorna `null` cuando `mode !== 'drawing'`. **En VIEW no existe un equivalente de Reset View** — el usuario regresa a una vista conocida seleccionando un preset de cámara.  
⚠️ [A CONFIRMAR CON EL USUARIO] ¿Se quiere un reset de cámara en VIEW (ej: botón que resetee a z=500, rotation=0)?

### 3.5 Lo que desaparece en VIEW

- `LayersPanel` — no hay edición de capas en modo cinemático
- `ColorPalette` — no hay dibujo en modo cinemático
- `LayerDotsRail` — no hay navegación de capas en modo cinemático
- `ToolOptionsPanel` — específico de herramienta de dibujo
- `TextSessionPanel` — específico de herramienta texto

---

## 4. Persistentes (ambos modos)

Átomos que viven en el ControlsV2 root y no dependen de modo.

**isUIHidden — filtro a nivel root (post-10.4-fix):** El filtro `isUIHidden` se aplica en `ControlsV2` a nivel root, no átomo por átomo. Cuando `isUIHidden === true`, todos los átomos se desmontan juntos con `{!isUIHidden && <>...</>}`. Excepción: los 4 átomos que ya tenían filtro propio (LayersPanel, LayerDotsRail, ResetViewPill, FXPanel) lo conservan por compatibilidad con usos futuros fuera de ControlsV2. Cuando `isUIHidden === true`, se renderiza solo el mini-button persistente (ver abajo).

**Mini-button persistente:** Cuando `state.isUIHidden === true`, aparece un `DiActionButton` con icono `eye` en `position:fixed bottom:16 right:16 z-index:100`. Opacidad base 0.25, opacidad hover 1 (transition 0.2s). Click → `TOGGLE_UI`. Este botón NO existe en DOM cuando la UI está visible; el toggle primario es el botón hide-ui de ModeSwitchPill.

Átomos que viven en el ControlsV2 root y no dependen de modo:

| Átomo | Componente | Posición |
|---|---|---|
| TopBar completo | `TopBar.tsx` | orchestrador; delega a los 3 slots |
| Slot central (mode switch + hide UI) | `ModeSwitchPill` | `absolute top-12 center` |
| Slot derecho (theme) | `ThemeTogglePill` | `absolute top-12 right-12` |
| BottomBar | `BottomBar.tsx` | `absolute bottom-12 center` — cambia contenido por modo |

**LayerDotsRail y ResetViewPill** son visibles solo en DRAW pero son atoms sin deps de modo en su código — retornan null automáticamente. Desde ControlsV2 root se pueden montar incondicionalmente.

---

## 5. Modales y overlays (z-index alto)

| Modal | Trigger | Componente |
|---|---|---|
| WelcomeModal | Shift+? / botón `info` en FileControlsPill | `WelcomeModalV2` |
| Clear Canvas | Botón "New" en FileControlsPill ⚠️ actualmente `window.confirm()` | `ClearCanvasAlertV2` |
| Complex Scene | Export con >800 shapes visibles | `ComplexSceneModalV2` |
| Export Progress | Durante export en curso | `ExportProgressV2` |
| Mobile Block | Viewport < threshold | `MobileBlockScreenV2` |

**WelcomeModalV2 — estructura Zona 1 (Identidad):** Logo símbolo (`logo-symbol.png`, height 28px, `display:block`) encima del título "diorame™ v{APP_VERSION}". Alineación izquierda natural por ser block.

**WelcomeModalV2 — footer (Zonas 3-4-5):** Recursos, créditos y bug report alineados a la **izquierda** (`textAlign: 'left'`). CTAs (Zona 2) mantienen `alignItems: 'stretch'`. Zona 5: "Found a bug? Email me." (button nativo, 12px, color muted, underline on hover). Construye el `mailto:` en runtime con `['moises','dumaker.com'].join('@')` para evitar que el email quede concatenado en el bundle minificado (verificado post-build: `moises@dumaker.com` no aparece en los assets).

Todos importados desde `src/components/strata/modals/index.ts`.

---

## 6. Tabla de cambios entre modos (DRAW ↔ VIEW)

| Zona | DRAW | VIEW |
|---|---|---|
| TopBar izquierda (abs top-12 left-12) | `FileControlsPill`: new·open·save·export + undo·redo + project name | `SnapshotRecordPill`: snapshot·record |
| TopBar centro (abs top-12 center) | `ModeSwitchPill`: draw·view + hide-ui | `ModeSwitchPill`: draw·view + hide-ui (idéntico) |
| TopBar derecha (abs top-12 right-12) | `ThemeTogglePill`: sun·moon | `ThemeTogglePill`: sun·moon (idéntico) |
| Bottom-center (abs bottom-12 center) | `DrawingToolbar`: 5 tools + modifiers por tool | `CameraBar`: 10 presets + speed/handheld + 3 sliders |
| Top-right under TopBar (abs top-72 right-12) | `LayersPanel`: expanded/collapsed, drag-reorder | (no existe) |
| Bottom-right (abs bottom-12 right-12) | `ColorPalette`: palette selector + grad controls + swatches | (no existe) |
| Right-center (abs top-50% right-12) | (no existe) | `FXPanel`: 12 efectos en 3 grupos |
| Right edge center (fixed right-8 center) | `LayerDotsRail`: dots de navegación rápida | (no existe) |
| Bottom-left (fixed left-8 bottom-8) | `ResetViewPill`: target icon → RESET_DRAWING_VIEW | (no existe, ver §3.4) |
| Overlay line tool | `ToolOptionsPanel` (si tool==='line'): mode + thickness | (no existe) |
| Overlay text session | `TextSessionPanel` (si textSession.isActive): fuentes·align·textarea | (no existe) |
| Hide UI active (isUIHidden) | Solo mini-button: fixed bottom-right, opacity 0.25/1 hover | Solo mini-button: fixed bottom-right, opacity 0.25/1 hover |

---

## 7. Abolido del legacy (no se traduce, se elimina)

- ❌ **UndoRedoBar V2** bottom-left — fue construido y eliminado en 10.3.6; absorbido por FileControlsPill (undo/redo), ResetViewPill (reset), botón "New" (clear)
- ❌ **Badges de modificadores activos** (DiBadge: SYM / IN / BACK / FLUID) — en legacy mostraban estado en zona top-right; en V2 el estado activo está visible en los botones del modifier zone (DiActionButton active state)
- ❌ **Panel de Gradient en ToolOptionsPanel legacy** — tenía controles de tipo (solid/fade) + ángulo + intensidad; absorbido por GradientControls dentro de ColorPalette V2 (siempre visible en DRAW cuando paletteMode=grad)
- ❌ **Popover de export SVG en bottom bar** (ControlsDrawing legacy) — absorbido por DiSelectorPopover en FileControlsPill V2
- ❌ **Botón Layers en bottom bar** (abría LayersPanel como popover) — reemplazado por LayersPanel V2 fijo en top-right
- ❌ **Modal de modo cinemático** (ControlsCinematic legacy era un panel de 768 líneas) — descompuesto en CameraBar + FXPanel + SnapshotRecordPill, cada uno autónomo
- ❌ **EnhancedTooltip de Lucide/Radix** — reemplazado por prop `tooltip` nativa en DiActionButton
- ❌ **Botón "Hide UI" standalone** en modo cinematic (legacy tenía botón separado en esquina) — absorbido en ModeSwitchPill como tercer botón (separado por DiVSep)
- ❌ **Badge "Layer N | Tool | Modifiers"** top-right (legacy) — información distribuida en DrawingToolbar (tool activo via active state) + LayerDotsRail (capa activa) + LayersPanel badge N/total

### 7.1 Archivos legacy borrados en 10.5 commit 8

- ❌ **Controls.tsx** — orquestador legacy (162 líneas tras 10.2). Reemplazado por ControlsV2 como root delgado de orquestación
- ❌ **ControlsDrawing.tsx** — UI legacy del modo DRAW (914 líneas). Descompuesta en átomos V2 (TopBar, BottomBar, LayersPanel, ColorPalette, LayerDotsRail, ResetViewPill, ToolOptionsPanel) orquestados desde ControlsV2
- ❌ **ControlsCinematic.tsx** — UI legacy del modo VIEW (766 líneas). Descompuesta en átomos V2 (SnapshotRecordPill, CameraBar, FXPanel) orquestados desde ControlsV2
- ❌ **ToolOptionsPanel.tsx (legacy strata/)** — reemplazado por strata/drawing/ToolOptionsPanel.tsx V2 (solo Brush options; el panel Gradient legacy fue absorbido por GradientControls dentro de ColorPalette V2)

---

## 8. Gaps conocidos pendientes

| # | Gap | Archivo | Prioridad |
|---|---|---|---|
| G1 | ✅ RESUELTO (10.5 c3 + 10.5-fix-final c5) — `FileControlsPill` botón "New" abre `ClearCanvasAlertV2`, limpia sessionStorage y resetea `projectName` a "Untitled Project" | `topbar/FileControlsPill.tsx` | — |
| G2 | ✅ RESUELTO (10.5 commit 4) — `FileControlsPill` undo/redo con disabled states basados en `historyIndex` | `topbar/FileControlsPill.tsx` | — |
| G_fx | ✅ RESUELTO (10.5-fix-final c1) — `TOGGLE_FX_MASTER` como snapshot/restore: apaga todos + guarda snapshot; restaura desde snapshot. `postProcessingSnapshot: PostProcessingEnabled | null` en AppState. `TOGGLE_FX` invalida el snapshot. | `StrataContext.tsx`, `strataTypes.ts`, `fx/FXPanel.tsx` | — |
| G3 | POSPUESTO A 2.1 — refactor `paletteGradient*` mirrors a `layerGradParams` directo en `GradientControls`. No bloquea release. | `colorpalette/GradientControls.tsx` | — |
| G4 | ✅ RESUELTO (10.5 c5) — `ControlsV2` posiciona ambos paneles como overlays absolutos `bottom:60 left:50%` sobre DrawingToolbar | ambos | — |
| G5 | POSPUESTO A 2.1 — ResetViewPill es draw-only por diseño. VIEW camera reset via CameraBar presets. | `viewport/ResetViewPill.tsx` | — |
| G6 | ✅ RESUELTO (10.6 c6) — `T.warning`/`T.warningDark` añadidos a tokens.ts. TextSessionPanel usa `dk(dark, T.warning, T.warningDark)`. | `design-system/tokens.ts` | — |
| G7 | ✅ RESUELTO (10.6 c7) — 6 tooltips traducidos al inglés (New, Open, Save, Export SVG, Undo, Redo). | `topbar/FileControlsPill.tsx` | — |

---

## 9. Referencias

- **Banco de iconos:** `src/design-system/icons.ts` — 112 iconos al cierre de 10.3-fix
- **Assets renombrados (C12):** `src/assets/` — 3 en uso con nombres legibles: `logo-symbol.png` (MobileBlockScreenV2 + WelcomeModalV2), `texture-paper.png` (fondo canvas, StrataCanvas), `texture-grunge.png` (FX Grunge, StrataCanvas). Alias en `vite.config.ts` actualizados. 1 huérfano borrado (`cb8694f...`, 1.4 MB).
- **Tokens design system v2:** `src/design-system/tokens.ts` — T, TYPE, SPACE, RADIUS, SHADOW, dk()
- **Figma file key:** VYsPFnI7mE5XnCPpiak1fR (Diorame-UI)
- **Capturas de referencia:** compartidas en chat del copiloto Claude.ai (DRAW + VIEW)
- **APP_VERSION al cierre de esta fase:** 1.16.0 (en `src/constants/version.ts`)
- **Rama activa:** `feat/ui-redesign-v2`
