# Feature: Home y barra superior (rediseño Figma)  ·  id: home

Historia de usuario: Como consultor/a UX, quiero que la primera pantalla me muestre de
un vistazo cuántos diagnósticos, clientes y hallazgos tengo, y me lleve a crear el
primer estudio si no hay ninguno, para arrancar a trabajar sin buscar dónde.

Objetivo: aplicar el diseño de Figma "proyect Workspace 3" a la home (la primera
página que recibe al usuario) y a la barra superior de toda la app, con datos reales
y el estado vacío como caso principal.

## Criterios de aceptación
- Dada cualquier pantalla, cuando se ve la barra superior, entonces muestra: la marca
  (cuadro con el ícono "view", "uxuaria" en Inter ExtraBold 20 px y "Lupa Ux" debajo),
  la navegación "Estudios" y "Catálogo" con sus íconos (la sección activa con fondo),
  un buscador de 260 px con texto guía "Buscar estudios" y, en modo `server`, el menú
  de usuario (avatar con la inicial, nombre, email y flecha).
- Dado el menú de usuario abierto, cuando se lo usa, entonces ofrece "Datos guardados
  en el servidor", "Cambiar tema claro / oscuro" y "Cerrar sesión" (en local, la nota
  de desarrollo en lugar del logout). Con menú de usuario, el badge de modo y el botón
  de tema no aparecen en la barra; sin él (modo `idb`), siguen en la barra.
- Dado un texto en el buscador, cuando se escribe, entonces la home muestra solo los
  estudios cuyo nombre, cliente, URL o plataforma lo contienen; desde otra pantalla,
  escribir lleva a la home. Sin coincidencias: "Ningún estudio coincide con la búsqueda."
- Dada la home, cuando se abre, entonces muestra el título "Diagnóstico" y tres
  indicadores: Diagnósticos (estudios creados en los últimos 30 días), Clientes
  (clientes distintos, sin distinguir mayúsculas) y Hallazgos (total de todos los
  estudios, que se completa al terminar de contarlos).
- Dado que no hay estudios, cuando se abre la home, entonces muestra la tarjeta
  "Todavía no hay estudios" / "Creá tu primer estudio para empezar a evaluar un sitio
  o app." con el botón "Crear estudio", que abre el alta de estudio.
- Dado que hay estudios, cuando se abre la home, entonces debajo de los indicadores
  aparece "Estudios" con "Nuevo estudio" y la grilla de tarjetas de siempre (con su
  conteo de hallazgos, editar y borrar).
- Dado el backend con respaldo (`DB.dumpAll`), cuando se abre la home, entonces
  "Exportar datos" e "Importar datos" aparecen a la derecha del título.
- Dada la app en 1440 px, cuando se compara con el Figma, entonces coinciden: fondo
  `#f3f4f6`, contenido con 32 px de margen y 24 px entre bloques, indicadores de
  153 px de alto con 20 px entre ellos y tarjeta vacía de 227 px.
- Dado el tema oscuro, cuando se ve la home y la barra, entonces el fondo, las
  tarjetas, el texto y los íconos cambian de color y todo se lee.
- Dada una pantalla chica (probado en 375 px), cuando se ve la home, entonces no hay
  scroll horizontal: el buscador se oculta por debajo de 900 px, los indicadores van
  en una columna por debajo de 720 px y la barra queda con marca, navegación e inicial.
- Toda la app usa la tipografía Geist (antes IBM Plex Sans y Bricolage Grotesque);
  IBM Plex Mono sigue para textos monoespaciados.

## Alcance
Barra superior (`index.html`, `renderTopbar`), menú de usuario (`ui/sesion.js`), home
(`views/home.js`), tokens y estilos nuevos en `base.css` (`--canvas`, `--radius-xl`,
fuentes), íconos del Figma en `src/assets/figma/`.

## Fuera de alcance / No tocar
- Fuera de alcance: rediseño de la vista de estudio, catálogo, hallazgos, flujos y
  reportes (solo heredan la fuente y la barra); foto de usuario en el avatar; la nota
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
- Vacío: tarjeta "Todavía no hay estudios" con "Crear estudio"; con búsqueda sin
  resultados, "Ningún estudio coincide con la búsqueda."
- Carga: el indicador Hallazgos muestra "·" hasta terminar de contar. A CONFIRMAR:
  indicador de carga al abrir la app (hoy se ve la pantalla vacía ~1 s).
- Error: si falla el conteo de hallazgos de un estudio, cuenta 0 sin aviso.

## Diseño
Figma "Lupa-UX", frame "proyect Workspace 3":
https://www.figma.com/design/UCD0n9KHtihWGtd8kR5Z5D/Lupa-UX?node-id=2045-1078

Desvíos acordados respecto del Figma: avatar con inicial (no hay fotos), nombre desde
la marca, "Exportar/Importar datos" junto al título, tema y badge dentro del menú de
usuario, texto guía en el buscador, lista de estudios debajo de los indicadores
cuando hay datos, y "Catálogo" / "mes" con la ortografía corregida.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: comparar en 1440 px contra el Figma (estado vacío con base vacía), revisar
  tema oscuro y 375 px sin scroll horizontal, y que el buscador filtre.

## Dónde vive
`index.html` (barra), `src/app/render.js` (`renderTopbar`, buscador),
`src/views/home.js` (`renderHome`, `kpiCard`), `src/ui/sesion.js` (menú de usuario),
`src/core/state.js` (`homeQuery`), `src/styles/base.css` (tokens, `.fig-ico`, barra,
`.home`, `.kpi*`, `.home-empty`) y `src/assets/figma/` (íconos).
