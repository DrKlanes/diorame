# Retomar Fotocopia

**En pausa desde el 25 nov 2026.** Empieza por aquí; no hace falta recordar nada.

## Qué hay publicado

- **Diorame:** el efecto de la **v3.26.102** (la v3.26.103 solo añade documentos). Su Fotocopia es la del Lab v23.16.
- **Super Riso Lab:** **v23.17** ([super-riso.dumaker.com](https://super-riso.dumaker.com/)).
- **Diferencia:** el «tóner seco» cuando hay color a mano (rotulador o acuarela) **está solo en el Lab**. Sin color, los dos se ven con el mismo tóner.

## Cómo está

- **Funciona:** el zoom del Lab (ya no enseña el dibujo borroso), el tóner sin escalones y los tonos medios sin damero.
- **No convence:** el efecto en conjunto; el carácter del tóner; y sobre todo el **dentado del rotulador**, peor en Diorame con Descuido alto y en el Lab con «Zonas que se colorean» alto.

## Lo que ya decidiste

- En B/N, el tóner de v23.16. Con color a mano, el «tóner seco» (V1). Descartadas las variantes V2 y V3.
- Te gustan las texturas que salen donde un color cae justo en el umbral de la **Oscuridad** (idea: un control que acerque los colores a ese umbral).
- Plan general: [las nueve decisiones, propuesta §8](fotocopia-v2-proposal.md#8--decisiones-para-moisés).
- Tableros de variantes (ábrelos con doble clic): [1 · V0–V3](../../lab/renders/tonerv2-tableros/1-variantes-V0-V3.html) · [2 · barrido de Oscuridad](../../lab/renders/tonerv2-tableros/2-V0-V1-barrido-oscuridad.html) · [3 · lo publicado frente a v23.16](../../lab/renders/tonerv2-tableros/3-candidata-color-vs-v23.16.html). V0 es la v23.16. No están en git: solo en este ordenador.

## Al retomar, en este orden

1. Mirar el Lab v23.17 con calma y decidir si el tóner va en buena dirección.
2. Si va bien: llevarlo a Diorame, mirándolo antes en tu ordenador (sin publicar).
3. Fase 4: el rotulador.
4. Ronda de iPad (Diorame y Lab; todo sin medir ahí).

## Dónde está cada cosa

- Plan y estado de las fases: [fotocopia-v2-proposal.md §7](fotocopia-v2-proposal.md) · Pendientes y tu valoración: [ux-debt.md](ux-debt.md), «Fotocopia v2» · Dentado del rotulador: [marker-edges.md](known-issues/marker-edges.md) (§8: plan de la fase 4)
- Informe de la sesión (llega hasta la v23.16): [session-report-2026-11-25-fotocopia-v2.md](session-report-2026-11-25-fotocopia-v2.md) · La v23.17: [README del Lab](../../lab/tools/README.md) · Guardias: [lab\tools\measure\guards](../../lab/tools/measure/guards/README.md)
- Ramas locales del Lab (`lab\tools`, no borrar): `tonerv2-v1`, `tonerv2-v2`, `tonerv2-v3` (las variantes; solo en este ordenador) y `tonerv2-color` (la candidata publicada; su commit ya está en `main`). En `app` hay dos ramas antiguas ajenas a esto: `claude/agitated-euler-cc92a0` y `refactor/handlers`.

## Cómo abrir las sesiones

- **Lab:** carpeta `Diorame\lab\tools`.
- **App:** carpeta `Diorame\app`.
- La carpeta madre `Diorame\`, solo de forma excepcional.
