# Deuda de UX — hallazgos documentados, no programados

Cosas que la interfaz hace mal y que están **verificadas en el código**, no
supuestas. Ninguna está planificada. Existen aquí para que, cuando el síntoma
reaparezca, no se vuelva a diagnosticar desde cero.

> El backlog técnico canónico es `BACKLOG.md` (raíz). Este archivo recoge deuda
> de **experiencia** surgida de incidentes concretos. Si crece, consolidar allí.

---

## Guardar `.dior` no da feedback inmediato

**Estado:** documentado, sin arreglar. Causa raíz de un incidente real.

### El síntoma

2026-08-23: al guardar un proyecto aparecieron dos diálogos nativos de "Guardar
como" y se descargaron dos `.dior`. La sospecha inicial fue doble invocación del
handler.

No lo era. Los ficheros llevan `Date.now()` en el nombre
(`useSaveLoad.ts:42`) y los timestamps zanjaron la discusión:

```
proyecto-sin-titulo-1787492584678
proyecto-sin-titulo-1787492679644
                     diferencia: 94.966 ms ≈ 95 segundos
```

Minuto y medio. No fue doble clic ni autorrepetición de teclado: fueron **dos
acciones humanas deliberadas**. El usuario pulsó, la app pareció colgada,
esperó, y volvió a pulsar.

La investigación del camino de código salió entera limpia (bubbling, las dos
instancias de `useSaveLoad`, handlers de `DiActionButton` y `EnhancedTooltip`,
StrictMode, efectos). **No hay bug de doble invocación.**

### El mecanismo

Tres cosas se suman para producir una interfaz congelada y muda:

1. **El botón no se deshabilita.** `DiActionButton` acepta un prop `disabled`,
   pero `DocumentPill.tsx:49` no lo pasa. El botón queda pulsable e idéntico
   durante todo el guardado.
2. **`JSON.stringify` del documento completo es síncrono.**
   `useSaveLoad.ts:38` serializa `state.shapes` entero en el hilo principal. En
   un proyecto grande son cientos de milisegundos con la UI bloqueada — sin
   spinner, sin cursor de espera, sin nada.
3. **El toast de éxito llega al final.** `useSaveLoad.ts:46`, después de la
   serialización y del `link.click()`. Es la primera señal de que algo ocurrió,
   y llega cuando ya ha terminado.

Resultado: entre el clic y cualquier evidencia de que la app te oyó pueden
pasar varios segundos de congelación. La interfaz **invita** a volver a pulsar.

### Por qué no se arregla ahora

Un cooldown temporal en el handler se evaluó y se descartó: habría sido un
parche a un problema inexistente. Nada con una ventana razonable (~800 ms)
atrapa dos acciones separadas 95 segundos, y a cambio añadiría una regla nueva
al guardado.

La palanca real es feedback, no guards. Cuando se aborde, el orden natural es:

1. Pasar `disabled` al botón mientras el guardado está en curso — es lo más
   barato y ya elimina el "¿me ha oído?".
2. Señal inmediata al pulsar (spinner o toast de "guardando…"), antes de la
   serialización, no después.
3. Solo si sigue doliendo: sacar el `JSON.stringify` del hilo principal.

### Impacto en la analítica

`project_saved` no lleva flag `once` por diseño. Si en GA4 aparecen guardados
repetidos en ventanas cortas, la hipótesis principal **no es un bug de código**:
es esto. Ver `docs/analytics.md`.

---

## El punto de encuadre (POI) no sobrevivía a recargar — resuelto en v3.17.26

**Estado:** resuelto (esta entrada seguía diciendo «sin arreglar»; corregido en el barrido
documental de v3.17.61). Desde v3.17.26 (`a9a839a`) `pointOfInterest` se guarda en el `.dior`
(`useSaveLoad.ts`) y en el autosave (`useAutoSave.ts`), junto a `hiddenLayers`/`locked3DLayers`,
y NO entra en `HistorySnapshot`: deshacer no lo toca. `LOAD_PROJECT` lo valida y los `.dior`
anteriores, que no lo traen, abren sin punto de encuadre.

---

## STORYTELLING ignora el POI sin decirlo — resuelto en v3.17.28

**Estado:** resuelto en v3.17.28 (`c550fe1`, opción (a) de abajo): en STORYTELLING el POIPill se deshabilita con explicación — «Storytelling sigue su propio recorrido». Esta entrada seguía marcada como abierta; corregido en el barrido documental de v3.17.61. Lo que sigue es el diagnóstico original.
(`cinematicCamera.ts`).

Con cualquier otro preset, doblemente tocar el lienzo en CINEMA mueve la
cámara al punto tocado — verificado y corregido de fondo entre v3.17.17 y
v3.17.25 (ver REFERENCE.md §10, "CINEMA Framing (POI) — Invariants"). Con
`storytelling` el gesto no hace NADA visible: la cámara sigue el recorrido de
los waypoints (centroides de cada capa) y solo cae en `poiX`/`poiY` en el
caso degenerado de cero waypoints, que en la práctica no ocurre con contenido
real.

El síntoma para el usuario: el marcador del POI (`drawPoiMarker.ts`) SÍ
aparece —se fija igual que en cualquier otro preset, `SET_POINT_OF_INTEREST`
no distingue por `cinematicType`— pero la cámara no responde a él. Parece un
segundo bug de encuadre encima del ya arreglado.

**Pendiente:** decidir si `storytelling` debe (a) ignorar el doble click de
forma explícita —deshabilitando el gesto o el marcador en ese preset, para
que la ausencia de efecto no se lea como un fallo— o (b) incorporar el POI al
recorrido de alguna forma (p. ej. como parada extra). Es diseño del preset,
no un fix mecánico.

---

## POIPill decía "focus", y es encuadre — resuelto en v3.17.27

**Estado:** resuelto en v3.17.27 (`0b1f67b`): el pill dice «Double tap to frame» / «Doble toque para encuadrar». Esta entrada seguía marcada como abierta; corregido en el barrido documental de v3.17.61. El componente no se renombró. Lo que sigue es el diagnóstico original.

El pill de ayuda en CINEMA usa el texto "Double tap to focus" / su
equivalente en español, y el propio nombre del componente (`POIPill.tsx`) usa
"focus" en el código. Es justo la palabra que puede confundir esto con el
sistema de DoF (`postProcessing.focusDist`/`focusTargetLayer`), que es un
control completamente distinto —profundidad de campo en Z, no posición de
cámara en X/Y— y que efectivamente se llama "focus" en la UI de FX.

**Pendiente:** copy nuevo en EN y ES para el pill (y, si se quiere ir a fondo,
renombrar el componente). No se toca aquí porque es texto de producto en la
voz de Moisés, no una decisión técnica.

---

## El pinch simétrico no dispara el zoom — y si es rápido, DESHACE

**Estado:** preexistente, sin arreglar. Medido en v3.17.38; re-medido en v3.17.61 con un
hallazgo peor (abajo). Arreglo propuesto, pendiente de validación en iPad.

`handleTouchMove` (`StrataCanvas.tsx`, rama `e.touches.length === 2`, ~l. 660-671) decide que
un gesto de dos dedos se ha movido —y enciende `isPinching`— SOLO si el **centro** de los dos
toques se desplaza más de 10 px desde `startCenter`. La separación entre los dedos, que es lo
que define un pinch, solo se usa después para el factor de escala.

Medido con toques sintéticos (v3.17.61):

| Gesto | Resultado |
|---|---|
| Pinch simétrico lento (100 → 540 px en 700 ms, centro quieto) | nada: ni zoom ni undo |
| **Pinch simétrico rápido (el mismo en 200 ms)** | **sin zoom y ejecuta UNDO** |
| Pinch asimétrico (centro +30 px) | zoom 1 → 3 |
| Toque de dos dedos (control) | UNDO, correcto |

Lo del UNDO: como `tapMoved` nunca se pone a `true`, `handleTouchEnd` (~l. 760-768) trata el
pinch como un **toque de dos dedos** y, si ha durado menos de 300 ms, despacha `UNDO`. Un pinch
rápido y simétrico borra la última acción del usuario sin que haya pedido deshacer nada, y es
intermitente por naturaleza (depende de lo simétrica que salga la mano).

**Arreglo propuesto (no implementado: es el gesto más usado en iPad):** en esa misma rama, que
el gesto cuente como movido —y encienda `isPinching` si `startDist >= 5`— cuando el centro se
mueva más de 10 px **o** la distancia entre los dedos cambie más de 10 px
(`|dist − startDist| > 10`). Arregla ambos síntomas a la vez, porque es el mismo `tapMoved`. Lo
que hay que validar en hardware: que un toque de dos dedos real (undo) no cambie la separación
más de 10 px al apoyar y levantar —si lo hiciera, el undo por toque se perdería— y que el zoom
no pegue un salto al engancharse (el factor ya incluye esos 10 px, igual que hoy en el camino
asimétrico).

---

## El dead-zone de 3px está calibrado para ratón

**Estado:** anotado, sin tocar. Calibración, no bug estructural.

`DRAG_DEAD_ZONE_PX = 3` (`canvas/moveGizmoInteraction.ts`). Apple usa ~10px de
slop para decidir que un toque es un tap y no un arrastre. Con el dedo, 3px se
cruzan casi siempre; con Pencil no.

Consecuencia: un tap con el dedo para **seleccionar** una capa puede cruzar el
umbral, escribir un `currentTransform` de 3px y —como
`isSignificantTransform` solo exige `>0.1`— commitear ese desplazamiento al
historial. Un empujón silencioso sobre la obra, más un paso de undo que el
usuario no pidió.

**Pendiente:** decidir el valor con la mano de Moisés en un iPad, no por
cálculo. Probablemente un umbral distinto por `pointerType` (dedo vs pen vs
ratón) en vez de un número único. Se aparcó a propósito durante el arreglo del
Move (v3.17.36-39) para no mezclar calibración con lo estructural.

---

## `activePointerIdRef` se borra con el pointerup de cualquier dedo — y ese pointerup cierra el gesto ajeno

**Estado:** documentado, sin arreglar. Re-medido en v3.17.61: el problema es más ancho que la
captura huérfana. Arreglo propuesto, pendiente de validación con Apple Pencil.

`handlePointerUp` (`StrataCanvas.tsx`, ~l. 1350) no mira de qué puntero es el evento: libera su
captura, pone `activePointerIdRef.current = null` y sigue — confirma el trazo, el transform del
Move o el `MOVE_LAYER` del gesto en curso aunque ese `pointerup` sea de otro puntero. Y el canvas
también lo usa como `onPointerLeave`.

Medido con eventos de puntero sintéticos (v3.17.61):

- **S1** — un puntero primario dibuja; un segundo, no primario, baja y sube a mitad de trazo:
  el ref queda en `null`, la captura del primero sigue viva (huérfana: `resetGestureState` ya no
  puede soltarla) **y el trazo del primero se confirma a medias** (9 puntos; el resto del
  movimiento se pierde).
- **S2** — un Apple Pencil dibuja; un toque de palma (primer toque, así que `isPrimary: true`)
  baja y sube: `handlePointerDown` lo acepta —la guarda del lápiz existe en `handleTouchStart`
  (~l. 562) pero no en `pointerdown`—, sobrescribe `activePointerIdRef` con el id de la palma y
  **el trazo del lápiz se pierde entero** (0 shapes al levantar el lápiz).

Salvedad: eventos sintéticos. iPadOS puede suprimir la palma por su cuenta cuando se usa el
Pencil; hay que confirmarlo en hardware antes de dimensionar S2.

**Arreglo propuesto (no implementado: toca handlers de puntero y gesto):**
1. `handlePointerUp`: si hay un puntero activo y `e.pointerId` no es él, soltar solo la captura
   de ESE puntero (si la tuviera) y salir, sin tocar el ref ni el gesto. Cubre S1 y la captura
   huérfana; `onPointerLeave` hereda la guarda.
2. `handlePointerDown`: con un trazo de lápiz en curso (`isDrawingRef` y
   `drawingPointerTypeRef === 'pen'`), ignorar los punteros `touch`, igual que ya hace
   `handleTouchStart`. Cubre S2.
Ambos cambian la decisión de un handler de puntero; la regla de CLAUDE.md pide decidirlo aparte y
validarlo con Pencil y palma reales.

---

## La celda "deseleccionada × dentro" decide en el press

**Estado:** decisión consciente, no arreglar sin datos.

La tabla de decisión del Move (`handlePointerDown`) resuelve tres de sus cuatro
celdas de forma inmediata. La deselección se movió al `pointerup` en v3.17.39
—era la única decisión tipo tap que se resolvía en el press, y por eso el
primer dedo de un gesto de dos deseleccionaba— pero la **selección** sigue
ocurriendo en el press.

Consecuencia: un pinch cuyo primer dedo caiga encima de la capa la
**selecciona**. Es un cambio de estado que el usuario no pidió.

Se deja así a propósito: enseña el gizmo en vez de esconderlo (no deja el Move
aparentemente muerto, que era el síntoma grave), y aplazarlo al release
rompería el modelo Figma de seleccionar-y-arrastrar en un solo gesto que
v3.17.8 diseñó explícitamente —el gizmo no aparecería hasta soltar—.

**Pendiente:** mirarlo con datos de uso real. Si molesta, la salida no es
aplazar la selección sino no abrirla cuando el gesto resulte ser multitáctil,
que es lo que ya hace la Fase 3 con el arrastre.

---

## Mover una capa vacía creaba un paso de undo que no hacía nada — resuelto en v3.17.61

**Estado:** resuelto. `MOVE_LAYER` y `TRANSFORM_LAYER` devuelven el estado intacto si la capa no
tiene shapes: sin paso de historial, sin `isDirty`. La guarda está en el reducer, no en
`handlePointerUp`, así que cubre cualquier origen del despacho sin tocar el handler.

Medido con el fiber (v3.17.61): arrastre real del Move sobre una capa vacía → historial 1 → 1;
`TRANSFORM_LAYER` directo sobre la capa vacía → 1 → 1; capa con contenido → +1 paso y la capa se
mueve; capa con SOLO una goma (tiene shapes aunque `getLayerBoundingBox` devuelva null) → sigue
moviéndose y registrándose (+1). Antes (medido en v3.17.36): un arrastre en vacío = 1 paso nuevo
que no deshacía nada visible.

## El borrador no tiene control propio de grosor

**Estado:** aceptado por ahora, anotado al bajar el techo del pincel a 70
(v3.17.40).

`ToolOptionsPanel.tsx` — el único slider de grosor de la app— solo se renderiza
con `state.tool === 'brush'` (`if (state.tool !== 'brush') return null;`). El
eraser comparte la misma variable de estado
(`brushThickness: (isBrushTool || isEraserTool) ? state.currentBrushThickness :
undefined`, `StrataCanvas.tsx:1487`) pero no tiene forma de ajustarla mientras
está activo: hereda lo que quedó puesto la última vez que se usó el pincel, sin
ningún control visible que lo confirme ni lo contradiga.

Con el rango 1-100 esto ya era una limitación silenciosa. Con el techo bajado a
70 y la curva de v3.17.41 sigue siendo exactamente la misma limitación, solo
que ahora el borrador hereda además el techo más bajo — cambio correcto (es el
mismo control, no debería haber dos fuentes de verdad) pero que nadie decidió
mirando el borrador en concreto.

**Pendiente:** decidir si el borrador necesita su propio control visible, o si
compartir el ajuste del pincel sin más aviso es aceptable en la práctica.
Producto, no mecánica.

---

## Export SVG: límites conocidos tras la geometría real (v3.17.48 → v3.17.52)

**Estado:** el texto pasó a contornos en v3.17.52 (antes: sans-serif, sin negrita
ni saltos de línea, y con máscara si tenía goma encima). Lo que sigue abierto está
anotado abajo. Medir cualquier arreglo con `tools/svg-diff` (ver CLAUDE.md
«Verificación»).

### Palabras que no pueden pasar a contorno quedan como texto vivo

Una palabra cuyo contorno no coincide con lo que pinta Canvas, o con un carácter que
la fuente no tiene (Canvas lo pinta con una fuente del sistema: cirílico, emoji…),
sale como `<text>` con la familia de la app, y el export avisa con un toast del
número de caracteres. Solo se verá bien donde esa fuente esté instalada. Hoy caen
aquí, de las fuentes de la app, `ª` y `º` en Inknut Antiqua: fontkit no compone esos
glifos como el navegador (la forma difiere, no solo la posición) y no se ha
encontrado la causa. Si una goma alcanza una de esas palabras, esa palabra lleva
máscara. Las otras máscaras posibles son las de reserva de las booleanas: una operación que
falla, o una resta de goma que paper.js devuelve vacía dejando tinta (v3.17.59); ambas se
cuentan y avisan en un toast.

### Las formas que se cruzan consigo mismas salen con nodos rectos

paper.js pierde área con curvas muy autocruzadas, así que `svgGeometry.ts` las
aplana a polígono (tolerancia 0,25) antes de resolver. Se ven igual, pero en
Illustrator son cientos de nodos rectos en vez de curvas: peor para editar nodo a
nodo. Afecta sobre todo a gomas frotadas y a blobs en forma de lazo; las formas
simples conservan sus curvas.

Lo mismo le pasa al **texto que toca una goma o un drawInside**: se parte en un trozo
por glifo y cada glifo se aplana (tolerancia 0,1), porque muchas fuentes dibujan
letras como B o D con contornos solapados que paper.js no resuelve bien en curva. El
texto que no toca nada conserva sus curvas.

### El texto se medía con copias divergentes del layout (gizmo, CINEMA, export)

**Estado:** resuelto. El gizmo se arregló en v3.17.53, el picking de CINEMA en v3.17.54
(`pickLayerAtPoint` usaba una estimación de 0,55 em por carácter: se quedaba hasta 117 px
corto en Inknut y se pasaba hasta 89 px en Bangers) y `svgText.textCorners` en v3.17.55
(dimensionado del lienzo SVG; salida idéntica al decimal). Todo lo que mide texto pasa
ya por `utils/textMetrics.ts`, salvo `runBounds`, que es una cota generosa a propósito.

`transformUtils.ts` (`getLayerBoundingBox`) tenía su propia versión del layout de texto.
El diagnóstico inicial fue «solo conoce tres fuentes y no aplica letterSpacing ni
rotación». Era cierto, pero **no era la causa principal**. Medido contra el render real
(tinta de `renderTextShape` frente a la caja), lo que dominaba era otra cosa: el canvas
temporal donde se escanea la tinta se dimensionaba solo con `shape.points` más 100 px de
padding, y un texto tiene un único punto (el ancla). Resultado: un canvas de 200×200 que
**recortaba el texto a ~100 px del ancla**, en cualquier fuente. Una capa con un título
largo tenía una caja de ~100 px de ancho con hasta 414 px de tinta fuera; el clic en la
mitad derecha del título contaba como «fuera de la caja» (deseleccionaba en vez de mover)
y el pivote de rotación, voltear y «Centrar capa» actuaban sobre el centro de esa caja
truncada. Las fuentes mal medidas y la rotación ignorada solo se veían en textos cortos y
centrados, los únicos que cabían en el canvas de 200×200.

Arreglo: `utils/textMetrics.ts` mide la tinta de cada línea con Canvas
(`actualBoundingBox*`) sobre el layout de `textLayout.ts`, y esa tinta —rotada alrededor
del ancla— entra en los límites gruesos que dimensionan el canvas. El texto se dibuja con
`layoutText` y su rotación. La caja sigue ajustada a la TINTA (una goma que corta el
texto la encoge) y alineada a ejes: un texto rotado tiene la caja del rectángulo que
envuelve su tinta inclinada, igual que un trazo. Consecuencia asumida: el pivote depende
de las letras, no del bloque tipográfico.

Lección de método: el síntoma «la caja no abraza Bangers o Inknut» apuntaba a la fuente y
no era la fuente. Medir contra el render antes de aceptar la causa que sugiere el síntoma.

### El texto no se deformaba con la capa (resuelto en v3.17.56)

`TRANSFORM_LAYER` excluía el texto del estiramiento: solo horneaba `fontSize × scale` y
`rotation + delta`, descartaba `scaleX/scaleY` y ni siquiera movía el ancla con ellos. En
una capa mixta los trazos se estiraban y el texto se quedaba clavado; un drawInside dentro de
un texto dejaba de encajar. Voltear tampoco espejaba el texto (negaba la rotación e
intercambiaba la alineación), con el mismo resultado para el drawInside.

Ahora el texto lleva una matriz 2×2 opcional (`textMatrix`, `utils/textTransform.ts`; export SVG desde v3.17.57): un
estiramiento de un texto rotado es una cizalla en su propio marco, y solo una 2×2 completa
se mantiene cerrada al componer transformaciones. Voltear espeja de verdad (decisión de
producto: voltear significa lo mismo para todo). Los ficheros antiguos no llevan matriz y se
leen por `rotation`: se abren idénticos, incluidos los textos volteados a la antigua.

Límite conocido: aplastar repetidamente hasta el clamp (0,01 por gesto) puede dejar un texto
sin píxeles visibles; entonces la capa no tiene caja de gizmo y solo se recupera con deshacer
(igual que un trazo aplastado a nada).

### Las asas laterales no se alcanzaban en cajas bajas (una línea de texto) — resuelto en v3.17.60

`hitTestGizmo` comprobaba las esquinas ANTES que los lados, con 40 px de radio: en una caja de
menos de ~80 px de alto el asa lateral quedaba dentro del radio de dos esquinas y el toque
siempre cogía la esquina (escala uniforme). Ahora gana el asa MÁS CERCANA dentro del radio.
Medido en rejillas de 200 901 puntos: cajas de 400×300 (rotada y sin rotar) idénticas al
comportamiento anterior; en cajas pequeñas solo cambian los puntos donde dos asas se solapan, y
siempre a favor de la más cercana. Título de una línea (caja de 45 px): el asa derecha estira.

### paper.js podía vaciar un glifo al restarle una goma, sin avisar (T23) — resuelto en v3.17.59

`subtract` de paper.js devolvía un path VACÍO sin lanzar error cuando la goma solo cruzaba el
glifo: la E de BODEGA (T23) desaparecía del SVG sin contarse ni avisar (1 629 px; sin espejar le
pasaba a la D). Medido con restas aleatorias: 2 de ~490 en glifos, 0 de ~8 200 en trazos (lisos,
tapered, aplanados por autocruce, pequeños a escala de glifo, ya cortados por otra goma).

Ahora (`svgGeometry.ts`, `eraseFrom`): resultado vacío con algún vértice de la pieza fuera de la
goma = fallo → un reintento con pieza y goma giradas 0,05° (arregla T23: 2 px) → si sigue vacío,
la pieza lleva máscara y se cuenta; los fallos de geometría ya salen en un toast, antes solo en
consola. Vale para trazos y glifos.

Lo que NO funcionó como reintento: desplazar ambas piezas (el fallo sigue a la geometría, no a la
posición), aplanar la goma, cambiar la tolerancia de aplanado del glifo, restar la curva original
sin aplanar (sale una parte, mal). Y lo que NO sirve como detector: la identidad de áreas de
paper.js, que cuenta doble los contornos solapados de un glifo (E de Cinzel: 2 025 u² frente a
1 913 rasterizados).

Sin cubrir: la misma clase de fallo en la `intersect` de drawInside (una forma interior que
desapareciera). No se ha medido.

### El MP4 de animación en DRAW graba el canvas vivo — resuelto salvo el marcador del POI

`exportAsMP4` graba `canvas.captureStream()` del canvas VIVO (GIF, PNG-secuencia y PNG HQ
re-renderizan con `skipCinematicOverlays` y no tienen el problema). Todo lo que el RAF pinta
en ese canvas durante la grabación entra en el vídeo.

**Resuelto:** gizmo del Move y eje de simetría (v3.17.63), guía de composición (v3.17.62) y
onion skin (v3.17.65) se omiten con `!isExporting` (`REQUEST_EXPORT` → `FINISH_EXPORT`, que se
despacha en `recorder.onstop`). Medido con el MediaRecorder real y frames decodificados:
- gizmo y eje: antes, 1 001 y 91 trazos dentro de la grabación y el gizmo en 3 de 6 frames;
  después, 0 y 0.
- onion skin: antes, 11 lecturas de fantasma (capa anterior ~82 de oscurecimiento, siguiente
  ~44, con la activa a ~205) en los 8 frames decodificados; después, 0. Los exports por
  re-render (GIF, PNG-secuencia, HQ) salen bit a bit idénticos y el onion skin vuelve en
  pantalla tras `FINISH_EXPORT`.

**Alcance del PNG:** en DRAW la UI no ofrece PNG. `ExportPill.tsx` solo llama a
`handleCapture` (el único que despacha `REQUEST_EXPORT 'png'` y llama a `setNextPNGQuality`)
dentro del bloque `{isCinematic && (`; el bloque `{!isCinematic && (` ofrece SVG/SVGZ y, con
animación, vídeo, GIF y PNG-secuencia, y `useExportFlow` (atajos incluidos) solo despacha
`svg`/`svgz`. El reducer no mira el modo: en DRAW solo se llega a `exportAsPNG` despachando
`REQUEST_EXPORT 'png'` por script. Por eso la guía de composición (solo DRAW) no puede salir en
un PNG «device» desde la UI, aunque por script sí (se midió así, con la puerta de v3.17.62 ya
puesta: la puerta no protege ese camino por la razón de abajo).

### El marcador del POI entra en el PNG «device» y en el MP4 estático de CINEMA

**Estado:** documentado y medido, sin arreglar. Decisión de no hacerlo aún: el arreglo completo
toca el efecto de exportación de `StrataCanvas.tsx`.

`drawPoiMarker` (anillo morado `#9a0ff9` con halo blanco) se pinta en el canvas vivo cuando
`isCinematic && poi && poiMarkerSetAtRef > 0`, 1,8 s a opacidad plena y 1,2 s de desvanecido tras
fijar el punto. El PNG «device» y el MP4 estático de CINEMA salen de ese canvas.

Medido en exportaciones reales (v3.17.63, escena vacía para que lo único morado sea el
marcador; píxeles con azul − verde > 60):
- **PNG «device» a los 300 ms de fijar el POI: 168 px morados.** Control a +4 s: 0.
- **MP4 estático de 6 s, frames decodificados:** 169, 172, 173, 168 px morados en t = 0,05 /
  0,4 / 0,9 / 1,4 s; 123 en 1,9 s (desvaneciendo); 0 desde 2,4 s. Durante la grabación se
  dibujaron 162 trazos del marcador, todos con `isExporting = true`.

**Por qué la puerta `!isExporting` sola no basta.** `isExporting` ya es `true` mientras se
pinta (los 162 trazos), pero el PNG «device» captura de forma SÍNCRONA el bitmap ya pintado, en
el mismo efecto que recibe `REQUEST_EXPORT` (`src = canvas` → `toBlob`), antes de que se pinte
un solo frame con `isExporting = true`. El MP4 estático arranca `recorder.start()` en ese mismo
efecto, sin pausa (el de animación sí espera 80 ms), así que su primer frame también puede ser
el anterior. Es el mismo mecanismo con el que la guía salió en un PNG «device» pese a la puerta
de v3.17.62.

**Arreglo general identificado (no hecho):**
1. Puerta `!isExporting` en `drawPoiMarker` (`renderPipeline.ts`, el `if (isCinematic && poi &&
   …)`), una línea.
2. Esperar ~2 frames con `isExporting = true` antes de capturar, en `exportAsPNG` «device» y en
   `exportAsMP4` estático, para que lo capturado sea un frame ya pintado con la puerta puesta.
   Va en el efecto de exportación de `StrataCanvas.tsx` (~10 líneas): no es el RAF ni
   `buildRenderContext`, pero cambia el momento en que empieza una exportación.
La alternativa, que el PNG «device» re-renderice como el HQ, cambia un comportamiento legado a
propósito: decisión de producto.

**Por qué no es urgente:** la ventana es de ≤ 3 s tras fijar el punto, y llegar a exportar desde
ahí exige varios toques. El mismo arreglo cubriría la guía en el PNG «device» por script, que
la UI no permite en DRAW.

### Rendimiento en iPad: sin probar

En escritorio (build de producción), la escena de ejemplo (2 369 formas, 798
drawInside) exporta en ~1,5 s aislada y ~5 s dentro de la app con el lienzo
pintando; una escena con texto exporta en ~0,1 s (fontkit + fuentes en frío). En
iPad no se ha medido; será más lento. El export cede el hilo cada ~30 ms, así que
no debería congelar la UI, pero puede tardar.

---

## Super Riso (v3.18.0): deuda abierta

**Estado:** documentado, sin programar. Todo verificado en el código o medido; nada supuesto
salvo lo marcado [POR CONFIRMAR]. Diseño y cifras: `docs/super-riso.md`.

### El grano usa `Math.random` por frame: las exportaciones con grano no salen idénticas

`applyGrain` (previo a Super Riso) regenera el ruido con `Math.random` en cada frame y al
redimensionar. Super Riso en sí es determinista (semilla = tick de reimpresión o índice de
frame de la exportación; dos GIF con el grano apagado salen idénticos al byte), pero con el
grano encendido dos exportaciones del mismo proyecto difieren y la identidad byte a byte no es
comprobable. Para probar determinismo: apagar el grano. Arreglarlo exigiría sembrar el grano
desde `exportFrame` (toca el timing del render: GO).

### Grupos plegables en el FXPanel

El plan (§6.1) proponía cabeceras de grupo plegables en TODO el FXPanel (Textura, Lente,
Atmósfera y Super Riso), con el estado en `localStorage`. No se hizo: solo se pliega el panel
entero a píldora, y la subsección «Ajustes de impresión» de Super Riso. Con los 12 FX activos el
panel ya hacía scroll a 1920×1080; con el cuarto grupo desplegado hace más. Pendiente.

### `applySuperRiso.ts` está a 398 de 400 líneas

Cualquier adición exige partirlo antes (regla dorada 2). El corte natural: el camino síncrono y
el de retención/refinado a módulos propios; las rutas de depuración (`srpipe`, `srhold`,
`srbitmap`, `sroff`) son las candidatas a salir primero si algún día se retiran.

### El refinado en reposo puede mantener un frame viejo

En el nivel *preview*, con la imagen quieta ≥ 300 ms se refina un frame a calidad completa y se
retiene hasta que algo se mueva. «Algo se mueve» se decide con el movimiento de cámara y con la
identidad de las formas / el estado: si la imagen cambia SIN cambiar el estado ni la cámara,
el frame retenido no se invalida y se sigue viendo el viejo. No se ha visto en uso; no se ha
forzado el caso. [POR CONFIRMAR en iPad.]

### El aviso de vista previa y «Calidad completa siempre» no se han validado en iPad real

La lógica (nivel medido, `isSuperRisoPreviewDevice`, aviso, chip) se verificó en escritorio
forzando el nivel con `?srdebug=1&srlevel=preview`. En un iPad real no se ha visto: ni que el
nivel se detecte como *preview* en el umbral esperado (12 ms), ni cómo se ve el aviso a 196 px
de ancho, ni cómo se siente `fullQuality` (calidad completa a 12 fps). Solo se puede probar
tras el push.

---

## Super Riso · Fotocopia y Stencil (v3.19.0–3.20.1): pendientes y decisiones abiertas

**Estado:** registradas en la auditoría de v3.20.1, sin programar. Detalle técnico: REFERENCE.md §14.

### Stencil «Banksy» en modo oscuro con niebla atmosférica: sale casi negro

En modo oscuro la niebla tiñe el propio dibujo hacia el fondo oscuro, y los umbrales de Otsu se miden sobre
esos píxeles (la exclusión del color de fondo de v3.20.1 no los caza: son una mezcla). En la escena de ejemplo
«Banksy en cartón» queda en .3125 con niebla y .4375 sin ella. **Decisión de Moisés (v3.20.1): aceptado**; se
ajusta con Oscuridad, con Multicapa o apagando la niebla. Opción futura: medir los umbrales con la niebla apagada.

### El spray de Stencil sale algo más blando que en el Lab

El escáner de Fotocopia y Stencil sigue la Resolución compartida (`lerp(1, .65, r)` px de suavizado) en vez de
los valores fijos del Lab. Decisión de v3.19.2 (misma traducción que Riso); revisable si Moisés lo quiere más
duro.

### Goteras, salpicaduras y puentes de Stencil no aparecen en vivo con un preset de cámara activo

Por diseño se apagan mientras la cámara se mueve (flotarían desencajados del dibujo) y los mapas se calculan
con la cámara en reposo (≥ 200 ms; solo cuenta la cámara). Con un preset en marcha nunca hay reposo; las
exportaciones siempre los calculan. La nube se mantiene con el último mapa.

### Papel de origen distinto al del Lab

Fotocopia y Stencil usan el fondo del lienzo (blanco en oscuro) como papel de origen; el Lab toma el claro
dominante del dibujo. Con las mismas entradas coinciden; con las automáticas los umbrales y las zonas pueden
diferir. Los rotuladores salen de los colores de la escena, no de un k-means de la imagen.

### Sin medir en iPad real

Ni Fotocopia ni Stencil se han medido en iPad (usan el nivel y el aviso de Riso; sin variantes con pérdida, el
nivel *preview* solo baja la resolución). Stencil genera el campo de spray (~150 ms) la primera vez que se
activa, y cada instancia de exportación vuelve a compilar los programas de la técnica activa.

### Restos del dibujo del rotulador y sin ajuste fino

Los escalones en los extremos de los trazos de rotulador eran del modelo (corte a escuadra de cada pasada donde su
eje cruzaba el contorno) y se arreglaron en el Lab v22 → Diorame v3.22.0 (final por píxel, §14). El mínimo de
1,5 texels de v3.20.1 se mantiene. Ninguna técnica tiene sliders de
ajuste fino: los valores salen de `xBase()` / `sBase()` y de los `fine` de los estilos.

---

## Export HQ ×2: texturas y amplitudes en píxeles fijos (v3.20.4)

**Estado: RESUELTO en v3.20.4 (grano, Riso antiguo) y v3.20.8 (patrón de grano de la tinta, Stop Motion).** Se conserva el texto original como historial. Registrado al arreglar el grano (v3.20.4), sin programar. En el export HQ de CINEMA (`renderScale` = 2) lo que está
en píxeles de dispositivo y no se multiplica por S sale a la mitad de tamaño relativo.

- **Patrón de grano de la tinta** (`shapePattern`, `createNoise(256, 256, 15, 1, .3)` en `renderPipeline.ts`, relleno `source-atop` por capa):
  celdas de 1 px físico, también en el HQ de DRAW. Mismo defecto y mismo arreglo que el grano (celda ×S); cambia el aspecto de todo HQ,
  incluido DRAW, por eso no se tocó sin decisión de Moisés.
- **Stop Motion** (`renderLayerBody.ts`, amplitud 2/4/8 px sumada a puntos ya proyectados): a 2× el temblor es la mitad de grande.
- **Verificar por si acaso:** Pixel Art ya escala (3.9.4); Glow y DoF ya escalan; Grunge medido (escala); Riso antiguo corregido en 3.20.4.

---

## Persistencia: ajustes que se guardan pero no marcan `isDirty` (v3.20.5)

**Estado: RESUELTO en v3.20.7** (todas las acciones de la lista marcan `isDirty`; la animación de CINEMA nunca). Se conserva el texto original como historial. Registrado al arreglar la persistencia de FX (v3.20.5), sin programar. El autoguardado solo escribe con `isDirty`, y estas
acciones cambian campos que el `.dior` y el autoguardado SÍ guardan, pero no lo marcan: `SET_CINEMATIC_TYPE`, `SET_CINEMATIC_SPEED`,
`TOGGLE_HANDHELD`, `SET_HANDHELD_INTENSITY`, `SET_FOCAL_LENGTH`, `SET_VIEW_ZOOM_OFFSET`, `SET_LAYER_SPACING_FACTOR`,
`SET_POINT_OF_INTEREST` / `CLEAR_POINT_OF_INTEREST`, `TOGGLE_LAYER_VISIBILITY` y `SET_PROJECT_NAME`. Si solo se toca uno de ellos y se
recarga, el cambio se pierde (y `beforeunload` no avisa). Mismo arreglo que el modo oscuro (`isDirty: true`); no se hizo porque queda
fuera del alcance de FX y cada acción necesita decidir si entra en el historial.

---

## Serie 3.20.2–3.20.8 (cierre): pendientes que siguen abiertos

**Estado:** registrados al cerrar la serie de F0 de «FX en DRAW» (`docs/fx-in-draw.md`).

### Entrar en CINEMA por primera vez en la sesión pisa los valores de cámara del proyecto abierto

**Estado: RESUELTO en v3.20.9; refinado en v3.20.10 y cerrado del todo en v3.20.11.** 3.20.9: un proyecto abierto desde `.dior` o autoguardado conserva su vista y uno nuevo recibe los valores por defecto (señal booleana `cinemaViewInitialized`, «todo o nada»). 3.20.10: los valores por defecto rellenan huecos **campo a campo** (`cinemaViewSet`, uno por `focalLength`, `viewZoomOffset`, `layerSpacingFactor`, `cinematicType`), porque el «todo o nada» seguía pisando el preset *yoyo* de la escena de ejemplo (guarda el preset pero no focal, zoom ni separación). 3.20.11: los huecos se rellenan en `LOAD_PROJECT` con `CINEMA_VIEW_DEFAULTS` (antes caía a `state.*` y un fichero antiguo guardado sin pasar por CINEMA heredaba la cámara del proyecto anterior), `cinemaViewSet` vuelve a ser un booleano, y el guardado escribe los defaults mientras el proyecto no tiene vista propia (`cinemaViewForSave`; antes un proyecto nuevo guardado sin pasar por CINEMA escribía los marcadores 800/−600). Regla general en CLAUDE.md. Se conserva el texto original como historial.

`ControlsV2.tsx` fija focal 3840, zoom −2500, separación 1.0 y preset *forward* (`INIT_CINEMA_VIEW`) la primera vez que se entra en CINEMA
tras cargar la página, **también si se acaba de abrir un `.dior` con otros valores**. Reproducido en navegador: `LOAD_PROJECT` con focal 2000,
zoom −900, separación 1.5 y preset *spiral* → al pasar a CINEMA quedan 3840 / −2500 / 1 / *forward*. Es anterior a la serie (los mismos valores
se fijaban con cuatro acciones); la persistencia de estos campos (3.20.5–3.20.7) lo hace más visible. Arreglo previsto: no inicializar si
`projectWasLoaded` o si el estado ya no es el inicial. [Confirmado el síntoma; el arreglo, sin programar.]

### Coste del autoguardado en iPad

El clon estructurado de la escena de ejemplo (2 369 formas) cuesta ~35–50 ms síncronos en escritorio, una vez tras cada pausa de 1,5 s con
cambios y nunca durante un gesto (3.20.6). En iPad sin medir. [POR MEDIR] Si se nota, moverlo a un worker o espaciarlo.

### `requestIdleCallback` con el canvas ocupado tarda hasta su `timeout`

Con el RAF pintando sin parar (DRAW con zoom reciente, CINEMA), el hueco de idle llega a tardar 1 s: el `put` tras la última interacción se
midió a ~2,4 s en lugar de ~1,6 s. Aceptado: los volcados de `visibilitychange`/`pagehide` son inmediatos.

### FX también en DRAW: proyecto en pausa

Plan, decisiones, inventario y fases F1–F6 en `docs/fx-in-draw.md`. La deuda de FXPanel (grupos plegables, altura) se resuelve dentro de ese plan.
