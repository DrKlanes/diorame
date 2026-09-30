# svg-diff — fidelidad del export SVG

Mide cuánto se parece el SVG exportado al render de Canvas, en píxeles.

1. `npm run dev`
2. Abrir `http://localhost:3000/tools/svg-diff/`
3. La tabla de casos sintéticos (T0–T9) se calcula sola. Para una escena real, cargar su `.dior` con el selector.

La columna que importa es **px distintos (estructural)**: píxeles en los que Canvas y SVG
discrepan sin que haya un píxel coincidente a 2 px — el antialias de los bordes no cuenta.
La columna **máscaras** cuenta `<mask>`/`<clipPath>` en el SVG: debe ser 0 (Illustrator, con Ctrl+Y y Buscatrazos, ignora las máscaras).
Verde (≤10 px y 0 máscaras) = fiel. Rojo en las imágenes = tinta que solo está en el SVG; azul = tinta que
solo está en Canvas.

Pasar la tabla antes y después de tocar `exportAsSVG` (`src/components/strata/canvas/svgExport.ts`).
Detalle técnico en `src/REFERENCE.md` §10 «Dev Tools».

`fixtures/text-legacy-v3.17.55.dior` — textos guardados antes de `textMatrix` (v3.17.56): cinco fuentes, rotados, multilínea, modo degradado y capas volteadas con el comportamiento antiguo. Debe abrirse y pintarse idéntico; cargarlo aquí con el selector para pasarlo por el export.
