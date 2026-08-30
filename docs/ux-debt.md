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

## Regla dorada 1 de CLAUDE.md desactualizada

**Estado:** anotado, sin tocar. Frente aparte.

CLAUDE.md sigue diciendo que `StrataCanvas.tsx` está **congelado** ("Solo
extraer código de él; nunca agregar líneas nuevas"). Esa redacción quedó atrás
con el refactor de v3.0.0: hoy `StrataCanvas` es thin shell y la regla vigente
en la práctica es disciplina normal en handlers, con GO explícito solo para el
núcleo — RAF loop, `buildRenderContext`, sincronización refs↔render, y timing
del live stroke.

Se hizo visible en v3.16.0: instrumentar el fin de trazo exigía una línea en
`handlePointerUp`, algo que la regla escrita prohíbe y la regla real permite
con GO. Se resolvió con GO explícito, pero la redacción sigue sin actualizar.

**Pendiente:** revisar el texto de la regla dorada 1 para que diga lo que de
verdad se aplica. No se tocó aquí para no mezclar frentes.

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
