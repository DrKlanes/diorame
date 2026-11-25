# Informe de sesión — Fotocopia v2 (25 nov 2026)

Para llevar a otra sesión de Claude que lleve el hilo de Diorame. Se lee sin haber visto la conversación.
Sesión de Claude Code (Fable) en `C:\Users\Usuario\Desktop\Diorame`. Marcas: **[VERIFICADO]** = medido aquí ·
**[POR CONFIRMAR]** = hipótesis o dato que falta.

## 1 · En una frase

Se convirtió «Fotocopia tiene cuatro problemas sueltos» en un proyecto por fases con guardias, y se hicieron las fases 0 a 3p:
el zoom del Lab ya no enseña el dibujo crudo, y el tóner de Fotocopia sale sin escalones ni damero, en el Lab y en Diorame.
Quedan el rotulador y la compilación (fase 4), sin empezar.

## 2 · Qué hay publicado

| | Antes | Ahora |
|---|---|---|
| Diorame | v3.26.96 | **v3.26.102** (producción, CI verde) |
| Super Riso Lab | v23.13 | **v23.16** (super-riso.dumaker.com) |
| Fuentes del Lab | sin control de versiones | repo privado `DrKlanes/super-riso-lab-tools` (raíz: `lab\tools`) |

| Versión | Qué |
|---|---|
| app v3.26.97 | docs: propuesta `docs/fotocopia-v2-proposal.md` (fase 0) |
| app v3.26.98 | docs: decisiones de Moisés y fases 0.5, 1, 2 |
| Lab v23.14 | fase 2: zoom con la última impresión, vista a resolución de pantalla (solo interfaz) |
| Lab v23.15 | fase 3: tóner (shaders `XLUM`, `XGEN`, `XDIRT`) |
| app v3.26.99 | docs: fase 3 |
| Lab v23.16 | grano del tóner más nítido (`XGEN`) |
| app v3.26.100 | **código:** port 1:1 del tóner + escáner de Fotocopia a 0,06 mm |
| app v3.26.101 | **código:** `renderScale` llega a Super Riso (una línea en zona protegida, con GO) |
| app v3.26.102 | docs: cierre de sesión |

## 3 · Los cuatro problemas de partida y en qué quedaron

| | Problema | Causa [VERIFICADO] | Estado |
|---|---|---|---|
| P1 | Rotulador: almenas | Cada píxel decide dónde acaba su trazo | **Sin tocar.** Fase 4. Guardia G2 lista y fallando (7,3 muros/100 mm; límite 0,7) |
| P2 | `FS_XCOLOR` tarda ~6 s en compilar en frío | Coste superlineal con el tamaño: rotulador + acuarela 8–9 s; acuarela sola 0,6 s; rotulador con `strokes()` una vez 1,1 s. NO son los bucles ni las lecturas de textura | **Sin tocar.** Fase 4. Guardia G4 (5,8 s; límite 1,2 s) |
| P3 | Tóner dentado | Se decidía en binario por píxel de simulación; el escáner solo emborronaba los escalones. No era regresión | **Hecho** (Lab v23.15, app v3.26.100). G1: 40,7 % → 6,5 % |
| P4 | Zoom borroso en el Lab | Mientras se hacía zoom el Lab enseñaba el dibujo crudo desenfocado a propósito, y tardaba 1,7–2,0 s en recalcular. No era regresión | **Hecho** (Lab v23.14). 0 fotogramas crudos; 0,13–0,21 s |

## 4 · Lo que apareció por el camino (no estaba en el encargo)

1. **Damero en los tonos medios de Fotocopia** — lo vio Moisés; yo no, por un error de método (§7.1).
   Causa [VERIFICADO]: la **textura de tinta de Diorame** es ruido de celdas cuadradas de ±1 %
   (`createNoise(256, 256, 15, 1, .3, S)` en `renderPipeline.ts`, pintada como patrón en `composeLayer`). Invisible en el dibujo,
   pero el umbral de la copiadora tiene ganancia ×20 y la convertía en blanco/negro. En el Lab la celda crece con el zoom del
   `.dior` (una celda = una unidad de proyecto); en Diorame mide un píxel lógico.
   Arreglo: `XLUM` aplana esa textura antes de umbralizar (media de 7×7 vecinos parecidos a 1,3 celdas; `uTexPx`).
2. **«Trama gruesa» en Diorame incluso con el tamaño de trama al mínimo.**
   Causa [VERIFICADO]: el **desenfoque final del escáner**. Diorame le daba a Fotocopia la suavidad compartida de Resolución
   (~0,7 px, decisión de v3.19.2); el Lab usa 0,06 mm de hoja (~0,3 px a esa resolución). Sobre un grano de ~1 px ya
   antialiasado, lo convertía en manchas de 3–4 px. Arreglo (solo app): `xeroxParams` usa los 0,06 mm del Lab.
   **Esto revierte una decisión de v3.19.2**; el ruido del escáner sigue a Resolución.
3. **Solo `lab\web` estaba versionado.** La fuente canónica del motor (`lab\tools\studio`) no tenía historial. Ahora sí.
4. Las zonas sin pintar del rotulador se funden como un aerógrafo (decisión D6: se corrige en la fase 4).

## 5 · Cambios de código, por archivo

**Lab** (mismo texto exacto en `lab\tools\studio\*` y en `lab\web\index.html`):
- `ui.src.html` (v23.14): `previewSize` a píxeles de dispositivo del escenario (mínimo 2048, tope 4096; 2048 en tabletas, móviles y
  poca memoria); `viewSrc`; durante el zoom se reencuadra una copia de la última impresión (`takeSnap`, `drawFrame`); 80 ms de
  espera (antes 300); sin rodeo por PNG; análisis de tintas del dibujo entero en memoria por dibujo (`pickPal`).
- `shaders.xerox.js` (v23.15, v23.16): `FS_XLUM` (umbral con rampa de un píxel; aplanado de la textura de tinta), `FS_XGEN`
  (`grainF`: racimos en dos giros, grano fino limitado por el píxel, moteado que sigue al tamaño de trama; motas con radio mínimo
  de 0,07 mm), `FS_XDIRT` (pelos, polvo, arañazos con borde de un píxel).
- `engine.studio.js`: parámetro `tex` → `uTexPx`.
- `lab\tools\measure\guards\`: `guards.mjs`, `lib.mjs`, `export-hash.mjs`, `README.md`, resultados por versión, `media\`.

**App:**
- `canvas/superRiso/shadersXerox.ts`: los siete `FS_X*` idénticos byte a byte al Lab v23.16.
- `canvas/superRiso/xeroxEngine.ts`, `xeroxParams.ts`, `frame.ts`: `tex` (= `renderScale · simW / w`); `scanBlur` a 0,06 mm.
- `canvas/renderPipeline.ts`: un campo, `renderScale: S`, en el objeto de entrada de Super Riso (zona protegida; GO explícito).
- `tools/draw-stress/harness/markeredge.js`: `__markerEdgeShot` acepta un parche de ajustes de Fotocopia (`xerox: { … }`).

## 6 · Guardias (Lab: `lab\tools\measure\guards\`)

Miden capturas del escenario visible, manejando el Lab con clics, tecleo y rueda en un Chrome desechable.

| | Mide | v23.13 | v23.16 | Límite | Estado |
|---|---|---|---|---|---|
| G1 | Escalones del tóner (hoja sintética, Suciedad 0) | 40,7 % | 6,2–6,5 % | 12 % | pasa |
| G2 | Muros del rotulador por 100 mm, contra la geometría de la hoja (rectos y curvos, 3 semillas) | 7,4 | 7,3 | 0,7 | pendiente de fase 4 |
| G3 | Zoom: fotogramas crudos · ms hasta nítido · estirado | 24/24 · 1,7–2,0 s · ×1,23 | 0/24 · 0,13–0,21 s · ×0,98 | 0 · 250 ms · ×1,02 | pasa |
| G4 | Compilación en frío del programa más lento de Fotocopia | 5,9 s | 5,8 s | 1,2 s | pendiente de fase 4 |

En la app: `__superRisoHash` (Riso y Stencil idénticos a ×1 en cada cambio) y `__markerEdgeCheck` (6/6, ya sin «fallos conocidos»).
**Las guardias G1–G4 no existen todavía en Diorame.**

## 7 · Lecciones de método (genéricas; ya están en `app/CLAUDE.md`)

1. **Fijar `Math.random` apaga la textura de tinta.** Sirve para demostrar que algo no cambia; nunca para juzgar el aspecto.
2. **Un umbral duro amplifica lo invisible.** Ante un patrón raro tras un umbral, mirar el original con el contraste ×10–12.
3. **Comparar versiones de un efecto sobre un fotograma fijo y sembrado**, no sobre capturas en vivo (la cámara se mueve).
4. **Probar tres variantes lado a lado antes de publicar el arreglo.** Dos hipótesis razonables no movían nada; la tercera sí.
5. **Una guardia que mide un borde se mide sin lo que lo ensucia**, y si se cambia después, se recalibra contra lo anterior.
6. **No dar por pintada una página leyendo un texto que también era el de antes.**
7. **`git stash` reescribe con CRLF**: comparar shaders contra el commit, no contra la copia de trabajo.
8. **Candidata en commit local → Moisés la mira en `localhost` → se sube.** Evitó publicar dos candidatas que rechazó.

## 8 · Falsos diagnósticos (lo que NO era la causa)

- P3 y P4 **no eran regresiones** (código y capturas idénticos entre versiones).
- El damero **no era el grano de la copiadora**; era la textura del dibujo.
- La «trama gruesa» **no era la escala del moteado ni el suavizado del umbral**; era el desenfoque del escáner.
- La lentitud de compilar `FS_XCOLOR` **no son los bucles, ni las lecturas de textura, ni las seis tintas, ni los `continue`**.
- El «0,76 s hasta nítido» de la fase 0 estaba **mal medido**; eran 1,7–2,0 s.

**Descartado tras probarlo:** aplanar la textura con 25 celdas (dejaba un moteado con el ritmo de las celdas); quedarse con el
vecino más claro en vez de la media (aclaraba la zona hasta el blanco); una rampa de umbral más estrecha (más nítida, pero G1
al límite); atenuar las motas por área sin tamaño mínimo («Copia de copia» perdía la suciedad); atar el moteado al deslizador
como único arreglo de la trama gruesa (no se notaba).

## 9 · Errores míos en la sesión

- Medí el aspecto con `Math.random` fijado y di por bueno un tono medio que en la pantalla de Moisés era un damero.
- La primera candidata del tóner solo suavizaba contornos; el grano en tonos medios seguía binario.
- Mi primer arreglo de la «trama gruesa» no arreglaba nada; lo dije al ver la comparativa y busqué la causa real.
- Un script de documentación abortó a medias y dejó sin subir la versión de un README; lo detecté y corregí antes de cerrar.
- La primera subida de v3.26.100 falló por un HTTP 408; se reintentó.

## 10 · Decisiones de Moisés registradas (propuesta §8)

D1 tóner con rampa de un píxel · D2 la vista previa predice la exportación · D3 rotulador por tabla de trazos; geometría solo
si hace falta · D4 el zoom del Lab es reencuadre · D5 la borrosidad era solo durante el zoom · D6 el fundido de aerógrafo se
corrige en la fase 4 · D7 fase 2 antes que el tóner · D8 port por fases con ronda de iPad · D9 «≈ 1 s» de compilación vale.
Además, en esta sesión: GO a pasar `renderScale` a Super Riso (zona protegida).

## 11 · Pendiente

**De Moisés:**
- **Ronda de iPad** (Diorame y Lab, Fotocopia). El tóner lee mucha más textura (`XGEN` 15 lecturas por generación, antes 2;
  `XLUM` hasta 53 más). Sin medir. En el iPad, confirmar la versión (PWA: aceptar «Recargar» o pestaña privada).
- **Exportar un PNG HQ ×2** de Fotocopia con tonos medios: no lo he mirado yo.
- Decir si quiere conservar el escáner de Fotocopia a 0,06 mm (revierte v3.19.2).

**Técnico, sin hacer:**
- Fase 4: rotulador por tabla de trazos, `FS_XCOLOR` en dos programas, fundido de aerógrafo.
- Guardias G1–G4 en Diorame.
- Stencil: umbraliza la misma textura de tinta; puede tener el damero a zoom alto en el Lab. Sin mirar.
- Dos ruidos de medida sin aislar: las huellas `-hq2` de `__superRisoHash` bailan entre dos valores; una de cada ~14
  exportaciones del Lab da otra huella con el mismo código.
- En el Lab el deslizador de tamaño de trama no gobierna el grano de Fotocopia (en Diorame sí).

Lista completa: `docs/ux-debt.md`, «Fotocopia v2».

## 12 · Dónde está cada cosa

- Plan, números y decisiones: `app/docs/fotocopia-v2-proposal.md` (§7 estado de las fases, §8 decisiones).
- Código del motor y trampas: `app/src/REFERENCE.md` §14.
- Reglas y lecciones: `app/CLAUDE.md` («Verificación»).
- Deuda: `app/docs/ux-debt.md`.
- Evidencia: `app/docs/media/fotocopia-v2/` y `lab\tools\measure\guards\media\`.
- Guardias del Lab y cómo lanzarlas: `lab\tools\measure\guards\README.md`.
- Cómo se cambia y publica el Lab: `lab\tools\README.md`.

## 13 · Para arrancar la fase 4

Leer `fotocopia-v2-proposal.md` §4.2 y §4.4, y `docs/known-issues/marker-edges.md`. La regla de entrada ya se cumple: G2 falla
con margen ≥ ×3 sobre el escenario visible. Aviso escrito en la guardia: un rotulador decidido por trazo puede dejar, con razón,
finales de pasada escalonados en contornos curvos; el límite de G2 en curvas se revisa con el ojo de Moisés delante.
Orden propuesto: (1) partir `FS_XCOLOR` en rotulador y acuarela, con `strokes()` una sola vez (compila en ~1,1 s y ~0,6 s);
(2) tabla de trazos; (3) candidata en local para juzgar el carácter contra v23.16; (4) port.
