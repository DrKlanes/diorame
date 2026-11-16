# Sprint de handlers de `StrataCanvas.tsx` — informe (16 nov 2026)

Trabajo desatendido en la rama **`refactor/handlers`** (desde `main` en `ca3cb8f`, v3.26.52). Nada se ha subido ni fusionado: 13 commits locales, v3.26.53 → v3.26.65, cada uno con su tag anotado `-handlers`.

**Resultado:** `StrataCanvas.tsx` **1 719 → 853 líneas** (−866, −50 %). Los handlers de puntero y táctiles viven en `canvas/`; el componente conserva refs, efectos, `resetGestureState`, el listener nativo del Pencil y el bucle RAF, todos **idénticos al byte** a v3.26.52. **Nada probado en iPad** (§8 es la matriz para hacerlo).

---

## 1. En una página

- **Red antes de cortar.** Los handlers cerraban sobre `state`, ~25 refs y `dispatch`: no había forma de ejecutarlos en Node. `tools/handlers-golden/` corta el **texto literal** de los handlers del archivo, lo envuelve con sustitutos de lo que capturan (refs con los valores iniciales del componente, el reducer real, reloj, `Math.random` sembrado) y registra, evento a evento, qué se despacha y qué refs cambian. Con eso se congeló la referencia **con el código de v3.26.52**: 125 gestos guionizados.
- **Paso 1 (lógica pura), completo.** Tres cortes: gestos táctiles, doble clic de CINEMA, matemática de puntero y decisiones del Move. Los handlers conservan el *cuándo*.
- **Paso 2 (cuerpos de los handlers), completo.** Los siete handlers salen a tres módulos. No son hooks: son fábricas sin ningún hook de React dentro, llamadas una vez por render donde antes se escribían los handlers. El texto se **cortó con un script** (no se retecleó): 204 + 228 + 226 líneas byte-idénticas a como estaban.
- **El pinch con el centro quieto no se tocó.** Queda fijado como `[COMPORTAMIENTO ACTUAL · pinch con el centro quieto]` y documentado (§6).
- **El test no cambió nunca tras crearse.** `tests/handlers.characterization.test.ts` es el mismo archivo desde v3.26.53; lee el `StrataCanvas.tsx` del árbol de trabajo, así que valió igual antes y después de cada corte. Lo que sí creció, siempre en commits de test aparte y siempre regenerando con `--rev v3.26.52`, fue la lista de escenarios (112 → 125).

---

## 2. Qué se extrajo

| Versión | Archivo | Líneas | Qué contiene | Cómo se movió |
|---|---|---:|---|---|
| 3.26.55 | `canvas/touchGestures.ts` (nuevo) | 144 | `twoTouchMetrics`, `threeTouchCenter`, `hasTapMoved` (centro > 10 px), `canStartPinch` (≥ 5 px), `tapGestureAction` (2 dedos < 300 ms = UNDO, 3 < 250 ms = REDO), `pinchZoom` (0,5–3), `pinchPan`, y la órbita táctil (`orbitTouchPan`, `orbitTouchRotation`, `orbitPinchZoomOffset`) | Aritmética y umbrales reubicados. 47 de 90 líneas de código son literales del archivo anterior; el resto, firmas y retornos |
| 3.26.57 | `canvas/cinemaFraming.ts` (nuevo) | 153 | `isDoubleClick` (300 ms y 40 px) y `frameCinemaPoint` (ópticas del frame dibujado, distorsión, pivote arc/orbit, picking por capa, plano medio) | Bloque **cortado por script** con sus comentarios. 62 de 88 literales |
| 3.26.59 | `canvas/pointerMath.ts` (nuevo) | 137 | `clientToWorld`, `organicWiggle`, `dragPan`, `orbitDragZoomOffset`, `orbitPointerDrag`, `isTouchMicroStroke` | Aritmética reubicada. 45 de 92 literales |
| 3.26.59 | `canvas/moveGizmoInteraction.ts` (+63) | 295 | `decideMoveSelection` (la tabla de selección del Move), `transformLayerPayload`, `isSignificantMove` | Condiciones tal cual; las consecuencias (deselección diferida) siguen en el handler |
| 3.26.61 | `canvas/handlerEnv.ts` (nuevo) | 62 | `CanvasHandlerEnv`: el tipo de lo que cierran los handlers. Solo tipo | — |
| 3.26.61 | `canvas/touchHandlers.ts` (nuevo) | 228 | `createTouchHandlers(env)` → `handleTouchStart/Move/End/Cancel` | **204 líneas byte-idénticas** a v3.26.59 |
| 3.26.62 | `canvas/pointerDownHandler.ts` (nuevo) | 259 | `createPointerDownHandler(env)` → `handlePointerDown` | **228 líneas byte-idénticas** a v3.26.61 |
| 3.26.64 | `canvas/pointerMoveUpHandlers.ts` (nuevo) | 260 | `createPointerMoveUpHandlers(env)` → `handlePointerMove`, `handlePointerUp` | **226 líneas byte-idénticas** a v3.26.62 |

Todos por debajo de 400 líneas, con tabs. El filtro de micro-trazos es `isTouchMicroStroke`; la clasificación tap / pinch / pan son `hasTapMoved` + `canStartPinch` + `tapGestureAction`.

### `StrataCanvas.tsx`, línea a línea

| Momento | Líneas |
|---|---:|
| v3.26.52 (inicio) | 1 719 |
| v3.26.55 · `touchGestures.ts` | 1 659 |
| v3.26.57 · `cinemaFraming.ts` | 1 557 |
| v3.26.59 · `pointerMath.ts` + decisiones del Move | 1 496 |
| v3.26.61 · handlers táctiles | 1 306 |
| v3.26.62 · `handlePointerDown` | 1 080 |
| **v3.26.64 · `handlePointerMove` / `Up`** | **853** |

Sigue por encima de 400. Lo que queda: ~170 de refs, ~340 de efectos (de ellos ~110 el de exportación, con el mismo snapshot repetido cinco veces), ~50 de `resetGestureState`, ~95 del núcleo RAF y ~190 de JSX y voltear/centrar.

---

## 3. Qué se dejó, y por qué

| Pieza | Por qué se queda |
|---|---|
| Bucle RAF, `buildRenderContext`, pérdida de contexto | Núcleo: no se toca sin GO. Idéntico al byte a v3.26.52 |
| `resetGestureState` | Es un `useCallback` que consumen `useCanvasRecovery` y `onPointerCancel`. Sacarlo era mover un hook: cambia el orden de hooks y no es «mover texto». Idéntico al byte a v3.26.52 |
| Los ~25 refs | Los leen también el RAF, `useSpacePan` y `resetGestureState`. Moverlos era cambiar quién es dueño del estado del gesto, no reubicar handlers |
| El efecto del listener nativo de `pointerdown` / `touchstart` (Pencil) | Registro de listeners: prohibido tocarlo en el sprint. Resuelto después, en v3.26.69 (H12/H13, §6): fuera el `pointerdown`, el `touchstart` se queda |
| La puerta de entrada de `handlePointerDown` (pen / pinch / primario / enfriamiento) | Mezcla la decisión con una escritura de ref (`isPinching = false`). Extraer solo el umbral de 150 ms no compensaba partir el bloque. Está cubierta por 5 escenarios |
| Los comentarios largos de los handlers | Viajan con el texto: explican el *cuándo* |
| Efecto de exportación (cinco copias del mismo snapshot) | Fuera del alcance (export). Es el siguiente candidato evidente: ver §9 |

---

## 4. Pasos parados y decisiones «la más segura»

Ningún paso se paró por exigir tocar el núcleo. Estas son las decisiones tomadas sin Moisés delante, y su motivo:

1. **No se hizo push de la rama.** `.github/workflows/deploy.yml` solo se dispara con `push` a `main`: un push de la rama no ejecuta ningún check, así que no aportaba CI. Solo commits locales.
2. **Paso 2 con fábricas, no con hooks.** El encargo decía «mover cuerpos de handlers a hooks». Un hook de verdad (con `useCallback` / `useEffect` dentro) cambia el orden de hooks del componente. Una fábrica sin hooks no: los handlers siguen siendo closures creados en cada render y pasados a las mismas props. Es la variante que se puede demostrar idéntica.
3. **El arnés se adaptó en su propio commit (v3.26.60), no junto al código que mide.** Para seguir a un handler fuera del archivo hacía falta que la región empezara en el comentario `// --- Event Handlers ---` y que los sustitutos de `sonner` / analytics / `transformUtils` valieran para cualquier módulo. Con ese cambio, `--check` da idéntico en el árbol y en `--rev` v3.26.52, .55, .57 y .59. `tests/` no se tocó.
4. **Escenarios añadidos en commits de test aparte, antes del corte que los necesitaba** (v3.26.54, .56, .58, .63). Cada vez que un fallo plantado no hacía saltar nada, se aparcó el corte (`git stash`), se añadió el escenario, se regeneró con `--rev v3.26.52` comprobando que los previos salían idénticos, se commiteó, y se retomó el corte. Así la referencia es siempre la salida del código anterior.
5. **El escenario de capa oculta estaba mal y se corrigió (v3.26.56).** Ocultaba la capa en el estado inicial y `ADD_LAYER` desplaza los índices de `hiddenLayers`: al llegar el clic no había nada oculto. Es el único escenario cuya referencia cambió, y cambió regenerando con el código de v3.26.52.
6. **`CLAUDE.md`: los conteos, una línea de método y una frase de alcance.** Ninguna regla cambia. La frase dice que las reglas de «Tocar StrataCanvas.tsx» valen igual para los módulos a los que se mudaron los handlers (son los mismos handlers); es la lectura conservadora, a revisar por Moisés.
7. **No se arregló ningún hallazgo** (§6).

---

## 5. Verificación

### En cada commit de refactor

| Comprobación | Resultado |
|---|---|
| `npm test` | 529 → **663** (12 archivos), verde |
| Typecheck y build | Verdes |
| Trazas de handlers contra la referencia de v3.26.52 | **Idénticas** en los 6 commits de refactor (120 → 125 escenarios) |
| Fallos plantados en el código nuevo | 12 + 8 + 21 + 6 + 12 + 13 = **72 cazados**; equivalentes conocidos abajo |
| Regiones no movidas, byte a byte contra v3.26.52 | `resetGestureState`, efectos entre él y el RAF, efecto del RAF con `buildRenderContext`, refs y efectos de antes de los handlers, todo lo de después del RAF (JSX incluido): **idénticos** |
| Texto movido, byte a byte contra el commit anterior | 204 / 228 / 226 líneas: **idénticas** |
| `tools/text-check` | 5 secciones OK (huellas contra una referencia fijada en este navegador con el código de v3.26.52) |
| `__mergeDriftCheck()` | `pass: true` |
| Matriz de escritorio (`tools/handlers-golden/desktop-matrix.js`) | **32/32** a 1366×1024, sin errores de consola |

`git diff --color-moved --color-moved-ws=allow-indentation-change` sobre todo el rango (`v3.26.52..HEAD`, `src/components`): de 1 210 líneas añadidas no vacías, **741 las marca como movidas** y 469 no — 179 de comentarios (las cabeceras de los módulos nuevos), 44 de imports, 50 de firmas y retornos, y 196 de pegamento: listas de parámetros, el tipo `CanvasHandlerEnv`, el literal del `env` y las llamadas que quedan en los handlers. No fue la prueba principal: la sustituyen dos medidas más duras, la identidad byte a byte del texto movido en el paso 2 y el recuento de líneas literales de cada módulo de lógica pura (tabla de §2).

**Mutantes equivalentes (no los caza el instrumento porque no cambian nada observable):** el filtro de capas vacías entre los candidatos del doble clic (una capa vacía no puede acertarse); ignorar `wasSelected` en `grabbedHandle` (solo se lee estando seleccionado); el «solo tocar React si cambia el nodo» del cursor del gizmo (el cursor acaba igual; lo que cambia es el número de `setState`, que la traza no cuenta).

### Por qué el paso 2 no puede cambiar cuándo ni cómo se procesa un evento

- **Hooks y efectos:** las fábricas no contienen ningún hook. El número y el orden de hooks del componente son los mismos; ningún efecto se tocó (idénticos al byte).
- **Listeners:** el JSX es idéntico al byte (`onPointerDown={handlePointerDown}` …). El listener nativo del Pencil sigue capturando el `handlePointerDown` del primer render, como antes.
- **Refs:** el `env` lleva los objetos ref; cada handler lee `.current` cuando llega su evento. `state` es el del render que creó el handler, como antes.
- **Coste nuevo por render:** un objeto literal de 29 claves y tres llamadas a función. Antes se creaban 7 closures por render; ahora, las mismas 7 más ese objeto. Sin medir en iPad.

### Matriz de escritorio

Eventos sintéticos (`PointerEvent`, `TouchEvent`, `WheelEvent`, `KeyboardEvent`) sobre la app real, leyendo el estado del Provider: trazo en los tres modos, punto, simetría, blob, dentro / detrás, goma con su polígono, micro-trazo, `pointercancel`, texto, toque de 2 dedos (deshacer) y de 3 (rehacer), pinch con centro móvil (zoom 2,408 = razón de distancias; pan = desplazamiento del centro) y su enfriamiento, pinch con centro quieto, Move (zona muerta, traslación, esquina, lado, rotación de un cuarto de vuelta, deselección al soltar, seleccionar-y-arrastrar, arrastre abandonado por un segundo dedo), undo / redo, Espacio + arrastre y toque de Espacio, rueda, botón central, doble clic de CINEMA, pinch y botón central en órbita.

Está versionada: inyectar el archivo en la página y `await __handlersMatrix()`.

---

## 6. Hallazgos nuevos (ninguno se arregló)

| # | Hallazgo | Estado |
|---|---|---|
| H12 | **El listener nativo de `pointerdown` para el Pencil era, en la práctica, un no-op.** Construía el evento con `{ ...e }` sobre un `PointerEvent` nativo, y el spread solo copia propiedades propias: `pointerType`, `isPrimary`, `clientX`… son getters del prototipo y no viajan. **[VERIFICADO en Chrome]**: el objeto resultante solo tiene `isTrusted`; en Safari debería ser igual por WebIDL **[POR CONFIRMAR en iPad]**. `handlePointerDown` recibía `pointerType === undefined` y salía en sus guardas sin escribir nada. No-op **desde el commit base** (`f8f0c32`): llegó ya escrito, sin commit ni entrada que explique su origen. **Intención original** (su comentario): el `preventDefault` del `touchstart` nativo, puesto contra el rechazo de palma de iOS, bloquearía los `pointer events` del Pencil, y este listener los relanzaría a mano. La premisa es falsa en iPad: el trazo del Pencil lo inicia el `onPointerDown` de React | **Resuelto en v3.26.69, opción A** (decisión de Moisés): eliminado el `pointerdown`. El `touchstart` `{ capture: true, passive: false }` con `preventDefault` se queda **exactamente igual**: bloquea los eventos de ratón de compatibilidad y los gestos nativos de Safari, y `useAutoSave` depende de que el canvas lo cancele. Pasa a «Comportamientos protegidos» de CLAUDE.md. La opción B (quitar el efecto entero) se descartó: cambiaría el comportamiento de iOS. Arnés 125/125 idéntico, matriz 32/32. Falta la mini-ronda de iPad |
| H13 | El `cleanup` de ese efecto llamaba a `removeEventListener` sin `{ capture: true }`: no quitaba los listeners que registró en captura. Sin efecto práctico (el componente no se desmonta) | **Resuelto en v3.26.69**: el `touchstart` se quita con `{ capture: true }` |
| H14 | **En DRAW, los handlers convierten el puntero con `state.focalLength`** (800 por defecto, el slider de CINEMA) **y el gizmo y el render proyectan con `DRAW_FOCAL_LENGTH` (10 000).** No se nota mientras `state.camera.z` esté en el plano de la capa activa (escala 1 con cualquier focal), que es lo que hace la app al navegar entre capas. **[POR CONFIRMAR]** si hay algún camino real en DRAW con la cámara fuera de ese plano (modo animación con Z plano, p. ej.): ahí el trazo caería desplazado respecto al cursor. Los tres escenarios «camera-off-the-layer-plane» fijan la aritmética actual | Abierto, sin evidencia de que sea alcanzable |
| — | **Pinch con el centro quieto = toque de dos dedos.** Confirmado en la traza: separar dos dedos simétricamente no hace zoom nunca (el centro no supera los 10 px) y, si se sueltan antes de 300 ms, deshace. Soltando más tarde no hace nada | **Fijado como `[COMPORTAMIENTO ACTUAL]`**, sin cambios. Caracterizar en iPad (§8, B3) |
| — | Con el Move activo, un toque de dos dedos cuyo primer dedo cae fuera de la caja **deshace** y no deselecciona. Es el comportamiento buscado en v3.17.8; lo anoto porque el deshacer en mitad del Move puede sorprender | Comportamiento previo |
| — | La matriz de escritorio es sensible al tamaño del lienzo: con ancho impar (centro en medio píxel) dos chequeos salieron mal **con los handlers sin tocar** (el trazo Ink guardó 9 muestras en vez de 8; el pan de la rueda, 0,05 px). No investigado | Fijar viewport antes de correrla |

---

## 7. Lista de commits (rama `refactor/handlers`)

| Versión / tag | Commit | Tipo | Qué |
|---|---|---|---|
| v3.26.53-handlers | `47d0f16` | test | Arnés + referencia congelada con v3.26.52 (112 escenarios) + test |
| v3.26.54-handlers | `b657cb5` | test | +8 escenarios (clamps, pinch de órbita, `startDist` 0) |
| v3.26.55-handlers | `3ac8ff9` | refactor | `canvas/touchGestures.ts`; matriz de escritorio |
| v3.26.56-handlers | `7986ba3` | test | Escenario de capa oculta corregido; +1 |
| v3.26.57-handlers | `91ceb1d` | refactor | `canvas/cinemaFraming.ts` |
| v3.26.58-handlers | `d2626fa` | test | +3 escenarios con la cámara fuera del plano |
| v3.26.59-handlers | `26a49fb` | refactor | `canvas/pointerMath.ts` + decisiones del Move |
| v3.26.60-handlers | `c692588` | chore | El arnés sigue a un handler hasta su módulo |
| v3.26.61-handlers | `b6646a7` | refactor | Handlers táctiles → `canvas/touchHandlers.ts` |
| v3.26.62-handlers | `23d407f` | refactor | `handlePointerDown` → `canvas/pointerDownHandler.ts` |
| v3.26.63-handlers | `a0ed6e4` | test | +1 escenario (pointermove con pinch marcado) |
| v3.26.64-handlers | `e45a538` | refactor | `handlePointerMove` / `Up` → `canvas/pointerMoveUpHandlers.ts` |
| v3.26.65-handlers | (este) | docs | Este informe, resumen, REFERENCE, conteos de CLAUDE.md |

---

## 8. Matriz de prueba para iPad

Ordenada por riesgo: primero lo que más código movido atraviesa y menos se parece a lo probado en escritorio. En cada fila, lo esperado es **lo mismo que en producción (v3.26.52)**: si dudas de si algo ya pasaba antes, compáralo en una pestaña con la versión anterior. Confirmar la versión en pantalla antes de empezar (pestaña privada para saltarse el service worker).

### A. Pencil (cada trazo pasa por los tres handlers movidos)

| # | Prueba | Esperado |
|---|---|---|
| A1 | Trazo largo y rápido con Pencil en **tapered, uniform e ink** | El trazo en vivo sigue a la punta sin retraso nuevo; al levantar queda la misma forma. Sin tramos rectos ni cortes |
| A2 | Toque de punto con Pencil (apoyar y levantar) en los tres modos | Deja un punto. Con Pencil nunca se descarta |
| A3 | Dibujar con la **palma apoyada** (palma antes, durante y después del trazo) | El trazo no se corta ni salta. La palma no deja marcas ni dispara deshacer |
| A4 | Pinch con dos dedos e **inmediatamente** dibujar con Pencil | El Pencil dibuja desde el primer contacto (el enfriamiento de 150 ms es solo para el dedo) |
| A5 | Trazos encadenados rápidos (sombreado) | Ninguno se pierde; ningún trazo une el final de uno con el principio del siguiente |
| A6 | Pencil con **goma**, con **simetría**, con **dibujar dentro** y **detrás** | Igual que en producción (es también la ronda pendiente de la fase 6) |
| A7 | Blob y goma con **modo orgánico** | El temblor es el de siempre (misma amplitud, mismo «nervio») |

### B. Dos y tres dedos (todo `touchHandlers.ts` y `touchGestures.ts`)

| # | Prueba | Esperado |
|---|---|---|
| B1 | Toque rápido de **dos dedos** | Deshace un paso. Ni zoom ni trazo |
| B2 | Toque rápido de **tres dedos** | Rehace un paso |
| B3 | **Hallazgo a caracterizar:** pinch abriendo los dos dedos lo más simétricamente posible, rápido, y otra vez despacio | Anotar qué pasa. La app hoy: si el centro no se mueve más de 10 px no hay zoom, y soltando antes de 300 ms deshace. Con dedos reales lo normal es que sí haga zoom. **No es un fallo del sprint**: es para decidir si hay que cambiarlo |
| B4 | Pinch normal para acercar y alejar, moviendo la mano | El punto bajo los dedos se queda bajo los dedos; topes en 0,5× y 3× |
| B5 | Pinch y soltar; apoyar un dedo justo después | No aparece un trazo fantasma |
| B6 | Empezar a dibujar con un dedo y apoyar un segundo | El trazo se abandona, no queda nada dibujado |
| B7 | Toque de dos dedos con el editor de texto abierto | No deshace |

### C. Dedo como puntero

| # | Prueba | Esperado |
|---|---|---|
| C1 | Dibujar con el dedo un trazo normal | Dibuja |
| C2 | Toques sueltos con el dedo (sin arrastrar) | No dejan nada (filtro de micro-trazos: un dedo necesita más de 2 muestras) |
| C3 | Herramienta Texto: tocar el lienzo | Abre el editor donde se tocó |
| C4 | Capa oculta: tocar el lienzo | Aviso de capa oculta; nada más |

### D. Move (tabla de selección y gizmo)

| # | Prueba | Esperado |
|---|---|---|
| D1 | Arrastrar dentro de la caja, con dedo y con Pencil | La capa sigue al dedo; al soltar queda donde se dejó |
| D2 | Esquina, lado y tirador de rotación, con dedo | Escala uniforme / estira un eje / rota. Los tiradores se agarran con la holgura de siempre (40 px) |
| D3 | Toque fuera de la caja | Deselecciona **al levantar**, no al apoyar |
| D4 | Con la capa seleccionada, **pinch empezando fuera de la caja** | Hace zoom y la capa **sigue seleccionada** |
| D5 | Deseleccionada: arrastrar desde dentro de la caja | Selecciona y arrastra en un solo gesto |
| D6 | Deseleccionada: tocar donde estaría el tirador de rotación | No hace nada |
| D7 | Empezar a arrastrar la capa y apoyar un segundo dedo | El arrastre se abandona: la capa vuelve, sin paso de deshacer |
| D8 | Toque corto dentro de la caja sin mover | No mueve nada ni crea paso de deshacer |
| D9 | Capa vacía con Move: arrastrar | Sin gizmo y sin errores |

### E. CINEMA

| # | Prueba | Esperado |
|---|---|---|
| E1 | Doble toque sobre un elemento | Encuadra ese elemento (la capa tocada, no la de detrás) |
| E2 | Dos toques lejos uno de otro, seguidos | No encuadra |
| E3 | Órbita: un dedo | Desplaza la cámara |
| E4 | Órbita: dos dedos girando y haciendo pinch; levantar uno y seguir con el otro | Rota y hace zoom; al quedar un dedo pasa a desplazar sin salto |

### F. Lo que no se movió pero convive

| # | Prueba | Esperado |
|---|---|---|
| F1 | Mandar la app a segundo plano a mitad de un trazo y volver | Se puede dibujar de inmediato; no queda un trazo colgado |
| F2 | Sesión larga de dibujo en una escena cargada | Sin degradación nueva respecto a producción (hay un objeto más por render; no medido en iPad) |
| F3 | Teclado físico, si hay: Espacio + arrastre con Pencil | Desplaza; soltar Espacio sin haber arrastrado centra la vista |

**Si algo falla:** anotar la fila y comparar con producción. La rama se puede revertir entera (`git revert` del rango tras fusionar) o por pasos: los cortes del paso 2 (v3.26.61, .62, .64) son independientes de los del paso 1.

---

## 9. Integración

`main` no se ha movido desde `ca3cb8f`, así que la rama entra en avance rápido. **Ojo: `push` a `main` despliega a producción** (es lo que permite probar en iPad).

```bash
git checkout main && git merge --ff-only refactor/handlers
```

Si `main` hubiera avanzado, `--ff-only` falla sin tocar nada: entonces hay que renumerar versiones antes de fusionar (la rama usa v3.26.53–65).

Después, a decisión de Moisés: tag anotado normal sobre la punta y push.

```bash
git tag -a v3.26.65 -m "Handlers sprint: StrataCanvas.tsx 1719 -> 853"
```

```bash
git push origin main && git push origin v3.26.65
```

Los tags `-handlers` son locales; subirlos es opcional (`git push origin --tags` los llevaría todos).

### Siguiente candidato en `StrataCanvas.tsx`

El efecto de exportación (~110 líneas) construye cinco veces el mismo objeto de snapshot. Es código de export, fuera de este encargo y con sus propios arneses (`pixcheck`, `alphaleak`, `__timelapseCheck`). Con eso el archivo bajaría a ~770; llegar a 400 exige decidir qué pasa con los refs.

---

## 10. No verificado

- **Nada en iPad.** Ni Pencil, ni dedos reales, ni palm rejection, ni rendimiento.
- **Sin capturas de pantalla.** El panel del navegador integrado estuvo oculto toda la sesión (no había ventana abierta): el `rAF` estaba congelado y las capturas daban timeout. Para probar el gizmo se montó la app con `requestAnimationFrame` sustituido por un temporizador; el bucle de render real no cambió, pero **nadie ha mirado un frame**.
- **El arnés de Node no usa el `getLayerBoundingBox` real** (escanea píxeles en un canvas): lleva un sustituto geométrico. El real se ejercita en la matriz de escritorio y en `text-check`.
- **Cuándo entrega el navegador cada evento**, el timing de render de React y la captura de puntero del DOM real: fuera del alcance de las trazas.
- `pixcheck`, `pixcheck2`, `alphaleak` y `__timelapseCheck()` no se pasaron: ningún commit toca render ni export.
- `dior-render.js`: ninguno de los archivos tocados está en su grafo; no se volvió a medir.
