# CLAUDE.md — Diorame Collaboration Guide

Fuente canónica de instrucciones para sesiones de Claude Code.
Reemplaza: `src/guidelines/Guidelines.md`, `memory/MEMORY.md` (ambos deprecados).
Para documentación de producto y UX, ver `src/REFERENCE.md`.

---

## Proyecto

**Diorame** — herramienta de arte web estilo Risógrafo: dibujo 2D por capas + preview cinemático 3D con parallax.

| | |
|---|---|
| **Versión** | 1.15.2 |
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
2. **Máximo 400 líneas por archivo** — Si un archivo nuevo se acerca al límite, dividirlo antes de continuar.
3. **Tabs para indentación** — El codebase entero usa tabs. Nunca mezclar spaces.
4. **No abstracciones especulativas** — Tres líneas similares son mejores que una abstracción prematura.

### Dónde poner código nuevo

| Tipo | Destino |
|---|---|
| Constantes / datos puros | `src/constants/<name>.ts` |
| Utilidades / helpers | `src/utils/<name>.ts` |
| Lógica de canvas modular | `src/components/strata/canvas/<Name>.ts` |
| Hooks React | `src/components/strata/hooks/use<Name>.ts` |
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

### Editar archivos con tabs (StrataCanvas, ControlsDrawing, ControlsCinematic, etc.)

El tool `Edit` falla con indentación de tabs en bloques multilínea. Usar siempre Python:

```python
# Patrón estándar para reemplazos seguros
content = open('ruta/archivo.tsx', encoding='utf-8').read()
old = '...'  # cadena exacta incluyendo tabs
new = '...'
assert old in content, 'CADENA NO ENCONTRADA — verificar tabs'
content = content.replace(old, new, 1)
open('ruta/archivo.tsx', 'w', encoding='utf-8').write(content)
```

Para inspeccionar indentación exacta antes de escribir strings de reemplazo:
```python
lines = open('archivo.tsx', encoding='utf-8').readlines()
print(repr(lines[782]))  # ver tabs exactos
```

---

## Mapa de archivos (estado actual)

### Core — `src/components/strata/`

| Archivo | Líneas | Rol |
|---|---|---|
| `StrataCanvas.tsx` | 2143 | Render loop, event handlers, gestures. **CONGELADO.** |
| `StrataContext.tsx` | 1242 | React Context + useReducer, constantes, re-exports de tipos |
| `Controls.tsx` | 203 | Compositor: mode switch, estado de export, keyboard shortcuts globales |
| `ControlsDrawing.tsx` | 920 | UI modo DRAW: toolbar, paleta, navegación de capas, undo/redo, save/load |
| `ControlsCinematic.tsx` | 768 | UI modo VIEW: tipos de animación, FX Mix popover, sliders de cámara |
| `ControlsExport.tsx` | 80 | Dialog de advertencia de complejidad para export |
| `LayersPanel.tsx` | 381 | Panel de capas: visibilidad, lock 3D, reordenar, duplicar, eliminar |
| `ToolOptionsPanel.tsx` | 199 | Opciones contextuales: modo de línea, grosor, gradiente por capa |
| `WelcomeModal.tsx` | — | Dialog de bienvenida con versión |
| `OnboardingOverlay.tsx` | — | Hints en canvas vacío, auto-dismiss al primer trazo |
| `ExportProgress.tsx` | — | Overlay de progreso durante exports de video |
| `MobileBlockScreen.tsx` | — | Bloqueo para dispositivos móviles (tablet+ requerido) |
| `pixelArtPalettes.ts` | — | Datos readonly para el efecto Pixel Art |

### Canvas pipeline — `src/components/strata/canvas/`

| Archivo | Líneas | Propósito |
|---|---|---|
| `PixelArtProcessor.ts` | 173 | Downscale, quantización de paleta, dithering Bayer |
| `postProcessing.ts` | 258 | 8 efectos: Fog, Glow, DoF, Riso, ChromAb, Vignette, Grain, Grunge |
| `cinematicCamera.ts` | 150 | `computeCinematicTick`: 10 modos de cámara + handheld shake |
| `exportHandlers.ts` | 323 | `exportAsPNG`, `exportAsSVG`, `exportAsMP4` |
| `transformUtils.ts` | 134 | `getLayerBoundingBox`: bounding box pixel-accurate para Move tool |

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
| `renderConstants.ts` | `PARTICLE_COUNT`, `RENDER_THROTTLE_MS`, `DOUBLE_CLICK_DELAY`, frecuencias de handheld |
| `palette.ts` | `PALETTE_PRIMARY`, `PALETTE_ALTERNATIVE` como `PaletteColor[]` con `{hex, name, isDark}`. `GRADIENT_DEFAULTS`. `DARK_COLORS` (Set derivado). **Fuente única de verdad del sistema de color.** |

### Hooks — `src/components/strata/hooks/`

| Archivo | Propósito |
|---|---|
| `useCanvasRecovery.ts` | Monitorea visibilidad/foco, resetea estado de pointer bloqueado, reenfoca canvas |

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

---

## Constantes clave

```typescript
APP_VERSION         = "1.15.2"   // en StrataContext.tsx — bump en cualquier cambio visible
BASE_DEPTH_STEP     = 150        // Z-units por capa
MAX_LAYERS          = 10
MAX_HISTORY_STEPS   = 50
RENDER_THROTTLE_MS  = ~8         // ~120 fps máx durante dibujo
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
