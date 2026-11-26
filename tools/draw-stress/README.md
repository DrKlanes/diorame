# draw-stress — coste de DRAW con muchos trazos

Mide si DRAW aguanta una sesión larga (grabación gráfica en directo) antes de añadir nada encima.

## 1. Generar las escenas (local, no se suben)

```
node tools/draw-stress/generate.mjs            # → tools/draw-stress/out/ (ignorada por git)
node tools/draw-stress/generate.mjs <carpeta>  # otra salida
```

Diez `.dior`: 500 / 1 000 / 2 000 / 3 500 / 5 000 trazos, en 1 capa (peor caso: todo en la misma
capa) y repartidos en 6. Trazos de pincel por los generadores reales de la app
(`utils/strokeGenerators.ts`): 70 % tapered / 30 % uniform, espinas de 60–150 puntos a ~4 px,
grosor 6–40, tintas de la paleta principal (sin blanco). Semilla fija: la misma escena cada vez.

Ojo: cada trazo tiene ~235 puntos de contorno, ~6 veces los de la escena de ejemplo (41, blobs).
Es deliberadamente pesado. Los contornos van redondeados a 0,01 px: con floats completos (como guarda
la app) el de 5 000 pasaba de 66 MB y el límite de apertura es 50 MB.

## 2. Medir

Abrir la app con `?perf=1` (en el iPad: pestaña privada de Safari para saltarse la caché del SW,
y confirmar la versión en pantalla). Aparece un recuadro arriba a la izquierda:

- **fps** media de los últimos 5 s y **p95** del intervalo entre frames (ms).
- **gaps > 50 ms** desde el último Reset, y el peor. Tirones: autoguardado, GC.
- **formas** y modo.
- **autosave**: duración del clon síncrono del autoguardado (`IDBObjectStore.put`), último y máximo.
  También sale en consola como `[perf] autosave clone …`.

El recuadro usa su propio `requestAnimationFrame`: no toca el bucle de StrataCanvas. Un renderFrame
lento alarga el intervalo que ve.

Por escena: abrir el `.dior` → Reset → 10 s quieto → anotar → Reset → 10 s haciendo pan/zoom con
dos dedos → anotar → Reset → dibujar 10 s con el Pencil → anotar (y el autosave que salga al parar).

## 3. Umbrales

| Escena | Aprobado |
|---|---|
| 2 000 trazos | ≥ 50 fps |
| 5 000 trazos | ≥ 30 fps |

Si fallan: parar y decidir. Las salidas (caché de capas por bitmap, no repintar en reposo) tocan el
bucle RAF / el pipeline: núcleo, GO explícito.

## 4. Arneses de píxel (`harness/`)

Se inyectan en la página de desarrollo (`npm run dev` → `localhost:3000/?perf=1`) con un `<script src="/tools/draw-stress/harness/….js">` y se llaman desde la consola:

- `pixcheck.js` → `await __pixcheck('before')` antes de tocar el render, `await __pixcheck('after')` después: 7 casos DRAW (escena de ejemplo y estrés), 0 px y mismo SHA-256, más CPU antes/después. Necesita las escenas de `generate.mjs`.
- `pixcheck2.js` → igual con `__pixcheck2` (CINEMA wiggle y pixel art, vista previa del Move, texto). Desde v3.26.82 carga las fuentes él mismo y es estable en pasadas repetidas de la misma página, también con la app viva animando en CINEMA (antes su RAF consumía el `Math.random` sembrado durante un `await` del arnés: `docs/ux-debt.md`). Regla para cualquier arnés: nada se espera entre la siembra y la lectura de píxeles.
- `alphaleak.js` → `await __alphaLeakCheck()`: autocontenido, sin referencia. Debe dar `pass: true` (fuga de `globalAlpha` del toque en pixel art, v3.25.15).
- `timelapse.js` (v3.25.17; v3.25.20) → `await __timelapseCheck()`: debe dar `pass: true`. Vídeo de 4 s a 15 fps; frames muestreados (primero, 25/50/75 % del dibujo, último) con la caché por capa y con el re-render completo (`layerCache: false`), uno contra otro y contra el PNG de la escena de cada frame con la misma semilla: 0 px en ejemplo sólido, ejemplo con papel liso y 2000×6; capa acoplada + una capa encima (aparición por `t`, pintado por array): 0 px; autocomprobación que debe fallar (pintar en orden `t`); caso de 3 capas sin `t` (v3.25.24: acoplar 1→0, capa 2 intacta + una forma nueva con `t`; orden esperado `c1 b1 a1 c2 b2 a2 new`, y la autocomprobación con el estampado restringido a las capas acopladas debe dar otro orden) y estabilidad (sesión re-renderizada sin semilla: 0 px). Ritmo por `t` (v3.25.25, `out.pacing`): 60 formas con `t` fabricado (ráfagas, trazos lentos, pausa de 2 h); la pausa vale ≤ 1 s de dibujo, las ráfagas ocupan menos frames por forma que los lentos, los repintados del motor coinciden con la lista de `k`, el último frame es 0 px contra el PNG; autocomprobación con reparto uniforme que debe fallar; ficheros sin `t` (ejemplo, 2000×6) y el caso de 3 capas dan el reparto uniforme de siempre. Compara con todos los contextos 2D en CPU (`willReadFrequently`): Chrome elige GPU o CPU por lienzo y el antialiasing difiere (hasta 61 niveles); la textura real en GPU se informa sin juzgar. `await __timelapseTiming()`: el mismo vídeo de 60 s a 15 fps, lado largo 1920, con caché y sin ella → `speedup` por escena y el ETA a 10/50/90 %. `await __timelapse()`: tu dibujo en MP4 (ver abajo). La primera llamada tras instalar `mediabunny` puede recargar la página una vez (Vite optimiza la dependencia): volver a inyectar y repetir.
- `flatcheck.js` (v3.26.73, vista plana; `docs/flat-view-proposal.md` §7) → `await __flatCheck()`: los 7 casos de `pixcheck` como DRAW y como CINEMA «Plana» con el FX maestro apagado y una cámara de CINEMA descentrada y girada (Plana no debe leerla): 0 px y mismo SHA-256; autocomprobación con `forward` que debe fallar en los 7 → `pass: true`. `await __cinemaHash('before'|'after')`: renders sembrados de CINEMA (forward, orbit, storytelling, arc, zoom con FX y grano apagado, HQ ×2, animación con y sin Z plana, y dos casos de Plana que se informan sin juzgar). `await __diorRenderHash('before'|'after')`: `renderDior` de `dior-render.js` sobre la escena de ejemplo. `await __flatAnimCheck()` (v3.26.76): el mismo cuadrado en 5 capas (5 fotogramas) en Plana + animación con niebla y DoF: los 5 idénticos (sin parpadeo); control `forward` con Z plana idéntico y autocomprobación `forward` con profundidad que debe diferir → `pass: true`; acepta FX extra (`__flatAnimCheck({ distortion: true }, { distortion: 0.8 })`). `await __flatDistortCheck()` (v3.26.80): distorsión de Plana con Formato — el PNG Formato contra el marco en pantalla, 0 px con 0,6 / −0,5 / 1 / 1,6, con sus controles y autocomprobación → `pass: true`; el montaje (Math.random constante, CPU, marco en (0, 0), solo trazos interiores) y por qué, en `docs/flat-view-proposal.md` §13.4.
- `markeredge.js` (v3.26.83, Super Riso › Fotocopia › Rotulador) → `await __markerEdgeCheck()`: debe dar `pass: true` (~1 min, WebGL2). Hoja de prueba fija como escena de Diorame, «Fanzine a rotulador», por la ruta real de exportación en CINEMA y Plana (Resolución .85 y .1), PNG HQ ×2 y nivel «modo ligero», cada una contra el mismo fotograma a renderScale ×4: desplazamiento del borde, escalera al paso de la rejilla a ¼ y halo de papel junto al negro y entre colores. Con el código de v3.26.82 falla 6/6. `await __superRisoHash('before'|'after')`: 18 renders sembrados de todo lo que no es Fotocopia + Rotulador, que no deben cambiar. `await __markerEdgeShot({ view, example, sloppy, superRiso })`: un fotograma para mirarlo. Causa y límites: REFERENCE.md §14. Desde v3.26.104 (Lab v23.17) `fotocopia-acuarela` cambia con el tóner seco: solo esa huella puede cambiar en un port que toque `XGEN`/`XCOMP` con color.
- `g1toner.js` (v3.26.106, la G1 del Lab en la app) → `await __g1Check()` en una página recién cargada (sin cambios sin guardar), viewport 1366×1024 y el panel visible: debe dar `pass: true` (~15 s, WebGL2). Escalones del tóner de Fotocopia con el `stair()` del Lab copiado tal cual (`lab\tools\measure\guards\lib.mjs`): la hoja de tóner del Lab (discos, barras oblicuas, onda; sin los dos anillos: un blob no tiene agujero) como `.dior` con «Flyer punk», Suciedad 0 y Plana, **soltada sobre la ventana** (el manejador real), clic en «Cine» y lectura del **lienzo visible** cuando deja de cambiar; tres desplazamientos de la hoja en lugar de las tres semillas del Lab. `{ dpr }` fija el `devicePixelRatio` que ve la vista (por defecto 1,5). Límite 12 %. Calibrada el 26 nov 2026: v3.26.104 FALLA 13,8–14,0 %; v3.26.105/106 PASA 6,3–6,5 % a DPR 1,5 y 5,1–5,4 % a DPR 2, y FALLA 13,8–14,1 % a DPR 1 (la vista de una pantalla DPR 1 se simula a px de lienzo: `docs/ux-debt.md`). G2, G2 interno, G3 y G4 siguen solo en el Lab.
- `labcompare.js` (v3.26.104, port de Lab v23.18) → `await __cmp({ lab, scene, W, hand, sloppy })`: Fotocopia de Diorame contra el motor del Lab montado desde sus fuentes de un tag, con las MISMAS entradas (imagen, parámetros, mapa de orientación). Residuo esperado 0,001–0,010 de diferencia media (el Lab trabaja por bloques); el cruce con el tag anterior debe salir distinto. Preparación (fuentes servidas con CORS, versión «antes» en :3001): cabecera del archivo.
- `mergedrift.js` (v3.25.28) → `await __mergeDriftCheck()`: autocontenido, sin referencia; debe dar `pass: true`. Acoplar abajo frente al marco de Formato, con el reducer real y la proyección de DRAW: 5 ciclos «capa nueva → trazo por el marco → acoplar» (0 px), cascada 3→0 (≤ 0,4 % de la esquina lejana: residuo de segundo orden), flecha que toca una burbuja de la capa 0 y la esquina del marco (0 px; en cascada, ≤ 0,4 %), y PNG Formato desde la capa 2 = desde la capa 0 (0 px de alfa; el color lleva el grano, cuya celda va en px de `renderScale`, y se informa sin juzgar). Marco centrado y marco desplazado a (400,300). Tres autocomprobaciones que deben fallar: marco en el plano activo, `planeScale` desde la cámara de B y recorte de `format.rect` sin proyectar. En v3.25.27 falla entero (S1 23 / 61 px).

### Ver un timelapse de tu dibujo

En `localhost:3000`, con el dibujo abierto y algún cambio hecho (el comando lee el **autoguardado**), en la consola:

```js
await new Promise(r => { const s = document.createElement('script'); s.src = '/tools/draw-stress/harness/timelapse.js'; s.onload = r; document.head.appendChild(s); });
await __timelapse({ duration: 15, fps: 15, long: 1080, background: 'paper' });
```

Opciones: `framing: 'format' | 'view' | 'drawing'` (por defecto el marco si hay, si no el dibujo completo; `view` = la vista del navegador), `long: 1080 | 1920`, `duration: 15 | 30 | 60`, `fps: 15 | 30` (por defecto 15), `background: 'paper' | 'solid'`, `layer` (capa activa de la proyección; por defecto la del archivo), `source: '/ruta/archivo.dior'` en lugar del autoguardado, `download: false` para solo verlo. Descarga el MP4 y lo reproduce encima de la app (clic fuera del vídeo para cerrar).

La CPU solo se compara en A/B alternado en las mismas condiciones: entre sesiones el equipo puede ir el doble de lento.

