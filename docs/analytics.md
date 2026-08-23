# Analítica de Diorame — qué mide cada número

Documento vivo. Existe para que dentro de seis meses se sepa qué significa
exactamente cada evento de GA4, y qué NO significa.

- **Propiedad GA4:** Measurement ID `G-8812T7T7G9`
- **Etiqueta:** el snippet de gtag.js vive en `index.html`. El módulo
  **consume** ese `window.gtag`; nunca llama a `gtag('config', ...)` ni inyecta
  la etiqueta. Duplicar la config produciría `page_view` dobles y falsearía
  todos los porcentajes del embudo.
- **Contrato de eventos:** `DioramEventMap` en `src/analytics/analytics.ts`.
  Es la fuente única. Añadir un evento = añadir una línea ahí.
- **Por qué existe cada evento:** ver `docs/BRIEF-CLAUDE-CODE.md`.

---

## Estado de la instrumentación

Embudo completo instrumentado (v3.16.0). Todos los eventos del contrato tienen
disparador salvo `stroke_milestone` (automático: 10/50/200 trazos),
`share_clicked` y `onboarding_step`, que no tienen UI que los emita.

---

## Eventos activos

| Evento | Dónde se dispara | Flag `once` | Qué mide |
|---|---|---|---|
| `canvas_ready` | `src/App.tsx:124` | **Compartido** con `mobile_blocked` | Paso 1 real del embudo: la app arrancó en un dispositivo compatible, con el canvas montado |
| `mobile_blocked` | `src/App.tsx:123` | **Compartido** con `canvas_ready` | Demanda rechazada por la pantalla de bloqueo |
| `first_stroke` | `StrataCanvas.tsx:1218` (dibujo) · `TextSessionPanel.tsx:53` (texto) | Propio (`firstStrokeSent`) | **Activación real.** Primer trazo de la sesión |
| `stroke_milestone` | mismos puntos | Uno por hito | Profundidad de uso: 10, 50, 200 trazos |
| `layer_added` | `LayersPanel.tsx:139` y `:196` | No | Descubrimiento del sistema de capas |
| `camera_preset_used` | `CameraPresetsZone.tsx:34` | No | Descubrimiento del 3D |
| `filter_applied` | `FXPanel.tsx:121` (helper `toggleFx`) | No | Uso de FX |
| `artwork_exported` | 5 puntos, uno por formato (ver abajo) | No | **Valor entregado.** Export con éxito |
| `project_saved` | `src/hooks/useSaveLoad.ts:51` | **No** (a propósito) | Guardado `.dior` completado con éxito |
| `project_loaded` | `src/hooks/useSaveLoad.ts:78` | **No** (a propósito) | Carga de `.dior` con éxito. Única señal de retorno real que existe hoy |
| `welcome_modal` | `src/App.tsx:53` / `:74` / `:98` | Propio | Cómo sale la gente del modal de bienvenida |
| `session_depth` | `visibilitychange` + `pagehide`, registrados por `installAnalytics()` en `src/main.tsx` | Propio (`depthSent`) | Resumen de sesión al salir |

### `artwork_exported` — valores de `format`

Ocho valores, no cinco. **Las variantes se separan a propósito**: PNG y MP4
tienen cada uno dos formas de invocarse que colapsaban en la misma fila, y eso
cegaba justo lo que más interesa saber — si alguien usa la súper resolución, y
si alguien llega al export de animación.

| `format` | Qué es | Punto |
|---|---|---|
| `png` | Captura a tamaño de pantalla (upscale a píxeles de dispositivo) | `canvas/exportHandlers.ts:181` |
| `png_hq` | **Súper resolución ×2**: re-render real de la escena por el pipeline | `canvas/exportHandlers.ts:181` |
| `svg` | Vector sin comprimir | `canvas/exportHandlers.ts:476` |
| `svgz` | Vector comprimido | `canvas/exportHandlers.ts:476` |
| `mp4` | Vídeo grabado desde modo CINEMA | `canvas/exportHandlers.ts:572` |
| `mp4_animation` | Vídeo grabado desde modo ANIMACIÓN | `canvas/exportHandlers.ts:572` |
| `gif` | GIF animado | `canvas/gifHandler.ts:128` |
| `png_sequence` | ZIP con la secuencia de frames | `canvas/pngSequenceHandler.ts:89` |

Los nombres salen del propio código, no de una convención inventada:
`_nextPNGQuality` es `'device' | 'hq'` (`exportHandlers.ts:17`) y la variante de
vídeo la decide el parámetro `animation` de `exportAsMP4`. `svg`/`svgz` usan el
valor literal de `exportRequest`.

⚠️ **Una vez GA4 empiece a recoger un `png` mezclado, no se puede separar
retroactivamente.** Por eso la granularidad se decide antes de desplegar.

⚠️ **Se engancha en la rama de éxito de cada handler, NUNCA en `onFinish`.**
`onFinish()` se llama también cuando la exportación falla (`toBlob` devuelve
`null`, `catch`, escena vacía). Engancharlo ahí contaría todos los fallos como
exportaciones.

### El parámetro `layers`

Viaja en `artwork_exported` y en `session_depth`, y es el **número total de
capas del documento** en ese momento — no un índice, no "capas creadas a mano".
Un documento recién abierto reporta `layers: 1`.

Se mantiene al día desde `App.tsx:47` (efecto con dependencia `state.totalLayers`),
que llama a `analytics.layerCount()`. Ese setter **no emite evento**: solo
sincroniza el contador.

Hasta v3.16.0 el contador solo se escribía dentro de `layerAdded`, así que
cualquiera que no pulsara "añadir capa" exportaba con `layers: 0` — incluido
quien cargara un `.dior` de ocho capas. Un cero mentiroso que dentro de seis
meses se habría leído como "nadie usa capas".

`installAnalytics()` se llama **una sola vez**, en `src/main.tsx`, antes del
primer render.

### `welcome_modal` — valores de `action`

| Valor | Salida del modal |
|---|---|
| `load_example` | "Cargar escena de ejemplo" (`App.tsx:53`) |
| `restore_autosave` | "Continuar trabajo anterior" (`App.tsx:74`) |
| `dismissed` | Cierre normal: "Empezar a dibujar", X, o clic fuera (`App.tsx:98`) |

---

## Trampas conocidas al leer estos números

### `canvas_ready` y `mobile_blocked` comparten UN SOLO flag

En una sesión se emite **uno de los dos**, el primero que ocurra, y el otro ya
nunca. No es una optimización: `useIsMobile` es reactivo al `resize`
(`matchMedia`), así que un desktop que estrecha la ventana por debajo de 768px
cruzaría el gate. Con un flag por evento, esa persona aparecería dos veces en el
paso 1 del embudo y la tasa de activación saldría diluida.

Consecuencia al leer el dato: `canvas_ready + mobile_blocked` ≈ sesiones
totales, sin solapamiento.

### `mobile_blocked` mide ANCHO, no dispositivo

El gate es `window.innerWidth < 768`. Un desktop con la ventana estrecha cuenta
como bloqueado. Por eso el evento lleva `viewport_width`: **sin segmentar por
ese parámetro, el número no dice cuánta demanda móvil real se está rechazando.**

### Qué se deja fuera a propósito (y por qué)

Cuatro caminos existen en el código y **no** se instrumentan. Si algún día
alguien piensa "falta medir esto", que lea esto primero:

| Camino | Por qué queda fuera |
|---|---|
| `SET_CINEMATIC_TYPE` en `ControlsV2.tsx:85` | Es el **reset automático** al entrar en CINEMA por primera vez, no una elección del usuario. Instrumentarlo dispararía `camera_preset_used: forward` para todo el que entra en modo cine, y `forward` parecería un éxito arrollador que en realidad no eligió nadie |
| `TOGGLE_FX_MASTER` (`FXPanel.tsx` y `FXRow.tsx:109`) | Encender o apagar el bloque entero de FX no es aplicar un FX concreto. No hay `filter` que informar |
| `NEXT_LAYER` con `]` estando en la última capa | **Sí crea capa**, pero es una vía lateral con acción distinta (`useKeyboardShortcuts.ts:79`). El único punto común con `ADD_LAYER` sería el reducer, y meter efectos en una función pura es peor que perder esta vía. **Consecuencia: `layer_added` infracuenta ligeramente** — quien solo use `]` no aparece |
| El autosave periódico (`useAutoSave.ts`) | No es una acción del usuario |

**Toggles bidireccionales:** `TOGGLE_FX` enciende **y** apaga. El helper
`toggleFx` (`FXPanel.tsx:119-122`) solo emite al encender, leyendo el estado
previo (`if (!px[key])`). Apagar un FX no cuenta.

**Texto:** las piezas de texto van por `COMMIT_TEXT_SESSION`, no por
`ADD_SHAPE`, así que no pasan por el `handlePointerUp` del canvas. Se enganchan
aparte en `TextSessionPanel.tsx:53` y cuentan como `first_stroke` con
`tool: 'text'`. Sin esto, quien creara una pieza **solo con texto** no emitiría
`first_stroke` y contaría en GA4 como alguien que entró y no hizo nada: un
falso negativo en el paso más importante del embudo. La llamada replica la
guarda del reducer (contenido no vacío) para no contar confirmaciones vacías.

**`tool` nunca vale `'move'`:** mover no crea shape. Los valores posibles son
`'blob'`, `'brush'`, `'eraser'` y `'text'`.

---

### ⚠️ `project_saved` NO lleva flag `once` — punto de vigilancia

Es deliberado: guardar varias veces en una sesión es dato legítimo y queremos
verlo. La contrapartida es que **no hay red de seguridad**: cualquier doble
invocación de `handleSaveProject` se traduciría directamente en un
`project_saved` de más. Lo mismo aplica a `project_loaded`.

**No se detectó ningún camino de doble invocación en el código.** Se investigó
a fondo (2026-08-23): bubbling desde contenedores padre, las dos instancias de
`useSaveLoad`, los handlers de `DiActionButton` y su wrapper `EnhancedTooltip`,
React StrictMode, y llamadas desde efectos o desde el flujo de `MARK_CLEAN`.
Todo limpio.

**El incidente que motivó esta nota fueron dos guardados humanos, separados 95
segundos.** Los `.dior` llevan `Date.now()` en el nombre y los timestamps lo
zanjaron: no fue doble clic ni autorrepetición de teclado, sino que el usuario
pulsó, la app pareció colgada, esperó y volvió a pulsar. La causa raíz es falta
de feedback en la interfaz — ver `docs/ux-debt.md`.

**Cómo leerlo en GA4:** si aparecen guardados repetidos en ventanas cortas, la
hipótesis principal **NO es un bug de código**: es que el usuario no sabe si
guardó. Mirar la UX antes que el código.

---

## Marcar tu navegador como tráfico interno

Abre **una vez** en cada navegador que quieras excluir:

```
https://diorame.dumaker.com/?internal=1
```

El parámetro escribe un flag `diorame_internal` en `localStorage` y a partir de
ahí **persiste sin el parámetro**. Desde ese momento cada evento lleva
`traffic_type: 'internal'`, y además se fija como user property de GA4.

Para desactivarlo: `?internal=0`.

**Confirmación visible.** Al cargar con el flag activo, la consola muestra:

```
[analytics] INTERNAL TRAFFIC — este navegador no cuenta como usuario real.
```

Sin ese aviso el flag sería invisible y no habría forma de saber si sigue
puesto.

### ⚠️ El flag es por CONTEXTO DE NAVEGADOR — ni por persona ni por dispositivo

`localStorage` está aislado por origen **y por contenedor de almacenamiento**.
Hay que activarlo **por separado** en cada uno:

- Chrome de escritorio
- Safari en el iPad
- **La PWA instalada en el iPad** — en iOS tiene contenedor de storage
  independiente del Safari que la instaló. Activarlo en Safari **no** lo
  activa en la PWA.

Y se pierde en cuanto se borren los datos del navegador, o en ventana privada.
Si borras datos, hay que volver a abrir la URL.

**Por qué en cliente y no por IP en GA4:** la IP doméstica es dinámica, el
filtro caduca solo y sin avisar, y en modo Activo descarta datos de forma
permanente e irreversible. El flag sobrevive a cambios de IP y no destruye
nada: en GA4 se segmenta por comparación cuando haga falta.

---

## Qué NO se mide, y por qué

- **Sesiones offline.** Diorame es una PWA que funciona sin red por diseño.
  Cuando no hay conexión, los eventos no salen y no hay forma barata de
  arreglarlo. Es una consecuencia conocida de la arquitectura, **no un fallo de
  instrumentación**: no interpretar una caída de números como un bug.
- **En desarrollo no se envía nada.** El módulo loguea en consola con el prefijo
  `[analytics]` pero `canSend()` devuelve `false` mientras `import.meta.env.DEV`
  sea true. Para enviar de verdad desde local haría falta `VITE_GA_DEBUG=1`.
- **Bloqueadores de anuncios.** Si `window.gtag` no existe, el módulo no envía y
  no lanza. Esas sesiones son invisibles.
- **Nada personal.** Ni texto del usuario, ni nombres de archivo, ni contenido
  del dibujo. Solo contadores y enumerados.
- **El autosave periódico** (`useAutoSave.ts`, IndexedDB cada 30s) **no se
  mide.** Ojo al interpretar `project_saved` bajo: puede que la gente no
  necesite guardar a mano porque el autosave ya le cubre.
- **`OnboardingOverlayV2`** no está instrumentado.
