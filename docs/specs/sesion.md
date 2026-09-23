# Feature: Sesión visible (Cloudflare Access)  ·  id: ses

Historia de usuario: Como consultor/a UX que usa la app hosteada, quiero ver con qué
cuenta entré y poder cerrar sesión, para saber que mis datos están protegidos y salir
en un equipo compartido.

Objetivo: mostrar en la barra superior quién está usando la app (el email con el que
Cloudflare Access dejó entrar) y ofrecer "Cerrar sesión", sin cambiar quién hace el
login: sigue siendo Access, antes de que cargue la app.

## Criterios de aceptación
- Dada la API con `AUTH_MODE="access"` y un JWT de Access válido, cuando se pide
  `GET /api/me`, entonces responde `{email, local:false}` con el email tomado del JWT
  ya verificado (no de un header sin verificar).
- Dada la API sin JWT o con uno inválido, cuando se pide `GET /api/me`, entonces
  responde 401 como cualquier otra ruta (y 503 si falta la config de Access).
- Dada la API con `AUTH_MODE="none"` (desarrollo), cuando se pide `GET /api/me`,
  entonces responde `{email:null, local:true}`.
- Dada la app en modo `server` con sesión de Access, cuando carga, entonces aparece a
  la derecha de la barra el menú de usuario (avatar con la inicial, nombre de la
  marca, email y flecha); al tocarlo se abre con el email, "Sesión de Cloudflare
  Access" y "Cerrar sesión". (Formato visual: spec `home`.)
- Dado el menú abierto, cuando se toca "Cerrar sesión", entonces navega a
  `/cdn-cgi/access/logout` (logout estándar de Access).
- Dado el menú abierto, cuando se hace clic afuera o se aprieta Esc, entonces se cierra.
- Dada la app en desarrollo local (`AUTH_MODE="none"`), cuando carga, entonces el menú
  de usuario dice "Desarrollo local" / "Sin login", el menú explica que en producción aparece el email, y no
  hay botón de cerrar sesión.
- Dada la app en modo `idb` (sin API), cuando carga, entonces no aparece el chip.
- Dada una pantalla chica (≤ 640 px, probado en 375 px), cuando se ve la barra,
  entonces todo entra sin scroll horizontal: el menú de usuario muestra solo la
  inicial y se abre a lo ancho de la pantalla (resto de la barra: spec `home`).
- Con menú de usuario, el badge de modo y el botón de tema pasan adentro del menú
  ("Datos guardados en el servidor" y "Cambiar tema claro / oscuro"); sin él (modo
  `idb`), siguen en la barra.

## Alcance
Ruta `GET /api/me`, `authorize()` devolviendo también quién entró, el chip con su
menú en la barra superior y sus estilos, y la barra compacta en pantallas chicas.

## Fuera de alcance / No tocar
- Fuera de alcance: login propio, usuarios o roles en D1, datos por usuario, aviso
  específico de "sesión vencida" (sigue el mensaje genérico de `backend.js`), avatar
  con foto.
- `authorize()` es zona sensible: toda ruta, incluida `/api/me`, pasa por ella. No
  agregar rutas antes del chequeo.
- La decisión de usar Cloudflare Access (decisions.md, 2026-09-22) no cambia.

## Dependencias
- Cloudflare Access delante de la app en producción y previews (`ACCESS_TEAM_DOMAIN`,
  `ACCESS_AUD`) y su ruta de logout `/cdn-cgi/access/logout`.
- `functions/api/[[path]].js` (`verifyAccess`, `authorize`).
- `DB_MODE` de `src/data/backend.js` e `init()` de `src/main.js`.

## Estados (UI)
- Vacío: sin API o sin respuesta válida de `/api/me`, no se muestra el chip.
- Carga: el chip aparece cuando responde `/api/me`; mientras tanto la barra se ve
  sin él.
- Error: si `/api/me` falla, el chip no aparece y la app sigue funcionando (sin aviso).

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: en local, `GET /api/me` responde `{email:null,local:true}` y se ve el chip
  "Desarrollo local"; la variante con email se verifica simulando la respuesta de
  `/api/me`; en producción, después del deploy, verificar el email real y que
  "Cerrar sesión" vuelva a pedir el login de Access.

## Dónde vive
`functions/api/[[path]].js` (`verifyAccess` devuelve el payload, `authorize` devuelve
`{denied}` o `{user}`, ruta `me`), `src/ui/sesion.js` (`mountSesion`), el contenedor
`#userSlot` en `index.html`, la llamada en `init()` de `src/main.js` y los estilos
`.user-*` y la barra compacta (`@media (max-width:640px)`) al final de
`src/styles/base.css`.

## Conocido
- En local no hay JWT de Access: el email real y el logout solo se pueden probar en
  un deploy con Access configurado.
