# Diorame — Backlog técnico

**Actualizado:** 2026-06-02 — Post v3.7.4

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
| Item 11 — Warning `ref is not a prop` en DiModal | v3.9.2 | **Premisa del backlog era falsa: es React 18.3.1, no React 19.** Causa real: el `motion.div` del panel se creaba con `ref={panelRef}`; React 18.3 instala un getter de warning sobre `props.ref` de cualquier elemento creado con ref, y `framer-motion@12.38` (`PopChild`) lee `children.props?.ref` (ruta React 19) antes del fallback React 18, disparándolo. El displayName `"[object Object]"` delataba un `type` exótico (forwardRef de `motion`), no el backdrop. Fix: ref movida a wrapper interno `display:contents` — el hijo directo de `AnimatePresence` ya no se crea con ref → warning eliminado en origen, sin depender de versión de framer-motion. Un intento local previo (no commiteado) envolvió `DiModalBackdrop` en `forwardRef`: código muerto basado en diagnóstico erróneo (el backdrop nunca recibe ref); descartado. Cosmético dev-only (refs siempre funcionaron). |

---

## 🧹 Fase 9 (Cleanup post-merge)

### ~~Item 6 — ToolType rename~~ ✅ CERRADO

Completado en commit `b2b9942`. `ToolType = 'blob' | 'eraser' | 'text' | 'move' | 'brush'` — naming coherente con la UI.

---

### Item 10 — Refactor `StrataCanvas.tsx`

**Categoría:** refactor
**Riesgo:** high
**Origen:** deuda preexistente, agendada post-rediseño UI

Monolito de alto riesgo. Render loop, gestos, proyección 3D. Refactor diferido hasta post-Fase 8 (ya completado) porque la nueva UI informaría la refactorización necesaria. Ahora que la UI V2 está en producción, el refactor puede planificarse con contexto real.

---

### ~~Item 11 — Warning `ref is not a prop` en DiModal~~ ✅ CERRADO

Resuelto en v3.9.2. **La premisa original ("framer-motion + React 19") era falsa: el proyecto corre React 18.3.1.** El warning legacy de React 18.3 se disparaba porque el `motion.div` del panel se creaba con `ref={panelRef}` (React instala un getter sobre `props.ref` en todo elemento creado con ref) y `framer-motion@12.38` `PopChild` lee `children.props?.ref` antes del fallback React 18. El prefijo `"[object Object]"` delataba el `type` exótico de `motion` (forwardRef), no el backdrop. Fix: ref movida a un wrapper interno `display:contents`, de modo que el hijo directo de `AnimatePresence` ya no se crea con ref — warning eliminado en origen. Un intento local previo no commiteado había envuelto `DiModalBackdrop` en `forwardRef` (código muerto: el backdrop nunca recibe ref); descartado. Cosmético dev-only; los refs siempre funcionaron.

**Path:** `src/components/strata/modals/DiModal.tsx`, `DiModalBackdrop.tsx`

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

---

## 🐛 Sprint animación — Issues abiertos (v3.7.1+)

### Item DoF — Bug DoF con zero-Z en CINEMA

**Categoría:** bug render
**Riesgo:** medium

Con `isAnimationFlatZ` activo en CINEMA, el Depth of Field sale todo desenfocado en lugar de quedar enfocado. Sin profundidad relativa entre capas no hay distancia que difuminar — el DoF debería ser neutro. El fix requiere detectar el caso flat en `applyDoFBlur` o en el cálculo de `fxFocusDist`.

**Path:** `src/components/strata/canvas/postProcessing.ts`

---

### Item DRAW→CINEMA — Continuidad de animación al cambiar de modo

**Categoría:** UX
**Riesgo:** medium

Al cambiar de DRAW a CINEMA durante playback, el comportamiento actual no está especificado. Diseño deseado: la animación continúa en CINEMA (pill desplegado, modo animado). Evaluar si `SET_MODE` mientras `isAnimationPlaying` debe trasladar el playback o detenerlo limpiamente.

**Path:** `src/components/strata/ControlsV2.tsx` (Side-effect 3: mode-change camera reset)

---

### Item Undo palette — Cambios de paletteMode fuera del historial de undo

**Categoría:** bug UX
**Riesgo:** low-medium

Cambiar el modo de color de una capa (plano/degradado/fade) o activar "aplicar a todas" no genera snapshot en el historial de undo/redo. El reducer debe crear historial en `SET_PALETTE_MODE` y acciones relacionadas.

**Path:** `src/components/strata/StrataContext.tsx` (reducer)

---

### Item Tweening — Interpolación entre frames de animación

**Categoría:** feature
**Riesgo:** high (requiere nuevo modelo de datos)

La animación es frame-a-frame sin interpolación. Tweening (interpolación automática posición/escala entre keyframes) requiere extender el modelo Shape/Layer. Sin agenda. Anotar para evaluación futura.

---

### Item PWA — Instalable (Progressive Web App)

**Categoría:** feature infra
**Riesgo:** low

Diorame no tiene manifest ni service worker. Primer paso: PWA con `vite-plugin-pwa` para instalación en iOS/Android/desktop. Tauri (app nativa) sería el siguiente nivel. Track propio cuando sea prioritario.

---

### Item Squash & Stretch — Gizmos de deformación no proporcional (Move tool)

**Categoría:** feature de expresividad
**Riesgo:** **medium** (rebajado de high tras análisis del modelo de datos real)
**Origen:** expresividad UX + motivación animación
**⚠️ Nota:** PROYECTO PROPIO. Sesión dedicada, Opus. Faseado 0-5 (Fase 0 ya HECHA en v3.9.5).

Gizmos situados en los puntos medios de cada lado del rectángulo de selección del Move tool que permiten reescalar de forma **no uniforme** (estirar/comprimir en X o en Y), deformando la forma. Motivación principal: expresividad artística y squash & stretch clásico de animación.

**Reclasificación tras análisis (la premisa original era incorrecta).** El modelo de datos es **DESTRUCTIVO**: el reducer `TRANSFORM_LAYER` hornea el transform en `shape.points` (no hay scaleX/scaleY ni matriz persistente; solo el texto guarda `rotation`/`fontSize`). Por tanto, para **trazos**, una escala no uniforme se hornea en los puntos **exactamente igual** que la escala uniforme de hoy → **cero cambios** en proyección 3D, SVG export (mapea `points` directo) y save/load (serializa `points`). Los 3 "frentes estructurales" del análisis previo **desaparecen** para trazos. Solo queda: gizmos + hit-test + drag + preview en vivo + el reducer.

**Decisiones cerradas:**
- **Texto excluido** del squash & stretch (no es geometría de puntos; una escala no uniforme no cabe en un solo `fontSize`). Las asas de lado hacen no-op en capas de texto.
- **Asas de lado = escala pura de eje** (sin rotación). La rotación queda como gesto aparte (asa de rotación existente).
- **Centro del box** (no centroide) como referencia de deformación — lo más intuitivo visualmente.

**Faseado validable (estilo HQ A/B):**
- **Fase 0 — Extracción (HECHA, v3.9.5):** lógica de interacción del Move-gizmo extraída de StrataCanvas a `canvas/moveGizmoInteraction.ts` (módulo puro). Aísla el monolito para las fases siguientes.
- **Fase 1 — Motor:** `scaleX/scaleY` en `currentTransform` + payload de `TRANSFORM_LAYER` (default = `scale`, retrocompat). Bake no uniforme en points.
- **Fase 2 — Gizmo visual:** asas de lado medio en `drawGizmo.ts` + `GizmoHandles`.
- **Fase 3 — Drag:** hit-test + modos `scale_t/b/l/r` + escala mono-eje (en el módulo de Fase 0).
- **Fase 4 — Preview en vivo:** `scaleX/scaleY` en el preview de `renderLayerBody`.
- **Fase 5 — Texto + edge cases:** exclusión de texto, `originalPoints` (spine), clamp anti-flip.

**Riesgo concentrado:** editar los pointer handlers del Move (mitigado por la Fase 0). RAF/buildRenderContext/live-stroke fuera de alcance.

**Path:** `src/components/strata/canvas/moveGizmoInteraction.ts` (Fase 0), `drawGizmo.ts`, `renderLayerBody.ts`, `StrataContext.tsx` (reducer), `StrataCanvas.tsx` (pointer handlers del Move)

---

### ~~Item Onboarding-anim — Onboarding del sistema de animación~~ ✅ CERRADO

Resuelto en v3.7.4 (commit `fb88c33`): nueva sección "Animate/Animar" añadida al onboarding didáctico. Card centrada con icono `bounce` y badge NEW/NUEVO en púrpura de marca. i18n EN/ES.

**Path:** `src/components/strata/modals/OnboardingOverlayV2.tsx`


## 📦 Out of scope (anotado, sin agendar)

| Item | Notas |
|---|---|
| Tipo `Layer` unificado | Medium risk. Sin agenda. |
| Lanzamiento Instagram/X | No técnico. Cuando haya 3-5 piezas de muestra. |
| Progreso real del export | Instrumentar `exportHandlers` para reportar % real en lugar del easing asintótico actual del ExportProgressV2. |
| Cancel del export en curso | Funcionalidad ausente. |
| Versionado de ilustración Welcome | Procedimiento ya instaurado (mapeo versión→asset en `welcomeIllustrations.ts`). Solo recordatorio. |
