# CLAUDE.md — Diorame Collaboration Guide

Fuente canónica de instrucciones para sesiones de Claude Code.
Reemplaza: `src/guidelines/Guidelines.md`, `memory/MEMORY.md` (ambos deprecados).
Para documentación de producto y UX, ver `src/REFERENCE.md`.

---

## Proyecto

**Diorame** — herramienta de arte web estilo Risógrafo: dibujo 2D por capas + preview cinemático 3D con parallax.

| | |
|---|---|
| **Versión** | ver `src/constants/version.ts` (fuente única — no se duplica aquí) |
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

1. **StrataCanvas.tsx: shell fino con núcleo protegido** — Ya NO está congelado. Disciplina normal en los handlers; GO explícito solo para el núcleo. Ver «Tocar StrataCanvas.tsx».
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
- Descargas de archivo: siempre vía `downloadBlob()` (`src/utils/downloadBlob.ts`) — blob URL + anchor insertado en el DOM + revoke diferido. Nunca `toDataURL` + `<a>.click()` desacoplado ni `revokeObjectURL` síncrono: iPadOS WebKit los descarta en silencio con toast de falso éxito (v3.11.1)
- Imágenes raster: importar con `figma:asset/...` (sin prefijo de ruta)
- SVGs: van en `/imports`, usar rutas relativas
- Arrays, paletas y matrices de datos readonly: preferir tipos `readonly` (`as const` o `Readonly<>`)
- **Altura de los paneles laterales (columna derecha): `rightPanelInsets()` de `src/utils/panelLayout.ts` es la fuente única** (banda libre entre el TopBar y la barra inferior, safe-area incluido; `useIsCameraBarCompact` da el alto de la CameraBar). Nunca `maxHeight: calc(var(--app-h) − N)` ni `vh` fijos: en 1180×820 el FXPanel con `vh − 80` pisaba Exportar y la CameraBar (v3.20.3)
- **`isDirty` y persistencia (v3.20.5–3.20.7):** toda acción del USUARIO que cambie un campo que se guarda (`.dior` y autoguardado) marca `isDirty`; el campo nuevo se añade a `useSaveLoad` Y a `useAutoSave`. **Nunca la animación**: el tick de CINEMA escribe `cameraRef`, no despacha; una acción despachada desde el RAF dejaría el autoguardado disparándose sin parar. Los despachos de inicialización automática (`INIT_CINEMA_VIEW`) no ensucian. Las escrituras programadas del autoguardado no corren durante un gesto (pointer/touch/rueda): el clon estructurado de la escena es síncrono (35–50 ms en escritorio); no añadir trabajo síncrono pesado en el camino de la interacción
- **Al cargar un proyecto, los valores guardados mandan y los defaults solo rellenan huecos, campo a campo** (v3.20.10). Es el patrón de toda inicialización futura (vistas, cámara, ajustes): nunca «todo o nada», nunca pisar un valor que el fichero trae. Ejemplo: `cinemaViewSet` (un booleano por campo, puesto por `LOAD_PROJECT`, borrado por `CLEAR_CANVAS`) + `INIT_CINEMA_VIEW`, que rellena solo los campos que faltan. Antes (3.20.9 y anterior) un proyecto abierto perdía su cámara al entrar en CINEMA, y la escena de ejemplo perdía su preset *yoyo*. Un fichero antiguo con campos de menos recibe el default solo donde falta
- **Export HQ (`renderScale` = S): todo valor en píxeles de dispositivo del pipeline se multiplica por S** (radios de blur, offsets, amplitudes, celdas de textura: `createNoise(..., cell)`). El render a 2× debe ser la misma impresión con más resolución, no una más fina. Con S = 1 el resultado queda byte-idéntico: demostrarlo con `Math.random` sembrado y un hash de los píxeles (misma página, mismo procedimiento, código anterior vs nuevo)

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

### FX: criterio de ingeniería gráfica (filtro obligatorio antes de construir)

Diorame es una app de dibujo, y el **panel de FX** es donde rompe deliberadamente su simplicidad de herramientas para marcar la diferencia. Un efecto que no alcanza calidad gráfica no es un fallo menor: es el punto donde la app deja de justificar su complejidad.

Todo FX —propio o propuesto— pasa por estos filtros **antes de escribir código**, y el veredicto se declara en la propuesta:

1. **Banda de frecuencia del fenómeno.** Grano, semitono, fibra de papel, dithering viven en **alta frecuencia** (escala de píxel/celda). Bloom, niebla y DoF en media-baja. Distorsión de lente y parallax son geométricos globales. Implementar un fenómeno de alta frecuencia con una transformación geométrica **fracasa aunque la ejecución sea impecable** — precedente documentado: el desregistro de tintas (v3.13.0→3.13.3, retirado).
2. **Física del modo de mezcla.** Tinta sobre papel es **sustractiva** (`multiply`); la luz es aditiva (`screen`/`lighter`). Recordar que la transferencia al canvas principal ya es `multiply` en modo claro: un efecto que aclara dentro del offscreen contradice el medio.
3. **Mecanismo real, no apariencia.** Modelar cómo funciona el proceso físico, no cómo se ve su resultado. Suele salir más simple.
4. **Coste en GPU móvil como entrada de diseño, no epílogo.** El iPad es TBDR: duele el **ancho de banda de las pasadas a pantalla completa**, no la aritmética. Un FX per-capa multiplica pasadas por capas visibles (hasta 10). Precedente vivo: glow y DoF funcionan en iPad desde 3.12.0 pero atascan un iPad Pro en escenas complejas (quirk aceptado). Si un efecto exige una pasada full-screen por capa, **decirlo al proponerlo**.
5. **La paleta base es Canvas 2D.** Composite ops, drawImage con transformaciones, patterns, gradientes y getImageData (caro). **Excepción única: Super Riso** (público desde v3.18.0; tres técnicas desde v3.20.0: Riso, Fotocopia y Stencil), un post-proceso WebGL2 aislado en `canvas/superRiso/` con su propio canvas offscreen, cargado bajo demanda. Entra y sale por `offCtx` en la fase 3 (ranura de `applyRisoV2`); si no hay WebGL2 se avisa al activarlo, y si pierde el contexto o falla se salta sin romper el frame. Ningún otro FX abre WebGL sin otra decisión explícita de Moisés. **Antes de portar o tocar un shader o una pasada de Super Riso, lee REFERENCE.md §14, «GPU and integration traps» y «provenance: the Lab»**: el Super Riso Lab (`C:\Users\Usuario\Desktop\diorame-riso-lab`) es la fuente canónica; se valida en el Lab → diff de shaders → port 1:1 → comparación con las MISMAS entradas. Producto y uso: `docs/super-riso.md`; deuda y decisiones abiertas: `docs/ux-debt.md`.

**Secuencia:** llegar pronto a la validación visual con lo mínimo que demuestre el efecto; la calibración fina solo después de que el efecto se confirme viable. Verificar técnicamente prueba que el código hace lo que dice, **no que el efecto merezca existir** — esa segunda pregunta la responde el ojo.

**Regla dura — quien juzga un FX es el usuario, en `localhost:3000`.** El flujo es: construir lo mínimo que demuestre el efecto → **pedirle que lo revise en local** → su veredicto decide. Ni la estadística ni el ojo de Claude sustituyen ese paso:

- **Métricas: nunca suficientes.** σ de luminancia, % de tinta conservada o coste por frame no distinguen una textura orgánica de ruido a bloques. Precedente: v3.14.0 llegó a producción con todas las métricas en verde y se revirtió entera.
- **Renderizar y mirar: solo caza lo grosero.** Volcar un frame a PNG y abrirlo sirve para detectar artefactos rotos antes de gastarle tiempo — y siempre sobre **contenido real** (botón "Cargar escena de ejemplo"), nunca sobre un rectángulo plano. Pero pasar ese filtro no valida nada.
- **Listón para pedirle revisión:** solo si el efecto está **realmente a nivel top**. Llevarle algo básico quema su tiempo y su confianza.

### Tocar StrataCanvas.tsx

**Estado real: shell fino, no monolito congelado.** La regla anterior ("congelado, solo se extrae, nunca se añaden líneas") describía el archivo de ANTES del refactor v3.0.0, que sacó el pipeline de render a `canvas/`. Mantenerla como absoluto costaba una interrupción por cambio: paradas correctas ante líneas que sí había que añadir, resueltas con un GO manual cada vez. Lo que sigue es la regla vigente.

**Zona normal — disciplina de siempre, sin permiso especial.** Handlers de evento, refs de estado local, JSX de overlays, imports. Aplican las reglas generales del proyecto: leer antes de tocar, cambio mínimo, verificar. Precedentes: la deselección del Move (v3.17.6-3.17.8), el dead-zone (v3.17.4), los cursores contextuales (v3.17.0).

**Núcleo — requiere GO explícito de Moisés antes de escribir código:**

- El bucle RAF y su ciclo de vida
- `buildRenderContext` y la forma de `RenderContext`
- La sincronización refs↔render (qué ref lee cada fase, y cuándo)
- El timing del live stroke

Para el núcleo: modelo Opus, análisis de impacto por escrito antes de tocar, y validación visual de Moisés después. Si dudas de si tu cambio entra en el núcleo, asume que sí y pregunta.

**Independiente de la zona:** si un cambio reordena, envuelve o altera el timing de un pointer handler, se para y se decide aparte — aunque el handler esté en la zona normal. Reescribir la *decisión* que toma un handler (v3.17.8) no es lo mismo que mover *cuándo* se ejecuta.

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
| `DiChip` | Chip seleccionable con muestra de color opcional y tooltip (estilos y papeles de Super Riso). (Añadido en 3.18.0) |
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
- **Gancho de Super Riso en `renderFrame`** — la llamada a `beginSuperRisoFrame()` ANTES de la fase 1 (cuando no hay 2D del frame pendiente), su contrato de un frame de retraso y la ranura `applyRisoV2` de la fase 3. Mover, envolver o reordenar cualquiera de las dos rompe la canalización (pipe 1) y reintroduce la espera síncrona de WebKit. Es núcleo: GO explícito
- **`RenderContext.exportFrame`** — `{ index, count, fps }` de los renders de GIF / PNG-secuencia: de él salen la semilla de la reimpresión y la vida de la instancia de exportación de Super Riso (y el `wiggleFrame` de las exportaciones). No quitarlo ni cambiar su forma sin GO
- **`applySuperRiso.ts` está a 398 de 400 líneas.** Cualquier adición exige partirlo antes (regla dorada 2)
- **La puerta de FX de `renderFrame` (`fxEnabled = isCinematic && fxMasterEnabled`) y el fondo del export PNG de DRAW** — llevar los FX a DRAW es un proyecto en pausa con decisiones tomadas y riesgos medidos: **leer `docs/fx-in-draw.md` antes de tocar `FXPanel`, esa puerta, `exportHandlers.ts` (`renderDrawSnapshot`) o `quantizePixelArtCamera`**. Es núcleo: GO explícito
- **Undo híbrido (contrato v3.11.3)** — Los selectores de tipo de trazo, grosor y paleta muestran PROPIEDADES del documento (estilo de la capa / set de tintas), no preferencias de herramienta. Regla doble: (a) si cambiarlos **modificó shapes** (restyle/remapeo), es operación de contenido — crea paso de undo con snapshot del par post-cambio, y el selector VIAJA con undo/redo (canvas y selector nunca se desincronizan); (b) si **no modificó nada** (capa/canvas vacíos), es selección pura — sin paso de undo, y hace last-writer-wins sobre el snapshot presente (`patchCurrentSnapshot`) para que ningún undo posterior la resucite. `hiddenLayers` y `locked3DLayers` son estado de vista puro: jamás entran en `HistorySnapshot`. `createSnapshot` materializa el brush efectivo de la capa activa si el mapa no tiene entrada (sin esto, el undo cae al valor vivo y el selector no viajaría). No revertir a los modelos 3.7.3 (selector siempre viaja → deshacía selecciones puras) ni 3.11.2 (selector nunca viaja → selector mentiroso y mezcla de paletas) — ambos fallaron en producción.

### Acciones del reducer: semántica crítica

| Acción | Semántica |
|---|---|
| `ADD_LAYER` | Crea capa nueva **encima de la activa** con desplazamiento de índices. **No navega.** |
| `NEXT_LAYER` | Navega a la capa siguiente; solo crea capa nueva si ya estamos en la última. |
| `COMMIT_BRUSH_THICKNESS` | Consolida el grosor de brush al historial **solo si la capa tenía trazos regenerables** (si no: cambio de herramienta puro, sin snapshot — v3.11.2). |
| `SET_BRUSH_THICKNESS_PREVIEW` | Preview temporal durante drag del slider — no genera snapshot de undo. |
| `SET_BRUSH_THICKNESS` | Aplica valor final del slider — complementa COMMIT en el ciclo onChange/onPointerUp. |
| `SET_PALETTE_GRADIENT_ANGLE` / `INTENSITY` | Preview del drag: mutan `layerGradParams` en vivo, fuera del historial, y marcan `gradParamsPendingCommit`. |
| `SET_PALETTE_GRADIENT_TYPE` | Siempre `patchCurrentSnapshot`: solo llega en cascada tras `SET_PALETTE_MODE` (un tap = un paso), completando su par post-cambio. |
| `COMMIT_PALETTE_GRADIENT` | Commit-on-release del drag (v3.13.1). Sin flag pendiente: no-op. Con shapes afectadas: un único paso de undo para todo el drag. Sin shapes: `patchCurrentSnapshot` (last-writer-wins). |

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

- Tocar el núcleo de `StrataCanvas.tsx` (RAF, `buildRenderContext`, sincronización refs↔render, timing del live stroke) sin GO explícito — ver «Tocar StrataCanvas.tsx»
- Refactorizar código que no fue pedido
- Añadir manejo de errores para escenarios imposibles
- Crear helpers/utilidades para operaciones de un solo uso
- Usar `spaces` en archivos que usan `tabs`
- Commitear sin verificar `npm run build` primero
- Modificar eraser, Draw Inside/Behind, clipping, o `hiddenLayers` en undo/redo
- Añadir paletas adicionales (máximo 2-3 total, diseño intencional)
- Operaciones síncronas pesadas en el hilo principal (I/O, exports)

---

## Verificación

**Export SVG:** antes y después de tocar `exportAsSVG`, `svgExport.ts` o `svgGeometry.ts`, pasar la tabla de `tools/svg-diff` (`npm run dev` → `localhost:3000/tools/svg-diff/`; para escenas reales, cargar su `.dior`). Invariantes de `svgGeometry.ts` / `svgText.ts` en REFERENCE.md §10 — leerlos antes de "optimizar". Si se toca texto (render o export): la página también corre la **auditoría glifo a glifo** (columna «contorno MALO» debe ser 0), y cualquier cambio en `utils/textLayout.ts` o `renderTextShape.ts` exige demostrar 0 px de cambio en pantalla (huellas SHA-256 del render con `Math.random` sembrado: sección 5 de `tools/text-check`).

**Texto — caja del gizmo, picking de CINEMA, deformación:** antes y después de tocar `transformUtils.ts` (`getLayerBoundingBox`), `pickLayerAtPoint.ts`, `utils/textMetrics.ts`, `utils/textTransform.ts`, `renderTextShape.ts`, la vista previa del Move en `renderLayerBody.ts` o `TRANSFORM_LAYER`/`FLIP_LAYER`/`LOAD_PROJECT` para texto, pasar `tools/text-check` (`localhost:3000/tools/text-check/`, ~1 min). Mide contra la tinta que PINTA el render real, nunca contra la matemática que se prueba; usa el reducer real (`appReducer`) para estirar y voltear. Cada sección tiene una autocomprobación que debe fallar a propósito. Las huellas del `.dior` antiguo se comparan contra una referencia fijada en ESE navegador («Fijar referencia» antes de tocar el render). Uso y criterios: `tools/text-check/README.md`.

Lecciones de método (serie v3.20.2–3.20.8, medir sin molestar):
- **Las pruebas en el navegador no pueden disparar descargas reales** (export PNG, guardar `.dior`): abren diálogos de guardado al usuario. Parchear `HTMLAnchorElement.prototype.click` para los `<a download>` y capturar el blob con `URL.createObjectURL`. Nunca aceptar un diálogo de descarga en nombre del usuario.
- Para el HQ real hay que importar `exportHandlers.ts` con la URL exacta de `performance.getEntriesByType('resource')`; una ruta desnuda carga otra instancia y `setNextPNGQuality` no llega a la de la app. Una textura se mide con la diferencia «con efecto − sin efecto» del mismo render y su autocorrelación, y el HQ reducido ×2 debe parecerse a la vista. Método completo y trampas: `docs/fx-in-draw.md` §11.

Lecciones de método (serie v3.17.43–48):
- Un SVG que "se ve perfecto" no demuestra nada: hacen falta **dos fuentes distintas** (render de Canvas vs SVG rasterizado) **y la prueba en la herramienta de destino** (Illustrator: Ctrl+Y y Buscatrazos ignoran máscaras).
- Las métricas globales diluyen fallos locales (un remate perdido entre 2 000 formas) → auditoría pieza a pieza.
- Las métricas en escenas reducidas dan falsos positivos subpíxel → confirmar ampliando (×4–8).
- Antes de fiarse de un instrumento, **reintroducir el fallo y ver que lo caza**.

> Trampas de GPU y de integración de Fotocopia y Stencil (uniforms sin fijar, derivadas y `break` en bucles, `uniform1iv`, mínimo de texels, motas en rejilla, papel de origen): REFERENCE.md §14, «Super Riso · GPU and integration traps».

### Lecciones de medición (Super Riso, v3.17.69–3.18.0)

Verificadas midiendo en escritorio (RTX 5070 Ti, Chrome) y en un iPad (Safari 27, Apple GPU). Antes de medir un efecto WebGL o de tocar su coste, léelas.

- **Leer píxeles WebGL, solo DENTRO del render.** Un `readPixels` desde un `rAF` o al inicio del render siguiente devuelve de vez en cuando un frame distinto (9 475 px, máx. 62) con entrada y argumentos idénticos. Dentro del render (parcheando `eng.render`) o sobre `offCtx` 2D tras Super Riso: 0 desviaciones. Ese artefacto fue el falso «el primer frame tras cambiar tintas difiere» (C2a): no existía. Medir siempre dentro del render o sobre `offCtx`.
- **Temporizador de GPU frente a readback.** En Chrome el readback 1×1 NO mide el coste del motor: espera también al 2D pendiente del frame (11 ms en 1080p para 2,9 ms de GPU de motor), que el frame vivo nunca espera. Donde hay `EXT_disjoint_timer_query_webgl2` (escritorio) el nivel se decide con el temporizador; el readback solo vale donde no lo hay (Safari/iPad), que es justo donde WebKit sí espera de verdad. Y en esa medida un readback sincroniza: infla el total.
- **La espera síncrona 2D→WebGL de Safari.** En el iPad el coste de Super Riso eran ~25 ms CPU casi fijos, daba igual la resolución de simulación (en Chrome, 0,1 ms): `texImage2D` desde un canvas 2D espera a que la GPU termine el dibujo 2D pendiente del frame. No es ancho de banda, y `createImageBitmap` no la evita (la espera se mueve al bitmap). Solución: canalizar. Subir el aplanado del frame anterior AL INICIO del siguiente (`beginSuperRisoFrame`, antes de la fase 1), cuando no hay 2D pendiente; un frame de latencia, invisible.
- **Con la espera quitada, lo que queda es el coste real del motor en la GPU del iPad:** se escala con la resolución de simulación, no con el puente. Por eso el nivel *preview* baja resolución y simplifica pasadas SOLO en vivo; las exportaciones, siempre completas.
- **Moisés solo puede probar en el iPad tras el push.** Lo que juzga o mide en iPad es lo que ya está en producción: cada ronda exige subir (con su autorización), esperar el deploy y confirmar la versión servida. Planificar las rondas de medición en iPad como tales: un lote de variantes tras `?srdebug=1`, un solo push.
- **Caché del service worker en el iPad.** La app es PWA con `registerType: 'prompt'`: un SW nuevo espera a que el usuario acepte el toast «Recargar»; hasta entonces el iPad sirve la versión cacheada, y una medición hecha ahí es de la versión vieja. Para probar un push recién desplegado: confirmar la versión en pantalla, aceptar el toast, o abrir una **pestaña privada** (no hereda el SW ni la caché instalada). Una medición en iPad sin versión confirmada no vale. [VERIFICADO: la pestaña privada de Safari en el iPad es la forma de saltarse la caché del SW.]
- **Las exportaciones de Diorame no son deterministas por el grano** (`applyGrain`, `Math.random` por frame, previo a Super Riso): para probar determinismo de Super Riso, apagar el grano.
- **Instrumento antes que conclusión.** Los controles de medición viven solo tras `?srdebug=1`. El panel del navegador integrado oculto o estrecho congela el `rAF` o muestra la pantalla de «dispositivo pequeño»: mostrar el panel y fijar viewport 1366×1024 o 1920×1080 antes de medir. Un `import()` de un módulo de la app desde la consola puede cargar OTRA instancia (el HMR añade `?t=`): usar la URL exacta de `performance.getEntriesByType('resource')`.
- **Comparar imágenes con el grano vivo:** mirar la distancia media de color en una rejilla gruesa (16×12) contra el suelo de ruido de dos lecturas consecutivas, no un hash del frame (siempre cambia).

---

## Workflow de cambios

1. Leer los archivos relevantes
2. Documentar hallazgos y proponer plan
3. Esperar confirmación explícita
4. Implementar en pasos pequeños
5. **Sincronizar REFERENCE.md §10** — si el commit añade, elimina o renombra un archivo `.ts`/`.tsx`, o cambia sustancialmente lo que hace, actualizar su fila en REFERENCE.md §10 **en el mismo commit**. Conteos de línea siempre como `~NNN` aproximado, nunca exacto.
6. `npm run build` para verificar
7. `git add <archivos específicos>` + `git commit` + tag anotado (`git tag -a vX.Y.Z -m "..."`)

**Staging:** Siempre archivos específicos por nombre. Nunca `git add -A` o `git add .`.

**Push:** NO se hace push salvo que Moisés lo pida en esa misma sesión. Un permiso de push no se arrastra a sesiones ni a commits posteriores.

**Tags: siempre ANOTADOS** (`git tag -a vX.Y.Z -m "..."`), nunca ligeros. Moisés sube con `git push --follow-tags`, que solo lleva los tags anotados: un tag ligero se queda en local sin avisar (pasó de v3.15.0 a v3.17.58 — 64 tags sin subir).

**Cierre del commit:** el resumen de cierre debe declarar explícitamente el estado de sync de §10 — p. ej. `REFERENCE.md §10 sync: updated (añadido X)` o `N/A (sin cambios de archivos .ts/.tsx)`. Sin esa declaración, el commit no está cerrado.
