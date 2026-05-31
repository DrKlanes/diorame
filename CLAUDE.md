# CLAUDE.md — Diorame Collaboration Guide

Fuente canónica de instrucciones para sesiones de Claude Code.
Reemplaza: `src/guidelines/Guidelines.md`, `memory/MEMORY.md` (ambos deprecados).
Para documentación de producto y UX, ver `src/REFERENCE.md`.

---

## Proyecto

**Diorame** — herramienta de arte web estilo Risógrafo: dibujo 2D por capas + preview cinemático 3D con parallax.

| | |
|---|---|
| **Versión** | 3.0.1 |
| **Stack** | React 18 + TypeScript + Vite 6 + Tailwind CSS 4 + Canvas 2D API |
| **Dev** | `npm run dev` → puerto 3000 |
| **Build** | `npm run build` — siempre verificar antes de hacer commit |

---

## Preferencias de trabajo

- **Responder siempre en español**
- **Análisis exhaustivo antes de modificar cualquier cosa** — leer los archivos relevantes, documentar hallazgos, proponer el plan, esperar confirmación
- **No hacer cambios especulativos** — solo lo que fue explícitamente pedido
- **No añadir comentarios, docstrings ni type annotations** a código que no se modificó

---

## Reglas de arquitectura

### Reglas doradas

1. **StrataCanvas.tsx está congelado** — Solo extraer código de él; nunca agregar líneas nuevas.
2. **Máximo 400 líneas por archivo** — Si un archivo nuevo se acerca al límite, dividirlo antes de continuar. Excepción documentada: `renderPipeline.ts` (~476L) como orquestador de frame — aceptado en v3.0.0.
3. **Tabs para indentación** — El codebase entero usa tabs. Nunca mezclar spaces.
4. **No abstracciones especulativas** — Tres líneas similares son mejores que una abstracción prematura.

### Dónde poner código nuevo

| Tipo | Destino |
|---|---|
| Constantes / datos puros | `src/constants/<name>.ts` |
| Utilidades / helpers | `src/utils/<name>.ts` |
| Lógica de canvas modular | `src/components/strata/canvas/<Name>.ts` |
| Hooks React | `src/hooks/use<Name>.ts` |
| Sub-componentes UI | `src/components/strata/<Name>.tsx` |
| Primitivas de Design System | `src/design-system/Di<Name>.tsx` |
| Tipos compartidos | `src/types/strataTypes.ts` |

### Convenciones generales

- Toasts: usar `sonner@2.0.3`
- Imágenes raster: importar con `figma:asset/...` (sin prefijo de ruta)
- SVGs: van en `/imports`, usar rutas relativas
- Arrays, paletas y matrices de datos readonly: preferir tipos `readonly` (`as const` o `Readonly<>`)

### Extracción de StrataCanvas (estrategia incremental)

1. Identificar un bloque autocontenido
2. Crear archivo nuevo siguiendo la tabla anterior
3. Importar en StrataCanvas reemplazando el código inline
4. Verificar que compila y el comportamiento es idéntico
5. Dejar un comentario de una línea en el punto de extracción: `// Extracted to <filename>`

### Editar archivos con tabs

El tool `Edit` (str_replace nativo) funciona correctamente con indentación de tabs en todos los archivos del codebase. Usarlo directamente — no se necesita Python para ediciones de código.

**Cuándo usar Python:** solo para escritura completa de archivos o reemplazos masivos en loops (>3 archivos). En esos casos aplicar el patrón atomic write per file documentado abajo.

### Atomic write per file en operaciones multi-archivo

Cuando un script Python escribe en múltiples archivos en una sola invocación, aplicar:

1. **Atomic write per file** — cada archivo se completa íntegramente (read → modify → write) antes de pasar al siguiente. Nunca acumular cambios en memoria para volcar al final.
2. **View inmediato tras cada archivo** — verificar el resultado con `view` antes de continuar con el siguiente.
3. **No batch tácito** — si el script aborta a la mitad, los archivos ya escritos quedan en estado válido; los pendientes, intactos.

**Por qué importa:** scripts que abortan tras modificaciones parciales dejan código sintácticamente roto pero invisible al build. TypeScript no detecta variables no declaradas dentro de JSX (`{displayedName}` sin declarar pasa `npm run build`). El error solo aparece en runtime o en revisión visual.

**Cuándo aplica:**
- Refactors masivos (renames, extracción de constantes, normalización de imports)
- Migraciones de tokens, tipos o nombres de props
- Cualquier loop que toque >3 archivos en un solo script

**Cuándo NO aplica:**
- Edits manuales de 1-2 archivos
- `str_replace` único e idempotente
- Operaciones de solo lectura (audits, diagnósticos)

### Tablet como consideración sistemática

Diorame soporta desktop y tablet. Cualquier cambio que toque interacción debe contemplar input táctil sin teclado físico:

- **Eventos de input**: usar `pointerdown`/`pointerup` (unifica mouse + touch + pen). NO `mousedown`/`mouseup` (desktop-only).
- **Atajos de teclado**: siempre tener alternativa táctil. Si la funcionalidad solo es accesible por shortcut, está rota en tablet.
- **Focus management**: return-focus al anchor solo cuando el cierre fue iniciado por teclado (ESC). En cierre por pointer (click/tap), el foco queda donde el usuario lo puso.
- **Tooltips con shortcuts**: en tablet, los shortcuts (`Cmd+E`, etc.) son ruido irrelevante. Tooltip ideal en táctil: o se suprime, o muestra solo la descripción sin el atajo.
- **Modales**: cierre por gesto táctil debe estar contemplado (click outside, X visible, ESC opcional pero no único).
- **Hover states**: nunca depender solo de hover para revelar UI crítica (no hay hover persistente en touch).

Esto NO es preocupación añadida — es parte del filtro de decisión de cualquier prompt que toque UX.

### Cambios mínimos en StrataCanvas.tsx — precedente operativo

`StrataCanvas.tsx` es monolito de alto riesgo (render loop, gestos, proyección 3D). Regla por defecto: **no se toca**.

Excepción documentada (precedente sub-fase 8.6): **swap de import con alias** es aceptable.

```typescript
// Cambio de 1 línea con alias, JSX intacto, lógica intacta — OK
import { ComponentConnected as Component } from './ComponentConnected';
```

Cualquier otra modificación (añadir import nuevo, cambiar JSX, tocar listeners, modificar lógica de render) requiere:
- Modelo Opus (no Sonnet)
- Análisis previo explícito de impacto
- Validación visual exhaustiva post-cambio

Si dudas si tu cambio es "swap de import" o algo más, asume que es más y escala a Opus.

---

## Mapa de archivos (estado actual)

### Core — `src/components/strata/`

| Archivo | Líneas | Rol |
|---|---|---|
| `StrataCanvas.tsx` | ~1289 | Thin React shell: render loop, event handlers, gestures. **CONGELADO.** |
| `StrataContext.tsx` | ~1669 | React Context + useReducer, constantes, re-exports de tipos |
| `ControlsV2.tsx` | ~150 | Root orquestador delgado para ambos modos. Side-effects globales (keyboard shortcuts, sessionStorage, mode-change camera reset). |

**Átomos UI V2 (producción, v3.0.1):**

| Directorio | Archivos clave |
|---|---|
| `topbar/` | `TopBar.tsx`, `FileControlsPill.tsx`, `SnapshotRecordPill.tsx`, `ModeSwitchPill.tsx`, `ThemeTogglePill.tsx` |
| `bottombar/` | `BottomBar.tsx`, `DrawingToolbar.tsx`, `CameraBar.tsx`, `CameraPresetsZone.tsx`, `CameraSpeedZone.tsx`, `CameraSlidersZone.tsx`, `_shared.tsx` |
| `colorpalette/` | `ColorPalette.tsx`, `PaletteHeader.tsx`, `GradientControls.tsx`, `SwatchGrid.tsx` |
| `layers/` | `LayersPanel.tsx`, `LayerRow.tsx`, `LayerDotsRail.tsx` |
| `viewport/` | `ResetViewPill.tsx` |
| `drawing/` | `ToolOptionsPanel.tsx` |
| `text/` | `TextSessionPanel.tsx` |
| `fx/` | `FXPanel.tsx`, `FXRow.tsx` |
| `modals/` | `WelcomeModalV2.tsx`, `ClearCanvasAlertV2.tsx`, `ComplexSceneModalV2.tsx`, `ExportProgressV2.tsx`, `OnboardingOverlayV2.tsx`, `MobileBlockScreenV2.tsx` |
| `popovers/` | `DiSelectorPopover.tsx`, `DiSelectorOption.tsx` |

---

### Canvas pipeline — `src/components/strata/canvas/`

| Archivo | Líneas | Propósito |
|---|---|---|
| `cinematicCamera.ts` | 150 | `computeCinematicTick`: 10 modos de cámara + handheld shake |
| `composeLayer.ts` | 98 | Compositing de capa a offscreen buffer (pixel art + fog/glow/DoF) |
| `drawBackground.ts` | 47 | Fondo del canvas (textura paper, dark mode) |
| `drawGizmo.ts` | 179 | Gizmo handles del Move tool + botones flip overlay |
| `drawSymmetryAxis.ts` | 31 | Renderizado del eje de simetría |
| `exportHandlers.ts` | 422 | `exportAsPNG`, `exportAsSVG`, `exportAsMP4` |
| `PixelArtProcessor.ts` | 173 | Downscale, quantización de paleta, dithering Bayer |
| `postProcessing.ts` | 409 | 8 efectos: Fog, Glow, DoF, RisoV2, ChromAb, Vignette, Grain, Grunge |
| `quantizePixelArtCamera.ts` | 99 | Snaps cámara a pixel grid para modo pixel art |
| `renderEraserShape.ts` | 30 | Renderizado de forma del eraser (compositing destination-out) |
| `renderLayerBody.ts` | 380 | Renderer por capa: `renderLayer(z, rc, offCtx, pfc)` |
| `renderLiveStroke.ts` | 151 | Renderizado del trazo en progreso (live stroke) |
| `renderParticles.ts` | 98 | Renderizado de partículas flotantes cinemáticas |
| `renderPipeline.ts` | 476 | Orquestador de frame: `renderFrame(ctx, rc: RenderContext)` ⚠️ excepción 400L |
| `renderRegularFillShape.ts` | 95 | Formas de relleno regular (blob/tapered brush) |
| `renderTextShape.ts` | 175 | Renderizado de texto con fuente + alineación |
| `renderUniformLineShape.ts` | 144 | Renderizado de trazo brush en modo uniform |
| `transformPoint.ts` | 124 | Factory `createTransformPoint` para proyección 3D |
| `transformUtils.ts` | 134 | `getLayerBoundingBox` para Move tool |

### Arquitectura del render pipeline

**Patrón: "caller orquesta, módulos puros"**

- `StrataCanvas.tsx` — gestiona el ciclo React y los refs. Llama a `renderFrame(ctx, buildRenderContext())` en cada frame.
- `renderPipeline.ts` — orquestador puro. Recibe `RenderContext`, ejecuta las fases en orden, no toca refs de React.
- Módulos `canvas/*.ts` — funciones puras que reciben parámetros tipados. Nunca acceden a refs de React ni a closures del componente.

**Tipos centrales exportados por `renderPipeline.ts`:**

| Tipo | Propósito |
|---|---|
| `RenderContext` | Bundle de todos los refs, snapshots de estado, refs frame-persistent, refs canvas y overrides |
| `PerFrameComputed` | Valores computados una vez por frame y compartidos entre todas las llamadas de capa |
| `TransformRefState` | Estado de transform por ref para el frame actual |

**Overrides en RenderContext:**

| Override | Efecto |
|---|---|
| `renderZsOverride?` | Fuerza un orden de capas alternativo (usado en Move tool) |
| `skipLiveStroke?` | Omite el renderizado del trazo en progreso |
| `skipCinematicOverlays?` | Omite partículas y overlays cinemáticos |

**5 refs frame-persistent en StrataCanvas:**
`accumulatedTimeRef`, `accumulatedHandheldTimeRef`, `lastTimeRef`, `wiggleFrameRef`, `shapePatternRef` — migrados de `let` en closure de useEffect a `useRef` en nivel de componente en v3.0.0.

**Secuencia de fases en `renderFrame`:**
throttle → quantize cam → FL/focus → buffers → background → viewport → loop de capas → post-processing → overlays → cinematic tick

---

### Tipos — `src/types/`

| Archivo | Propósito |
|---|---|
| `strataTypes.ts` | Todas las interfaces y tipos: `Point`, `Shape`, `AppState`, `AppMode`, `ToolType`, `HistorySnapshot`, tipos de post-processing. Re-exportados desde `StrataContext.tsx`. |

### Utilidades — `src/utils/`

| Archivo | Propósito |
|---|---|
| `colorUtils.ts` | `hexToHSL`, `hslToHex`, `getVibrantVariant`, `hexToRgba` |
| `canvasUtils.ts` | `createNoise`, `drawSmoothLine`, `drawStraightLine` |
| `strokeGenerators.ts` | `generateTaperedStroke`, `generateUniformStroke`, `generateInkStroke`, `generateStrokeForMode` |

### Constantes — `src/constants/`

| Archivo | Propósito |
|---|---|
| `renderConstants.ts` | `PARTICLE_COUNT`, `RENDER_THROTTLE_MS`, `DOUBLE_CLICK_DELAY`, `DRAW_FOCAL_LENGTH`, `NEAR_CLIP`, `FOG_DENSITY_FACTOR`, frecuencias de handheld |
| `palette.ts` | `PALETTE_PRIMARY`, `PALETTE_ALTERNATIVE` como `PaletteColor[]` con `{hex, name, isDark}`. `GRADIENT_DEFAULTS`. `DARK_COLORS` (Set derivado). **Fuente única de verdad del sistema de color.** |

### Hooks — `src/hooks/`

| Archivo | Propósito |
|---|---|
| `useAutoSave.ts` | Auto-guardado periódico del proyecto |
| `useBeforeUnload.ts` | Alerta al cerrar si hay cambios sin guardar |
| `useExportFlow.ts` | Orquesta el flujo de exportación (PNG/SVG/MP4) |
| `useIsMobile.ts` | Detección de dispositivo móvil |
| `useKeyboardShortcuts.ts` | Todos los atajos de teclado globales y por modo |
| `useLoadExampleScene.ts` | Carga la escena de ejemplo en primer uso |
| `useSaveLoad.ts` | Guardar y cargar proyectos desde indexedDB |

---

## Design System (`src/design-system/`)

### Tokens (`tokens.ts`)

`diTokens` — objeto `as const` con 35+ claves Tailwind. **Fuente única para todos los valores visuales de la UI.** Todos los componentes importan directamente desde aquí; no hay prop drilling de `uiTheme`.

Categorías: superficies (`bgPanel`, `bgAlt`), bordes (`border`, `borderSubtle`), texto (`textPrimary`, `textMuted`, `textSubtle`), interacción (`hoverAlt`), sliders/toggles, spinners, brand, dialog, layers (`layerBgActive`, `layerBorderActive`), segmentos.

### Primitivas Di*

| Componente | Propósito |
|---|---|
| `DiButton` | Button con variantes: default, ghost, icon, brand |
| `DiIconButton` | Icon button con `EnhancedTooltip` integrado |
| `DiSlider` | Label + valor formateado + range input |
| `DiToggleSlider` | Checkbox toggle + label + valor + range + `children` opcional |
| `DiPanel` | Contenedor de superficie |
| `DiDivider` | Separador horizontal/vertical |
| `DiBadge` | Status pill con icono opcional |
| `DiActionButton` | Botón icono con props `disabled` y `danger`. Sustituye al IconBtn legacy. Usado en LayersPanel V2, top bar pills, y bottom bars. (Añadido en 9.8) |

**Tailwind CSS 4 JIT:** Los class strings deben ser strings estáticos literales — nunca template literals. El scanner JIT no evalúa expresiones.

---

## Sistema de color (`src/constants/palette.ts`)

- `PALETTE_PRIMARY` / `PALETTE_ALTERNATIVE`: 24 colores cada una, **fijas e inmutables** (filosofía Riso)
- `FIXED_PALETTE` / `ALTERNATIVE_PALETTE` en `StrataContext.tsx` se derivan con `.map(c => c.hex)` — retrocompatibilidad total
- `DARK_COLORS`: Set derivado de `isDark: true` en ambas paletas — usado en `ControlsDrawing.tsx` para el ring de contraste en swatches seleccionados
- `GRADIENT_DEFAULTS`: `{ angle: 90, intensity: 0.2, gradType: 'solid' }` — único fallback para `layerGradParams`

---

## Comportamientos protegidos (NO modificar)

- **Eraser tool** — lógica de borrado
- **Draw Inside / Draw Behind** — compositing con alpha
- **Clipping / pipeline de renderizado** — orden y composición de capas
- **`hiddenLayers`** — excluido deliberadamente del undo/redo

### Acciones del reducer: semántica crítica

| Acción | Semántica |
|---|---|
| `ADD_LAYER` | Crea capa nueva **encima de la activa** con desplazamiento de índices. **No navega.** |
| `NEXT_LAYER` | Navega a la capa siguiente; solo crea capa nueva si ya estamos en la última. |
| `COMMIT_BRUSH_THICKNESS` | Consolida el grosor de brush al historial de undo (crea snapshot). |
| `SET_BRUSH_THICKNESS_PREVIEW` | Preview temporal durante drag del slider — no genera snapshot de undo. |
| `SET_BRUSH_THICKNESS` | Aplica valor final del slider — complementa COMMIT en el ciclo onChange/onPointerUp. |

---

## Constantes clave

```typescript
APP_VERSION         = "3.0.1"    // en src/constants/version.ts — bump en cualquier cambio visible
BASE_DEPTH_STEP     = 150        // Z-units por capa
MAX_LAYERS          = 10
MAX_HISTORY_STEPS   = 50
RENDER_THROTTLE_MS  = ~8         // ~120 fps máx durante dibujo
DRAW_FOCAL_LENGTH   = 5000       // focal length del canvas 2D en drawing mode
FOG_DENSITY_FACTOR  = 0.0004     // densidad base de niebla cinemática
NEAR_CLIP           = 50         // clipping mínimo de capa en proyección 3D
```

---

## Qué NO hacer

- Agregar código nuevo a `StrataCanvas.tsx`
- Refactorizar código que no fue pedido
- Añadir manejo de errores para escenarios imposibles
- Crear helpers/utilidades para operaciones de un solo uso
- Usar `spaces` en archivos que usan `tabs`
- Commitear sin verificar `npm run build` primero
- Modificar eraser, Draw Inside/Behind, clipping, o `hiddenLayers` en undo/redo
- Añadir paletas adicionales (máximo 2-3 total, diseño intencional)
- Operaciones síncronas pesadas en el hilo principal (I/O, exports)

---

## Workflow de cambios

1. Leer los archivos relevantes
2. Documentar hallazgos y proponer plan
3. Esperar confirmación explícita
4. Implementar en pasos pequeños
5. `npm run build` para verificar
6. `git add <archivos específicos>` + `git commit` + `git push`

**Staging:** Siempre archivos específicos por nombre. Nunca `git add -A` o `git add .`.
