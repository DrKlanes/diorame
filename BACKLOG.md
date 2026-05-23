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

## ✅ Resuelto en Fase 9

| Item | Sub-fase | Resolución |
|---|---|---|
| Item 1 — Array hardcodeado Layer Panel en PreviewPage | 9.3 | `ICON_SECTIONS` metadata uniforme en `icons.ts`. PreviewPage itera dinámicamente sobre las 9 secciones. Commit `4c7d9a9`. |
| Item 2 — Duplicación del hook `useIsMobile` | 9.2 | Canonicalizado en `src/hooks/useIsMobile.ts` (convención React moderna). `src/components/ui/use-mobile.ts` eliminado. Commit `a656827`. |
| Item 3 — Union type `state.exportRequest` admite valores muertos | 9.5 | `ExportType` restringido a `'png' \| 'mp4' \| 'svg' \| 'svgz'`. `null` reemplaza `'none'`. Narrowing residual eliminado de App.tsx. `ExportType` duplicado consolidado en `strataTypes.ts` como fuente única. Commit `10a9ec5`. |
| Item 4 — `EnhancedTooltip` no respeta input touch | 9.6 | Estado controlado + `pointerTypeRef`. Tooltip suprimido entero en touch (no solo el shortcut). API pública sin cambios. Commit `2a8accf`. |
| Item 5 — `T.shadow`/`T.shadowStrong` migrar a SHADOW | 9.4 | `T.shadow` → `SHADOW.surface`. `T.shadowStrong` eliminado por ser dead code (0 consumidores). Coherencia: sombras en SHADOW, colores en T. Commit `6bafcd3`. |
| Item 7 — Hex hardcodeados en MobileBlockScreenV2 | 9.1 | Dos `rgb(154,15,249)` → `T.purple` en iconos tablet/monitor. Los hex dentro de THEME_CSS permanecen documentados como restricción arquitectural (CSS inyectada, no tokenizable sin sistema de CSS variables). Commit `61a934d`. |
| Item 8 — Focus trap para variant banner | 9.7 | El primitivo ya tenía focus trap completo (Tab cycling + initial focus). Solo faltaba excluir variant `banner` por coherencia con scroll lock y ESC handler. Fix de 1 línea. Commit `1ede6b7`. |
| Item 9 — Primitivo DiActionButton para LayersPanel | 9.8 | `IconBtn` promovido a `DiActionButton` en design-system. Añadidas props `disabled` (interna, elimina 10 wrappers `<div style={off(...)}>`) y `danger` (variante semántica usada por trash). Hover migrado a pointer events. 11 consumidores migrados. `topbar/_shared.tsx` eliminado. Commit `bada128`. |

---

## 🧹 Fase 9 (Cleanup post-merge)

### Item 6 — ToolType rename

**Categoría:** refactor
**Riesgo:** high

`state.tool === 'brush'` representa Blob (UI). `state.tool === 'line'` representa Brush (UI). Pendiente: renombrar `'brush'` → `'blob'` y `'line'` → `'brush'` en todo el codebase. Riesgo high por dispersión.

---

### Item 10 — Refactor `StrataCanvas.tsx`

**Categoría:** refactor
**Riesgo:** high
**Origen:** deuda preexistente, agendada post-rediseño UI

Monolito de alto riesgo. Render loop, gestos, proyección 3D. Refactor diferido hasta post-Fase 8 (ya completado) porque la nueva UI informaría la refactorización necesaria. Ahora que la UI V2 está en producción, el refactor puede planificarse con contexto real.

---

### Item 11 — Warning `ref is not a prop` en framer-motion + React 19

**Categoría:** library compatibility
**Riesgo:** low (cosmético, no afecta funcionalidad)
**Origen:** detectado durante validación de Fase 9

**Problema:** Consola del navegador muestra warning de React 19:
> `ref` is not a prop. Trying to access it will result in `undefined` being returned.

Aparece en la cadena `AnimatePresence → PresenceChild → PopChild → DiModalRoot`. Es bug conocido de `framer-motion` con React 19 — la librería accede a `ref` como prop interna y React 19 cambió la semántica.

**Solución propuesta:** actualizar `framer-motion` a versión que ya haya parcheado el issue (verificar changelog del package), o cambiar el patrón de uso de `AnimatePresence` en `DiModal.Root` si no hay versión arreglada disponible.

**Path:** `src/components/strata/modals/DiModal.tsx` líneas 45 aprox.

---

### Item 12 — Integrar EnhancedTooltip en DiActionButton

**Categoría:** consistencia UX
**Riesgo:** medium (cambia el patrón de tooltip de 11 consumidores)
**Origen:** decisión diferida en 9.8

DiActionButton actualmente usa `title` attr nativo para tooltips. EnhancedTooltip (corregido en 9.6 con supresión touch) ofrece mejor UX en tablet. Integración pospuesta porque añade dependencia `RippleButton` chain al primitivo y los 11 consumidores requerirían validación visual.

**Path:** `src/design-system/DiActionButton.tsx`

---

### Item 13 — Discrepancia `pen` en ICON_SECTIONS

**Categoría:** documentación interna
**Riesgo:** trivial
**Origen:** descubierto en 9.3

`pen` aparece en comentarios divisores de `icons.ts` como "Custom Additions" pero `PreviewPage.tsx` lo agrupaba en "Drawing Tools". `ICON_SECTIONS` siguió PreviewPage para no introducir cambio visual en 9.3. Decidir qué agrupación es la correcta y unificar.

**Path:** `src/design-system/icons.ts` (comentario divisor), `ICON_SECTIONS`

---

### Item 14 — Agrupar tokens de blur en objeto BLUR propio

**Categoría:** coherencia de tokens
**Riesgo:** trivial
**Origen:** observación en 9.4

`T.blur` quedó en el objeto `T` cuando los demás `T.*` son colores. Análogo a `SHADOW` (introducido en 7.5.0) o `RADIUS`. Si en el futuro se añaden más valores de blur (`blurStrong`, `blurSubtle`), tiene sentido agruparlos en `BLUR` propio.

**Path:** `src/design-system/tokens.ts`

---

## 📦 Out of scope (anotado, sin agendar)

| Item | Notas |
|---|---|
| Tipo `Layer` unificado | Medium risk. Sin agenda. |
| Lanzamiento Instagram/X | No técnico. Cuando haya 3-5 piezas de muestra. |
| Progreso real del export | Instrumentar `exportHandlers` para reportar % real en lugar del easing asintótico actual del ExportProgressV2. |
| Cancel del export en curso | Funcionalidad ausente. |
| Versionado de ilustración Welcome | Procedimiento ya instaurado (mapeo versión→asset en `welcomeIllustrations.ts`). Solo recordatorio. |
