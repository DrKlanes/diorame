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
