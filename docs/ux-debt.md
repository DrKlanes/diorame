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

## El punto de encuadre (POI) no sobrevive a recargar

**Estado:** documentado, sin arreglar. Consecuencia aceptada, no bug.

`state.pointOfInterest` no aparece ni en `useSaveLoad.ts` ni en
`useAutoSave.ts`. Es coherente con que sea estado de vista puro —tampoco entra
en `HistorySnapshot`, así que Undo/Redo lo dejan intacto por el mismo motivo—
pero tiene un coste real: un encuadre bien elegido a base de tocar exactamente
la figura correcta se pierde al recargar la página o al reabrir el `.dior`.

**Pendiente:** si se decide que merece persistir, entra en el mismo lugar que
`hiddenLayers`/`locked3DLayers` en el payload de guardado — no en
`HistorySnapshot`. Es una decisión de producto (¿quiere Moisés que un
encuadre guardado sobreviva al archivo, o es intencionadamente efímero como
una posición de scroll?), no una omisión técnica.

---

## STORYTELLING ignora el POI sin decirlo

**Estado:** documentado, sin arreglar. Confirmado en código
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

## POIPill dice "focus", y es encuadre

**Estado:** anotado, sin tocar. Copy pendiente de Moisés.

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

## El pinch simétrico no dispara el zoom

**Estado:** preexistente, sin arreglar. Medido en v3.17.38.

`handleTouchMove` decide que un gesto de dos dedos es un pinch mirando cuánto
se ha desplazado el **centro** de los dos toques respecto a `startCenter`
(`StrataCanvas.tsx`, rama de `e.touches.length === 2`: si la distancia del
centro no supera 10px, `tapMoved` nunca se pone a `true` y `isPinching` nunca
se enciende). La separación entre los dedos —que es lo que define un pinch—
solo se consulta *después*, para decidir el factor de escala.

Consecuencia: separar los dos dedos **a la vez y de forma simétrica**, que es
el gesto de libro, deja el centro quieto y **no hace zoom**. Medido: dos
toques a 100px separándose hasta 540px sin mover el centro →
`isPinching: false`, `drawingZoom` sin cambiar. El mismo gesto hecho de forma
asimétrica (que es como sale de la mano la mayoría de las veces) sí funciona:
`isPinching: true`, zoom 1 → 3.

Esto no lo reportó nadie: apareció midiendo la no-regresión del pinch al
cerrar la Fase 3 del arreglo del Move. Pero es un gesto que alguien puede
estar intentando hoy y viendo que no responde, y el fallo es intermitente por
naturaleza —depende de lo simétrica que salga la mano—, que es la peor forma
de romperse.

**Pendiente:** el umbral debería mirar el **cambio de distancia entre los
dedos**, no (solo) el desplazamiento del centro. Ojo al hacerlo: ese mismo
`tapMoved` es lo que distingue un tap de dos dedos (undo) de un arrastre, así
que tocarlo afecta al gesto de undo. No es un cambio de una línea.

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

## `activePointerIdRef` se borra con el pointerup de cualquier dedo

**Estado:** documentado, sin arreglar. Ventana estrecha.

`handlePointerUp` pone `activePointerIdRef.current = null` como segunda
instrucción, antes de cualquier guarda — también cuando el `pointerup` es de un
puntero que `handlePointerDown` ignoró (un segundo dedo, que sale por el
`!e.isPrimary`). Si el primer dedo tiene una captura viva y se levanta el
segundo, se pierde el rastro de esa captura.

Consecuencia: si la app se va a segundo plano justo ahí, `resetGestureState` ya
no puede liberar la captura huérfana, porque el `pid` que guardaba es `null`.
El resto del reset (flags de gesto, transform, stroke) sí corre, así que el
daño se limita a una captura de puntero colgada.

**Pendiente:** o llevar la cuenta de los punteros vivos en vez de guardar solo
el último, o no borrar el rastro cuando el `pointerup` es de un puntero que
nunca se capturó. Lo segundo es más barato y cubre el caso real.

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

## Mover una capa vacía crea un paso de undo que no hace nada

**Estado:** documentado, sin arreglar. Trivial de arreglar, molesto de sufrir.

Con el Move sobre una capa sin trazos, `handlePointerDown` no encuentra bounding
box y cae a la rama de `moveRef`. El arrastre acumula sus offsets con
normalidad, y `handlePointerUp` despacha `MOVE_LAYER` en cuanto superan 0.1px —
sin comprobar antes si hay algo que mover. El reducer empuja su paso al
historial igualmente.

Medido en v3.17.36: un arrastre sobre una capa con cero shapes → 1 paso nuevo en
`state.history`.

Consecuencia: cada arrastre en vacío —fácil de hacer sin querer mientras se
busca la capa correcta— gasta un hueco de los `MAX_HISTORY_STEPS = 50`, y
deshacer no produce ningún cambio visible, que es exactamente lo que hace que un
undo se sienta roto. En una sesión larga puede empujar fuera de la ventana pasos
que sí importaban.

**Pendiente:** la guarda natural es la misma que ya existe para el transform
(`isSignificantTransform` protege la otra rama): no despachar `MOVE_LAYER` si la
capa activa no tiene shapes. Ojo a no confundirlo con el caso legítimo de una
capa cuyo contenido es solo borrador, que sí tiene shapes aunque
`getLayerBoundingBox` devuelva null.

---

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
máscara: es el único `<mask>` que puede quedar en el SVG.

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

### La caja del gizmo de Mover mide el texto con otra copia del layout

**Estado:** el gizmo se arregló en v3.17.53; el picking de CINEMA y `svgText.textCorners`
siguen con su copia hasta v3.17.54 y v3.17.55.

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

### Rendimiento en iPad: sin probar

En escritorio (build de producción), la escena de ejemplo (2 369 formas, 798
drawInside) exporta en ~1,5 s aislada y ~5 s dentro de la app con el lienzo
pintando; una escena con texto exporta en ~0,1 s (fontkit + fuentes en frío). En
iPad no se ha medido; será más lento. El export cede el hilo cada ~30 ms, así que
no debería congelar la UI, pero puede tardar.
