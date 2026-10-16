# Feature: Cuentas de usuario por email, datos separados y límites de la beta  ·  id: cta

Historia de usuario: Como consultor/a UX que quiere probar Lupa UX, quiero crear mi
cuenta solo con mi email y encontrar un estudio de ejemplo, para empezar a evaluar
un producto sin instalar nada ni recordar otra contraseña.

Objetivo: abrir la beta a 100 personas gratis. Cada una tiene su cuenta y entra con un
código por email, como Linear. El email trae un botón para entrar y un código de 6
dígitos. Cada cuenta ve solo sus datos, crea como máximo 1 estudio de hasta 15
pantallas y recorre un estudio de ejemplo compartido, de solo lectura. Todo con los
planes gratis de Cloudflare (Pages, D1 y Turnstile) y de Resend.

Se construye en 4 fases, en este orden. Cada fase se revisa antes de seguir:
1. Datos separados por cuenta (multiusuario) y migración de los datos actuales.
2. Login con código por email (reemplaza a Cloudflare Access).
3. Límites (1 estudio, 15 pantallas, 100 cuentas) y estudio de ejemplo.
4. Legales actualizados y lanzamiento por tandas.

## Criterios de aceptación

### Fase 1 · Datos separados por cuenta
- Dada una cuenta con sesión, cuando la app lee o escribe una ruta (`estudios/…`,
  `marca/perfil`, `cat_heur/…`, `cat_sesgo/…`), entonces la API la guarda y la lee
  en `u/{idCuenta}/{ruta}`. El cliente sigue usando las mismas rutas de siempre: el
  prefijo lo pone solo el servidor.
- Dadas dos cuentas A y B, cuando A pide cualquier ruta, entonces nunca recibe ni
  modifica documentos de B. Esto incluye `/api/collection`, `/api/doc` y `/api/export`.
- Dada una ruta enviada por el cliente que empieza con `u/`, cuando llega a la API,
  entonces se rechaza con 400. Nadie puede pedir el prefijo de otra cuenta.
- Dado `publicos/{id}`, cuando una cuenta lo publica, entonces queda global (sin
  prefijo, para que `/r/{id}` siga funcionando) y guarda `dueño = idCuenta`. Solo el
  dueño puede leerlo, actualizarlo o borrarlo por `/api/doc`; otra cuenta recibe 404.
  `POST /api/publico` (PIN) sigue igual.
- Dados los datos que existen hoy en D1 (sin dueño), cuando se corre la migración,
  entonces pasan a `u/{idCuenta del administrador}/…`, sin perder nada. Los
  `publicos/` existentes reciben `dueño` = administrador y sus links siguen
  funcionando.
- Dado el modo `idb` (sin servidor), cuando se usa la app, entonces todo funciona como
  hoy: sin cuentas, sin prefijo y sin límites.

### Fase 2 · Login con código por email
- Dado alguien sin sesión, cuando abre la app en modo servidor, entonces ve la
  pantalla de entrada: marca, "Entrá o creá tu cuenta", un campo de email, el chequeo
  de Turnstile y el botón "Continuar con email".
- Dado un email válido, cuando se toca "Continuar con email", entonces se manda un
  email con el botón "Entrar a Lupa UX" y un código de 6 dígitos. Los dos valen 10
  minutos y sirven una sola vez. La pantalla pasa a "Revisá tu email" con el email
  escrito, 6 casillas para el código y "Volver" para corregir el email.
- Dado el código correcto, cuando se escribe (o se pega), entonces se entra sin tocar
  ningún botón. Dado el botón del email, cuando se toca, entonces se entra en ese
  navegador.
- Dado un email sin cuenta, cuando valida el código por primera vez, entonces se crea
  la cuenta (`usuarios`: id, email, fecha). La primera vez y las siguientes son el
  mismo flujo: no hay "registrarse" aparte.
- Dado un ingreso correcto, cuando se entra, entonces la sesión dura **30 días** en una
  cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Después de 30 días se vuelve a pedir
  un código. La cuenta y sus datos no se borran nunca por esto.
- Dado un código incorrecto, cuando se escribe, entonces aparece "Código incorrecto".
  Con 5 fallos, el código deja de valer y hay que pedir otro.
- Dado un código vencido o ya usado, cuando se escribe o se toca el botón del email,
  entonces aparece "El código venció. Pedí uno nuevo." con el botón "Mandar otro código".
- Dado un pedido de código, cuando se pide otro para el mismo email antes de 60 s,
  entonces el botón "Mandar otro código" espera ("Podés pedir otro en {n} s"). Máximo
  5 códigos por email por hora.
- Dado el menú de usuario, cuando se toca "Cerrar sesión", entonces se borra la sesión
  en el servidor y en el navegador, y se vuelve a la pantalla de entrada.
- Dado el modo servidor sin sesión válida, cuando la app pide cualquier ruta de datos,
  entonces la API responde 401 en JSON y la app muestra la pantalla de entrada (sin
  el mensaje "la sesión venció, recargá").
- Dado Turnstile que no pasa, cuando se toca "Continuar con email", entonces no se
  manda el email y aparece "No pudimos verificar que no seas un robot. Probá de nuevo."

### Fase 3 · Límites y estudio de ejemplo
- Dada una cuenta con 1 estudio propio, cuando intenta crear otro, entonces la API
  responde 403 (`limite: "estudios"`). La tarjeta "Nuevo estudio" se muestra
  deshabilitada con el texto "En la beta podés tener 1 estudio". Editar el estudio
  propio sigue funcionando. El límite es **a la vez**: si borra su estudio, puede crear
  otro.
- Dado un estudio con 15 pantallas, cuando se intenta agregar otra, entonces la API
  responde 403 (`limite: "pantallas"`). La app muestra "15 de 15 pantallas" y
  desactiva el botón de agregar.
- Dadas 100 cuentas creadas, cuando un email nuevo pide código, entonces no se manda
  ningún email. Aparece "Los cupos de la beta están completos. Te avisamos cuando
  haya lugar." y el email queda en la lista de espera (`espera`). Las cuentas que ya
  existen siguen entrando normalmente. El tope se configura con `MAX_CUENTAS` (100).
- Dada cualquier cuenta, cuando abre la home, entonces ve el estudio de ejemplo
  primero, con la marca "Ejemplo". El ejemplo no cuenta para el límite de 1 estudio.
- Dado el estudio de ejemplo, cuando se recorre, entonces se ven sus pantallas,
  hallazgos y la vista previa del reporte. Arriba hay un aviso "Estudio de ejemplo ·
  solo lectura". No se pueden editar, agregar ni borrar cosas ni compartirlo: los
  controles no aparecen y la API responde 403 a cualquier escritura.
- Dado el administrador (`ADMIN_EMAILS`), cuando quiere cambiar el ejemplo, entonces
  edita un estudio propio en la app y lo publica con `scripts/publicar-ejemplo.mjs`,
  que lo copia a `ejemplo/estudios/ejemplo-{id}` (sin prefijo de cuenta y sin su link
  público). Volver a correrlo reemplaza la copia. El ejemplo no se edita desde la app,
  ni siquiera el administrador. El administrador no ocupa uno de los 100 cupos ni
  tiene límites de estudios o pantallas.
- Dado el estudio de ejemplo, cuando se arma, entonces evalúa una app **inventada**,
  con pantallas hechas a propósito (sin capturas de productos reales). Así no hay
  problemas de derechos.
- Dado `/api/me`, cuando se pide, entonces devuelve email, id, si es administrador,
  límites (`estudios: 1`, `pantallas: 15`) y uso actual.

### Fase 4 · Legales y lanzamiento
- Dadas las páginas legales (spec `legal`), cuando se leen, entonces dicen que hay
  cuentas por email, que Resend manda los códigos de entrada, que se guarda la sesión
  en una cookie propia (y ya no la de Cloudflare Access), qué se guarda de la lista
  de espera y cómo pedir que se borre una cuenta.
- Dada la beta abierta, cuando se lanza, entonces se hace en 3 tandas para no pasar
  los 100 emails por día de Resend gratis: `MAX_CUENTAS` = 20 el día 1, 50 el día 3 y
  100 la semana siguiente. Antes de cada tanda se mira el uso de emails en Resend.
- Dada la fase 2 en producción, cuando se lanza, entonces la app vive en
  `lupa.uxuaria.com` y los códigos salen desde `acceso@uxuaria.com`.
- Dadas las cuentas andando en producción, cuando se cierra la fase 4, entonces se
  quita Cloudflare Access: el proyecto y sus políticas en Cloudflare,
  `AUTH_MODE="access"`, `verifyAccess()` y las variables `ACCESS_*`.

## Alcance
- API (`functions/api/[[path]].js`):
  - prefijo por cuenta en `doc`, `collection` y `export`;
  - dueño en `publicos/`;
  - rutas de login (`/api/auth/codigo`, `/api/auth/verificar`, `/api/auth/salir`);
  - sesiones, límites y estudio de ejemplo.
- Migración nueva en `migrations/` (tablas `usuarios`, `sesiones`, `codigos` y
  `espera`) y un script para pasar los datos actuales al administrador.
- Cliente:
  - pantalla de entrada y de código;
  - `ui/sesion.js` (cerrar sesión propio);
  - home (ejemplo primero, tarjeta "Nuevo estudio" deshabilitada);
  - modo solo lectura del estudio de ejemplo;
  - aviso de 15 pantallas.
- Plantilla del email con botón y código (HTML simple, sin imágenes externas).
- Textos legales (spec `legal`).

## Fuera de alcance / No tocar
- Fuera de alcance:
  - contraseñas;
  - "Entrar con Google" u otros proveedores;
  - pagos y planes;
  - equipos o cuentas compartidas;
  - cambiar el email de una cuenta;
  - borrar la cuenta desde la app (en la beta se pide por email);
  - panel de administración (se usa D1 directo);
  - avisar automáticamente a la lista de espera.
- No tocar:
  - el modo `idb`, que sigue sin cuentas;
  - `SR_boot` y `vistaCliente()`;
  - la validación de PIN de `POST /api/publico`;
  - el formato de los documentos (solo cambia dónde se guardan).
- No borrar el soporte de Cloudflare Access hasta que las cuentas estén en
  producción. Se quita al cerrar la fase 4.

## Dependencias
- **Cloudflare Pages + Functions** (plan gratis): 100.000 pedidos por día, 10 ms de CPU
  por pedido y ráfaga de 1.000 por minuto. El login no hace cálculo pesado (no hay
  contraseñas que proteger).
- **Cloudflare D1** (plan gratis): 500 MB por base, 5 millones de lecturas y 100.000
  escrituras por día, 2 MB por documento. Con 15 pantallas (~240 KB cada una), serían
  ≈3,6 MB por cuenta y ≈360 MB para 100 cuentas.
- **Resend** (plan gratis): 100 emails por día, 3.000 por mes y 1 dominio. El límite
  se comparte con los avisos de reserva. Hace falta el dominio `uxuaria.com`
  verificado en Resend y `RESEND_API_KEY`.
- **Cloudflare Turnstile** (gratis): `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET`. Es el
  único script externo nuevo, y solo en la pantalla de entrada en modo servidor (el
  modo `idb` sigue funcionando sin red).
- Variables nuevas: `AUTH_MODE="cuentas"`, `ADMIN_EMAILS`, `MAX_CUENTAS`,
  `SESION_DIAS` (30) y, solo en desarrollo y tests, `AUTH_CODIGO_EN_RESPUESTA="1"`
  (devuelve el código en la respuesta en lugar de mandar el email).
- `authorize()` pasa a validar la cookie de sesión. **Cambia una regla de AGENTS.md:**
  las rutas `/api/auth/*` también quedan fuera de `authorize()`, además de
  `POST /api/publico`. Hay que registrarlo en `decisions.md` y actualizar AGENTS.md.
- Specs relacionadas: `d1`, `ses`, `home`, `hz`, `rpt`, `legal`.

## Estados (UI)
- Vacío:
  - una cuenta nueva ve el estudio de ejemplo y la tarjeta "Nuevo estudio";
  - la lista de espera muestra el mensaje de cupos completos.
- Carga:
  - "Continuar con email" pasa a "Enviando…";
  - al validar el código, "Entrando…";
  - mientras se resuelve la sesión al abrir la app, la pantalla de entrada no
    parpadea.
- Error:
  - email inválido: "Escribí un email válido.";
  - Resend falla: "No pudimos mandar el email. Probá en unos minutos.";
  - código incorrecto o vencido (ver criterios);
  - demasiados pedidos: "Pediste muchos códigos. Probá en una hora.";
  - límite alcanzado (403) con su mensaje;
  - sin conexión: el mensaje de hoy.

## Diseño
N/A, sin Figma. Las pantallas de entrada y de código se arman en código con el design
system actual (spec `ds`), al estilo de Linear: email → "Revisá tu email" con
casillas de código, y el email con botón y código. Se ajustan mirando la vista previa.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan, las
  tres acciones críticas siguen funcionando y la vista previa de Reportes refleja los
  cambios.
- Propio:
  - `smoke` prueba el aislamiento: la cuenta A no puede leer, listar, exportar ni
    borrar nada de B, ni rutas con `u/` ni `publicos/` ajenos.
  - e2e con `AUTH_CODIGO_EN_RESPUESTA`: entrar con código, crear la cuenta, el código
    incorrecto, cerrar sesión, el límite de 1 estudio, el de 15 pantallas, el ejemplo
    en solo lectura y los cupos completos.
  - La migración de datos se prueba antes en una copia de la base: mismo número de
    documentos antes y después, y los links públicos existentes siguen abriendo.
  - Revisado en 375 px y en tema oscuro (pantallas de entrada y de código).
  - Actualizar `architecture.md` (modelo de datos con `u/{id}/`, tablas y rutas nuevas),
    `decisions.md` y AGENTS.md (rutas fuera de `authorize()`).

## Conocido
- Decisiones del 2026-10-16:
  - el límite de 1 estudio es a la vez;
  - el administrador va fuera de los cupos y sin límites;
  - Cloudflare Access se quita;
  - la app vive en `lupa.uxuaria.com` y los emails salen de `acceso@uxuaria.com`;
  - el ejemplo es una app inventada;
  - las tandas son de 20, 30 y 50;
  - el diseño se hace en código.
- `lupa.uxuaria.com` necesita el DNS de uxuaria.com en Cloudflare, o un CNAME hacia el
  proyecto de Pages, y agregar el dominio en Pages. `acceso@uxuaria.com` sale del
  dominio verificado en Resend: no hace falta una casilla real, pero conviene que las
  respuestas lleguen a algún lado.
- Cada vencimiento de sesión cuesta un email. Con 30 días y 100 cuentas son ≈100
  emails por mes, más los de entrada en otros navegadores. Está dentro del plan gratis.
- Cuando se acerquen los límites gratis: Resend Pro (US$20 por mes) si se pasan los
  100 emails por día, y Workers Paid (US$5 por mes, 10 GB en D1) o R2 para las
  imágenes si la base se acerca a 500 MB. R2 pide una tarjeta para activarse.
- Fase 3 (2026-10-16): en el ejemplo se ocultan los controles principales de edición
  (`body.solo-lectura` en `base.css`). Cualquier otro que quede visible lo frena
  `backend.js` sin ir al servidor, con el aviso "El estudio de ejemplo es de solo
  lectura.", y la API responde 403. Revisar a mano si queda algún control a la vista.
- Resuelto el 2026-10-16 (`cuentaBeta()` en `reportes/comun.js`). Las cuentas de la beta
  arrancan con la marca vacía y sin propuestas de trabajo, porque antes heredaban las de
  uxuaria. Esos valores quedan para el administrador y para los modos sin cuentas. Además,
  con cuentas, el aviso de una reserva le llega al dueño del estudio y no a
  `RESERVA_TO` (salvo que el dueño sea administrador). El estudio de ejemplo conserva
  las propuestas del estudio del que se copió.
