# Informe de sesión desatendida — 24 nov 2026

Tres tareas, las tres publicadas. App: v3.26.80 (`f1e3186`) → **v3.26.83** (`a3e9aa4`). Lab: v23.5 (`2adf4e3`) → **v23.8** (`98a4bb5`).

| Tarea | Estado | Versión · commit | CI |
|---|---|---|---|
| 1 · Tests de gestos de Plana | Publicado | v3.26.81 · `437669a` | verde |
| 2 · `pixcheck2` inestable | Publicado | v3.26.82 · `21387ff` | verde |
| 3 · Rotulador (Lab) | Publicado | Lab v23.6 `b2500d6` → v23.7 `ecb4104` → v23.8 `98a4bb5` | servido y comprobado |
| 3 · Rotulador (app) | Publicado | v3.26.83 · `a3e9aa4` | verde |

**Paso 0.** App: `git status` limpio, `main` = `origin/main` (`f1e3186`, v3.26.80), `npm test` 725 en verde. Lab: la carpeta `lab\` NO es un repo; solo lo es `lab\web` (`DrKlanes/super-riso`, GitHub Pages, `2adf4e3`, v23.5, limpio y al día). `Desktop\diorame-riso-lab` ya no existe.

---

## Tarea 1 — Tests de gestos (v3.26.81)

- `flat/touch1/pan/second-finger-lands/pinch-takes-over` y `flat/pen/pan/palm-lands/pan-not-reseeded`, en `tests/helpers/handlerScenarios.ts` y en la referencia, generados con `--rev HEAD` (handlers de v3.26.80, sin tocar `src/`).
- Los 137 previos, idénticos (comparación JSON caso a caso). 139 escenarios; un ancla legible nueva en el test. `npm test` 728.
- **Decisión mía:** el generador pisaba la línea de procedencia de la referencia; restauré la original y le añadí la nota de los dos nuevos.
- **Hallazgo, sin tocar** (`docs/ux-debt.md`, S3): durante un pan, `handlePointerMove` y `handlePointerUp` no miran el `pointerId`. Si la palma emite `pointermove` o se levanta antes que el Pencil, movería o terminaría el pan. Leído en el código, no medido. [POR CONFIRMAR en iPad]

## Tarea 2 — `pixcheck2` (v3.26.82)

- **Causa [VERIFICADO], reproducida a voluntad:** `Math.random` es global, y los dos casos del Move hacían `await import()` entre la siembra y el render. Ese `await` cede el hilo al RAF de la app viva, que con CINEMA animando consume la secuencia sembrada (~60 llamadas/s medidas). Con la app en reposo en DRAW: 4 pasadas a 0 px. Con la escena de ejemplo en CINEMA, el arnés SIN tocar: `draw-move-preview-ex` 591 244 px.
- **No era** el backend GPU/CPU (la hipótesis registrada), ni estado residual, ni cachés, ni otros arneses ejecutados antes (probados uno a uno).
- **Arreglo, solo en `tools/`:** el import sale del bucle; las fuentes se cargan antes del primer render (los casos de texto pintaban la fuente de reserva en la 1.ª pasada: 138 585 px). Misma trampa en `flatcheck.js` · `__diorRenderHash`, arreglada con un render de calentamiento.
- **Criterio:** `before` + tres `after` seguidos en la misma página, con la app animando: 7/7 a 0 px. Fallo plantado (`lineTo` +0,5 px): cazado (8 704–23 980 px); retirado: 0 px.
- Regla nueva en `CLAUDE.md` «Verificación», junto a la de limpieza de temporales que pedías.

---

## Tarea 3 — Rotulador

### 3.0 · Dónde vive cada cosa

- **Fuente canónica del Lab:** `Diorame\lab\tools\studio\` (`shaders.xerox.js`, `engine.studio.js`, `ui.src.html`). Sin control de versiones. Estaba en v23.5.
- **Publicación:** `lab\web\` es el repo; `index.html` es la página entera. `tools\publish-web.ps1` (acceso directo «Publicar Super Riso») hace commit y push.
- **`build.py` no corre en este equipo** (rutas `/home/claude/w/`). Las fuentes están literalmente dentro de la página publicada, así que monté cada versión sustituyendo texto por texto en `index.html` y comprobé que cada fuente y cada trozo de `ui.src.html` aparece literal en el resultado.
- **Port en app:** `src/components/strata/canvas/superRiso/shadersXerox.ts` y `xeroxEngine.ts`.

### 3.1 · Causa (definitiva)

Tres causas apiladas, no una:

1. **La escalera.** El rotulador cortaba cada trazo donde un campo de zona cruzaba su umbral (`strokes()`, `eP`/`eM`). Ese campo era el voto de `FS_XID` —binario, a ¼ de resolución—, desenfocado a ¼ (`xeroxEngine.ts`, «mask H/V») y leído con interpolación bilineal (`mkA`). El contorno de un campo así copia la rejilla: escalones de un texel = 4 px de salida. Lab: `engine.studio.js` l. 116–118 y `shaders.xerox.js` `strokes()`; app: `xeroxEngine.ts` l. 81–87 y `shadersXerox.ts` l. 111–119 (numeración de v3.26.82).
2. **El halo junto al negro.** Los texels de borde (color mezclado con negro) no pasaban la regla de color de `idAt()` y se quedaban sin identidad: el campo se retiraba un texel y dejaba una franja de papel.
3. **El halo entre dos colores.** No era la máscara: era el modelo de trazo. Las salidas rápidas se deshilachan con huecos de papel y cada color se funde a media tinta justo en la frontera. Contra el papel es un gesto; contra otro color se lee como halo.

### 3.2 · Arreglo

- **`FS_XEDGE`** (pasada nueva, solo rotulador): la zona a resolución completa. Cada píxel toma la etiqueta de los texels a ¼ vecinos cuyo color se parece al suyo, no pinta el papel y lleva peso 0 donde el original es negro seguro.
- Ese campo se desenfoca los mismos 0,8 mm, pero a resolución completa y por etapas. `strokes()` lo lee normalizado por el peso (`mkF`): el color llega por debajo del negro.
- **La máscara a ¼ solo decide QUÉ rotulador pinta.** Ningún borde visible la lee.
- Contra la zona de OTRO rotulador el trazo no se deshilacha ni se rompe y los dos colores se pisan 0,15 mm. Se decide por trazo y se apaga con el Descuido (`1 − Descuido`).
- (b) La irregularidad orgánica ya existía en el fin de trazo (ruido de valor a 1,1 mm en coordenadas de hoja, ±0,07–0,17 mm según Descuido). No añadí otra.
- (d) GLSL nuevo sin `break` ni derivadas; todos los uniforms fijados, también `uFA`/`uFB` cuando pinta la acuarela.
- Acuarela, Riso, Stencil y Fotocopia sin color: idénticos por hash, en Lab y en app.

### 3.3 · Métrica (guardia permanente)

Hoja de prueba fija, «Fanzine a rotulador», semilla fija, comparada con la misma hoja supermuestreada ×4. Borde y escalera en px; halos en % del contacto, con Descuido 0.

**Lab** (`lab\tools\measure\marker-edge.js` + `.html`) — límites 0,32 / 0,2 / 3 / 4,5:

| Caso | v23.5: borde / escalera / halo negro / halo color | v23.8 |
|---|---|---|
| diorame-3.8 | 0,728 / 0,501 / 6,2 / 7,8 — FALLA | 0,171 / 0,078 / 0 / 2,3 — PASA |
| lofi-1.9 | 0,749 / 0,094 / 10,3 / 9,5 — FALLA | 0,225 / 0,043 / 0,3 / 2,9 — PASA |
| lab-7 | 0,504 / 0,331 / 8,9 / 7,0 — FALLA | 0,155 / 0,053 / 0 / 2,1 — PASA |
| 300ppp-11.8 | 0,360 / 0,402 / 9,4 / 16,7 — FALLA | 0,131 / 0,128 / 0 / 1,4 — PASA |

**App** (`tools/draw-stress/harness/markeredge.js`, `await __markerEdgeCheck()`):

| Caso | v3.26.82 | v3.26.83 | Límite |
|---|---|---|---|
| cinema-normal | 1,108 / 0,361 / 9,2 / 40,5 — FALLA | 0,288 / 0,186 / 0 / 0,9 — PASA | 0,32 / 0,2 / 3 / 4,5 |
| plana-normal | 0,968 / 0,429 / 11,2 / 34,5 — FALLA | 0,249 / 0,121 / 2,0 / 0,4 — PASA | |
| cinema-png-hq2 | 1,105 / 0,365 / 9,3 / 40,5 — FALLA | 0,288 / 0,190 / 0 / 0,9 — PASA | |
| cinema-lofi | 0,982 / 0,284 / 11,8 / 41,2 — FALLA | 0,349 / 0,155 / 3,0 / 2,4 — PASA | 0,45 / 0,2 / 8 / 4,5 |
| plana-lofi | 0,968 / 0,431 / 16,5 / 35,3 — FALLA | 0,335 / 0,158 / 1,7 / 1,5 — PASA | |
| plana-preview | 1,055 / 0,141 / 9,3 / 35,9 — FALLA | 0,352 / 0,059 / 6,3 / 0,7 — PASA | |

Lo que hay que saber de estos números:

- **Lo-fi y modo ligero se miden en px de simulación** y tienen límites más anchos: ahí el píxel simulado es mayor que el de salida (46 % y 50 %) y un borde no puede ser más fino que su píxel. Es una decisión mía.
- **Margen estrecho:** la escalera de los dos casos de CINEMA a resolución normal queda en 0,19 con límite 0,2. Antes era 0,36.
- **`plana-preview` no pasa por el camino vivo:** `?srlevel=preview` solo existe en vivo, así que el arnés conduce el motor con ese mismo modo (res .5 + variantes ligeras) sobre la vista plana.
- El halo junto al negro en modo ligero queda en 6,3 % (antes 9,3 %): la banda de contacto mide ~1 px simulado.

### 3.4 · Criterios del Lab

| Criterio | Resultado |
|---|---|
| Métrica | v23.5 falla 4/4; v23.8 pasa 4/4 |
| Acuarela / Fotocopia sin color / Riso / Stencil idénticos | mismo SHA-256, a 3,8 y a 7 px/mm |
| Publicado y servido | `super-riso.dumaker.com` sirve `LAB_VERSION='v23.8'`, con `FS_XEDGE`; la página servida es idéntica a `lab\web\index.html` |

### 3.5 · Criterios de app

| Criterio | Resultado |
|---|---|
| Diff exacto de shaders | los 7 cuerpos `FS_X*` idénticos byte a byte a `shaders.xerox.js` |
| Métrica en CINEMA, Plana y PNG HQ | 6/6 (antes 0/6) |
| `pixcheck` / `pixcheck2` | 7/7 y 7/7 a 0 px |
| `flatcheck` | 7/7, `pass: true` |
| `__cinemaHash` | 10/10 a 0 px |
| Super Riso que no es Fotocopia + Rotulador | `__superRisoHash` 18/18 idénticos (Riso, Riso Fanzine, Stencil, Acuarela, Flyer, Foto × CINEMA, Plana, HQ ×2) |
| `dior-render.js` | `__diorRenderHash` mismo SHA-256; el chunk `diorRender` del build es idéntico al de producción salvo los nombres con hash |
| `npm test` / typecheck / build | 728 / verde / verde |
| CI | verde |

### 3.6 · Imágenes

`app/docs/media/marker-edges/` (antes | después, con dos recortes ×4 cada una): `lab-hoja-de-prueba.png`, `lab-escena-de-ejemplo.png`, `diorame-cinema-hoja.png`, `diorame-plana-hoja.png`, `diorame-cinema-escena.png`, `diorame-plana-escena.png`. Tabla de medidas en su `README.md`.

### Decisiones que tomé yo

1. **Tres versiones del Lab en una tarde (v23.6, v23.7, v23.8).** La v23.6 quitaba la escalera y el halo junto al negro. El halo entre colores solo se vio al portar a app, y su arreglo necesitó dos pasos. Las tres están publicadas; la buena es la v23.8.
2. **La identidad sigue siendo la del voto de siempre.** Probé decidir la zona a 1:1 con una regla de color propia y lo descarté: en la escena de ejemplo el cielo claro se quedaba sin pintar y el grano del relleno abría huecos.
3. **El desenfoque del campo de borde es 0,8 mm físicos, sin mínimo en px.** Con el mínimo de 6 px (el equivalente a los 1,5 texels de v3.20.1) el borde volvía a depender de la resolución (borde 0,50 en vez de 0,17). Consecuencia: a baja resolución el rotulador redondea menos que antes y respeta más detalle pequeño.
4. **El solape entre colores es de 0,15 mm.** Con 0,25 el filo oscuro donde se pisan era demasiado visible.
5. **No toqué la irregularidad orgánica** (ya estaba) ni el desplazamiento del color por Descuido.
6. **`_build0`, `_build1` y `scratch_del.txt`** ya estaban en `Diorame\` al empezar y no eran míos: ver «Carpeta madre».

---

## Reversión

**App** (deshace solo el Rotulador; las tareas 1 y 2 se quedan):

```powershell
git -C C:\Users\Usuario\Desktop\Diorame\app revert --no-edit a3e9aa4
```

```powershell
git -C C:\Users\Usuario\Desktop\Diorame\app push origin main
```

El revert devuelve `version.ts` a 3.26.82: antes de subirlo conviene pedirle a Claude el bump a 3.26.84 y su tag, como en cualquier commit.

**Lab — web publicada** (vuelve a v23.5):

```powershell
git -C C:\Users\Usuario\Desktop\Diorame\lab\web revert --no-edit 98a4bb5 ecb4104 b2500d6
```

```powershell
git -C C:\Users\Usuario\Desktop\Diorame\lab\web push origin main
```

**Lab — fuentes** (no están en git; el diff guardado las restaura, probado al revés byte a byte):

```powershell
git -C C:\Users\Usuario\Desktop\Diorame\lab\tools\studio -c core.autocrlf=false apply -R -p1 --unsafe-paths xerox-v23.5-a-v23.8.diff
```

```powershell
(Get-Content C:\Users\Usuario\Desktop\Diorame\lab\tools\studio\ui.src.html -Raw -Encoding UTF8) -replace "· v23\.8</span>","· v23.5</span>" -replace "LAB_VERSION='v23\.8'","LAB_VERSION='v23.5'" | Set-Content C:\Users\Usuario\Desktop\Diorame\lab\tools\studio\ui.src.html -NoNewline -Encoding UTF8
```

Ojo con el último: PowerShell 5.1 escribe UTF-8 con BOM. Si se revierte el Lab, mejor que lo haga Claude con el mismo método de sustitución que usó para montarlo.

---

## Qué mirar a ojo

En `diorame.dumaker.com`, versión **3.26.83** en pantalla, escena de ejemplo → Cine → FX › Super Riso › Fotocopia › «Fanzine a rotulador»:

1. **Bordes del rotulador contra el papel**, en CINEMA y en Plana, ampliando: sin escalones de bloque.
2. **Color contra negro:** el color debe llegar hasta la línea, sin franja de papel.
3. **Dos colores que se tocan, con Descuido a 0:** sin línea blanca; un filo algo más oscuro donde se pisan. ¿Te convence ese filo o lo quieres más fino?
4. **Descuido por defecto (0,55):** los huecos y el color descolocado deben seguir ahí. Eso no lo he tocado.
5. **El aspecto general del rotulador a resolución normal:** ahora redondea menos y pinta detalles pequeños que antes se perdían (los tréboles verdes junto a la bruja, las alas de la abeja). Es el cambio de aspecto más discutible.
6. **Acuarela, Riso y Stencil:** deben verse exactamente igual que ayer.
7. **Lab** (`super-riso.dumaker.com`, v23.8): lo mismo con tu ilustración, y a 300 ppp.

**En iPad** (pestaña privada o aceptar «Recargar»; confirmar 3.26.83 en pantalla):

1. **Fluidez de Fotocopia + Rotulador en movimiento.** Son tres pasadas nuevas a tamaño completo y **no las he medido en iPad**. Es el riesgo real de esta versión.
2. El borde en modo ligero (en movimiento) y al refinar en reposo.
3. De la tarea 1: Plana, pan con el Pencil y la palma apoyada (hallazgo S3).

---

## Carpeta madre

Estado final de `C:\Users\Usuario\Desktop\Diorame\`: `app`, `lab`, `landing`, `motion` **y `scratch_del.txt`**.

- Al empezar había además `_build0\` y `_build1\` (dos carpetas vacías) y `scratch_del.txt` (578 bytes, 16 nov). Ninguno era mío.
- **Quité las dos carpetas vacías** (no contenían nada; se recrean con un `mkdir`).
- **No borré `scratch_del.txt`:** no lo creé yo. Contiene una lista de 45 nombres de componentes (`accordion.tsx` … `tooltip.tsx`), nada más. Decide tú; si sobra, es un `Remove-Item`.
- Así que la confirmación literal «solo app, lab, landing y motion» **no se cumple por ese archivo**.

Mis temporales (servidores locales, capturas, copias de las fuentes, scripts) vivieron en el scratchpad de la sesión y están borrados; los tres servidores locales, parados. No creé ningún `.claude\launch.json` en la carpeta madre: el servidor de desarrollo se arrancó desde `app\`. Sin stashes ni worktrees pendientes en `app`; `lab\web` limpio y al día.
