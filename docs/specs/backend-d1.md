# Feature: Backend en Cloudflare (Pages Functions + D1)  ·  id: d1

Historia de usuario: Como quien hostea Lupa UX, quiero que los datos queden en D1
detrás de Cloudflare Access, para que estén protegidos y respaldados.

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
- Dado producción o preview (`AUTH_MODE="access"`), cuando falta `ACCESS_TEAM_DOMAIN`
  o `ACCESS_AUD`, entonces la API responde 503; sin token o con token inválido, 401.
- Dada una ruta inválida (`..`, cantidad de segmentos incorrecta) o un JSON que no es
  objeto, cuando llega a la API, entonces responde 400.
- Dado un documento de más de ~1,9 MB, cuando se guarda, entonces la API responde 413
  y la app muestra el error como aviso (toast).
- Dada una respuesta que no es JSON (sesión de Access vencida), cuando la app llama a
  la API, entonces avisa "La sesión venció… Recargá la página".
- Dado cualquier backend, cuando se usa Exportar datos, entonces baja un JSON
  `{app:"lupaux",version:1,docs:[{path,data}]}`; Importar datos lo carga en el backend
  activo (reemplaza por ruta).

## Alcance
API de documentos (`health`, `doc` GET/PUT/DELETE, `collection` GET, `export` GET),
validación de acceso con Cloudflare Access, tabla `docs` en D1, adaptador HTTP en el
cliente, detección de modo al iniciar y respaldo Exportar/Importar.

## Fuera de alcance / No tocar
- Fuera de alcance (ver "Pendiente / a futuro"): imágenes en R2, control de
  concurrencia, borrado en cascada de flujos al borrar un estudio.
- El contrato de `DB` (collection/doc get/set/delete). `ready` y `dumpAll` son
  opcionales y solo los usan init y el respaldo.
- No saltear `authorize()` en rutas nuevas. No poner `AUTH_MODE="none"` en producción.

## Dependencias
- Cloudflare Pages Functions y D1 (binding `DB`, base `lupaux`), config en `wrangler.toml`.
- Cloudflare Access (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) en production y preview.
- `wrangler` (dev, preview, migraciones `db:migrate:local` / `db:migrate:remote` /
  `db:migrate:preview`). Producción usa la base `lupaux`; previews, `lupaux-preview`.
- Capa `store` / `flowStore` / `brandStore` de la app, que habla solo con `DB`.

## Estados (UI)
- Vacío: A CONFIRMAR (qué ve el usuario con D1 sin documentos).
- Carga: A CONFIRMAR (hoy no hay un indicador propio mientras se consulta `/api/health`).
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
- `migrations/0001_docs.sql`: tabla `docs`.
- `src/data/backend.js`: `makeHTTPAdapter`, `initBackend()`.
- `src/data/respaldo.js`: `exportAllData`, `importAllData`.
- `src/main.js`: aviso global de errores (`unhandledrejection`) en `init()`.
- `scripts/smoke.mjs`: prueba automática de la API.

## Pendiente / a futuro
- Imágenes en R2 si el límite de 2 MB molesta.
- Control de concurrencia (hoy gana el último guardado).
- `delEstudio` no borra flujos ni sus imágenes (ya pasaba antes con IndexedDB).
