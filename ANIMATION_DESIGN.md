# Diorame — Diseño de Animación

> Documento de diseño de feature. Captura las decisiones de **producto y UX**
> tomadas antes de implementar el modo Animación. NO es diseño técnico
> (estado, RAF, overrides) — eso es una fase posterior. Fuente de verdad del
> diseño durante el sprint de implementación.
>
> Estado: diseño de producto COMPLETO. Diseño técnico e implementación: pendientes.

---

## Visión

Animación frame-by-frame en Diorame, donde **cada capa con contenido es un frame**.
Lo que hace única a la feature: la animación no es plana — los frames viven
simultáneamente en el **espacio (profundidad Z)** y en el **tiempo (secuencia)**.
Esto permite, en modo CINEMA, una animación 2D tradicional que además tiene
parallax 3D, cámara cinemática y post-procesado encima. Animación con volumen.

La feature es en gran parte **recombinación de maquinaria que Diorame ya tiene**
(sistema de capas, gestión de capas, export de vídeo, isLayerEmpty), no una
herramienta de animación construida desde cero.

---

## Arquitectura

- **Animación = toggle DENTRO de DRAW.** No es un tercer modo. Más minimalista,
  fiel a la filosofía de simplicidad, reutiliza toda la maquinaria de dibujo.
- **Todas las capas con contenido son frames.** Las capas vacías se saltan
  automáticamente (vía `isLayerEmpty`, ya implementado en v3.0.5).
- **Capa 1 = frame 1**, en orden ascendente.
- **La Z nunca se borra**: en DRAW con animación ON se "aplana" temporalmente
  para dibujar/previsualizar cómodo, pero la profundidad sigue guardada y vuelve
  en CINEMA.
- **Distinción conceptual base:**
  - *Secuencia de frames* = capas con contenido, en orden. Sobre ella operan
    playback, onion skin, contador de frames.
  - *Secuencia de capas* = todas las capas, incluidas vacías. Sobre ella opera
    la profundidad Z / parallax.

---

## Comportamiento por modo

### En DRAW (toggle animación ON)
- Z aplanada temporalmente (todos los frames en el mismo plano).
- Onion skin toggleable.
- Reproductor de animación para que el dibujante previsualice y pruebe mientras
  crea.

### En CINEMA
- La Z vuelve: los frames aparecen en su profundidad. La animación "viaja" en
  el espacio además de en el tiempo.
- Reproductor de animación también presente.
- Se aplican FX y movimientos de cámara a la animación en reproducción.
- **Toggle en el playback para anular la profundidad** → colapsa los frames al
  mismo plano = animación 2D plana clásica. (Decisión consciente de duplicar la
  función del slider de distancia Z de cámara: el toggle comunica una intención
  binaria y semántica, el slider es un ajuste fino. Intenciones distintas.)

---

## Capas vacías (fricción resuelta)

Las capas vacías son una herramienta de composición en Diorame: se insertan
entre fondo y primer plano para generar separación Z y más sensación de espacio.

En animación, una capa vacía NO debe ser un frame en blanco (sería un parpadeo).
**Solución: el reproductor las salta automáticamente**, reutilizando la
derivación `isLayerEmpty` de v3.0.5. Cero configuración nueva, cero carga mental,
cero UI extra. Las capas vacías conservan su función de profundidad; el animador
las ignora solo.

- **Frame en blanco intencional**: NO se resuelve en esta versión. Si surge la
  necesidad real, será una feature propia ("insertar pausa"). No contaminar el
  diseño base con un caso de uso minoritario.

---

## Bloque 1 — Playback y timing

- **Framerate**: presets fijos **4 / 6 / 8 fps**. Simple, estética de animación
  tradicional, sin parálisis de decisión.
- **Reproducción**: **loop infinito** siempre.
- Sin play-once ni ping-pong (features futuras si surge necesidad real).

---

## Bloque 2 — Onion skin

- **Alcance**: frame **anterior + siguiente** (1 a cada lado). Estándar.
- **Visual**: semitransparencia **en su color real**, sin teñir. Mantiene la
  identidad Riso (no se introducen azul/rojo ajenos a la paleta).
- Opera sobre la secuencia de frames reales (salta vacías).
- Toggleable on/off.
- *Detalle de afinado (implementación)*: como no se tiñe, conviene distinguir
  anterior de siguiente por nivel de opacidad. Se calibra visualmente al
  construir.

---

## Bloque 3 — Gestión de frames

- **Reutiliza 100% la gestión de capas existente.** Cero código nuevo.
  - Añadir frame = botón "+" (v2.9.3).
  - Duplicar frame = duplicar capa (ya existe) → cubre el flujo clave de animar
    partiendo del frame anterior.
  - Reordenar frames = reordenar capas (ya existe).
  - Navegar frames = navegar capas (ya existe).

---

## Bloque 4 — UI del reproductor

- **Control mínimo**: play/pause + contador (frame X/N) + selector de framerate
  (4/6/8).
- El **panel de capas hace de timeline** (ya muestra la secuencia de frames). No
  se duplica con una timeline de miniaturas.
- **Mismo componente en DRAW y CINEMA** (consistencia, una sola pieza de UI).
  - En CINEMA, ese control suma el **toggle de profundidad** on/off.
- El contador "frame X/N" cuenta sobre la secuencia de frames reales
  (N = capas con contenido).

---

## Bloque 5 — Export

- **Vídeo WebM/MP4**: reutiliza el export existente. La animación en CINEMA es
  "canvas en movimiento", debería capturarse casi gratis.
- **GIF**: NUEVO. Codificación GIF en navegador, paleta limitada. Sub-fase propia.
- **PNG sequence**: NUEVO. Cada frame como PNG numerado, probablemente empaquetado
  en ZIP. Para animadores que montan en otra herramienta. Sub-fase propia.

---

## Pendiente: diseño técnico de implementación

Lo siguiente NO está diseñado todavía y es una sesión propia antes de tocar código:

1. **Modelo de estado** de animación (campos nuevos en StrataContext:
   `isAnimationMode`, `isOnionSkin`, `framerate`, `currentFrame`, `isPlaying`, etc.).
2. **Manejo del RAF loop** para el playback sin pelearse con el render existente.
3. **Uso de los 3 overrides** ya preparados en `renderFrame()`:
   `renderZsOverride`, `skipLiveStroke`, `skipCinematicOverlays` — para esto se
   construyó el refactor del Plan C (v3.0.0).
4. **Orden de sub-fases del sprint** (qué se construye primero, qué valida cada
   hito). Probable: núcleo de playback en DRAW → onion skin → playback en CINEMA
   con profundidad/toggle → export GIF → export PNG sequence.

---

## Principios de diseño que guiaron estas decisiones

- **Simplicidad opinionada**: presets fijos, loop siempre, control mínimo. Menos
  controles, menos parálisis, estética coherente.
- **Reutilizar antes que construir**: capas, gestión de capas, isLayerEmpty,
  export de vídeo, renderFrame. La feature recombina maquinaria existente.
- **Respetar la identidad Riso**: onion skin sin teñir, paletas fijas intactas.
- **No contaminar el diseño base con casos minoritarios**: frame en blanco
  intencional, play-once, ping-pong → futuras si surgen, no ahora.
