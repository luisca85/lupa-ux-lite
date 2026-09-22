# Arquitectura

## Forma del proyecto
Frontend: vanilla JS en módulos ES (`src/`), render por estado: `render()` despacha
según `state.view`. Vite compila todo a UN solo HTML (`dist/index.html`, JS y CSS
inline) con `vite-plugin-singlefile`, sin minificar. Ese archivo es lo que publica
Cloudflare Pages y también se puede abrir con doble clic.

Backend (opcional): Cloudflare Pages Functions en `functions/api/[[path]].js` sobre
una base D1 (SQLite). Esquema en `migrations/`, config en `wrangler.toml`.

Dos modos de datos (`DB_MODE`, elegido en `initBackend()`):
- `server`: hosteado. `makeHTTPAdapter` contra `/api`, datos en D1.
- `idb`: archivo local u hosting estático. `makeIDBAdapter`, datos en IndexedDB.
Solo se cae a `idb` si `/api/health` no existe (404 o no JSON); si la API existe y
falla, se muestra el error. Si tampoco hay IndexedDB, `store` usa localStorage.

## Módulos (`src/`)
- `main.js`: entrada. Importa el CSS y ejecuta `init()`.
- `core/`: `util.js` (uid, esc, LS), `state.js` (estado global y helpers del
  catálogo), `catalogo-base.js` (Nielsen, sesgos, severidades).
- `data/`: `backend.js` (adaptadores, `DB`/`USE_DB`/`DB_MODE`, `initBackend`),
  `store.js` (estudios, hallazgos, imágenes, catálogo propio), `respaldo.js`
  (exportar / importar datos).
- `app/render.js`: `view`, `render()`, navegación.
- `views/`: home, estudio (shell + submenú), catálogo, hallazgos.
- `ui/`: modales y toast, íconos, imágenes (procesamiento, visor), anotaciones
  (motor de pines y dibujo), tema, descargas.
- `flujos/`: flujos (store + lista), diagrama (editor), detalle-nodo.
- `journey/`: journey (editor de matriz y emociones), relaciones (sidebar).
- `reportes/`: comun (marca, `ensureReporte`), propuestas, panel (pestaña Reportes),
  texto-plano, cliente (reporte online).
- `share/`: compartir (`collectShareData`, `generateSharePage`) y `boot.js`
  (`SR_boot`, se importa con `?raw` y se incrusta como texto en la página autónoma).
- `styles/`: base, reportes, flujos, journey, cliente. El orden de import en
  `main.js` es el de la cascada.

Hay dependencias circulares entre módulos (las vistas llaman a `render()` y
`render()` llama a las vistas). Es seguro porque ningún módulo usa imports al
cargarse, solo dentro de funciones. Mantenerlo así.

La página autónoma copia el CSS leyendo los `<style>` del documento (en el build y
en `vite` dev el CSS queda en `<style>`), y el JS de `boot.js` como texto.

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
- Sin API: IndexedDB, base `lupaux`, object store `docs` con keyPath `_path`.
  Cada documento se guarda como `{_path:"col/doc/...", data:{...}}`. Las colecciones
  se resuelven por prefijo tomando solo los hijos directos.
- Preferencias sueltas (tema, estudio activo) en localStorage vía `LS`.
- Alcance: en modo `server`, compartido entre dispositivos (último guardado gana).
  En modo `idb`, un dispositivo / un navegador; se migra con Exportar/Importar datos.

## Herramientas
- `npm run dev`: wrangler (API + D1 local, :8788) + Vite (:5173, proxy `/api`).
- `npm run build` → `dist/`. `npm run preview`: build + wrangler sobre `dist/`.
- `npm run check` (sintaxis), `npm run smoke` (API), `npm run test:e2e` (Playwright,
  modo servidor con D1 limpia e IndexedDB con servidor estático).
