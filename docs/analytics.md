# Analítica de Diorame — qué mide cada número

Documento vivo. Existe para que dentro de seis meses se sepa qué significa
exactamente cada evento, y qué NO significa.

- **Herramienta (v3.26.108):** GoatCounter alojado, cuenta `diorame`
  (<https://diorame.goatcounter.com>). **Sin cookies y sin escribir nada en el
  navegador** (solo lee `localStorage.skipgc`). Google Analytics 4 se retiró por
  completo; sus datos históricos quedan en la propiedad `G-8812T7T7G9` y no se
  migran.
- **Carga:** la hace `src/analytics/transport.ts`, no `index.html`:
  `https://gc.zgo.at/count.v5.js` con `integrity` (SRI) y `crossorigin`, mismo
  enfoque y mismo hash que `landing/assets/analytics.js`. **Solo en el hostname
  `diorame.dumaker.com`** y nunca con tráfico interno. En cualquier otro host:
  **modo consola** (`[analytics] modo consola · …`), sin red.
- **Única puerta:** los componentes llaman a `analytics.*`
  (`src/analytics/analytics.ts`). El contrato de eventos es `DioramEventMap`
  (`events.ts`) y la traducción a GoatCounter, `eventNames.ts`.
- **Por qué existe cada evento:** ver `docs/BRIEF-CLAUDE-CODE.md` (histórico,
  escrito para GA4).

---

## Qué llega a GoatCounter

GoatCounter no admite parámetros: un evento es solo un nombre,
`app_<evento>[/<parámetro clave>]`. El resto de parámetros se queda en la app.

| Nombre en GoatCounter | Parámetro del nombre | Parámetros que ya no se miden |
|---|---|---|
| `app_canvas_ready` | — | — |
| `app_mobile_blocked` | — | `viewport_width` (GoatCounter ya guarda el tamaño de pantalla) |
| `app_first_stroke/<tool>` | `blob`, `brush`, `eraser`, `text` | `seconds_to_first_stroke` |
| `app_stroke_milestone/<strokes>` | `10`, `50`, `200` | `tool` |
| `app_layer_added` | — | `layer_count` |
| `app_camera_preset_used/<preset>` | preset de cámara | — |
| `app_filter_applied/<filter>` | FX | — |
| `app_artwork_exported/<format>` | los 12 valores de abajo | `strokes`, `layers`, `mode`, `background` |
| `app_project_saved` | — | — |
| `app_project_loaded` | — | — |
| `app_welcome_modal/<action>` | `load_example`, `restore_autosave`, `dismissed` | — |
| `app_tour_video/<action>` | `shown`, `played` | — |
| `app_layers_tooltip_shown` | — | `shapes_at_trigger`, `seconds_at_trigger` |
| `app_layers_tooltip_dismissed/<method>` | `layer_added`, `timeout`, `close_button`, `click_outside` | — |
| `app_mobile_link_shared` · `app_mobile_link_copied` · `app_mobile_video_opened` · `app_mobile_landing_opened` | — | `lang` (GoatCounter ya guarda el idioma) |
| `app_exception/<fatal o error>/<clase>` | gravedad y clase (`TypeError`…, u `other`) | `description`, versión, modo, herramienta, dispositivo, PWA |
| `app_session_depth/<reached>` | `bounced`, `drew`, `exported` | `strokes`, `layers`, `exported`, `seconds` |

**Descartados:** `mobile_gate_shown` (sin `lang` duplica a `app_mobile_blocked`;
`analytics.mobileGateShown` sigue existiendo y no envía) y `share_clicked`,
`onboarding_step`, `ui_error` (nunca tuvieron llamador; borrados del contrato).

**Nada personal en los nombres:** solo llegan enumerados de la app. De un error
viaja su clase si está en una lista cerrada; nunca el mensaje, la pila ni
nombres de archivo (`tests/analyticsNames.test.ts`).

**Lo que envía además `count.js` en cada hit:** ruta (`/`, fijada sin query),
referrer (solo en la vista; vacío en los eventos), título, tamaño de pantalla,
marca de bot y la query de la URL (parámetros de campaña `utm_*`). El servidor
ve IP y User-Agent, como cualquier servidor web.

**Cómo leerlo:** GoatCounter cuenta por defecto **visitas**: un mismo nombre
repetido en la misma sesión (varias capas, varios exports PNG) suma una vez.
Los números son «sesiones que hicieron X», no «veces que se hizo X».

---

## Disparadores dentro de la app

Los nombres de esta sección son los internos (`DioramEventMap`) y sus parámetros; lo que se envía está en la tabla de arriba.

| Evento | Dónde se dispara | Flag `once` | Qué mide |
|---|---|---|---|
| `canvas_ready` | `src/App.tsx:124` | **Compartido** con `mobile_blocked` | Paso 1 real del embudo: la app arrancó en un dispositivo compatible, con el canvas montado |
| `mobile_blocked` | `src/App.tsx:123` | **Compartido** con `canvas_ready` | Demanda rechazada por la pantalla de bloqueo |
| `first_stroke` | `StrataCanvas.tsx:1218` (dibujo) · `TextSessionPanel.tsx:53` (texto) | Propio (`firstStrokeSent`) | **Activación real.** Primer trazo de la sesión |
| `stroke_milestone` | mismos puntos | Uno por hito | Profundidad de uso: 10, 50, 200 trazos |
| `layer_added` | `LayersPanel.tsx:139` y `:196` | No | Descubrimiento del sistema de capas |
| `camera_preset_used` | `CameraPresetsZone.tsx:34` | No | Descubrimiento del 3D |
| `filter_applied` | `FXPanel.tsx:121` (helper `toggleFx`) | No | Uso de FX |
| `artwork_exported` | un punto por handler de export (ver abajo) | No | **Valor entregado.** Export con éxito |
| `project_saved` | `src/hooks/useSaveLoad.ts:78` | **No** (a propósito) | Guardado `.dior` completado con éxito |
| `project_loaded` | `src/hooks/useSaveLoad.ts:127` | **No** (a propósito) | Carga de `.dior` con éxito. Única señal de retorno real que existe hoy |
| `welcome_modal` | `src/App.tsx:53` / `:74` / `:98` | Propio | Cómo sale la gente del modal de bienvenida |
| `tour_video` | `src/components/strata/modals/TourModalV2.tsx` (`shown` al abrir, `played` al pulsar play) | Propio | Solo usuario nuevo, una vez en la vida. `shown` sin `played` = cierre sin ver el vídeo |
| `mobile_gate_shown` | `MobileBlockScreenV2.tsx` (efecto de montaje) | Propio (`mobileGateShownSent`) | Pantalla de bloqueo móvil mostrada (v3.26.0). Param `lang`. `mobile_blocked` sigue siendo el paso 1 del embudo |
| `mobile_link_shared` | `MobileBlockScreenV2.tsx` | No | «Envíame el enlace» con panel nativo de compartir completado (AbortError no cuenta) |
| `mobile_link_copied` | `MobileBlockScreenV2.tsx` | No | Sin Web Share, o falló: el enlace acabó en el portapapeles |
| `mobile_video_opened` | `MobileBlockScreenV2.tsx` | No | Pulsó «Ver cómo funciona» (vídeo de presentación en su idioma) |
| `mobile_landing_opened` | `MobileBlockScreenV2.tsx` | No | Pulsó «Conocer Diorame» (diorame.com/es|en) |
| `layers_tooltip_shown` | `hooks/useLayersDiscoveryTooltip.ts` | Propio | Se mostró el tooltip de descubrimiento de capas (primera sesión real, dibujando sin haber añadido capa). Params `shapes_at_trigger`, `seconds_at_trigger`. Cruzar con `layer_added` de la misma sesión |
| `layers_tooltip_dismissed` | `hooks/useLayersDiscoveryTooltip.ts` | Propio | Cierre del tooltip. `method`: `layer_added` (conversión), `timeout` (indiferencia), `close_button` (rechazo activo), `click_outside` |
| `exception` | `window` `error` + `unhandledrejection`, registrados por `installAnalytics()` (`src/analytics/errors.ts`) | Dedupe por firma (mensaje + archivo + línea) y tope de 10 por sesión | Errores no controlados, en silencio. Parámetros: `description` (≤100 car., sin rutas ni query strings), `fatal` (false desde `window`; true desde el `AppErrorBoundary` raíz, v3.26.68: el error rompió el render y el usuario vio la pantalla «Algo ha fallado». En dev un error de render sale dos veces, false y true; en producción solo true), `app_version`, `mode` (`draw`/`cinema`), `tool`, `device_class` (`ipad`/`tablet`/`desktop`/`mobile`), `standalone` (`yes`/`no`). Descarta extensiones del navegador, `ResizeObserver loop`, `Script error.` opaco y scripts de terceros. Nunca lleva contenido del dibujo ni texto del usuario |
| `session_depth` | `visibilitychange` + `pagehide`, registrados por `installAnalytics()` en `src/main.tsx` | Propio (`depthSent`) | Resumen de sesión al salir |

### `artwork_exported` — valores de `format`

Doce valores (v3.25.19). **Las variantes se separan a propósito**: PNG y MP4
tienen cada uno dos formas de invocarse que colapsaban en la misma fila, y eso
cegaba justo lo que más interesa saber — si alguien usa la súper resolución, y
si alguien llega al export de animación.

| `format` | Qué es | Punto |
|---|---|---|
| `png` | Captura a tamaño de pantalla (CINEMA: upscale a píxeles de dispositivo; DRAW desde v3.17.66: re-render del encuadre visible, «Vista» desde v3.25.7). Distinguir por `mode` | `canvas/exportHandlers.ts:181` |
| `png_hq` | **Súper resolución ×2**: re-render real de la escena por el pipeline (CINEMA y, desde v3.17.66, DRAW; ver `mode`) | `canvas/exportHandlers.ts:181` |
| `png_format` | PNG de DRAW del marco de formato (A, 16:9, 4:3, 4:5, 1:1) a un tamaño de la lista, v3.25.7. Solo `mode: 'drawing'` | `canvas/exportHandlers.ts` |
| `png_drawing` | PNG de DRAW «Dibujo completo» (la tinta de las capas visibles), v3.25.9. Solo `mode: 'drawing'` | `canvas/exportHandlers.ts` |
| `png_layers_zip` | «Capas (ZIP)» de DRAW: un PNG transparente por capa, v3.25.11. `background` siempre `transparent` | `canvas/exportHandlers.ts` |
| `svg` | Vector sin comprimir | `canvas/exportHandlers.ts:476` |
| `svgz` | Vector comprimido | `canvas/exportHandlers.ts:476` |
| `mp4` | Vídeo grabado desde modo CINEMA | `canvas/exportHandlers.ts:572` |
| `mp4_animation` | Vídeo grabado desde modo ANIMACIÓN | `canvas/exportHandlers.ts:572` |
| `gif` | GIF animado | `canvas/gifHandler.ts:128` |
| `png_sequence` | ZIP con la secuencia de frames | `canvas/pngSequenceHandler.ts:89` |
| `timelapse` | Timelapse de DRAW en MP4 (v3.25.19), con `background` `paper`/`solid` | `canvas/timelapseExport.ts` |

**El encuadre y la salida no son parámetros nuevos: van dentro de `format`.** En DRAW, `png` / `png_hq` = Vista, `png_format` = Formato, `png_drawing` = Dibujo completo, `png_layers_zip` = Capas ZIP. El tamaño elegido (preset, lado largo) y el encuadre del timelapse (Formato / Vista / Dibujo completo), su duración y su ritmo **no se miden**. Los eventos anteriores a v3.25.7 no traen estos valores.

Los nombres salen del propio código, no de una convención inventada:
`_nextPNGQuality` es `'device' | 'hq'` (`exportHandlers.ts:17`) y la variante de
vídeo la decide el parámetro `animation` de `exportAsMP4`. `svg`/`svgz` usan el
valor literal de `exportRequest`.

⚠️ **Se engancha en la rama de éxito de cada handler, NUNCA en `onFinish`.**
`onFinish()` se llama también cuando la exportación falla (`toBlob` devuelve
`null`, `catch`, escena vacía). Engancharlo ahí contaría todos los fallos como
exportaciones.

`installAnalytics()` se llama **una sola vez**, en `src/main.tsx`, antes del
primer render.

### `welcome_modal` — valores de `action`

| Valor | Salida del modal |
|---|---|
| `load_example` | "Cargar escena de ejemplo" (`App.tsx:95`) |
| `restore_autosave` | "Continuar trabajo anterior" (`App.tsx:116`) |
| `dismissed` | Cierre normal: "Empezar a dibujar", X, o clic fuera (`App.tsx:128`) |

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
| `INIT_CINEMA_VIEW` en `ControlsV2.tsx` (antes `SET_CINEMATIC_TYPE`) | Es la **inicialización automática** al entrar en CINEMA (solo para un proyecto nuevo; un proyecto abierto trae su vista y `LOAD_PROJECT` rellena sus huecos, 3.20.11), no una elección del usuario. Instrumentarlo dispararía `camera_preset_used: forward` para todo el que entra en modo cine, y `forward` parecería un éxito arrollador que en realidad no eligió nadie |
| `TOGGLE_FX_MASTER` (`FXPanel.tsx` y `FXRow.tsx:109`) | Encender o apagar el bloque entero de FX no es aplicar un FX concreto. No hay `filter` que informar |
| `NEXT_LAYER` con `]` estando en la última capa | **Sí crea capa**, pero es una vía lateral con acción distinta (`useKeyboardShortcuts.ts:79`). El único punto común con `ADD_LAYER` sería el reducer, y meter efectos en una función pura es peor que perder esta vía. **Consecuencia: `layer_added` infracuenta ligeramente** — quien solo use `]` no aparece |
| El autosave (`useAutoSave.ts`: intervalo, debounce y volcado al ocultar) | No es una acción del usuario |

**Toggles bidireccionales:** `TOGGLE_FX` enciende **y** apaga. El helper
`toggleFx` (`FXPanel.tsx:119-122`) solo emite al encender, leyendo el estado
previo (`if (!px[key])`). Apagar un FX no cuenta.

**Texto:** las piezas de texto van por `COMMIT_TEXT_SESSION`, no por
`ADD_SHAPE`, así que no pasan por el `handlePointerUp` del canvas. Se enganchan
aparte en `TextSessionPanel.tsx:53` y cuentan como `first_stroke` con
`tool: 'text'`. Sin esto, quien creara una pieza **solo con texto** no emitiría
`first_stroke` y contaría como alguien que entró y no hizo nada: un
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

**Cómo leerlo:** si alguna vez aparecen guardados repetidos en ventanas cortas, la
hipótesis principal **NO es un bug de código**: es que el usuario no sabe si
guardó. Mirar la UX antes que el código.

---

## Marcar tu navegador como tráfico interno

Abre **una vez** en cada navegador que quieras excluir:

```
https://diorame.dumaker.com/?internal=1
```

Escribe `diorame_internal` y **`skipgc`** (la clave que consulta el filtro de
GoatCounter) en `localStorage` y **persiste sin el parámetro**. Un navegador
interno **no carga `count.js`**: no sale ninguna petición. Para desactivarlo:
`?internal=0` (borra las dos claves). La landing usa las mismas claves, pero en
su propio origen (`diorame.com`) y propaga `?internal=1` en sus enlaces a la app.

**Confirmación visible.** Al cargar con el flag activo, la consola muestra:

```
[analytics] INTERNAL TRAFFIC — este navegador no se cuenta.
```

Se excluye, no se etiqueta: esas sesiones no aparecen en ningún sitio.

### ⚠️ El flag es por CONTEXTO DE NAVEGADOR — ni por persona ni por dispositivo

`localStorage` está aislado por origen **y por contenedor de almacenamiento**.
Hay que activarlo **por separado** en cada uno:

- Chrome de escritorio
- Safari en el iPad
- **La PWA instalada en el iPad** — en iOS tiene contenedor de storage
  independiente del Safari que la instaló. Activarlo en Safari **no** lo
  activa en la PWA.

Y se pierde en cuanto se borren los datos del navegador, o en ventana privada.

---

## Privacidad y terceros (auditoría v3.26.108)

**Se carga solo desde otro dominio:** únicamente GoatCounter en producción:
`gc.zgo.at/count.v5.js` y `diorame.goatcounter.com/count`. Fuentes, iconos,
texturas, sonidos y vídeos (Welcome y tour) son propios. **La app no
incrusta nada de terceros** (sin iframes).

**Solo por acción del usuario:**

| Qué | Cuándo | Almacenamiento |
|---|---|---|
| Super Riso Lab, `super-riso.dumaker.com` (propio) | «Exportar › Super Riso ↗» (pestaña nueva) | Solo preferencias en `localStorage`; sin recursos de terceros. El dibujo viaja por `postMessage` dentro del navegador |
| Enlaces: YouTube (vídeo de presentación, solo en la pantalla móvil), Instagram, Ko-fi, App Store, Pixabay, diorame.com, `mailto:` | Clic | Navegación fuera de la app |

**Propio (sin consentimiento):** `localStorage` de preferencias y flags de «ya
visto», `diorame_internal`/`skipgc`, IndexedDB del autoguardado y la caché del
service worker. El alojamiento (GitHub Pages) registra IP como cualquier
servidor.

**Restos de GA4:** quien usó la app antes de v3.26.108 puede conservar cookies
`_ga*` en `.dumaker.com` hasta que caduquen; la app ya no las crea ni las lee.

Aviso visible: `modals/PrivacyNotice.tsx` (Welcome y pantalla de bloqueo móvil,
textos `modal.privacy.*`) y el pie de la landing.

---

## Qué NO se mide, y por qué

- **Sesiones offline.** Diorame es una PWA que funciona sin red. Sin conexión
  `count.js` no carga y los eventos se pierden: **no interpretar una caída de
  números como un bug**.
- **Fuera de producción no se envía nada.** Modo consola: `import.meta.env.DEV`
  o un host distinto de `diorame.dumaker.com` (incluido `vite preview`).
- **Bloqueadores.** Si `count.js` no carga, el módulo no envía y no lanza.
- **Nada personal.** Ni texto del usuario, ni nombres de archivo, ni contenido
  del dibujo.
- **El autosave** (`useAutoSave.ts`, IndexedDB: cada 30 s, 1,5 s tras el último
  cambio y al ocultar la página, desde 3.20.5) **no se mide.** Ojo al interpretar `project_saved` bajo: puede que la gente no
  necesite guardar a mano porque el autosave ya le cubre.
- **`OnboardingOverlayV2`** no está instrumentado.
