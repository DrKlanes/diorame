# Brief para Claude Code · Instrumentación de analítica en Diorame

> **Versión 2 — corregida.** Sustituye cualquier versión anterior de este archivo.
> Los cambios respecto a la v1 están marcados con 🔺 y son obligatorios.

---

## Contexto

Diorame (React 18 + TypeScript + Vite, repo `DrKlanes/diorame`, producción en
diorame.dumaker.com) tiene Google Analytics 4 instalado y funcionando, pero
**solo registra los eventos automáticos de GA4** (`page_view`, `scroll`,
`session_start`, `first_visit`, `user_engagement`, `click`). Cero eventos
personalizados.

Consecuencia: en 28 días sabemos que entraron 176 personas y que el 96 % eran
nuevas, pero **no sabemos si alguien llegó a dibujar un solo trazo**. Para una
app de dibujo eso es no medir nada.

**Datos de la propiedad GA4 (ya verificados, no hay que buscarlos):**

- Measurement ID: `G-8812T7T7G9`
- Google Tag ID: `GT-TNSGZ9MT`
- Estado de la etiqueta según GA4: *"Excelente, sin problemas detectados"*

## Objetivo

Instrumentar el embudo real del producto:

```
app arranca  →  dibuja  →  usa capas  →  exporta  →  guarda / vuelve
```

Al terminar, GA4 tiene que poder responder: *de cada 100 personas que abren
Diorame en un dispositivo compatible, ¿cuántas dibujan algo, cuántas se llevan
un resultado y cuántas guardan el proyecto?*

---

## Restricciones duras

1. **No tocar la lógica de dibujo.** Solo se añaden llamadas. Ni una línea de
   geometría, render o gestión de capas cambia de comportamiento.
2. **Coste cero en el hot path.** `analytics.strokeEnded()` se llama al
   **finalizar** un trazo (pointerup / cierre de path), **jamás** en
   `pointermove`, `requestAnimationFrame` ni en el bucle de render.
3. **Nada de estado React para los contadores.** El módulo lleva estado mutable
   a nivel de módulo justamente para evitar re-renders del canvas. No lo
   conviertas en `useState` ni en contexto.
4. **La analítica nunca puede tumbar la app.** Ninguna llamada a `analytics.*`
   debe poder lanzar.
5. **No inventar eventos por tu cuenta.** El contrato es `DioramEventMap` en
   `analytics.ts`. 🔺 Este brief sí añade cuatro eventos nuevos, definidos
   explícitamente en la Fase 1b. Fuera de esos cuatro, no añadas ninguno más:
   propónmelo primero.
6. **Un commit por fase** (excepto Fase 0 y Fase 2, que son read-only), con la
   disciplina de commits del proyecto — ver sección final.

---

## 🔺 Fase 0 · Snapshot de estado (READ-ONLY, obligatoria)

**No edites nada en esta fase.** Devuélveme un informe con estos ocho puntos.
Este brief lo escribió alguien que no había visto el código; todo lo que sigue
depende de verificar primero estos supuestos.

| # | Qué verificar | Por qué importa |
|---|---|---|
| 1 | Versión actual (`package.json` + `src/version.ts`), último commit, y `git status` limpio o no | Punto de partida trazable |
| 2 | Contenido real del `ToolType` en `StrataContext.tsx` (o donde viva) — lista literal de valores | El brief v1 asumía `'brush' \| 'eraser' \| 'line'`. Puede estar desactualizado |
| 3 | Snippet de gtag.js en `index.html`: ¿existe?, ¿con qué ID?, ¿hay también GTM? | No duplicar etiqueta |
| 4 | **Estrategia del Service Worker frente a `google-analytics.com` y `googletagmanager.com`**: ¿hay algún catch-all, precache o fallback al app-shell que los intercepte? | Si el SW se los come, los eventos desaparecen sin error visible y todo este trabajo no sirve para nada |
| 5 | Alias de paths en `vite.config.ts` / `tsconfig.json` (`@/` u otro) | Para escribir los imports bien |
| 6 | ¿Existe guardado/carga de proyecto en JSON? ¿En qué archivo? | Evento nuevo `project_saved` / `project_loaded` |
| 7 | ¿Existe modal de bienvenida u onboarding? ¿Dónde? | Evento nuevo `welcome_modal` |
| 8 | ¿Dónde está la pantalla de bloqueo de móvil, y dónde el punto en que la app arranca de verdad (canvas montado, no bloqueo)? | Evento nuevo `app_ready` — ver Fase 1b |

**Párate aquí y enséñame el informe.** Si el punto 4 revela que el SW intercepta
las peticiones de Google, dímelo antes de seguir: eso se arregla primero.

---

## Fase 1 · Instalar el módulo

1. Crear `src/analytics/analytics.ts` con el contenido del archivo `analytics.ts`
   que ya está en el proyecto (o que te paso junto a este brief). Pégalo tal cual.

2. 🔺 **Antes de instalarlo, léelo y verifica dos cosas críticas:**
   - **No debe ejecutar `gtag('config', ...)` ni inyectar el script de gtag.js.**
     La etiqueta ya existe en `index.html` y GA4 la valida como correcta. Si el
     módulo la configura otra vez, tendremos `page_view` duplicados y todos los
     porcentajes del embudo mentirán desde el primer día. El módulo debe
     **consumir el `window.gtag` existente**, nada más. Si hace lo contrario,
     párate y dímelo.
   - **Debe degradar en silencio si `window.gtag` no existe** (bloqueadores de
     anuncios, modo offline). Nunca lanzar.

3. En `src/main.tsx` (o el punto de arranque real, localízalo), importar y
   llamar **una sola vez**:
   ```ts
   import { installAnalytics } from './analytics/analytics';
   installAnalytics();
   ```

4. 🔺 **Variables de entorno — corrección importante respecto a la v1.**
   Si el módulo lee `VITE_GA_MEASUREMENT_ID` como condición para enviar:
   - Va en **`.env` commiteado al repo**, NO en `.env.local`.
   - Motivo: `.env.local` está en `.gitignore`, no viaja al repo, y el build de
     producción lo hace GitHub Actions en un runner limpio. Allí la variable
     sería `undefined` y la analítica **funcionaría en local y moriría en
     producción, en silencio**.
   - El Measurement ID no es un secreto: ya está en texto plano en el
     `index.html` público. Commitearlo es correcto.
   ```
   VITE_GA_MEASUREMENT_ID=G-8812T7T7G9
   VITE_GA_DEBUG=0
   ```
   Si el módulo **no** usa esa variable, no crees el archivo: dímelo y seguimos.

5. `npm run build` limpio, sin errores de TypeScript.

**Entregable:** el módulo compila, `installAnalytics()` se ejecuta al arrancar,
y confirmación explícita de los dos puntos del apartado 2.

---

## 🔺 Fase 1b · Extender el contrato de eventos

Añade estos cuatro eventos al `DioramEventMap` y su método correspondiente,
siguiendo exactamente el patrón que ya use el módulo (mismo estilo de firma,
mismo try/catch, mismo naming en snake_case para GA4).

| Evento | Cuándo se dispara | Por qué |
|---|---|---|
| `app_ready` | Cuando la app arranca **de verdad** en un dispositivo compatible (canvas montado y operativo), NO cuando se muestra la pantalla de bloqueo de móvil | Diorame bloquea móvil por diseño. Si el embudo arranca en `session_start`, el ~19 % de tráfico móvil entra como "gente que no dibujó" y hunde artificialmente la tasa de activación. `app_ready` es el paso 1 real del embudo |
| `mobile_blocked` | Cuando se muestra la pantalla de bloqueo de móvil | Mide la demanda móvil real que se está rechazando. Dato de producto, no de vanidad |
| `project_saved` | Al guardar proyecto en JSON, tras completarse con éxito | Diorame **sí** tiene persistencia. Lo que no sabemos es si alguien la usa. Si nadie guarda, el problema es que el guardado es invisible → se arregla con UX, no con arquitectura |
| `project_loaded` | Al cargar un JSON con éxito | Es la única señal de retorno real que existe hoy |

Y uno más si el punto 7 de la Fase 0 confirma que existe modal de bienvenida:

| `welcome_modal` | Al cerrar el modal, con parámetro `action: 'completed' \| 'dismissed'` | Sustituye al `onboardingStep` genérico del brief v1 |

**Sin datos personales, sin nombres de archivo, sin contenido del dibujo.** Solo
contadores y enumerados.

**Entregable:** diff del módulo. Commit propio.

---

## Fase 2 · Localizar los puntos de enganche (READ-ONLY)

**No adivines nombres de funciones. Búscalos.** Devuélveme una tabla con
`archivo:línea` para cada punto:

| # | Qué buscar | Llamada |
|---|---|---|
| 1 | Donde termina un trazo: handler de `pointerup` sobre el canvas, o donde el path en curso se confirma y se añade a la capa | `analytics.strokeEnded(toolId)` |
| 2 | Donde se crea/añade una capa nueva | `analytics.layerAdded(totalTrasAñadir)` |
| 3 | Donde se aplica un preset de cámara | `analytics.cameraPreset(presetId)` |
| 4 | Donde se aplica un filtro / efecto FX | `analytics.filterApplied(fxId)` |
| 5 | Donde la exportación **termina con éxito** (después del `await`/callback, no al pulsar el botón) | `analytics.exported(formato)` |
| 6 | Guardado y carga de JSON | `project_saved` / `project_loaded` |
| 7 | Arranque real de la app y pantalla de bloqueo móvil | `app_ready` / `mobile_blocked` |
| 8 | Cierre del modal de bienvenida, si existe | `welcome_modal` |

Si algún punto **no existe**, dilo explícitamente y sáltalo. **No crees
funcionalidad nueva para poder medirla.**

Atención especial al punto 1: si el trazo se confirma en más de un sitio (ratón,
táctil, Apple Pencil), engancha el punto **común** donde convergen, no los tres
por separado — si no, contarías el triple.

🔺 **Aviso de zona sensible.** El final de trazo vive en el núcleo de
`StrataCanvas.tsx` (pointer handlers / live stroke). La regla del proyecto es
clara: ahí solo se **añade una línea al final del handler existente**. Si tu
propuesta implica reordenar, envolver o cambiar el timing de ese handler,
**párate y dímelo** — eso requiere aprobación explícita, no se ejecuta dentro de
esta fase.

**Entregable:** la tabla con rutas y líneas reales. **Párate aquí.**

---

## Fase 3 · Enganchar

1. Insertar las llamadas en los puntos aprobados en la Fase 2.
2. Usar el alias de paths real detectado en la Fase 0.
3. 🔺 Para el `toolId` de `strokeEnded`: usa **el valor literal del `ToolType`
   verificado en la Fase 0**, sin traducir ni mapear a mano. No uses la lista
   que aparecía en el brief v1 — estaba desactualizada.
4. Envolver en `try/catch` cualquier llamada cuyo parámetro se calcule de forma
   que pueda fallar (p. ej. leer `layers.length` sobre algo posiblemente
   `undefined`).

**Entregable:** diff completo agrupado por archivo. Commit propio.

---

## 🔺 Fase 3b · Marcar el navegador de Moisés como tráfico interno

En vez de filtrar por IP en GA4 (la IP doméstica es dinámica; el filtro caduca
solo y sin avisar, y en modo Activo descarta datos de forma permanente e
irreversible), lo hacemos en cliente:

1. Si existe un flag `diorame_internal` en `localStorage`, el módulo envía una
   user property `traffic_type: 'internal'` en cada evento.
2. Exponer una forma trivial de activarlo — por ejemplo, que un parámetro
   `?internal=1` en la URL escriba el flag y luego el flag persista.
3. Documentar en `docs/analytics.md` cómo se activa.

Ventaja: sobrevive a cambios de IP, no destruye datos, y en GA4 se filtra por
comparación cuando haga falta.

**Entregable:** diff + la URL exacta que Moisés tiene que abrir una vez en su
navegador. Puede ir en el mismo commit que la Fase 3.

---

## Fase 4 · Verificación (obligatoria)

1. `npm run build` limpio.
2. `npm run dev`: confirmar en consola los logs `[analytics] ...` al usar la app.
   En dev el módulo **loguea pero no envía** — eso es lo correcto.
3. **Duplicados:** dibujar exactamente 3 trazos → **un solo** `first_stroke`.
4. **Rendimiento:** dibujar un trazo largo y continuo → **ni un solo log durante
   el movimiento**, solo al soltar.
5. **Evento de salida:** cambiar de pestaña → **un** `session_depth`.
6. 🔺 **Verificación del Service Worker (build de producción, no dev):**
   `npm run build && npm run preview`, abrir la pestaña Network del navegador,
   filtrar por `google-analytics`, y confirmar que las peticiones **salen a la
   red** y no las sirve el Service Worker desde caché. Si el SW las intercepta,
   párate: hay que excluir esos dominios de su scope antes de desplegar.
7. 🔺 **Verificación de móvil:** simular viewport móvil → debe dispararse
   `mobile_blocked` y **NO** `app_ready`.
8. Escribir `docs/analytics.md`: tabla evento → dónde se dispara
   (`archivo:línea`) + cómo activar el flag de tráfico interno. Esto es para que
   dentro de seis meses sepamos qué significa cada número en GA4.

**Entregable:** checklist de los 8 puntos con resultado real, no supuesto.

---

## 🔺 Disciplina de commits del proyecto

Cada commit de este trabajo debe incluir, sin excepción:

- Version bump en `package.json` **y** en `src/version.ts`.
- Tag correspondiente.
- Línea explícita en el mensaje: `REFERENCE.md §10 sync: updated` — este trabajo
  crea `src/analytics/` y `docs/analytics.md`, dos entradas nuevas en el mapa de
  archivos. `§10` es la única fuente de verdad de ese mapa.
- Cierre del prompt con `git log` y `git status` limpio confirmados.
- **No hagas push sin que te lo pida.**

---

## Qué NO hacer

- No añadir librerías de analítica (`react-ga4`, PostHog, Plausible…). El módulo
  son ~300 líneas sin dependencias y eso es una feature, no una carencia.
- No enviar datos personales, texto del usuario, nombres de archivo ni contenido
  del dibujo.
- No meter `analytics.*` dentro de un `useEffect` con dependencias del canvas: se
  dispararía en cada re-render.
- No tocar la configuración de GA4 desde código (`gtag('config', ...)`). Los
  eventos clave y los filtros se configuran en la interfaz de GA4.
- No convertir los contadores en estado de React.

---

## Nota final sobre el alcance de la medición

Diorame es una PWA que funciona offline por diseño. **Las sesiones offline no se
miden y no hay forma barata de arreglarlo.** No es un bug del código: es una
consecuencia conocida de la arquitectura. Queda documentado aquí para que dentro
de seis meses nadie interprete una caída de números como un fallo de
instrumentación.
