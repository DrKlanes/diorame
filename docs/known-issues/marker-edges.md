# Problema conocido: almenas (escalones cuadrados) en los bordes del Rotulador

**Estado: MITIGADO en Diorame v3.26.86 / Lab v23.9; APARCADO por decisión de Moisés el 24 nov 2026.** No hay más intentos hasta que
se cumpla la regla del §6. Este documento existe para retomarlo sin repetir lo ya descartado.

## 1 · Síntoma

Super Riso › Fotocopia › Color a mano › Rotulador («Fanzine a rotulador»): en los bordes de las manchas aparecen **escalones
cuadrados alineados con los ejes** (almenas), sobre todo en manchas alargadas vertical u horizontalmente. Pasa **con cualquier
ajuste** (Descuido, Resolución, preset, Manchas/Huecos) y **en Diorame y en el Lab**. **La Acuarela no lo tiene** (no usa trazos:
deforma el borde con ruido antes de leer el campo). Desde v3.26.86 / Lab v23.9 se ven menos; no han desaparecido (Moisés lo confirmó a ojo).

## 2 · Historia de intentos

Cada uno quitó una causa real y ninguno quitó la última. Todo [VERIFICADO] salvo lo marcado.

| # | Versión | Qué se cambió | Qué se midió | Por qué no bastó |
|---|---|---|---|---|
| 1 | Diorame v3.20.1 (25 oct) | Mínimo de desenfoque de 1,5 texels de la rejilla ¼ para el rotulador (REFERENCE.md, ux-debt «Bordes dentados»). | A < ~7 px/mm el desenfoque de .8 mm cae por debajo de un texel: el voto binario se ve como escalera. El motor del Lab con los mismos parámetros daba lo mismo. | Aliviaba la escalera de 4 px; no tocaba el modelo de trazo ni la rejilla. |
| 2 | Lab v22 → Diorame v3.22.0 (31 oct) | Final de cada pasada calculado por píxel (distancia con signo desde el gradiente), mezclado al 90 % con el corte biselado. | Los escalones de los extremos eran del corte a escuadra de la pasada donde su eje cruza el contorno. | Dejó vivo el divisor por pendiente casi nula (causa hallada en el intento 4). |
| 3 | «8 nov» [POR CONFIRMAR: no hay commit propio en el historial de git] | Comprobación de no regresión; se identifica la máscara a ¼ como origen de la escalera. | — | Preludio del intento siguiente. |
| 4 | Diorame v3.26.83 / Lab v23.8 | `FS_XEDGE` + `mkF`: el borde se decide a resolución completa (unión bilateral de los texels ¼ vecinos), peso 0 bajo el negro; entre dos colores el trazo no deshilacha, se decide por trazo. REFERENCE.md §14 «Marker edges: the real cause and the fix». | Guardia `markeredge.js`: v3.26.82 fallaba 6/6; v3.26.83 pasaba 6/6 (escalera .12–.19, halo negro ≤ 6,3 %, halo color ≤ 2,4 %). | Arregló la rejilla ¼ y los halos de papel, **pero las almenas seguían en pantalla**: la guardia compara con la misma hoja supermuestreada ×4 y el defecto va en mm de hoja, así que sale igual en la referencia y se cancela. |
| 4b | Diorame v3.26.85 (solo docs; diagnóstico) | Ningún código. Reproducido por la UI real y diagnosticado en `docs/marker-edges-attempt-4.md`. | Cadena WebGL volcada en el fotograma visible: `XEDGE` sale liso; los bloques aparecen por primera vez en la salida de `XCOLOR` (`strokes()`). Causas: (1) `eM = (m−thr)/max(\|g\|,.025)` con `g≈0` vale ±20 mm y salta como bloque por pasada; (2) `g>=0 ? eF : 1e3` elige extremo al azar por pasada cuando el contorno corre paralelo al trazo. «Sin `eM` + sin elección por signo» = liso. | Se paró: ninguna guardia separaba con holgura (esquinas en ángulo recto 5,58–5,74 → 3,49 %, solo 1,6–1,8×). |
| 5 | Diorame v3.26.86 / Lab v23.9 | **Extremo frente a flanco por píxel** (`gp`, `wE`): el bisel `eM` va acotado y solo en extremos; el flanco recorta con la distancia real, sin deshilachar. | A ojo de Moisés: **mitiga, no elimina**. `__superRisoHash` 18/18, `pixcheck`/`pixcheck2` 0 px, `flatcheck`/`__cinemaHash` verdes. | Sigue sin guardia que lo respalde. Los escalones restantes no están explicados. Coste no medido en A/B. |

Numeración: en el encargo, «intento 4» = diagnóstico de v3.26.85 (el archivo `marker-edges-attempt-4.md` lo conserva así) e «intento 5» =
mitigación de v3.26.86. La fila 4 (v3.26.83) es el arreglo de `FS_XEDGE`.

## 3 · Por qué fallaron las guardias

- **Referencia supermuestreada con el mismo defecto.** `markeredge.js` compara cada render con el mismo fotograma a `renderScale ×4`.
  Super Riso trabaja en mm de hoja, así que el modelo de trazo sale idéntico en la referencia y la diferencia se anula. Mide «¿depende de
  la rejilla ¼?» (ya no) y los halos de papel. **No ve las almenas del fin de trazo** (aviso escrito en el arnés).
- **Métricas de esquinas que separan poco.** En la hoja dibujada por puntero sobre el canvas visible: esquinas en ángulo recto 5,58–5,74 %
  frente a 3,49 % con el parche (1,6×; 1,8× con el mejor ajuste); tramos planos cerrados por paredes 5 → 1 (cuentas demasiado bajas).
  Sobre la escena de ejemplo ninguna separa. Descartada: desviación respecto a las elipses dibujadas (la geometría supuesta de la hoja en Plana no cuadraba).
- **Lo que NO es la causa** (no repetir): la máscara a ¼ (ya no pinta ningún borde), filtros NEAREST, el mapa de orientación de 560×420
  (sustituido por blanco: siguen los bloques), el tier vivo frente al de exportación, una copia cacheada del Lab, el desenfoque, el Descuido.

## 4 · Reproducir por la UI

1. `npm run dev` en `app\` y abrir `http://localhost:3000` (Chrome de escritorio; a ser posible DPR 2, que no se pudo emular).
2. Cargar la escena de ejemplo (onboarding) → modo **Cine** → panel **FX** → **Super Riso** → técnica **Fotocopia** → estilo **«Fanzine a rotulador»**.
3. Capturar el canvas visible y ampliar ×4 sin suavizar: almenas en el borde color/papel.
4. Prueba más limpia: modo **Dibujo**, seis manchas lisas con puntero real (alargadas, verticales y horizontales), vista **Plana**.
5. En el Lab (`super-riso.dumaker.com`): abrir una imagen o `.dior` → Fotocopia → «Fanzine a rotulador». No se reprodujo en el Lab en la sesión del
   diagnóstico (se comprobó que servía byte a byte la v23.8 local, con el mismo `FS_XCOLOR`), pero Moisés lo ve también ahí.

Capturas existentes (repo de la app): `docs/media/marker-edges/` (antes/después de v3.26.83: hoja de prueba y escena, Diorame y Lab, con README y
tabla de medidas), `docs/media/marker-edges-2/` (`cinema-pantalla-almenas-x4.png`, `hoja-plana-pantalla.png`, `escena-plana-recortes.png`) y el
diagnóstico completo en `docs/marker-edges-attempt-4.md`.

## 5 · La guardia hoy (`tools/draw-stress/harness/markeredge.js`)

Umbrales originales restaurados (escalera 0,2; halo de color en lo-fi 4,5). Tres casos los superan con v3.26.86 y se reportan como
«FALLO CONOCIDO — ver docs/known-issues/marker-edges.md». Si uno empeora más de un 10 %, o falla cualquier caso o métrica no listado, es fallo normal:

| Caso | Métrica | Valor en v3.26.86 | Límite original |
|---|---|---|---|
| cinema-normal | stairPx | 0,206 | 0,2 |
| cinema-png-hq2 | stairPx | 0,211 | 0,2 |
| cinema-lofi | haloColorPct | 6,3 | 4,5 |

Una guardia en verde **no** significa que las almenas no estén: no las ve. El equivalente del Lab (`lab\tools\measure\marker-edge.js`) conserva los
umbrales originales (nunca se ensancharon).

## 6 · Enfoques para un próximo intento (NO implementar ahora)

a. **Replantear el rotulador como trazos geométricos reales** a lo largo del campo de orientación, rasterizados con antialiasing, en vez de
   decidir por píxel el fin de trazo desde un campo escalar. Los escalones nacen de esa decisión por píxel.
b. **Banco de prueba sintético diseñado para el defecto:** manchas alargadas alineadas con los ejes y trazos paralelos al contorno, donde
   la diferencia entre «hoy» y «arreglado» sea grande (no 1,6×).
c. **Regla de entrada:** el próximo intento empieza con una guardia que **falle con holgura (≥ 3×) sobre el canvas visible por la UI** antes de
   tocar el shader. Sin eso no se publica (es el error de v3.26.83).

## 7 · Estado actual

Mitigado en v3.26.86 / Lab v23.9; aparcado por decisión de Moisés el 24 nov 2026. Reversión de la mitigación, si hiciera falta: `git revert` del
commit de v3.26.86 en `app` y del de v23.9 en `lab\web`.
