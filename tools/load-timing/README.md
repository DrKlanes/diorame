# tools/load-timing — carga en frío/caliente, actualización del SW y puente Diorame → Lab

Medición reproducible en un Chrome real (headless, perfil propio y desechable), creada en la sesión del 25 nov 2026
(`docs/session-report-2026-11-25.md`). Nada aquí toca el perfil de Chrome del usuario.

## Montaje

`puppeteer-core` no es dependencia de la app. Se instala en una carpeta temporal y los scripts se lanzan **desde ella**
(resuelven `puppeteer-core` desde el directorio actual):

```powershell
mkdir $env:TEMP\lt; cd $env:TEMP\lt; npm init -y; npm i puppeteer-core@24
```

Chrome: `C:/Program Files/Google/Chrome/Application/chrome.exe` (o la variable `CHROME`). Los perfiles (`<profileDir>`)
y los builds de comparación van a la carpeta temporal, nunca dentro de `Diorame\`.

- `serve.mjs <port> <dir>` — servidor estático que imita GitHub Pages (`Cache-Control: max-age=600`, ETag/304, Range/206).
  `GET /__deploy?dir=<ruta>` cambia la carpeta servida (un deploy simulado); `GET /__stale?file=<ruta>` sirve esa copia
  de `dior-render.js` solo para la URL desnuda (lo que haría una caché vieja; un `?v=` llega al archivo real);
  `GET /__log` devuelve y vacía el registro de peticiones.
- `measure.mjs <url> <profileDir> [--throttle=Mbps] [--wait-update] [--verbose]` — una carga: ms hasta el lienzo, el póster,
  el vídeo reproduciendo, el logo, el aviso de versión nueva; MB de red de la página y del service worker; fallos.
  Mismo perfil = carga en caliente; perfil nuevo = en frío. `Math.random` sembrado: siempre el mismo vídeo de bienvenida.
- `staleopen.mjs <url> <profileDir> <dirSiguiente>` — pestaña abierta (controlada por el SW), deploy, 70 s, cambiar de
  pestaña y volver: ¿aparece el aviso de versión sin recargar?
- `bridge.mjs <url> <profileDir> [--runs=20] [--restart] [--fresh-lab] [--deploy=<dir>@<n>]` — N aperturas reales
  «Exportar › Super Riso ↗» (clic en el botón de exportar a 1366 px, escena de ejemplo): toast de Diorame y lo que
  muestra el Lab. `--restart`: Chrome nuevo por apertura y sin caché de shaders (cada carga del Lab compila sus shaders:
  lo que pasa tras un deploy del Lab que los cambia, en ventana privada o en un equipo nuevo).
  El build de Diorame tiene que apuntar al Lab local: `VITE_SUPER_RISO_LAB_URL='http://127.0.0.1:4175/?diorame=http://127.0.0.1:4173/dior-render.js'`.
- `labstages.mjs <labUrl> <profileDir> [--cold]` — arranque del Lab: `engine`, `ready` y el tiempo dentro de las llamadas
  WebGL de compilación/enlace. `--cold`: sin caché de shaders.

Regla del proyecto: rendimiento solo en A/B alternado, viejo y nuevo en la misma sesión.

## Números del 25 nov 2026 (RTX 5070 Ti, Chrome 158, servidor local tipo GitHub Pages)

| Medida | Antes | Después |
|---|---|---|
| Lab en frío hasta `ready` (`labstages --cold`, 3 rondas) | v23.5 8,05 s · v23.8–23.10 8,65 s (≈7,6 s compilando 19 programas en serie) | v23.11 **1,19 s** |
| Lab en caliente | 0,62 s | 0,58 s |
| Primera apertura tras un deploy del Lab que cambia shaders (caché caliente de la versión anterior) | 6,0–6,6 s | ~1,2 s (como en frío) |
| Diorame → Lab, Chrome nuevo por apertura (`bridge --restart`) | v3.26.87 + v23.10: 9/10 ok, ~10 s cada una | v3.26.91 + v23.11: **20/20**, mediana 3,0 s |
| Diorame → Lab, pestaña del Lab reutilizada (`bridge`) | 20/20, 1,4 s | 20/20, 1,4 s |
| `dior-render.js` viejo en caché + deploy (los chunks a los que apunta ya no existen) | el Lab: «No se pudo cargar el motor de Diorame» | 3/3 ok (reintento sin caché) |
| Compatibilidad cruzada | — | app nueva + Lab v23.10: 6/6 (~10 s); app v3.26.87 + Lab v23.11: 6/6 (3,0 s) |
| Frío a 10 Mbps: logo del modal | 6,55 s | 1,55 s |
| Frío a 10 Mbps: imagen en el panel del vídeo | nada hasta el vídeo (1,8 s) | póster a 1,3 s |
| Frío a 10 Mbps: lienzo / vídeo reproduciendo | 1,08 s / 1,78 s | 1,10 s / 1,80 s (igual) |
| Actualización (SW instalado, deploy, recargar): MB que baja el SW / aviso | 3,7–4,5 MB / 5,05 s | 1,54 MB / 4,9 s |
| Pestaña abierta durante un deploy, volver a ella | el aviso no aparece nunca | aviso a 0,34 s |
| Precache del SW | 4,30 MB (logo de 1,6 MB dentro) | 2,82 MB |
| v3.26.52 frente a v3.26.87, frío a 10 Mbps | lienzo 1,09 s · vídeo 1,80 s en ambas | (sin regresión entre ellas) |
