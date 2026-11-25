# CLAUDE.md — Diorame Collaboration Guide

Fuente canónica de instrucciones para sesiones de Claude Code.
Sustituyó a `src/guidelines/Guidelines.md` y `memory/MEMORY.md`; ninguno de los dos existe ya.
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
| **Tests** | `npm test` (Vitest, ~1,5 s) — reducer y generadores de trazo en Node; ver «Verificación» |

---

## Preferencias de trabajo

- **Responder siempre en español**
- **Análisis exhaustivo antes de modificar cualquier cosa** — leer los archivos relevantes, documentar hallazgos, proponer el plan, esperar confirmación
- **No hacer cambios especulativos** — solo lo que fue explícitamente pedido
- **No añadir comentarios, docstrings ni type annotations** a código que no se modificó

---

## Reglas de arquitectura

### Reglas doradas

1. **StrataCanvas.tsx: ya no está congelado, con núcleo protegido** — Disciplina normal en los handlers; GO explícito solo para el núcleo. Ver «Tocar StrataCanvas.tsx». ~835 líneas desde v3.26.69 (sprint de handlers v3.26.53–3.26.65, `docs/handlers-sprint-report.md`, y la retirada de H12): los handlers de puntero y táctil viven en `canvas/touchHandlers.ts`, `canvas/pointerDownHandler.ts` y `canvas/pointerMoveUpHandlers.ts` (fábricas sin hooks, llamadas una vez por render desde el componente con `handlerEnv`), y su lógica pura en `canvas/touchGestures.ts`, `canvas/pointerMath.ts`, `canvas/cinemaFraming.ts` y `canvas/moveGizmoInteraction.ts`. Las reglas de «Tocar StrataCanvas.tsx» valen igual para esos módulos: son los mismos handlers. La fase 6 había sacado `canvas/commitStroke.ts`, `useCanvasWheelZoom` y `useSpacePan` (v3.26.47–3.26.50).
2. **Máximo 400 líneas por archivo** — Si un archivo nuevo se acerca al límite, dividirlo antes de continuar. Excepciones documentadas: `renderPipeline.ts` como orquestador de frame (aceptado en v3.0.0; tamaño vivo en REFERENCE.md §12) y los diccionarios `src/i18n/dictionaries/{en,es}.ts` (~810 y ~775 líneas: son datos tipados con `Dictionary`, sin lógica que partir; partirlos solo dispersaría las claves). **Deuda abierta, sin exención:** `StrataCanvas.tsx` (~835: refs, efectos — el de exportación repite cinco veces el mismo snapshot —, `resetGestureState`, núcleo RAF y JSX) y `canvas/postProcessing.ts` (~430).
3. **Tabs para indentación** — El codebase usa tabs (normalizado en v3.26.11). Nunca mezclar spaces. Quedan con espacios, heredados y sin tocar: `types/strataTypes.ts`, `App.tsx`, `main.tsx`, `components/ui/{button,ripple-button,enhanced-tooltip}.tsx`, `components/figma/ImageWithFallback.tsx`, `utils/strokeGenerators.ts` (mixto; sus referencias golden están protegidas) y el GLSL de `canvas/superRiso/shaders*.ts`. En ellos, respetar la indentación que ya tienen; un commit solo de espacios sería un refactor aparte.
4. **No abstracciones especulativas** — Tres líneas similares son mejores que una abstracción prematura.

### Dónde poner código nuevo

| Tipo | Destino |
|---|---|
| Constantes / datos puros | `src/constants/<name>.ts` |
| Utilidades / helpers | `src/utils/<name>.ts` |
| Lógica del reducer (las acciones de un mismo asunto) | `src/state/<name>.ts` — una función por acción; el `switch` vive en `state/appReducer.ts` (desde v3.26.38) y delega con una línea por `case`. `StrataContext.tsx` solo tiene Provider, `useStrata` y re-exports: un módulo sin React importa de `state/` y `constants/`, nunca del contexto (`dior-render.js` no lleva React desde v3.26.39) |
| Lógica de canvas modular | `src/components/strata/canvas/<Name>.ts` |
| Hooks React | `src/hooks/use<Name>.ts` |
| Sub-componentes UI | `src/components/strata/<Name>.tsx` |
| Primitivas de Design System | `src/design-system/Di<Name>.tsx` |
| Tipos compartidos | `src/types/strataTypes.ts` |

### Convenciones generales

- Toasts: usar `sonner@2.0.3`
- Descargas de archivo: siempre vía `downloadBlob()` (`src/utils/downloadBlob.ts`) — blob URL + anchor insertado en el DOM + revoke diferido. Nunca `toDataURL` + `<a>.click()` desacoplado ni `revokeObjectURL` síncrono: iPadOS WebKit los descarta en silencio con toast de falso éxito (v3.11.1)
- Imágenes raster dentro del bundle: `figma:asset/<nombre>.png`, resuelto por un alias explícito en `vite.config.ts` hacia `src/assets/` (hoy `texture-paper`, `texture-grunge` y `logo-symbol`): una imagen nueva necesita su alias. Lo que se sirve tal cual (iconos, vídeos, texturas de Super Riso, ejemplos) va en `public/`.
- No hay SVGs importados: los iconos son datos en `design-system/icons.ts` y se pintan con `Ico`
- Arrays, paletas y matrices de datos readonly: preferir tipos `readonly` (`as const` o `Readonly<>`)
- **Altura de los paneles laterales (columna derecha): `rightPanelInsets()` de `src/utils/panelLayout.ts` es la fuente única** (banda libre entre el TopBar y la barra inferior, safe-area incluido; `useIsCameraBarCompact` da el alto de la CameraBar). Nunca `maxHeight: calc(var(--app-h) − N)` ni `vh` fijos: en 1180×820 el FXPanel con `vh − 80` pisaba Exportar y la CameraBar (v3.20.3)
- **`isDirty` y persistencia (v3.20.5–3.20.7):** toda acción del USUARIO que cambie un campo que se guarda (`.dior` y autoguardado) marca `isDirty`, también cuando es una selección pura sin paso de undo (v3.26.8). Excepción decidida: elegir herramienta (`SET_TOOL`) y navegar entre capas no ensucian — cambian dónde está el usuario, no el dibujo, aunque el archivo lleve la herramienta y el par de grosor de la capa activa. La lista completa de excepciones, con su motivo, es `tests/isDirty.test.ts`: una acción nueva que cambie el `.dior` sin ensuciar lo hace fallar; el campo nuevo se añade en UN sitio, `buildDiorFields` (`utils/diorPayload.ts`: la lista que comparten el `.dior` y el autoguardado desde v3.26.19), y a su lector, `LOAD_PROJECT` (`state/loadProject.ts`). **Nunca la animación**: el tick de CINEMA escribe `cameraRef`, no despacha; una acción despachada desde el RAF dejaría el autoguardado disparándose sin parar. Los despachos de inicialización automática (`INIT_CINEMA_VIEW`) no ensucian. Las escrituras programadas del autoguardado no corren durante un gesto (pointer/touch/rueda): el clon estructurado de la escena es síncrono (35–50 ms en escritorio); no añadir trabajo síncrono pesado en el camino de la interacción
- **Al cargar un proyecto, los valores guardados mandan y los defaults solo rellenan huecos, campo a campo — y los huecos se rellenan EN `LOAD_PROJECT`, nunca con el estado vivo** (v3.20.10–3.20.11). Es el patrón de toda inicialización futura (vistas, cámara, ajustes): nunca «todo o nada», nunca pisar un valor que el fichero trae, y nunca caer a `state.*` para un campo ausente (se filtraría el valor del proyecto anterior: un fichero antiguo guardado antes de tocar nada heredaba la cámara de otro). Los defaults viven en un único sitio (`CINEMA_VIEW_DEFAULTS`, `constants/cinemaView.ts`); lo que un proyecto nuevo aún no ha elegido se escribe como default al guardar (`cinemaViewForSave`), no como marcador del estado inicial. Antes un proyecto abierto perdía su cámara al entrar en CINEMA y la escena de ejemplo su preset *yoyo*
- **Export HQ (`renderScale` = S): todo valor en píxeles de dispositivo del pipeline se multiplica por S** (radios de blur, offsets, amplitudes, celdas de textura: `createNoise(..., cell)`). El render a 2× debe ser la misma impresión con más resolución, no una más fina. Con S = 1 el resultado queda byte-idéntico: demostrarlo con `Math.random` sembrado y un hash de los píxeles (misma página, mismo procedimiento, código anterior vs nuevo)

### Extracción de StrataCanvas (estrategia incremental)

1. Identificar un bloque autocontenido
2. Crear archivo nuevo siguiendo la tabla anterior
3. Importar en StrataCanvas reemplazando el código inline
4. Verificar que compila y el comportamiento es idéntico
5. Dejar un comentario de una línea en el punto de extracción: `// Extracted to <filename>`

### Editar archivos con tabs

El tool `Edit` (str_replace nativo) funciona correctamente con indentación de tabs; en los pocos archivos heredados con espacios (regla dorada 3), copiar la indentación exacta. Usarlo directamente — no se necesita Python para ediciones de código.

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
5. **La paleta base es Canvas 2D.** Composite ops, drawImage con transformaciones, patterns, gradientes y getImageData (caro). **Excepción única: Super Riso** (público desde v3.18.0; tres técnicas desde v3.20.0: Riso, Fotocopia y Stencil), un post-proceso WebGL2 aislado en `canvas/superRiso/` con su propio canvas offscreen, cargado bajo demanda. Entra y sale por `offCtx` en la fase 3 (ranura de `applyRisoV2`); si no hay WebGL2 se avisa al activarlo, y si pierde el contexto o falla se salta sin romper el frame. Ningún otro FX abre WebGL sin otra decisión explícita de Moisés. **Antes de portar o tocar un shader o una pasada de Super Riso, lee REFERENCE.md §14, «GPU and integration traps» y «provenance: the Lab»**: el Super Riso Lab (`C:\Users\Usuario\Desktop\Diorame\lab`) es la fuente canónica; se valida en el Lab → diff de shaders → port 1:1 → comparación con las MISMAS entradas. Producto y uso: `docs/super-riso.md`; deuda y decisiones abiertas: `docs/ux-debt.md`.

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

`tokens.ts` tiene dos capas. La que usa casi toda la UI son los valores crudos: `T` (colores de marca, de modo claro y de modo oscuro; ~50 archivos lo importan), `TYPE`, `SPACE`, `RADIUS`, `SHADOW`, `BLUR`, `Z_INDEX`, y el helper `dk(dark, claro, oscuro)` que elige por tema. `diTokens` es la segunda capa: un objeto `as const` con 35+ claves Tailwind, y hoy solo lo importan `DiBadge`, `DiDivider`, `DiSlider` y `DiToggleSlider`. Los componentes reciben `dark` como prop (o lo leen con `useTheme()`); no hay un `uiTheme` que se pase hacia abajo.

Categorías de `diTokens`: superficies (`bgPanel`, `bgAlt`), bordes (`border`, `borderSubtle`), texto (`textPrimary`, `textMuted`, `textSubtle`), interacción (`hoverAlt`), sliders/toggles, spinners, brand, dialog, layers (`layerBgActive`, `layerBorderActive`), segmentos.

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
| `DiPill` | Contenedor flex con forma de píldora (`dark`, `height`, `padding`, `gap`): la base de las píldoras de las barras |
| `DiVSep` | Separador vertical dentro de una píldora (`tall` = 36 px, si no 18 px) |
| `DiMiniSlider` | Slider compacto con `label` y valor formateado opcionales |
| `DiSegmentControl` | Control segmentado; opciones como primitivo o `{ value, label }` (value estable, label traducible), `small`, tooltip y `disabled` por opción |
| `DiModal` | **No está en `design-system/`: vive en `components/strata/modals/`** (`DiModal.tsx` y sus piezas). Compound component: `DiModal.Header`, `.Body`, `.Footer`, `.PrimaryAction`, etc. Variants: dialog/alert/banner. |

**Tailwind CSS 4 JIT:** Los class strings deben ser strings estáticos literales — nunca template literals. El scanner JIT no evalúa expresiones.

---

## Sistema de color (`src/constants/palette.ts`)

- `PALETTE_PRIMARY` / `PALETTE_ALTERNATIVE`: 24 colores cada una, **fijas e inmutables** (filosofía Riso)
- `FIXED_PALETTE` / `ALTERNATIVE_PALETTE` se derivan con `.map(c => c.hex)` — retrocompatibilidad total. Viven en `constants/palette.ts` desde v3.26.14 (`StrataContext.tsx` las re-exporta)
- `DARK_COLORS`: Set derivado de `isDark: true` en ambas paletas — usado en `SwatchGrid.tsx`/`ColorPalette.tsx` para el ring de contraste en swatches seleccionados
- `GRADIENT_DEFAULTS`: `{ angle: 90, intensity: 0.2, gradType: 'solid' }` — único fallback para `layerGradParams`

---

## Comportamientos protegidos (NO modificar)

- **Eraser tool** — lógica de borrado
- **Draw Inside / Draw Behind** — compositing con alpha
- **Clipping / pipeline de renderizado** — orden y composición de capas
- **Gancho de Super Riso en `renderFrame`** — la llamada a `beginSuperRisoFrame()` ANTES de la fase 1 (cuando no hay 2D del frame pendiente), su contrato de un frame de retraso y la ranura `applyRisoV2` de la fase 3. Mover, envolver o reordenar cualquiera de las dos rompe la canalización (pipe 1) y reintroduce la espera síncrona de WebKit. Es núcleo: GO explícito
- **El `touchstart` nativo del canvas (`{ capture: true, passive: false }` + `preventDefault`, efecto de `StrataCanvas.tsx`)** — bloquea los eventos de ratón de compatibilidad y los gestos nativos de Safari, y `useAutoSave` cuenta con que el canvas cancele `touchstart`. No se quita ni se cambian sus opciones sin ronda de iPad y decisión de Moisés. Su antiguo compañero, el relanzamiento nativo del `pointerdown` del Pencil, era un no-op y se quitó en v3.26.69 (H12, `docs/handlers-sprint-report.md` §6)
- **`RenderContext.exportFrame`** — `{ index, count, fps }` de los renders de GIF / PNG-secuencia: de él salen la semilla de la reimpresión y la vida de la instancia de exportación de Super Riso (y el `wiggleFrame` de las exportaciones). No quitarlo ni cambiar su forma sin GO
- **Suavizado de Ink (`_inkSmoothPass` ×3, peso 0,3, en `strokeGenerators.ts`)** — parte deliberada del estilo de Ink: ni algoritmo ni parámetros cambian sin decisión de Moisés. La curvatura geométrica va en el densificado previo (Catmull-Rom centrípeta, v3.26.4). Cadena completa en REFERENCE.md §4
- **Los bordes visibles de Fotocopia nunca se derivan de máscaras a ¼** (v3.26.83, Lab v23.8). Una máscara a ¼ puede decidir la IDENTIDAD (qué rotulador pinta); el borde sale del original a resolución completa (`FS_XEDGE` + `mkF` en `shadersXerox.ts`, pasadas en `xeroxEngine.ts`). Leer una máscara a ¼ como borde, por mucho que se desenfoque, devuelve la escalera de 4 px del Rotulador (bug recurrente: v3.20.1, v3.22.0, v3.26.83). Guardia: `tools/draw-stress/harness/markeredge.js` → `await __markerEdgeCheck()` debe dar `pass: true` tras tocar cualquier shader o pasada de Fotocopia, y `__superRisoHash` before/after idéntico para lo que no sea Rotulador. Cubre la rejilla ¼ y los halos de papel, NO las almenas del fin de trazo (causa NO definitiva: ver `docs/known-issues/marker-edges.md`). Causa de lo que sí cubre: REFERENCE.md §14 «Marker edges: the real cause and the fix». **La guardia no detecta las almenas. Desde v3.26.100 pasa los 6 casos sin ningún «FALLO CONOCIDO»** (los tres de v3.26.86 quedaron por debajo del umbral al volver el desenfoque del escáner de Fotocopia a los 0,06 mm del Lab); la lista `KNOWN` del arnés sigue ahí: si un caso vuelve a superar su umbral sin pasarse de su valor conocido, sale marcado, y eso sería una regresión que mirar
- **Toda guardia visual de Super Riso se mide sobre el canvas visible, por la UI** (v3.26.85): flujo con clics reales, captura del lienzo que ve el usuario, y la guardia tiene que FALLAR antes del arreglo sobre esa captura. Llamar al motor aparte, o comparar con una referencia supermuestreada, no vale como prueba: la guardia de v3.26.83 pasó así mientras las almenas del Rotulador seguían en pantalla (el defecto va en mm de hoja y se cancelaba contra su referencia). **Rotulador:** la «causa definitiva» de v3.26.83 era incompleta; las almenas venían del fin de trazo de `strokes()` (extremo frente a flanco), **mitigado, no eliminado**, en v3.26.86 / Lab v23.9; **PROBLEMA CONOCIDO aparcado por Moisés el 24 nov 2026, sin guardia que lo respalde**: no reintentar sin la regla del §6 de `docs/known-issues/marker-edges.md` (guardia que falle ≥ 3× sobre el canvas visible antes de tocar el shader)
- **`applySuperRiso.ts` está a ~390 de 400 líneas** (v3.20.14). Cualquier adición que lo acerque al límite exige partirlo antes (regla dorada 2)
- **La puerta de FX de `renderFrame` (`fxEnabled = isCinematic && fxMasterEnabled`) y el fondo del export PNG de DRAW** — llevar los FX a DRAW es un proyecto en pausa con decisiones tomadas y riesgos medidos: **leer `docs/fx-in-draw.md` antes de tocar `FXPanel`, esa puerta, `drawSnapshot.ts` (`renderDrawSnapshot`) o `quantizePixelArtCamera`**. Es núcleo: GO explícito
- **`dior-render.js` es un contrato público con el Super Riso Lab** (v3.22.0; `src/dior-render.ts` → `canvas/diorRender.ts`, REFERENCE.md §8): `parseDior`, `frameOf`, `renderDior` con la forma exacta del contrato. El Lab lo importa en producción desde otro dominio: cambiar firmas, el marco (caja de tinta de las capas visibles + 4 % del lado largo, mínimo 32 px) o el nombre del archivo rompe el Lab sin aviso. Su grafo no puede importar nada que toque la página al cargarse (`exportHandlers.ts` trae `sonner`, que inyecta CSS: por eso el render vive en `drawSnapshot.ts`). **Desde v3.26.91 es UN archivo autocontenido** (`vite.dior-render.config.ts`, segundo build de `npm run build`): nunca debe importar un chunk con hash, porque cada deploy los renombra y borra y una copia cacheada (GitHub Pages `max-age=600`) importaría archivos que ya no existen; Super Riso va sustituido por un stub en ese build. `tools/build-guards/check-build.mjs` rompe el build si deja de ser así (imports, exports ≠ los tres del contrato, motor de Super Riso dentro, asset que falta)
- **Undo híbrido (contrato v3.11.3)** — Los selectores de tipo de trazo, grosor y paleta muestran PROPIEDADES del documento (estilo de la capa / set de tintas), no preferencias de herramienta. Regla doble: (a) si cambiarlos **modificó shapes** (restyle/remapeo), es operación de contenido — crea paso de undo con snapshot del par post-cambio, y el selector VIAJA con undo/redo (canvas y selector nunca se desincronizan); (b) si **no modificó nada** (capa/canvas vacíos), es selección pura — sin paso de undo, y hace last-writer-wins sobre el snapshot presente (`patchCurrentSnapshot`) para que ningún undo posterior la resucite. `hiddenLayers` y `locked3DLayers` son estado de vista puro: jamás entran en `HistorySnapshot`. `createSnapshot` materializa el brush efectivo de la capa activa si el mapa no tiene entrada (sin esto, el undo cae al valor vivo y el selector no viajaría). No revertir a los modelos 3.7.3 (selector siempre viaja → deshacía selecciones puras) ni 3.11.2 (selector nunca viaja → selector mentiroso y mezcla de paletas) — ambos fallaron en producción. **Grosor/estilo por capa (v3.26.3):** los trazos regenerables de una capa son la verdad de su par; UNDO/REDO solo mueve el par de una capa si el paso cruzado re-estilizó SUS trazos (`restoreLayerBrushSettings`, `utils/layerBrush.ts`), y ninguna navegación, carga o fusión cae al `currentBrushThickness` global para una capa con trazos (`resolveLayerBrush`) — esa caída filtraba el grosor de una capa a otra. El slider confirma con el evento nativo `change` (fin de gesto en ratón, táctil y teclado): con solo `pointerup` el teclado no confirmaba y el restyle se colaba en el snapshot del trazo siguiente.

### Acciones del reducer: semántica crítica

| Acción | Semántica |
|---|---|
| `ADD_LAYER` | Crea capa nueva **encima de la activa** con desplazamiento de índices, y **pasa a ella** (`currentLayerIndex` = la creada; la capa nueva, vacía, conserva el par de grosor/modo del slider). Un paso de undo. Fijado en `tests/layers.characterization.test.ts`. |
| `NEXT_LAYER` | Navega a la capa siguiente; solo crea capa nueva si ya estamos en la última. |
| `COMMIT_BRUSH_THICKNESS` | Consolida el grosor de brush al historial **solo si la capa tenía trazos regenerables** (si no: cambio de herramienta puro, sin snapshot — v3.11.2). |
| `SET_BRUSH_THICKNESS_PREVIEW` | Preview temporal durante drag del slider — no genera snapshot de undo. |
| `SET_BRUSH_THICKNESS` | Aplica valor final del slider — complementa COMMIT en el ciclo onChange/onPointerUp. |
| `SCALE_LAYER_THICKNESS_PREVIEW` | Escalado proporcional de una capa «Mixto» (v3.26.25): multiplica por k (acotado, `layerScaleBounds`) el grosor de cada trazo AL INICIO del gesto, y el par de la capa por el mismo k. Lo cierra `COMMIT_BRUSH_THICKNESS`: un paso, ninguno si k acaba en 1. `SET_BRUSH_SCALE_PROPORTIONAL` (el candado) es preferencia de UI: ni `.dior`, ni historial, ni `isDirty`. |
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
DRAW_FOCAL_LENGTH   = 10000      // focal length del canvas 2D en drawing mode (~1,5 % por capa; 5000 hasta v3.25.28)
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
- Modificar `tests/` en un commit de refactor, o regenerar una referencia golden para poner un test en verde — ver «Verificación · Tests»

---

## Verificación

**REGLA — dónde se prueba en el navegador (Moisés, 25/11/2026):** las pruebas de navegador se hacen SIEMPRE en un perfil desechable o en el servidor de desarrollo local; nunca en el navegador real de Moisés ni contra su diorame.dumaker.com con su sesión. El autoguardado de Diorame guarda un solo slot, así que una prueba puede sobrescribir su trabajo, y el Lab recuerda el último estilo. Si una verificación en producción es imprescindible: perfil limpio.

**Tests (`tests/`, Vitest, v3.26.7):** `npm test` antes de cerrar cualquier cambio en el reducer, en las utilidades de estado (`utils/layerBrush.ts`, `mergeLayers.ts`, `diorPayload.ts`…) o en `strokeGenerators.ts`. Desde v3.26.9 también corren en el CI (`.github/workflows/deploy.yml`) como paso bloqueante, tras el typecheck y antes del build: un test en rojo no se despliega. Ejecutan el reducer y los generadores REALES en Node; no cubren píxeles, WebGL ni gestos (eso siguen siendo los arneses de `tools/`). Qué cubre cada archivo: REFERENCE.md §10 «Tests».

- **Handlers del lienzo (v3.26.53):** `tests/handlers.characterization.test.ts` ejecuta el texto de los handlers del árbol de trabajo (`tools/handlers-golden/harness.mjs`) contra 139 gestos guionizados (125 + los 12 `flat/*` de la vista plana, v3.26.72, + 2 `flat/*` en v3.26.81), con la referencia congelada con el código de v3.26.52. Tras tocar un handler o su lógica: `npm test` y la matriz de escritorio (`tools/handlers-golden/desktop-matrix.js`, `await __handlersMatrix()`, viewport fijo y `rAF` vivo). Un escenario nuevo se añade en un commit de test aparte y se regenera con `--rev` del código anterior al cambio, comprobando que los previos salen idénticos. No cubren iPad.
- **Regla dura — los tests de `tests/` no se modifican en un commit de refactor.** Un refactor mueve código sin cambiar comportamiento, así que la suite tiene que pasar tal cual estaba. **Si un refactor obliga a tocar un test, PARA y repórtalo:** o el refactor cambió comportamiento, o el test estaba atado a un detalle de implementación; decide Moisés, no el commit.
- **Los tests solo cambian en commits de comportamiento** (fix o feature), junto al cambio de `src/` que los justifica, y el diff del test es parte de lo que se revisa.
- **`[COMPORTAMIENTO ACTUAL · …]` en el nombre de un test** = fija lo que la app hace hoy, pendiente de la decisión o el arreglo que nombra la etiqueta. Se cambia únicamente en el commit que toma esa decisión. Arreglar un hallazgo es, entre otras cosas, borrarlo de la lista de excepciones del test (`isDirty.test.ts`) o invertir su expectativa: ese diff es la prueba visible del arreglo.
- **Las referencias golden no se regeneran para poner un test en verde.** `DIORAME_WRITE_GOLDEN=1` reescribe `tests/fixtures/strokes.golden.json` y equivale a cambiar el estilo de los trazos: solo con decisión de Moisés. `ink-slow-pre-3.26.4.json` está congelada.
- **Acción nueva en el reducer → entrada nueva en `tests/helpers/actions.ts`** (el test de humo falla si falta) y, si cambia algo que guarda el `.dior`, o marca `isDirty` o entra con motivo en la lista de excepciones.

**Export SVG:** antes y después de tocar `exportAsSVG`, `svgExport.ts` o `svgGeometry.ts`, pasar la tabla de `tools/svg-diff` (`npm run dev` → `localhost:3000/tools/svg-diff/`; para escenas reales, cargar su `.dior`). Invariantes de `svgGeometry.ts` / `svgText.ts` en REFERENCE.md §10 — leerlos antes de "optimizar". Si se toca texto (render o export): la página también corre la **auditoría glifo a glifo** (columna «contorno MALO» debe ser 0), y cualquier cambio en `utils/textLayout.ts` o `renderTextShape.ts` exige demostrar 0 px de cambio en pantalla (huellas SHA-256 del render con `Math.random` sembrado: sección 5 de `tools/text-check`).

**Texto — caja del gizmo, picking de CINEMA, deformación:** antes y después de tocar `transformUtils.ts` (`getLayerBoundingBox`), `pickLayerAtPoint.ts`, `utils/textMetrics.ts`, `utils/textTransform.ts`, `renderTextShape.ts`, la vista previa del Move en `renderLayerBody.ts` o `TRANSFORM_LAYER`/`FLIP_LAYER`/`LOAD_PROJECT` para texto, pasar `tools/text-check` (`localhost:3000/tools/text-check/`, ~1 min). Mide contra la tinta que PINTA el render real, nunca contra la matemática que se prueba; usa el reducer real (`appReducer`) para estirar y voltear. Cada sección tiene una autocomprobación que debe fallar a propósito. Las huellas del `.dior` antiguo se comparan contra una referencia fijada en ESE navegador («Fijar referencia» antes de tocar el render). Uso y criterios: `tools/text-check/README.md`.

Lecciones de método (serie v3.20.2–3.20.8, medir sin molestar):
- **Las pruebas en el navegador no pueden disparar descargas reales** (export PNG, guardar `.dior`): abren diálogos de guardado al usuario. Parchear `HTMLAnchorElement.prototype.click` para los `<a download>` y capturar el blob con `URL.createObjectURL`. Nunca aceptar un diálogo de descarga en nombre del usuario.
- Para el HQ real hay que importar `exportHandlers.ts` con la URL exacta de `performance.getEntriesByType('resource')`; una ruta desnuda carga otra instancia y `setNextPNGQuality` no llega a la de la app. Una textura se mide con la diferencia «con efecto − sin efecto» del mismo render y su autocorrelación, y el HQ reducido ×2 debe parecerse a la vista. Método completo y trampas: `docs/fx-in-draw.md` §11.

Lecciones de método (serie v3.25.x, DRAW: export, timelapse, render):
- **Cambios de render o de export (pipeline, `drawSnapshot`, `renderLayerBody`, PNG / Capas ZIP / timelapse, idle-skip) → pasar los arneses de `tools/draw-stress/harness/` antes de cerrar:** `pixcheck` y `pixcheck2` (`'before'` antes de tocar, `'after'` después: 0 px y mismo SHA-256), `alphaleak` y `__timelapseCheck()` (`pass: true`). Si se toca el marco de Formato, Acoplar abajo o la proyección de DRAW: también `__mergeDriftCheck()` (`mergedrift.js`, `pass: true`; `format.rect` vive en el plano de la capa 0 desde v3.25.28). Uso y casos: `tools/draw-stress/README.md` §4.
- **Vista plana «Plana» (v3.26.71–3.26.77, `docs/flat-view-proposal.md`): proyecta con la rama de DRAW.** Tocar la proyección de DRAW (rama `!isCinematic` de `transformPoint`, `DRAW_FOCAL_LENGTH`, `frameInView`, `renderLayerBody`) o la cámara/zoom de `renderFrame` cambia también Plana: pasar `tools/draw-stress/harness/flatcheck.js` (`__flatCheck()`, `__flatAnimCheck()` y `__flatDistortCheck()`, `pass: true`; `__cinemaHash` before/after para los presets de siempre). Todo lo de Plana va detrás de `isFlatView(state)` (`utils/flatView.ts`) y su cámara sale del estado (`flatViewCamera`), nunca de `cameraRef`.
- **Comparar píxeles entre lienzos de TAMAÑO distinto (pantalla vs PNG Formato) tiene tres trampas más, medidas en v3.26.79** (`docs/flat-view-proposal.md` §13.4): la textura de tinta sale de `Math.random` después de `consumeNoiseRandoms(w, h)`, así que la misma semilla da otra textura (usar `Math.random` constante); el rasterizador trabaja en float32 en posición absoluta (poner el recorte en la misma posición en los dos lienzos); y el antialiasing de un trazo depende de cómo lo recorta el lienzo (comparar solo trazos que no crucen el borde). Ni DRAW puro coincide al píxel sin eso.
- **Los píxeles se comparan en el mismo backend de raster y en una página recién cargada.** Chrome elige GPU o CPU por lienzo y el antialiasing difiere (hasta 61 niveles): un lienzo de sesión largo y un PNG de una sola vez pueden caer en backends distintos. Forzar `willReadFrequently` en los dos lados (`onCpu` en `timelapse.js`); la textura de papel real no es un oráculo de píxel.
- **Nada se espera entre la siembra de `Math.random` y la lectura de píxeles (v3.26.82).** `Math.random` es global: un `await` (un `import()`, un `fetch`, la carga de una fuente) entre `seedRandom()` y `getImageData` cede el hilo al RAF de la app viva, que con CINEMA animando consume la secuencia sembrada. Era la «inestabilidad en segundas pasadas» de `pixcheck2` (38 019–591 244 px) y de `__diorRenderHash`. Imports y cargas, antes de sembrar; si la función medida es asíncrona, un render de calentamiento sin semilla que deje sus recursos en caché. Causa y falsos diagnósticos: `docs/ux-debt.md`.
- **LIMPIEZA — los temporales nunca viven en `C:\Users\Usuario\Desktop\Diorame\` ni en sus repos** (regla de Moisés, 24/11/2026). Builds de comparación, worktrees, capturas, scripts de medición y volcados van al scratchpad de la sesión o a la carpeta temporal del sistema, y se borran al terminar. La carpeta madre contiene solo `app`, `lab`, `landing` y `motion`: listarla al cerrar la sesión y confirmarlo. (El servidor de desarrollo se arranca desde `app\` sin crear un `.claude\launch.json` en la carpeta madre.) Lo que sí se commitea es evidencia pedida, en `docs/media/`.
- **Rendimiento en CPU: solo A/B alternado, viejo y nuevo en la MISMA sesión.** Entre sesiones el equipo puede ir el doble de lento; una medida de ayer no vale contra la de hoy.
- **Medir con `rAF` exige el panel del navegador integrado visible** (oculto o estrecho congela el `rAF`).
- **Carga, service worker y Lab (sesión 25/11/2026, `docs/session-report-2026-11-25.md`):** (1) **El precache del SW es solo el app shell** (2,82 MB en v3.26.91): nada de vídeos, texturas ni imágenes > 300 KB; los medios pesados van a caché en tiempo de ejecución o a la red. La guardia `tools/build-guards/check-build.mjs` rompe el build si se cuela algo (> 3,5 MB en total, > 1 MB un archivo). (2) **`dior-render.js` es un único archivo sin imports**: no volver a sacarlo como entrada del build de la app ni dejar que importe chunks con hash (misma guardia). (3) **El puente Diorame → Lab no se rige por un tiempo fijo:** espera mientras el Lab envíe `superriso:loading`; un cambio en el arranque del Lab (más shaders, más inicialización) se mide en frío con `tools/load-timing/labstages.mjs --cold` antes de publicar, y la apertura real con `bridge.mjs --restart` (20/20). (4) **Un deploy del Lab que cambia shaders invalida la caché de shaders de todos los usuarios**: la primera apertura posterior es un arranque en frío; el Lab compila sus programas en paralelo y los comprueba al usarlos (v23.11), y el motor de la app también desde v3.26.95: no volver a «compilar y preguntar el estado» en serie, y en la app no lanzar por adelantado los programas de una técnica que no se está usando (no quedaban en la caché de shaders de Chrome: REFERENCE.md §14, trampa 11). (5) Medir carga y puente solo con `tools/load-timing/` (perfiles desechables), nunca con el Chrome del usuario: borrar su caché o su SW borraría su autoguardado.
- **Historia ya subida no se reescribe:** una corrección va en un commit nuevo, nunca `--force` (precedente: v3.25.22 → v3.25.23).

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
- **Moisés solo puede probar en el iPad tras el push.** Lo que juzga o mide en iPad es lo que ya está en producción: cada ronda exige subir, esperar el deploy y confirmar la versión servida. Planificar las rondas de medición en iPad como tales: un lote de variantes tras `?srdebug=1`, un solo push.
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

**Push:** Claude Code hace el push él mismo al cerrar cada tarea con commit (`git push origin main` + `git push origin <tag anotado>`, y después `git ls-remote --tags` para confirmar), SOLO si la validación, typecheck y build están en verde. Si algo falla: no hay push; se para y se reporta. Nunca `--force`. (Decisión de Moisés, 01/11/2026.)

**Tags: siempre ANOTADOS** (`git tag -a vX.Y.Z -m "..."`), nunca ligeros. El tag se sube por nombre o con `git push --follow-tags`, que solo lleva los tags anotados: un tag ligero se queda en local sin avisar (pasó de v3.15.0 a v3.17.58 — 64 tags sin subir).

**Cierre del commit:** el resumen de cierre debe declarar explícitamente el estado de sync de §10 — p. ej. `REFERENCE.md §10 sync: updated (añadido X)` o `N/A (sin cambios de archivos .ts/.tsx)`. Sin esa declaración, el commit no está cerrado.
