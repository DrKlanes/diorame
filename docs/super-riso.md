# Super Riso — página de diseño

Estado: público desde **v3.18.0** (L1 en v3.17.74, motor y niveles; L2 en v3.18.0, panel y
lanzamiento; técnica Fotocopia en v3.19.0). Descripción técnica exhaustiva: `src/REFERENCE.md` §14 y §10. Reglas de
trabajo y lecciones de medición: `CLAUDE.md`. Deuda abierta: `docs/ux-debt.md`.

## Qué es

Un FX de CINEMA que convierte cada frame en una **risografía escaneada, en tiempo real**.
Se aplica después de que la escena esté compuesta (capas, profundidad, niebla, DoF, glow), así
que funciona con todos los presets de cámara y se combina con lo que va detrás (aberración
cromática, viñeta, grano, grunge). Separa el frame en tintas, imprime cada una con su trama
(grano o puntos), le añade el desregistro, la película de tinta, las fibras del papel y las
inclusiones, y puede **reimprimir** con otra tirada a 4/6/8/12 fps (el stop motion de la
impresión entera).

Panel de 8 controles (los ~35 parámetros del laboratorio, bajo curvas fijadas allí): Tintas ·
Número de tintas · Papel · Trama · Tamaño de trama · Imperfección · Resolución · Reimpresión,
más 4 estilos que fijan todo de una vez (Taller limpio · Fanzine · Lo-fi · Cuatricromía) y,
solo en dispositivos lentos, «Calidad completa siempre».

**Técnica Fotocopia (v3.19.0).** Un selector «Técnica: Riso / Fotocopia» cambia el motor por el
de copy art del Lab (`diorame-riso-lab/tools/studio/`, validado por Moisés): la copiadora como
umbral sucio (tóner, generaciones de copia, suciedad física, sólidos huecos) y el color puesto a
mano después (rotulador o acuarela), que no casa con la línea. Port 1:1: shaders byte a byte,
mismas pasadas y mismos targets a ¼. Panel reducido a los controles macro del Lab (Copiadora,
Color a mano) y sus 8 estilos, más el mismo «Ajustes de impresión» plegable de Riso (Papel, Trama Línea|Foto, Tamaño de trama, Suciedad, Resolución); el ajuste fino del Lab no tiene sliders: sale de `xBase()`
más los overrides `fine` de cada estilo. Los mapas en CPU (orientación del trazo y huecos
blancos) no se calculan por fotograma en vivo: al cambiar sus entradas, y si no, como mucho cada
300 ms en un idle callback; en exportación, siempre. Diferencia consciente con el Lab: el papel
de origen es el color base del lienzo («imprime lo que ves»), no el claro dominante del dibujo.
Detalle: REFERENCE.md §14, «Technique Fotocopia».

## Arquitectura

**Dónde entra.** Fase 3 de `renderFrame`, en la ranura de `applyRisoV2`, sobre `offCtx` ya
compuesto y antes de CA, viñeta, grano y grunge. Es un módulo con una función de entrada,
`applySuperRiso(offCtx, w, h, input)`, y un gancho previo, `beginSuperRisoFrame()`, que
`renderFrame` llama antes de la fase 1. Es el único post-proceso WebGL de la app (excepción
documentada en CLAUDE.md, FX filtro 5): canvas WebGL2 propio, aislado en `canvas/superRiso/`,
cargado bajo demanda.

**Modelo de papel: imprime lo que ves.** `offCtx` solo tiene capas con alfa; el fondo se pinta
aparte. La entrada del motor es el color BASE del fondo (sin su textura de papel) con `offCtx`
encima, con el mismo operador que la transferencia (multiply en claro, source-over en oscuro).
`srcPaper` —el color de la fuente que se convierte en papel— es el del fondo en claro y
**blanco en oscuro**: el fondo oscuro tiene que ser tinta a sangre con reservas de papel, como
un cartel riso oscuro; con el fondo oscuro como `srcPaper` todo salía en blanco. La salida es
opaca, con el papel de Super Riso, y sustituye a `offCtx`; mientras está activo la
transferencia a `ctx` usa source-over (con multiply se tintaría con el fondo).

**Tintas.** Salen de los colores de relleno de las formas (`sceneInks.ts`), cacheadas por
escena; nunca un k-means por frame, que haría parpadear las tintas con la cámara. «Riso» usa
la tinta más cercana de la paleta riso de Diorame (subconjunto de riso-colors) para cada grupo; CMYK es una lista fija.

**Escala física.** Grano y desregistro van en mm de un papel virtual de 240 mm del ancho del
frame: una exportación HQ ×2 es la misma impresión con más resolución, no un grano a la mitad.
La textura de papel va fija al encuadre (es la hoja), no al mundo 3D.

**Canalización (pipe 1).** En Safari, subir un canvas 2D a WebGL (`texImage2D`) espera a que la
GPU termine el dibujo 2D pendiente del frame: 19–24 ms casi fijos en el iPad, independientes
de la resolución. `beginSuperRisoFrame()` sube el aplanado del frame ANTERIOR al inicio del
siguiente, antes de la fase 1, cuando no hay 2D pendiente. Un frame de latencia, invisible. Si
no hay resultado válido (primer frame, cambio de tamaño, tema o parámetros) ese frame va
síncrono: nunca se dibuja un frame con un tamaño viejo.

**Niveles de calidad (medidos, no supuestos por tipo de dispositivo).**

| Nivel | Cuándo | Qué hace |
|---|---|---|
| detect | primeros frames a cada tamaño de lienzo | 5 de calentamiento + 30 medidos a nivel completo; mediana > 12 ms → preview, si no full |
| full | escritorio, y SIEMPRE las exportaciones | motor del laboratorio + variantes sin pérdida (0 px frente al lab) |
| preview | solo vivo, en GPUs lentas (iPad) | resolución .75, shaders simplificados, canalizado; con la imagen quieta ≥ 300 ms se refina un frame a completa y res 1 y se retiene |
| fullQuality | interruptor, solo en preview | nivel completo retenido entre ticks de reimpresión (12 fps sin reimpresión) |

La medida usa el temporizador de GPU donde existe (escritorio) y la espera de un readback 1×1
donde no (Safari). Las exportaciones (PNG HQ, GIF, PNG-secuencia) van en su propia instancia
del motor, siempre síncronas y a nivel completo; el MP4 graba el canvas vivo y hereda el nivel
vivo.

**Reimpresión determinista.** Vivo: semilla = tick puro de `reprintFps` (0 = fija). GIF y
PNG-secuencia: `floor(i · reprintFps / fpsExport)` vía `RenderContext.exportFrame`.

**Robustez.** `try/catch` total fuera de `renderFrame`; fallo de texturas, excepción o pérdida
de contexto (iOS libera la GPU en segundo plano) saltan el efecto sin dejar `offCtx` a medias y
el frame sale sin Super Riso. Sin WebGL2: aviso al activar y nada más.

## Decisiones

1. **Nombre: Super Riso.** «Pro» sonaba a de pago y Diorame es gratis.
2. **Convive con el Riso actual, pero son excluyentes.** El Riso actual es el efecto sencillo y
   ligero; Super Riso es el acabado top. Riso sobre Super Riso no tiene sentido: activar uno
   apaga el otro.
3. **La calidad del laboratorio es innegociable.** El motor completo, con los shaders idénticos
   al laboratorio, es la referencia: se usa siempre en escritorio y en todas las exportaciones.
   Cualquier optimización es un modo de vista previa adicional para GPUs débiles; nunca sustituye
   al motor completo ni cambia su aspecto.
4. **Panel de 8 controles, encajado en 196 px** de ancho útil: papel como 4 muestras de color,
   tintas con etiquetas cortas (Dibujo · CMYK · Riso) y nombre completo en tooltip, ajustes de
   impresión plegados.
5. **Texturas propias**, sintetizadas (ver abajo): ya no dependemos de escaneos de terceros.
6. **Agilidad sobre rondas de medición.** Tras C2a se lanzó con lo medido; SEP0 se optimizó sin
   una nueva ronda.
7. **Lazy load.** Nada se carga hasta que el estado lo trae encendido; así una sesión que no lo
   usa no paga chunk, texturas ni contexto WebGL.

## Cifras clave

**Escritorio** (RTX 5070 Ti, Chrome, con temporizador de GPU):
- Coste añadido de frame: ~0,4 ms (el frame lo limita la CPU; la GPU va en paralelo).
- GPU del motor: 3,9–4,9 ms a 1920, ~2,9 ms a 1366; 1080p medido en 3,1 ms → nivel full.
- Palancas: res .75 → 2,5 ms; res .5 → 1,3 ms (a 1920). Preview shaders: GPU del render −46 a −52 %.
- Variantes sin pérdida: SPREAD −59 %, SEP0 −7,5 % de GPU, todas 0 px frente al laboratorio.
- 13 pasadas por frame + LUT 33³ solo al cambiar tintas o papel.

**iPad** (Safari 27, DPR 2, canvas 1366×967, Apple GPU, sin temporizador de GPU; línea base de
Diorame sin Super Riso: 42 fps, frame 23 ms):
- Primer portado, a res completa: 14 fps (frame 71 ms), con ~25 ms de CPU FIJOS. NO-GO tal cual.
- Diagnóstico (C1b): todo en `texImage2D`, 19–24 ms casi fijos aunque la imagen fuese de 622×427:
  sincronización con el 2D pendiente, no ancho de banda; `createImageBitmap` no la evita.
- Canalizado (C1c): subida de 18 a 2 ms. Lo que queda es la GPU real: espera de la vuelta de 22,
  28 y 38 ms a .5, .75 y 1. Hold a res 1: 24,6 fps con p95 de 51 ms.
- Perfil por pasada (C2a): SEP0 es la mitad del coste (13 ms), SPREAD 3 ms, el resto ~1 ms.
- Con preview shaders: .75 → 38 ms (26,6 fps); .75 con hold → 31 ms (30 fps).

Pendiente de validar en iPad real tras L2: el aviso, «Calidad completa siempre» y el nivel
detectado (ver `docs/ux-debt.md`).

## Procedencia de las texturas

Las 4 texturas de `public/textures/superRiso/` son propias:
- `ink_black.png`, `ink_red.png` (película de tinta y micro-vacíos) y `ink_lut.png` (inversión
  de grosor): sintetizadas a partir de **estadísticas medidas** sobre escaneos de riso real
  (espectro de potencia e histograma de grosor de la película; densidad, tamaño, forma y
  agrupación de los vacíos). La película sale por IAAFT y los vacíos por un proceso de puntos
  de Thomas. No contienen ningún píxel de los escaneos y son enlosables.
- `greennoise1024.png`: generada proceduralmente. Las fibras e inclusiones del papel se generan
  en ejecución.
- Las estadísticas de la síntesis coinciden con las del original y, en render, original y
  sintética son prácticamente indistinguibles.
- La lista de tintas es riso-colors (MIT, Matt DesLauriers): ver `src/Attributions.md`.

## Dónde viven las herramientas

**Fuera del repo**, en `C:\Users\Usuario\Desktop\diorame-riso-lab\tools\` (privado: sus datos
medidos, `tools/textures/data/`, salen de escaneos de terceros). El plan, las decisiones y las
mediciones completas están en `C:\Users\Usuario\Desktop\diorame-riso-lab\research\PLAN-super-riso.md`
(§1–§16). El laboratorio autónomo y sus renders viven en la misma carpeta (`lab/`, `renders/`).

Contenido de `tools/`: `lab-build/` (fuente del laboratorio y del motor autónomo, `build.py`),
`textures/` (síntesis: `synth.py`, `voids.py`, `rp.py`, `stats.py`), `measure/` (anchura de
borde y tamaño de grano de riso real) y un `README.md`. No subir nada de esa carpeta al repo
público.
