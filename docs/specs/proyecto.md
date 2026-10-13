# Feature: Proyecto con sidebar y dashboard de Resumen  ·  id: proy

Historia de usuario: Como consultor/a UX, quiero entrar a un estudio y ver de un vistazo
sus problemas, protopersonas, flujos y hallazgos, con un menú lateral para moverme entre
secciones, para saber dónde está el trabajo sin recorrer pestaña por pestaña.

Objetivo: reemplazar la cabecera con pestañas de la vista de estudio por un subheader
a lo ancho, un sidebar negro en caja (plegable) y una página de Resumen como home del
proyecto. Sale de la exploración `explorar/subheader-estudio`.

## Criterios de aceptación

### Subheader
- Dado un estudio abierto, cuando se ve la parte de arriba, entonces el subheader ocupa
  todo el ancho del contenido, dentro de una tarjeta, y muestra:
  - Migas de pan `‹ Estudios / {nombre} / {sección}`. "‹ Estudios" vuelve a la home y
    es el único botón de esa línea. La sección activa va en el color del texto y las
    demás migas en gris.
  - El título del estudio como `h1` de 28 px (24 px por debajo de 640 px).
  - Debajo, los datos con etiqueta y separados por líneas finas:
    **Cliente**, **Plataforma** y **URL**. Si un dato falta, no aparece. La URL se ve
    sin `https://` y se abre en otra pestaña.
  - A la derecha, el estado como pastilla con punto de color (En curso: `--sev2`;
    Terminado: `--opor`; Planificado: gris) y el botón con borde "Editar estudio".
- Dado el subheader, cuando se mira el estado, entonces no comparte estilo con la
  plataforma (la plataforma es texto, no chip).

### Sidebar
- Dado un estudio abierto, cuando se ve debajo del subheader, entonces a la izquierda
  hay una caja negra (`#0a0a0a`, en tema claro y oscuro) con bordes redondeados
  (`--radius-xl`) y sombra, a 24 px del subheader y del panel de trabajo. Ocupa
  `clamp(220px, 20vw, 280px)` y el panel de trabajo usa el resto.
- Dado el sidebar, cuando se lo lee, entonces arriba dice "Menú del proyecto" con el
  botón para plegar, y debajo dos grupos:
  - **Proyecto:** Resumen, Flujos, Protopersonas, Hallazgos (con el contador de
    hallazgos del estudio) y Configuración.
  - **Salida:** Métricas y Reportes.
  Cada ítem tiene ícono. El activo va en blanco con texto negro y `aria-current="page"`.
- Dado un ítem del sidebar, cuando se lo toca, entonces muestra esa sección en el
  panel de trabajo, actualiza las migas y lleva el scroll arriba. Flujos abre la lista.
- Dado el botón de plegar, cuando se lo toca, entonces el sidebar queda en 64 px, solo
  con íconos (con `title`) y una línea entre Proyecto y Salida; tocarlo de nuevo lo
  despliega. La preferencia se recuerda en el navegador (`LS` `lupa:side`).
- Dado un scroll largo, cuando se baja, entonces el sidebar queda fijo debajo de la
  barra global (sticky, a 16 px) y no se superpone con ella.
- Dada una pantalla de 760 px o menos, cuando se ve el estudio, entonces el sidebar
  pasa a íconos (56 px), sin título ni botón de plegar, y no hay scroll horizontal.

### Secciones
- Dado un estudio, cuando se lo abre, entonces la sección inicial es **Resumen**
  (antes era Hallazgos).
- Configuración muestra lo que antes era la pestaña "Proyecto" (resumen ejecutivo,
  diagnóstico, protopersonas, propuestas y muestra), sin cambios de contenido.
- Hallazgos, Flujos, Reportes, Métricas y Protopersonas muestran lo mismo que sus
  pestañas de antes. Protopersonas y Métricas siguen como "Próximamente".
- Las pestañas horizontales (`.subtabs`) desaparecen de la vista de estudio.

### Resumen (dashboard)
- Dado el Resumen, cuando se abre, entonces muestra cuatro cards en una grilla de 12
  columnas: Resumen de problemas (8) y Hallazgos (4) en la primera fila, Protopersonas (6)
  y Flujos (6) en la segunda. Por debajo de 1100 px, cada card ocupa toda la fila.
- **Resumen de problemas:**
  - Muestra cuántos problemas, oportunidades y observaciones hay, y el total de hallazgos.
  - Muestra una barra de problemas por severidad, ordenada de Sev 4 a Sev 0 igual que su
    leyenda, con el conteo de cada nivel.
  - Muestra los 4 problemas de mayor severidad.
  - Tocar un número, una severidad de la leyenda o "Ver hallazgos" lleva a Hallazgos con
    ese filtro aplicado. Tocar un problema abre su edición.
- **Hallazgos (acceso rápido):** muestra el botón "Nuevo hallazgo" (abre el alta) y los
  últimos 4 registrados por fecha de creación, que se abren al tocarlos. "Ver todos"
  lleva a Hallazgos.
- **Protopersonas:**
  - Con protopersonas cargadas (`estudio.reporte.protopersonas`), muestra hasta 4 cards
    con foto o inicial, nombre, arquetipo, edad y ocupación.
  - Sin protopersonas, muestra un punto de entrada con el texto guía y el botón
    "Crear protopersona". A dónde lleva ese botón: A CONFIRMAR (en la exploración lleva a
    Configuración, donde se cargan hoy).
  - A dónde lleva tocar una card de protopersona mientras la sección siga como
    "Próximamente": A CONFIRMAR.
- **Flujos:**
  - Lista hasta 5 flujos y journeys con ícono, nombre, tipo y la cantidad de
    interacciones (User Flow) o etapas (User Journey), más los hallazgos marcados si hay.
  - Tocar uno lo abre en su editor.
  - Sin flujos, muestra un punto de entrada con "Crear flujo", que lleva a Flujos.

### Temas y regresión
- Dado el tema oscuro, cuando se ve el estudio, entonces el subheader, las cards y el
  texto se leen. El sidebar sigue negro y se distingue del fondo por su borde.
- El test e2e se adapta a que el estudio abre en Resumen. En el Resumen, el mismo
  hallazgo puede aparecer en "Prioritarios" y en "Últimos registrados".

## Alcance
- La vista de estudio (`views/estudio.js`): subheader, sidebar y navegación.
- La nueva vista `views/resumen.js`.
- `STUDY_TABS` y el `studyTab` inicial (`core/state.js`, `openStudy`).
- La clase `in-study` y la variable `--top-h` (`app/render.js`).
- Los íconos `grid`, `gear` y `side` en `bigIco`.
- Los estilos de `base.css`.
- El ajuste del test e2e.

## Fuera de alcance / No tocar
- Fuera de alcance:
  - La sección propia de Protopersonas (sigue "Próximamente").
  - Métricas.
  - Rediseñar el contenido de Hallazgos, Flujos, Configuración o Reportes.
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
- `LS` para la preferencia del sidebar.

## Estados (UI)
- Vacío:
  - Sin hallazgos: "Resumen de problemas" en 0, con el aviso "Cuando registres problemas
    vas a ver acá su severidad y los más urgentes.".
  - La card Hallazgos muestra "Registrá el primer problema, oportunidad u observación.".
  - Protopersonas y Flujos muestran su punto de entrada.
- Carga: la card Flujos muestra "Cargando flujos…" hasta que llega la lista.
- Error:
  - Si falla la carga de flujos, la card queda en "Cargando flujos…" sin aviso.
    Qué mostrar en ese caso: A CONFIRMAR.

## Diseño
N/A: el diseño se definió en la exploración (rama `explorar/subheader-estudio`, commits
`105a859`, `5c5c74d` y `c15c46b`), que sirve de referencia visual.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan. Las tres
  acciones críticas siguen funcionando. La vista previa y el texto plano no cambian.
- Propio:
  - Revisar en 1440 px, en tema oscuro y en 375 px (sin scroll horizontal).
  - Plegar y desplegar el sidebar, y recargar: se mantiene.
  - Recorrer las siete secciones desde el sidebar.
  - Abrir un flujo y un journey desde el Resumen.
  - Que los filtros desde el Resumen lleguen aplicados a Hallazgos.
  - Actualizar `architecture.md` (módulo `views/resumen.js` y fila de la tabla de features).

## Dónde vive
- `src/views/estudio.js`: `renderStudyShell`, `goStudyTab`.
- `src/views/resumen.js`: `renderResumenInto` y las cards.
- `src/core/state.js`: `STUDY_TABS`.
- `src/app/render.js`: `openStudy`, `in-study`, `--top-h`.
- `src/ui/iconos.js`: `bigIco`.
- `src/styles/base.css`: `.study-head`, `.sh-*`, `.proj*`, `.ps-*`, `.dash`, `.dc*`,
  `.dp-*`, `.pp-*`, `.fl-*`.
