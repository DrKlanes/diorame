# Vista frontal plana en CINEMA — investigación y propuesta

**Estado (2026-11-24): PROPUESTA, sin implementar.** Partida: v3.26.69 (`b99a871`), 692 tests en verde. Toca núcleo (proyección en
`renderFrame` / `renderLayerBody`; handlers del lienzo): ciclo completo investigar → proponer → **GO de Moisés** → implementar.
[VERIFICADO] = leído en el código con archivo:línea; [POR MEDIR] = deducido del código, pendiente de arnés o del ojo de Moisés.

Documentos relacionados: `docs/fx-in-draw.md` (proyecto en pausa que persigue casi el mismo objetivo, ver §9), REFERENCE.md §10
(«Render Pipeline Architecture»), CLAUDE.md («Tocar StrataCanvas.tsx», «Comportamientos protegidos»).

---

## 0 · Resumen y recomendación

⭐ **Opción C — «la proyección de DRAW dentro de CINEMA».** El preset nuevo no inventa una cámara: en `renderLayerBody` la
**geometría** se proyecta con la rama de DRAW que ya existe (`transformPoint.ts:101-111`), con el zoom/pan de DRAW y la cámara de
DRAW (`z` = capa activa), mientras `fxEnabled` sigue siendo el de CINEMA (`renderPipeline.ts:317`, **la puerta de FX no se toca**).
Los FX que necesitan profundidad (niebla, DoF) leen la distancia de la cámara de CINEMA en reposo, como hoy.

Por qué: es la única opción que **coincide al píxel con DRAW** (misma función, mismos números), hereda gratis el encuadre, el
marco de Formato (`frameInView`) y el export de rectángulo (`renderRectSnapshot`), no cambia la forma de `RenderContext`, no toca
`dior-render.js` y deja los 11 presets existentes byte-idénticos. Coste estimado: ~8 commits pequeños (§8).

**Una contradicción que decide Moisés antes de nada (D1):** DRAW **no es ortográfico**. Tiene una perspectiva residual
(`DRAW_FOCAL_LENGTH = 10000`, `transformPoint.ts:102-103`): cada capa se escala `10000 / (10000 − 150·Δ)` respecto a la activa,
~1,5 % por capa; a 9 capas de distancia, **+15,6 % / −11,9 %**. «Sin paralaje» y «igual que DRAW» no son lo mismo. Recomiendo
**igual que DRAW** (es lo que el usuario dibujó, lo que muestra el marco de Formato y lo que exporta hoy el PNG de DRAW).

---

## 1 · Cámara y proyección

### 1.1 Cómo funciona hoy [VERIFICADO]

| Pieza | Dónde | Qué hace |
|---|---|---|
| Tipo de preset | `types/strataTypes.ts:42` | `CinematicType` = 11 literales; `state.cinematicType` (`:281`) |
| Reducer | `state/cinema.ts:20-23` | `SET_CINEMATIC_TYPE` cambia el preset y marca `isDirty` si cambia |
| Lista de la UI | `bottombar/CameraPresetsZone.tsx:7-19` | `PRESETS` en orden; icono `cam-*` (`design-system/icons.ts`), tooltip i18n `bottombar.view.preset.*` |
| Movimiento | `canvas/cinematicCamera.ts:69-241` | `computeCinematicTick`: una rama `if` por preset escribe `nc` (x, y, z, rotation); el *handheld* se suma después a todos (`:243-282`) |
| Tick | `renderPipeline.ts:730-758` | fase 5: el tick escribe `cameraRef` para el frame **siguiente** (nunca despacha) |
| Cámara al entrar en CINEMA | `ControlsV2.tsx:72-87` | `UPDATE_CAMERA {0,0,500}`; `INIT_CINEMA_VIEW` solo en proyecto nuevo. Al volver a DRAW: `{0,0,activeZ,0}` |
| Ref ↔ estado | `StrataCanvas.tsx:305-309` | `cameraRef ← state.camera` **solo en DRAW**; en CINEMA solo lo escribe el tick |
| Óptica del frame | `renderPipeline.ts:337-363` | `quantizePixelArtCamera`, `effectiveCameraZ = camera.z + viewZoomOffset` (solo CINEMA), `FL` (el preset `zoom` lo pisa por frame) |
| Zoom/pan de vista | `renderPipeline.ts:471-481` | `viewZoom/viewPan` = `drawingZoom/drawingPan` **solo en DRAW**; en CINEMA 1 / 0 (salvo el vaivén de `arc`) |
| Proyección por capa | `renderLayerBody.ts:101-128` | `shapeZ` (×3 `CINEMATIC_DEPTH_MULTIPLIER` en CINEMA), `camZ`, `activeFL` (`DRAW_FOCAL_LENGTH` en DRAW, `FL` en CINEMA), recorte `NEAR_CLIP` y fundido < 250 |
| Proyección del punto | `transformPoint.ts:99-143` | **dos ramas**: DRAW (`:101-111`: escala `sDraw`, centro de pantalla, `viewZoom/viewPan`, sin rotación ni distorsión) y CINEMA (`:113-142`: escala de capa, rotación, pivote arc/orbit, distorsión) |
| FX de profundidad | `composeLayer.ts:76-97`, `postProcessing.ts:70-95` | niebla con `FL + layerAvgZ`; DoF con `|layerAvgZ − fxFocusDist|·FL/400` (`layerAvgZ = dz` de la capa) |
| Precedente «plano» | `renderLayerBody.ts:112-123`, `renderPipeline.ts:397-399` | CINEMA + animación + `isAnimationFlatZ`: aplana `shapeZ = 0`, todas las capas al mismo `dz`, DoF neutro. Prueba de que CINEMA ya admite proyección plana sin romper FX |

### 1.2 Las opciones

| | (A) Ortográfica real | (B) Teleobjetivo extremo | ⭐ (C) Proyección de DRAW dentro de CINEMA |
|---|---|---|---|
| **Qué es** | Rama nueva en `createProjectInto`: escala 1 para todas las capas | `FL` enorme (p. ej. 10⁶) + cámara lejos, sin tocar el modelo | Con el preset `flat`, `renderLayerBody` pasa `isCinematic: false` a la proyección y la cámara de DRAW; FX de CINEMA intactos |
| **Núcleo** | `transformPoint.ts` (rama nueva), `renderLayerBody`, `renderFrame` (zoom/pan) | Solo el tick… en teoría; en la práctica zoom/pan se traducen a cámara y `viewZoomOffset` | `renderFrame` (cámara y zoom/pan del frame plano, ~10 líneas) y `renderLayerBody` (~6 líneas). Sin campo nuevo en `RenderContext` ni en `PerFrameComputed` |
| **Riesgo** | Medio: rama nueva sin precedente | **Alto**: niebla `FL + dz` satura (todo gris), DoF `·FL/400` explota a su tope (todo desenfocado), recorte y fundido dependen de `FL` | Bajo-medio: reutiliza una rama probada (es la de DRAW, la de `pixcheck`, la de `dior-render.js`) |
| **¿Coincide con DRAW sin FX?** | **No**: difiere hasta 15,6 % en las capas lejos de la activa (§0, D1) | **No**: aproxima la ortográfica, no DRAW; además deriva en coma flotante | **Sí, al píxel** [POR MEDIR con `flatcheck`, §7]: misma función, mismos argumentos |
| **Formato / Centrar vista** | Hay que escribir un `frameInView` ortográfico | Sin correspondencia: el marco vive en el plano de la capa 0 con la proyección de DRAW | Gratis: `frameInView`, `fitViewToRect`, `renderRectSnapshot` ya son la proyección de DRAW |
| **Gestos** | Zoom/pan de DRAW, OK | Hay que mapear pinch y pan a cámara: no son «los gestos de DRAW» | Zoom/pan de DRAW tal cual (`SET_DRAWING_ZOOM`) |
| **Niebla / DoF / partículas** | Necesitan una distancia: hay que inventarla | Rotos (ver riesgo) | Distancia de la cámara de CINEMA en reposo (§1.3) |
| **`dior-render.js` / Lab** | Sin impacto (renderiza DRAW) | Sin impacto | Sin impacto: `diorRender.ts:82` fuerza `mode: 'drawing'` y FX apagados |

**Veredicto: C.** B queda descartada (rompe niebla y DoF por construcción). A es la variante «pura» de C: si Moisés elige en D1
«sin paralaje de verdad», se implementa como C con `sDraw = 1` y un `frameInView` sin parallax — más código y deja de coincidir con
DRAW y con el marco de Formato.

### 1.3 Diseño de C, en concreto

1. **`isFlatView(state)`** = `mode === 'cinematic' && cinematicType === 'flat'` y **`flatViewCamera(state)`** =
   `{ x: 0, y: 0, z: currentLayerIndex · −BASE_DEPTH_STEP, rotation: 0 }` (la cámara que DRAW pone en `ControlsV2.tsx:83-84`), en
   un módulo puro (`utils/flatView.ts`). Fuente única para el render, `RESET_DRAWING_VIEW` y los exports.
2. **`renderFrame`** (núcleo, GO):
   - con vista plana, `currentCamera = flatViewCamera(state)` **cada frame**, leído del estado y no de `cameraRef`: así no hay un
     frame con la cámara animada del preset anterior (el tick de CINEMA escribe `cameraRef` un frame por delante,
     `renderPipeline.ts:755`) y la cámara sigue a la capa activa igual que en DRAW;
   - `quantizePixelArtCamera` **no** mueve esa cámara (decisión ya tomada en `fx-in-draw.md` §3: «el dibujo no puede saltar»); la
     cuantización de `viewPan` por `pSize` (`:483-489`) se queda: es un salto de pantalla, no del dibujo;
   - `viewZoom/viewPan` = `drawingZoom/drawingPan` también con vista plana (`:471-472`);
   - el marco de Formato se dibuja en la fase 4 también con vista plana (`:723-727`, ayuda de pantalla, nunca en export);
   - el marcador de POI no (`:691`).
3. **`renderLayerBody`** (render, GO): con vista plana, `transformPoint`, `isLocked3D`, `isAnimFlat`, `shapeZ`, `camZ`,
   `activeFL`, el recorte y la opacidad se calculan **con las reglas de DRAW** (ninguna capa se recorta ni se funde: en DRAW
   `10000 + dz` nunca baja de 250). Lo único que conserva la regla de CINEMA es `layerAvgZ` (la entrada de niebla y DoF): la
   distancia de cada capa a una cámara en `z = activeZ + viewZoomOffset` con la focal y la separación del proyecto. La niebla gradúa
   por capa (perspectiva atmosférica sobre una lámina plana) y el DoF enfoca la capa elegida, con los mismos sliders que en CINEMA.
   [POR MEDIR a ojo — si no convence, D5: neutralizarlos como hace `isAnimationFlatZ`.]
4. **`computeCinematicTick`**: rama `flat` estática (no toca `nc`) y **sin handheld** (el bloque `:245` se salta con `flat`). El
   tick sigue corriendo: `wiggleFrame` avanza, así que Stop Motion, partículas, grano y la reimpresión de Super Riso siguen vivos.
5. **Lo que NO cambia:** `fxEnabled = isCinematic && fxMasterEnabled` (protegido), el gancho `beginSuperRisoFrame` y la ranura de
   la fase 3 (protegidos), el orden de capas y la composición, los 11 presets (todas las ramas nuevas están detrás de `flat`).

### 1.4 FX uno a uno en la vista plana

| FX | En Plana | Nota |
|---|---|---|
| Grano, grunge, viñeta, aberración, Riso antiguo | Igual que en CINEMA | De pantalla; animados como en CINEMA (Plana no es DRAW: no se congelan) |
| Super Riso (3 técnicas) | Igual que en CINEMA | Hoja = el lienzo, como en CINEMA. Pan/zoom rompen la quietud del refinado porque cambian el objeto `state` (`superRiso/quality.ts:71-79`): no hay que añadir nada al vector `motion` |
| Resplandor, Pixel Art | Igual | Pixel Art sin cuantizar la cámara (§1.3.2) |
| Stop Motion | Vivo | `wiggleFrame` sigue avanzando |
| Partículas | Vivas, proyectadas en plano | Se ven distintas que en CINEMA (sin escala por profundidad) [POR MEDIR a ojo] |
| Niebla, DoF | Por capa, con distancia de CINEMA | D5 |
| Distorsión | **Apagada** | Es de lente; la rama de DRAW no la aplica (`transformPoint.ts:101-111`). En el panel, atenuada con «no aplica en Plana» |

---

## 2 · Gestos

### 2.1 Enrutado actual [VERIFICADO]

| Entrada | DRAW | CINEMA `orbit` | Resto de CINEMA |
|---|---|---|---|
| Rueda (`useCanvasWheelZoom.ts:25-60`) | zoom al cursor + clamp `MAX_PAN` → `SET_DRAWING_ZOOM` | `SET_VIEW_ZOOM_OFFSET` ±100 | ignorada (`:25`) |
| Espacio (`useSpacePan.ts:114`) | arma el pan; toque = `RESET_DRAWING_VIEW` (`:101`) | ignorado | ignorado |
| Botón central (`pointerDownHandler.ts:44-82`) | pan | zoom vertical | **ya hace pan de DRAW** (cae a `:69-81`), invisible hoy |
| Espacio + arrastre (`pointerDownHandler.ts:91`) | pan | — | — (gate `mode === 'drawing'`) |
| Movimiento con pan (`pointerMoveUpHandlers.ts:33-57`) | `dragPan` → `SET_DRAWING_ZOOM` | zoom | `dragPan` (invisible) |
| Doble clic / doble toque (`pointerDownHandler.ts:122-141`) | — | POI | POI (`frameCinemaPoint`) |
| Arrastre simple | trazo | órbita/pan (`pointerMoveUpHandlers.ts:167-176`) | nada |
| 2 dedos (`touchHandlers.ts:25-75, 112-142, 171-201`) | pinch + pan (`pinchZoom`/`pinchPan`); toque de 2 = deshacer, de 3 = rehacer | rotación + pinch | nada |

### 2.2 ¿Se reutiliza el enrutado de DRAW sin tocar el timing? **Sí.**

Ningún cambio reordena, envuelve ni mueve un handler: son **condiciones ampliadas** (`mode === 'drawing'` → `… || flat`) o ramas
nuevas detrás de `flat`. Para los demás modos el código que corre es el mismo, y se demuestra con el arnés (125 escenarios
idénticos, §7). Exactamente:

| Archivo | Cambio |
|---|---|
| `hooks/useCanvasWheelZoom.ts:25` | la vista plana entra por la rama de DRAW |
| `hooks/useSpacePan.ts:114` | la vista plana arma el pan (y `cinematicType` entra en el `Pick` y en las dependencias del efecto) |
| `canvas/pointerDownHandler.ts:91` | Espacio + arrastre también con vista plana |
| `canvas/pointerDownHandler.ts:122` | sin POI con vista plana (no hay cámara que apuntar) |
| `canvas/touchHandlers.ts:25, 112, 171` | la vista plana usa la rama táctil de DRAW **entera**: pinch, pan de 2 dedos y toques de deshacer / rehacer (`Ctrl+Z` ya funciona en CINEMA, `useKeyboardShortcuts.ts:47`, antes de la puerta de modo de `:74`). El abandono del gizmo es inocuo (no hay transformación activa en CINEMA) |
| botón central | sin cambio: ya hace pan de DRAW fuera de `orbit` |
| `state/drawView.ts:105-114` | `RESET_DRAWING_VIEW` usa `flatViewCamera(state).z` en vez de `state.camera.z` (en CINEMA vale 500 y encuadraría mal el Formato) |

**D3 (propuesta, no pedida):** arrastre simple (ratón, 1 dedo, Pencil) = pan en Plana, por la misma vía que el botón central. En
Plana no se dibuja y el arrastre simple no hace nada; `orbit` ya usa 1 dedo para pan. Recomendado **sí**; si Moisés prefiere
«exactamente DRAW», se queda en nada.

---

## 3 · Herencia de vista, Formato y exportación

### 3.1 Estado que existe [VERIFICADO]

- `drawingZoom`, `drawingPan`: `SET_DRAWING_ZOOM` (`state/drawView.ts:97-103`). **No se guardan** en el `.dior`: `LOAD_PROJECT`
  los pone a 1 / 0 (`loadProject.ts:227-228`).
- `format`: `SET_FORMAT` (`drawView.ts:116-119`), se guarda (`diorPayload.ts:29-30`), vive en el plano de la capa 0 y se lleva al
  de la activa con `frameInView(format, camera.z, isAnimationMode)`.
- `RESET_DRAWING_VIEW` encaja el Formato si lo hay (`drawView.ts:105-114`); botón táctil en `ViewPills` (Rejilla · Formato ·
  Centrar vista), **solo en DRAW** (`ControlsV2.tsx:119-133`).
- Export PNG: en CINEMA, *pantalla* = el bitmap vivo reescalado; *HQ* = re-render ×2 (`exportHandlers.ts:139-162`). El encuadre
  Formato / Dibujo completo / Capas ZIP es **solo DRAW** (`:100-118`, gate `isDraw`). GIF y secuencia PNG re-renderizan con el
  estado; MP4 graba el lienzo vivo.

### 3.2 Cómo se conecta

- **Herencia:** Plana **comparte** `drawingZoom/drawingPan` con DRAW. Al entrar desde DRAW se ve exactamente lo mismo, sin copiar
  nada ni estado nuevo. Consecuencia: el pan/zoom hecho en Plana se ve al volver a DRAW (**D4**). Lo recomiendo: es una sola
  ventana sobre el papel; la alternativa (vista propia de Plana copiada al entrar) duplica estado y puede desincronizar el Formato.
- **Formato:** el marco se dibuja en Plana (§1.3.2) y las `ViewPills` aparecen también en Plana (Formato · Centrar vista; la
  rejilla de composición, opcional): es la alternativa táctil al toque de Espacio (regla de tablet de CLAUDE.md).
- **Export PNG en Plana:** como hoy en CINEMA (*pantalla* y *HQ* ya salen planos solos: re-renderizan `renderFrame` con el
  estado), más **«Encuadre: Formato»** si hay marco, reutilizando `renderRectSnapshot` (`formatSnapshot.ts:17-50`: ya fuerza zoom 1
  y el pan del rectángulo) con la cámara de `flatViewCamera`. **Fondo solo «papel»** en Plana: liso y transparente se reconstruyen
  desde el buffer de capas y perderían viñeta, grano, grunge y aberración, y Super Riso no tiene alfa (`fx-in-draw.md` §2.3 y
  §7.7). «Dibujo completo» y «Capas (ZIP)» se quedan en DRAW.
- **Vídeo (GIF, secuencia PNG, MP4):** salen planos sin tocar nada (mismo estado). Con Formato: GIF y secuencia PNG pueden
  recortar al marco por la misma vía que el PNG (sesión de rectángulo); **MP4 graba el lienzo vivo** y no puede sin tocar el
  grabador. Propuesta v1: vídeo con el encuadre de pantalla; recorte de vídeo al Formato como commit aparte si Moisés lo quiere
  (**D6**).

---

## 4 · Persistencia

- `cinematicType` **ya se guarda** (`diorPayload.ts:20`, vía `cinemaViewForSave`) y `LOAD_PROJECT` lo valida contra una lista cerrada
  (`loadProject.ts:162-163`). Hace falta **añadir `'flat'` a esa lista y al tipo**: cambio aditivo, sin campo nuevo.
- Compatibilidad: una app antigua que abra un `.dior` con `flat` cae al default (`forward`) sin romper. El Lab no se entera
  (`diorRender.ts:82` renderiza DRAW; el contrato de `dior-render.js` no cambia).
- El encuadre de Plana no se guarda (tampoco el de DRAW hoy). Lo reproducible para exportar es el Formato, que sí se guarda.
  Guardar el zoom/pan (de DRAW y Plana a la vez) sería un campo aditivo nuevo con su entrada en `buildDiorFields` +
  `LOAD_PROJECT` + `isDirty`: **fuera de alcance**, decisión aparte.
- `isDirty`: elegir Plana ensucia como cualquier preset (`cinema.ts:22`). El pan/zoom no ensucia (no se guarda): sin entrada nueva
  en `tests/isDirty.test.ts`.

---

## 5 · Default al entrar en CINEMA

Ser el primero de la lista **no cambia nada**: el preset inicial sale de `CINEMA_VIEW_DEFAULTS.cinematicType = 'forward'`
(`constants/cinemaView.ts:8`) en un proyecto nuevo, y del fichero en uno abierto. **Recomiendo no cambiarlo:**

1. Ese default también rellena el hueco de los ficheros antiguos sin `cinematicType` (`loadProject.ts:163`): cambiarlo cambiaría
   cómo se abren proyectos ya guardados.
2. La primera impresión de CINEMA es el parallax; Plana es una herramienta de acabado, a un clic y la primera de la fila.

Tampoco propongo seleccionar Plana sola al entrar desde DRAW: el preset es del proyecto.

---

## 6 · UI e i18n

- `CameraPresetsZone.tsx:7`: `{ type: 'flat', icon: 'cam-flat', tooltipKey: 'bottombar.view.preset.flat' }` **primero**. El
  icono `cam-flat` va como dato en `design-system/icons.ts` (y en el grupo «Camera Presets», `:373`); Moisés dibuja el definitivo.
- Nombre: **«Plana» / «Flat»** ⭐ (sigue el patrón adjetivo de «Narrativa»; tooltip: «Vista plana: sin perspectiva, como en Dibujo,
  con los FX»). Alternativas: «Frontal» / «Front» (describe el encuadre, no la ausencia de profundidad), «Lámina» / «Print» (evoca
  la impresión riso, pero choca con «Impresión» de Super Riso). **D2.**
- Con Plana activa, atenuados (patrón `flatZMode` de `CameraSlidersZone.tsx:22`): velocidad, cámara en mano, focal, distancia y
  separación. El POI deshabilitado como en Narrativa (`POIPill.tsx:40`). El botón de profundidad de la animación
  (`AnimationPlayerUI.tsx:146`), atenuado (ver §8, C7). La distorsión del panel de FX, atenuada.
- **Cámara en mano (D7):** el usuario pidió «desactivada por defecto en este preset». v1: Plana la ignora sin tocar el flag global
  (`isHandheldEnabled` es del proyecto, no del preset) y el botón se atenúa. Si Moisés la quiere activable en Plana: temblor como
  desplazamiento de pantalla (`viewPan += shake·viewZoom`, sin giro: la rama de DRAW no rota), commit aparte.
- i18n: `bottombar.view.preset.flat` y el aviso de distorsión, en `en.ts` y `es.ts`.

---

## 7 · Tests y arneses

**En Node (Vitest):**
- `tests/cinematicCamera.test.ts` (nuevo): `computeCinematicTick` con `flat` → cámara idéntica a la de entrada, `newShake` cero
  **con** handheld activo, `focusLayerIndex` null, `wiggleFrame` avanza.
- `utils/flatView.ts`: `isFlatView` y `flatViewCamera` (capa activa → `z`).
- Reducer: `RESET_DRAWING_VIEW` en Plana con Formato encaja el marco con la `z` de la capa activa (no con 500);
  `SET_CINEMATIC_TYPE 'flat'` ensucia; `LOAD_PROJECT` acepta `flat` y rechaza basura; ida y vuelta en `dior.roundtrip.test.ts`.
- Handlers (`tests/helpers/handlerScenarios.ts` + referencia): escenarios nuevos con `cinema('flat')` — rueda (si el arnés la
  cubre; si no, matriz de escritorio), Espacio + arrastre, botón central, pinch, pan de 2 dedos, toque de 2 dedos = deshacer, doble
  clic sin POI, arrastre simple (D3). En **commit de test aparte**, regenerados con `--rev` del código anterior (fijan que hoy
  `flat` no hace nada) y el commit de gestos invierte esas expectativas: el diff es la prueba. Los 125 actuales, idénticos.

**En el navegador:**
- **`tools/draw-stress/harness/flatcheck.js`** (nuevo, sobre el patrón de `pixcheck.js`): los 7 casos de `pixcheck` renderizados
  como DRAW (`renderDrawSnapshot`, fondo papel) y como CINEMA Plana con `fxMasterEnabled = false`, `Math.random` sembrado, mismo
  backend (`willReadFrequently`): **0 px y mismo SHA-256**. Autocomprobación: con `forward` debe fallar.
- `pixcheck` / `pixcheck2` `'before'` → `'after'`: DRAW sin un píxel de cambio. `alphaleak` y `__timelapseCheck()` en verde.
- CINEMA intacto: hash sembrado de `forward`, `orbit` y `storytelling` con FX (grano apagado) antes/después: 0 px.
- Matriz de escritorio de handlers (`desktop-matrix.js`, `await __handlersMatrix()`): 32/32 + los casos nuevos.
- Export: PNG pantalla / HQ / Formato en Plana, descargas interceptadas (`HTMLAnchorElement.prototype.click` +
  `URL.createObjectURL`, CLAUDE.md «Verificación»).

**El ojo de Moisés (no lo sustituye nada de lo anterior):** el aspecto de niebla, DoF, partículas y Super Riso en Plana.

---

## 8 · Plan de implementación por commits

Cada commit con bump + tag anotado + `npm test` + typecheck + build; push al cerrar cada uno si todo está en verde.

| # | Commit | Archivos | Núcleo | Verificación |
|---|---|---|---|---|
| C1 | `feat(cinema): 'flat' preset type, static tick, load/save` — sin UI, sin render | `strataTypes.ts`, `cinematicCamera.ts`, `loadProject.ts`, `utils/flatView.ts` (nuevo), tests Node | No | Node; ningún preset existente cambia |
| C2 | `test(handlers): flat-view scenarios` — referencia con el código de C1 | `handlerScenarios.ts`, referencia | No | 125 previos idénticos |
| C3 | `feat(render): flat view projects as DRAW with CINEMA FX` | `renderPipeline.ts`, `renderLayerBody.ts`, `drawView.ts` (`RESET_DRAWING_VIEW`) | **Sí — GO + Opus + impacto por escrito** | `flatcheck` 0 px; `pixcheck/2`, `alphaleak`, timelapse; hash CINEMA sin cambio |
| C4 | `feat(canvas): DRAW gestures in the flat view` | `useCanvasWheelZoom.ts`, `useSpacePan.ts`, `pointerDownHandler.ts`, `touchHandlers.ts` | Handlers (sin cambio de timing; si al implementarlo cambia, se para) | arnés: solo cambian los escenarios `flat`; matriz de escritorio |
| C5 | `feat(ui): «Plana» first in the presets, dimmed camera controls, ViewPills` | `CameraPresetsZone.tsx`, `icons.ts`, `CameraSlidersZone.tsx`, `CameraSpeedZone.tsx`, `POIPill.tsx`, `ControlsV2.tsx`, i18n | No | captura 1180×820, 820×1180, 1366×1024, 1920×1080 |
| C6 | `feat(export): Formato framing for the flat view PNG` | `exportHandlers.ts`, `ExportPill.tsx` / `DrawCaptureSection.tsx` | Forma de opciones de export (sin tocar `RenderContext`) | PNG pantalla / HQ / Formato; descargas interceptadas |
| C7 | `feat(anim): flat view animation` — en Plana + animación, la profundidad de niebla/DoF se aplana como con `isAnimationFlatZ` (si no, cada fotograma es una capa a otra distancia y la niebla/DoF **parpadean** al reproducir) | `renderPipeline.ts:397`, `renderLayerBody.ts`, `AnimationPlayerUI.tsx` | **Sí — GO** | reproducción, GIF y secuencia PNG; Stop Motion y Super Riso vivos |
| C8 | `docs: flat view` | REFERENCE.md §10 (filas de los archivos tocados + `utils/flatView.ts`), Apéndice C, CLAUDE.md (una línea en «Dónde…» si procede), `fx-in-draw.md` (relación, §9), este doc → estado HECHO | No | — |

Ronda de iPad: **un solo push** tras C6/C7 (pestaña privada de Safari, versión confirmada en pantalla).

---

## 9 · Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Núcleo de `renderFrame` (cámara y zoom/pan del frame) | GO, Opus, impacto por escrito; todo detrás de `isFlatView`; hash de CINEMA y `pixcheck` antes/después |
| R2 | Sincronía `cameraRef` ↔ render: el tick escribe la cámara del frame siguiente | Plana no lee `cameraRef` para proyectar: `flatViewCamera(state)` cada frame (§1.3.2) |
| R3 | Pixel Art moviendo la cámara de Plana | Se salta `quantizePixelArtCamera` para esa cámara (decisión ya tomada en `fx-in-draw.md` §3) |
| R4 | Niebla / DoF / partículas con aspecto raro en plano | Lo juzga Moisés en `localhost:3000`; plan B (D5): neutralizarlos en Plana |
| R5 | Pan/zoom compartido DRAW ↔ Plana sorprende | D4; si no gusta, vista propia de Plana (estado nuevo) |
| R6 | Parpadeo de niebla/DoF en la animación | C7 aplana la profundidad en Plana + animación |
| R7 | Coste: Plana renderiza cada frame como cualquier preset (sin el *idle-skip* de DRAW) | Mismo coste que CINEMA hoy, no peor; con FX animados el render continuo es necesario |
| R8 | Romper el Lab | No se toca `dior-render.js`; `diorRender.ts` sigue forzando DRAW |
| R9 | Fichero con `flat` en una app antigua | Cae a `forward` (lista cerrada de `LOAD_PROJECT`) |
| R10 | Gestos de otros modos alterados | Solo condiciones ampliadas / ramas detrás de `flat`; arnés 125/125 idéntico; si algo exige reordenar un handler, se para (CLAUDE.md) |
| R11 | **Solapamiento con `docs/fx-in-draw.md`** | Plana entrega casi todo su objetivo («ilustración con FX, encuadre directo, PNG con FX») sin abrir la puerta de FX de DRAW, sin congelados, sin inspector de dos caras y sin override de fondo. **Decisión de producto (D8):** tras Plana, ¿sigue haciendo falta F1–F6 de FX en DRAW? |

---

## 10 · Decisiones para Moisés

| # | Pregunta | Recomendación |
|---|---|---|
| **D1** | ¿Plana = DRAW al píxel (con su ~1,5 %/capa) o ortográfica pura? | **Igual que DRAW** |
| **D2** | Nombre | **«Plana» / «Flat»** |
| **D3** | Arrastre simple (ratón / 1 dedo / Pencil) = pan en Plana | **Sí** |
| **D4** | Zoom/pan compartido con DRAW | **Compartido** |
| **D5** | Niebla y DoF en Plana: por capa con la distancia de CINEMA, o neutros | **Por capa**, y juzgar a ojo |
| **D6** | Vídeo con Formato | v1 encuadre de pantalla; recorte GIF / PNG-seq al marco como commit aparte si se quiere |
| **D7** | Cámara en mano en Plana | v1 ignorada y atenuada; temblor de pantalla como extra si se quiere |
| **D8** | `fx-in-draw.md` tras Plana | Reevaluar después de probar Plana |

---

## 11 · Matriz de validación

**Escritorio** (Chrome, 1920×1080 y 1366×1024, panel visible):

| Caso | Esperado |
|---|---|
| DRAW con zoom 1,6 y pan, capa activa 3 → CINEMA → Plana, FX maestro apagado | Idéntico a DRAW (`flatcheck` 0 px + captura) |
| Lo mismo con FX (grano, Super Riso Riso / Fotocopia / Stencil, resplandor, Pixel Art) | El dibujo no se mueve ni salta; FX vivos |
| Rueda, Espacio + arrastre, toque de Espacio, botón central, arrastre simple (D3) | Zoom al cursor; pan; Centrar vista encaja el Formato; pan; pan |
| Doble clic | Sin POI |
| Plana → `forward` → Plana | Los presets de siempre, sin cambios; sin frame con la cámara vieja |
| Volver a DRAW | Mismo zoom/pan que había en Plana (D4) |
| PNG pantalla / HQ / Formato | Plano, con FX, fondo papel; HQ = misma impresión con más resolución |
| Animación: reproducir, GIF, secuencia PNG | Plano, sin parpadeo de niebla/DoF, Stop Motion vivo |
| Guardar `.dior` con Plana → reabrir | Vuelve en Plana; Formato intacto |
| Distorsión activa | Sin efecto en Plana, chip atenuado |

**iPad** (Safari, PWA y pestaña privada, versión confirmada; tras el push de C6/C7):

| Caso | Esperado |
|---|---|
| Pinch y pan de 2 dedos | Como en DRAW, sin tirones |
| Toque de 2 dedos / 3 dedos | Deshacer / rehacer |
| 1 dedo y Pencil arrastrando | Pan (D3) o nada |
| Palma sobre el lienzo durante un pinch | Sin saltos (el `touchstart` nativo cancelado sigue igual) |
| Centrar vista desde las `ViewPills` | Encaja el Formato |
| Super Riso en Plana durante y después de un pinch | *Preview* durante el gesto, refinado al soltar |
| Export PNG Formato A4 300 ppp con Super Riso | Sale, sin lienzo en blanco (`canvasFits`) |
| Reproducción de animación en Plana | Fluida; sin parpadeo |
| Coste sostenido con Super Riso en reposo | Igual que cualquier preset de CINEMA |
