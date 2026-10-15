# Feature: Proyecto: subheader, barra de secciones y dashboard de Resumen  ·  id: proy

Historia de usuario: Como consultor/a UX, quiero entrar a un estudio y ver de un vistazo
sus problemas, protopersonas, flujos y hallazgos, con una barra de secciones para moverme
entre ellas, para saber dónde está el trabajo sin recorrer pantalla por pantalla.

Objetivo: vista de estudio a 100% de ancho, con un subheader de borde a borde, una barra
de secciones clara y una página de Resumen como home del proyecto, según el Figma
"Ux-Diagnostic-tool". Sale de las exploraciones `explorar/subheader-estudio`,
`explorar/hallazgo-como-pagina` y `explorar/layout-figma` (el sidebar de la primera se
reemplazó por la barra).

## Criterios de aceptación

### Layout
- Dado un estudio abierto, cuando se ve la página, entonces no hay barra global (marca,
  buscador, usuario): se vuelve al inicio desde las migas. Al volver a la home, la barra
  global reaparece.
- Dado cualquier ancho, cuando se ve el estudio, entonces el subheader, la barra de
  secciones y el área de trabajo ocupan el 100% del ancho, sin márgenes laterales ni caja
  centrada. El área de trabajo tiene fondo `--surface-2` y 20 px de padding (12 px por
  debajo de 760 px).

### Subheader
- Dado un estudio abierto, cuando se ve la parte de arriba, entonces el subheader va de
  borde a borde, con fondo de tarjeta y una línea abajo (sin radio ni sombra), y muestra:
  - Migas: un botón de ícono con flecha (28 px, fondo `--surface-2`, radio 8, ícono
    `src/assets/figma/volver.svg`), la marca (cuadro de 22 px) + "Estudios", y después
    `/ {nombre} / {sección}`. La flecha y "Estudios" vuelven a la home. La sección activa
    va en el color del texto y las demás migas en gris.
  - El título del estudio como `h1` de 28 px (24 px por debajo de 640 px).
  - Debajo, los datos con etiqueta y separados por líneas finas:
    **Cliente**, **Plataforma** y **URL**. Si un dato falta, no aparece. La URL se ve
    sin `https://` y se abre en otra pestaña.
  - A la derecha, el estado como pastilla con punto de color (En curso: `--sev2`;
    Terminado: `--opor`; Planificado: gris) y el botón con borde "Editar estudio".
- Dado el subheader, cuando se mira el estado, entonces no comparte estilo con la
  plataforma (la plataforma es texto, no chip).

### Barra de secciones
- Dado un estudio abierto, cuando se ve debajo del subheader, entonces hay una barra de
  pestañas a todo el ancho (fondo `--background`, línea abajo, padding 5 × 20 px) con dos
  grupos separados por una línea vertical:
  - **Proyecto:** Resumen, Hallazgos (con el contador de hallazgos del estudio), Flujos y
    Protopersonas.
  - **Salida:** Reportes y Configuración (Métricas está oculta; spec `rpt`).
  Cada pestaña tiene ícono y texto en `--faint`. La activa va con fondo `--background`,
  borde `--line`, radio 6 y texto `--ink`, con `aria-current="page"`.
- Dada una pestaña, cuando se la toca, entonces muestra esa sección en el área de trabajo,
  actualiza las migas y lleva el scroll arriba. Flujos abre la lista.
- Dado un scroll largo, cuando se baja, entonces la barra queda fija arriba (sticky).
- Dada una pantalla de 640 px o menos, cuando se ve la barra, entonces las pestañas
  muestran solo el ícono salvo la activa, la barra se desliza de costado y no hay scroll
  horizontal de la página.

### Secciones
- Dado un estudio, cuando se lo abre, entonces la sección inicial es **Resumen**
  (antes era Hallazgos).
- Reportes y Configuración: ver spec `rpt`. Métricas queda oculta en la barra.
- Hallazgos se arma como área de trabajo con pantallas + panel derecho (spec `hz`).
- **Flujos y Protopersonas están deshabilitadas provisionalmente** (lista `PROXIMAMENTE` en
  `views/estudio.js`; el código y los datos se conservan). En la barra llevan la etiqueta
  "Pronto" y, al entrar, muestran un aviso con una ilustración propia en SVG (usa los
  tokens del tema), la etiqueta "Próximamente", una explicación ("Próximamente vas a poder
  diagramar aquí los recorridos…" / "…crear aquí las protopersonas del estudio…"), tres
  puntos con ícono sobre lo que va a permitir la sección y una nota sobre los datos
  existentes (los flujos y journeys cargados siguen en el reporte; las protopersonas se
  cargan en Configuración). En desarrollo o en las pruebas se habilitan con
  `localStorage["lupa:habilitar"] = ["flujos","protopersonas"]`.

### Resumen (dashboard)
- Dado el Resumen, cuando se abre, entonces muestra cuatro cards en una grilla de 12
  columnas: Resumen de problemas (8) y Hallazgos (4) en la primera fila, Protopersonas (6)
  y Flujos (6) en la segunda. Por debajo de 1100 px, cada card ocupa toda la fila.
- **Resumen de problemas:**
  - Muestra cuántos problemas, oportunidades y observaciones hay, y el total de hallazgos.
  - Muestra una barra de problemas por severidad, ordenada de Sev 4 a Sev 0 igual que su
    leyenda, con el conteo de cada nivel.
  - Muestra los 4 problemas de mayor severidad.
  - Tocar un número o una severidad de la leyenda lleva a Hallazgos con el filtro de tipo
    aplicado en el panel (la severidad lleva a Problemas). "Ver hallazgos" lleva a
    Hallazgos. Tocar un problema abre su edición.
- **Hallazgos (acceso rápido):** muestra el botón "Nuevo hallazgo" (abre la página de alta,
  spec `hz`) y los
  últimos 4 registrados por fecha de creación, que se abren al tocarlos. "Ver todos"
  lleva a Hallazgos.
- **Protopersonas:**
  - Con protopersonas cargadas (`estudio.reporte.protopersonas`), muestra hasta 4 cards
    con foto o inicial, nombre, arquetipo, edad y ocupación.
  - Sin protopersonas, muestra un punto de entrada con el texto guía y el botón
    "Crear protopersona", que lleva a la sección Protopersonas ("Próximamente").
  - Tocar "Editar" también lleva a la sección Protopersonas. Ya no se cargan en
    Configuración (spec `rpt`); las guardadas se siguen mostrando.
- **Flujos:**
  - Lista hasta 5 flujos y journeys con ícono, nombre, tipo y la cantidad de
    interacciones (User Flow) o etapas (User Journey), más los hallazgos marcados si hay.
  - Tocar uno lo abre en su editor.
  - Sin flujos, muestra un punto de entrada con "Crear flujo", que lleva a Flujos.

### Temas y regresión
- Dado el tema oscuro, cuando se ve el estudio, entonces el subheader, las cards y el
  texto se leen; la barra de secciones y el área de trabajo usan los tokens del tema.
- El test e2e se adapta a que el estudio abre en Resumen. En el Resumen, el mismo
  hallazgo puede aparecer en "Prioritarios" y en "Últimos registrados".

## Alcance
- La vista de estudio (`views/estudio.js`): subheader, barra de secciones y navegación.
- La nueva vista `views/resumen.js`.
- `STUDY_TABS` y el `studyTab` inicial (`core/state.js`, `openStudy`).
- La clase `in-study` (oculta la barra global) y la variable `--top-h` (`app/render.js`).
- Los íconos `grid` y `gear` en `bigIco`; `volver.svg` en `src/assets/figma/`.
- Los estilos de `base.css`.
- El ajuste del test e2e.

## Fuera de alcance / No tocar
- Fuera de alcance:
  - La sección propia de Protopersonas (sigue "Próximamente").
  - Métricas.
  - Rediseñar el contenido de Flujos, Configuración o Reportes (Hallazgos: spec `hz`).
  - La home y la barra global (spec `home`).
- No tocar:
  - Los datos: no cambia ningún modelo ni ruta. Las protopersonas se siguen leyendo de
    `estudio.reporte.protopersonas`.
  - `store` / `flowStore` y los adaptadores.
  - `SR_boot` y `vistaCliente()`: el reporte del cliente no cambia.
  - La lógica de los editores de flujo y journey (solo cambia el contenedor).

## Dependencias
- `state.hallazgos`, `flowStore.list` (carga los flujos para la card), `openFlow`,
  `hzModal`, `ensureReporte` (protopersonas), `SEVERIDAD` y `TIPOS`.
- Las vistas `renderHallazgosInto`, `renderFlujosInto`, `renderProyectoInto`
  (Configuración) y `renderReportesInto`.

## Estados (UI)
- Vacío:
  - Sin hallazgos: "Resumen de problemas" en 0, con el aviso "Cuando registres problemas
    vas a ver acá su severidad y los más urgentes.".
  - La card Hallazgos muestra "Registrá el primer problema, oportunidad u observación.".
  - Protopersonas y Flujos muestran su punto de entrada.
- Carga: la card Flujos muestra "Cargando flujos…" hasta que llega la lista.
- Error: si falla la carga de flujos, la card muestra "No se pudieron cargar los flujos."
  con "Reintentar", que vuelve a pedirlos.

## Diseño
Figma "Ux-Diagnostic-tool", frames "Lupa UX · Proyecto · Resumen":
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3102 y
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3575
(de este se toma el orden de pestañas, con Configuración al final). El dashboard de Resumen
no está en el Figma: se definió en la exploración `explorar/subheader-estudio`. Radios y
estados: spec `ds`.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan. Las tres
  acciones críticas siguen funcionando. La vista previa y el texto plano no cambian.
- Propio:
  - Revisar en 1440 px, en tema oscuro y en 375 px (sin scroll horizontal).
  - Recorrer las siete secciones desde la barra (Flujos y Protopersonas muestran el aviso) y volver al inicio con la flecha y con
    "Estudios" (la barra global reaparece).
  - Abrir un flujo y un journey desde el Resumen.
  - Que los filtros desde el Resumen lleguen aplicados a Hallazgos.
  - Actualizar `architecture.md` (módulo `views/resumen.js` y fila de la tabla de features).

## Dónde vive
- `src/views/estudio.js`: `renderStudyShell`, `goStudyTab`.
- `src/views/resumen.js`: `renderResumenInto` y las cards.
- `src/core/state.js`: `STUDY_TABS`.
- `src/app/render.js`: `openStudy`, `in-study`, `--top-h`.
- `src/ui/iconos.js`: `bigIco`.
- `src/styles/base.css`: `.study-head`, `.sh-*`, `.proj*`, `.pt-*`, `.dash`, `.dc*`,
  `.dp-*`, `.pp-*`, `.fl-*`.
