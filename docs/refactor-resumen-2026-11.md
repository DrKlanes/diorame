# Refactor de Diorame — estado a v3.26.52 en `main` y v3.26.65 en `refactor/handlers` (16 nov 2026)

Resumen autocontenido de todo lo hecho en el refactor, para poner al día a quien no ha seguido la sesión. El detalle, las mediciones y las tablas completas están en `docs/audit-2026-11.md`; este documento no lo sustituye, lo resume.

**Punto de partida:** v3.26.5, commit `2097388`. **Estado actual:** v3.26.52 en `main` (v3.26.52: fix de H11, §5). **Hecho desde la versión anterior de este resumen (v3.26.45):** la fase 6, parte segura (§2, §3 y `docs/audit-2026-11.md`, «Fase 6 (parte segura) — resultado»): `canvas/commitStroke.ts` con su test contra el código de antes del corte, y los hooks `useCanvasWheelZoom` y `useSpacePan`; `StrataCanvas.tsx` 1 922 → 1 719 líneas. **Sprint de handlers, hecho en la rama `refactor/handlers` (v3.26.53–3.26.65, sin subir ni fusionar):** `StrataCanvas.tsx` 1 719 → 853 líneas; informe, hallazgos y matriz de iPad en `docs/handlers-sprint-report.md`. **Siguiente:** que Moisés apruebe la fusión, y la ronda en iPad (la de la fase 6 y la del sprint, juntas: §9); después, la fase 5. Siguen pendientes el Lab contra producción y la validación visual de «Mixto» y del candado de escala.

---

## 1. En una página

- Se auditó `src/` y se confirmó un monolito principal, `StrataContext.tsx` (2 153 líneas, reducer de 89 acciones), y un segundo, `StrataCanvas.tsx` (1 922).
- Se montó una red de seguridad: Vitest, 529 tests en 11 archivos (476 en 10 al cerrar la fase 7; 451 en 9 al cerrar la fase 4), que ejecutan el reducer y los generadores de trazo reales en Node. Corre en el CI y bloquea el deploy.
- Se arreglaron seis hallazgos de persistencia que la auditoría y los tests destaparon (H1, H6, H7, `TOGGLE_3D_LOCK`, H2, H3).
- Se partió `StrataContext.tsx` moviendo código sin reescribirlo: 2 153 → 1 314 líneas en la fase 3A y → **65** en la 3B. Lo que salió vive en `constants/`, `types/` y la carpeta nueva `src/state/` (17 módulos; el `switch` en `state/appReducer.ts`). El archivo del contexto solo tiene el Provider, `useStrata` y re-exports.
- **`dior-render.js` sin React (v3.26.39):** `diorRender.ts` importa el reducer puro; el grafo pasa de 127 539 a 120 829 bytes, con los mismos exports y los mismos píxeles.
- **Fase 4, hecha:** el grosor que guarda un trazo es el que hay en el lienzo (D3 y D4 aplicadas), y el panel enseña «Mixto» cuando una capa tiene trazos de varios grosores; tocar el slider los unifica. Con ella se cerraron I6, G1, G3–G8 y H8.
- **Escalado proporcional (v3.26.25):** en una capa «Mixto», un candado elige entre escalar todos los trazos por k (por defecto) o unificarlos.
- **Fase 6, parte segura (v3.26.47–3.26.50):** de `StrataCanvas.tsx` salen, movidos sin reescribir, la construcción de la forma al soltar (`canvas/commitStroke.ts`, con un test contra la salida del código de antes del corte) y los efectos de la rueda y la barra espaciadora (dos hooks). 1 922 → 1 719 líneas; handlers de puntero / táctil y bucle RAF idénticos al byte.
- **Sprint de handlers (v3.26.53–3.26.65, rama `refactor/handlers`):** los siete handlers de puntero y táctiles salen de `StrataCanvas.tsx` a `canvas/` — primero su lógica pura (`touchGestures.ts`, `cinemaFraming.ts`, `pointerMath.ts`, la tabla de selección del Move), después sus cuerpos, cortados por script y byte-idénticos (`touchHandlers.ts`, `pointerDownHandler.ts`, `pointerMoveUpHandlers.ts`). 1 719 → **853** líneas. Refs, efectos, `resetGestureState` y el bucle RAF, idénticos al byte a v3.26.52. Red nueva: 125 gestos guionizados contra una referencia congelada con el código de antes del sprint.
- Nada se ha probado en iPad.

---

## 2. Qué se hizo, por orden

| Versión | Commit | Tipo | Qué |
|---|---|---|---|
| v3.26.6 | `0c55f0f` | docs | **Fase 0.** Auditoría: `docs/audit-2026-11.md` |
| v3.26.7 | `42716c4` | test | **Fase 1.** Vitest + 355 tests. `src/` sin cambios |
| v3.26.8 | `d7b3eb7` | fix | H1 + `TOGGLE_3D_LOCK` (`isDirty`), H6 y H7 (`LOAD_PROJECT`) |
| v3.26.9 | `81ce22f` | ci | `npm test` bloqueante en GitHub Actions, antes del build |
| v3.26.10 | `e9dbc6b` | docs | Decisiones D3 y D4 registradas |
| v3.26.11 | `51a493b` | style | **Fase 2a.** Los dos monolitos a tabs; solo espacios |
| v3.26.12 | `3549442` | refactor | **2b.** `constants/layers.ts`; fuera las 8 copias de `BASE_DEPTH_STEP` |
| v3.26.13 | `edfd85e` | refactor | **2c.** `types/strataActions.ts` (unión `Action`) |
| v3.26.14 | `ee948df` | refactor | **2d.** `constants/initialState.ts` |
| v3.26.15 | `5834d6c` | refactor | **Fase 3A.** `state/history.ts` |
| v3.26.16 | `2fd7419` | refactor | `state/loadProject.ts` |
| v3.26.17 | `fa26ff1` | refactor | `state/brush.ts` |
| v3.26.18 | `3fbf60b` | refactor | `state/layerTransform.ts` |
| v3.26.19 | `ad40e1d` | fix | H2: una sola lista de campos para `.dior` y autoguardado |
| v3.26.20 | `646a5de` | fix | H3: `LOAD_PROJECT` descarta lo que no se puede dibujar |
| v3.26.21 | `3f2b4c2` | docs | Primera versión de este resumen |
| v3.26.22 | `1d03930` | feat | **Fase 4a.** Modelo de grosor: D3, D4, G5–G8, H8, aviso de formas descartadas |
| v3.26.23 | `ec40501` | feat | **Fase 4b.** «Mixto» en el panel de grosor |
| v3.26.24 | `f54d6fd` | docs | Cierre de la fase 4: auditoría, deuda de UX y este resumen |
| v3.26.25 | `eca080d` | feat | Escalado proporcional de una capa «Mixto»: candado, `SCALE_LAYER_THICKNESS_PREVIEW`, `SET_BRUSH_SCALE_PROPORTIONAL` (91 acciones) |
| v3.26.26 | `f861630` | refactor | **Fase 3B.** `state/layerNav.ts` |
| v3.26.27 | `269dc7f` | refactor | `state/layerReorder.ts` |
| v3.26.28 | `bdc6ccc` | refactor | `state/palette.ts` |
| v3.26.29 | `c466460` | refactor | `state/fx.ts` |
| v3.26.30 | `11d691b` | refactor | `state/animation.ts` |
| v3.26.31 | `21843fb` | refactor | `state/textSession.ts` |
| v3.26.32 | `bb3c79e` | refactor | `state/shapes.ts` |
| v3.26.33 | `2498f63` | refactor | `state/cinema.ts` |
| v3.26.34 | `edae087` | refactor | `state/drawView.ts` |
| v3.26.35 | `fe8357c` | refactor | `state/tool.ts` |
| v3.26.36 | `1b5bf6c` | refactor | `state/ui.ts` |
| v3.26.37 | `bab63fb` | refactor | `state/project.ts` |
| v3.26.38 | `96f9f7f` | refactor | `state/appReducer.ts`: el `switch` sale de `StrataContext.tsx` |
| v3.26.39 | `e940202` | refactor | `diorRender.ts` y los `.ts` sin React importan de `state/` y `constants/`: React fuera de `dior-render.js` |
| v3.26.40 | `aa9e8f6` | docs | Cierre de la fase 3B: auditoría, CLAUDE.md y este resumen |
| v3.26.41 | `4f6dbdb` | chore | **Fase 7.** Fuera 45 archivos sin importadores de `components/ui/` |
| v3.26.42 | `aa919e7` | refactor | `analytics.ts` en `events` / `transport` / `session` + fachada |
| v3.26.43 | `226fbea` | refactor | `PreviewPage.tsx` en cuatro archivos |
| v3.26.44 | `57dae0a` | fix | H10: tres campos de gradiente muertos |
| v3.26.45 | `a183248` | docs | Cierre de la fase 7: §6 corregido, Apéndices B y C, ux-debt, auditoría y este resumen |
| v3.26.46 | `4b5ded1` | chore | Fuera 34 paquetes npm que solo usaba `components/ui/` |
| v3.26.47 | `a32b998` | test | **Fase 6.** Referencia «muestras del puntero → forma» congelada con el código de antes del corte |
| v3.26.48 | `4c8593e` | refactor | `canvas/commitStroke.ts` + `tests/commitStroke.test.ts` |
| v3.26.49 | `ee243d5` | refactor | `hooks/useCanvasWheelZoom.ts` |
| v3.26.50 | `ac82331` | refactor | `hooks/useSpacePan.ts` |
| v3.26.51 | `3e9e176` | docs | Cierre de la fase 6 (parte segura): auditoría, REFERENCE, CLAUDE.md y este resumen |
| v3.26.52 | `ca3cb8f` | fix | H11: la goma espejada lleva su `eraserPolygon` espejado |
| v3.26.53 | `47d0f16` | test | **Sprint de handlers (rama `refactor/handlers`, tags `-handlers`).** Arnés que ejecuta el texto literal de los handlers + referencia congelada con v3.26.52 |
| v3.26.54 | `b657cb5` | test | +8 escenarios |
| v3.26.55 | `3ac8ff9` | refactor | `canvas/touchGestures.ts`; matriz de escritorio versionada |
| v3.26.56 | `7986ba3` | test | Escenario de capa oculta corregido |
| v3.26.57 | `91ceb1d` | refactor | `canvas/cinemaFraming.ts` |
| v3.26.58 | `d2626fa` | test | +3 escenarios (cámara fuera del plano de la capa) |
| v3.26.59 | `26a49fb` | refactor | `canvas/pointerMath.ts` + decisiones del Move en `moveGizmoInteraction.ts` |
| v3.26.60 | `c692588` | chore | El arnés sigue a un handler hasta su módulo |
| v3.26.61 | `b6646a7` | refactor | Handlers táctiles → `canvas/touchHandlers.ts` (+ `canvas/handlerEnv.ts`) |
| v3.26.62 | `23d407f` | refactor | `handlePointerDown` → `canvas/pointerDownHandler.ts` |
| v3.26.63 | `a0ed6e4` | test | +1 escenario |
| v3.26.64 | `e45a538` | refactor | `handlePointerMove` / `Up` → `canvas/pointerMoveUpHandlers.ts` |
| v3.26.65 | — | docs | Informe del sprint, REFERENCE, CLAUDE.md (conteos) y este resumen |

Hasta v3.26.52, todos los tags son anotados y están en el remoto. Los del sprint de handlers (`v3.26.53-handlers` … `v3.26.65-handlers`) son anotados y **locales**: la rama no se ha subido. No se reescribió historia.

---

## 3. Arquitectura: antes y ahora

### `StrataContext.tsx`

| Momento | Líneas |
|---|---:|
| Antes del refactor | 2 153 |
| Tras la fase 2 | 1 915 |
| Tras la fase 3A | 1 314 |
| Tras la fase 4 | 1 321 |
| **Tras la fase 3B** | **65** |

Contiene el Provider, `useStrata` y los re-exports. **Re-exporta todo lo que salió**, `appReducer` incluido, así que sus importadores de React no cambiaron. Los 9 `.ts` sin React de `src/` que importaban de él (`diorRender.ts`, siete módulos de render y `svgExport.ts`) y 3 de `tools/` importan ahora de `state/` y `constants/`: 61 → 52 importadores en `src/`, todos de React. `tests/` sigue importando del contexto: no se toca en un refactor.

### `StrataCanvas.tsx`

| Momento | Líneas |
|---|---:|
| Antes del refactor | 1 922 |
| Tras `commitStroke.ts` (v3.26.48) | 1 824 |
| Tras `useCanvasWheelZoom` (v3.26.49) | 1 779 |
| Tras `useSpacePan` (v3.26.50) | 1 719 |
| Tras la lógica pura de los handlers (v3.26.59, rama) | 1 496 |
| **Tras mover los cuerpos de los handlers (v3.26.64, rama)** | **853** |

Lo que salió decide *qué*, nunca *cuándo*: el handler sigue filtrando micro-trazos táctiles, despachando y limpiando en el mismo orden, y cada hook se llama en la posición exacta del `useEffect` que sustituye (mismo orden de efectos y de listeners). Los refs de la barra espaciadora se quedan en el componente porque los leen los handlers de puntero.

**Sprint de handlers (rama `refactor/handlers`).** Mismo principio en dos pasos. Primero la lógica pura (umbrales, aritmética, la tabla de selección del Move) a módulos sin refs. Después los cuerpos: cada grupo de handlers es una fábrica sin hooks (`createTouchHandlers(env)` …) que el componente llama una vez por render donde antes los escribía, con un `handlerEnv` que lleva el estado de ese render, `dispatch` y los objetos ref. Como no hay hooks nuevos, el orden de hooks y efectos no cambia; el JSX es idéntico al byte; cada handler sigue leyendo `.current` al llegar su evento. Quedan refs, efectos, `resetGestureState`, el núcleo RAF y el JSX.

### Archivos nuevos

| Archivo | Líneas | Contenido |
|---|---:|---|
| `src/constants/layers.ts` | 7 | `BASE_DEPTH_STEP`, `MAX_LAYERS`, `MAX_HISTORY_STEPS`. Sin imports |
| `src/constants/initialState.ts` | 133 | `initialState` |
| `src/types/strataActions.ts` | 123 | Unión `Action` (89 acciones), `LegacyShape`, `LegacyProjectPayload` |
| `src/state/history.ts` | 159 | `pushHistory`, `createSnapshot`, `patchCurrentSnapshot`, `undo`, `redo` |
| `src/state/loadProject.ts` | 255 | `loadProject` (`LOAD_PROJECT`), `readableShapes` |
| `src/state/brush.ts` | 153 | `setBrushThickness`, `setBrushThicknessPreview`, `commitBrushThickness`, `setBrushMode`, desde la fase 4 un único `restyle`, y desde v3.26.25 `scaleLayerThicknessPreview` y `setBrushScaleProportional` |
| `src/state/layerTransform.ts` | 200 | `moveLayer`, `transformLayer`, `flipLayer` |
| `src/state/layerNav.ts` | 323 | Navegación, alta y borrado de capas; seleccionada, visible y bloqueo 3D (3B) |
| `src/state/layerReorder.ts` | 282 | Reordenar, mover a posición, duplicar (3B) |
| `src/state/palette.ts` | 213 | Modo, gradiente, set de tintas, aplicar a todas, color (3B) |
| `src/state/fx.ts` | 93 | FX y Super Riso (3B) |
| `src/state/animation.ts` | 119 | Modo animación y secuencia de frames (3B) |
| `src/state/textSession.ts` | 73 | Sesión de texto (3B) |
| `src/state/shapes.ts` | 47 | `ADD_SHAPE`, `ADD_SHAPES` (3B) |
| `src/state/cinema.ts` | 72 | Cámara y vista de CINEMA (3B) |
| `src/state/drawView.ts` | 47 | Vista de DRAW, formato, rejilla (3B) |
| `src/state/tool.ts` | 79 | Herramienta e interruptores de dibujo (3B) |
| `src/state/ui.ts` | 39 | Modal, onboarding, sonidos, UI, modo oscuro, export (3B) |
| `src/state/project.ts` | 74 | Guardado, nombre, duplicar, lienzo nuevo (3B) |
| `src/state/appReducer.ts` | 121 | El `switch`: una línea por `case` (3B) |
| `src/components/strata/canvas/commitStroke.ts` | 114 | `buildStrokeShapes`: de las muestras del gesto a la(s) forma(s) (fase 6) |
| `src/hooks/useCanvasWheelZoom.ts` | 66 | Zoom con rueda en DRAW y en CINEMA órbita (fase 6) |
| `src/hooks/useSpacePan.ts` | 84 | Barra espaciadora: mantener = pan, toque = resetear vista (fase 6) |
| `src/components/strata/canvas/touchGestures.ts` | 144 | Umbrales de toque / pinch, matemática del pinch y de la órbita táctil (sprint de handlers) |
| `src/components/strata/canvas/cinemaFraming.ts` | 153 | Doble clic de CINEMA: `isDoubleClick`, `frameCinemaPoint` (sprint) |
| `src/components/strata/canvas/pointerMath.ts` | 137 | Puntero → mundo, temblor orgánico, pan, órbita con ratón, filtro de micro-trazos (sprint) |
| `src/components/strata/canvas/handlerEnv.ts` | 62 | `CanvasHandlerEnv`: el tipo de lo que cierran los handlers (sprint) |
| `src/components/strata/canvas/touchHandlers.ts` | 228 | `createTouchHandlers`: los cuatro handlers táctiles (sprint) |
| `src/components/strata/canvas/pointerDownHandler.ts` | 259 | `createPointerDownHandler`: `handlePointerDown` (sprint) |
| `src/components/strata/canvas/pointerMoveUpHandlers.ts` | 260 | `createPointerMoveUpHandlers`: `handlePointerMove`, `handlePointerUp` (sprint) |

Además: `FIXED_PALETTE` y `ALTERNATIVE_PALETTE` pasaron de `StrataContext.tsx` a `constants/palette.ts` (las necesita `initialState` y no puede importar del reducer). `utils/diorPayload.ts` ganó `buildDiorFields` y `buildAutosaveData`.

### Patrón de `src/state/`

El `switch` vive en `state/appReducer.ts` (desde v3.26.38). Cada `case` es **una línea que delega** en una función del módulo (el patrón que ya usaba `MERGE_LAYER_DOWN` → `utils/mergeLayers.ts`). El cuerpo de la función son las mismas líneas del `case`. Si lee `action.payload`, recibe la acción acotada: `Extract<Action, { type: '…' }>`.

### Lo que NO se hizo a propósito

- `UNDO` y `REDO` siguen siendo dos funciones con el cuerpo duplicado.
- En la 3B tampoco se unificaron el desplazamiento de registros por capa (`ADD_LAYER`, `NEXT_LAYER`, `DUPLICATE_LAYER`) ni el bloque «ir a la capa N» (`NEXT_LAYER`, `PREV_LAYER`, `SET_CURRENT_LAYER`, `STEP_ANIMATION_FRAME`).
- Las tres copias del bucle que re-estila trazos siguieron en `state/brush.ts` durante la fase 3A.

Unificarlas era reescribir, no mover. La segunda se hizo en la fase 4, que es un cambio de comportamiento: ahora es una función, `restyle`. `UNDO` y `REDO` siguen duplicados.

### Lo que no se ha tocado

El núcleo de `StrataCanvas.tsx` (bucle RAF, `buildRenderContext`), sus refs, sus efectos y `resetGestureState` (idénticos al byte también tras el sprint de handlers), `renderPipeline.ts` (solo su línea de import de `BASE_DEPTH_STEP`, en la 3B), `postProcessing.ts`, `applySuperRiso.ts`, `analytics.ts` y `components/ui/` (4 545 líneas sin usar).

---

## 4. Red de seguridad

- **`npm test`**: Vitest 4.1.12 (fijada: es la última línea que declara Vite ^6.0; el proyecto fija Vite 6.3.5). Entorno `node`, sin mocks (salvo el contador de `crypto.randomUUID` de `commitStroke.test.ts`). 529 tests, ~1,5 s (663 en 12 archivos en la rama `refactor/handlers`).
- **CI**: paso `Test` en `.github/workflows/deploy.yml`, tras el typecheck y antes del build. Un test en rojo no se despliega.
- **Tests en `tests/`** (fuera de `src/`), incluidos en el typecheck.

| Archivo | Cubre |
|---|---|
| `reducer.smoke.test.ts` | Las 91 acciones corren sobre un estado con contenido. Falla si se añade una acción sin entrada en `helpers/actions.ts` |
| `strokeGenerators.golden.test.ts` | 6 trazos × tapered / uniform / ink × grosor 1 / 20 / 70 contra referencia (tolerancia 1e-9). Protege `_inkSmoothPass` ×3 peso 0,3 y el densificado curvo de v3.26.4 |
| `history.characterization.test.ts` | Contrato de undo híbrido: sesión de 24 gestos deshecha y rehecha paso a paso |
| `brush.characterization.test.ts` | Modelo de grosor: redimensionar escala el grosor guardado, re-estilar, selección pura, arrastre = un paso (y ninguno si vuelve a donde empezó), Ink conserva su dibujo |
| `mixedThickness.test.ts` | «Mixto»: qué capa es mixta, cómo se muestra un grosor, unificar = un paso de undo, deshacer devuelve cada grosor y el par que regía |
| `proportionalScale.test.ts` | Escalado proporcional (v3.26.25): razones conservadas (1e-9), límites de k, un gesto = un paso, undo exacto, k = 1 sin paso, trazo nuevo al par × k, el candado fuera del `.dior`, del historial y de `isDirty`, unificar idéntico |
| `layers.characterization.test.ts` | Navegación, alta, borrado, reordenado, duplicado y acoplado de capas |
| `isDirty.test.ts` | Toda acción que cambia lo que guarda el `.dior` marca `isDirty`, salvo una lista explícita |
| `dior.roundtrip.test.ts` | Guardar → cargar, paridad `.dior` / autoguardado, migración de archivos antiguos |
| `dior.damaged.test.ts` | Archivos dañados: se descarta lo ilegible y el resto abre |
| `handlers.characterization.test.ts` | **(rama `refactor/handlers`)** Los handlers de puntero y táctiles: el texto del archivo del árbol de trabajo, ejecutado por `tools/handlers-golden/` con el reducer real, a través de 125 gestos guionizados (trazos en cada herramienta, micro-trazos, pan, toques de 2 y 3 dedos y pinch en sus umbrales, órbita, doble clic de CINEMA, Move), contra una referencia congelada con el código de v3.26.52. No cambió al mover los handlers. Fija `[COMPORTAMIENTO ACTUAL · pinch con el centro quieto]` |
| `commitStroke.test.ts` | «Muestras del puntero → forma» (fase 6): 46 casos de pincel en los tres modos, blob y goma, con simetría, dentro / detrás y zoom, contra la salida del código EN LÍNEA de antes del corte (`fixtures/commitStroke.golden.json`, congelada en v3.26.47 ejecutando el texto literal del handler). Desde v3.26.52, los 4 de goma con simetría esperan el polígono espejado (H11), con 4 tests de simetría más |

### Reglas que quedaron escritas en CLAUDE.md

- **Los tests de `tests/` no se modifican en un commit de refactor.** Si un refactor obliga a tocarlos, se para y se reporta.
- Los tests solo cambian en commits de comportamiento (fix o feature), y ese diff se revisa.
- Un test con **`[COMPORTAMIENTO ACTUAL · …]`** en el nombre fija lo que la app hace hoy, pendiente de una decisión. Solo cambia en el commit que toma esa decisión. Tras la fase 4 no quedaba ninguno; el sprint de handlers fija uno: el pinch con el centro quieto.
- Las referencias golden no se regeneran para poner un test en verde.
- Acción nueva en el reducer → entrada en `tests/helpers/actions.ts`.

### Comprobaciones que no son Vitest (navegador, manuales)

`tools/text-check` (texto: caja, picking, deformación, huellas) y `tools/draw-stress/harness/` (`pixcheck`, `mergedrift`…). En las fases 2, 3A y 3B se pasaron `text-check` y `__mergeDriftCheck()` tras cada commit, y en la 4a también; la referencia de huellas se fijó con el código de v3.26.10, se volvió a fijar con el de v3.26.21 y, en otro navegador, con el de v3.26.25.

### Cómo se verificó cada commit de refactor

`npm test`, typecheck y build en verde · `git diff --color-moved` solo marca como no movido imports, `export` y los `case` que delegan · `dior-render.js` mantiene sus 3 exports y su grafo · `text-check` y `mergedrift` pasan. En la 3B, además, `dior-render.js` pinta el `.dior` de ejemplo con el mismo SHA-256 que el build de v3.26.25 (CPU forzada, `Math.random` sembrado). En el paso de indentación: `git diff -w` vacío y **build byte-idéntico**.

---

## 5. Hallazgos y su estado

### Resueltos

| # | Hallazgo | Arreglo | Versión |
|---|---|---|---|
| H1 | Siete acciones cambiaban campos guardados sin marcar `isDirty` (el autoguardado no escribía, salir no avisaba) | `SET_BRUSH_MODE`, `SET_PALETTE_MODE`, `COMMIT_PALETTE_GRADIENT`, `SET_ACTIVE_PALETTE`, `ADD_LAYER`, `NEXT_LAYER` al crear capa y `TOGGLE_PALETTE_APPLY_TO_ALL` lo marcan | v3.26.8 |
| — | `TOGGLE_3D_LOCK`, mismo hueco, encontrado al escribir los tests | Lo marca | v3.26.8 |
| H6 | Un archivo sin `isDarkMode` o `projectName` heredaba los del proyecto abierto | Toma los valores por defecto | v3.26.8 |
| H7 | Guardar con el pincel activo reabría con el blob | La migración de `tool` solo traduce archivos anteriores a v2.3.0 | v3.26.8 |
| H2 | El autoguardado copiaba a mano la lista de campos del `.dior` | `buildDiorFields` es la única lista | v3.26.19 |
| H3 | `LOAD_PROJECT` no validaba `shapes`, capas ocultas/fijadas ni modos de render: un `null` reventaba la carga | Se descarta lo ilegible y el resto abre. Desde v3.26.22, con aviso en pantalla de cuántas formas se dejaron fuera | v3.26.20 |
| I6 / G1 | Redimensionar escalaba el contorno pero no `brushThickness`; el slider no se movía y el siguiente re-estilado hacía saltar el grosor (40 → 21) | D3: redimensionar escala el número en los tres modos; el slider lo sigue | v3.26.22 |
| G3 | Con estirado no uniforme no había «un grosor» | D4: media geométrica, `√(|sx · sy|)` | v3.26.22 |
| G4 | Acoplar dejaba grosores no enteros (30,449999999999996) y capas con varios grosores sin avisar | D4: se guardan exactos, se redondean al mostrar; la capa enseña «Mixto» | v3.26.22–23 |
| G5 | Ink cambiaba de dibujo al re-estilar tras mover la capa | Cada trazo Ink guarda la semilla de su ruido y si está volteado | v3.26.22 |
| G6 | Arrastrar el slider y volver al valor inicial creaba un paso de undo vacío | No lo crea | v3.26.22 |
| G7 | El grosor por capa no viajaba en el `.dior` | `layerBrushSettings`, campo aditivo y opcional | v3.26.22 |
| G8 | Una capa creada en medio de la pila heredaba el par de la que ocupaba su sitio | Toma el de la capa activa | v3.26.22 |
| H8 | Mover y voltear no transformaban `eraserPolygon` | Lo transforman | v3.26.22 |
| H11 | Con simetría, la goma espejada guardaba el `eraserPolygon` del original sin espejar. Solo lo lee `svgBounds`: el marco del SVG se quedaba corto hasta medio grosor en el lado espejado; ni el lienzo ni la geometría del SVG cambiaban | Pasa por el mismo espejo que sus `points`. Archivos ya guardados: no se migran (solo afecta a ese margen del marco) | v3.26.52 |

**Criterio de H7** (se pidió usar la versión/`meta` y no bastaba): el renombrado de herramientas es de v2.3.0, commit `b2b9942`, que renombró a la vez las claves que el archivo guarda al lado (`lineMode` / `currentLineThickness` → `brushMode` / `currentBrushThickness`). Un archivo con las claves nuevas se lee tal cual; solo se traduce el que no las tiene. El `meta` no sirve: los archivos de v2.3.0 a v3.20.x no lo tienen y el autoguardado no lleva `formatVersion`.

**Excepción decidida de `isDirty`:** elegir herramienta (`SET_TOOL`) y navegar entre capas no ensucian, aunque el archivo guarde la herramienta y el par de grosor de la capa activa.

### Abiertos, asignados

| # | Hallazgo | Cuándo |
|---|---|---|
| H10 | Tres campos de gradiente se escribían en el estado sin declararse ni leerse | **Resuelto en v3.26.44** (fase 7) |

### Abiertos, sin decisión

- **Archivos guardados antes de v3.26.22 con trazos redimensionados:** llevan el número antiguo (dibujado a 20, redimensionado ×2: dice 20, mide 40). No se migran: se ven igual, el slider marca 20 y el primer re-estilado los redibuja al valor elegido. Falta decidir si se deja así o se detecta el desfase al cargar (exacto en Tapered, aproximado en Ink).
- **Tono de la banda y del tirador de «Mixto»** (`T.purpleLight`): calibrado visual, lo cierra Moisés.
- Los valores de dentro de `layerGradParams` no se validan al cargar.
- **Pinch con el centro quieto se lee como toque de dos dedos (deshacer)** (fase 6, comportamiento previo): el sprint de handlers no lo cambió y lo dejó fijado en un test `[COMPORTAMIENTO ACTUAL]`. Falta caracterizarlo en iPad (matriz del informe, B3) y decidir.
- ~~**H12 · el listener nativo de `pointerdown` del Pencil es un no-op**~~ — **resuelto en v3.26.69** (opción A): eliminado el relanzamiento (no-op desde el commit base); el `touchstart` cancelado se queda y pasa a comportamiento protegido. Falta la mini-ronda de iPad.
- ~~**H13** · `removeEventListener` sin `capture`~~ — **resuelto en v3.26.69**.
- **H14 · en DRAW los handlers proyectan el puntero con `state.focalLength` y el gizmo con `DRAW_FOCAL_LENGTH`.** Inocuo mientras la cámara esté en el plano de la capa activa; por confirmar si hay algún camino con la cámara fuera.
- ~~Desfases de documentación de la auditoría §6~~ — **corregidos en la fase 7 (v3.26.45)**, cada uno verificado contra el código; la tabla está en `docs/audit-2026-11.md`, «Fase 7 — resultado».

---

## 6. Decisiones tomadas

| # | Decisión | Estado |
|---|---|---|
| D1 | Módulos del reducer en `src/state/` | Hecho (v3.26.15) |
| D2 | Vitest, tests en `tests/` | Hecho (v3.26.7) |
| D3 | Al redimensionar, `brushThickness` escala con la geometría en los tres modos, como ya hace acoplar. Uniform pasa a engordar: cambio visible, aceptado | Hecho (v3.26.22) |
| D4 | «Grosor visible» = `brushThickness` guardado. Estirado no uniforme: media geométrica del escalado. No enteros: se guardan exactos, se redondean al mostrar (a enteros; un decimal por debajo de 1) | Hecho (v3.26.22–23) |
| D5 | Indentación a tabs antes de mover código | Hecho (v3.26.11) |
| D6 | Sacar los tipos de `renderPipeline.ts` | Sí, en la fase 5, con `pixcheck` |
| D7 | Reparto de hallazgos | Ver §5 |
| D8 | Los sonidos se quedan dentro del reducer | Tomada |

Decisión previa de producto (15 nov 2026, en `docs/ux-debt.md`): el slider muestra el grosor visible de la capa y «Mixto» cuando tiene varios; tocarlo unifica. Hecha en la fase 4.

Decisiones tomadas dentro de la fase 4, con su motivo en la auditoría: el redondeo al mostrar; el campo `inkMirrored` (la semilla sola dejaba 6,5 px tras voltear); el botón de modo no unifica; al cargar, el grosor de los trazos no se recorta al máximo del slider; al deshacer una unificación el slider vuelve al par que regía.

---

## 7. Lo que queda

| Fase | Qué | Notas |
|---|---|---|
| ~~4. «Mixto»~~ | **Hecha** (v3.26.22–23; escalado proporcional en v3.26.25) | Pendiente solo la validación visual de Moisés, en `localhost:3000` y en iPad |
| ~~3B. Resto del reducer~~ | **Hecha** (v3.26.26–3.26.39) | Pendiente: abrir un `.dior` en el Lab contra producción (§9) |
| **5. Archivos de FX** | `canvas/risoV2.ts`, `superRiso/engineHost.ts`, tipos de `renderPipeline.ts` | Núcleo: GO explícito. `pixcheck` 0 px. Una ronda en iPad |
| ~~6. `StrataCanvas.tsx`, lo seguro~~ | **Hecha** (v3.26.47–3.26.51): `canvas/commitStroke.ts`, `useCanvasWheelZoom`, `useSpacePan` | Pendiente la ronda en iPad |
| ~~Sprint de handlers~~ | **Hecho en la rama `refactor/handlers`** (v3.26.53–3.26.65): `StrataCanvas.tsx` 1 719 → 853 | Pendiente: aprobar la fusión (despliega) y la ronda en iPad — matriz en `docs/handlers-sprint-report.md` §8 |
| ~~7. Higiene~~ | **Hecha** (v3.26.41–3.26.45): `components/ui/` sin usar fuera (45 archivos), `analytics.ts` y `PreviewPage.tsx` partidos, H10, documentación al día | Pendientes nuevos en `docs/ux-debt.md` (Ink fino, píldora de «Mixto», candado en iPad) |

Queda la fase 5 (la 6, parte segura, y la 7 ya están hechas), y fusionar y probar en iPad el sprint de los handlers.

---

## 8. Contratos que no se han roto

| Contrato | Estado |
|---|---|
| **Undo híbrido** (CLAUDE.md) | Mismo contrato. Dos ajustes en la fase 4, los dos con test: un arrastre del slider que vuelve a donde empezó no crea paso, y al deshacer en una capa de varios grosores el slider vuelve al par que regía (en una capa de un solo grosor, los mismos valores que antes) |
| **`.dior` v2** | Mismo formato, con campos **aditivos y opcionales** desde v3.26.22: `layerBrushSettings` (30 claves) y, por trazo Ink, `inkSeed` e `inkMirrored`. Una app anterior los ignora; un archivo sin ellos abre como antes. El JSON guardado fue byte-idéntico antes y después de H2. Cambia la lectura de archivos dañados (H3), de `tool` (H7) y de huecos (H6) |
| **`dior-render.js`** (contrato con el Super Riso Lab) | Mismos 3 exports (`frameOf`, `parseDior`, `renderDior`), mismo nombre de archivo, mismo grafo de 3 archivos. Abre archivos con y sin los campos nuevos y los pinta igual. Sin `react-dom`, `sonner` ni CSS inyectado. **Sin React desde v3.26.39** (127 539 → 120 829 bytes); `soundManager` sigue dentro (D8). Mismos píxeles que v3.26.25 en el ejemplo y en el `.dior` antiguo de texto |
| **`file_handlers` PWA** | No tocado. Pasa por `LOAD_PROJECT` |
| **Paridad con el Lab** | No se tocó ningún shader ni pasada |
| **`_inkSmoothPass`** | No tocado; protegido por los golden, que la fase 4 no regeneró (los generadores dan la misma salida al bit sin los argumentos nuevos). Tampoco se tocó la frecuencia ni la amplitud del ruido de Ink |

---

## 9. Límites: lo que no está verificado

- **Nada se probó en iPad.** Todo lo de navegador se hizo en el navegador integrado de escritorio. La fase 6 toca el camino de cada trazo: es la primera que pide su ronda en iPad antes de darse por cerrada (Pencil en los tres modos, goma, simetría, dentro / detrás, pinch y toques de 2 y 3 dedos).
- Fase 6: el gizmo de Move solo se probó a mano en traslación; el pinch, con dedos sintéticos.
- **Sprint de handlers:** todo con eventos sintéticos (Node y navegador de escritorio). El panel del navegador integrado estuvo oculto, con el `rAF` congelado: la matriz de escritorio corrió con `requestAnimationFrame` sobre un temporizador y **no hay capturas** — nadie ha mirado un frame. El gizmo sí se probó entero esta vez (traslación, esquina, lado, rotación), pero con eventos sintéticos. El coste nuevo por render (un objeto de 29 claves) no se ha medido en iPad.
- **El Lab real no ha abierto el `dior-render.js` de v3.26.39.** En local: mismos exports, mismo nombre, mismos píxeles. En producción cambia con el deploy; la comprobación es de Moisés, en el Lab.
- Los cambios de persistencia se validaron por los caminos reales (Ctrl+S, abrir archivo, autoguardado, «Continuar trabajo anterior») con las descargas interceptadas: **no se escribió ningún archivo real en disco**. El aviso al salir se comprobó con un evento sintético, no cerrando la pestaña.
- El único `.dior` real anterior a v2.3.0 que hay en el repo es la escena de ejemplo, y no guarda `tool`; el caso `tool: 'brush'` antiguo se prueba con un archivo construido con las claves de entonces.
- `pixcheck`, `alphaleak` y `__timelapseCheck()` no se han pasado: ningún commit tocó el código de render ni de export. La fase 4 sí cambia lo que se pinta de un trazo Uniform redimensionado (engorda), por decisión.
- **«Mixto» no está validado a ojo por Moisés**, ni en escritorio ni en iPad. El tirador atenuado va por `accent-color`, que cada navegador pinta a su manera.
- Ink y redimensionar: el contorno regenerado coincide con el redimensionado (0 px) solo si los dos grosores son ≥ 7,5 px; por debajo se separan hasta 4 px (dos suelos en píxeles del generador, sin tocar).
- Los tests no cubren píxeles, WebGL ni gestos.
