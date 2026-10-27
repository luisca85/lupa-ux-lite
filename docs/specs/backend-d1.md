# Feature: Backend en Cloudflare (Pages Functions + D1)  ·  id: d1

Historia de usuario: Como quien hostea Mutis UX, quiero que los datos queden en D1
protegidos con login y separados por cuenta, para que estén seguros y respaldados.

Objetivo: que la versión hosteada guarde en una base de datos de servidor, compartida
entre dispositivos y protegida con login, sin reescribir la lógica de la app.

## Criterios de aceptación
- Dado `npm run dev` levantado, cuando se abre la app, entonces arranca en modo
  `server` (badge "servidor").
- Dado el modo `server`, cuando se crean estudios, hallazgos, imágenes con
  anotaciones, flujos, marca o catálogo y se recarga, entonces todo sigue ahí (vive en D1).
- Dado un hosting sin API (archivo local u hosting estático), cuando se abre la app,
  entonces arranca en modo `idb` como antes.
- Dado que `/api/health` existe pero responde error, cuando se abre la app, entonces
  muestra "El servidor no está disponible" con "Reintentar" y NO cae a IndexedDB.
- Dado `AUTH_MODE="cuentas"` (producción y preview desde la spec `cta`), cuando no hay
  una sesión válida, entonces toda ruta de datos responde 401 `{login:true, turnstile}`.
  Con sesión, cada ruta se lee y escribe bajo `u/{idCuenta}/` (`rutaReal`), y una ruta
  que empieza con `u/` o `ejemplo/` responde 400.
- Dado `AUTH_MODE="access"` (hasta el lanzamiento), cuando falta `ACCESS_TEAM_DOMAIN`
  o `ACCESS_AUD`, entonces la API responde 503; sin token o con token inválido, 401.
- Dada una ruta inválida (`..`, cantidad de segmentos incorrecta) o un JSON que no es
  objeto, cuando llega a la API, entonces responde 400.
- Dado un documento de más de ~1,9 MB, cuando se guarda, entonces la API responde 413
  y la app muestra el error como aviso (toast).
- Dada una respuesta que no es JSON (sesión de Access vencida), cuando la app llama a
  la API, entonces avisa "La sesión venció… Recargá la página".
- Dada una cuenta, cuando se usa Exportar datos, entonces baja solo lo suyo (con las
  rutas que usa el cliente) y sus links públicos.
- Dado cualquier backend, cuando se usa Exportar datos, entonces baja un JSON
  `{app:"lupaux",version:1,docs:[{path,data}]}`; Importar datos lo carga en el backend
  activo (reemplaza por ruta).

## Alcance
API de documentos (`health`, `doc` GET/PUT/DELETE, `collection` GET, `export` GET),
validación de acceso (cuentas o Cloudflare Access), tabla `docs` en D1, adaptador HTTP en el
cliente, detección de modo al iniciar y respaldo Exportar/Importar.

## Fuera de alcance / No tocar
- Fuera de alcance (ver "Pendiente / a futuro"): imágenes en R2, control de
  concurrencia, borrado en cascada de flujos al borrar un estudio.
- El contrato de `DB` (collection/doc get/set/delete). `ready` y `dumpAll` son
  opcionales y solo los usan init y el respaldo.
- No saltear `authorize()` en rutas nuevas (excepciones: `/api/publico` y `/api/auth/*`,
  ver AGENTS.md). No poner `AUTH_MODE="none"` ni `AUTH_CODIGO_EN_RESPUESTA` en producción.

## Dependencias
- Cloudflare Pages Functions y D1 (binding `DB`, base `lupaux`), config en `wrangler.toml`.
- Login: cuentas con código por email (spec `cta`: Resend, Turnstile, tablas `usuarios`,
  `codigos`, `sesiones`, `espera`). Cloudflare Access (`ACCESS_TEAM_DOMAIN`,
  `ACCESS_AUD`) queda hasta el lanzamiento.
- `wrangler` (dev, preview, migraciones `db:migrate:local` / `db:migrate:remote` /
  `db:migrate:preview`). Producción usa la base `lupaux`; previews, `lupaux-preview`.
- Capa `store` / `flowStore` / `brandStore` de la app, que habla solo con `DB`.

## Estados (UI)
- Vacío: con D1 sin documentos de la cuenta, la home muestra el estudio de ejemplo (si
  está publicado), la tarjeta "Nuevo estudio" y "Todavía no hay estudios…" (spec `home`).
- Carga: "Cargando tus estudios…" mientras se consultan `/api/health` y los datos, y
  "Abriendo {nombre}…" al abrir un estudio (`vistaCargando`).
- Error: pantalla "El servidor no está disponible" con "Reintentar" si la API falla
  al iniciar; toast con el mensaje del servidor ante errores posteriores (413, 401,
  sin conexión, sesión vencida). Badge "almacenamiento limitado" si no hay ni API ni IndexedDB.

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` ("Todo OK") y `npm run test:e2e` pasan.
- Propio: los criterios de arriba cubiertos por `scripts/smoke.mjs` (API) y por el e2e
  en modo `server`; migraciones nuevas aplicadas con `db:migrate:local` antes de probar.

## Dónde vive
- `functions/api/[[path]].js`: rutas, validación, `authorize()` / `verifyAccess()`.
- `migrations/0001_docs.sql`: tabla `docs`. `0002`–`0004`: cuentas, login y lista de
  espera (spec `cta`).
- `src/data/backend.js`: `makeHTTPAdapter`, `initBackend()`.
- `src/data/respaldo.js`: `exportAllData`, `importAllData`.
- `src/main.js`: aviso global de errores (`unhandledrejection`) en `init()`.
- `scripts/smoke.mjs`: prueba automática de la API.

## Pendiente / a futuro
- Imágenes en R2 si el límite de 2 MB molesta.
- Control de concurrencia (hoy gana el último guardado).
- `delEstudio` no borra flujos ni sus imágenes (ya pasaba antes con IndexedDB).
