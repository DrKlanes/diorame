# Refactor de Diorame — estado a v3.26.25 (15 nov 2026)

Resumen autocontenido de todo lo hecho en el refactor, para poner al día a quien no ha seguido la sesión. El detalle, las mediciones y las tablas completas están en `docs/audit-2026-11.md`; este documento no lo sustituye, lo resume.

**Punto de partida:** v3.26.5, commit `2097388`. **Estado actual:** v3.26.25 en `main`. **Hecho desde la versión anterior de este resumen (v3.26.21):** la fase 4, modelo de grosor y «Mixto» (§2, §5 y `docs/audit-2026-11.md`, «Fase 4 — resultado»), y sobre ella el escalado proporcional de una capa «Mixto» (v3.26.25). **Siguiente:** lo decide Moisés entre las fases 3B, 5, 6 y 7; antes, su validación visual de «Mixto» y del candado de escala en `localhost:3000` y en iPad.

---

## 1. En una página

- Se auditó `src/` y se confirmó un monolito principal, `StrataContext.tsx` (2 153 líneas, reducer de 89 acciones), y un segundo, `StrataCanvas.tsx` (1 922).
- Se montó una red de seguridad: Vitest, 476 tests en 10 archivos (451 en 9 al cerrar la fase 4), que ejecutan el reducer y los generadores de trazo reales en Node. Corre en el CI y bloquea el deploy.
- Se arreglaron seis hallazgos de persistencia que la auditoría y los tests destaparon (H1, H6, H7, `TOGGLE_3D_LOCK`, H2, H3).
- Se partió `StrataContext.tsx` moviendo código sin reescribirlo: 2 153 → 1 314 líneas. Lo que salió vive en `constants/`, `types/` y la carpeta nueva `src/state/`.
- **Fase 4, hecha:** el grosor que guarda un trazo es el que hay en el lienzo (D3 y D4 aplicadas), y el panel enseña «Mixto» cuando una capa tiene trazos de varios grosores; tocar el slider los unifica. Con ella se cerraron I6, G1, G3–G8 y H8.
- **Escalado proporcional (v3.26.25):** en una capa «Mixto», un candado elige entre escalar todos los trazos por k (por defecto) o unificarlos.
- Nada se ha probado en iPad. `StrataCanvas.tsx` solo ha cambiado de indentación.

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
| v3.26.25 | — | feat | Escalado proporcional de una capa «Mixto»: candado, `SCALE_LAYER_THICKNESS_PREVIEW`, `SET_BRUSH_SCALE_PROPORTIONAL` (91 acciones) |

Todos los tags son anotados y están en el remoto. No se reescribió historia.

---

## 3. Arquitectura: antes y ahora

### `StrataContext.tsx`

| Momento | Líneas |
|---|---:|
| Antes del refactor | 2 153 |
| Tras la fase 2 | 1 915 |
| Tras la fase 3A | 1 314 |
| Tras la fase 4 | 1 319 |

Sigue conteniendo el `switch` de `appReducer`, las acciones aún no movidas, el Provider y `useStrata`. **Re-exporta todo lo que salió**, así que ninguno de sus 61 importadores cambió.

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

Además: `FIXED_PALETTE` y `ALTERNATIVE_PALETTE` pasaron de `StrataContext.tsx` a `constants/palette.ts` (las necesita `initialState` y no puede importar del reducer). `utils/diorPayload.ts` ganó `buildDiorFields` y `buildAutosaveData`.

### Patrón de `src/state/`

El `switch` se queda en `appReducer`. Cada `case` movido es **una línea que delega** en una función del módulo (el patrón que ya usaba `MERGE_LAYER_DOWN` → `utils/mergeLayers.ts`). El cuerpo de la función son las mismas líneas del `case`. Si lee `action.payload`, recibe la acción acotada: `Extract<Action, { type: '…' }>`.

### Lo que NO se hizo a propósito

- `UNDO` y `REDO` siguen siendo dos funciones con el cuerpo duplicado.
- Las tres copias del bucle que re-estila trazos siguieron en `state/brush.ts` durante la fase 3A.

Unificarlas era reescribir, no mover. La segunda se hizo en la fase 4, que es un cambio de comportamiento: ahora es una función, `restyle`. `UNDO` y `REDO` siguen duplicados.

### Lo que no se ha tocado

`StrataCanvas.tsx` (solo indentación), `renderPipeline.ts`, `postProcessing.ts`, `applySuperRiso.ts`, `analytics.ts`, `components/ui/` (4 545 líneas sin usar), y las acciones del reducer de capas, paleta, FX, animación y texto.

---

## 4. Red de seguridad

- **`npm test`**: Vitest 4.1.12 (fijada: es la última línea que declara Vite ^6.0; el proyecto fija Vite 6.3.5). Entorno `node`, sin mocks. 476 tests, ~1,5 s.
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

### Reglas que quedaron escritas en CLAUDE.md

- **Los tests de `tests/` no se modifican en un commit de refactor.** Si un refactor obliga a tocarlos, se para y se reporta.
- Los tests solo cambian en commits de comportamiento (fix o feature), y ese diff se revisa.
- Un test con **`[COMPORTAMIENTO ACTUAL · …]`** en el nombre fija lo que la app hace hoy, pendiente de una decisión. Solo cambia en el commit que toma esa decisión. Tras la fase 4 no queda ninguno.
- Las referencias golden no se regeneran para poner un test en verde.
- Acción nueva en el reducer → entrada en `tests/helpers/actions.ts`.

### Comprobaciones que no son Vitest (navegador, manuales)

`tools/text-check` (texto: caja, picking, deformación, huellas) y `tools/draw-stress/harness/` (`pixcheck`, `mergedrift`…). En las fases 2 y 3A se pasaron `text-check` y `__mergeDriftCheck()` tras cada commit, y en la 4a también; la referencia de huellas se fijó con el código de v3.26.10 y se volvió a fijar con el de v3.26.21.

### Cómo se verificó cada commit de refactor

`npm test`, typecheck y build en verde · `git diff --color-moved` solo marca como no movido imports, `export` y los `case` que delegan · `dior-render.js` mantiene sus 3 exports y su grafo · `text-check` y `mergedrift` pasan. En el paso de indentación: `git diff -w` vacío y **build byte-idéntico**.

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

**Criterio de H7** (se pidió usar la versión/`meta` y no bastaba): el renombrado de herramientas es de v2.3.0, commit `b2b9942`, que renombró a la vez las claves que el archivo guarda al lado (`lineMode` / `currentLineThickness` → `brushMode` / `currentBrushThickness`). Un archivo con las claves nuevas se lee tal cual; solo se traduce el que no las tiene. El `meta` no sirve: los archivos de v2.3.0 a v3.20.x no lo tienen y el autoguardado no lleva `formatVersion`.

**Excepción decidida de `isDirty`:** elegir herramienta (`SET_TOOL`) y navegar entre capas no ensucian, aunque el archivo guarde la herramienta y el par de grosor de la capa activa.

### Abiertos, asignados

| # | Hallazgo | Cuándo |
|---|---|---|
| H10 | Tres campos de gradiente se escriben en el estado sin declararse ni leerse | Fase 7 |

### Abiertos, sin decisión

- **Archivos guardados antes de v3.26.22 con trazos redimensionados:** llevan el número antiguo (dibujado a 20, redimensionado ×2: dice 20, mide 40). No se migran: se ven igual, el slider marca 20 y el primer re-estilado los redibuja al valor elegido. Falta decidir si se deja así o se detecta el desfase al cargar (exacto en Tapered, aproximado en Ink).
- **Tono de la banda y del tirador de «Mixto»** (`T.purpleLight`): calibrado visual, lo cierra Moisés.
- Los valores de dentro de `layerGradParams` no se validan al cargar.
- Desfases de documentación listados en la auditoría §6 (Apéndice C de REFERENCE.md parado en 3.25.29, atajos del Apéndice B, tabla de primitivas Di*…). No se corrigieron, salvo los que tocaba cada commit.

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
| **3B. Resto del reducer** | Capas (navegación y reordenado), paleta, FX, animación, texto; `appReducer` a su archivo | Al final `diorRender.ts` importará el reducer puro y React saldrá del grafo de `dior-render.js` |
| **5. Archivos de FX** | `canvas/risoV2.ts`, `superRiso/engineHost.ts`, tipos de `renderPipeline.ts` | Núcleo: GO explícito. `pixcheck` 0 px. Una ronda en iPad |
| **6. `StrataCanvas.tsx`** | `canvas/commitStroke.ts` y dos hooks de efectos | Los handlers de puntero y táctil piden sprint propio con iPad |
| **7. Higiene** | Borrar `components/ui/` sin usar, partir `analytics.ts` y `PreviewPage.tsx`, H10, sincronizar documentación | — |

Las fases 3B, 5, 6 y 7 son independientes entre sí.

---

## 8. Contratos que no se han roto

| Contrato | Estado |
|---|---|
| **Undo híbrido** (CLAUDE.md) | Mismo contrato. Dos ajustes en la fase 4, los dos con test: un arrastre del slider que vuelve a donde empezó no crea paso, y al deshacer en una capa de varios grosores el slider vuelve al par que regía (en una capa de un solo grosor, los mismos valores que antes) |
| **`.dior` v2** | Mismo formato, con campos **aditivos y opcionales** desde v3.26.22: `layerBrushSettings` (30 claves) y, por trazo Ink, `inkSeed` e `inkMirrored`. Una app anterior los ignora; un archivo sin ellos abre como antes. El JSON guardado fue byte-idéntico antes y después de H2. Cambia la lectura de archivos dañados (H3), de `tool` (H7) y de huecos (H6) |
| **`dior-render.js`** (contrato con el Super Riso Lab) | Mismos 3 exports (`frameOf`, `parseDior`, `renderDior`), mismo nombre de archivo, mismo grafo de 3 archivos. Abre archivos con y sin los campos nuevos y los pinta igual. Sin `react-dom`, `sonner` ni CSS inyectado. React y `soundManager` siguen dentro, como antes del refactor |
| **`file_handlers` PWA** | No tocado. Pasa por `LOAD_PROJECT` |
| **Paridad con el Lab** | No se tocó ningún shader ni pasada |
| **`_inkSmoothPass`** | No tocado; protegido por los golden, que la fase 4 no regeneró (los generadores dan la misma salida al bit sin los argumentos nuevos). Tampoco se tocó la frecuencia ni la amplitud del ruido de Ink |

---

## 9. Límites: lo que no está verificado

- **Nada se probó en iPad.** Todo lo de navegador se hizo en el navegador integrado de escritorio.
- Los cambios de persistencia se validaron por los caminos reales (Ctrl+S, abrir archivo, autoguardado, «Continuar trabajo anterior») con las descargas interceptadas: **no se escribió ningún archivo real en disco**. El aviso al salir se comprobó con un evento sintético, no cerrando la pestaña.
- El único `.dior` real anterior a v2.3.0 que hay en el repo es la escena de ejemplo, y no guarda `tool`; el caso `tool: 'brush'` antiguo se prueba con un archivo construido con las claves de entonces.
- `pixcheck`, `alphaleak` y `__timelapseCheck()` no se han pasado: ningún commit tocó el código de render ni de export. La fase 4 sí cambia lo que se pinta de un trazo Uniform redimensionado (engorda), por decisión.
- **«Mixto» no está validado a ojo por Moisés**, ni en escritorio ni en iPad. El tirador atenuado va por `accent-color`, que cada navegador pinta a su manera.
- Ink y redimensionar: el contorno regenerado coincide con el redimensionado (0 px) solo si los dos grosores son ≥ 7,5 px; por debajo se separan hasta 4 px (dos suelos en píxeles del generador, sin tocar).
- Los tests no cubren píxeles, WebGL ni gestos.
