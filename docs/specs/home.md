# Feature: Home y barra superior (rediseño Figma)  ·  id: home

Historia de usuario: Como consultor/a UX, quiero que la primera pantalla me muestre
todos mis estudios en un panel y me deje crear uno nuevo con un solo clic, para
arrancar a trabajar sin buscar dónde.

Objetivo: aplicar el diseño de Figma "proyect Workspace 3" a la barra superior de toda
la app. La home se rediseñó dos veces:
- En `explorar/pagina-principal` se quitó la sección "Diagnóstico" con sus indicadores
  y quedó un panel central de estudios.
- En `explorar/onboarding` se aplicó el Figma 55:1522: el panel de Recursos a la
  izquierda y Estudios en una tarjeta a la derecha. Se sumaron el paginador, el alta
  de estudio en dos pasos dentro del bloque (sin modal) y el pie de página.

## Criterios de aceptación

### Barra superior
- Dada una pantalla fuera de un estudio, cuando se ve la barra superior, entonces muestra:
  - la marca: el logo redondo de uxuaria (38 px, `logo-uxuaria.webp`), "uxuaria" y
    "Lupa Ux" debajo;
  - un buscador de 260 px con el texto guía "Buscar estudios";
  - en modo `server`, el menú de usuario (avatar con la inicial, nombre, email y flecha).
- Dado el menú de usuario abierto, cuando se lo usa, entonces ofrece:
  - "Datos guardados en el servidor";
  - "Cambiar tema claro / oscuro";
  - "Ver introducción" (spec `onb`);
  - "Cerrar sesión" (en local, la nota de desarrollo en lugar del logout).

  Con menú de usuario, el badge de modo y el botón de tema no aparecen en la barra.
  Sin él (modo `idb`), siguen en la barra.
- Dado un texto en el buscador, cuando se escribe, entonces la home muestra solo los
  estudios cuyo nombre, cliente, URL o plataforma lo contienen, y vuelve a la página 1.
  Desde otra pantalla, escribir lleva a la home.
- Dada la barra superior, cuando se ve, entonces no muestra la navegación "Estudios" /
  "Catálogo" (Figma "Ux-Diagnostic-tool"). La marca lleva a la home y el Catálogo se abre
  desde el panel de Hallazgos (spec `hz`). Dentro de un estudio la barra no aparece
  (spec `proy`).

### Disposición de la home
- Dada la home, cuando se abre, entonces NO muestra el título "Diagnóstico" ni los
  indicadores de Diagnósticos, Clientes y Hallazgos.
- Dada la home en escritorio, cuando se ve, entonces hay dos bloques en fila con 24 px
  de separación y padding 20 × 32 × 32 px:
  - a la izquierda, Recursos (`aside` "Recursos"): fondo degradado verde, ancho
    `min(626px, 44%)` y alto mínimo de 711 px;
  - a la derecha, Estudios: una tarjeta con fondo `--card`, borde, radio `--r-card`,
    sombra suave y padding de 28 px.
- Dado un ancho de 1100 px o menos, cuando se ve la home, entonces Recursos queda
  arriba y Estudios abajo, sin alto mínimo. Con 760 px o menos, el padding de la home
  es de 12 px y el de la tarjeta, de 16 px.

### Recursos
- Dado el panel de Recursos, cuando se ve, entonces muestra:
  - el ícono de montaña, el título "Recursos" y la bajada "Lecturas validadas para
    evaluar con criterio.";
  - un recurso destacado: fuente, título, autor y fecha, nota y "Leer";
  - flechas "Recurso anterior" y "Recurso siguiente" y un punto por recurso (8);
  - "Más para leer", con los 4 recursos que siguen en la rotación;
  - un "Consejo de Lupa" al azar entre 5.
- Dados los 8 recursos de `RECURSOS` (NN/g, Baymard, uxuaria y Sakura 64), cuando se
  entra a la home, entonces el orden se baraja. Los de uxuaria y Sakura 64 se marcan
  como propios (`propio`).
- Dado el destacado, cuando pasan 8 s, entonces pasa al siguiente. Se pausa con el
  mouse o el foco encima y con la pestaña oculta. Se detiene al salir de la home.
- Dado un enlace de Recursos, cuando se toca, entonces abre en una pestaña nueva
  (`target="_blank"`, `rel="noopener"`). No se cargan imágenes externas.

### Estudios
- Dado el bloque de Estudios, cuando se lee su cabecera, entonces muestra el título
  "Estudios" y debajo la cantidad ("3 estudios", "1 estudio"). Con texto en el
  buscador, muestra "{n} de {total} estudios coinciden con “{texto}”". Sin estudios,
  muestra "Todavía no hay estudios. Creá el primero para empezar a evaluar un sitio o
  app.".
- Dados varios estudios, cuando se listan, entonces van del más nuevo al más viejo
  (`createdAt`), como tarjetas en una grilla de columnas de al menos 300 px
  (`auto-fill`). Cada tarjeta tiene su conteo de hallazgos, editar y borrar.
- Dada la grilla, cuando se mira la primera posición de cada página, entonces hay una
  tarjeta vacía que funciona como botón "Nuevo estudio":
  - borde punteado, ícono "+" y el texto "Cargá cliente, plataforma y URL";
  - del mismo alto que un estudio (208 px) y radio 6, como las tarjetas (spec `ds`);
  - aparece siempre: sin estudios, con estudios y con búsqueda.
- Dada una búsqueda sin coincidencias, cuando se ve la home, entonces queda la
  tarjeta "Nuevo estudio" y debajo "Ningún estudio coincide con la búsqueda.".

### Paginador
- Dados más estudios de los que entran en la pantalla, cuando se ve la home, entonces
  la cantidad por página se calcula así: columnas × filas que entran en la ventana
  (mínimo 2 filas), menos 1 por la tarjeta "Nuevo estudio".
- Dado ese caso, cuando se ve el paginador ("Páginas de estudios"), entonces muestra
  "Mostrando {desde}–{hasta} de {total}", "‹ Anterior", los números de página y
  "Siguiente ›". Con más de 7 páginas se ven la primera, la última y las vecinas de la
  actual, con "…" en los huecos. La página actual tiene `aria-current="page"`. En la
  primera, "‹ Anterior" está deshabilitado, y en la última, "Siguiente ›".
- Dado un cambio de tamaño de la ventana, cuando se termina de redimensionar (200 ms),
  entonces la cantidad por página se recalcula. No pasa si hay un modal abierto.
- Dada una sola página, cuando se ve la home, entonces no hay paginador.

### Nuevo estudio (en el bloque, sin modal)
- Dada la tarjeta "Nuevo estudio", cuando se toca, entonces el bloque de Estudios se
  reemplaza por el formulario "Nuevo estudio", sin modal. Recursos sigue a la
  izquierda. El formulario ocupa el 100% del bloque.
- Dado el formulario, cuando se ve, entonces tiene dos pasos ("Pasos": "Datos básicos"
  y "Detalles"), con el paso actual marcado (`aria-current="step"`):
  - Paso 1: "Nombre del estudio" (obligatorio), "Cliente" (opcional), "Plataforma"
    (por defecto, la primera de `PLATAFORMAS`) y "URL o referencia" (opcional).
  - Paso 2: "Estado" (por defecto, "En curso"), "Fecha" (por defecto, hoy) y
    "Descripción / alcance" (opcional).
- Dado el paso 1 sin nombre, cuando se toca "Siguiente →", entonces aparece "Poné un
  nombre para el estudio." (`role="alert"`) y el foco va al nombre.
- Dados datos cargados, cuando se va y se vuelve entre pasos con "Siguiente →",
  "← Atrás" o el botón superior, entonces los datos se conservan.
- Dado el botón superior, cuando se toca, entonces en el paso 1 ("Estudios") vuelve a
  la lista y en el paso 2 ("Datos básicos") vuelve al paso 1. "Cancelar" y Escape
  vuelven a la lista sin crear nada. Escape no actúa si hay un modal abierto.
- Dado el paso 2, cuando se toca "Crear estudio", entonces el botón dice "Creando…",
  se deshabilita y se crea el estudio (`guardarEstudio`). Si falla, aparece "No se
  pudo crear: {error}", el botón vuelve a "Crear estudio" y los datos se conservan.
- Dado un ancho de 640 px o menos, cuando se ve el formulario, entonces los campos van
  en una columna y el botón principal ocupa todo el ancho, arriba de los demás.
- Editar un estudio desde su tarjeta sigue abriendo el modal (`studyModal`).

### Pie de página
- Dada la home o una página legal, cuando se ve el final, entonces hay un pie de
  página (`#sitePie`) con:
  - la marca uxuaria, "Lupa UX · diagnóstico de experiencia con criterio humano" y
    "Luis Carlos Romero León · Consultor en diseño de experiencia de usuario";
  - "Contacto": `info@uxuaria.com` (mailto) y `uxuaria.com` (pestaña nueva);
  - "Legal": "Términos de uso", "Política de privacidad" y "Cookies y almacenamiento",
    que abren la página legal correspondiente (spec `legal`);
  - "Tus datos", solo con respaldo (`DB.dumpAll`): "Exportar datos" e "Importar
    datos", que antes estaban arriba del panel;
  - "© {año actual} uxuaria. Todos los derechos reservados.".
- Dado un estudio abierto, cuando se ve, entonces no hay pie de página.

### Temas y pantallas chicas
- Dado el tema oscuro, cuando se ven la home, la barra y el pie, entonces el fondo,
  las tarjetas, el texto y los íconos cambian de color y todo se lee. Recursos
  mantiene su verde y sus tarjetas blancas.
- Dada una pantalla chica (probado en 375 px), cuando se ve la home, entonces no hay
  scroll horizontal: el buscador se oculta por debajo de 900 px, la grilla va en una
  columna y la barra queda con la marca y la inicial.
- Toda la app usa la tipografía Geist (antes IBM Plex Sans y Bricolage Grotesque).
  IBM Plex Mono sigue para los textos monoespaciados.

## Alcance
- Barra superior (`index.html`, `renderTopbar`) y logo de uxuaria.
- Menú de usuario (`ui/sesion.js`).
- Home (`views/home.js`): disposición en dos bloques, tarjetas, paginador y alta de
  estudio en dos pasos.
- Panel de Recursos (`views/recursos.js`).
- Pie de página (`ui/pie.js`).
- Tokens y estilos en `base.css`, e íconos e imágenes del Figma en `src/assets/figma/`.

## Fuera de alcance / No tocar
- Fuera de alcance:
  - el rediseño de la vista de estudio (spec `proy`), el catálogo, los hallazgos, los
    flujos y los reportes (solo heredan la fuente y la barra);
  - volver a mostrar indicadores en la home;
  - la foto de usuario en el avatar;
  - el contenido de las páginas legales (spec `legal`);
  - el modal de edición de estudio.
- No editar los SVG del Figma: se usan como máscara (`.fig-ico`) para que tomen el
  color del tema.
- `/api/me` y `authorize()` (spec `ses`) no cambian.
- `guardarEstudio` y la capa `store` no cambian: el alta nueva solo cambia la
  interfaz.

## Dependencias
- Diseño de Figma (ver abajo). Fuentes Geist e Inter desde Google Fonts, con fallback
  al sistema.
- `store.listEstudios` / `listHallazgos`, `guardarEstudio`, `studyModal`,
  `confirmDelStudy`, `exportAllData` / `importAllData`.
- `PLATAFORMAS` y `ESTADOS` de `core/catalogo-base.js`.
- `marcaActual()` (nombre del menú de usuario) y `GET /api/me` (spec `ses`).
- `SECCIONES_LEGALES` y `abrirLegal` de `views/legal.js` (spec `legal`).
- Sitios externos de Recursos: nngroup.com, baymard.com, uxuaria.com y
  sakura64.uxuaria.com. Son solo enlaces: la home no depende de ellos para funcionar.

## Estados (UI)
- Vacío: la tarjeta de Estudios con el texto "Todavía no hay estudios…" y solo la
  tarjeta "Nuevo estudio". Con una búsqueda sin resultados, "Ningún estudio coincide
  con la búsqueda.". Recursos siempre tiene contenido (lista fija).
- Carga: el conteo de hallazgos de cada tarjeta muestra "·" hasta terminar de contar.
  Al crear un estudio, el botón dice "Creando…".
  **A CONFIRMAR**: indicador de carga al abrir la app (hoy se ve la pantalla vacía
  ~1 s).
- Error:
  - si falla el conteo de hallazgos de un estudio, su tarjeta queda en "·" sin aviso;
  - si falla la creación del estudio, aparece "No se pudo crear: {error}" en el
    formulario y los datos se conservan.

## Diseño
- Barra: Figma "Lupa-UX", frame "proyect Workspace 3":
  https://www.figma.com/design/UCD0n9KHtihWGtd8kR5Z5D/Lupa-UX?node-id=2045-1078
- Home (Recursos + Estudios, paginador y pie): Figma "Ux-Diagnostic-tool", nodo 55:1522:
  https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=55-1522
- El alta de estudio en dos pasos dentro del bloque se definió en la exploración
  `explorar/onboarding` (commits `3c3a981` y `431f085`), que sirve de referencia visual.

Desvíos acordados respecto del Figma en la barra:
- avatar con inicial (no hay fotos);
- nombre desde la marca;
- tema y badge dentro del menú de usuario;
- texto guía en el buscador;
- "Catálogo" con la ortografía corregida.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan, las
  tres acciones críticas siguen funcionando y la vista previa de Reportes no cambia.
- Propio:
  - Comparar la barra en 1440 px contra el Figma 2045-1078, y la home contra el 55:1522.
  - Ver la home con base vacía, con estudios, con más estudios de los que entran
    (paginador) y con una búsqueda sin coincidencias.
  - `tests/e2e/home.spec.mjs` cubre: el alta en dos pasos sin modal (validación,
    conservar datos, Atrás, Escape), el paginador, el pie de página con contacto y
    legales, y que no haya pie dentro de un estudio.
  - `tests/e2e/onboarding.spec.mjs` cubre Recursos: destacado en pestaña nueva, 4
    enlaces en "Más para leer", flecha siguiente y 8 puntos.
  - Revisar el tema oscuro, la home en 1440, 1100, 800 y 375 px, y que en 375 px no
    haya scroll horizontal.
  - Actualizar `architecture.md` (`views/home.js`, `views/recursos.js`, `ui/pie.js`,
    `views/legal.js`).

## Dónde vive
- `index.html`: barra (`.brand-logo`) y `<footer id="sitePie">`.
- `src/app/render.js`: `renderTopbar`, buscador, `renderPie()` en cada render y clases
  `in-home` / `in-legal`.
- `src/views/home.js`: `renderHome`, `porPagina`, `paginador`, `formNuevo`, `studyCard`.
- `src/views/recursos.js`: `RECURSOS`, `CONSEJOS`, `renderRecursos`.
- `src/ui/pie.js`: `renderPie`.
- `src/ui/sesion.js`: menú de usuario.
- `src/core/state.js`: `homeQuery`. `homePagina`, `homePorPagina`, `homeQ` y `homeNuevo` se asignan al vuelo en `home.js` (no están declarados en `state.js`).
- `src/styles/base.css`:
  - tokens, `.fig-ico` y barra;
  - `.home`, `.home-panel`, `.hp-*`, `.study-add`, `.sa-*`;
  - bloque "Home (Figma 55:1522)": `.home-rec`, `.rec-*`, `.pg*`, `.ne*` y `.pie*`.
- `src/assets/figma/`: íconos, `logo-uxuaria.webp` y `montana.svg`.

## Conocido
- Los enlaces de Recursos apuntan a sitios externos y pueden cambiar o romperse. Para
  sumar o quitar uno, editar `RECURSOS` en `views/recursos.js`.
- Las reglas viejas de `.hp-grid` (4, 3, 2 y 1 columnas) siguen en `base.css`, pero
  `.home-est .hp-grid` (`auto-fill`, mínimo 300 px) las pisa. **A CONFIRMAR** si se
  borran.
