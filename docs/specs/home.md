# Feature: Home y barra superior (rediseño Figma)  ·  id: home

Historia de usuario: Como consultor/a UX, quiero que la primera pantalla me muestre
todos mis estudios en un panel y me deje crear uno nuevo con un solo clic, para
arrancar a trabajar sin buscar dónde.

Objetivo: aplicar el diseño de Figma "proyect Workspace 3" a la barra superior de toda
la app. La home se rediseñó después en la exploración `explorar/pagina-principal`: se
quitó la sección "Diagnóstico" con sus indicadores y quedó un panel central de
estudios.

## Criterios de aceptación
- Dada una pantalla fuera de un estudio, cuando se ve la barra superior, entonces muestra: la marca
  (cuadro con el ícono "view", "uxuaria" en Inter ExtraBold 20 px y "Lupa Ux" debajo),
  un buscador de 260 px con texto guía "Buscar estudios" y, en modo `server`, el menú
  de usuario (avatar con la inicial, nombre, email y flecha).
- Dado el menú de usuario abierto, cuando se lo usa, entonces ofrece "Datos guardados
  en el servidor", "Cambiar tema claro / oscuro" y "Cerrar sesión" (en local, la nota
  de desarrollo en lugar del logout). Con menú de usuario, el badge de modo y el botón
  de tema no aparecen en la barra; sin él (modo `idb`), siguen en la barra.
- Dado un texto en el buscador, cuando se escribe, entonces la home muestra solo los
  estudios cuyo nombre, cliente, URL o plataforma lo contienen; desde otra pantalla,
  escribir lleva a la home. Sin coincidencias: "Ningún estudio coincide con la búsqueda."
- Dada la home, cuando se abre, entonces NO muestra el título "Diagnóstico" ni los
  indicadores de Diagnósticos, Clientes y Hallazgos. Muestra un panel de estudios a 100%
  de ancho, pegado a la barra, sin radio ni márgenes laterales, con una línea abajo y
  padding 28 × 32 px (18 × 16 px por debajo de 560 px).
- Dada la barra superior, cuando se ve, entonces no muestra la navegación "Estudios" /
  "Catálogo" (Figma "Ux-Diagnostic-tool"): la marca lleva a la home y el Catálogo se abre
  desde el panel de Hallazgos (spec `hz`). Dentro de un estudio la barra no aparece
  (spec `proy`).
- Dado el panel, cuando se lee su cabecera, entonces muestra el título "Estudios" y
  debajo la cantidad ("3 estudios", "1 estudio"). Con texto en el buscador muestra
  "{n} de {total} estudios coinciden con “{texto}”". Sin estudios muestra
  "Todavía no hay estudios. Creá el primero para empezar a evaluar un sitio o app.".
- Dado el backend con respaldo (`DB.dumpAll`), cuando se abre la home, entonces
  "Exportar datos" e "Importar datos" aparecen arriba a la derecha del panel.
- Dado el panel, cuando hay estudios, entonces se listan como tarjetas en una grilla de
  4 por fila. Pasa a 3 columnas por debajo de 1200 px, a 2 por debajo de 900 px y a 1
  por debajo de 560 px. Cada tarjeta tiene su conteo de hallazgos, editar y borrar.
- Dada la grilla, cuando se mira la primera posición, entonces hay una tarjeta vacía
  que funciona como botón "Nuevo estudio": borde punteado, ícono "+" y el texto
  "Cargá cliente, plataforma y URL", del mismo alto que un estudio (208 px) y radio 6
  como las tarjetas (spec `ds`). Al
  tocarla se abre el alta de estudio. Aparece siempre: sin estudios, con estudios y
  con búsqueda. En celular se ve como una fila compacta.
- Dada una búsqueda sin coincidencias, cuando se ve la home, entonces queda la
  tarjeta "Nuevo estudio" y debajo "Ningún estudio coincide con la búsqueda.".
- Dado el tema oscuro, cuando se ve la home y la barra, entonces el fondo, las
  tarjetas, el texto y los íconos cambian de color y todo se lee.
- Dada una pantalla chica (probado en 375 px), cuando se ve la home, entonces no hay
  scroll horizontal: el buscador se oculta por debajo de 900 px, la grilla va en una
  columna y la barra queda con marca, navegación e inicial.
- Toda la app usa la tipografía Geist (antes IBM Plex Sans y Bricolage Grotesque);
  IBM Plex Mono sigue para textos monoespaciados.

## Alcance
Barra superior (`index.html`, `renderTopbar`), menú de usuario (`ui/sesion.js`), home
(`views/home.js`: panel de estudios y tarjeta "Nuevo estudio"), tokens y estilos nuevos en `base.css` (`--canvas`, `--radius-xl`,
fuentes), íconos del Figma en `src/assets/figma/`.

## Fuera de alcance / No tocar
- Fuera de alcance: rediseño de la vista de estudio (spec `proy`), catálogo,
  hallazgos, flujos y reportes (solo heredan la fuente y la barra); volver a mostrar
  indicadores en la home; foto de usuario en el avatar; la nota
  al pie ("Lupa UX · cada estudio agrupa…"), que no está en el Figma.
- No editar los SVG del Figma: se usan como máscara (`.fig-ico`) para que tomen el
  color del tema.
- `/api/me` y `authorize()` (spec `ses`) no cambian.

## Dependencias
- Diseño de Figma (ver abajo). Fuentes Geist e Inter desde Google Fonts, con fallback
  al sistema.
- `store.listEstudios` / `listHallazgos`, `studyModal`, `exportAllData` / `importAllData`.
- `marcaActual()` (nombre del menú de usuario) y `GET /api/me` (spec `ses`).

## Estados (UI)
- Vacío: el panel con el texto "Todavía no hay estudios…" y solo la tarjeta
  "Nuevo estudio". Con una búsqueda sin resultados, "Ningún estudio coincide con la
  búsqueda.".
- Carga: el conteo de hallazgos de cada tarjeta muestra "·" hasta terminar de contar.
  A CONFIRMAR: indicador de carga al abrir la app (hoy se ve la pantalla vacía ~1 s).
- Error: si falla el conteo de hallazgos de un estudio, su tarjeta queda en "·" sin aviso.

## Diseño
Figma "Lupa-UX", frame "proyect Workspace 3":
https://www.figma.com/design/UCD0n9KHtihWGtd8kR5Z5D/Lupa-UX?node-id=2045-1078

La home (panel de estudios) no sigue el Figma: se definió en la exploración
`explorar/pagina-principal` (commit `fddbb98`), que sirve de referencia visual.

Desvíos acordados respecto del Figma en la barra: avatar con inicial (no hay fotos),
nombre desde la marca, tema y badge dentro del menú de usuario, texto guía en el
buscador y "Catálogo" con la ortografía corregida.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio:
  - Comparar la barra en 1440 px contra el Figma.
  - Ver la home con base vacía, con estudios y con una búsqueda sin coincidencias.
  - Que la tarjeta "Nuevo estudio" abra el alta.
  - Revisar el tema oscuro, la grilla en 1440, 1100, 800 y 375 px, y que en 375 px no
    haya scroll horizontal.
  - Actualizar `architecture.md` (descripción de `views/home.js`).

## Dónde vive
`index.html` (barra), `src/app/render.js` (`renderTopbar`, buscador),
`src/views/home.js` (`renderHome`, `studyCard`), `src/ui/sesion.js` (menú de usuario),
`src/core/state.js` (`homeQuery`), `src/styles/base.css` (tokens, `.fig-ico`, barra,
`.home`, `.home-panel`, `.hp-*`, `.study-add`, `.sa-*`) y `src/assets/figma/` (íconos).
