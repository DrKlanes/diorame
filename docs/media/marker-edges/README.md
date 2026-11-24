# Bordes del Rotulador — antes / después (v3.26.83, Lab v23.8)

Cada imagen: izquierda ANTES, derecha DESPUÉS, y debajo dos recortes ampliados ×4 (sin suavizar) de las zonas marcadas.
Mismas entradas, misma semilla, «Fanzine a rotulador» con sus valores por defecto.

| Archivo | Qué es |
|---|---|
| `lab-hoja-de-prueba.png` | Lab v23.5 → v23.8, hoja de prueba de la guardia a 3,8 px/mm |
| `lab-escena-de-ejemplo.png` | Lab v23.5 → v23.8, escena de ejemplo de Diorame (1000 px) |
| `diorame-cinema-hoja.png` | Diorame v3.26.82 → v3.26.83, CINEMA (forward), hoja de prueba, 1000×750 |
| `diorame-plana-hoja.png` | Lo mismo en la vista Plana |
| `diorame-cinema-escena.png` | Diorame, CINEMA, escena de ejemplo |
| `diorame-plana-escena.png` | Diorame, Plana, escena de ejemplo |

Medición (`await __markerEdgeCheck()`, `tools/draw-stress/harness/markeredge.js`; borde y escalera en px de simulación, halos con Descuido 0):

| Caso | v3.26.82: borde / escalera / halo negro % / halo color % | v3.26.83 | Límite |
|---|---|---|---|
| cinema-normal | 1,108 / 0,361 / 9,2 / 40,5 | 0,288 / 0,186 / 0 / 0,9 | 0,32 / 0,2 / 3 / 4,5 |
| plana-normal | 0,968 / 0,429 / 11,2 / 34,5 | 0,249 / 0,121 / 2,0 / 0,4 | |
| cinema-png-hq2 | 1,105 / 0,365 / 9,3 / 40,5 | 0,288 / 0,190 / 0 / 0,9 | |
| cinema-lofi | 0,982 / 0,284 / 11,8 / 41,2 | 0,349 / 0,155 / 3,0 / 2,4 | 0,45 / 0,2 / 8 / 4,5 |
| plana-lofi | 0,968 / 0,431 / 16,5 / 35,3 | 0,335 / 0,158 / 1,7 / 1,5 | |
| plana-preview (modo ligero) | 1,055 / 0,141 / 9,3 / 35,9 | 0,352 / 0,059 / 6,3 / 0,7 | |

Las capturas se generaron con `__markerEdgeShot` y con el motor del Lab montado desde sus fuentes; no hay retoque.
