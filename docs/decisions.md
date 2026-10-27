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

2026-09-23 - Previews con base D1 aparte (`lupaux-preview`); producción usa `lupaux`.
El `database_id` de la sección local de `wrangler.toml` identifica solo la base local.
Motivo: una rama de prueba desplegada no debe leer ni escribir datos de clientes.

2026-09-23 - Producción en `lupaux.uxuaria.com` (subdominio, no ruta `/lupaux`).
Motivo: Pages y Access lo cubren sin proxy; una ruta exigiría un Worker y reescribir
las rutas relativas de la API.

2026-09-23 - Tipografía Geist en toda la app (Inter ExtraBold solo en la marca
"uxuaria"); reemplaza a IBM Plex Sans y Bricolage Grotesque. IBM Plex Mono sigue.
Motivo: es la tipografía del rediseño en Figma; evita mezclar dos familias.

2026-09-23 - Íconos del Figma como archivos SVG en `src/assets/figma/`, aplicados como
máscara CSS con el color del texto. Motivo: se usan exactos (sin redibujarlos) y
funcionan en tema claro y oscuro aunque el SVG traiga colores fijos.

2026-09-23 - Con menú de usuario (modo servidor), el badge de modo y el botón de tema
pasan adentro del menú. Motivo: la barra del Figma no los muestra; en modo `idb`
siguen en la barra porque no hay menú.

2026-09-23 - Link público del reporte con PIN: `POST /api/publico` es la ÚNICA ruta
fuera de `authorize()` (Access con Bypass solo en `/r/*` y `/api/publico`). Muestra una
foto del reporte filtrado guardada al publicar (no los datos vivos); PIN de 6 dígitos
con hash + sal; mismo error para link o PIN inválido; 5 fallos → bloqueo de 15 min.
Motivo: el cliente tiene que ver el reporte sin cuenta, sin abrir el resto de la app.

2026-09-23 - Consentimiento obligatorio para ver el link público (nombre + acepto),
registrado del lado del servidor; se guardan los últimos 10 por link. Motivo: poder
mencionar el diagnóstico en redes con constancia de aceptación.

2026-09-23 - Un solo render del reporte del cliente: `SR_boot` (vista previa, link
público y página autónoma). Se elimina el render aparte de `reportes/cliente.js` y la
ruta `#reporte/{id}`. Motivo: la duplicación obligaba a cambiar todo dos veces.

2026-09-23 - Información general del estudio (resumen, diagnóstico, protopersonas,
propuestas, muestra) en una pestaña Proyecto; Reportes queda para la salida. Los datos
siguen en `estudio.reporte` (sin migración). Motivo: separar contenido de entrega.

2026-09-23 - Repositorio público en GitHub (`luisca85/lupa-ux-lite`). Motivo: decisión
del autor; no hay secretos en el repo (la protección es Access, no ocultar IDs).

Decisiones que el código ya traía, sembradas en retrospectiva (spec-lite, camino B):
- Imágenes comprimidas a JPEG (máx. 1280 px, ~240 KB) con miniatura de 220 px
  guardada en el documento del hallazgo; la imagen completa en un documento
  aparte. Motivo (inferido): límites de almacenamiento y listas livianas. Con ese
  tope, el límite de ~2 MB por fila de D1 no se alcanza con una imagen.
- Anotaciones guardadas como datos (no quemadas en la imagen). Motivo (inferido):
  poder re-editarlas.
- Severidad con la escala de Nielsen 0–4, default 3, opcional.
- Journey = flujo con `tipo:"User Journey"` en la misma colección. Motivo: A CONFIRMAR.
- Relación hallazgo ↔ interacción guardada en ambos lados. Motivo (inferido):
  mostrar los hallazgos en el diagrama y la interacción en el hallazgo sin consultas extra.
- Catálogo propio global (no por estudio). Motivo: A CONFIRMAR.
- Reporte online por hash `#reporte/{id}` (`reportLink`): heredado del uso en
  claude.ai. Eliminado el 2026-09-23 (ver abajo).

2026-10-15 - Reportes se entrega solo por el link público: se eliminan la página HTML
descargable y la exportación en texto plano. "Compartir" publica o actualiza solo si lo
que ve el cliente cambió (huella `firmaReporte` guardada en `reporte.publico.firma`).
Motivo: una sola salida, siempre al día, con PIN y consentimiento.

2026-10-15 - `POST /api/publico` suma `accion:"reserva"` ("Reservar ahora tu
diagnóstico" en el reporte del cliente). Sigue siendo la única ruta fuera de
`authorize()`: exige el mismo PIN (y su bloqueo), solo escribe en `publicos/{id}`
(últimas 20 reservas) y avisa por correo con Resend (`RESEND_API_KEY`, `RESERVA_TO`
= info@uxuaria.com por defecto, `RESERVA_CC`). Los destinatarios personales van en
variables de Cloudflare, no en el repo público. Motivo: enterarse cuando el cliente
quiere contratar sin darle una cuenta.

2026-10-15 - Protopersonas sale de Configuración y del reporte del cliente (los datos
guardados se conservan; la sección sigue en "Próximamente"). Métricas se oculta de la
barra del estudio. Motivo: enfocar el producto en hallazgos y propuestas.

2026-10-16 - El onboarding de bienvenida se recuerda solo en el navegador
(`localStorage` `lupa:onboarding:{email}`, o `local` sin sesión), no en `DB` ni en D1.
En otro navegador o dispositivo aparece una vez más; "Ver introducción" lo reabre.
Motivo: decisión del usuario; además no toca la API ni `authorize()` (inferido).

2026-10-16 - El alta de estudio pasa a la home, dentro del bloque de Estudios y en dos
pasos (Datos básicos / Detalles), sin modal. La edición sigue en el modal
(`studyModal`) y las dos comparten `guardarEstudio`. Motivo (inferido): dar más lugar
al formulario y no tapar la home; el modal queda para cambios rápidos.

2026-10-16 - Términos, privacidad y almacenamiento viven dentro de la app (spec
`legal`), escritos a partir de lo que la app hace hoy. El responsable de los datos es
Luis Carlos Romero; uxuaria es su marca. Si cambia el tratamiento de datos, hay que
actualizar el texto y `ACTUALIZADO`. Pendiente: revisión legal, jurisdicción y que el
cliente pueda leer las condiciones desde el link público. Motivo: que quien usa la
herramienta sepa qué se guarda, dónde y con quién se comparte.

2026-10-16 - Cuentas propias con código por email (spec `cta`) en lugar de Cloudflare
Access, contraseñas o un servicio externo (Supabase, Clerk). `/api/auth/*` se suma a
`POST /api/publico` como única ruta fuera de `authorize()`; solo toca `codigos`,
`sesiones` y `usuarios`, y guarda solo hashes. Cada cuenta guarda sus datos bajo
`u/{id}/` (el prefijo lo pone la API) y `publicos/{id}` lleva `dueño`. Motivo: lanzar
gratis para 100 personas (Access gratis llega a 50 usuarios), sin contraseñas que
proteger con 10 ms de CPU y sin reescribir la capa de datos.

2026-10-16 - Producción pasa de `lupaux.uxuaria.com` a `lupa.uxuaria.com` con el lanzamiento
de las cuentas. `lupaux.uxuaria.com` queda con una redirección 301 que conserva la ruta,
para no romper los links públicos `/r/{id}` ya enviados a clientes. Motivo: nombre más
corto y claro para la beta.

2026-10-20 - Legales: rigen las leyes de Argentina (Ley 25.326) y el responsable es Luis
Carlos Romero León (marca uxuaria). Las condiciones del link público son genéricas para
todas las cuentas. La cláusula de mención en redes y portfolio solo se pide en los
reportes de uxuaria (`mencion`, que fija el servidor). `/legal/{id}` se lee sin cuenta.
La beta se lanza **sin revisión legal**: el riesgo lo asume el responsable y la
revisión queda pendiente. Motivo: abrir la beta gratis ya y revisar con un abogado
antes de crecer más allá de los 100 cupos.

2026-10-20 - Un solo formulario de hallazgo (el del panel de Hallazgos) en Hallazgos, en
las interacciones de los User Flows y en los pasos de los User Journeys (spec `hz`). Un
hallazgo puede estar en varios pasos (`hallazgo.pasos`), y cada flow o journey lo registra de
su lado. La pantalla se agrega en una sección propia del mismo panel: elegir una existente
para no duplicar imágenes, o subirla, pegarla y nombrarla. Se crea recién al guardar el
hallazgo. Motivo: cargar igual desde las dos partes y que los datos queden emparejados.

2026-10-20 - Cambia la decisión del 2026-10-15 sobre el texto plano. El link sigue siendo la
única forma de entregar el reporte al cliente, pero el administrador puede exportarlo en
texto plano y en JSON legible por IA, con lo mismo que ve el cliente y sin imágenes. Las
cuentas de la beta y los clientes no tienen exportación. Motivo: trabajar el diagnóstico
fuera de la app (por ejemplo, con una IA) sin abrir un segundo canal de entrega.

2026-10-21 - El reporte del cliente acepta pestañas propias con HTML pegado por el autor
(spec `rpt`). El HTML va en un iframe con `sandbox` que permite scripts pero no
`allow-same-origin`, así corre aislado del reporte, de la app y de la sesión. El texto con
formato se limpia con una lista blanca al guardar y al mostrarlo. Motivo: sumar contenido
propio (benchmarks, tableros, propuestas en HTML) sin abrir un hueco de XSS en el dominio
de la app, que también ven otras cuentas.

2026-10-21 - Cambia la decisión del 2026-10-20 sobre la mención. La cláusula de mención pasa a
las condiciones de uso de todos los reportes: quien preparó el reporte (uxuaria o una cuenta
de la beta) puede mencionar que lo realizó y compartir aprendizajes generales, sin revelar
información clave ni datos confidenciales. Una sola casilla; se quita la condición aparte de
uxuaria. Además, el link público ya no pide nombre ni email: solo PIN y aceptación, y se
guarda la aceptación con la fecha. Motivo: entrar más rápido al reporte y no guardar datos
personales del cliente que no hacen falta.

2026-10-25 - El link público `/r/{id}` muestra el reporte en un iframe con `sandbox` sin
`allow-same-origin`, y `SR_boot` normaliza ids, URLs de imágenes, colores y números antes de
dibujar (spec `rpt`). La reserva la hace la página de afuera por `postMessage`. Motivo: con
la beta abierta, cualquier cuenta puede escribir a mano la foto de un reporte publicado. Sin
esto, un link podía ejecutar código en el dominio de la app con la sesión de quien lo abre.

2026-10-26 - Chequeo legal previo al lanzamiento (sin abogado todavía). Tres cambios para no
inducir a error al cliente de un reporte: (1) la aclaración por defecto de uxuaria ("más de
10 años de experiencia", "no hecho por IA") solo aparece en los reportes de uxuaria; en los
de otras cuentas, solo si su autor la escribe. (2) El precio tachado ya no se calcula desde
un %: lo carga el autor como precio anterior real, con fecha de validez opcional, y se quita
"por tiempo limitado". (3) La página de gracias dice "Recibimos tu interés" y aclara que no
es una compra ni un compromiso de pago. Motivo: evitar afirmaciones falsas, publicidad
engañosa (Ley de Lealtad Comercial) y que una reserva se lea como contrato.

2026-10-27 - La app se renombra de Lupa UX a Mutis UX (por José Celestino Mutis y las láminas
de la Expedición Botánica), escrito siempre con UX en mayúsculas. Producción pasa a
`mutis.uxuaria.com` en lugar de `lupa.uxuaria.com`, que nunca se activó; `lupaux.uxuaria.com`
queda con la redirección 301 para los links `/r/{id}` ya enviados. Cambian solo el texto
visible, los correos y los documentos: las claves `lupa:*`, la cookie `lupa_sesion`, las bases
`lupaux`, el formato de respaldo `app:"lupaux"`, el formato `lupa-ux/reporte` y el proyecto de
Pages `lupa-ux` se quedan como están. Los nombres de los archivos y frames de Figma tampoco
cambian. Motivo: "Lupa UX" es descriptivo y se confunde con la categoría; los dominios de Mutis
UX están libres. Renombrar los identificadores borraría los datos locales, cerraría todas las
sesiones y rompería los respaldos ya descargados.

2026-10-27 - La beta pasa a ser privada: con `SOLO_AUTORIZADOS="1"` (producción y previews)
solo crean cuenta los emails de la tabla `autorizados`, que Luis maneja con
`scripts/autorizar.mjs`; el resto queda en `espera` y `MAX_CUENTAS` deja de aplicar. Las
cuentas que ya existen siguen entrando y quitar una autorización no las borra. Se eligió una
tabla en D1 y un script, como `publicar-ejemplo`, en lugar de un panel de administración
(fuera de alcance en la spec `cta`) o de una variable con la lista (cada cambio sería un
deploy). Motivo: al quitar Cloudflare Access cualquiera podía crear cuenta, y Luis quiere
aprobar a cada persona.
