# Log de decisiones (append-only)

2026-09-22 - Persistencia self-hosted en IndexedDB (no localStorage). Motivo:
localStorage tiene límite de ~5MB y la app guarda imágenes en base64 (evidencia
de hallazgos y flujos), que lo desbordan rápido. IndexedDB aguanta mucho más.

2026-09-22 - El adaptador IndexedDB replica la MISMA API tipo Firestore que ya
usaban store/flowStore/brandStore. Motivo: no reescribir la lógica de features;
solo se enchufa un backend nuevo (`DB=makeIDBAdapter()`) y `USE_DB=true`.

2026-09-22 - Detección de entorno automática en init: runtime de Claude si existe
`window.claude`, IndexedDB si no. Motivo: una sola base de código sirve para el
artifact en claude.ai y para la versión hosteada, sin ramas divergentes.

2026-09-22 - Descargas: `getDownloads()` devuelve la capacidad `downloads` de
Claude cuando hay runtime, y una descarga nativa (Blob + `<a download>`) cuando
no lo hay. Motivo: fuera del sandbox del artifact, el `<a download>` funciona.

2026-09-22 - Versión hosteada = mismo código envuelto en un documento HTML
completo (doctype/head/body). Motivo: como artifact, claude.ai inyecta el head;
hosteado hay que incluirlo (charset, viewport, reset, fuentes).

Decisiones que el proyecto ya traía de antes (sembradas en retrospectiva):
- Un solo archivo HTML, vanilla JS, sin build. Motivo: portabilidad y simplicidad.
- Reporte del cliente separado de las notas internas. Motivo: no filtrar trabajo interno.
- Página autónoma para compartir con datos embebidos (foto del momento) en vez de
  un reporte servido por db. Motivo: la db solo funciona autenticado en claude.ai;
  un archivo autónomo lo abre cualquiera sin cuenta.
- Propuestas con precio de lanzamiento: el precio guardado ya tiene el descuento
  aplicado y el "antes" se deriva y se redondea. Motivo: mostrar sesgo de escasez
  sin duplicar el dato del precio final.

2026-09-22 - Backend opcional en Cloudflare: Pages Functions + D1 (SQLite). Revierte
"sin backend" para la versión hosteada. Motivo: compartir datos entre dispositivos
y no depender del navegador. La API replica el contrato tipo Firestore (`DB.collection`,
`DB.doc`) con un adaptador nuevo (`makeHTTPAdapter`); la lógica de features no cambia.

2026-09-22 - Una tabla `docs(path, parent, data JSON)` en vez de tablas por entidad.
Motivo: mapea 1:1 con las rutas que ya usa la app; no hay migraciones por cada campo nuevo.

2026-09-22 - Imágenes en D1 como base64 (no R2). Motivo: la prueba mínima no suma
servicios. Límite ~2 MB por documento; si molesta, pasar las imágenes a R2.

2026-09-22 - Acceso con Cloudflare Access (login por email). La API además valida el
JWT de Access y falla cerrada (503) si falta la config. Motivo: son datos de clientes;
un deploy mal configurado no debe dejarlos abiertos.

2026-09-22 - Orden de backends: Claude → servidor → IndexedDB. Solo se cae a IndexedDB
si la API no existe (404 / no JSON). Si la API existe y falla, se muestra el error.
Motivo: no guardar en el navegador creyendo que se guarda en el servidor.

2026-09-22 - Wrangler fijado en 4.86.0 y compatibility_date 2026-05-01. Motivo: las
versiones nuevas exigen Node 22 y el equipo usa Node 20.

2026-09-22 - Modularización: módulos ES en `src/` + Vite con salida a UN solo HTML
(`vite-plugin-singlefile`). Revierte "un solo archivo HTML, sin build". Motivo:
mantenibilidad; el archivo único se conserva como salida del build, así sigue
abriendo con doble clic y la página autónoma no cambia.

2026-09-22 - Se quita el runtime de claude.ai (capacidades `db` y `downloads`).
Reemplaza las decisiones de detección `window.claude` y `getDownloads()`. Las
descargas son siempre nativas (`downloadFile`). Motivo: la app ya no se usa como
artifact; menos caminos que mantener.

2026-09-22 - `SR_boot` vive en `src/share/boot.js` y se importa con `?raw`, en vez
de serializarlo con `toString()`. Motivo: el bundler no puede alterar el código
que se incrusta en la página autónoma.

2026-09-22 - Build sin minificar. Motivo: código legible para depurar en producción;
el ahorro sería chico frente al peso de las imágenes.

2026-09-22 - Regresión automatizada con Playwright (`tests/e2e`), en modo servidor
e IndexedDB. Motivo: red de seguridad para refactors; reemplaza la prueba manual.
