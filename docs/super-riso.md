# Super Riso — página de diseño

Estado: público desde **v3.18.0**; tres técnicas desde **v3.20.0** (Riso, Fotocopia en v3.19.0, Stencil en
v3.20.0); última versión auditada: **v3.20.1**. Este documento es la visión de producto y de uso. La descripción
técnica (tablas de estado, mapeos, pasadas, mapas en CPU, trampas de GPU, procedencia del Lab) está en
`src/REFERENCE.md` §14 y §10; reglas de trabajo y lecciones de medición, en `CLAUDE.md`; deuda y decisiones
abiertas, en `docs/ux-debt.md`.

## Qué es

Un FX de CINEMA que convierte cada frame en una **risografía escaneada, en tiempo real**.
Se aplica después de que la escena esté compuesta (capas, profundidad, niebla, DoF, glow), así
que funciona con todos los presets de cámara y se combina con lo que va detrás (aberración
cromática, viñeta, grano, grunge). Separa el frame en tintas, imprime cada una con su trama
(grano o puntos) con las tintas claras continuando bajo las oscuras (sobreimpresión, v3.20.12), le añade el desregistro, la película de tinta, las fibras del papel y las
inclusiones, y puede **reimprimir** con otra tirada a 4/6/8/12 fps (el stop motion de la
impresión entera).

Riso: panel de 8 controles (los ~35 parámetros del laboratorio, bajo curvas fijadas allí): Tintas ·
Número de tintas · Papel · Trama · Tamaño de trama · Imperfección · Resolución · Reimpresión,
más 4 estilos que fijan todo de una vez (Taller limpio · Fanzine · Lo-fi · Cuatricromía) y,
solo en dispositivos lentos, «Calidad completa siempre».

## Las tres técnicas

Un selector «Técnica» al principio del bloque cambia el motor de impresión; todas comparten el mismo gancho en
el render, los niveles de calidad, las exportaciones, la Reimpresión y el bloque plegable «Ajustes de
impresión», con cinco ranuras en el mismo orden (Papel/Soporte · Trama/Textura · Tamaño de trama/de gota ·
Imperfección/Suciedad/Descuido · Resolución). La Resolución es una sola para las tres. Qué ocupa cada ranura y
cómo se traduce al motor: REFERENCE.md §14, «inventory».

**Riso** — la risografía escaneada (arriba). 4 estilos: Taller limpio, Fanzine, Lo-fi, Cuatricromía. Controles:
Tintas (Dibujo · CMYK · Riso), Número de tintas, Reimpresión y los ajustes de impresión.

**Fotocopia** (v3.19.0, ajustes de impresión en v3.19.2) — copy art / xerox. La copiadora como umbral sucio
(tóner, generaciones de copia, suciedad física, sólidos huecos) y el color puesto a mano después (rotulador o
acuarela), que no casa con la línea. Controles: Copiadora (Oscuridad, Negro del tóner, Generaciones), Color a mano
(Sin color · Rotulador · Acuarela; «Manchas de color» pinta cada zona de color del dibujo con su rotulador, con
selector de los 16 y ↺ para volver al automático; «Huecos en blanco» colorea los huecos cerrados por la línea con
la caja de rotuladores y «Otro reparto»), Descuido. 8 estilos: Flyer punk, Fanzine a rotulador, Acuarela sobre
copia, Papel flúor, Copia de copia, Modo foto, Munari y Tapa abierta.

**Stencil** (v3.20.0) — plantilla recortada + spray. Hasta 4 plantillas por tono o por color (+ negro) con filo
de cuchilla y puentes opcionales, spray punteado, plantilla levantada, niebla, goteras, salpicaduras, nube a mano
alzada y soporte (pared gris/blanca/oscura, cartón, lienzo, madera, papel). Controles: Plantillas, Spray, Colores
(sprays o los del dibujo, una fila por capa, acento y nube) y, en los ajustes de impresión, Soporte, Textura del
soporte, Tamaño de gota y Descuido. 8 estilos: Banksy en cartón, Lienzo limpio, Retrato en muro, Multicapa, Acento
de color, Capas de color, Callejero sucio y Plantilla de letras.

**Limitaciones conocidas** (el detalle y las decisiones abiertas, en `docs/ux-debt.md`):
- Stencil: goteras, salpicaduras y puentes solo aparecen con la cámara en reposo (por diseño, para que no floten
  desencajados del dibujo); con un preset de cámara en marcha no se ven en vivo, pero las exportaciones siempre
  los llevan. La nube se mantiene.
- Stencil en modo oscuro con niebla atmosférica sale muy oscuro (la niebla tiñe el propio dibujo hacia el fondo
  oscuro): se ajusta con Oscuridad, con Multicapa o apagando la niebla. Decisión de Moisés: aceptado.
- Fotocopia y Stencil toman el color de fondo del lienzo como papel de origen («imprime lo que ves»; blanco en
  oscuro); el Lab toma el claro dominante del dibujo, así que con las mismas entradas coinciden pero con las
  automáticas pueden diferir.
- El escáner de Fotocopia y Stencil sigue la Resolución compartida: un poco más blando que en el Lab.
- Fotocopia y Stencil aún no se han medido en iPad real (el nivel y el aviso de efecto exigente son los de Riso).
- Los mapas en CPU hacen que la primera activación de Stencil (campo de spray, ~150 ms) y las exportaciones con
  muchas capas tarden algo más.

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
4. **Panel de 8 controles (Riso), encajado en 196 px** de ancho útil: papel como 4 muestras de color,
   tintas con etiquetas cortas (Dibujo · CMYK · Riso) y nombre completo en tooltip, ajustes de
   impresión plegados.
5. **Texturas propias**, sintetizadas (ver abajo): ya no dependemos de escaneos de terceros.
6. **Agilidad sobre rondas de medición.** Tras C2a se lanzó con lo medido; SEP0 se optimizó sin
   una nueva ronda.
7. **Lazy load.** Nada se carga hasta que el estado lo trae encendido; así una sesión que no lo
   usa no paga chunk, texturas ni contexto WebGL.
8. **Tres técnicas, un solo motor y un solo panel.** Fotocopia y Stencil reutilizan el gancho, los niveles
   de calidad, las exportaciones y el bloque de ajustes de impresión de Riso; no hay estructuras paralelas.
9. **El Super Riso Lab es la fuente canónica.** Los shaders se portan 1:1 y se validan contra el Lab con las
   mismas entradas (procedimiento y tabla Lab ↔ Diorame: REFERENCE.md §14, «provenance»).
10. **Imprime lo que ves.** El papel de origen es el fondo del lienzo (blanco en oscuro) en las tres técnicas.

## Cifras clave

**Escritorio** (RTX 5070 Ti, Chrome, con temporizador de GPU):
- Coste añadido de frame: ~0,4 ms (el frame lo limita la CPU; la GPU va en paralelo).
- GPU del motor: 3,9–4,9 ms a 1920, ~2,9 ms a 1366; 1080p medido en 3,1 ms → nivel full.
- Palancas: res .75 → 2,5 ms; res .5 → 1,3 ms (a 1920). Preview shaders: GPU del render −46 a −52 %.
- Variantes sin pérdida: SPREAD −59 %, SEP0 −7,5 % de GPU, todas 0 px frente al laboratorio.
- 13 pasadas por frame + LUT 33³ solo al cambiar tintas o papel (medido así; desde v3.20.12 son 16, con la sobreimpresión FILL y sus dos desenfoques a ¼, sin medir aún).

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
- `greennoise1024.png`: generada proceduralmente. Las fibras e inclusiones del papel y el campo de
  spray de Stencil (2048², una vez por sesión) se generan en ejecución.
- Las estadísticas de la síntesis coinciden con las del original y, en render, original y
  sintética son prácticamente indistinguibles.
- La lista de tintas es riso-colors (MIT, Matt DesLauriers): ver `src/Attributions.md`.

## Dónde viven las herramientas

**Fuera del repo**, en `C:\Users\Usuario\Desktop\diorame-riso-lab` (privado: `tools/textures/data/` sale de
escaneos de terceros). Es la fuente canónica de las tres técnicas: `tools/studio/` (shaders y motor por técnica,
interfaz), `research/` (anatomías y plan, `PLAN-super-riso.md` §1–§16), `lab/` (versiones publicadas del
laboratorio) y `renders/`. Su `tools/README.md` lista las fuentes y la tabla Lab ↔ versión de Diorame (la
versión sincronizada hoy es la v18; el procedimiento para cambios futuros está en REFERENCE.md §14,
«provenance»). No subir nada de esa carpeta al repo público.
