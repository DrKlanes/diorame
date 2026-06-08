# Diorame — Backlog técnico

**Actualizado:** 2026-06-07 — Post v3.10.1

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

### ~~Item PWA — Instalable (Progressive Web App)~~ ✅ PWA COMPLETA (Fases 0-3) — HECHA

**Categoría:** feature infra
**Riesgo:** low

**Fase 0 — HECHA (v3.10.5):** app instalable vía `manifest.webmanifest` + 4 iconos (192/512/512-maskable/apple-touch-180) + meta tags en index.html. Color de marca `#511d65`.

**Fases 1-3 — HECHAS (v3.10.6):** service worker con `vite-plugin-pwa` (`registerType: 'prompt'`).
- Precache app-shell (12 entradas) → app abre offline.
- Runtime cache CacheFirst de texturas (`diorame-textures`) → papel/grunge offline tras 1ª carga online.
- Vídeos welcome `NetworkOnly` (streaming/range intacto, no offline por diseño).
- Toast de actualización (`PwaUpdatePrompt.tsx`) → "Nueva versión disponible / Recargar".
- Kill-switch de rollback documentado en `assets-source/`.

**Fuera de alcance (sin compromiso):** Tauri (app nativa) = futuro lejano. Caché de sonidos para offline (hoy red-only). Precache de las texturas grandes (decisión: runtime en vez de precache, para no inflar la carga inicial).

---

### ~~Item Squash & Stretch — Gizmos de deformación no proporcional (Move tool)~~ ✅ COMPLETADO (v3.9.10)

**Sprint completo en Fases 0-5 (v3.9.5 → v3.9.10).** Deformación no uniforme (estirar/comprimir en X o Y) vía asas de lado del bounding box del Move. El análisis confirmó modelo **DESTRUCTIVO** (el reducer `TRANSFORM_LAYER` hornea en `shape.points`), por lo que para trazos la deformación no tocó proyección 3D / SVG export / save-load — riesgo rebajado de high a medium.

| Fase | Versión | Entregable |
|---|---|---|
| 0 — Extracción | v3.9.5 | Interacción del Move-gizmo extraída a `moveGizmoInteraction.ts` (módulo puro) |
| 1 — Motor | v3.9.6 | `scaleX/scaleY` en `Transform` + bake no uniforme en el reducer (retrocompat total) |
| 2 — Gizmo visual | v3.9.7 | Asas de lado como barras pill orientadas al eje |
| 3 — Drag | v3.9.9 | Modos `scale_t/b/l/r` + escala mono-eje |
| 4 — Preview en vivo | v3.9.9 | `scaleX/scaleY` en preview + gizmo (espeja el bake, sin salto) |
| 5 — Pulidos | v3.9.10 | Asas ocultas en capa pura-texto + `eraserPolygon` horneado |

**Decisiones cerradas:** texto excluido por shape (las asas se ocultan en capa 100% texto); asas de lado = escala pura de eje (sin rotación); centro del box como referencia.

**Quirk aceptado (decisión, NO pendiente):** se eligió "deformar el outline" como semántica de squash & stretch. Consecuencia conocida: tras deformar no uniformemente un trazo brush (tapered/ink), cambiar su grosor/tipo lo regenera desde el spine deformado y puede saltar. Aceptado conscientemente — no es bug a arreglar.

**Path:** `moveGizmoInteraction.ts`, `drawGizmo.ts`, `renderLayerBody.ts`, `renderPipeline.ts`, `StrataContext.tsx` (reducer), `StrataCanvas.tsx` (tipos + payload del Move; núcleo RAF/live-stroke nunca tocado).

---

### ~~Item Onboarding-anim — Onboarding del sistema de animación~~ ✅ CERRADO

Resuelto en v3.7.4 (commit `fb88c33`): nueva sección "Animate/Animar" añadida al onboarding didáctico. Card centrada con icono `bounce` y badge NEW/NUEVO en púrpura de marca. i18n EN/ES.

**Path:** `src/components/strata/modals/OnboardingOverlayV2.tsx`


### ~~Item Storytelling — Preset cinemático data-driven~~ ✅ COMPLETADO (v3.10.0)

11º movimiento cinemático. Tour contemplativo que recorre el centroide de **contenido visible** de cada capa en orden de stack (Z), con cámara orgánica continua. Propiedades finales:

- **Waypoints** por capa = promedio de puntos de shapes (sin `getImageData`); `radius` = mitad del lado mayor del bbox.
- **Exclusiones**: capas pinned (`locked3DLayers`) y sin contenido visible (solo-eraser / sin puntos). Erasers excluidos del centroide/radius (solo sustraen). Texto sí cuenta (aporta su ancla).
- **Obertura de entrada** (`INTRO_DURATION`): posada en `wp[0]` con beat de respiración pleno, luego viaje con handoff C0-continuo. Stateless, función cerrada de `t`, scrub-safe, no recurrente.
- **Flujo orgánico continuo**: spline cíclico Catmull-Rom + velocidad ondulante `s(t)` cerrada, estrictamente > 0 (sin frenazos, sin costura).
- **Encuadre real ~70%**: inversión de proyección (`dz* = FL·(1−k)/k`), cap de apparent-scale robusto a FL → degradación elegante en capas extremas.
- **Respiración** perceptualmente constante (fracción de la distancia de framing) y continua en fronteras de segmento (`ampLerp` → sin pop de zoom).
- **Loop sin costura**: retorno frente→fondo es un segmento más.

**Path:** `strataTypes.ts`, `cinematicCamera.ts`, `renderPipeline.ts`, `StrataCanvas.tsx`, `StrataContext.tsx`, `animationExportRender.ts`, `exportHandlers.ts`, `icons.ts`, `CameraPresetsZone.tsx`, `i18n/en.ts`, `i18n/es.ts`.

---

### ~~Item DoF follow — Rack focus automático en Storytelling~~ ✅ COMPLETADO (v3.10.1)

Cuando `storytelling` + DoF modo `lock` están activos, el plano de enfoque sigue con rack focus suave la capa de destino del tour. Acople implícito (override de render, no muta estado). Coherencia proyectiva por construcción: capa enmarcada = capa nítida.

**Path:** `cinematicCamera.ts`, `renderPipeline.ts`, `StrataCanvas.tsx`, `animationExportRender.ts`, `exportHandlers.ts`.

---

## 🎯 En cola

*(vacía — sprint del preset Storytelling cerrado)*

---

## 📦 Out of scope (anotado, sin agendar)

| Item | Notas |
|---|---|
| Tipo `Layer` unificado | Medium risk. Sin agenda. |
| Lanzamiento Instagram/X | No técnico. Cuando haya 3-5 piezas de muestra. |
| Progreso real del export | Instrumentar `exportHandlers` para reportar % real en lugar del easing asintótico actual del ExportProgressV2. |
| Cancel del export en curso | Funcionalidad ausente. |
| Versionado de ilustración Welcome | Procedimiento ya instaurado (mapeo versión→asset en `welcomeIllustrations.ts`). Solo recordatorio. |
