# Fotocopia v2 — Fase 0: investigación y propuesta

25 nov 2026 · Diorame v3.26.96 · Super Riso Lab v23.13 (`c94e8c8`). **Solo investigación: ningún shader ni lógica tocados.**
Estado (v3.26.103): **PROYECTO EN PAUSA (Moisés, 25 nov 2026).** Fases 0, 0.5, 1, 2, 3 y 3p hechas; el tóner de Lab v23.17 está publicado en el Lab y **NO portado**; fase 4 sin empezar (§7). **26 nov 2026:** Lab v23.17 + v23.18 portados en la candidata local v3.26.104 (sin publicar, pendiente del OK de Moisés); v23.18 hizo en el Lab parte de la fase 4 (rotulador sin dientes de sierra, sin la tabla de trazos). Para retomar: `docs/RETOMAR-fotocopia.md`.

Marcas: **[VERIFICADO]** = medido en esta sesión · **[POR CONFIRMAR]** = hipótesis o dato que falta.

Entorno de todas las medidas: Chrome 158 *headless* con perfil desechable, RTX 5070 Ti (ANGLE/D3D11), `devicePixelRatio` 1
salvo donde se indica; Lab servido en local desde el historial de git de `lab\web`, con el `dior-render.js` del build local
de v3.26.96; Diorame v3.26.69 construida en un worktree temporal. **Nada medido en iPad.** No he visto las capturas de
Moisés: todo lo que digo sobre «lo que él ve» sale de reproducirlo yo, y donde hay duda lo pregunto (§8, D5).

---

## 1 · Resumen

| | Problema | ¿Regresión? | Causa | Evidencia |
|---|---|---|---|---|
| P1 | Rotulador: almenas | No (mejoró en v23.9, no desapareció) | El final de cada trazo se decide **por píxel** desde un campo escalar. Medible: 4,3 saltos por 100 mm de flanco, frente a 1,1 de la acuarela | §2.3, §6 G2 |
| P2 | `FS_XCOLOR` tarda en compilar | No | El coste es **superlineal con el tamaño**: rotulador + acuarela juntos 7,8–9,0 s; acuarela sola 0,6 s; rotulador solo 4,1–4,7 s; rotulador con `strokes()` una sola vez **1,1 s** | §4.4 |
| P3 | Tóner dentado | **No.** Cadena del tóner idéntica byte a byte del Lab v23.5 al v23.13 y de Diorame v3.26.69 a v3.26.96 | El tóner se decide **en binario por píxel de simulación**: `XLUM` satura el antialiasing del original, el desenfoque de cada generación vale 0,14–0,2 px (nada) y `XGEN` vuelve a umbralizar. El escáner solo emborrona los escalones | §2.1 |
| P4 | Zoom borroso en el Lab | **No.** Código de vista previa y encuadre idéntico desde v23.5 | **Mientras** haces zoom el Lab enseña el dibujo crudo, ampliado y **desenfocado a propósito**; tarda 0,76 s en volver a nítido (1,5 s a 2560×1440). Una vez parado, la vista es nítida a DPR 1, pero va **limitada a 2048 px**: en pantallas grandes o HiDPI se estira ×1,23 | §2.2 |

Hallazgos que no estaban en el encargo:

- **H1 · P3 y P4 se suman en pantalla grande.** Un borde binario estirado ×1,23 con suavizado se ve a la vez dentado y borroso. [VERIFICADO el estirado; POR CONFIRMAR que sea lo que ve Moisés]
- **H2 · Las motas de polvo son de 1 px duro en la vista previa** y casi desaparecen en la misma hoja bien muestreada (`media/fotocopia-v2/01-…`): hoy la vista previa **no predice** la exportación en la suciedad fina.
- **H3 · Las «zonas sin pintar» del rotulador se funden como un aerógrafo** (`zone = smoothstep(…vnoise(mm/40)…)` en `main()` de `FS_XCOLOR`): manchas blancas difusas de ~40 mm dentro del color (`06-…`, `07-…`). Un rotulador no hace eso; puede ser parte de lo que se percibe como «borroso». [POR CONFIRMAR con Moisés, D6]
- **H4 · El zoom del Lab no es una lupa: es un reencuadre.** La hoja sigue siendo un A4; al acercar, el trazo de 5 mm y el grano ocupan más dibujo. La lupa real (botón «lupa») sí renderiza a resolución de exportación.

**Recomendación principal:** un solo proyecto en cinco fases, Lab primero: (1) instrumentos, (2) modelo de resolución del
Lab, (3) tóner con umbral de rampa de 1 px, (4) rotulador con **tabla de trazos** (el final se decide una vez por trazo, no
por píxel) y `FS_XCOLOR` partido en dos programas, (5) trazos como geometría instanciada **solo si** tras la 4 el coste o
la compilación no llegan. Port a Diorame por fases.

---

## 2 · ¿Regresión o de siempre?

### 2.1 · P3, tóner — de siempre [VERIFICADO]

**Por código.** Hash de cada shader y función extraídos de la página publicada de cada versión:

| | `XLUM` `XGEN` `XDIRT` `XCOMP` `SCAN` `PREP` `BLUR` | `previewSize` `applyFrame` `drawFrame` `layout` `hiSrc` `renderImage` | `XCOLOR` |
|---|---|---|---|
| Lab v23.5 → v23.8 → v23.13 | idénticos | idénticos | cambia (rotulador) |

En Diorame, `git diff v3.26.69 v3.26.96 -- canvas/superRiso/` solo toca `XEDGE`/`XCOLOR`, sus pasadas y el arranque del motor.

**Por captura** (escena de ejemplo, mismo `.dior`, Fotocopia › «Fanzine a rotulador», por la UI):
`media/fotocopia-v2/02-toner-escena-lab-v23.5-v23.8-v23.13.png` y `03-toner-diorame-v3.26.69-vs-v3.26.96.png`.

| Medida (bordes negro/claro del lienzo) | v23.5 | v23.8 | v23.13 |
|---|---|---|---|
| Lab, cruces sin píxel intermedio (`edge.py`, H) al 100 % | 0,545 | 0,553 | 0,573 |
| Lab, al 1200 % | 0,394 | 0,400 | 0,410 |

| | v3.26.69 | v3.26.96 |
|---|---|---|
| Diorame CINEMA, ancho de rampa del borde (px) | 1,225 | 1,216 |

Las diferencias mínimas en el Lab son del rotulador que toca esos bordes, no del tóner.

**Por qué en Diorame «se ve algo más suave, no perfecto».** No es que esté mejor resuelto: la simulación corre al 91 % del
lienzo y a ~4,7 px/mm (hoja virtual de 240 mm, Resolución .85), se amplía al lienzo y el escáner emborrona 0,7 px. Los
escalones siguen ahí, **emborronados** (`03-…`): H = 0 pero rampa de 1,2 px. En el Lab la vista previa va a 6,9 px/mm y
se enseña reducida (2048 px en ~1100 px de pantalla a DPR 1), lo que los esconde hasta que la pantalla pide más píxeles.

### 2.2 · P4, zoom del Lab — de siempre [VERIFICADO el mecanismo; POR CONFIRMAR que sea lo que ve Moisés]

Cómo funciona hoy (`ui.src.html`, v22.2 en adelante):

1. Rueda / pellizco sobre un `.dior` = **cámara** (`zoomAt`), de 1/3 a ×12. No es zoom del navegador.
2. Durante el gesto (`drawFrame`): se pinta `dior.full` (el dibujo entero a ≤ 2400 px, **sin técnica**) ampliado, y si la
   ampliación pasa de ×1,5 se le aplica `blur(…px)` hasta 6 px, «provisional: desenfocada en vez de pixelada».
3. 300 ms después del último evento (`navEnd` → `applyFrame`): `renderDior` del encuadre a 2400 px → **PNG** (`toBlob`) →
   `<img>` → copia reducida → análisis de tintas y rotuladores → técnica a ≤ 2048 px.

Medido con `zoomlat.mjs` (8 pasos de rueda sobre la escena de ejemplo), `04-lab-zoom-durante-y-despues.jpg`:

| Ventana | Bordes nítidos durante el gesto / después | Tiempo hasta nítido | Estirado de la vista (px de pantalla / px del lienzo) |
|---|---|---|---|
| 1600×1000, DPR 1 | 12 / 8 702 (0,14 %) | 0,76 s | 0,54 (reducida) |
| 2560×1440, DPR 1,5 | 214 / 49 109 | 1,54 s | **1,23 (estirada)** |
| 1180×820, DPR 2, CPU ×4 más lenta (emulación, **no es un iPad**) | 1 050 / 35 490 | 3,69 s | 0,84 |

De esos 0,76 s, 0,30 s son la espera fija y `renderDior` + técnica suman ~60 ms: **el resto es el rodeo por PNG y el
re-análisis**, evitable.

### 2.3 · P1, rotulador — de siempre; v23.9 mitigó [VERIFICADO sobre hoja sintética]

Hoja sintética de manchas alargadas alineadas con los ejes (`proto/marker-sheet.png`), abierta por el selector de archivos
del Lab, «Fanzine a rotulador», y medida contra la **geometría conocida de la hoja** (`flank.py`):

| | Saltos ≥ 0,25 mm por 100 mm de flanco | Desviación RMS del borde |
|---|---|---|
| Rotulador, Lab v23.5 | 5,75 | 1,14 mm |
| Rotulador, Lab v23.8 | 6,91 | 1,13 mm |
| Rotulador, Lab v23.13 (hoy) | **4,32** | 0,82 mm |
| Acuarela, Lab v23.13 (sin trazos) | 1,06 | 0,60 mm |

El orden coincide con el ojo de Moisés: v23.9 mitiga (6,9 → 4,3), no elimina. `05-rotulador-flanco-versiones.png`.

---

## 3 · Anatomía del motor

Lab (canónico, `renderXerox` en `engine.studio.js`) y port (`xeroxEngine.ts`) hacen las mismas pasadas con los mismos
cuerpos de shader. Diferencias: el Lab trabaja por bloques con margen y coordenadas globales (admite `region`: es lo que
usa la lupa); Diorame, el fotograma entero.

| Pasada | Resolución | Decisión binaria | Nota |
|---|---|---|---|
| `PREP` | completa | — | limpieza bilateral 0,12 mm |
| `XLUM` | completa | **sí, de hecho**: `d = clamp(.5 + (t−L)/0,05)` | una rampa de antialiasing de 1 px queda en ~0,05 px |
| `BLUR`×2 + `XGEN`, por generación | completa | **sí**: `smoothstep(thr±.06, d + ruido)` sobre un campo ya binario | σ = 0,05 mm·pxmm·0,6 = **0,2 px** en el Lab, 0,14 px en Diorame; el grano fino (0,03 mm) está por debajo del píxel: es ruido blanco por píxel |
| `XDIRT` | completa | motas y pelos con bordes de ~0,02 mm | sub-píxel a resolución de vista |
| sólidos (`BLUR` ¼ ×2) | ¼ | — | efecto borde, baja frecuencia: correcto a ¼ |
| `XID` | ¼ | voto por mayoría (identidad) | correcto: solo identidad |
| `XEDGE` + `BLUR` por etapas | completa | — | borde del rotulador desde el original (v23.6) |
| `XCOLOR` | completa | **sí**: fin de trazo por píxel (`eM`, `eP`, `wE`, signo de `gd`), fibras, roturas | 14,7 k caracteres; ver §4.4 |
| `XCOMP` | completa | — | papel × color, tóner encima |
| `SCAN` | completa | — | 0,6 px (Lab) / 0,65–1 px (Diorame): **emborrona, no antialiasa** |

Resolución de proceso: Lab vista previa = `min(2048, exportación)` px en el lado largo → 6,9 px/mm en A4 apaisado;
exportación 300 ppp = 11,8 px/mm. Diorame = `anchoDelFotograma · lerp(.4, 1, Resolución) / 240` → ~4,7 px/mm en un lienzo
de 1366 px; por debajo de Resolución .5 se amplía sin suavizar («lo-fi nítido», a propósito).

---

## 4 · Propuesta «Fotocopia v2»

### 4.1 · Tóner con borde antialiasado a cualquier resolución

**⭐ T-A · Umbral con rampa de 1 px (analítico).** El tóner deja de ser «¿este píxel sí o no?» y pasa a ser «¿qué
fracción de este píxel cubre?». En `XLUM` y `XGEN`, el ancho del umbral deja de ser fijo (0,05 y ±0,06) y se limita a un
píxel de la señal: `cobertura = clamp(.5 + (f − umbral) / max(ancho, |∇f|·1 px))`, con el gradiente por diferencias
de 4 lecturas de textura (**sin `fwidth`/`dFdx`**: trampa 2 de REFERENCE §14). Así el contorno conserva su posición
sub-píxel a través de las generaciones. Dos acompañantes:

- El grano fino (0,03 mm) y las motas se **limitan en banda**: su amplitud se atenúa cuando su tamaño cae por debajo de
  2 px, con un factor calculado en JS desde `pxmm` (precedente: `uAA` y `uTp` de Stencil). A resolución de exportación
  queda como hoy.
- Lo que se conserva tal cual: dial de oscuridad, engorde por generación, grano en racimos, velo, rayas del tambor, sólidos
  huecos, arrastre del fusor. Todos actúan sobre el umbral o sobre campos ya suaves.

Coste: +4 lecturas en `XLUM` y +4 por generación en `XGEN`. **Ninguna pasada nueva a pantalla completa** (lo que duele en
el iPad es el ancho de banda de las pasadas, no la aritmética). Cambia los píxeles de TODOS los estilos de Fotocopia.

**T-B · Supermuestrear ×2 la cadena del tóner y reducir.** Carácter exacto (es literalmente la misma hoja más fina), pero
×4 de relleno en 5 + 2·generaciones pasadas, y en Diorame da poco: el original ya llega rasterizado, no vectorial.
Reservable, si acaso, para el refinado en reposo y la exportación.

**T-C · Más desenfoque del escáner.** Descartada: es lo que ya hace Diorame; emborrona el escalón, no lo quita.

### 4.2 · Rotulador replanteado

La raíz de las almenas es que cada **píxel** decide dónde acaba su trazo. Cinco arreglos han quitado causas dentro de ese
modelo y siempre queda otra. La propuesta es sacar esa decisión del píxel.

**Paso 1 — ⭐ Tabla de trazos (M-B).** La retícula de trazos ya es determinista en mm de hoja: cada trazo es `(zona, k, j)`.
Una pasada pequeña nueva escribe una textura donde **cada texel es un trazo**: recorre el eje del trazo (bucle fijo, sin
`break`) leyendo el campo de zona a resolución completa (`XEDGE` desenfocado) y guarda dónde entra y dónde sale del
contorno, ya con su «se pasa / no llega» por trazo. `strokes()` deja de calcular `eM`, `eP`, `gp`, `wE` y el signo de `gd`
por píxel y **lee los dos extremos de su trazo**. Un trazo pasa a ser un rectángulo biselado de `s_a` a `s_b`:
no puede dibujar una almena porque no hay nada que decidir a media anchura.

- Se conserva el sombreado actual entero (filo, banda oscura del final, estrías secas, fibras de la salida rápida, solape
  Beer-Lambert, huecos del Descuido, biseles): el riesgo de perder el carácter validado es el mínimo posible.
- Todo en GPU, sin `readPixels` (en Diorame una lectura por fotograma sería una espera síncrona en WebKit).
- El flanco ya no se recorta por píxel contra el contorno: es el lado de la pasada. Lo que se salga, se sale por trazo
  («desborde»), que es lo que hace una mano.
- De paso resuelve H3: la cobertura parcial («zonas sin pintar») puede decidirse por trazo, no con un fundido de 40 mm.

**Paso 2 — Trazos como geometría instanciada (M-A), solo si hace falta.** Con la tabla hecha, cada trazo se puede dibujar
como un rectángulo instanciado (el vértice lee su texel de la tabla) con un fragment shader pequeño y antialiasing
analítico, acumulando densidad con mezcla aditiva. Sustituye a la pasada más cara de Fotocopia (hoy cada píxel evalúa
hasta 6 tintas × 2 zonas × 8 trazos candidatos) por ~1–3 mil rectángulos, y deja la compilación en nada.
[POR CONFIRMAR: recuento de trazos y coste; estimación, no medida.] Es una reescritura mayor del sombreado: solo se
justifica si tras el paso 1 el coste en iPad o la compilación no cumplen.

**Descartado:** seguir afinando el modelo por píxel (sexto intento del mismo tipo).

### 4.3 · Modelo de resolución del Lab

Comportamiento esperado que propongo: **lo que ves parado nunca se estira, y mientras navegas ves la impresión, no el
dibujo crudo.**

**⭐ R1 · Vista a resolución de pantalla, navegación con la impresión.**
- El lienzo de vista previa se dimensiona a `ancho en pantalla × DPR` (hoy fijo a 2048), con tope por presupuesto
  (propuesta: 4096 px en escritorio, 2048 en iPad). A 2560×1440@1,5: 2 511 px, ×1,5 de píxeles respecto a hoy.
- Durante el gesto se transforma **la última impresión** (con su técnica), no `dior.full` desenfocado.
- Al parar: se redibuja sin pasar por PNG ni repetir el análisis de color (se hace una vez por proyecto sobre la vista
  completa, que ya existe: `palSrc()`). Objetivo: nítido en ≤ 250 ms en escritorio.
- No toca shaders ni el contrato de `dior-render.js` (solo pide otros anchos).

**R2 · Procesar siempre a resolución de impresión.** 300 ppp = 3508×2749 (9,6 MP, ×2,9 de hoy); 600 ppp = 38 MP: por
bloques, 150 MB solo el lienzo. Inviable en vivo en iPad.

**R3 · Lupa continua.** Zoom sobre la **hoja impresa** re-renderizando solo la región visible a resolución de exportación
(el motor ya lo sabe hacer: es la lupa). Nítido hasta 1:1 de impresión por construcción, con coste acotado por los píxeles
de pantalla. Pero cambia el significado del zoom (lupa frente a reencuadre, H4) y convivirían dos zooms: es decisión de
producto (D4), no técnica.

### 4.4 · `FS_XCOLOR`: dónde está el coste de compilar [VERIFICADO, escritorio]

Compilación + enlace en frío de variantes del mismo shader (`proto/compile.mjs`, Chrome nuevo sin caché de shaders por
variante, 2–3 rondas). Aquí el completo tarda 7,8–9,0 s (REFERENCE documenta ~5,7 s: otra sesión; vale la comparación
dentro de la misma).

| Variante | Tiempo |
|---|---|
| Completo (rotulador + acuarela) | 7,8 – 9,0 s |
| Solo acuarela | **0,57 – 0,62 s** |
| Solo rotulador | 4,1 – 4,7 s |
| Solo rotulador, `strokes()` llamada una vez (sin la zona vecina) | **1,10 – 1,12 s** |
| Completo, sin la zona vecina | 4,7 s |
| Completo, bucles `dk`/`dj` de una vuelta | 7,9 s |
| Completo, una tinta en vez de seis | 7,4 s |
| Completo, sin los `continue` | 7,0 s |
| Completo, `texture` → `textureLod` | 8,0 – 9,6 s (**no ayuda**) |

Lectura: el coste no viene de los bucles (no se desenrollan) ni de las lecturas de textura; viene del **tamaño del cuerpo
tras el *inlining***: `strokes()` entra dos veces y con la acuarela al lado todo crece más que la suma.

Plan: (a) **dos programas**, rotulador y acuarela — solo compila el que se usa (nunca los dos a la vez); (b) `strokes()`
**una sola vez** en el código, dentro de un bucle de dos vueltas (zona propia y vecina); (c) la tabla de trazos le quita a
`strokes()` las 7 lecturas del campo y la lógica de extremos. Estimación tras (a)+(b): acuarela 0,6 s, rotulador ~1,1 s;
tras (c), menos [POR CONFIRMAR]. Con geometría (paso 2), irrelevante.

Compatibilidad con la caché de shaders de Chrome (trampa 11): cada programa se compila en su primer uso, nunca por
adelantado; nada cambia en esa regla.

**Lo que NO es la causa** (no repetir): lecturas de textura con derivadas dentro de bucles, desenrollado de bucles, el
bucle de seis tintas, los `continue`.

### 4.5 · Impacto

- **Lab:** `shaders.xerox.js`, `engine.studio.js` (`renderXerox`, margen de bloque: la tabla de trazos es global, no por
  bloque), `ui.src.html` (R1) y `web\index.html` con el mismo texto; `tools\measure\` recibe las guardias.
- **Diorame (port 1:1):** `shadersXerox.ts`, `xeroxEngine.ts`, un módulo nuevo para la tabla de trazos (límite de 400
  líneas: `applySuperRiso.ts` va a ~390 y **no** recibe nada), `engine.ts` solo si se llega a geometría (hoy `RunApi` no
  instancia). `__superRisoHash` cambiará para Fotocopia entera y debe seguir idéntico para Riso y Stencil.
  `markeredge.js` se sustituye por las guardias nuevas. La regla protegida «ningún borde visible sale de una máscara a ¼»
  se mantiene.
- **`dior-render.js`:** sin cambios de contrato.
- **iPad:** T-A no añade pasadas; la tabla de trazos añade una pasada diminuta; R1 con tope de 2048 px no sube el coste.
  Nada de esto está medido en iPad: cada fase lleva su ronda.
- **Riesgos:** (1) que el tóner antialiasado se lea «demasiado limpio» — se juzga a ojo antes de portar; (2) que el
  rotulador por trazo pierda algo del gesto en contornos curvos; (3) precisión de 8 bits en la tabla de trazos (posiciones
  en mm: hará falta empaquetar en dos canales); (4) la guardia del rotulador separa justo ×3 (§6).

---

## 5 · Lo que no he podido hacer

- **Guardias en Diorame.** Las cuatro están prototipadas y fallan en el **Lab**, por su UI. En Diorame solo tengo la
  evidencia cualitativa de `03-…` y el tiempo de compilación: sobre la escena de ejemplo **ninguna métrica de borde
  separa** (lo confirmo: el dibujo sin efecto da el mismo número que con Fotocopia), y la hoja sintética hay que meterla
  como `.dior` o dibujarla por puntero. Queda para la fase 1.
- **DPR 2 real e iPad.** Emulados o sin medir.
- **Una sola semilla** en las medidas de borde. Falta la varianza entre semillas antes de fijar umbrales.
- **La causa de las almenas que quedan tras v23.9** sigue sin aislar. La propuesta no depende de aislarla (quita la
  decisión por píxel entera), pero es una apuesta, no una demostración.

---

## 6 · Guardias (diseñadas antes del arreglo; todas fallan hoy)

Todas sobre el lienzo visible, por la UI (clics y selector de archivos reales), en perfil desechable. Prototipos en
`docs/media/fotocopia-v2/proto/` (no están integrados en `tools/`).

| | Qué mide | Cómo | Hoy | Límite propuesto | Margen |
|---|---|---|---|---|---|
| **G1** tóner | % de puntos del contorno negro donde la posición sub-píxel salta > 0,25 px (escalón) | `toner-sheet.png` → Fotocopia › «Flyer punk» → `stair.py` | **44,4 %** (lienzo 1:1); 42,8 % (pantalla) | ≤ 12 % | ×3,7 |
| **G2** rotulador | saltos ≥ 0,25 mm del borde de color respecto al contorno real, por 100 mm de flanco recto | `marker-sheet.png` → «Fanzine a rotulador» → `flank.py` | **4,32** | ≤ 1,4 | ×3,1 |
| **G3a** zoom | bordes nítidos durante el gesto / parado | `zoomlat.mjs` | **0,14 %** | ≥ 50 % | ≫ ×3 |
| **G3b** zoom | tiempo hasta nítido tras soltar | `zoomlat.mjs` | **0,76 s** (1,54 s a 2560×1440) | ≤ 0,25 s | ×3,0 |
| **G3c** zoom | px de pantalla por px de lienzo, parado | `zoomlat.mjs` | 1,23 a 2560×1440@1,5 | ≤ 1,0 | (criterio duro, no razón) |
| **G4** compilación | bloqueo del hilo al pasar a Fotocopia en frío | `tools/load-timing/srstart.mjs --cold --xerox` | **6,1 s** | < 1 s | ×6,1 |

Calibración de «arreglado»: G1 da 3,5 % sobre la misma hoja renderizada 4× más fina y reducida (`01-…`); G2 da 1,06 con
la acuarela. **La referencia supermuestreada solo calibra G1** (su defecto va en píxeles); para el rotulador no vale (el
defecto va en mm y se cancela: el error de v3.26.83) y por eso G2 mide contra la geometría de la hoja.

**Actualización (fase 1, guardias implantadas en `lab\tools\measure\guards\`).** Cambios respecto a la tabla de arriba, que se
conserva como quedó en la fase 0:

- **G2** mide ahora contra la geometría de la hoja también en **flancos curvos** (arcos, elipses, banda en S) y con **3 semillas**. El
  umbral de muro subió de 0,25 a **0,35 mm**: con 0,25 la acuarela, que no tiene trazos, daba 4,4 en curvas (ruido de la medida).
  Hoy: rectos 2,30–2,99, curvos 5,77–7,40; acuarela 0,28 / 0,21. Límite **0,7** → margen ×3,3 en el peor caso.
- **G3a** ya no es «bordes nítidos durante el gesto» (una impresión ampliada no puede ser nítida) sino **fotogramas con dibujo crudo
  durante el gesto**: 24/24 en v23.13, límite 0.
- **G3b:** el 0,76 s de la fase 0 estaba **mal medido** (la espera podía cerrarse con un texto de estado anterior). Contado desde el
  último paso de rueda, v23.13 tarda **1,7–2,0 s**. El límite sigue en 0,25 s.
- G1 (43,2 %, límite 12) y G4 (5,9 s, límite 1,2) no cambian.

Avisos honestos: **G2 pasa el listón de ×3 por poco**, solo ve flancos rectos alineados con los ejes y está medida con una
semilla; antes de la fase 4 hay que reforzarla (más semillas, Descuido 0, contornos curvos). G3b en el iPad no se puede
fijar sin medirlo allí. Y la regla de siempre: guardia en verde no es efecto validado; decide el ojo de Moisés.

---

## 7 · Plan por fases

Lab primero; cada fase es un commit en `lab\web` (+ fuentes en `tools\studio\`) y, cuando toca, su port.

| Fase | Qué | Hecho cuando | Valida Moisés |
|---|---|---|---|
| **1 · Instrumentos** (sin tocar shaders) | Prototipos → `lab\tools\measure\` y arnés de Diorame; hoja sintética como `.dior`; 5 semillas; umbrales fijados | G1–G4 fallan como aquí, reproducibles, también en Diorame | Nada a ojo. Responde D5 con una captura |
| **2 · Resolución del Lab** (R1, solo UI) | Vista a resolución de pantalla, navegación con la impresión, sin rodeo por PNG | G3a/b/c en verde; exportación byte a byte igual que antes | PC: zoom y paneo de un `.dior` propio. iPad: lo mismo, y que no vaya más lento |
| **3 · Tóner** (T-A) | `XLUM`/`XGEN` con rampa de 1 px, grano y motas limitados en banda | G1 en verde en vista previa y exportación; Riso y Stencil idénticos | Lab, 4 estilos sin color + «Copia de copia»: ¿sigue siendo una fotocopia? Lupa a 300 ppp. iPad |
| **3p · Port del tóner** | 1:1 a Diorame | G1 en Diorame; `__superRisoHash` idéntico fuera de Fotocopia; `pixcheck`, `flatcheck` | CINEMA y Plana en `localhost:3000`; iPad tras el push |
| **4 · Rotulador por trazo** | `XCOLOR` en dos programas; tabla de trazos; `strokes()` una vez | G2 y G4 en verde; acuarela byte a byte igual | A/B contra v23.13: pasadas paralelas, solapes, desborde, huecos del Descuido, biseles, zonas sin pintar. Es la fase que decide el ojo |
| **4p · Port del rotulador** | 1:1 | G2, G4 en Diorame | CINEMA, Plana, exportación HQ; iPad |
| **5 · Geometría** (condicional) | Trazos instanciados | Coste de `XCOLOR` en iPad y compilación dentro de objetivo | Igual que la 4 |

Las fases 2 y 3 son independientes entre sí; la 4 no depende de la 3.

### Estado real y PAUSA (25 nov 2026, cierre)

**PAUSA por decisión de Moisés.** No se toca código ni shaders, no se publica nada visual y no se porta la v23.17 hasta que
Moisés lo retome (`docs/RETOMAR-fotocopia.md`). Quedan publicados Diorame v3.26.102 (la v3.26.103 es solo documentación) y el
Super Riso Lab v23.17.

| Fase | Estado | Versiones |
|---|---|---|
| 0 · investigación y propuesta | Hecha | app v3.26.97 |
| 0.5 · fuentes del Lab versionadas | Hecha | repo privado `super-riso-lab-tools`, desde v23.13 |
| 1 · guardias | Hecha en el Lab; en Diorame no existen | `lab\tools\measure\guards\` |
| 2 · resolución y zoom del Lab | Hecha | Lab v23.14 (solo Lab) |
| 3 · tóner | Hecha | Lab v23.15 y v23.16 |
| 3p · port del tóner | Hecha hasta la v23.16 | app v3.26.100 y v3.26.101 |
| 3 bis · tóner seco con color a mano (`uTDry`) | Publicado en el Lab; portado en candidata local | Lab v23.17 · app v3.26.104 (sin publicar) |
| rotulador sin dientes de sierra + colores a mano uno a uno | Publicado en el Lab; portado en candidata local | Lab v23.18 · app v3.26.104 (sin publicar) |
| 4 · rotulador por tabla de trazos y `FS_XCOLOR` partido | **Sin empezar** | — |
| 4p, 5 | Sin empezar | — |

La ronda de iPad sigue pendiente (Diorame y Lab). La valoración de Moisés al pausar está en `docs/ux-debt.md`, «Fotocopia v2».
Los apartados fechados de abajo son el relato de cada fase en su momento.

### Estado de las fases (25 nov 2026)

**Fase 0.5 · proteger la fuente canónica — HECHO.** Solo `lab\web` estaba versionado (repo público `DrKlanes/super-riso`, lo que
sirve GitHub Pages). `lab\tools\` entero (fuentes del motor, shaders e interfaz en `studio\`, medidas, texturas) no tenía control
de versiones. Ahora es un repo propio **privado**, `DrKlanes/super-riso-lab-tools`, con raíz en `lab\tools\`; primer commit = estado
exacto de v23.13 (verificado: los cuatro `.js` y la interfaz están, literales, dentro de la página publicada). No va dentro del
repo de `web` porque ese es público y sirve su raíz tal cual (`tools\textures\data` son medidas sobre escaneos de terceros: «no subir
al repo público»). La publicación no cambió. Siguen sin versionar, por tamaño (1,5 GB): `inputs`, `papeles`, `refs`, `renders`,
`lab` (versiones antiguas) y `research` (1,6 MB de anatomías: candidato a entrar).

**Fase 1 · guardias — HECHO.** `lab\tools\measure\guards\` (`guards.mjs`, `lib.mjs`, `export-hash.mjs`, `README.md`,
`baseline-v23.13.json`). Las cuatro fallan con v23.13 con margen ≥ ×3,3: G1 43,2 % (12), G2 7,4 muros/100 mm (0,7), G3 24/24 crudos ·
1,7–2,0 s · ×1,23, G4 5,9 s (1,2). Una guardia cuya fase no se ha hecho sale como «PENDIENTE DE FASE N», no como fallo.
**No hecho:** las guardias en Diorame (hoja sintética como `.dior`); van con el primer port (3p).

**Fase 2 · resolución y zoom del Lab — HECHO, Lab v23.14** (publicado; solo interfaz, motor y shaders sin tocar).

| | v23.13 | v23.14 |
|---|---|---|
| Fotogramas del zoom con dibujo crudo (Riso / Fotocopia / Stencil, 8 cada uno) | 8 · 8 · 8 | **0 · 0 · 0** |
| Tiempo hasta nítido, 1920×1080 (Riso / Fotocopia / Stencil) | 1,69 · 1,70 · 1,99 s | **0,14 · 0,21 · 0,13 s** |
| Tiempo hasta nítido, Fotocopia, en 1366×1024, 1920×1080 y 2560×1440 a DPR 1 y 2 | 1,74–1,85 s | 0,20–0,32 s |
| Vista estirada a 1920×1080@2 · 2560×1440@1,5 · 2560×1440@2 | ×1,19 · ×1,23 · ×1,63 | ×1,00 · ×0,98 · ×0,99 |
| Exportación (huella, 7 casos) y vista en reposo a 2048 px | — | **idénticas** (14/14) |

Qué cambió: durante el gesto se reencuadra la última impresión (lo no cubierto, color del papel; en «Sin efecto», el dibujo sin
desenfoque añadido); la vista se calcula a los píxeles de dispositivo del escenario, con mínimo 2048 px (como antes), tope 4096 px
(2048 en tabletas, móviles y poca memoria) y nunca más que la exportación; al parar, 80 ms de espera (antes 300), sin rodeo por
PNG y sin repetir el análisis de tintas del dibujo entero (los ~1,3 s que se iban eran eso, no el motor).

Límites, dichos claro: **Fotocopia queda en el filo del límite** (0,20–0,32 s según pasada y pantalla; su mapa de zonas depende del
encuadre y cuesta ~0,1 s de CPU). **Tóner y rotulador no cambian de píxel en reposo salvo por la resolución:** con la pantalla por
debajo de 2048 px de dispositivo, la vista es byte a byte la de v23.13; por encima se calcula con más px/mm (hasta ×2), así que
grano, motas y escalones salen más finos, como en una exportación mayor. **iPad sin medir** (tope de 2048 px: mismo coste que antes
salvo la copia del lienzo al empezar el gesto). La exportación tiene un ruido previo, ya en v23.13: una de cada ~14 da otra huella
entre dos pasadas idénticas; por eso se compararon conjuntos de pasadas.

**Fase 3 · tóner — HECHO en el Lab, v23.15** (publicado tras validarlo Moisés a ojo en local; `shaders.xerox.js`, y un parámetro
nuevo en motor e interfaz). **Pendiente: ronda de iPad y port 3p.**

| | v23.14 | v23.15 |
|---|---|---|
| G1, escalones del tóner (hoja sintética, Suciedad 0, 3 semillas) | 40,3–40,7 % | **6,2–6,5 %** (límite 12) |
| G3, zoom | pasa | pasa (0/24 crudos; 0,13–0,20 s) |
| Riso y Stencil: exportación y vista en reposo | — | **idénticas** (8/8 huellas) |
| Fotocopia | — | cambia entera, también al exportar |

Qué cambió:

- **Contornos (T-A, decisión D1).** El umbral de `XLUM` y el de cada generación de `XGEN` abarcan al menos un píxel de la señal
  que umbralizan (pendiente por diferencias de 4 lecturas; sin `dFdx`/`fwidth`).
- **Motas, velo y polvo (D2).** Radio mínimo de 0,07 mm de hoja y cobertura proporcional cuando no llenan un píxel; pelos,
  arañazos y rayas del tambor con borde de un píxel. Antes eran píxeles sueltos enteros.
- **Tonos medios — no estaba en la propuesta; lo encontró Moisés.** En un `.dior` acercado, un tono medio salía como un damero.
  **Causa medida:** la textura de tinta de Diorame es ruido de celdas cuadradas de ±1 % (`createNoise(256, 256, 15, 1, .3, S)`:
  una celda = una unidad de proyecto, así que crece con el zoom) y el umbral de la copiadora la amplificaba ×20. Arreglo en tres
  partes: `XLUM` aplana esa textura antes de umbralizar (media de 7×7 vecinos parecidos a 1,3 celdas; `uTexPx` lo da la interfaz
  desde el encuadre y vale 0 en imágenes); el racimo de tóner nunca es más fino que 1,25 px (en hojas grandes la vista previa va
  a ~3,4 px/mm y el grano se leía por debajo del píxel: trama); y el grano lleva un moteado a dos escalas (≈1 y ≈0,45 mm), con
  los racimos leídos en dos giros para que no sigan los ejes de su textura.

**Lo que NO era la causa / descartado** (no repetir): el grano de la copiadora como origen del damero (era el dibujo); aplanar con
25 celdas (dejaba un moteado con el ritmo de las celdas); quedarse con el vecino más claro en vez de la media (la textura es ruido
continuo, no motas sueltas: aclaraba la zona hasta el blanco); una rampa más estrecha (más nítida, pero G1 en 10,9–12,4 %);
atenuar las motas por área sin tamaño mínimo («Copia de copia» perdía la suciedad).

**Lecciones de método:** (1) **una comparación de huellas con `Math.random` fijado apaga la textura de tinta de Diorame**: sirve
para comprobar que algo NO cambia, nunca para juzgar el aspecto de un `.dior`; el damero no salía en mi banco y sí en la pantalla
de Moisés. (2) G1 se mide con Suciedad a 0: las motas que tocan un contorno contaban como escalón (11,6 % con suciedad).

Límites: el moteado cambia TODOS los tonos medios de Fotocopia, también en imágenes planas; en la vista previa de una hoja grande
el grano sale algo más grueso en mm que al exportar; `XGEN` pasa de 2 a 15 lecturas por generación y `XLUM` hace hasta 49 más con
un `.dior` acercado (sin diferencia medible en escritorio, **iPad sin medir**); **Stencil umbraliza la misma textura de tinta y
puede tener el mismo damero a zoom alto: sin mirar**; en Diorame (CINEMA) la textura de tinta también llega al umbral: el port 3p
tiene que decidir de dónde saca el tamaño de celda.

**Fase 3p · port del tóner a Diorame — HECHO en v3.26.100.** Los siete cuerpos `FS_X*` de `shadersXerox.ts` son idénticos, byte a
byte, a `shaders.xerox.js` del Lab v23.15 (cambian `XLUM`, `XGEN` y `XDIRT`). Un parámetro nuevo, `tex` → `uTexPx`, fijado en
cada render.

- **De dónde sale el tamaño de celda en Diorame.** En la app la textura de tinta se pinta como patrón en píxeles de pantalla
  (`composeLayer`), no en unidades del dibujo: una celda = 1 px lógico (`renderScale` px de dispositivo). En px de simulación,
  `tex = renderScale · simW / w` (`frame.prepare`): ~0,91 en vivo con Resolución .85. Por debajo de 0,75 (lo-fi, modo ligero) el
  aplanado no actúa: la celda ya es menor que el píxel simulado.
- **Comprobado** (servidor de desarrollo, Chrome desechable): `__superRisoHash` — Riso y Stencil idénticos, Fotocopia cambia
  entera (acuarela, flyer, foto); `__markerEdgeCheck` `pass: true` con el mismo fallo conocido de antes (6/6 casos, valores
  prácticamente iguales); typecheck, 738 tests y build en verde; en vivo por la UI real, cinco estilos, 60 fps y 1,3 ms de GPU
  de motor en escritorio, sin errores.
- **Ruido previo, no del port:** las huellas `…/forward-hq2` de Riso bailan entre dos valores en pasadas idénticas del MISMO
  código (3 repeticiones: `riso/forward-hq2` alterna entre la huella de «antes» y otra). El arnés no es estable en HQ ×2.
- **`renderScale` llega a Super Riso desde v3.26.101** (GO de Moisés, 25 nov 2026): una línea, `renderScale: S`, en el objeto que
  `renderFrame` entrega a `beginSuperRisoFrame`. Nada se mueve ni se envuelve; solo lo lee `frame.prepare` para Fotocopia. Con
  S = 1 (vivo, GIF, secuencia) el valor es el de antes: 14 huellas de ×1 idénticas; cambian solo las tres de Fotocopia en HQ ×2,
  que ahora aplanan la textura de tinta sobre las 49 celdas, como en vivo. `__markerEdgeCheck` 6/6.
- **No hecho:** (2) Las guardias G1–G4 en
  Diorame (hoja sintética como `.dior`). (3) iPad: `XGEN` hace 15 lecturas por generación (antes 2) y `XLUM` 49 más en vivo.
  (4) El aspecto en Diorame, a ~4,7 px/mm, es algo más blando que en el Lab: lo juzga Moisés en `localhost:3000`.

**Segunda vuelta de la 3p, antes de subir (Moisés, en `localhost:3000`: «incluso con el tamaño de trama al mínimo queda una trama
demasiado gruesa y poco natural»).** Va en el mismo v3.26.100; en el Lab es la **v23.16** (cambia `XGEN`).

- **Causa medida** (mismo fotograma fijo y sembrado, por la ruta de exportación; `media/fotocopia-v2/11-…`): **el desenfoque final
  del escáner.** Desde v3.19.2 Diorame le da a Fotocopia la suavidad compartida de Resolución (1 → 0,65 px; ~0,7 px por defecto);
  el Lab usa 0,06 mm de hoja, que a 4,7 px/mm son ~0,3 px. Sobre un grano de ~1 px ya antialiasado, 0,7 px lo convertía en
  manchas blandas de 3–4 px. **Arreglo (solo app):** `xeroxParams` usa los 0,06 mm del Lab; el RUIDO del escáner sigue a Resolución.
- **En el shader (Lab v23.16, portado 1:1):** la pendiente del grano cuenta la mitad en el ancho del umbral (la de los contornos,
  entera): motas más nítidas; el racimo puede bajar a 1 px (era 1,25); y el moteado sigue al tamaño de trama (15 y 6 veces
  `uGrain`) con peso 0,09 (era 0,12 a escala fija).
- **Lo que NO era** (probado sobre el mismo fotograma, apenas movían nada): la escala fija del moteado; el suavizado del grano en
  el umbral, por sí solo. Mi primer cambio (atar el moteado al deslizador) no se notaba: lo que mandaba era el escáner.
- **Comprobado:** Lab G1 6,2 % y G3 pasa; en la app, Riso y Stencil idénticos a ×1, `__markerEdgeCheck` 6/6 **sin ningún fallo
  conocido** (el halo entre colores en lo-fi baja de 6 % a 0,1 %: era el mismo desenfoque); typecheck, tests y build en verde.
- **Límite que no se puede saltar:** en Diorame el grano no puede ser más fino que un píxel de simulación (~0,2 mm de hoja a
  Resolución .85), así que entre «trama al mínimo» y «35 %» la diferencia es pequeña. Subir Resolución lo afina.
- Herramienta: `__markerEdgeShot` acepta `xerox: { … }` (parche de ajustes de Fotocopia) para renderizar un fotograma fijo con
  cualquier oscuridad o tamaño de trama; en vivo la cámara de la escena de ejemplo se mueve y dos capturas no son comparables.

---

## 8 · Decisiones para Moisés

**DECIDIDAS (Moisés, 25 nov 2026):** D1 tóner **T-A** (rampa de 1 px) · D2 **la vista previa predice la exportación** · D3 rotulador
por **tabla de trazos**; geometría solo si luego hace falta · D4 zoom del Lab = **reencuadre (R1)**, nítido y sin dibujo crudo
durante el zoom · D5 la borrosidad que ve es la **(a)**: solo durante el zoom; al soltar se ve bien; lo que percibe es el salto de
«dibujo crudo borroso» a «efecto» · D6 el fundido de aerógrafo de las zonas sin pintar **se corrige en la fase 4** · D7 **fase 2
antes que el tóner** · D8 **port por fases**, con ronda de iPad cada una · D9 **«≈ 1 s»** de compilación vale como hecho de la fase 4.

La lista original, con las alternativas que se descartaron:

1. **Tóner.** ⭐ T-A (umbral con rampa de 1 px, sin pasadas nuevas). Alternativa: T-B (supermuestreo, carácter exacto, ×4 de
   coste en esas pasadas).
2. **Motas y grano fino en la vista previa.** ⭐ Que la vista prediga la exportación (a baja resolución se ven más tenues,
   como en `01-…` derecha). Alternativa: mantener la mota dura de 1 px en la vista, sabiendo que no es lo que sale.
3. **Rotulador.** ⭐ Tabla de trazos conservando el sombreado actual, y geometría solo si después hace falta.
   Alternativas: ir directo a geometría (más riesgo de carácter, mejor coste) o dejarlo aparcado y hacer solo P2–P4.
4. **Qué es el zoom del Lab.** ⭐ R1: sigue siendo reencuadre (es lo que se exporta), pero nítido y sin el dibujo crudo
   borroso mientras te mueves. Alternativa: R3, lupa continua sobre la hoja impresa (cambia el significado del zoom).
5. **¿Qué borrosidad ves exactamente?** Necesito una captura y saber resolución y escala de tu pantalla. Candidatas:
   (a) mientras haces zoom, (b) ya parado en pantalla grande/HiDPI, (c) las manchas blancas difusas del rotulador (H3).
   Si es otra cosa, el diagnóstico de P4 está incompleto.
6. **Zonas sin pintar del rotulador (H3).** ¿El fundido difuso es carácter que validaste, o lo metemos en la fase 4 para que
   el color acabe en finales de trazo? ⭐ Meterlo en la fase 4.
7. **Orden.** ⭐ Fase 2 (resolución del Lab) antes que el tóner: solo toca la UI, riesgo bajo y es lo más visible.
8. **Port.** ⭐ Por fases (tóner y rotulador por separado), cada uno con su ronda de iPad. Alternativa: un solo port al
   final (menos rondas de iPad, más cambio de golpe).
9. **Objetivo de compilación.** Con dos programas y `strokes()` una vez, la medida es 1,1 s para el rotulador y 0,6 s para
   la acuarela. ¿Vale «≈ 1 s» como hecho de la fase 4, o el «< 1 s» estricto obliga a la fase 5?

---

## 9 · Evidencia

`docs/media/fotocopia-v2/`: `01` tóner hoy frente a referencia (hoja sintética) · `02` tóner en la escena, tres versiones
del Lab · `03` Diorame v3.26.69 frente a v3.26.96 · `04` zoom del Lab durante y después · `05` flanco del rotulador en
tres versiones y acuarela · `06` hoja de rotulador entera (zonas sin pintar difusas) · `07` escena al 682 %.
`proto/`: hojas sintéticas, scripts de captura por la UI (`labshot`, `labsheet`, `zoomlat`, `appshot`, `compile`) y de
medida (`edge.py`, `stair.py`, `flank.py`). Los `.mjs` necesitan `puppeteer-core` en una carpeta temporal
(`tools/load-timing/README.md`) y los `.py`, Pillow y NumPy.
