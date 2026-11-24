# Rotulador, 4.º intento — reproducido y diagnosticado en la app real; arreglo NO publicado

24 nov 2026. Estado: **parado antes del arreglo**, por la regla del encargo («sin una guardia que falle hoy con claridad, no sigas»).
Diorame sigue en v3.26.84 de código (esta versión solo añade este documento) y el Lab en v23.8.

## 1 · Reproducido: sí, por la UI real

Dev server de app (mismo código que producción), flujo hecho con clics sobre los botones reales: escena de ejemplo → Cine →
panel FX → Super Riso → Fotocopia → «Fanzine a rotulador», y captura del **canvas visible**.

- `media/marker-edges-2/cinema-pantalla-almenas-x4.png`: CINEMA, recorte ×4 del canvas visible. Almenas cuadradas en el borde color/papel.
- `media/marker-edges-2/hoja-plana-pantalla.png`: una hoja dibujada con eventos de puntero reales (seis manchas lisas), Plana.
  Izquierda, hoy: escalones cuadrados alineados con los ejes en las manchas verticales y horizontales. Es lo que describe Moisés.
- `media/marker-edges-2/escena-plana-recortes.png`: escena de ejemplo en Plana, recortes ×3.

Diferencias de mi entorno con el de Moisés: `devicePixelRatio` 1 (no pude emular 2), ventana 1366×1024, Chrome de escritorio.
**No lo reproduje en la UI del Lab** en esta sesión: comprobé que `super-riso.dumaker.com` sirve byte a byte la v23.8 local, que lleva
el mismo `FS_XCOLOR`.

## 2 · Camino vivo frente al camino de la guardia de v3.26.83

Instrumenté WebGL (programa, orden, tamaño, destino y filtros de cada textura) en el fotograma que se ve:

`PREP → XLUM → (BLUR×2 → XGEN)×2 → XDIRT → BLUR ¼ ×4 → XID ¼ → XEDGE → BLUR ×4 → BLUR ¼ ×2 → XCOLOR → XCOMP → SCAN → canvas`,
todo a 1240×932 para un canvas de 1366×1024 (simulación al 91 %), salvo lo marcado a ¼ (310×233).

- **Es la misma cadena que midió la guardia** (ruta de exportación): `FS_XEDGE` SÍ corre en vivo, a resolución completa.
- Todas las texturas son LINEAR menos dos NEAREST: la 1×1 en blanco y el **mapa de orientación de 560×420**. Sustituirlo por el
  mapa en blanco en vivo **no quita los escalones**: no es la causa.
- Volqué las pasadas de un mismo fotograma: el voto de `XID` es de bloques (esperado, solo identidad), **el campo de borde de
  `XEDGE` desenfocado sale liso**, y los bloques aparecen por primera vez en la salida de `XCOLOR`.

Por qué pasó la guardia de v3.26.83 y Moisés seguía viéndolo: no era el camino (es el mismo), era **qué medía**. Comparaba con la
misma hoja supermuestreada ×4, y el defecto va en milímetros de hoja: sale igual en la referencia y se cancela. Medía «¿depende de la
rejilla a ¼?», y la respuesta ya era no. La hoja de aquella guardia, además, no tenía manchas alargadas.

Sin medir en esta sesión: tier ligero (`?srlevel=preview`), refinado en reposo y PNG exportado.

## 3 · Causa (demostrada quitándola en la app real)

No es una textura. Es el **modelo de fin de trazo** de `strokes()` en `FS_XCOLOR` (`shadersXerox.ts`; Lab `shaders.xerox.js`), y aparece
cuando el contorno corre **paralelo al trazo** — que es lo normal, porque el rotulador pinta A LO LARGO de las manchas alargadas:

1. `eM = (m − thr) / max(|g|, .025)`: `g` es la pendiente del campo A LO LARGO del trazo. Con el contorno al lado, `g ≈ 0`, el
   divisor cae al suelo de `.025` y `eM` vale ±20 mm. Entra con un 10 % en `eF`/`eB` y es constante en todo el ancho de la pasada:
   cada pasada salta ±2 mm como un bloque rectangular.
2. `g >= 0 ? eF : 1e3`: el signo de ese `g` casi nulo decide qué extremo «da» al contorno. Sale al azar por pasada, y con él si el
   flanco se trata como salida rápida (deshilachado, medido con la distancia al contorno de AL LADO: se come un rectángulo) o como apoyo.

Con trazos verticales u horizontales los bloques quedan alineados con los ejes: las almenas. No depende de Descuido, Resolución,
preset ni Manchas/Huecos, y está igual en el Lab. La acuarela no tiene trazos.

Experimentos (parche del shader al compilar, mismo flujo de UI, Plana):

| Variante | Resultado a ojo |
|---|---|
| Hoy | bloques |
| Mapa de orientación en blanco | bloques |
| Sin `eM` | mejora; quedan escalones |
| Solo quitar la elección por signo de `g` | bloques |
| Sin `eM` + sin elección por signo | liso |
| **Extremo frente a flanco** (abajo) | liso, conserva biseles, deshilachado y banda oscura en los extremos de verdad |

## 4 · Arreglo candidato (probado en pantalla, NO aplicado)

Distinguir por píxel si el contorno CRUZA el trazo (extremo) o corre A SU LADO (flanco), con la pendiente del campo ya calculada (`gp`):

```glsl
// sustituye a: float eF=mix(eM+sk, eP, .9), eB=mix(eM-sk, eP, .9);
float gd=dot(gp,dir), al=abs(gd)/max(length(gp),1e-4), wE=smoothstep(.25,.6,al);   // 1: extremo; 0: flanco
float eC=eP+.1*wE*clamp(eM-eP,-2.,2.);                                              // el bisel, acotado y solo en extremos
float eF=(eC+.1*sk)/max(wE,.02), eB=(eC-.1*sk)/max(wE,.02);
// en la línea de ea/eb: gd en lugar de g
float ea=min(u-s0+sk, gd>=0.? eF : 1e3), eb=min(s1-u-sk, gd<0.? eB : 1e3);
// y el flanco recorta con la distancia real, sin deshilachar:
float eE=min(min(ea,eb), eC/max(1.-wE,.02))+(vnoise(p/.15+fi*2.)-.5)*.06+.15*ct;
```

Sin `break` ni derivadas; no añade lecturas de textura. Coste no medido.

## 5 · Por qué paré: la guardia

Construí la medición sobre el canvas visible por la UI, con una hoja dibujada por puntero. Tres métricas probadas:

| Métrica | Hoy | Con el parche | Veredicto |
|---|---|---|---|
| Esquinas en ángulo recto del borde de tinta (% del borde) | 5,58 – 5,74 | 3,49 | separa 1,6× (1,8× con el mejor ajuste): **no es margen holgado** |
| Tramos planos cerrados por paredes (almenas alineadas a ejes) | 5 | 1 | cuentas demasiado bajas para un umbral |
| Desviación del borde respecto a las elipses dibujadas | — | — | descartada: mi supuesto de dónde cae la hoja en Plana no cuadra |

Sobre la escena de ejemplo ninguna separa (el detalle del dibujo lo diluye todo). Lo que sí separa sin discusión es el ojo: ver
`hoja-plana-pantalla.png`. No publiqué un quinto arreglo apoyado en una guardia que pasa por poco: es exactamente el error de v3.26.83.

**Falta para cerrar:** una métrica que falle con holgura (idea: medir la posición del borde A TRAVÉS del ancho de cada pasada — un
bloque es constante en el ancho y salta entre pasadas —, o sacar la geometría real de la hoja de una captura sin Super Riso), el barrido
completo, el Lab, el coste y el port.

## 6 · Lo que NO es la causa (para no repetirlo)

La máscara a ¼ (ya no pinta ningún borde), filtros NEAREST, el mapa de orientación, el tier vivo frente al de exportación, una copia
cacheada del Lab, el desenfoque, el Descuido.
