# FX también en DRAW — plan del proyecto (en pausa)

**Estado (2026-10-25): F0 HECHA, F1 SIGUIENTE.** El proyecto está en pausa tras F0. Este documento es autocontenido: quien lo
retome no necesita la conversación de diseño. Lo marcado [VERIFICADO] se midió en código o en el navegador; [POR MEDIR] / [POR
CONFIRMAR] está sin comprobar. Versión de partida: 3.20.1; F0 cerró en 3.20.10.

Documentos relacionados: `docs/super-riso.md` y `src/REFERENCE.md` §14 (Super Riso), `docs/ux-debt.md` (deuda), `CLAUDE.md`
(reglas de núcleo y de FX: «FX: criterio de ingeniería gráfica», «Tocar StrataCanvas.tsx»).

---

## 1 · Objetivo y motivo de producto

DRAW se ha convertido en el entorno de **acabado con control directo**: encuadre exacto con zoom y pan, y export PNG con calidad
(pantalla / HQ ×2) y fondo (papel / liso / transparente). CINEMA tiene el poder de las cámaras, pero el control de qué se ve y cómo
es mucho menos directo. Los FX (y sobre todo Super Riso, que convierte el dibujo en una impresión) solo existen en CINEMA.

**Objetivo:** que los FX que no dependen de la profundidad, la cámara ni el tiempo se apliquen también en DRAW, con el mismo
estado y el mismo panel, y que el PNG de DRAW los lleve.

Restricciones de producto:
- Moisés dibuja en iPad y aplica efectos en su PC (RTX 5070 Ti). **La calidad en escritorio nunca se sacrifica por el rendimiento
  del iPad.**
- Diorame es un producto publicado: todo debe comportarse como esperaría cualquier usuario.
- El juez de un FX es Moisés, en `localhost:3000` / en el iPad (CLAUDE.md, «Regla dura»). Un prototipo se juzga sobre capturas
  reales a los tamaños del iPad.

## 2 · Las 8 decisiones de base (cerradas, no se reabren)

1. **Los FX NO se ven mientras se dibuja:** se ocultan durante el gesto (trazo, pan, zoom) y vuelven en reposo.
2. **El grano/escala de los FX NO hace zoom con el dibujo**, igual que Super Riso y Pixel Art en CINEMA. Los controles de escala
   viven en los propios FX.
3. **Super Riso exporta sin alfa** (imprime sobre su propio papel). Con él activo, el fondo «Transparente» del PNG de DRAW no aplica.
4. **El SVG nunca lleva FX.**
5. **UN SOLO estado de FX compartido** por los dos modos: un look por proyecto y un panel de FX compartido. Cada modo aplica los
   que puede. [VERIFICADO: ya es así — `postProcessing` + `postProcessingEnabled`, sin nada por modo.]
6. **Los FX que dependen de Z, de la cámara o del tiempo** (partículas, Stop Motion, niebla, DoF, cualquier movimiento) se quedan
   en CINEMA. El resto, incluido Super Riso, va a DRAW.
7. **Los FX 2D con componente temporal** (grano aleatorio por frame, reimpresión animada de Super Riso) se **CONGELAN** en DRAW:
   imagen estática, semilla fija.
8. **Hoja virtual:** en DRAW la hoja de Super Riso es el **encuadre visible**, como en CINEMA es el frame. Cada encuadre es una
   impresión nueva. El export HQ conserva los mm: misma impresión, más resolución. [VERIFICADO: `pxmm = frameW·lerp(.4,1,r)/240`
   depende del ancho del lienzo, no del zoom; `sceneInks` se cachea por escena.]

## 3 · Las 4 respuestas de Moisés (tras el informe de la Fase 1)

1. **Paleta plegada con la cara FX abierta.** En DRAW, con la cara FX del inspector abierta, la paleta de color se pliega a píldora.
2. **Papel cebolla:** los fantasmas se pintan **encima** de los FX, sin FX, como el gizmo o la rejilla: nunca se imprimen ni se
   exportan. **Plan B** si moverlos a la fase de ayudas resulta caro: FX apagados mientras el papel cebolla está activo. *Coste:* ver §8.
3. **Sin FX durante la reproducción de la animación en DRAW.** Al pausar, el acabado se revela.
4. **Sliders de FX en vivo:** arrastrar un slider muestra el efecto. En iPad con Super Riso: vista previa (nivel *preview*) durante el
   arrastre y refinado al soltar.

Además (decididos en la misma ronda):
- **Distorsión solo CINEMA** (es geométrica global: en DRAW descuadraría el gizmo y el picking).
- **Pixel Art en DRAW sin cuantizar la cámara:** el dibujo no puede saltar. Hoy `quantizePixelArtCamera` (en el arranque de
  `renderFrame`) muta `camera.z/x/y` también con `isCinematic = false`, y `renderFrame` cuantiza `viewPan` con `isPixelArt`: en
  DRAW hay que dejar ambos libres y cuantizar solo los puntos proyectados.

## 4 · La propuesta de UX aceptada

1. **Un panel que crece con lo que se usa, no con el catálogo.** Arriba, solo los FX activos, cada uno como **tarjeta** con sus
   controles; debajo, los inactivos como rejilla compacta de **chips** (icono + etiqueta; en táctil no hay hover para descubrir el
   nombre). Activar sube a tarjeta; desactivar devuelve a chip. En DRAW, los FX solo-CINEMA se resumen en **una línea plegada**
   («N efectos solo en Cine», ~32 px).
2. **Una sola tarjeta abierta a la vez.** Las demás se pliegan a una cabecera de ~36 px con su valor. Sin esto los números no salen.
3. **Super Riso como tarjeta** con su selector de técnica y su bloque plegable dentro, reutilizando la anatomía existente
   (`SuperRisoBlock`): el bloque creativo de cada técnica (Tintas / Copiadora + Color a mano / Plantillas + Spray + Colores) pasa a
   **acordeón** (una sección abierta a la vez) con el patrón plegable que ya tiene «Ajustes de impresión». Opcional: estilos como
   selector en vez de rejilla (−~100 px). En DRAW, Reimpresión y «Calidad completa» se ocultan (control muerto / irrelevante).
4. **Inspector lateral con dos caras (Capas | FX), compartido por los dos modos, una cara abierta a la vez.** Plegado: píldora con
   los dos iconos, el de FX iluminado con el número de efectos activos. Cada modo recuerda su cara (DRAW → Capas, CINEMA → FX),
   en dos claves de `localStorage`. Altura limitada por `rightPanelInsets` (ver §6) y scroll interno.
5. **El acabado se «revela»** al terminar el gesto, con un fundido corto: copiar el frame limpio a un `<canvas>` DOM superpuesto,
   pasar al render con FX y bajar su opacidad CSS de 1 a 0 (~180 ms) **cuando el primer frame con FX esté listo**. Cubre la latencia
   de Super Riso, no duplica pasadas y vive fuera del pipeline. Al empezar un gesto: corte seco.
6. **Comparar:** pulsación larga (~300 ms) sobre el icono FX muestra el dibujo limpio mientras dure; un toque cambia de cara. En
   escritorio, mantener la tecla **`\`** (libre en REFERENCE.md, Apéndice B).
7. **Tablet:** `overscroll-behavior: contain` en `.di-panel-scroll` (el scroll del panel no arrastra el lienzo); durante un trazo la
   UI ya es `pointer-events: none` (`ControlsV2.tsx`); falta el caso de la palma que toca un slider **antes** del Pencil (el
   `<input type=range>` nativo salta al punto tocado): con un lápiz visto en los últimos segundos, los sliders del inspector ignoran
   los toques sin arrastre. [POR CONFIRMAR en iPad.]

## 5 · Inventario clave (medido en el informe de la Fase 1)

### 5.1 FX: veredicto por efecto

| FX | Controles | ¿Z? | ¿Cámara? | ¿Tiempo? | Veredicto |
|---|---|---|---|---|---|
| Grano | 1 slider | no | no | **sí** (`Math.random` por frame, `applyGrain`) | DRAW, **congelado** (offset fijo) |
| Grunge | segmento de 3 | no | no | **sí** (`Date.now()/350`, `applyGrunge`) | DRAW, **congelado** (paso fijo) |
| Riso (antiguo) | 1 slider | no | no | no | DRAW+CINEMA (excluyente con Super Riso) |
| Viñeta | 1 slider | no | no | no | DRAW+CINEMA |
| Aberración cromática | 1 slider | no | no | no | DRAW+CINEMA (3 pasadas a pantalla completa) |
| Distorsión | slider bipolar | no | **sí** (`k ∝ 500/FL`, `transformPoint`) | no | **solo CINEMA** |
| Resplandor | 1 slider | no (suma `dofBlur` si el DoF está activo) | no | no | DRAW+CINEMA. Una pasada por capa: el más caro en iPad (`blurCompat` en Safari) |
| DoF | segmento libre/fijo + Z o capa + intensidad | **sí** | sí | no | solo CINEMA |
| Niebla | 1 slider | **sí** (`FL + layerAvgZ`) | sí | no | solo CINEMA |
| Partículas | slider + segmento de 3 | sí | sí | sí | solo CINEMA |
| Stop Motion | segmento de 3 | no | no | **sí** (`wiggleFrame` del tick) | solo CINEMA |
| Pixel Art | tamaño · profundidad · tramado | no | ⚠ `quantizePixelArtCamera` mueve la cámara | no | DRAW+CINEMA **sin cuantizar la cámara de DRAW** |
| Super Riso | técnica + estilos + controles + impresión | no | no | reimpresión | DRAW (reimpresión **congelada**: semilla tick 0) |

Ningún FX depende ya de `ctx.filter` en Safari (3.12.0). En DRAW quedan 7 FX + Super Riso; 5 son solo de CINEMA.

### 5.2 Alturas de Super Riso (ancho 248; igual en todos los viewports)

| Técnica | Plegado | Con «Ajustes de impresión» abierto |
|---|---|---|
| Riso | 316 | 539 |
| Fotocopia | 756 (± ~95 según las zonas del dibujo) | 979 |
| Stencil | 926 | 1141 |

Estimación con acordeón [POR CONFIRMAR en el prototipo]: núcleo ~290 + sección mayor ~310 → máx. ~600 (Fotocopia), ~515 (Stencil),
~520 (Riso con impresión). Fotocopia y Stencil plegados **no caben** en ningún iPad horizontal si no se pliegan por secciones.

### 5.3 Alto útil para el inspector (columna derecha, px)

Entre el TopBar (`12 + 40 + 8`) y la barra inferior / paleta (8 px de hueco); contenido útil = disponible − 68 (cabecera + padding).

| Viewport | DRAW (paleta plana / degradado) | CINEMA |
|---|---|---|
| 1180×820 | 496 / 456 (con la paleta plegada: ~620) | 620 |
| 1366×1024 | 700 / 660 | 824 |
| 820×1180 | 856 / 816 | 932 |
| 1024×1366 | 1042 / 1002 | 1118 |
| 1920×1080 (calculado) | 756 | 880 |

Alturas de los paneles de DRAW: paleta 240×164 (plana) / 240×204 (degradado); LayersPanel plegado 70×279, desplegado 250×342 (7 capas).

### 5.4 Pregunta clave de la propuesta

¿Super Riso desplegado + 2 tarjetas en 1180×820 horizontal? **No** sin acordeón ni paleta plegada: Riso desplegado (539) + 2 tarjetas
(~52 c/u) = 643 > 496 (DRAW) y > 620 (CINEMA).

## 6 · Lo ya hecho: F0 (v3.20.2 → v3.20.10) [VERIFICADO]

Tres bugs que ya afectaban a usuarios, independientes del flag, más la persistencia.

| Versión | Qué |
|---|---|
| 3.20.2 | CameraBar vertical (820×1180) cabe entera: la `POIPill` pasa a `CameraBar` (junto a los sliders en compacto); `useIsCameraBarCompact` |
| 3.20.3 | FXPanel por anclas reales: **`utils/panelLayout.ts` → `rightPanelInsets(bottomBarHeight, isStandalone)`** es la fuente única de la banda libre de la columna derecha; el inspector de DRAW debe usarla (nunca `vh` fijos) |
| 3.20.4 | Grano en HQ ×2 conserva su tamaño en pantalla (`createNoise(..., cell)`); `applyRisoV2` con offsets `·scale` |
| 3.20.5 | Persistencia: `fxMasterEnabled` + `postProcessingSnapshot` en `.dior` y autoguardado (`LOAD_PROJECT` los sanea y ya no hereda el snapshot anterior); autoguardado 1,5 s tras el último cambio y al ocultar (`visibilitychange`/`pagehide`); `TOGGLE_DARK_MODE` marca `isDirty` |
| 3.20.6 | El autoguardado no corre durante un gesto (pointer/touch/rueda/`isDrawing`), en `requestIdleCallback` |
| 3.20.7 | Cámara, preset, velocidad, cámara en mano, focal, zoom, separación, POI, capas ocultas y nombre marcan `isDirty` (la animación nunca); `INIT_CINEMA_VIEW` no marca |
| 3.20.8 | HQ ×2 escala el patrón de grano de la tinta (`shapePattern`) y el temblor de Stop Motion; a S = 1 la vista no cambia ni un píxel |
| 3.20.9 | Abrir un proyecto (`.dior` o autoguardado) ya no pisa su cámara de CINEMA con los valores por defecto: `cinemaViewInitialized` |
| 3.20.10 | Los valores por defecto de CINEMA rellenan huecos **campo a campo** (`cinemaViewSet`): la escena de ejemplo conserva su preset *yoyo*; regla general en CLAUDE.md |

**Pendiente de Moisés (iPad):** ver §10.

## 7 · Riesgos técnicos de la fase de composición (todo esto es núcleo del pipeline: GO + Opus)

DRAW y CINEMA ya ejecutan el **mismo `renderFrame`** (offCtx, fase 3, transferencia a `ctx`). Lo único que deja los FX fuera de DRAW
es la puerta `fxEnabled = isCinematic && fxMasterEnabled` (`renderPipeline.ts`, arranque de `renderFrame`), de la que cuelga también
Super Riso (`superRiso = fxEnabled ? superRisoLoaded : null`). No hace falta una composición nueva; hay que abrir la puerta FX a FX.

1. **Puerta por FX y por modo** en lugar de la puerta única. En DRAW, DoF calcularía desenfoque por capa con `fxFocusDist = 800`
   fijo y la niebla por profundidad: hay que **cerrarlos de forma explícita**, no basta con no mostrarlos en el panel.
2. **Puerta de gesto/reposo.** No exige refs nuevos: `rc.isDrawing`, `rc.transformState.isActive` y `state.drawingZoom/drawingPan`
   ya están en el RenderContext. La rueda no tiene evento de fin: la cubre un temporizador. **Reutilizar la detección de gesto del
   autoguardado** (`useAutoSave.ts`: pointers + touches + rueda en `window`, en captura): extraerla a un módulo compartido en vez de
   duplicarla. Arrastrar un slider de FX **no** es un gesto (decisión 4).
3. **Congelados:** grano (offset fijo), grunge (paso fijo), Super Riso (tick 0, `seedTickFor`).
4. **Papel cebolla:** los fantasmas se componen en offCtx **antes** de las capas, así que Super Riso los imprimiría y el resplandor
   los haría brillar. Ver §8.
5. **Super Riso en DRAW = retener siempre en reposo, en todos los niveles.** Si no, en escritorio el motor corre en cada RAF
   (3–5 ms de GPU a 1366–1920) para una imagen fija. En DRAW basta el camino «refinado» (nivel completo, res 1, `STILL_MS = 300`);
   el nivel *preview* a .75 sobra y la vista coincide con el export. **`applySuperRiso.ts` está a 398/400 líneas: hay que partirlo
   ANTES** (regla dorada 2), sin cambiar comportamiento (0 px de diferencia en CINEMA). El gancho `beginSuperRisoFrame` antes de la
   fase 1 y la ranura `applyRisoV2` de la fase 3 están protegidos: no mover, envolver ni reordenar (CLAUDE.md).
6. **El RAF de DRAW recompone todas las capas en cada frame aunque nada se mueva** (`StrataCanvas.tsx`, bucle RAF). Con resplandor o
   aberración en reposo es coste sostenido y calor en el iPad. La solución de fondo (cachear el frame final en reposo) es núcleo del
   RAF: **medir primero en iPad (F4)**.
7. **Export PNG de DRAW** (`exportHandlers.ts`, `renderDrawSnapshot`): ya re-renderiza con `renderFrame` y el estado tal cual, así que
   al abrir la puerta los FX entran solos con fondo **papel**. Problemas: (a) **liso y transparente** se reconstruyen desde el buffer
   de capas (`layers`), y se pierden viñeta, grano, grunge y aberración, que viven en `ctx` **después** de la transferencia → un
   override de fondo dentro de `renderFrame` (campo nuevo del RenderContext: GO); con transparente solo sobreviven los FX del buffer
   (resplandor, pixel art, Riso antiguo) y **con Super Riso, transparente se desactiva**; (b) **semillas** de grano, grunge y
   reimpresión fijas e iguales en vista y export (el patrón de grano de tinta ya no se regenera distinto por escala desde 3.20.8,
   pero sigue siendo aleatorio por instancia).
8. **Pixel Art:** ver §3 (cámara de DRAW sin cuantizar).
9. **Distorsión, DoF, niebla, partículas, Stop Motion:** cerradas en DRAW (puerta explícita).

## 8 · Papel cebolla: el coste que Moisés pidió (decisión 2)

Hoy los fantasmas se renderizan en offCtx antes del bucle de capas (`renderPipeline.ts`, bloque «Onion skin», con
`ONION_ALPHA_PREV 0.40` / `NEXT 0.22`) y la capa activa se compone encima a opacidad completa.

- **Opción A (decisión de Moisés): fantasmas por encima de los FX, sin FX.** Después de la transferencia (y de los FX globales),
  renderizar los fantasmas en offCtx (libre tras la transferencia) con la misma alpha y transferirlos a `ctx` con el mismo operador
  (`multiply` en claro, `source-over` en oscuro) **antes de la fase 4** (gizmo, simetría, rejilla). Coste de código: mover un bloque de
  ~15 líneas y una transferencia extra en el núcleo de `renderFrame` (**GO explícito**, validación visual de Moisés); coste de
  ejecución: una pasada a pantalla completa por fantasma (≤ 2) solo mientras el papel cebolla está activo. **Cambio visual:** los
  fantasmas pasan de ir *bajo* la capa activa a ir *sobre* ella (con `multiply` en claro se lee bien; en oscuro con `source-over`
  los fantasmas aclaran la tinta de la activa): hay que mirarlo en los dos temas.
- **Plan B (si A no convence): FX apagados mientras el papel cebolla está activo.** Una condición en la puerta de FX de DRAW
  (`fxEnabled &&= !(isAnimationMode && isOnionSkinEnabled)`): una línea, sin riesgo visual, y coherente con «los FX no se ven mientras
  editas». Coste de usuario: no se ve el acabado mientras se anima con papel cebolla.
- **Recomendación:** implementar **B primero** (una línea, desbloquea el prototipo) y probar A como mejora en F1/F3 con capturas; el
  export ya fuerza `isOnionSkinEnabled = false`.

## 9 · Fases y estado

| Fase | Qué | Riesgo | Modelo | Estado |
|---|---|---|---|---|
| **F0** | Persistencia y bugs de layout/HQ (§6) | Bajo | Sonnet | **HECHA** (3.20.2–3.20.10) |
| **F1** | Prototipo tras flag oculto (`?drawfx=1`): (a) partir `applySuperRiso.ts` sin cambiar comportamiento; (b) inspector de dos caras + tarjetas + acordeón de Super Riso + paleta plegable con la cara FX; (c) disponibilidad por FX en DRAW + puerta de gesto/reposo + congelados + retención de Super Riso + Pixel Art sin cámara cuantizada. Sin el flag, byte-idéntico. **Capturas a 1180×820, 820×1180, 1366×1024 y 1024×1366 con 0, 2 y 6 FX, y Super Riso en cada una de sus tres técnicas.** Juzga Moisés sobre las capturas | Alto: puerta del pipeline, gancho protegido de Super Riso, papel cebolla | Opus, con GO e impacto por escrito | **SIGUIENTE** |
| **F2** | Revelado con fundido, comparar (pulsación larga + `\`), overscroll, palma | Medio | Sonnet | pendiente |
| **F3** | Export PNG de DRAW con FX: override de fondo en `renderFrame`, semillas fijas, reglas de transparente. Verificar vista contra export píxel a píxel con el grano sembrado | Alto (forma del RenderContext) | Opus, con GO | pendiente |
| **F4** | Ronda de medición en iPad: un solo push con variantes tras `?srdebug=1`: las 3 técnicas de Super Riso en DRAW, tiempo de los mapas de Stencil, coste sostenido de resplandor y aberración en reposo (decide F5) | Lo que diga el iPad | Sonnet; la ejecuta Moisés (pestaña privada) | pendiente |
| **F5** | Caché del frame final en reposo — solo si F4 lo pide | Alto (núcleo del RAF) | Opus, con GO | condicional |
| **F6** | Cierre: i18n, docs (§10, §14, ux-debt), quitar el flag, publicar | Bajo | Sonnet | pendiente |

Rendimiento en iPad (de `docs/super-riso.md`): Riso a res 1 ≈ 38 ms de GPU + 19–24 ms de subida síncrona sin canalizar ≈ 60 ms **una
sola vez**; en DRAW eso es un frame tras soltar el gesto, no un problema de fps. Fotocopia y Stencil **sin medir en iPad** [POR MEDIR]:
Stencil calcula mapas en CPU a 3072 px más el campo de spray (~150 ms la primera vez en escritorio).

## 10 · Lo que Moisés tiene que probar en el iPad (tras el push de F0)

1. Mandar la PWA a segundo plano tras ajustar un FX, volver y comprobar que el ajuste sigue (autoguardado en `visibilitychange`).
2. Dibujar con pausas de un par de segundos: ningún tirón al empezar el siguiente trazo (autoguardado fuera de gesto, 3.20.6).
3. Export HQ con grano y con Stop Motion: el grano de la tinta y el temblor deben verse como en pantalla (3.20.4 y 3.20.8).
4. Que la CameraBar vertical (820×1180 y 1024×1366) y el panel de FX (1180×820) no se solapen con nada.
5. [POR MEDIR] Coste del clon estructurado del autoguardado en el iPad con una escena grande (35–50 ms en escritorio con 2 369
   formas): si se nota, moverlo a un worker o espaciarlo.

Recordatorio (CLAUDE.md): Moisés solo prueba en el iPad lo que ya está en producción; el SW de la PWA sirve la versión cacheada hasta
que se acepta el toast «Recargar»; una pestaña privada de Safari no hereda la caché.

## 11 · Cómo se midió (para repetirlo)

- **Alturas de paneles:** `getBoundingClientRect` de los `div` con `position: absolute|fixed` y `z-index ≥ 50`, con el viewport
  emulado (`resize_window` 1180×820, 1366×1024, 820×1180, 1024×1366). Tras cambiar de tamaño hay que **remontar la UI**
  (`TOGGLE_UI` dos veces): la emulación no siempre dispara el `matchMedia` del CameraBar.
- **Estado de la app desde la consola:** subir por el fiber de React desde `[data-drawing-canvas]` hasta el `value` del contexto
  (`{ state, dispatch }`) y despachar acciones reales (`TOGGLE_FX`, `SET_SUPER_RISO`, `SET_MODE`...).
- **HQ real:** importar `exportHandlers.ts` con **la URL exacta** de `performance.getEntriesByType('resource')` (un `import()` por
  ruta desnuda carga una segunda instancia y `setNextPNGQuality` no llega a la de la app), `setNextPNGQuality('hq')`,
  `REQUEST_EXPORT 'png'`, y capturar el blob parcheando `URL.createObjectURL`. **Bloquear la descarga** parcheando
  `HTMLAnchorElement.prototype.click` para los `<a download>`: si no, el navegador abre diálogos de guardado al usuario.
- **Texturas:** diferencia «con efecto − sin efecto» del mismo render y autocorrelación horizontal (lag-1/2/4) o, sobre una ventana
  plana de tinta, paso alto de luminancia; HQ reducido ×2 debe parecerse a la vista. **Stop Motion:** `wiggleFrame` es 0 en el export
  (determinista); desplazamiento por correlación de teselas con la luminancia suavizada (el grano de tinta rompe una correlación
  directa).
- **S = 1 idéntico:** `Math.random` sembrado (mulberry32) + redimensionar el lienzo (regenera ruido y patrón) + hash FNV-1a de todos
  los píxeles, en página recién cargada y con el mismo procedimiento para el código anterior y el nuevo; comparar solo entre
  procedimientos idénticos.
- **Trampas:** la lectura de un canvas justo tras recargar puede devolver ceros o 300×150 (el RAF no ha dimensionado o el panel está
  oculto: una captura de pantalla lo despierta); el grano vivo cambia cada frame (comparar estadísticos, no hashes); un panel oculto o
  estrecho congela el `rAF`.
