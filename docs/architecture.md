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
  `store.js` (estudios, hallazgos, imágenes v1, catálogo propio), `pantallas.js` (modelo v2:
  `pantallaStore`, deduplicación por hash, reglas del hallazgo, `migrarEstudio` /
  `prepararEstudio`), `respaldo.js` (exportar / importar datos).
- `app/render.js`: `view`, `render()`, navegación.
- `views/`: home (Recursos a la izquierda y Estudios en una tarjeta: grilla con la tarjeta
  "Nuevo estudio", filtrado por el buscador de la barra, paginador según lo que entra en
  la pantalla y alta de estudio en dos pasos dentro del bloque, sin modal), recursos
  (panel de lecturas con destacado que rota y Consejo de Lupa; lista fija en `RECURSOS`),
  legal (términos, privacidad y almacenamiento: `SECCIONES_LEGALES`, `state.view="legal"`),
  estudio (subheader a 100% de ancho + barra de secciones con `STUDY_TABS`; sin barra
  global), resumen (dashboard del proyecto: problemas, hallazgos, protopersonas, flujos),
  catálogo, hallazgos (`hallazgos-ws.js`: pestañas de pantallas, lienzo con zoom y pines,
  popover de carga rápida, panel con filtros por severidad, edición y catálogo;
  `hallazgos.js`: editor completo `hzEditor` para la página de alta y el modal, borrado).
  Flujos y Protopersonas pasan por `proximamente()` (aviso "Próximamente").
- `ui/`: modales y toast, íconos, imágenes (procesamiento, visor), anotaciones
  (motor de pines y dibujo), tema, descargas, sesion (chip de usuario de Access, "Ver introducción"), onboarding
  (bienvenida en 5 pasos, la primera vez por usuario y navegador), pie (pie de página
  de la home y las páginas legales: contacto, legales, Exportar / Importar datos).
- `flujos/`: flujos (store + lista), diagrama (editor), detalle-nodo.
- `journey/`: journey (editor de matriz y emociones), relaciones (sidebar).
- `reportes/`: comun (marca, `ensureReporte`), propuestas, panel (pestaña Reportes:
  Compartir con estado, ayuda, qué ve el cliente y vista previa en vivo en un iframe),
  configuracion (pestaña Configuración: menú Datos del proyecto / Marca / Propuestas,
  edición en el panel), seleccion (`vistaCliente`: qué ve el cliente), publicar (foto en
  `publicos/`, PIN, `firmaReporte`, `actividadDe`), cliente (pantalla completa).
- `share/`: compartir (`collectShareData`, `buildShareHtml`, `montarVistaPrevia`,
  `montarReportePublico`), publico (página `/r/{id}`: PIN + consentimiento) y
  `boot.js` (`SR_boot`, único render del reporte del cliente, con reserva de propuestas;
  se importa con `?raw`).
- `assets/figma/`: íconos SVG exportados del Figma; se usan como máscara (`.fig-ico` en
  `base.css`) para que tomen el color del tema. No editarlos. También el logo de uxuaria
  (`logo-uxuaria.webp`) y el ícono de Recursos (`montana.svg`).
- `assets/onboarding/`: las 5 imágenes del onboarding (grabados de dominio público).
- `styles/`: base (incluye los tokens del DS: radios `--r-*` y `--sel`), reportes, flujos,
  journey, cliente. El orden de import en
  `main.js` es el de la cascada.

Hay dependencias circulares entre módulos (las vistas llaman a `render()` y
`render()` llama a las vistas). Es seguro porque ningún módulo usa imports al
cargarse, solo dentro de funciones. Mantenerlo así.

La página autónoma copia el CSS leyendo los `<style>` del documento (en el build y
en `vite` dev el CSS queda en `<style>`), y el JS de `boot.js` como texto.

## Features y su spec
| Feature | Estado | Spec |
|---|---|---|
| Estudios (alta en dos pasos en la home, edición en modal, borrado) | Hecho | `specs/home.md` (alta) |
| Hallazgos sobre pantallas (modelo v2, migración, pines, zoom) | Hecho | `specs/hallazgos.md` |
| Catálogo de heurísticas y sesgos | Hecho | `specs/catalogo.md` |
| User Flows | Hecho; sección en "Próximamente" (spec `proy`) | `specs/flujos.md` |
| User Journeys | Hecho; sección en "Próximamente" (spec `proy`) | `specs/journeys.md` |
| Reportes (Compartir, vista previa en vivo, reserva de propuestas) y Configuración | Hecho | `specs/reportes.md` |
| Propuestas de trabajo | Hecho | `specs/propuestas.md` |
| Protopersonas | "Próximamente"; ya no se cargan en Configuración (los datos guardados se conservan) | `specs/reportes.md` |
| Métricas | No implementado; pestaña oculta | — |
| Backend D1 + Access | Hecho | `specs/backend-d1.md` |
| Sesión visible (menú de usuario, logout de Access) | Hecho | `specs/sesion.md` |
| Home (Recursos, Estudios con paginador, pie de página) y barra superior (Figma) | Hecho | `specs/home.md` |
| Onboarding de bienvenida en 5 pasos | Hecho | `specs/onboarding.md` |
| Páginas legales (términos, privacidad, almacenamiento) | Hecho; falta revisión legal | `specs/legal.md` |
| Proyecto: subheader, barra de secciones y dashboard de Resumen | Hecho | `specs/proyecto.md` |
| Design system: radios, estados y componentes base | Hecho | `specs/design-system.md` |
| Versión hosteable / doble clic | Hecho | `specs/version-hosteable.md` |

## Modelo de datos (API tipo Firestore sobre rutas)
Las colecciones tienen cantidad impar de segmentos; los documentos, par.

Cuentas (spec `cta`): en modo `server` cada cuenta guarda todo en D1 bajo
`u/{idCuenta}/…`. El cliente sigue usando las rutas de abajo y el prefijo lo pone solo
la API (`rutaReal`). Las rutas que empiezan con `u/` se rechazan. `publicos/` es la
excepción: queda global y solo la toca su dueño (`dueño` en `publicos/{id}`). La tabla
`usuarios` (id, email, creado) da el id; en desarrollo (`AUTH_MODE="none"`) la cuenta es
`local`, y el encabezado `x-lupa-dev-user` simula otras para las pruebas. Los datos de
antes de las cuentas se pasan con `scripts/migrar-cuentas.mjs`.
- `estudios/{id}` — estudio. Incluye el objeto `reporte` embebido (resumen,
  diagnóstico, propuestas, muestra, toggles del reporte online, marca por defecto).
- `estudios/{id}/pantallas/{pid}` — pantalla del estudio (nombre, origen imagen/url, url,
  orden, w, h, thumb, hash). `.../pantallas/{pid}/img/full` — imagen completa.
- `estudios/{id}/hallazgos/{hid}` — hallazgo atómico (modelo v2): `pantallaId` + `pin {x,y}`
  relativo, `severidad`, `catalogoIds`, `flujoId` + `pasoId`, `modelo: 2`.
- `estudios/{id}/hallazgos/{hid}/imgs/{imgId}` — imagen del modelo v1 (full + anotaciones).
  Ya no se escribe: queda como respaldo de la migración (`hallazgo.imgsV1`).
- `estudios/{id}.modelo` — 2 cuando el estudio ya se migró (se migra al abrirlo).
- `estudios/{id}/flujos/{fid}` — flujo o journey (journey = flujo con `tipo:"User Journey"`).
- `estudios/{id}/flujos/{fid}/imgs/{imgId}` — imagen de una interacción del flujo.
- `marca/perfil` — marca del autor (logo, contacto, servicio, LinkedIn, bienvenida y
  aclaraciones del reporte).
- `publicos/{id}` — link público: `estId`, `estNombre`, `estCliente`, hash del PIN con
  sal, fallos/bloqueo, últimos 10 consentimientos (nombre, fecha) y últimas 20 reservas
  (nombre, propuesta, fecha). `publicos/{id}/partes/{n}` — la foto del reporte filtrado
  (JSON partido en trozos). En el estudio, `reporte.publico` guarda id, PIN, sal y la
  huella `firma` de lo publicado (detrás de Access) y `reporte.ocultos` lo que el
  cliente no ve.
- Relaciones: hallazgo ↔ interacción de flujo en dos lados (`node.markers[].hallazgoId`
  y `hallazgo.flujoId/pasoId`, con `interaccionId` como alias v1); hallazgo → pantalla por
  `pantallaId`; paso de journey → `hallazgos:[ids]` y `flujos:[ids]`.
- `cat_heur/{id}`, `cat_sesgo/{id}` — heurísticas y sesgos propios.

Las propuestas de trabajo viven dentro de `reporte.propuestas` en cada estudio.

## API (functions/api)
- `GET /api/health`, `GET|PUT|DELETE /api/doc?path=`, `GET /api/collection?path=`,
  `GET /api/export` (solo lo de la cuenta y sus links públicos), `GET /api/me`
  (`{id, email, local}`: la cuenta de quien entró).
- Tabla `docs(path PK, parent, data JSON, updated_at)`; las colecciones se resuelven
  con `WHERE parent = ?` (índice). Rutas validadas: segmentos `[A-Za-z0-9_.:-]`,
  par = doc, impar = colección. Documentos de hasta ~1,9 MB (límite de fila de D1).
- Auth: `AUTH_MODE="access"` valida el JWT `Cf-Access-Jwt-Assertion` contra los
  certificados del team (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`); sin config → 503.
  `authorize()` devuelve `{denied}` o `{user}`; toda ruta pasa por ella, salvo
  `POST /api/publico` ({id, pin, nombre, acepto}): Bypass en Access, solo lee
  `publicos/`, 401 igual para link o PIN inválido, 5 fallos → 15 min de bloqueo (429),
  400 sin consentimiento, `no-store` + `noindex`. Con `accion:"reserva"` (mismo PIN)
  guarda la reserva en `publicos/{id}` y avisa por correo con Resend si hay
  `RESEND_API_KEY` (`RESERVA_TO`, `RESERVA_CC`, `RESERVA_FROM`).
  `AUTH_MODE="none"` solo para desarrollo local.

## Persistencia
- Servidor: D1 vía API (ver arriba).
- Sin API: IndexedDB, base `lupaux`, object store `docs` con keyPath `_path`.
  Cada documento se guarda como `{_path:"col/doc/...", data:{...}}`. Las colecciones
  se resuelven por prefijo tomando solo los hijos directos.
- Preferencias sueltas (tema, estudio activo, onboarding visto por usuario:
  `lupa:onboarding:{email|local}`) en localStorage vía `LS`.
- Alcance: en modo `server`, compartido entre dispositivos (último guardado gana).
  En modo `idb`, un dispositivo / un navegador; se migra con Exportar/Importar datos.

## Herramientas
- `npm run dev`: aplica las migraciones de D1 local, levanta wrangler (API + D1 local,
  :8788) y Vite (:5173, proxy `/api`).
- `npm run build` → `dist/`. `npm run preview`: build + wrangler sobre `dist/`.
- `npm run check` (sintaxis), `npm run smoke` (API y aislamiento entre cuentas), `npm run test:e2e` (Playwright,
  modo servidor con D1 limpia e IndexedDB con servidor estático). Requiere Node ≥ 20.19
  (`.nvmrc`; si la shell trae otra versión, `nvm use`). Las pruebas habilitan Flujos y
  Protopersonas con `localStorage["lupa:habilitar"]`; `migracion.spec` siembra un estudio
  v1 por la API (solo modo servidor).
