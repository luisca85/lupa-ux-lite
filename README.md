# Lupa UX

Herramienta de diagnóstico y evaluación heurística de UX. El código está en
módulos (`src/`) y Vite lo compila a **un solo HTML** (`dist/index.html`). Guarda
los datos en el backend que encuentre disponible:

1. **Servidor**: Cloudflare Pages Functions + base de datos **D1** (SQLite). Es el modo hosteado.
2. **IndexedDB** del navegador: al abrir `dist/index.html` con doble clic o en un hosting estático sin API.

El badge arriba a la derecha indica el modo: `servidor` o `modo local`.

## Estructura

```
index.html                 HTML base (Vite)
src/                       la app en módulos ES (ver docs/architecture.md)
functions/api/[[path]].js  API de documentos sobre D1 (+ validación de Cloudflare Access)
migrations/                esquema SQL de D1
wrangler.toml              configuración de Cloudflare (D1, variables por entorno)
scripts/                   desarrollo, chequeo de sintaxis, smoke test, servidores de test
tests/e2e/                 test de regresión con Playwright
dist/                      salida del build (no se versiona)
docs/                      contexto spec-lite (arquitectura, decisiones, specs)
```

## Requisitos mínimos

- Node.js 20.19 o superior (wrangler está fijado en 4.86.0, que todavía soporta Node 20).
- Una cuenta gratuita de Cloudflare.
- Un repositorio en GitHub.

## Desarrollo local

```bash
npm install
npm run db:migrate:local   # crea la base SQLite local en .wrangler/
npm run dev                # http://localhost:5173 (Vite, recarga en caliente) + API en :8788
```

En local no hay login (`AUTH_MODE="none"`). Verificación:

```bash
npm run check      # sintaxis de src/ y de la API
npm run smoke      # prueba la API (con npm run dev corriendo)
npm run test:e2e   # build + regresión completa en modo servidor e IndexedDB
npm run preview    # build + servir dist/ con la API, como en Cloudflare
```

La primera vez, `npm run test:e2e` necesita el navegador de Playwright:
`npx playwright install chromium`.

## Publicar en Cloudflare (una sola vez)

1. **Iniciar sesión** en Cloudflare desde la terminal (abre el navegador):
   `npx wrangler login`
2. **Crear la base D1**: `npx wrangler d1 create lupaux`.
   Copiá el `database_id` que devuelve y reemplazá `REEMPLAZAR_CON_DATABASE_ID`
   en las **tres** apariciones de `wrangler.toml`.
3. **Crear las tablas** en la base remota: `npm run db:migrate:remote`
4. **Subir el repo a GitHub** y conectarlo: en Cloudflare, *Workers & Pages → Create →
   Pages → Connect to Git*, elegí el repo. Build command: `npm run build`. Build
   output directory: `dist`. Cloudflare lee `wrangler.toml` y conecta D1 solo, y
   toma la versión de Node de `.nvmrc`.
5. **Proteger con Cloudflare Access** (obligatorio: sin esto la API responde 503):
   - *Zero Trust → Access → Applications → Add an application → Self-hosted*.
   - Dominios: `lupa-ux.pages.dev` y `*.lupa-ux.pages.dev` (este último cubre los previews).
   - Policy: *Allow*, regla *Emails* con los correos habilitados. Login por código al email.
   - Copiá el **Application Audience (AUD) Tag** y tu **team domain**
     (`https://<equipo>.cloudflareaccess.com`) en `wrangler.toml`
     (`ACCESS_AUD` y `ACCESS_TEAM_DOMAIN`, en producción y preview).
6. Commit + push. Cloudflare publica solo en cada push a `main`.

Antes de configurar Access, la app muestra "El servidor no está disponible" en vez de
guardar. Es a propósito: la API falla cerrada para no exponer datos de clientes.

## Pasar datos de IndexedDB al servidor

En la pantalla Estudios: **Exportar datos** en la versión local (descarga un JSON) →
**Importar datos** en la versión hosteada. Sirve también como respaldo.

## Límites conocidos

- Cada documento (por ejemplo, una imagen con sus anotaciones) puede pesar hasta ~2 MB, el límite de fila de D1.
  Si una imagen lo supera, la app muestra el error y no la guarda.
- Sin edición simultánea: si dos personas editan el mismo estudio a la vez, gana el último guardado.

## Compartir un diagnóstico con un cliente

Pestaña Reportes → "Generar página para compartir". Baja un HTML autónomo con los datos
y las imágenes adentro, que el cliente abre sin cuenta. Es una foto del momento: si
editás el diagnóstico, generala de nuevo.
