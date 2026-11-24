# Vista frontal plana en CINEMA — investigación y propuesta

**Estado (2026-11-24): HECHO — v3.26.71 → v3.26.78, publicado.** Implementado según la opción C con las decisiones D1–D8 de
Moisés (§10); lo hecho, los resultados de cada criterio y las decisiones tomadas durante la implementación, en §12. **Falta la ronda
de iPad (§11, ordenada por riesgo) y el juicio a ojo de Moisés.** Las secciones 0–9 son la propuesta tal como se aprobó (v3.26.70);
donde la implementación se apartó, lo dice §12.3. [VERIFICADO] = leído en el código o medido; [POR MEDIR] = pendiente.

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
| Distorsión | **Apagada** (propuesta) → **activa desde v3.26.80** | Es de lente; la rama de DRAW no la aplicaba. Desde v3.26.80, la de CINEMA con límite monótono, centrada en el marco de Formato o el viewport (§13) |

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

## 10 · Decisiones (DECIDIDAS por Moisés, 2026-11-24, todas según la recomendación)

| # | Pregunta | Decisión |
|---|---|---|
| **D1** | ¿Plana = DRAW al píxel (con su ~1,5 %/capa) o ortográfica pura? | **Idéntica a DRAW al píxel** (no ortográfica) |
| **D2** | Nombre | **«Plana» / «Flat»** |
| **D3** | Arrastre simple (ratón / 1 dedo / Pencil) = pan en Plana | **Sí** |
| **D4** | Zoom/pan compartido con DRAW | **Compartido** |
| **D5** | Niebla y DoF en Plana | **Por capa, con la distancia de CINEMA**; se juzga a ojo |
| **D6** | Vídeo con Formato | **v1 con el encuadre de pantalla**, sin recorte a Formato |
| **D7** | Cámara en mano en Plana | **Ignorada y atenuada** |
| **D8** | `fx-in-draw.md` tras Plana | **En pausa hasta probar Plana** |

Orden de commits decidido: C1 → C2 → C3 → C4 → C6 → C7 → C5 (la UI, la última, es la que expone la feature) → C8. GO previo para
C3 y C7 condicionado a sus criterios (§7).

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

**iPad** (Safari, pestaña privada o PWA tras aceptar «Recargar», versión **3.26.78** confirmada en pantalla). Ordenada por riesgo:
lo de arriba puede romper el trabajo; lo de abajo es juicio estético.

| # | Riesgo | Caso | Esperado |
|---|---|---|---|
| 1 | Alto | **1 dedo arrastrando y llega el 2.º (pinch)** | El pinch toma el relevo sin saltos; al levantar un dedo, nada salta. (En la suite desde v3.26.81: `flat/touch1/pan/second-finger-lands/pinch-takes-over`) |
| 2 | Alto | **Pencil arrastrando (pan) con la palma apoyada** | El pan sigue al Pencil; la palma no lo reinicia ni lo mueve. (En la suite desde v3.26.81 solo «no lo reinicia»: `flat/pen/pan/palm-lands/pan-not-reseeded`; si la palma emite `pointermove` o se levanta antes, ver `docs/ux-debt.md`) |
| 3 | Alto | Pinch y pan de 2 dedos en Plana | Como en DRAW, sin tirones; tras el pinch, un dedo no deja «trazo fantasma» (no hay trazos en CINEMA) |
| 4 | Alto | Toque de 2 dedos / 3 dedos en Plana | Deshacer / rehacer, como en DRAW (afecta al dibujo, visible en Plana) |
| 5 | Alto | **1180×820 horizontal (iPad Air / Pro 11")** | La barra de cámara va ahora en **dos filas en TODOS los presets** (umbral 1100 → 1300, §12.3); nada solapado; el panel de FX cabe encima |
| 6 | Medio | Píldora de encuadre: Formato (popover) y Centrar vista con el dedo | El popover se abre dentro de pantalla; Centrar vista encaja el marco |
| 7 | Medio | Super Riso en Plana durante y después de un pinch | *Preview* durante el gesto, refinado al soltar; sin tirones |
| 8 | Medio | Export PNG Formato A4 300 ppp con Super Riso | Sale, sin lienzo en blanco (`canvasFits`), con el encuadre del marco |
| 9 | Medio | Reproducción de animación en Plana (con niebla y DoF activos) | Fluida y **sin parpadeo** de niebla/DoF entre fotogramas |
| 10 | Bajo | Coste sostenido en Plana con Super Riso en reposo | Igual que cualquier preset de CINEMA (Plana no tiene el *idle-skip* de DRAW) |
| 11 | Juicio | **Niebla en Plana** (por capa, con la distancia de CINEMA: D5) | Moisés decide si la perspectiva atmosférica sobre la lámina plana se ve bien; plan B: neutralizarla en Plana |
| 12 | Juicio | **DoF en Plana** (enfoca la capa elegida) | Ídem; plan B: DoF neutro en Plana |
| 13 | Juicio | **Partículas en Plana** (proyectadas sin escala por profundidad) | Moisés decide si se ven bien en plano |
| 14 | Juicio | **Super Riso (Riso / Fotocopia / Stencil) en Plana** | La «impresión» de la ilustración plana: el objetivo del preset |
| 15 | Juicio | **Pan/zoom compartido con DRAW (D4)** | Volver a DRAW deja la vista que se ajustó en Plana: ¿se siente natural? |
| 16 | Juicio | Icono `cam-flat` (provisional) y textos «Plana · de frente, como en Dibujo, con los FX» / «Arrastra · pellizca para zoom» | Moisés dibuja el icono definitivo |

---

## 12 · Implementación (2026-11-24, sesión autónoma)

### 12.1 · Commits

Orden decidido (§10): C1 → C2 → C3 → C4 → C6 → C7 → C5 → C8. Cada uno con bump, tag anotado, `npm test` + typecheck + build en verde,
push y CI verde antes del siguiente. Hasta C5 la feature fue invisible: ningún control llevaba a `cinematicType = 'flat'`.

| Versión | Paso | Qué |
|---|---|---|
| 3.26.71 | C1 | `'flat'` (tipo, `LOAD_PROJECT`), tick estático sin cámara en mano, `utils/flatView.ts`, `tests/flatView.test.ts` |
| 3.26.72 | C2 | 12 escenarios `flat/*` congelados con el código de 3.26.71 |
| 3.26.73 | C3 | Render: proyección de DRAW + FX de CINEMA; «Centrar vista»; arnés `flatcheck.js` |
| 3.26.74 | C4 | Gestos de DRAW + arrastre simple = pan |
| 3.26.75 | C6 | PNG Vista / Formato en Plana (`FlatCaptureSection`) |
| 3.26.76 | C7 | Animación sin parpadeo; botón de profundidad atenuado |
| 3.26.77 | C5 | UI: el preset, atenuados, píldora de encuadre, cursor, umbral de la barra compacta |
| 3.26.78 | C8 | Docs |

C6 y C7 no dependieron de nada de C5: su UI propia (`FlatCaptureSection`, el botón de profundidad atenuado) solo se pinta con Plana
activa, inalcanzable hasta C5.

### 12.2 · Resultados de los criterios [VERIFICADO]

Página de desarrollo recién cargada, `Math.random` sembrado, mismo procedimiento antes y después.

| Criterio | C3 | C7 |
|---|---|---|
| `__flatCheck()`: Plana (FX maestro apagado, cámara de CINEMA descentrada y girada) = DRAW | 7/7 a 0 px, mismo SHA-256; antes del cambio fallaba 7/7 | 7/7 |
| Autocomprobación con `forward` | difiere 7/7 | difiere 7/7 |
| `__pixcheck` / `__pixcheck2` before → after | 7/7 y 7/7 a 0 px | 7/7 y 7/7 a 0 px |
| `__alphaLeakCheck()` / `__timelapseCheck()` | `pass: true` / `pass: true` | ídem |
| `__cinemaHash` (forward, orbit, storytelling, arc + distorsión, zoom + pixel art, HQ ×2, animación con y sin Z plana) | 8/8 a 0 px | 8/8 a 0 px (y Plana estática 0 px) |
| `__diorRenderHash` (contrato del Lab) | 2/2 mismo SHA-256 | 2/2 |
| `__flatAnimCheck()` (5 fotogramas iguales con niebla + DoF) | — | 0/0/0/0 px (antes 68 201 – 94 029 px) |
| Plana no lee `cameraRef` (R2) | demostrado: cámara de CINEMA en (300, −200, 500, giro 0,3) y 0 px | ídem |

Gestos (C4): los 125 escenarios previos idénticos; cambian solo los 11 `flat/*` que cambiaban (el del botón central ya hacía pan) y
cada traza hace lo que dice su nombre. Ad hoc, sin commitear (la regla no permite escenarios nuevos en un commit de comportamiento):
un dedo en pan y llega el segundo → el pinch toma el relevo; palma bajo un pan de Pencil → no lo reinicia. En el navegador: rueda =
zoom al cursor, toque de Espacio = Centrar vista (con un botón enfocado, Espacio se reserva para el botón, como en DRAW), `forward`
sigue ignorando ambas. **Matriz de escritorio 28/32 con y sin C4** (A/B en las mismas condiciones): las 4 que fallan son del Move de
DRAW y necesitan el `rAF` vivo, que iba a ~7 fps con la ventana fuera de la vista; no es una regresión, pero **conviene repetirla con
la ventana delante**.

Export (C6): por `exportAsPNG` real con las descargas interceptadas y el PNG decodificado: Formato 1080×1350 de Plana (FX apagados) =
Formato de DRAW, 0 px; con FX cambia todo el lienzo; Vista ×1 y HQ = DRAW, 0 px.

UI (C5): 1180×820, 820×1180, 1366×1024 y 1920×1080, claro y oscuro: ninguna píldora inferior solapada ni fuera de pantalla (Plana y
`forward`); clic real en el primer preset → Plana con la vista de DRAW heredada; Centrar vista encaja el Formato; el popover de Formato
se abre dentro de pantalla; distorsión y controles de cámara atenuados. A ojo, solo para cazar algo roto (no es juicio del efecto):
Super Riso, Pixel Art (el dibujo no salta al hacer zoom), niebla, grano y viñeta se ven en Plana; volver a DRAW conserva la vista (D4).

### 12.3 · Decisiones tomadas durante la implementación (no estaban en la propuesta)

1. **«Centrar vista» y Formato no van en las `ViewPills` de abajo a la izquierda** (propuesta §3.2/§6): medidas, quedaban a 2 px de la
   barra de cámara a 1366 y encima de ella a 1180 y 820. En Plana, la píldora de POI (el sitio de «encuadrar» en CINEMA) pasa a ser la
   **píldora de encuadre**: pista «Arrastra · pellizca para zoom» + Formato + Centrar vista, dentro de la barra.
2. **Umbral de la barra compacta 1100 → 1300 px** (`useIsCameraBarCompact`). Con el 12.º preset la fila única mide 1034 px + la píldora
   de encuadre (240) = 1284 px: a 1180×820 se salía por los dos lados **con cualquier preset** (con `forward`, 9 px por lado; sin el botón
   nuevo cabía con 7 px). 1180×820 usa ahora las dos filas que ya existían; 1366 y 1920 siguen en una. **Cambio visible en todos los
   presets a 1180×820: lo valida Moisés en el iPad (§11 #5).**
3. **El PNG «Vista» de Plana se re-renderiza** (como DRAW) en vez de copiar el lienzo vivo (como el resto de CINEMA): el lienzo vivo
   lleva pintado el marco de Formato, que es una ayuda y nunca debe exportarse.
4. **El primer dedo de un pinch suelta su pan**: con D3, un dedo ya está haciendo pan cuando llega el segundo; una línea detrás de
   `isFlatView` en `touchHandlers` lo termina (DRAW no tiene ese pan que terminar).
5. **Un puntero que aterriza a mitad de un pan no lo reinicia** (palma bajo el Pencil).
6. **`FormatPill` usa la cámara de DRAW** en Plana para «Ajustar a la vista» y los cambios de tipo (si no, leería la del preset).
7. **Cursor de mano** en Plana (`cursor-grab` / `cursor-grabbing`): antes CINEMA siempre era `cursor-default`.
8. **Textos:** tooltip del preset «Plana · de frente, como en Dibujo, con los FX» / «Flat · head-on, as in Draw, with the FX»; pista
   «Arrastra · pellizca para zoom» / «Drag to pan · pinch to zoom»; ayuda del PNG «Vista plana: con los FX, siempre sobre el papel».
9. **Icono `cam-flat` provisional:** un rectángulo (la hoja de frente) con dos líneas, trazo 1,5 como el resto del grupo. **Moisés dibuja
   el definitivo.**

### 12.4 · Lo que queda

- La ronda de iPad (§11) y el juicio a ojo (§11 #11–16). Si niebla, DoF o partículas no convencen en plano: neutralizarlas en Plana es
  una condición detrás de `isFlatView`, sin tocar los demás presets.
- La matriz de escritorio con la ventana delante (las 4 del Move de DRAW).
- `fx-in-draw.md` sigue **en pausa hasta probar Plana** (D8).

---

## 13 · Distorsión en Plana (petición de Moisés, 2026-11-24)

**Estado: HECHO — v3.26.80, opción A (límite monótono), decisión de Moisés.** Se paró en v3.26.79 porque la fórmula de CINEMA se pliega en Plana (§13.6); Moisés eligió A y se cerró con todos los criterios en verde (§13.8). §13.1–13.7 se conservan tal como se escribieron al pararla. Decisiones de diseño tomadas por Moisés: la misma distorsión que en los demás presets
de CINEMA (misma función, mismos parámetros e intensidad del panel), aplicada a la geometría ya proyectada con la fórmula de DRAW,
solo con `isFlatView` y la distorsión activa con intensidad > 0; nunca un warp de bitmap. Centro: el del marco de Formato si lo hay,
si no el del viewport. El export (PNG Vista, Formato, HQ, GIF / secuencia) sale con la misma distorsión que la pantalla; el marco guía
ni se distorsiona ni se exporta. En la UI deja de estar atenuada.

### 13.1 · Cómo se aplica hoy en CINEMA [VERIFICADO]

| Pieza | Dónde | Qué hace |
|---|---|---|
| Coeficiente | `renderPipeline.ts:564-565` | `fxDistortion` = intensidad del panel si `fxEnabled` y el FX está activo; `distortionK = |d| > 0,01 ? (d · −0,8) · (500 / FL) : 0`. Depende de la focal (`FL`, la del preset `zoom` si aplica) |
| Paso a la capa | `renderPipeline.ts:575` (`pfc.distortionK`), `renderLayerBody.ts:91, 175-184` | `FrameProjectionParams` lleva `distortionK` y el centro de normalización LÓGICO (`distortCenterX/Y` = mitad del viewport lógico, para que el HQ ×S salga igual) |
| La fórmula | `transformPoint.ts:130-137` (rama CINEMA) | Sobre el desplazamiento respecto al centro de pantalla, antes de `viewZoom/viewPan`: `nx = sx / cx`, `ny = sy / cy` (anisótropo: mitad de ancho y mitad de alto), `f = 1 + k · (nx² + ny²)`, `sx *= f`, `sy *= f`. Las capas fijadas (`isLocked3D`) no se distorsionan |
| Quién la recibe | todo lo que pasa por `transformPoint` / `createProjectInto` | trazos, rellenos, partículas, el ancla del texto (los glifos no se deforman) y el marcador de POI (`renderPipeline.ts:705-706`) |
| Inversa | `cinemaFraming.ts:78-114`, `unprojectPoint.ts` (Newton) | El doble toque de POI deshace la distorsión. Plana no tiene POI: no aplica |
| Rama de DRAW | `transformPoint.ts:101-111` | No la aplica: por eso hoy no hace nada en Plana, y el panel la atenúa (`FXPanel.tsx`, v3.26.77) |

### 13.2 · Dónde encaja en la rama plana

- **Fórmula:** la misma `f = 1 + k · (nx² + ny²)`, con el mismo `k` (`pfc.distortionK`, que en Plana ya se calcula: `fxEnabled` es el de
  CINEMA), aplicada en la rama de DRAW de `createProjectInto` **después** de proyectar: `out = C + (out − C) · f`. En CINEMA, con
  `viewZoom = S` y `viewPan = 0`, `(out − C) / (cx · S)` es exactamente su `sx / cx`: misma distorsión.
- **Centro C y normalización (hx, hy):**
  - sin Formato: C = centro del viewport, (hx, hy) = medio viewport (en px de dispositivo), como CINEMA;
  - con Formato: C = centro del marco en pantalla (`frameInView` con la cámara de Plana, `· viewZoom + viewPan`) y **(hx, hy) = medio
    marco en pantalla**. **Razón técnica de la normalización (no estaba en la decisión, que solo fijaba el centro):** el PNG Formato
    re-renderiza un lienzo que ES el marco (`renderRectSnapshot`: zoom 1, el marco llena el lienzo). Si en pantalla se normalizara por
    el medio viewport y en el export por el medio marco (que ahí es el viewport), la curvatura sería distinta y el export no coincidiría
    con lo que se ve. Normalizando siempre por el marco, la distorsión queda **pegada al marco**: igual en pantalla, en el PNG Formato
    y en el HQ, y ni el pan ni el zoom la hacen «nadar» dentro del encuadre. Consecuencia visible: fuera del marco (zona velada), con
    un marco pequeño, la distorsión crece rápido (∝ r²).
- **Qué capas:** las mismas que en CINEMA: las fijadas (`locked3DLayers`) no se distorsionan.
- **Animación:** el marco vive en el plano activo (`frameInView` con `isAnimationMode`), y todos los fotogramas comparten centro y
  normalización: no introduce parpadeo.
- **Marco guía:** `drawFormatFrame` (fase 4) no pasa por `transformPoint`: no se distorsiona; y nunca se exporta.

### 13.3 · Qué toca del núcleo

- `transformPoint.ts`: un campo opcional en `FrameProjectionParams` (`flatDistort`: centro, mitades, k) y tres líneas en la rama de DRAW
  detrás de `if (frame.flatDistort)`. DRAW y los demás presets nunca lo llevan: su aritmética no cambia.
- `renderLayerBody.ts`: construye `flatDistort` solo con `isFlat && pfc.distortionK !== 0` y la capa no fijada. **No cambia
  `RenderContext` ni `PerFrameComputed`**: lee `pfc.distortionK`, `viewZoom`, `viewPan`, el centro de pantalla y la cámara de Plana.
- La lógica pura (activación y centro / normalización) va en `utils/flatView.ts`, con tests de Node.
- La puerta de FX, el gancho de Super Riso, el orden de capas y la composición: intactos.

### 13.4 · El caso nuevo de verificación: cómo hacerlo sólido [VERIFICADO]

«El PNG Formato coincide al píxel con el contenido del marco en pantalla» **no se cumple hoy ni en DRAW puro**, sin nada de Plana: la
pantalla (1366×1024) y su propio PNG Formato (480×600) difieren aunque la geometría sea la misma. Medido, por causas, en
`tools/draw-stress/harness/flatcheck.js` (`__flatDistortCheck`):

| Causa | Diferencia | Cómo se neutraliza en la prueba |
|---|---|---|
| La textura de tinta sale de `Math.random` **después** de `consumeNoiseRandoms(w, h)`: lienzos de tamaño distinto, texturas distintas con la misma semilla | 121 247 px | `Math.random` constante (textura uniforme e igual en los dos) |
| Chrome elige GPU o CPU por lienzo y su antialiasing difiere (trampa ya documentada en CLAUDE.md) | 520 px (≤ 27 niveles) | todo contexto 2D con `willReadFrequently` (como `onCpu` de `timelapse.js`) |
| El rasterizador trabaja en float32 en posiciones absolutas: la misma curva en `x + 556` o en `x + 300` antialiasa distinto en el último bit | 136 px (≤ 7 niveles) en trazos interiores | el marco en (0, 0) también en pantalla |
| Skia elige el antialiasing de cada trazo según cómo lo recorta el lienzo: un trazo que cruza el borde del PNG no cruza el de la pantalla | 1 610 px (≤ 24 niveles) | solo los trazos que caen enteros dentro del marco (margen 60 px: 101 trazos de la escena de ejemplo) |

Con eso, **sin distorsión la comparación da 0 px** (la prueba es sólida); el marco sigue lejos del centro del viewport (240, 300 frente a
683, 512), así que una distorsión centrada en el viewport fallaría (autocomprobación). La escena completa se sigue midiendo como dato
contra el suelo de DRAW (923 px en esa configuración).

### 13.5 · Resultados de los criterios con la versión decidida [VERIFICADO]

Página recién cargada; `pixcheck`/`pixcheck2` en primera pasada (ver la nota).

| Criterio | Resultado |
|---|---|
| `flatcheck` (Plana con FX apagados = DRAW) | 7/7 a 0 px, mismo SHA-256 |
| `pixcheck` / `pixcheck2` (DRAW) | 7/7 y 7/7 a 0 px |
| `alphaleak` / `__timelapseCheck()` | `pass: true` / `pass: true` |
| Hashes de CINEMA (8 sin Plana, incluido arc con distorsión) | 8/8 a 0 px |
| `dior-render.js` | mismo SHA-256 (2/2) |
| Arnés de handlers | 137/137 idénticos (`npm test`, 722 tests en la rama) |
| Parpadeo de animación en Plana con distorsión 0,6 | 0/0/0/0 px |
| `__flatDistortCheck` (PNG Formato = marco en pantalla) | 0 px con distorsión 0,6, −0,5 y 1; sin distorsión 0 px; con / sin distorsión difieren (15 818 px); autocomprobación difiere (36 877 px) |
| Tests de Node (centro y normalización con y sin Formato, activación solo en Plana, equivalencia pantalla ↔ PNG desde la capa 0, la 3 y en animación, la fórmula) | 7 nuevos en verde |

**Nota sobre `pixcheck2`:** su caso de la vista previa del Move dio una vez 582 984 px al ejecutarse tras otros arneses en la misma página.
A/B en página recién cargada: con el código de HEAD **sin** este cambio, la segunda pasada también difiere (38 019 px en otro caso del
Move) y la primera da 0 px; con este cambio, la primera pasada da 0 px. Es inestabilidad anterior del arnés en segundas pasadas, no una
regresión. Se mide siempre en primera pasada.

### 13.6 · Hallazgo: la fórmula de CINEMA se pliega en Plana — **PARADO, decide Moisés**

Todos los criterios formales pasan, pero **el efecto se rompe a la vista** y no se ha publicado. Con k < 0 (distorsión positiva, barril),
`f = 1 + k·r²` se vuelve negativa cuando r² > 1/|k|: un vértice más allá **atraviesa el centro y aparece al otro lado**. En CINEMA esa zona
casi nunca se alcanza, porque la perspectiva encoge la escena y se normaliza por medio viewport. En Plana la geometría va a escala de
DRAW, se puede hacer zoom y, con Formato, se normaliza por un marco pequeño. Resultado: los vértices lejanos de las formas grandes de
fondo se pliegan **dentro del encuadre**, en pantalla **y en el PNG** (el export usa la misma fórmula).

- k = −0,8 · d · 500 / FL; con la focal por defecto (FL 3840), |k| ≈ 0,104·d. Hay pliegue para r > 1/√|k|: d = 0,8 → r > 3,5; d = 0,3 →
  r > 5,7 (r en medios marcos o medios viewports). Las formas de fondo de la escena de ejemplo tienen vértices a miles de unidades.
- **No es solo el marco:** sin Formato, a zoom 1,6 y d = 0,8 también se pliega (captura 2). CINEMA (`forward`) con la misma d: barril
  suave, sin pliegue (captura 3).

Capturas (1366×1024, escena de ejemplo, d = 0,8): `docs/media/flat-distortion-1-formato-sin-limite.jpg` (Formato, versión decidida),
`-2-zoom-sin-limite.jpg` (sin Formato, zoom 1,6), `-3-cinema-forward.jpg` (CINEMA, referencia), `-4-zoom-con-limite.jpg` y
`-5-formato-con-limite.jpg` (opción A).

**Opciones:**

| | Qué | A favor | En contra |
|---|---|---|---|
| ⭐ **A · límite monótono** | Con k < 0, r² se limita a 1/(3|k|), justo donde la curva `r·(1 + k·r²)` deja de crecer. Una línea en la rama plana | Idéntica a la función de CINEMA dentro de ese radio (a la focal por defecto, todo el marco hasta d ≈ 1,6); sin pliegues en ningún caso; el PNG sigue = pantalla (mismos criterios en verde; la escena completa queda más cerca del suelo de DRAW: 1 130 px frente a 923, contra 2 757 sin límite) | Ya no es literalmente «la misma función» en la zona donde CINEMA también se rompería; fuera del marco (velado, no exportado) el contenido se comprime hacia el centro con un factor fijo (2/3) |
| B · la versión decidida | `f = 1 + k·r²` sin límite | Literalmente la misma función | Se pliega a la vista con barril moderado-fuerte o con zoom (capturas 1 y 2); el pliegue sale en el export |
| C · normalizar por el viewport también con Formato | Centro en el marco, escala la del viewport, como CINEMA | Se pliega menos con marco pequeño | No evita el pliegue con zoom (captura 2 es sin Formato); y para que el PNG coincida con la pantalla tendría que normalizar por el viewport del dispositivo del momento: el mismo `.dior` exportaría distinto en el iPad y en el PC |

**Recomendación: A.** Es la única que no se rompe a la vista y conserva el export idéntico a la pantalla y la fórmula de CINEMA en la
zona donde CINEMA no está roto. Cambia la decisión «misma función» solo donde esa función ya no tiene sentido; por eso decide Moisés.

### 13.7 · Estado y dónde está el trabajo

- **`main` no cambia el comportamiento:** en Plana la distorsión sigue atenuada y sin efecto (v3.26.77).
- Rama **local, sin publicar**: `wip/flat-distortion` (desde `f5a01de`), dos commits:
  1. `01d6e08` — la versión decidida (B): `utils/flatView.ts` (`flatDistortionApplies`, `flatDistortFrame`), `transformPoint.ts`
     (`flatDistort` en la rama de DRAW), `renderLayerBody.ts`, `FXPanel.tsx` sin atenuar, 7 tests de Node, `__flatDistortCheck` y
     `__flatAnimCheck` con FX extra en `flatcheck.js`.
  2. `9a11c96` — la opción A encima (una línea en `transformPoint.ts`).
- Para cerrar con A: sobre la rama, repetir los criterios de §13.5 (los de Plana ya pasan con A: `flatcheck` 7/7, `__flatDistortCheck`
  0 px, parpadeo 0 px), REFERENCE.md §10 + Apéndice C, bump, merge a `main`, push. Con B: lo mismo sin el segundo commit.
- Lo que Moisés juzga a ojo en el iPad, una vez decidido: la distorsión con pan y zoom, con Formato (el barril queda pegado al marco),
  el PNG Formato y HQ frente a la pantalla, y con Super Riso encima.

### 13.8 · Cierre (v3.26.80): opción A

**Decisión de Moisés: A, límite monótono.** Integrado en `main` como un solo commit (la versión B y la A encima, fusionadas y rebasadas
sobre v3.26.79, sin merge); la rama `wip/flat-distortion` se borró.

- **La fórmula** (`transformPoint.ts`, rama de DRAW, solo con `flatDistort`): `f = 1 + k · (k < 0 ? min(r², 1/(3|k|)) : r²)`. Dentro de
  ese radio es la de CINEMA; fuera, con barril, el factor se queda en 2/3 y el mapa sigue creciendo: no se pliega. Con cojín no hay
  límite (no se pliega nunca).
- **Rango del panel:** intensidad −1…1 (`FXRow`, bipolar) y focal 24–300 mm (FL 384…4800): |k| ≤ ≈1,04. Test de Node: 4,8 M puntos
  (41 intensidades × 8 focales × 5 direcciones × 60 medios marcos), ninguno cruza el centro ni vuelve hacia dentro; sin el límite el
  mismo barrido detecta el pliegue ya con intensidad 0,05 a 24 mm.

| Criterio (página recién cargada; `pixcheck`/`pixcheck2` en primera pasada) | Resultado |
|---|---|
| `flatcheck` | 7/7 a 0 px, mismo SHA-256; autocomprobación con `forward` falla 7/7 |
| `pixcheck` / `pixcheck2` | 7/7 a 0 px (mismo hash) / 7/7 a 0 px |
| `alphaleak` / `__timelapseCheck()` | `pass: true` / `pass: true` |
| Hashes de CINEMA (8 sin Plana, incluido arc con distorsión) | 8/8 a 0 px, mismos hashes; los 2 de Plana (sin distorsión) también 0 px |
| `dior-render.js` | mismo SHA-256 (2/2) |
| Arnés de gestos | 137/137 idénticos |
| Parpadeo de animación con distorsión 0,8 | 0/0/0/0 px |
| PNG Formato = marco en pantalla (`__flatDistortCheck`) | 0 px con 0,6 / −0,5 / 1 / 1,6; sin distorsión 0 px; con / sin difieren (15 818 px); autocomprobación difiere (36 877 px); escena completa 1 130 px frente al suelo de DRAW de 923 |
| Node | 10 tests de distorsión en `tests/flatView.test.ts` |

**Lo que Moisés juzga a ojo en el iPad:** la distorsión con pan y zoom (sin Formato se queda en la pantalla, como en CINEMA; con
Formato queda pegada al marco), barril fuerte con zoom (ya sin pliegues; fuera del marco el contenido se comprime hacia el centro,
zona velada), el PNG Formato y el HQ frente a lo que se ve, la animación con distorsión, y la distorsión con Super Riso encima.
