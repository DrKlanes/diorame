# svg-diff — fidelidad del export SVG

Mide cuánto se parece el SVG exportado al render de Canvas, en píxeles.

1. `npm run dev`
2. Abrir `http://localhost:3000/tools/svg-diff/`
3. La tabla de casos sintéticos (T0–T9) se calcula sola. Para una escena real, cargar su `.dior` con el selector.

La columna que importa es **px distintos (estructural)**: píxeles en los que Canvas y SVG
discrepan sin que haya un píxel coincidente a 2 px — el antialias de los bordes no cuenta.
Verde (≤10 px) = fiel. Rojo en las imágenes = tinta que solo está en el SVG; azul = tinta que
solo está en Canvas.

Pasar la tabla antes y después de tocar `exportAsSVG` (`src/components/strata/canvas/exportHandlers.ts`).
Detalle técnico en `src/REFERENCE.md` §10 «Dev Tools».
