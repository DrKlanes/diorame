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
- `pixcheck2.js` → igual con `__pixcheck2` (CINEMA wiggle y pixel art, vista previa del Move, texto). Hacer una pasada de calentamiento antes (carga de fuentes).
- `alphaleak.js` → `await __alphaLeakCheck()`: autocontenido, sin referencia. Debe dar `pass: true` (fuga de `globalAlpha` del toque en pixel art, v3.25.15).
- `timelapse.js` (v3.25.17) → `await __timelapseCheck()`: debe dar `pass: true` (último frame y frame 30 = PNG de su escena con la misma semilla, 0 px, en ejemplo sólido/papel y 2000×6; capa acoplada: aparición por `t`, pintado por array; una autocomprobación que debe fallar —pintar en orden `t`— y una de estabilidad —sesión re-renderizada sin semilla: 0 px—). Desde v3.25.18 compara con todos los contextos 2D en CPU (`willReadFrequently`) y un papel liso: Chrome elige GPU o CPU por lienzo según su estado y el antialiasing difiere (hasta 61 niveles); la textura real en GPU se informa sin juzgar. Debe pasar también en la primera pasada tras recargar. `await __timelapseTiming()`: 30 s a 1080×1920 de 500×1, 2000×6 y el ejemplo (~3,5 min; con el panel del navegador visible). `await __timelapse()`: tu dibujo en MP4 (ver abajo). La primera llamada tras instalar `mediabunny` puede recargar la página una vez (Vite optimiza la dependencia): volver a inyectar y repetir.

### Ver un timelapse de tu dibujo

En `localhost:3000`, con el dibujo abierto y algún cambio hecho (el comando lee el **autoguardado**), en la consola:

```js
await new Promise(r => { const s = document.createElement('script'); s.src = '/tools/draw-stress/harness/timelapse.js'; s.onload = r; document.head.appendChild(s); });
await __timelapse({ duration: 15, long: 1080, background: 'paper' });
```

Opciones: `framing: 'format' | 'drawing'` (por defecto el marco si hay, si no el dibujo completo), `long: 1080 | 1920`, `duration: 15 | 30 | 60`, `background: 'paper' | 'solid'`, `layer` (capa activa de la proyección; por defecto la del archivo), `source: '/ruta/archivo.dior'` en lugar del autoguardado, `download: false` para solo verlo. Descarga el MP4 y lo reproduce encima de la app (clic fuera del vídeo para cerrar).

La CPU solo se compara en A/B alternado en las mismas condiciones: entre sesiones el equipo puede ir el doble de lento.

