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

Implementado (v3.15.x): la entrada del embudo, la persistencia y el modal de
bienvenida.

**Pendiente** (Fases 2 y 3 del brief): `first_stroke`, `stroke_milestone`,
`layer_added`, `camera_preset_used`, `filter_applied`, `artwork_exported`.
Están declarados en el contrato pero **todavía no hay ninguna llamada que los
dispare**. Si aparecen a cero en GA4, es por esto y no porque nadie dibuje.

---

## Eventos activos

| Evento | Dónde se dispara | Flag `once` | Qué mide |
|---|---|---|---|
| `canvas_ready` | `src/App.tsx:124` | **Compartido** con `mobile_blocked` | Paso 1 real del embudo: la app arrancó en un dispositivo compatible, con el canvas montado |
| `mobile_blocked` | `src/App.tsx:123` | **Compartido** con `canvas_ready` | Demanda rechazada por la pantalla de bloqueo |
| `project_saved` | `src/hooks/useSaveLoad.ts:51` | **No** (a propósito) | Guardado `.dior` completado con éxito |
| `project_loaded` | `src/hooks/useSaveLoad.ts:78` | **No** (a propósito) | Carga de `.dior` con éxito. Única señal de retorno real que existe hoy |
| `welcome_modal` | `src/App.tsx:53` / `:74` / `:98` | Propio | Cómo sale la gente del modal de bienvenida |
| `session_depth` | `visibilitychange` + `pagehide`, registrados por `installAnalytics()` en `src/main.tsx` | Propio (`depthSent`) | Resumen de sesión al salir |

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

### ⚠️ `project_saved` NO lleva flag `once` — punto de vigilancia

Es deliberado: guardar varias veces en una sesión es dato legítimo y queremos
verlo. La contrapartida es que **no hay red de seguridad**: cualquier doble
invocación de `handleSaveProject` se traduce directamente en un `project_saved`
de más, y la métrica de persistencia se infla sin dejar rastro visible.

Lo mismo aplica a `project_loaded`.

**Riesgo real, no hipotético.** A fecha de 2026-08-23 hay un bug reportado en
navegador real: al guardar un `.dior` aparecieron dos diálogos de guardado y el
proyecto se guardó dos veces. `useKeyboardShortcuts.ts` no filtra `e.repeat`, y
ni el hook ni `useSaveLoad.ts` tienen guard de "guardado en curso": mantener
`Ctrl+S` pulsado emite `keydown` repetidos y cada uno lanza una descarga.

**Cómo vigilarlo en GA4:** si `project_saved` por sesión sale sistemáticamente
en números pares, o si su ratio contra sesiones con trazos parece demasiado
bueno, sospechar de doble invocación antes de celebrar. Un test sintético (un
`keydown` programático) **no** reproduce el key-repeat del teclado real.

---

## Marcar tu navegador como tráfico interno

*Pendiente — Fase 3b del brief. Todavía no implementado.*

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
