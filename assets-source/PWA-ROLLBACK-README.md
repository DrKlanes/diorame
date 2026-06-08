# PWA Rollback — Kill-Switch Service Worker

**Cuándo usar esto:** usuarios reportan que la app está rota o pegada en una
versión vieja y **no se actualiza ni recargando**. Síntoma de un service worker
de producción envenenado (sirve precache stale/roto). Este es el procedimiento
de emergencia para limpiar el SW en el campo.

El extintor es `assets-source/kill-switch-sw.js`. NO se despliega en operación
normal. Solo se despliega para apagar el incendio.

---

## Por qué funciona

Los navegadores **siempre** vuelven a pedir el script del SW a la red en el
chequeo de actualización (bypassean el SW para el propio `sw.js`; cache HTTP
máx ~24 h, y GitHub Pages cachea ~10 min). Así que aunque el SW roto controle
todo lo demás, el navegador SÍ verá el nuevo `/sw.js`. Si ese `/sw.js` es el
kill-switch, al activarse borra todas las caches, se desregistra y recarga los
clientes → el dispositivo se auto-cura.

**Clave:** el archivo desplegado debe quedar en la **misma URL/scope** que el SW
roto: `https://diorame.dumaker.com/sw.js`, scope `/`. Si cambia el nombre o la
ruta, el navegador no lo trata como actualización del SW existente.

---

## Procedimiento paso a paso

1. **Confirmar el incendio.** Reproduce en un dispositivo afectado: la app no
   toma la versión nueva tras recargar. DevTools → Application → Service Workers
   muestra un SW activo que no se actualiza.

2. **Crear el hotfix.** En una rama desde `main`:
   - Quita el plugin `VitePWA(...)` de `vite.config.ts` (para que el build NO
     genere su propio `sw.js`).
   - Copia `assets-source/kill-switch-sw.js` a `public/sw.js`.
     (Vite copia `public/*` tal cual a `build/`, así que saldrá publicado en
     `https://diorame.dumaker.com/sw.js` — la misma URL que el SW roto.)
   - Si el registro manual sigue en `src/pwa.ts` / `main.tsx`, déjalo o
     coméntalo; da igual: el kill-switch se auto-desregistra al activar.

3. **Build local + verificar.** `npm run build` y confirma que `build/sw.js`
   contiene el código del kill-switch (NO el de Workbox).

4. **Desplegar.** Merge/push a `main` → GitHub Actions → gh-pages.

5. **Esperar propagación.** Cada cliente, en su próxima navegación (o hasta
   ~10 min por la cache de GH Pages, ~24 h peor caso por la cache del script
   del SW), bajará el nuevo `/sw.js`, lo instalará, borrará todas las caches,
   se desregistrará y recargará. Auto-curación.

6. **Verificar la cura.** En un dispositivo afectado: tras una navegación,
   DevTools → Application → Service Workers debe quedar **sin SW**, y Cache
   Storage vacío. La app carga desde red, versión actual.

7. **Retirar el extintor.** Una vez confirmada la cura, despliega un build
   limpio (sin el `public/sw.js` del kill-switch). Como el kill-switch ya
   desregistró el SW, el dispositivo arranca sin SW; el build limpio
   re-registra desde cero un SW correcto (o ninguno, si se decide pausar PWA).

---

## Notas

- El kill-switch es idempotente: si un cliente ya se curó y vuelve a verlo, no
  hay SW que desregistrar y no pasa nada.
- No depende de la versión de la app ni del estado del precache roto: opera a
  nivel de SW/caches, por debajo de todo lo demás.
- Mantener este archivo y este README en `assets-source/` (fuera de `public/`)
  para que NUNCA se despliegue por accidente en operación normal.
