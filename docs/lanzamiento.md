# Lanzamiento de la beta con cuentas (spec `cta`, fase 4)

Lista de pasos para pasar de Cloudflare Access a cuentas con código por email, y abrir la
beta en tandas de 20, 30 y 50 personas. Todo con planes gratis. Los pasos marcados con 🔑
se hacen en los paneles de Cloudflare o Resend (con tu cuenta).

Orden importante: entre el paso 6 (deploy) y el 7 (migración), la app de producción no
muestra tus datos, porque el código nuevo los busca en `u/{id}/…`. Hacé los dos seguidos.

## 0. Respaldo
- En la app de producción: pie de página → **Exportar datos** (guardá el JSON).
- Copia de la base:
  ```bash
  npx wrangler d1 export DB --env production --remote --output respaldo-prod.sql
  ```
- D1 también tiene Time Travel (restaurar a un momento anterior). Verificá en el panel
  cuántos días cubre tu plan antes de contar con eso.

## 1. 🔑 Resend
- El dominio `uxuaria.com` tiene que estar verificado (ya lo usás para los avisos de
  reserva). `acceso@uxuaria.com` sale de ese dominio; no hace falta crear la casilla, pero
  conviene que las respuestas lleguen a algún lado.
- Plan gratis: 100 emails por día y 3.000 por mes, compartidos entre los códigos y los
  avisos de reserva. Mirá el uso en el panel de Resend antes de cada tanda.

## 2. 🔑 Turnstile
- Cloudflare → Turnstile → **Add widget**. Hostnames: `mutis.uxuaria.com`, `lupaux.uxuaria.com` y
  `lupa-ux.pages.dev` (y el dominio de previews si vas a probar ahí). Modo: Managed.
- Anotá la **site key** (pública) y la **secret key**.

## 3. 🔑 Secretos del proyecto de Pages
En Cloudflare → Pages → `lupa-ux` → Settings → Variables and Secrets, como **secretos**
(no van en `wrangler.toml` porque el repo es público), para Production y para Preview:

| Nombre | Valor |
|---|---|
| `RESEND_API_KEY` | la API key de Resend (ya existe si funcionan las reservas) |
| `TURNSTILE_SITE_KEY` | la site key del paso 2 |
| `TURNSTILE_SECRET` | la secret key del paso 2 |
| `ADMIN_EMAILS` | tu email (o varios separados por coma): sin límites y fuera de los cupos |
| `RESERVA_TO` | donde te llegan tus reservas (ya existe) |

Sin `TURNSTILE_SECRET` nadie puede pedir un código (falla cerrado). Nunca pongas
`AUTH_CODIGO_EN_RESPUESTA` en producción ni en preview.

## 4. Probar en preview
- La base de previews es aparte (`lupaux-preview`): ahí no hay datos reales.
  ```bash
  npx wrangler d1 migrations apply DB --env preview --remote
  ```
- Subí la rama (`git push -u origin construir/cuentas-fase1`) y abrí la URL de preview que
  da Pages. Si Access protege también las previews, quitá esa política para probar.
- Probá: entrar con tu email (código y botón), cerrar sesión, crear 1 estudio, ver que el
  segundo no se puede, y entrar con otro email y ver que no ve lo tuyo.

## 5. Migraciones en producción
```bash
npx wrangler d1 migrations apply DB --env production --remote
```
Crea las tablas `usuarios`, `codigos`, `sesiones` y `espera`. No cambia los documentos.

## 6. Deploy
Mergeá la rama a `main` y hacé push. Pages despliega solo.

## 7. Migrar tus datos a tu cuenta (enseguida después del deploy)
```bash
node scripts/migrar-cuentas.mjs --email TU_EMAIL --remote
```
Usá el mismo email que pusiste en `ADMIN_EMAILS`. El script muestra la cantidad de
documentos antes y después (tienen que coincidir), y si se repite no hace nada.

## 8. 🔑 Quitar Cloudflare Access de la app
- Zero Trust → Access → Applications: borrá la aplicación que protege Mutis UX (y la
  política Bypass de `/api/publico`, que ya no hace falta).
- Entrá a la app: tiene que aparecer **Entrá o creá tu cuenta**. Entrá con tu email y
  verificá que ves tus estudios y que tus links públicos `/r/{id}` siguen abriendo.

## 9. 🔑 Dominio: de `lupaux.uxuaria.com` a `mutis.uxuaria.com`
Hoy producción vive en `lupaux.uxuaria.com`, y los links públicos (`/r/{id}`) que ya
mandaste a clientes usan esa dirección: no hay que romperlos.
1. Pages → `lupa-ux` → **Custom domains** → **Set up a custom domain** →
   `mutis.uxuaria.com`. El DNS de uxuaria.com está en Cloudflare, así que Pages crea el
   registro solo.
2. Probá que `https://mutis.uxuaria.com` abre la app y que un link `/r/{id}` funciona ahí.
3. Redirigí la dirección vieja: Cloudflare → `uxuaria.com` → **Rules → Redirect Rules** →
   regla "Mutis UX: dominio viejo". Cuando el hostname es igual a `lupaux.uxuaria.com`, URL
   dinámica `concat("https://mutis.uxuaria.com", http.request.uri)`, código **301** y
   conservar la query string. Así los links viejos llevan al mismo reporte en el dominio
   nuevo.
4. Dejá `lupaux.uxuaria.com` en Custom domains (la redirección necesita que siga
   resolviendo). Si algún día lo quitás, hacé que el registro DNS siga existiendo con el
   proxy activado.
5. Si Access protegía `lupaux.uxuaria.com`, ya lo quitaste en el paso 8. No lo agregues
   para el dominio nuevo.

## 10. Estudio de ejemplo
- En tu cuenta, armá el estudio de ejemplo sobre una **app inventada** (pantallas hechas a
  propósito, sin capturas de productos reales).
- Buscá su id (en el navegador: `localStorage["lupa:active"]` con el estudio abierto) y
  publicalo:
  ```bash
  node scripts/publicar-ejemplo.mjs --email TU_EMAIL --estudio ID --remote
  ```
- Para actualizarlo, editá tu estudio y volvé a correr el comando. Para quitarlo, agregá
  `--borrar`.

## 11. Tandas
| Cuándo | `MAX_CUENTAS` en `wrangler.toml` (production) |
|---|---|
| Día 1 | 20 (ya está así) |
| Día 3 | 50 |
| Semana siguiente | 100 |

Cambiar el número es un commit y un deploy. Antes de subirlo, mirá en Resend los emails
del día (tienen que quedar lejos de 100) y en D1 el tamaño de la base (tope gratis de
500 MB). Los emails que llegaron con los cupos llenos están en la tabla `espera`:
```bash
npx wrangler d1 execute DB --env production --remote --command "SELECT email, creado FROM espera ORDER BY creado"
```

## 11b. Revisión de seguridad (2026-10-25)
- [x] Link público aislado (iframe con sandbox) y datos normalizados en `SR_boot`.
- [x] Límite de espacio por cuenta (40 MB) y hasta 3 reportes publicados.
- [x] Tope de reservas por link (3 por hora, sin repetir la misma propuesta en 24 h).
- [x] Encabezados de seguridad (`_headers`).
- [ ] 🔑 Rotar la clave secreta de Turnstile y la API key de Resend (aparecieron en capturas).
- [ ] 🔑 Revisar que Cloudflare Pages siga construyendo desde GitHub (Settings → Builds).
  Mientras tanto: `npm run build` y `npx wrangler pages deploy --branch main`.

## 12. Después del lanzamiento
- Quitar el soporte de Access del código: `verifyAccess()`, `AUTH_MODE="access"`, las
  variables `ACCESS_*` de `wrangler.toml` y el logout de Access en `ui/sesion.js`.
- Cuando se acerquen los límites gratis: Resend Pro (US$20 por mes) para más de 100 emails
  por día, y Workers Paid (US$5 por mes) o R2 para las imágenes si la base se acerca a 500 MB.

## Si algo sale mal
- Antes del paso 7: revertí el merge en `main` y volvé a desplegar. Los datos no cambiaron.
- Después del paso 7: el código viejo no encuentra los datos movidos. Restaurá
  `respaldo-prod.sql` (o usá Time Travel) y después revertí el código.
