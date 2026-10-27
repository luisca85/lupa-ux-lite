# Feature: Onboarding de bienvenida en 5 pasos  ·  id: onb

Historia de usuario: Como consultor/a UX que entra por primera vez a Mutis UX, quiero
una introducción breve sobre el espíritu de la herramienta y sus secciones, para
entender cómo está organizada antes de cargar mi primer estudio.

Objetivo: presentar la herramienta la primera vez que cada usuario entra. Cuenta el
espíritu (el criterio humano no se automatiza, sin reportes hechos con IA) y las
secciones Hallazgos, Flujos, Personas y Reportes. Se puede saltar en cualquier momento
y volver a ver desde el menú de usuario. Surgió en la exploración `explorar/onboarding`.

## Criterios de aceptación
- Dado un usuario que nunca vio el onboarding en este navegador, cuando abre la app,
  entonces aparece un modal de bienvenida (`role="dialog"`, `aria-modal`) que tapa la app
  y bloquea el scroll del fondo (`body.onb-open`).
- Dado el modal, cuando se ve, entonces tiene dos columnas: la imagen del paso a la
  izquierda (56%) y el texto a la derecha con "Paso {n} de 5", el botón "Saltar", la
  etiqueta de la sección, un título, párrafos, la lista "Lo que vas a encontrar" (si
  el paso la tiene), un cierre opcional, puntos de paso y los botones "← Atrás" y
  "Siguiente →".
- Dados los 5 pasos, cuando se recorren, entonces son, en orden:
  1. El espíritu: "El criterio humano es irreemplazable".
  2. Hallazgos: "El eureka: donde empieza todo diagnóstico".
  3. Flujos: "El camino del usuario, de principio a fin" (sin "Pronto" desde el 2026-10-20).
  4. Personas: "A quién nos dirigimos", con la marca "Pronto".
  5. Reportes: "Un reporte que construye relaciones".
- Dado el paso 1, cuando se ve, entonces "← Atrás" está deshabilitado. Dado el paso 5,
  cuando se ve, entonces el botón principal dice "Empezar".
- Dado cualquier paso, cuando se toca "Siguiente →" o "← Atrás", se presiona → o ←, o
  se toca uno de los puntos (`role="tab"`, "Paso {n}: {sección}"), entonces el modal va
  a ese paso. Cambian la imagen (con fundido) y el color de fondo de la columna de la
  imagen, y el texto vuelve arriba. → no avanza si el foco está en un campo de texto.
- Dada una imagen apaisada (pasos 2 y 3), cuando se muestra, entonces se ve entera
  sobre el color de su papel, sin recortar. El resto llena la columna.
- Dado el modal abierto, cuando se toca "Saltar" o "Empezar" o se presiona Escape,
  entonces se cierra y queda guardado que este usuario ya lo vio
  (`localStorage` `lupa:onboarding:{email}`, o `lupa:onboarding:local` sin sesión de
  Access). Al recargar no vuelve a aparecer solo.
- Dado el modal abierto, cuando se navega con Tab, entonces el foco no sale del
  modal. Al abrirse, el foco va a "Siguiente →"; al cerrarse, vuelve a donde estaba.
- Dado el menú de usuario (modo `server`), cuando se elige "Ver introducción",
  entonces el onboarding se abre de nuevo desde el paso 1.
- Dado un navegador automatizado (`navigator.webdriver`), cuando abre la app, entonces
  el onboarding no aparece solo, salvo que esté `localStorage`
  `lupa:onboarding:forzar`. Así no tapa la app en el resto de los tests e2e.
- Dada una pantalla chica (≤ 760 px), cuando se ve el modal, entonces ocupa toda la
  pantalla, la imagen va arriba (38% del alto) y el texto abajo con scroll propio.
- Dado `prefers-reduced-motion`, cuando se abre o se cambia de paso, entonces no hay
  animaciones ni transiciones.
- Dado el modal, cuando se lo usa, entonces no hay errores en consola (`pageerror`).

## Alcance
Modal de bienvenida (`src/ui/onboarding.js`), su arranque en `src/main.js` después de
resolver la sesión, la opción "Ver introducción" del menú de usuario (`src/ui/sesion.js`),
estilos `.onb*` en `src/styles/base.css` y las 5 imágenes en `src/assets/onboarding/`.

## Fuera de alcance / No tocar
- No se guarda en el servidor ni en `DB` que el usuario ya lo vio: se recuerda solo
  en este navegador (decisión del usuario). En otro navegador o dispositivo aparece
  una vez más.
- No es un tour guiado sobre la interfaz (no señala botones ni pantallas reales).
- No cambia la home, el alta de estudio ni las secciones que describe.
- No toca la capa de persistencia, la API ni `SR_boot`.

## Dependencias
- Sesión de Cloudflare Access (`ui/sesion.js`): da el email para la clave de
  `localStorage`. Sin sesión o en modo local se usa `local`.
- `LS` y `esc` de `core/util.js`.
- Vite, para importar las imágenes `.webp` como assets del build.
- Secciones descritas: Hallazgos (spec `hz`) y Reportes (spec `rpt`) existen. Flujos
  (spec `flujos`) y Personas se muestran como "Pronto".

## Estados (UI)
- Vacío: N/A (el contenido es fijo, siempre hay 5 pasos).
- Carga: N/A. Las imágenes vienen en el build; mientras cargan se ve el color de fondo
  del paso.
- Error: si `localStorage` no está disponible, el onboarding puede volver a aparecer
  en cada entrada. Si falla la sesión, se abre igual con la clave `local`.

## Diseño
N/A. Se diseñó directo en código durante la exploración. Imágenes: grabados y
litografías antiguas de dominio público.

## Definición de hecho
- `npm run check` pasa, `npm run smoke` da "Todo OK" y `npm run test:e2e` pasa.
- Las tres acciones críticas siguen funcionando (test de regresión de AGENTS.md).
- La vista previa en vivo de Reportes (= link público, mismo `SR_boot`) no cambia.
- `tests/e2e/onboarding.spec.mjs` cubre: 5 pasos, ir y volver (botones, puntos y
  teclado), marca "Pronto", Saltar, que no reaparezca al recargar y, en modo
  `server`, "Ver introducción" hasta "Empezar".
- Probado en 375 px sin scroll horizontal y en tema oscuro.

## Dónde vive
- `src/ui/onboarding.js`: `PASOS`, `onboardingInicial(usuario)`, `abrirOnboarding(usuario)`.
- `src/main.js`: llamada a `onboardingInicial` cuando se resuelve la sesión.
- `src/ui/sesion.js`: opción "Ver introducción" (`#userIntro`).
- `src/styles/base.css`: bloque "Onboarding" (`.onb-bg`, `.onb`, `.onb-media`, `.onb-side`…).
- `src/assets/onboarding/1.webp` … `5.webp`.
- `tests/e2e/onboarding.spec.mjs`.

## Conocido
- El paso 4 (Personas) dice "Pronto". Cuando la sección esté lista, hay que sacar
  `pronto` y el texto de cierre de `PASOS`. El paso 3 (Flujos) ya no lo dice.
- La fuente exacta de cada imagen no quedó registrada: **A CONFIRMAR** (para dar
  crédito si hace falta).
- "Ver introducción" solo existe en el menú de usuario, que no aparece en modo `idb`:
  ahí no hay forma de volver a verlo. **A CONFIRMAR** si hace falta otra entrada.
