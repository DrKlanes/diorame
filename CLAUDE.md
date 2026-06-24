# CLAUDE.md — Diorame Collaboration Guide

Fuente canónica de instrucciones para sesiones de Claude Code.
Reemplaza: `src/guidelines/Guidelines.md`, `memory/MEMORY.md` (ambos deprecados).
Para documentación de producto y UX, ver `src/REFERENCE.md`.

---

## Proyecto

**Diorame** — herramienta de arte web estilo Risógrafo: dibujo 2D por capas + preview cinemático 3D con parallax.

| | |
|---|---|
| **Versión** | 3.10.10 (fuente: `src/constants/version.ts`) |
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
2. **Máximo 400 líneas por archivo** — Si un archivo nuevo se acerca al límite, dividirlo antes de continuar. Excepción documentada: `renderPipeline.ts` como orquestador de frame (aceptado en v3.0.0) — tamaño vivo en REFERENCE.md §12.
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

## Mapa de archivos

El mapa de archivos completo — rutas, rol y conteo aproximado de cada módulo — vive en **`src/REFERENCE.md` §10 (Architecture & File Structure)**. Es la **fuente única**; CLAUDE.md ya no lo duplica para que las dos copias no vuelvan a divergir.

Ahí están documentados: el árbol de `src/components/strata/` (Core + átomos UI V2 por directorio — `topbar/`, `bottombar/`, `colorpalette/`, `layers/`, `drawing/`, `viewport/`, `text/`, `fx/`, `modals/`, `popovers/`), el pipeline de `canvas/`, y las tablas de `types/`, `utils/`, `constants/` y `hooks/`.

> **Redirect operativo — render pipeline:** el patrón "caller orquesta, módulos puros", los tipos centrales de `RenderContext` (incluidos `PerFrameComputed` y `TransformRefState`), los overrides (`renderZsOverride`, `skipLiveStroke`, `skipCinematicOverlays`), los 5 refs frame-persistent y la secuencia de fases de `renderFrame` están documentados en **REFERENCE.md §10 ("Render Pipeline Architecture")**. Cualquier sesión que toque el render debe leerlo **ahí** antes de empezar — no está duplicado en CLAUDE.md a propósito.

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
| `DiModal` | Compound component para modales: `DiModal.Header`, `.Body`, `.Footer`, `.PrimaryAction`, etc. Variants: dialog/alert/banner. |

**Tailwind CSS 4 JIT:** Los class strings deben ser strings estáticos literales — nunca template literals. El scanner JIT no evalúa expresiones.

---

## Sistema de color (`src/constants/palette.ts`)

- `PALETTE_PRIMARY` / `PALETTE_ALTERNATIVE`: 24 colores cada una, **fijas e inmutables** (filosofía Riso)
- `FIXED_PALETTE` / `ALTERNATIVE_PALETTE` en `StrataContext.tsx` se derivan con `.map(c => c.hex)` — retrocompatibilidad total
- `DARK_COLORS`: Set derivado de `isDark: true` en ambas paletas — usado en `SwatchGrid.tsx`/`ColorPalette.tsx` para el ring de contraste en swatches seleccionados
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
APP_VERSION         = ver src/constants/version.ts  // fuente única — bump en cualquier cambio visible
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
5. **Sincronizar REFERENCE.md §10** — si el commit añade, elimina o renombra un archivo `.ts`/`.tsx`, o cambia sustancialmente lo que hace, actualizar su fila en REFERENCE.md §10 **en el mismo commit**. Conteos de línea siempre como `~NNN` aproximado, nunca exacto.
6. `npm run build` para verificar
7. `git add <archivos específicos>` + `git commit` + `git push`

**Staging:** Siempre archivos específicos por nombre. Nunca `git add -A` o `git add .`.

**Cierre del commit:** el resumen de cierre debe declarar explícitamente el estado de sync de §10 — p. ej. `REFERENCE.md §10 sync: updated (añadido X)` o `N/A (sin cambios de archivos .ts/.tsx)`. Sin esa declaración, el commit no está cerrado.
