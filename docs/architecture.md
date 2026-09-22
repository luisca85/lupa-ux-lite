# Arquitectura

## Forma del proyecto
Frontend: un único archivo HTML (`public/index.html`) con todo adentro: estilos en
`<style>`, lógica en un `<script>` clásico (no módulo), sin build ni dependencias de
runtime. Vanilla JS con render por estado: `render()` despacha según `state.view`.

Backend (opcional): Cloudflare Pages Functions en `functions/api/[[path]].js` sobre
una base D1 (SQLite). Esquema en `migrations/`, config en `wrangler.toml`.

La misma base de código corre en tres entornos (`DB_MODE`):
- `claude`: artifact en claude.ai. Capacidades `db` y `downloads` de Claude.
- `server`: hosteado en Cloudflare Pages. `makeHTTPAdapter` contra `/api`, datos en D1.
- `idb`: archivo local u hosting estático. `makeIDBAdapter`, datos en IndexedDB.
La detección es automática en `init()`, en ese orden. Solo se cae a `idb` si
`/api/health` no existe (404 o no JSON); si la API existe y falla, se muestra el error.

## Módulos (todos dentro del mismo archivo)
- Estado y almacenamiento: `state`, `LS` (localStorage), `store`, `flowStore`,
  `brandStore`, `makeIDBAdapter`. Punto único de datos.
- Catálogo: `HEUR_NIELSEN`, `SESGOS_BASE` y catálogos propios del usuario.
- Hallazgos: alta/edición con evidencia visual (imágenes con anotaciones y pines).
- Flujos (User Flows): diagrama de nodos/conectores con imágenes por interacción.
- User Journeys: matriz de etapas, pasos, carriles y curva de emoción.
- Protopersonas, Métricas.
- Reportes: reporte del cliente online (`openClientReport`), export de texto plano
  (`plainReport`), y página HTML autónoma para compartir (`SR_boot` +
  `generateSharePage` + `collectShareData`).

## Dónde vive cada cosa
Todo en `public/index.html`. Orden aproximado: estilos, íconos SVG, estado + store,
render raíz, catálogo, hallazgos, flujos, journeys, reportes, página autónoma, init.

## Modelo de datos (API tipo Firestore sobre rutas)
Las colecciones tienen cantidad impar de segmentos; los documentos, par.
- `estudios/{id}` — estudio. Incluye el objeto `reporte` embebido (resumen,
  diagnóstico, propuestas, muestra, toggles del reporte online, marca por defecto).
- `estudios/{id}/hallazgos/{hid}` — hallazgo.
- `estudios/{id}/hallazgos/{hid}/imgs/{imgId}` — imagen del hallazgo (full + anotaciones).
- `estudios/{id}/flujos/{fid}` — flujo o journey (journey = flujo con `tipo:"User Journey"`).
- `estudios/{id}/flujos/{fid}/imgs/{imgId}` — imagen de una interacción del flujo.
- `marca/perfil` — marca del autor (logo, contacto, servicio).
- `cat_heur/{id}`, `cat_sesgo/{id}` — heurísticas y sesgos propios.

Las propuestas de trabajo viven dentro de `reporte.propuestas` en cada estudio.

## API (functions/api)
- `GET /api/health`, `GET|PUT|DELETE /api/doc?path=`, `GET /api/collection?path=`,
  `GET /api/export`.
- Tabla `docs(path PK, parent, data JSON, updated_at)`; las colecciones se resuelven
  con `WHERE parent = ?` (índice). Rutas validadas: segmentos `[A-Za-z0-9_.:-]`,
  par = doc, impar = colección. Documentos de hasta ~1,9 MB (límite de fila de D1).
- Auth: `AUTH_MODE="access"` valida el JWT `Cf-Access-Jwt-Assertion` contra los
  certificados del team (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`); sin config → 503.
  `AUTH_MODE="none"` solo para desarrollo local.

## Persistencia
- Servidor: D1 vía API (ver arriba).
- Self-hosted sin API: IndexedDB, base `lupaux`, object store `docs` con keyPath `_path`.
  Cada documento se guarda como `{_path:"col/doc/...", data:{...}}`. Las colecciones
  se resuelven por prefijo tomando solo los hijos directos.
- claude.ai: capacidad `db` (colecciones/documentos nativos).
- Preferencias sueltas (tema, estudio activo) en localStorage vía `LS`.
- Alcance: en modo `server`, compartido entre dispositivos (último guardado gana).
  En modo `idb`, un dispositivo / un navegador; se migra con Exportar/Importar datos.
