# BACKLOG — Diorame

> Deuda técnica consolidada. Items organizados por urgencia.
> **Actualizado:** 2026-05-17 — Post Fase 7.5 (Modal System V2).
> Para contexto de Fase 7.5, ver `src/REFERENCE.md → Phase 7.5 — Modal System (V2)`.

---

## 🚨 Pre-Fase 8 (Bloqueante)

Items que deben resolverse ANTES del cutover de integración (Fase 8). Si quedan sin hacer, la sustitución legacy → V2 puede producir stacking, comportamiento o tipado incorrecto.

---

### [Item 1] Z-index cohabitación durante cutover

- **Descripción**: Durante Fase 8, si algún componente legacy queda visible mientras el V2 ya está integrado, el stacking será incorrecto: los V2 tienen `z-index` 800–1000 (tokens `Z_INDEX.*`) mientras los legacy usan Tailwind `z-[100]` o `z-[60]`. El cutover debe ser **atómico por componente** — sustitución completa de cada modal antes de pasar al siguiente. No activar V2 y dejar legacy activo simultáneamente.
- **Archivos afectados**:
  - `src/components/strata/WelcomeModal.tsx` (legacy) — `z-[100]`
  - `src/components/strata/ControlsExport.tsx` (legacy) — `z-[100]`
  - `src/components/strata/ExportProgress.tsx` (legacy) — `z-[60]`
  - `src/components/strata/OnboardingOverlay.tsx` (legacy)
  - `src/components/strata/MobileBlockScreen.tsx` (legacy)
- **Riesgo**: medium
- **Origen**: Sub-fase 7.5.0 (descubierto al introducir la escala `Z_INDEX`)

---

### [Item 2] Añadir iconos faltantes a ICONS

- **Descripción**: Tres iconos semánticamente correctos para componentes V2 **no existen** en `src/design-system/icons.ts`. Se usaron fallbacks funcionales: `record` (mp4 en lugar de `video`), `export` (svg en lugar de `code`), `duplicate` (capas en lugar de `layers`). Para Fase 8, extraer los SVG paths originales del archivo fuente de iconos y añadir las entradas `video`, `code` y `layers`. **No inventar paths** — extraer del SVG fuente o de la misma fuente de diseño donde viven el resto de iconos.
- **Archivos afectados**:
  - `src/design-system/icons.ts` — añadir entradas `video`, `code`, `layers`
  - `src/components/strata/modals/ExportProgressV2.tsx` — actualizar `EXPORT_CONFIG` (`record` → `video`, `export` → `code`)
  - `src/components/strata/modals/OnboardingOverlayV2.tsx` — actualizar `VIEW_CARDS[0]` y `DRAW_CARDS[2]` con el icono correcto si corresponde
- **Riesgo**: low
- **Origen**: Sub-fases 7.5.5 (iconos de export) y 7.5.6 (icono Layers en onboarding)

---

## 🧹 Fase 9 (Cleanup post-merge)

Items que pueden esperar al post-merge de Fase 8. No bloquean el cutover pero mejoran mantenibilidad, consistencia o corrigen deuda acumulada.

---

### [Item 3] Migrar `T.shadow` y `T.shadowStrong` al objeto `SHADOW`

- **Descripción**: Los tokens `T.shadow` y `T.shadowStrong` permanecen en el objeto `T` como strings de shadow light-mode sin variante dark. En 7.5.0 se creó el objeto `SHADOW` para shadows con variantes `modal` / `modalDark`. Por coherencia: mover `T.shadow` → `SHADOW.pill` y `T.shadowStrong` → `SHADOW.panel` (cada uno con su variante `*Dark`), y refactorizar `DiPill.tsx` y `DiPanel.tsx` para consumir `SHADOW.*`. Esto también resuelve la ausencia de dark mode en las shadows de estos componentes.
- **Archivos afectados**:
  - `src/design-system/tokens.ts` — añadir `SHADOW.pill`, `SHADOW.pillDark`, `SHADOW.panel`, `SHADOW.panelDark`; deprecar `T.shadow`, `T.shadowStrong`
  - `src/design-system/DiPill.tsx` — consumir `SHADOW.pill`
  - `src/design-system/DiPanel.tsx` — consumir `SHADOW.panel`
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.0 (identificado al crear `SHADOW.modal`)

---

### [Item 4] Rename interno de `ToolType`: `'brush'` → `'blob'`, `'line'` → `'brush'`

- **Descripción**: El tipo interno `ToolType = 'brush' | 'eraser' | 'text' | 'move' | 'line'` tiene nomenclatura invertida respecto a la UI: el valor `'brush'` corresponde al tool **Blob** (UI), y el valor `'line'` corresponde al tool **Brush** (UI). Rename global: `'brush'` → `'blob'`, `'line'` → `'brush'`. Requiere actualización en todos los sitios que comparan o asignan `tool`. **Cuidado con la persistencia**: los proyectos `.dior` guardados serializan el tool activo — añadir un paso de migración en `LOAD_PROJECT` que traduzca los valores antiguos.
- **Archivos afectados**:
  - `src/types/strataTypes.ts` — `ToolType`
  - `src/components/strata/StrataContext.tsx` — reducer, estado inicial
  - `src/components/strata/StrataCanvas.tsx` — handlers de tool (muchos sitios)
  - `src/components/strata/bottombar/DrawingToolbar.tsx`
  - `src/components/strata/ControlsDrawing.tsx`
  - Cualquier componente que compare `state.tool`
- **Riesgo**: high
- **Origen**: Backlog heredado (pre-Fase 7.5)

---

### [Item 5] Hex hardcodeados en `MobileBlockScreenV2`

- **Descripción**: `MobileBlockScreenV2` inyecta un bloque `<style>` con 6 hex literals para temas light/dark via `@media (prefers-color-scheme: dark)`. Esto es necesario hoy porque el componente se renderiza ANTES del `ThemeProvider` y no puede consumir `T` dinámicamente. Si en el futuro se introduce un sistema de CSS variables globales definidas en `:root` desde `tokens.ts` (e.g. al arrancar la app), migrar los 6 literals a esas variables. La migración es un cambio de 6 líneas en el `THEME_CSS` del componente.
- **Archivos afectados**:
  - `src/components/strata/modals/MobileBlockScreenV2.tsx` — bloque `THEME_CSS`
  - `src/design-system/tokens.ts` — si se introduce el sistema de CSS vars globales
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.7

---

### [Item 6] Focus trap activo en variant `banner` de `DiModal`

- **Descripción**: `useModalBehavior.ts` aplica focus trap (Tab cycling) para todas las variants, incluyendo `banner`. La corrección de 7.5.5.1 añadió `|| variant === 'banner'` a los guards de scroll lock y ESC, pero **no al focus trap** (líneas 65–86). No produce efecto observable hoy porque `ExportProgressV2` no tiene elementos focusables. Si en el futuro un banner incluye elementos interactivos (botón de cancel, link), el focus trap se activará inesperadamente. Resolución: añadir `|| variant === 'banner'` al guard del focus trap en `useModalBehavior.ts`.
- **Archivos afectados**:
  - `src/components/strata/modals/useModalBehavior.ts` — líneas 65–66
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.5.1

---

### [Item 7] Primitivo `DiActionButton` para micro-botones del LayersPanel

- **Descripción**: Los botones de acción del LayersPanel v2 (añadir capa, duplicar, eliminar, mover) son botones inline sin primitivo compartido. Estandarizar con un primitivo `DiActionButton` mejoraría consistencia visual y facilitaría theming. Item opcional — la UX actual funciona correctamente.
- **Archivos afectados**:
  - `src/components/strata/layers/LayersPanel.tsx`
  - `src/components/strata/layers/LayerRow.tsx`
  - Nuevo archivo: `src/design-system/DiActionButton.tsx` (a crear)
- **Riesgo**: low
- **Origen**: Backlog heredado (pre-Fase 7.5)

---

### [Item 8] Extracción del render loop y gestos de `StrataCanvas.tsx`

- **Descripción**: `StrataCanvas.tsx` (~2143 líneas) es un archivo monolítico que contiene: render loop, gestión de eventos de puntero/touch, proyección 3D, y lógica de herramientas. Candidates de extracción: render loop → `useRenderLoop.ts`, gestures/touch → `useCanvasGestures.ts`, proyección 3D → `projection3d.ts`. Cada extracción debe seguir el patrón documentado en CLAUDE.md (identificar bloque autocontenido → nuevo archivo → importar → verificar comportamiento idéntico → comentario de una línea). **Riesgo HIGH**: cualquier error introduce regresiones en el flujo de dibujo principal.
- **Archivos afectados**:
  - `src/components/strata/StrataCanvas.tsx` — extracción incremental
  - Nuevos archivos en `src/components/strata/hooks/` o `src/components/strata/canvas/`
- **Riesgo**: high
- **Origen**: Backlog heredado (pre-Fase 7.5)

---

## 📦 Out of scope (Anotado, sin fecha)

Items identificados y conscientemente diferidos. Pueden no abordarse en el ciclo actual o esperar a una versión muy posterior. Se registran para no perder el contexto.

---

### [Item 9] Unificar tipo `Layer` en `src/types/strataTypes.ts`

- **Descripción**: El tipo `Layer` tiene variantes locales en distintos componentes. Unificar en una sola estructura coherente en `strataTypes.ts`, eliminando las definiciones locales redundantes. Medium risk por la cantidad de sitios afectados.
- **Archivos afectados**:
  - `src/types/strataTypes.ts`
  - `src/components/strata/StrataContext.tsx`
  - Componentes con definiciones locales de Layer
- **Riesgo**: medium
- **Origen**: Backlog heredado (pre-Fase 7.5, Phase 4.3 del handoff original)

---

### [Item 10] Lanzamiento en redes sociales (Instagram / X)

- **Descripción**: No es deuda técnica — es deuda de producto/marketing. Lanzar perfiles con 3–5 piezas showcase de Diorame: timelapses de dibujo, parallax loops, narrativas de proceso. Bloqueado hasta tener material visual suficiente. No bloquea ningún desarrollo.
- **Archivos afectados**: ninguno (decisión de producto)
- **Riesgo**: n/a
- **Origen**: Backlog heredado (pre-Fase 7.5)

---

### [Item 11] Progreso real en `ExportProgressV2` (reemplazar simulación asymptótica)

- **Descripción**: `ExportProgressV2` usa progreso simulado (`p += (100 − p) × 0.02` cada 50ms). Conectar con progreso real requiere instrumentar `exportHandlers.ts` con emisión de eventos durante el render (MP4: por frame capturado; SVG: por capa procesada). Refactor mayor en la capa de export. La UX actual con simulación es aceptable para la mayoría de casos de uso.
- **Archivos afectados**:
  - `src/components/strata/canvas/exportHandlers.ts`
  - `src/components/strata/modals/ExportProgressV2.tsx`
- **Riesgo**: medium
- **Origen**: Sub-fase 7.5.5

---

### [Item 12] Cancelación de export en curso (MP4)

- **Descripción**: No existe forma de cancelar un export en curso. Para MP4, implementar cancel implica abortar `MediaRecorder` y limpiar el estado de grabación. Para PNG/SVG el tiempo es suficientemente corto como para que no sea necesario. Decisión cerrada en 7.5.5: out of scope. Anotado por si el comportamiento cambia con escenas más complejas.
- **Archivos afectados**:
  - `src/components/strata/canvas/exportHandlers.ts`
  - `src/components/strata/modals/ExportProgressV2.tsx`
- **Riesgo**: medium
- **Origen**: Sub-fase 7.5.5

---

### [Item 13] Proceso de versionado de ilustración del WelcomeModal

- **Descripción**: `WelcomeModalV2` usa `welcomeIllustrations.ts` que mapea versión → asset (`"1.15" → "v1-15.png"`). Para `v1.16+`, el proceso es: (1) crear ilustración 320×600px, (2) colocarla en `public/welcome-illustrations/v1-16.png`, (3) añadir entrada al mapeo, (4) bump `APP_VERSION` en `src/constants/version.ts`. Anotado para que no se omita el paso de ilustración en futuros bumps de versión.
- **Archivos afectados**:
  - `public/welcome-illustrations/` — nuevo asset
  - `src/components/strata/modals/welcomeIllustrations.ts` — nueva entrada en el mapeo
  - `src/constants/version.ts` — bump de versión
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.3

---

## Notas

- Los items **Pre-Fase 8** son el input directo del checklist de Fase 8. Resolverlos en orden (Item 1 → Item 2) antes del primer cutover modal.
- Los items de **Riesgo: high** (Item 4, Item 8) requieren sesión propia con análisis exhaustivo antes de ejecutar. No combinar con otros cambios.
- Este archivo debe actualizarse al cierre de cada fase. Cuando un item se resuelve, moverlo a una sección `✅ Resuelto` con el hash del commit, o eliminarlo si el contexto ya no es relevante.
