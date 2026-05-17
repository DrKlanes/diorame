# Diorame — Backlog técnico

**Actualizado:** 2026-05-17 — Post Fase 8 (cutover UI redesign V2 completo)

---

## ✅ Resuelto en Fase 8

| Item | Resolución |
|---|---|
| Z-index cohabitación durante cutover | Resuelto por atomicidad: cada sub-fase eliminó el legacy y activó el V2 en el mismo commit. Cero coexistencia. |
| Icono `layers` faltante | Resuelto en commit `bd6bbf7`: nuevo path SVG isométrico añadido a `icons.ts`, integrado en OnboardingOverlayV2 reemplazando fallback `duplicate`. |
| Iconos `video` y `code` faltantes | Cerrado por decisión de diseño (sub-fase 8.0): los fallbacks `record` (para vídeo MP4) y `export` (para SVG) son semánticamente mejores que los originales propuestos. Mantenidos como permanentes — NO son deuda. |

---

## 🧹 Fase 9 (Cleanup post-merge)

### Item 1 — Array hardcodeado del Layer Panel en PreviewPage

**Categoría:** mejora de DX
**Riesgo:** low
**Origen:** descubierto durante integración del icono `layers` (sub-fase 8.0)

**Problema:** `src/preview/PreviewPage.tsx` (~línea 565) usa filtrado dinámico vía `Object.keys(ICONS).filter(...)` para las secciones FX, Camera Presets, Camera Controls. La sección Layer Panel usa un array hardcodeado porque esos iconos no comparten prefijo:

```jsx
names={['eye', 'eye-off', 'layers', 'duplicate', 'trash', 'arrow-up', 'arrow-down',
       'opacity', 'plus-layer', 'drag', 'blend-normal']}
```

Cada icono nuevo sin prefijo requiere actualizar manualmente este array — fácil de olvidar.

**Solución propuesta:** introducir estructura de metadata de secciones en `icons.ts` (ej. `ICON_SECTIONS: Record<string, string[]>`) que agrupe iconos por categoría. Refactorizar `PreviewPage.tsx` para iterar sobre la metadata.

**Path:** `src/preview/PreviewPage.tsx` (~línea 565), `src/design-system/icons.ts`

---

### Item 2 — Duplicación del hook `useIsMobile`

**Categoría:** cleanup
**Riesgo:** low
**Origen:** descubierto durante cutover 8.1 (commit `59467ff`)

**Problema:** dos hooks con funcionalidad idéntica:
- `src/hooks/useIsMobile.ts` (creado en 8.1, usado por `App.tsx`, usa `matchMedia`)
- `src/components/ui/use-mobile.ts` (preexistente, usado por `sidebar.tsx`, usa `matchMedia`)

**Solución propuesta:** canonicalizar en `src/hooks/useIsMobile.ts` (convención React moderna). Actualizar import en `sidebar.tsx`. Borrar `src/components/ui/use-mobile.ts`.

**Path:** los 3 archivos arriba.

---

### Item 3 — Union type de `state.exportRequest` admite valores muertos

**Categoría:** type cleanup
**Riesgo:** low
**Origen:** descubierto durante cutover 8.2 (commit `ecc9134`)

**Problema:** `state.exportRequest` admite `'none'` y `'webm'` que nunca se despachan. `'none'` es valor default cuando `isExporting === false`, pero el tipo no comunica esa correlación. `'webm'` es residuo histórico desde antes del reemplazo por `'mp4'`. Forzó expresión de estrechamiento en App.tsx:

```typescript
exportType={state.exportRequest === 'none' || state.exportRequest === 'webm' ? 'png' : state.exportRequest}
```

**Solución propuesta:** restringir union type a `'png' | 'mp4' | 'svg' | 'svgz'`. Modelar el estado `none` con un guard separado o con `null`/`undefined`. Eliminar la expresión de estrechamiento en App.tsx.

**Path:** `src/types/strataTypes.ts`, `src/components/strata/StrataContext.tsx`, `src/App.tsx`

---

### Item 4 — `EnhancedTooltip` no respeta input touch

**Categoría:** UX tablet
**Riesgo:** low
**Origen:** descubierto durante validación 8.7 (commit `16330de`)

**Problema:** `EnhancedTooltip` envuelve Radix Tooltip en modo uncontrolled. En tablet, taps largos o pausados sobre un trigger pueden hacer aparecer el tooltip mostrando shortcuts como `"Cmd+E"` que son irrelevantes en táctil. Mala UX.

**Solución propuesta:** añadir prop `disableOnTouch` al wrapper, o detectar `pointerType === 'touch'` en eventos del Trigger y suprimir el tooltip. Alternativa: filtrar el render del shortcut cuando el dispositivo es táctil.

**Path:** `src/components/ui/enhanced-tooltip.tsx` (o donde resida el wrapper)

---

### Item 5 — Migrar `T.shadow` y `T.shadowStrong` al objeto `SHADOW`

- **Descripción**: Los tokens `T.shadow` y `T.shadowStrong` permanecen en el objeto `T` como strings de shadow light-mode sin variante dark. En 7.5.0 se creó el objeto `SHADOW` para shadows con variantes `modal` / `modalDark`. Por coherencia: mover `T.shadow` → `SHADOW.pill` y `T.shadowStrong` → `SHADOW.panel` (cada uno con su variante `*Dark`), y refactorizar `DiPill.tsx` y `DiPanel.tsx` para consumir `SHADOW.*`. Esto también resuelve la ausencia de dark mode en las shadows de estos componentes.
- **Archivos afectados**:
  - `src/design-system/tokens.ts` — añadir `SHADOW.pill`, `SHADOW.pillDark`, `SHADOW.panel`, `SHADOW.panelDark`; deprecar `T.shadow`, `T.shadowStrong`
  - `src/design-system/DiPill.tsx` — consumir `SHADOW.pill`
  - `src/design-system/DiPanel.tsx` — consumir `SHADOW.panel`
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.0 (identificado al crear `SHADOW.modal`)

---

### Item 6 — ToolType rename

**Categoría:** refactor
**Riesgo:** high

`state.tool === 'brush'` representa Blob (UI). `state.tool === 'line'` representa Brush (UI). Pendiente: renombrar `'brush'` → `'blob'` y `'line'` → `'brush'` en todo el codebase. Riesgo high por dispersión.

---

### Item 7 — Hex hardcodeados en `MobileBlockScreenV2`

- **Descripción**: `MobileBlockScreenV2` inyecta un bloque `<style>` con 6 hex literals para temas light/dark via `@media (prefers-color-scheme: dark)`. Esto es necesario hoy porque el componente se renderiza ANTES del `ThemeProvider` y no puede consumir `T` dinámicamente. Si en el futuro se introduce un sistema de CSS variables globales definidas en `:root` desde `tokens.ts` (e.g. al arrancar la app), migrar los 6 literals a esas variables. La migración es un cambio de 6 líneas en el `THEME_CSS` del componente.
- **Archivos afectados**:
  - `src/components/strata/modals/MobileBlockScreenV2.tsx` — bloque `THEME_CSS`
  - `src/design-system/tokens.ts` — si se introduce el sistema de CSS vars globales
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.7

---

### Item 8 — Focus trap activo en variant `banner` de `DiModal`

- **Descripción**: `useModalBehavior.ts` aplica focus trap (Tab cycling) para todas las variants, incluyendo `banner`. La corrección de 7.5.5.1 añadió `|| variant === 'banner'` a los guards de scroll lock y ESC, pero **no al focus trap** (líneas 65–86). No produce efecto observable hoy porque `ExportProgressV2` no tiene elementos focusables. Si en el futuro un banner incluye elementos interactivos (botón de cancel, link), el focus trap se activará inesperadamente. Resolución: añadir `|| variant === 'banner'` al guard del focus trap en `useModalBehavior.ts`.
- **Archivos afectados**:
  - `src/components/strata/modals/useModalBehavior.ts` — líneas 65–66
- **Riesgo**: low
- **Origen**: Sub-fase 7.5.5.1

---

### Item 9 — Primitivo `DiActionButton` para micro-botones del LayersPanel

- **Descripción**: Los botones de acción del LayersPanel v2 (añadir capa, duplicar, eliminar, mover) son botones inline sin primitivo compartido. Estandarizar con un primitivo `DiActionButton` mejoraría consistencia visual y facilitaría theming. Item opcional — la UX actual funciona correctamente.
- **Archivos afectados**:
  - `src/components/strata/layers/LayersPanel.tsx`
  - `src/components/strata/layers/LayerRow.tsx`
  - Nuevo archivo: `src/design-system/DiActionButton.tsx` (a crear)
- **Riesgo**: low
- **Origen**: Backlog heredado (pre-Fase 7.5)

---

### Item 10 — Refactor `StrataCanvas.tsx`

**Categoría:** refactor
**Riesgo:** high
**Origen:** deuda preexistente, agendada post-rediseño UI

Monolito de alto riesgo. Render loop, gestos, proyección 3D. Refactor diferido hasta post-Fase 8 (ya completado) porque la nueva UI informaría la refactorización necesaria. Ahora que la UI V2 está en producción, el refactor puede planificarse con contexto real.

---

## 📦 Out of scope (anotado, sin agendar)

| Item | Notas |
|---|---|
| Tipo `Layer` unificado | Medium risk. Sin agenda. |
| Lanzamiento Instagram/X | No técnico. Cuando haya 3-5 piezas de muestra. |
| Progreso real del export | Instrumentar `exportHandlers` para reportar % real en lugar del easing asintótico actual del ExportProgressV2. |
| Cancel del export en curso | Funcionalidad ausente. |
| Versionado de ilustración Welcome | Procedimiento ya instaurado (mapeo versión→asset en `welcomeIllustrations.ts`). Solo recordatorio. |
