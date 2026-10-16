# Feature: Páginas legales (términos, privacidad y almacenamiento)  ·  id: legal

Historia de usuario: Como consultor/a UX que usa Lupa UX con datos de mis clientes,
quiero leer qué se guarda, dónde y con quién se comparte, para usar la herramienta con
confianza y poder explicárselo a mis clientes.

Objetivo: publicar dentro de la app tres textos (términos de uso, política de
privacidad, y cookies y almacenamiento), escritos a partir de lo que la app hace hoy.
Se llega desde el pie de página (spec `home`). Surgió en la exploración
`explorar/onboarding` (commit `db8219a`).

## Criterios de aceptación

### Navegación
- Dado el pie de página, cuando se toca "Términos de uso", "Política de privacidad" o
  "Cookies y almacenamiento", entonces se abre la vista legal en esa sección
  (`state.view="legal"`, `state.legalTab`) y la página vuelve arriba.
- Dada la vista legal, cuando se ve, entonces tiene:
  - el botón "Volver a estudios", que lleva a la home;
  - un menú lateral "Información legal" con las tres secciones, con la actual marcada
    (`aria-current="page"`);
  - el texto de la sección con su título como `h1`;
  - al final, "Última actualización: {fecha}" (`ACTUALIZADO`).
- Dado el menú lateral, cuando se toca otra sección, entonces se muestra esa sin salir
  de la vista y la página vuelve arriba.
- Dada la vista legal, cuando se ve, entonces la barra superior y el pie de página
  siguen visibles (`body.in-legal`).
- Dada una pantalla de 760 px o menos, cuando se ve la vista legal, entonces el menú
  va arriba a todo el ancho (sin quedar fijo), el texto debajo con padding de 20 px, y
  no hay scroll horizontal.
- Dado el tema oscuro, cuando se ve la vista legal, entonces el texto se lee.

### Contenido (lo que cada texto tiene que decir y que el código hoy cumple)
- **Términos de uso:** para qué sirve (no genera diagnósticos automáticos), que el
  contenido es del usuario o de su cliente, cómo funcionan los reportes compartidos
  (link + PIN, PIN nuevo o despublicar), uso adecuado, disponibilidad (recomienda
  exportar respaldos) y cambios.
- **Política de privacidad:**
  - qué se guarda: el email de Cloudflare Access; el trabajo (estudios, pantallas,
    hallazgos, flujos, reportes, propuestas, marca); y, del cliente que abre un
    reporte, su nombre, la aceptación y la fecha, más la propuesta reservada si
    reserva;
  - para qué: solo para que la herramienta funcione, sin venta ni publicidad;
  - quién los recibe: Cloudflare (hosting, base y login), Resend (correo de aviso de
    reserva) y Google Fonts (tipografías). Sin servidor, todo queda en el navegador;
  - seguridad: el PIN público se guarda como hash, y el link se bloquea 15 minutos
    tras 5 intentos fallidos;
  - cuánto tiempo, y que al despublicar se borran la copia pública, los
    consentimientos y las reservas;
  - derechos: acceso, corrección y eliminación escribiendo a `info@uxuaria.com`, y
    exportar desde la home.
- **Cookies y almacenamiento:** sin cookies de publicidad ni de analítica; la cookie
  de sesión propia `lupa_sesion` (30 días, `HttpOnly`, `Secure`) y Turnstile al pedir
  un código; en el navegador, el tema, el último estudio y si ya vio la introducción;
  sin servidor, todo el trabajo. Explica que borrarlo pierde los datos locales.
- Con cuentas (spec `cta`, desde el 2026-10-16): términos con "Tu cuenta" (entrada por
  email, borrar la cuenta escribiendo a info@uxuaria.com) y "Versión beta" (1 estudio a
  la vez, 15 pantallas, ejemplo de solo lectura). La privacidad suma la cuenta, los
  códigos (solo su hash), la lista de espera, Turnstile y Resend para los códigos. Los
  tres textos se pueden leer desde la pantalla de entrada, antes de tener cuenta.
- Dado el responsable del tratamiento, cuando se lee la política de privacidad,
  entonces nombra a **Luis Carlos Romero** como responsable y a uxuaria como su
  marca ("El responsable de los datos es Luis Carlos Romero, que ofrece Lupa UX con
  su marca uxuaria."). Lo verifica `tests/e2e/home.spec.mjs`.

## Alcance
Vista legal (`src/views/legal.js`: `SECCIONES_LEGALES`, `abrirLegal`, `renderLegal`),
su ruta en `src/app/render.js`, los enlaces del pie (`src/ui/pie.js`) y los estilos
`.legal*` en `src/styles/base.css`.

## Fuera de alcance / No tocar
- El consentimiento del link público (`src/share/publico.js`, `POST /api/publico`) y
  el reporte del cliente (`SR_boot`): no cambian con esta spec (ver A CONFIRMAR).
- La API y `authorize()`: las páginas legales son texto fijo dentro de la app y no
  agregan rutas.
- Banner de cookies: no hace falta mientras no haya cookies que no sean necesarias.
- Textos en otros idiomas.

## Dependencias
- Lo que los textos afirman depende del comportamiento real de la app. Si cambia
  alguno de estos puntos, hay que actualizar el texto y `ACTUALIZADO`:
  - `functions/api/[[path]].js`: hash del PIN con SHA-256 y sal; `PUB_MAX_FALLOS` = 5
    y `PUB_BLOQUEO_MS` = 15 min; consentimientos y reservas guardados en
    `publicos/{id}`; aviso por Resend (`RESEND_API_KEY`).
  - `src/reportes/publicar.js`: generar un PIN nuevo y despublicar.
  - `index.html`: Google Fonts.
  - Claves de `localStorage` (`lupa:theme`, `lupa:active`, `lupa:onboarding:*`, y en
    modo `idb` todas las de datos).
- Pie de página (spec `home`) como única entrada.
- `goHome`, `render` y `view` de `app/render.js`.

## Estados (UI)
- Vacío: N/A (texto fijo). Si `legalTab` no existe, se muestra "Términos de uso".
- Carga: N/A (el texto viene en el bundle).
- Error: N/A (no hay pedidos a la red).

## Diseño
N/A. Se diseñó en código y reutiliza el menú lateral de Configuración (`.cf-item`) y el
botón de volver (`.cf-back`).

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan, las
  tres acciones críticas siguen funcionando y la vista previa de Reportes no cambia.
- Propio:
  - `tests/e2e/home.spec.mjs` cubre: abrir "Política de privacidad" desde el pie,
    cambiar a "Términos de uso" y "Cookies y almacenamiento" desde el menú, y "Volver
    a estudios".
  - Cada afirmación de los textos se puede verificar en el código (ver Dependencias).
  - La política nombra a Luis Carlos Romero como responsable.
  - Revisión legal hecha antes de publicar (ver A CONFIRMAR).
  - Revisado en 375 px y en tema oscuro.

## Dónde vive
- `src/views/legal.js`: `ACTUALIZADO`, `CONTACTO`, `SECCIONES_LEGALES`, `abrirLegal`,
  `renderLegal`.
- `src/app/render.js`: `state.view==="legal"` → `renderLegal()` y la clase `in-legal`.
- `src/ui/pie.js`: columna "Legal".
- `state.legalTab`: se asigna al vuelo en `legal.js` (no está declarado en `src/core/state.js`).
- `src/styles/base.css`: `.legal`, `.legal-in`, `.legal-nav`, `.legal-doc`, `.legal-fecha`.

## Conocido
- **A CONFIRMAR: revisión legal.** Nadie con formación legal revisó los textos.
- **A CONFIRMAR: país, jurisdicción y ley aplicable.** Los textos no los mencionan.
- **A CONFIRMAR: nombre completo del responsable.** El pie dice "Luis Carlos Romero
  León"; definir cuál va en la política.
- **A CONFIRMAR: condiciones en el link público.** El cliente marca "Acepto las
  condiciones de uso" (`src/share/publico.js`) sin un enlace para leerlas, y estas
  páginas quedan detrás de Cloudflare Access, así que el cliente no puede abrirlas.
- La API guarda solo los últimos 10 consentimientos (`PUB_MAX_CONSENT`) y las últimas
  20 reservas (`PUB_MAX_RESERVAS`) por reporte; los textos no lo dicen.
- Si no está configurado `RESEND_API_KEY`, no se envía ningún correo, aunque el texto
  nombre a Resend.
- `index.html` sigue pidiendo a Google Fonts Bricolage Grotesque e IBM Plex Sans, que
  ya no se usan (spec `home`). No es un problema legal, pero el pedido es innecesario.
