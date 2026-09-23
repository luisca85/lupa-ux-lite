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
- `views/`: home (KPIs, estado vacío, lista filtrada por el buscador de la barra),
  estudio (shell + submenú), catálogo, hallazgos.
- `ui/`: modales y toast, íconos, imágenes (procesamiento, visor), anotaciones
  (motor de pines y dibujo), tema, descargas, sesion (chip de usuario de Access).
- `flujos/`: flujos (store + lista), diagrama (editor), detalle-nodo.
- `journey/`: journey (editor de matriz y emociones), relaciones (sidebar).
- `reportes/`: comun (marca, `ensureReporte`), propuestas, panel (pestañas Proyecto y
  Reportes, link público), seleccion (`vistaCliente`: qué ve el cliente), publicar
  (foto en `publicos/`, PIN, consentimientos), texto-plano, cliente (vista previa).
- `share/`: compartir (`collectShareData`, `generateSharePage`, `montarVistaPrevia`,
  `montarReportePublico`), publico (página `/r/{id}`: PIN + consentimiento) y
  `boot.js` (`SR_boot`, único render del reporte del cliente; se importa con `?raw`).
- `assets/figma/`: íconos SVG exportados del Figma; se usan como máscara (`.fig-ico` en
  `base.css`) para que tomen el color del tema. No editarlos.
- `styles/`: base, reportes, flujos, journey, cliente. El orden de import en
  `main.js` es el de la cascada.

Hay dependencias circulares entre módulos (las vistas llaman a `render()` y
`render()` llama a las vistas). Es seguro porque ningún módulo usa imports al
cargarse, solo dentro de funciones. Mantenerlo así.

La página autónoma copia el CSS leyendo los `<style>` del documento (en el build y
en `vite` dev el CSS queda en `<style>`), y el JS de `boot.js` como texto.

## Features y su spec
| Feature | Estado | Spec |
|---|---|---|
| Estudios (alta, edición, borrado) | Hecho | — (ver modelo de datos) |
| Hallazgos con evidencia anotada | Hecho | `specs/hallazgos.md` |
| Catálogo de heurísticas y sesgos | Hecho | `specs/catalogo.md` |
| User Flows | Hecho | `specs/flujos.md` |
| User Journeys | Hecho | `specs/journeys.md` |
| Reportes (panel, online, texto plano, autónoma) | Hecho | `specs/reportes.md` |
| Propuestas de trabajo | Hecho | `specs/propuestas.md` |
| Protopersonas | Se cargan en Reportes; la pestaña propia es "Próximamente" | `specs/reportes.md` |
| Métricas | No implementado (pestaña "Próximamente") | — |
| Backend D1 + Access | Hecho | `specs/backend-d1.md` |
| Sesión visible (menú de usuario, logout de Access) | Hecho | `specs/sesion.md` |
| Home y barra superior (rediseño Figma) | Hecho | `specs/home.md` |
| Proyecto, qué ve el cliente, link público con PIN | Hecho | `specs/reportes.md` |
| Versión hosteable / doble clic | Hecho | `specs/version-hosteable.md` |

## Modelo de datos (API tipo Firestore sobre rutas)
Las colecciones tienen cantidad impar de segmentos; los documentos, par.
- `estudios/{id}` — estudio. Incluye el objeto `reporte` embebido (resumen,
  diagnóstico, propuestas, muestra, toggles del reporte online, marca por defecto).
- `estudios/{id}/hallazgos/{hid}` — hallazgo.
- `estudios/{id}/hallazgos/{hid}/imgs/{imgId}` — imagen del hallazgo (full + anotaciones).
- `estudios/{id}/flujos/{fid}` — flujo o journey (journey = flujo con `tipo:"User Journey"`).
- `estudios/{id}/flujos/{fid}/imgs/{imgId}` — imagen de una interacción del flujo.
- `marca/perfil` — marca del autor (logo, contacto, servicio, LinkedIn, bienvenida y
  aclaraciones del reporte).
- `publicos/{id}` — link público: `estId`, hash del PIN con sal, fallos/bloqueo y
  últimos 10 consentimientos (nombre, fecha). `publicos/{id}/partes/{n}` — la foto del
  reporte filtrado (JSON partido en trozos). En el estudio, `reporte.publico` guarda
  id, PIN y sal (detrás de Access) y `reporte.ocultos` lo que el cliente no ve.
- Relaciones: hallazgo ↔ interacción de flujo en dos lados (`node.markers[].hallazgoId`
  y `hallazgo.flujoId/interaccionId`); paso de journey → `hallazgos:[ids]` y `flujos:[ids]`.
- `cat_heur/{id}`, `cat_sesgo/{id}` — heurísticas y sesgos propios.

Las propuestas de trabajo viven dentro de `reporte.propuestas` en cada estudio.

## API (functions/api)
- `GET /api/health`, `GET|PUT|DELETE /api/doc?path=`, `GET /api/collection?path=`,
  `GET /api/export`, `GET /api/me` (quién entró: email del JWT de Access verificado).
- Tabla `docs(path PK, parent, data JSON, updated_at)`; las colecciones se resuelven
  con `WHERE parent = ?` (índice). Rutas validadas: segmentos `[A-Za-z0-9_.:-]`,
  par = doc, impar = colección. Documentos de hasta ~1,9 MB (límite de fila de D1).
- Auth: `AUTH_MODE="access"` valida el JWT `Cf-Access-Jwt-Assertion` contra los
  certificados del team (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`); sin config → 503.
  `authorize()` devuelve `{denied}` o `{user}`; toda ruta pasa por ella, salvo
  `POST /api/publico` ({id, pin, nombre, acepto}): Bypass en Access, solo lee
  `publicos/`, 401 igual para link o PIN inválido, 5 fallos → 15 min de bloqueo (429),
  400 sin consentimiento, `no-store` + `noindex`.
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
