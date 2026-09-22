# Feature: Backend en Cloudflare (Pages Functions + D1)

Objetivo: que la versión hosteada guarde en una base de datos de servidor, compartida
entre dispositivos y protegida con login, sin reescribir la lógica de la app.

## Criterios de aceptación
- Con `npm run dev`, la app arranca en modo `server` (badge "servidor") y todo lo que
  se crea (estudios, hallazgos, imágenes con anotaciones, flujos, marca, catálogo)
  queda en D1 y sobrevive a recargar.
- Sin API (archivo local u hosting estático) arranca en modo `idb` como antes.
- Si la API existe pero responde error, la app muestra "El servidor no está disponible"
  y NO cae a IndexedDB.
- En producción y previews, la API exige un JWT válido de Cloudflare Access; sin
  config responde 503, sin token o con token inválido responde 401.
- Rutas inválidas (`..`, cantidad de segmentos incorrecta) → 400. Documento > ~2 MB → 413,
  y la app muestra el error como aviso.
- Exportar datos baja un JSON `{app:"lupaux",version:1,docs:[{path,data}]}`;
  Importar datos lo carga en el backend activo (reemplaza por ruta).

## Dónde vive
- `functions/api/[[path]].js`: rutas, validación, `authorize()` / `verifyAccess()`.
- `migrations/0001_docs.sql`: tabla `docs`.
- `src/data/backend.js`: `makeHTTPAdapter`, `initBackend()`.
- `src/data/respaldo.js`: `exportAllData`, `importAllData`.
- `src/main.js`: aviso global de errores (`unhandledrejection`) en `init()`.
- `scripts/smoke.mjs`: prueba automática de la API.

## No tocar
- El contrato de `DB` (collection/doc get/set/delete). `ready` y `dumpAll` son
  opcionales y solo los usan init y el respaldo.
- No saltear `authorize()` en rutas nuevas. No poner `AUTH_MODE="none"` en producción.

## Pendiente / a futuro
- Imágenes en R2 si el límite de 2 MB molesta.
- Control de concurrencia (hoy gana el último guardado).
- `delEstudio` no borra flujos ni sus imágenes (ya pasaba antes con IndexedDB).
