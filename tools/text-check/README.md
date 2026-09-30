# text-check — caja del gizmo, picking y deformación del texto contra el render real

Mide el texto contra lo que **pintan** `renderTextShape` / `renderFrame`, nunca contra la
matemática que se prueba (una caja calculada con `textMetrics` no puede validar `textMetrics`).

1. `npm run dev`
2. Abrir `http://localhost:3000/tools/text-check/` — corre todo al cargar (~1 min).
   `?only=gizmo,pick` corre un subconjunto (`gizmo`, `pick`, `drawinside`, `preview`, `fingerprints`);
   `?manual` no corre nada (para automatizar).
3. Resultado por sección en la página y en `window.__textCheck`.

| Sección | Qué mide | Criterio |
|---|---|---|
| 1 · Caja del gizmo | `getLayerBoundingBox` contra la tinta de `renderTextShape`: 5 fuentes × corto/varias líneas × rotado/no × izq/centro, + estirado, aplastado, cizalla, espejado H/V (con el **reducer real**), trazo + texto, goma que corta | tinta fuera ≤ 1 px, sobrante ≤ 2 px |
| 2 · Picking de CINEMA | `pickLayerAtPoint` como caja negra, preguntado por cada píxel pintado; aciertos lejos del texto | sin cubrir ≤ 2 px (el borde de antialias de un texto rotado llega a ~1,6 px), 0 aciertos lejos |
| 3 · drawInside en texto deformado | render de antes y de después de un `TRANSFORM_LAYER` / `FLIP_LAYER`: la capa de después debe ser la imagen de la de antes | forma interior desencajada ≤ 0,5 %; el **control** (comportamiento anterior a v3.17.56) debe desencajar |
| 4 · Vista previa = resultado | `renderFrame` con el Move activo contra el render de lo que hornea el reducer | 0 px distintos |
| 5 · Huellas del `.dior` antiguo | `tools/svg-diff/fixtures/text-legacy-v3.17.55.dior` por `LOAD_PROJECT`, SHA-256 por texto y por capa con `Math.random` sembrado | idénticas a la referencia fijada |

Cada sección lleva una **AUTOCOMPROBACIÓN** que mide una entrada errónea a propósito (caja recortada
3 px, picking de un texto 10 % menor, el control del drawInside, +0,001 rad en un texto) y debe
fallar: un instrumento que no caza un fallo conocido no prueba nada.

**Huellas (sección 5):** dependen del navegador y del sistema (rasterizado de fuentes), así que la
referencia vive en `localStorage` de ESTE navegador. Flujo: antes de tocar el render de texto,
correr y pulsar «Fijar referencia»; después del cambio, volver a correr. Probado: pasar el
`letterSpacing` de Inknut de −0,04 a −0,041 em cambia exactamente las huellas de los 6 textos en
Inknut y de sus 4 capas, y ninguna más.

Detalle técnico en `src/REFERENCE.md` §10 «Dev Tools».
